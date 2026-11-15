export interface ParsedSshPublicKey {
  publicKey: string;
  fingerprint: string;
  comment?: string;
}

export interface CreateSshKeyData {
  userId: string;
  title: string;
  publicKey: string;
  fingerprint: string;
}
