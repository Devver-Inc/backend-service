import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { Encrypter } from './encryptors/template.encrypter';
import { BcryptEncrypter } from './encryptors/bcrypt.encrypter';
import { NoopEncrypter } from './encryptors/noop.encrypter';

interface PasswordStatus {
  isPasswordCorrect: boolean;
  isEncryptionChanged: boolean;
}

@Injectable()
export class EncryptionService {
  private currentEncrypter: Encrypter;

  private readonly initEncryptors = [NoopEncrypter, BcryptEncrypter];

  private readonly encryptors: Map<string, Encrypter>;

  constructor() {
    const initEncryptors = this.initEncryptors.map((encrypter) => new encrypter());
    const encryptorsSet = new Set(initEncryptors.map((encrypter) => encrypter.name));

    if (encryptorsSet.size < initEncryptors.length)
      throw new InternalServerErrorException('Encrypter error: Encryptors must have different names');

    this.encryptors = new Map(initEncryptors.map((encrypter) => [encrypter.name, encrypter]));
    this.currentEncrypter = [...this.encryptors.values()].reduce((acc, level) =>
      level.securityLevel > acc.securityLevel ? level : acc,
    );
  }

  encrypt(password: string): string {
    const encrypter = this.currentEncrypter.name;
    const hash = this.currentEncrypter.encrypt(password);
    return `{${encrypter}}${hash}`;
  }

  compare(password: string, hash: string): PasswordStatus {
    const separator = hash.indexOf('}');

    if (hash.at(0) !== '{' || separator === -1)
      throw new InternalServerErrorException('Encrypter error: Hash syntax error');

    const encryption = hash.substring(1, separator);
    hash = hash.substring(separator + 1);

    const encrypter = this.encryptors.get(encryption);

    if (!encrypter) throw new InternalServerErrorException('Encrypter error: Bad encrypter name');

    return {
      isPasswordCorrect: encrypter.compare(password, hash),
      isEncryptionChanged: encryption != this.currentEncrypter.name,
    };
  }
}
