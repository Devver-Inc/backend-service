export const REPO_NAME_PATTERN = /^[a-z0-9-]+$/;
export const BRANCH_PATTERN =
  /^(?!\/)(?!.*\.\.)(?!.*\/\/)(?!.*\s)[A-Za-z0-9._\/-]{1,120}$/;
export const COMMIT_PATTERN = /^[0-9a-fA-F]{7,40}$/;
export const PM2_PROCESS_PATTERN = /^[A-Za-z0-9._-]+$/;
