import { createHash } from 'crypto';
import { ParsedSshPublicKey } from '../types/ssh-key.types';

const KEY_TYPES = new Set([
  'ssh-ed25519',
  'ssh-rsa',
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521',
  'sk-ssh-ed25519@openssh.com',
  'sk-ecdsa-sha2-nistp256@openssh.com',
]);

export function parseSshPublicKey(input: string): ParsedSshPublicKey | null {
  const [type, data, ...comment] = input.trim().split(/\s+/);
  if (
    !type ||
    !data ||
    !KEY_TYPES.has(type) ||
    !/^[A-Za-z0-9+/]+={0,3}$/.test(data)
  ) {
    return null;
  }

  const blob = Buffer.from(data, 'base64');
  const typeLength = blob.length >= 4 ? blob.readUInt32BE(0) : -1;
  if (blob.subarray(4, 4 + typeLength).toString() !== type) return null;

  const digest = createHash('sha256').update(blob).digest('base64');
  return {
    publicKey: `${type} ${data}`,
    fingerprint: `SHA256:${digest.replace(/=+$/, '')}`,
    comment: comment.join(' ') || undefined,
  };
}
