import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import bcrypt from 'bcrypt';

export class CryptoService {
  static hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  static comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  static generateId() {
    return randomUUID();
  }

  static generateToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static hashToken(token) {
    return createHash('sha256').update(String(token)).digest('hex');
  }

  static compareToken(token, hash) {
    const tokenHash = Buffer.from(this.hashToken(token), 'utf8');
    const expectedHash = Buffer.from(String(hash || ''), 'utf8');

    if (tokenHash.length !== expectedHash.length) {
      return false;
    }

    return timingSafeEqual(tokenHash, expectedHash);
  }
}
