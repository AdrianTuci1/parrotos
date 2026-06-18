import jwt from 'jsonwebtoken';
import { gcpService } from './GcpService.js';
import { CryptoService } from '../utils/crypto.js';
import { User } from '../models/User.js';
import { config } from '../config/index.js';
import { UnauthorizedError, ConflictError } from '../utils/errors.js';
import { dataDeletionService } from './DataDeletionService.js';
import { OrganizationService } from './OrganizationService.js';

export class AuthService {
  constructor({
    usersCollection = gcpService.firestore.collection('users'),
    organizationService = new OrganizationService(),
  } = {}) {
    this.usersCollection = usersCollection;
    this.organizationService = organizationService;
  }

  async register(dto) {
    const existing = await this.usersCollection
      .where('email', '==', dto.email)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await CryptoService.hashPassword(dto.password);
    const userId = CryptoService.generateId();
    const now = new Date().toISOString();

    const user = new User({
      id: userId,
      email: dto.email,
      passwordHash,
      username: dto.username,
      roles: ['user'],
      createdAt: now,
      updatedAt: now,
    });

    await this.usersCollection.doc(userId).set(user.toFirestore());
    const defaultOrg = await this.organizationService.createDefaultForAccount(userId, user.email);

    return this.issueSession(user, defaultOrg?.id || null);
  }

  async login(dto) {
    const snapshot = await this.usersCollection
      .where('email', '==', dto.email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const user = User.fromFirestore(doc.id, data);

    const valid = await CryptoService.comparePassword(dto.password, data.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const defaultOrg = await this.organizationService.findByAccount(user.id);
    const orgId = defaultOrg.length > 0 ? defaultOrg[0].id : null;
    return this.issueSession(user, orgId);
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const doc = await this.usersCollection.doc(decoded.sub).get();
      
      if (!doc.exists) {
        throw new UnauthorizedError('User not found');
      }

      return { userId: decoded.sub, ...decoded };
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  generateToken(user, orgId = null) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles,
        provider: user.provider || '',
        orgId: orgId || user.orgId || null,
      },
      config.jwtSecret,
      { expiresIn: config.accessTokenExpiresIn }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        type: 'refresh',
        jti: CryptoService.generateToken(24),
      },
      config.refreshTokenSecret,
      { expiresIn: config.refreshTokenExpiresIn }
    );
  }

  getRefreshTokenExpiryDate() {
    return new Date(Date.now() + config.refreshTokenTtlMs);
  }

  async persistRefreshToken(userId, refreshToken, refreshTokenExpiresAt) {
    await this.usersCollection.doc(userId).update({
      refreshTokenHash: CryptoService.hashToken(refreshToken),
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async issueSession(user, orgId = null) {
    const token = this.generateToken(user, orgId);
    const refreshToken = this.generateRefreshToken(user);
    const refreshTokenExpiresAt = this.getRefreshTokenExpiryDate();

    await this.persistRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

    return {
      token,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async refreshSession(refreshToken) {
    if (!refreshToken) {
      throw new UnauthorizedError('Missing refresh token');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.refreshTokenSecret);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (decoded.type !== 'refresh' || !decoded.sub) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const doc = await this.usersCollection.doc(decoded.sub).get();
    if (!doc.exists) {
      throw new UnauthorizedError('User not found');
    }

    const user = User.fromFirestore(doc.id, doc.data());
    if (!user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedError('Refresh token revoked');
    }

    if (new Date(user.refreshTokenExpiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    const isValid = CryptoService.compareToken(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const defaultOrgs = typeof this.organizationService.findByAccount === 'function'
      ? await this.organizationService.findByAccount(user.id)
      : [];
    const orgId = defaultOrgs.length > 0 ? defaultOrgs[0].id : null;
    return this.issueSession(user, orgId);
  }

  async revokeRefreshToken(userId) {
    await this.usersCollection.doc(userId).update({
      refreshTokenHash: '',
      refreshTokenExpiresAt: null,
      updatedAt: new Date().toISOString(),
    });
  }

  async logoutByRefreshToken(refreshToken) {
    if (!refreshToken) {
      return;
    }

    try {
      const decoded = jwt.verify(refreshToken, config.refreshTokenSecret);
      if (!decoded?.sub) {
        return;
      }
      await this.revokeRefreshToken(decoded.sub);
    } catch {
      // Ignore invalid refresh tokens on logout.
    }
  }

  async findOrCreateOAuthUser(oauthData) {
    const snapshot = await this.usersCollection
      .where('email', '==', oauthData.email)
      .limit(1)
      .get();

    let user;

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      user = User.fromFirestore(doc.id, data);

      // Update OAuth provider info if missing
      if (!data.provider) {
        await this.usersCollection.doc(doc.id).update({
          provider: oauthData.provider,
          providerId: oauthData.providerId,
          picture: oauthData.picture || data.picture,
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      const userId = CryptoService.generateId();
      const now = new Date().toISOString();

      user = new User({
        id: userId,
        email: oauthData.email,
        username: oauthData.username,
        picture: oauthData.picture,
        provider: oauthData.provider,
        providerId: oauthData.providerId,
        roles: ['user'],
        createdAt: now,
        updatedAt: now,
      });

      await this.usersCollection.doc(userId).set(user.toFirestore());
      const defaultOrg = await this.organizationService.createDefaultForAccount(userId, user.email);
      return this.issueSession(user, defaultOrg?.id || null);
    }

    const defaultOrg = await this.organizationService.findByAccount(user.id);
    const orgId = defaultOrg.length > 0 ? defaultOrg[0].id : null;
    return this.issueSession(user, orgId);
  }

  async getUser(userId) {
    const doc = await this.usersCollection.doc(userId).get();
    if (!doc.exists) {
      throw new UnauthorizedError('User not found');
    }
    const user = User.fromFirestore(doc.id, doc.data());
    return this.sanitizeUser(user);
  }

  async deleteAccount(userId) {
    return dataDeletionService.deleteUserAccount(userId);
  }

  sanitizeUser(user) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      picture: user.picture,
      provider: user.provider || '',
      roles: user.roles,
      orgMemberships: user.orgMemberships,
    };
  }
}
