// The code's root commit (`git rev-list --max-parents=0 --first-parent HEAD`) names its repo.
export const ROOT_COMMIT_PATTERN = /^([0-9a-f]{40}|[0-9a-f]{64})$/;
export const BRANCH_PATTERN =
  /^(?!\/)(?!.*\.\.)(?!.*\/\/)(?!.*\s)[A-Za-z0-9._\/-]{1,120}$/;
export const DEPLOYMENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
