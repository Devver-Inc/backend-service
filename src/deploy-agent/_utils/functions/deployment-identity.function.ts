import { randomUUID } from 'node:crypto';

/**
 * Every deploy is a new deployment, as on the local server: a v4 UUID id and
 * its own preview host. 36 + `--` + a 24-char project id fits a DNS label.
 */
export const deploymentIdentity = (
  projectId: string,
  previewDomain: string,
): { id: string; host: string } => {
  const id = randomUUID();
  return { id, host: `${id}--${projectId}.${previewDomain}` };
};
