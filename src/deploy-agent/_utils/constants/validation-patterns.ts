// The code's root commit (`git rev-list --max-parents=0 --first-parent HEAD`) names its repo.
export const COMMIT_PATTERN = /^([0-9a-f]{40}|[0-9a-f]{64})$/;
export const ROOT_COMMIT_PATTERN = COMMIT_PATTERN;
export const DEPLOYMENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
// Rejects terminal escapes and C0/C1 controls, and surrounding spaces.
export const DISPLAY_NAME_PATTERN =
  /^(?!\s)(?![\s\S]*\s$)[^\u0000-\u001F\u007F-\u009F]{1,80}$/;
