export const lastSseEvent = (
  text: string,
): { event: string; data: unknown } | undefined => {
  const blocks = text.split(/\r?\n\r?\n/).filter((block) => block.trim());
  for (const block of blocks.reverse()) {
    const lines = block.split(/\r?\n/);
    const event = lines
      .find((line) => line.startsWith('event:'))
      ?.slice('event:'.length)
      .trim();
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trimStart())
      .join('\n');
    if (!event || !data) continue;
    try {
      return { event, data: JSON.parse(data) };
    } catch {
      // The tail window can start mid-block; that block is never the last one.
      continue;
    }
  }
  return undefined;
};
