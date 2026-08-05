import { ParsedGitAuthorizationRequest } from '../types/git-authorization.types';

export function parseGitAuthorizationRequest(
  authorization?: string,
  explicitToken?: string,
  originalUri?: string,
): ParsedGitAuthorizationRequest {
  let token = explicitToken;
  if (!token && authorization?.startsWith('Bearer ')) {
    token = authorization.slice(7);
  } else if (!token && authorization?.startsWith('Basic ')) {
    token = Buffer.from(authorization.slice(6), 'base64')
      .toString('utf8')
      .split(':', 1)[0];
  }

  return {
    token,
    repo: originalUri?.match(/^\/git\/([a-z0-9-]+)\.git(?:\/|$)/)?.[1],
  };
}
