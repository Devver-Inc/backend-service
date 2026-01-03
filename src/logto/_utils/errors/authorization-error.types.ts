export class AuthorizationError extends Error {
  name = 'AuthorizationError';
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
  }
}
