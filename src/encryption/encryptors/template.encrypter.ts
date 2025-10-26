export abstract class Encrypter {
  abstract readonly name: string;
  abstract readonly securityLevel: number;

  abstract encrypt(password: string): string;
  abstract compare(password: string, hash: string): boolean;
}
