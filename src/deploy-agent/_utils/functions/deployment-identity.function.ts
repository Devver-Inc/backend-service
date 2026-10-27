import { createHash } from 'node:crypto';
import { toSlug } from 'src/_utils/functions/to-slug.function';
import { ServiceName } from '../types/agent.types';

const MAX_ID = 63;
// DNS label = <label>--<24-char projectId>, at most 63 chars.
const MAX_LABEL = MAX_ID - '--'.length - 24;
const HASH_LENGTH = 6;

const cut = (slug: string, max: number): string =>
  slug.slice(0, max - HASH_LENGTH - 1).replace(/-+$/, '');

/**
 * Agent deployment id and preview host for one repo/branch/service. The hash
 * keeps them unique when slugging or truncation would collide
 * (`feature/x` vs `feature-x`); toSlug never emits `--`, so the label can't
 * be confused with the `--<projectId>` separator.
 */
export const deploymentIdentity = (
  projectId: string,
  repo: string,
  branch: string,
  service: ServiceName,
  previewDomain: string,
): { id: string; host: string } => {
  const slug = toSlug(`${repo}-${branch}${service === 'api' ? '-api' : ''}`);
  const hash = createHash('sha1')
    .update(`${repo}\0${branch}\0${service}`)
    .digest('hex')
    .slice(0, HASH_LENGTH);

  return {
    id: `${cut(slug, MAX_ID)}-${hash}`,
    host: `${cut(slug, MAX_LABEL)}-${hash}--${projectId}.${previewDomain}`,
  };
};
