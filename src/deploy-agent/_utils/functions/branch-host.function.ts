import { createHash } from 'node:crypto';
import { ServiceName } from '../types/agent.types';

// A DNS label is 63 characters: 32 for the branch, 3 for the service, 24 for the project id, 4 for `--`.
const MAX_SLUG = 32;

/**
 * Stable host of a branch's latest deployment of a service:
 * `<branch>--<service>--<projectId>.<previewDomain>`. The slug keeps single
 * dashes only, so `--` stays a separator; a long branch is cut and suffixed
 * with a hash of its full name.
 */
export function branchHost(
  branch: string,
  service: ServiceName,
  projectId: string,
  previewDomain: string,
): string {
  let slug =
    branch
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'branch';
  if (slug.length > MAX_SLUG) {
    const hash = createHash('sha256').update(branch).digest('hex').slice(0, 6);
    slug = `${slug.slice(0, MAX_SLUG - 7).replace(/-+$/, '')}-${hash}`;
  }
  return `${slug}--${service}--${projectId}.${previewDomain}`;
}
