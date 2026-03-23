import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { EnvironmentVariables } from 'src/_utils/config/env.config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    const hexKey = configService.get('ENCRYPTION').ENCRYPTION_KEY;
    this.key = Buffer.from(hexKey, 'hex');
  }

  private encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
  }

  private decrypt(encoded: string): string {
    const [ivB64, authTagB64, ciphertextB64] = encoded.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    return (
      decipher.update(ciphertext).toString('utf8') +
      decipher.final().toString('utf8')
    );
  }

  encryptRecord(
    record: Record<string, string>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      result[key] = this.encrypt(value);
    }
    return result;
  }

  decryptRecord(
    record: Record<string, string>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      result[key] = this.decrypt(value);
    }
    return result;
  }
}
