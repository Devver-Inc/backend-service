import * as bcrypt from 'bcrypt';
import { Encrypter } from './template.encrypter';

export class BcryptEncrypter extends Encrypter {
  name: string = 'bcrypt';

  securityLevel: number = 50;

  encrypt(password: string): string {
    return bcrypt.hashSync(password, 10);
  }

  compare(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }
}
