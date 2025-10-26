import { Encrypter } from './template.encrypter';

export class NoopEncrypter extends Encrypter {
  name: string = 'noop';

  securityLevel: number = 0;

  encrypt(password: string): string {
    return password;
  }

  compare(password: string, hash: string): boolean {
    return password === hash;
  }
}
