import jwt from 'jsonwebtoken';
import { gcpService } from './GcpService.js';
import { CryptoService } from '../utils/crypto.js';
import { User } from '../models/User.js';
import { config } from '../config/index.js';
import { UnauthorizedError, ConflictError } from '../utils/errors.js';

export class AuthService {
  constructor() {
    this.usersCollection = gcpService.firestore.collection('users');
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

    const token = this.generateToken(user);
    return { token, user: this.sanitizeUser(user) };
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

    const token = this.generateToken(user);
    return { token, user: this.sanitizeUser(user) };
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

  generateToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles,
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );
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
    }

    const token = this.generateToken(user);
    return { token, user: this.sanitizeUser(user) };
  }

  sanitizeUser(user) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      picture: user.picture,
      roles: user.roles,
      orgMemberships: user.orgMemberships,
    };
  }
}
