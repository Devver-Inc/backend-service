export const REPO_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
export const BRANCH_PATTERN =
  /^(?!\/)(?!.*\.\.)(?!.*\/\/)(?!.*\s)[A-Za-z0-9._\/-]{1,120}$/;
/** Same rule the agent enforces on ids. */
export const DEPLOYMENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
