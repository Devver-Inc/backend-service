export interface GitTokenPayload {
  aud: 'devver-git';
  iss: 'devver-backend-service';
  projectId: string;
  repo: string;
  userId: string;
  iat: number;
  exp: number;
}

export interface GenerateGitTokenResult {
  token: string;
  pushUrl: string;
}

export interface ParsedGitAuthorizationRequest {
  token?: string;
  repo?: string;
}
