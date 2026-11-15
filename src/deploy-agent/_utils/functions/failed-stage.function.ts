const PHASES = ['checkout', 'install', 'build', 'start', 'route'];

/** The agent reports each phase once it ends, so a failure is in the next one. */
export const failedStage = (stream: string): string => {
  const done = [...stream.matchAll(/"phase":"([a-z]+)"/g)].map((m) => m[1]);
  const last = PHASES.indexOf(done.at(-1) ?? '');
  return PHASES[last + 1] ?? 'route';
};
