/**
 * Escapes special regex characters in a string to prevent ReDoS attacks.
 * @param str - The string to escape
 * @returns The escaped string safe for use in regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
