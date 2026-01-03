/**
 * Converts kilobytes to bytes
 * @param kb - Size in kilobytes
 * @returns Size in bytes
 * @example toKB(500) // 500,000 bytes
 */
export const toKB = (kb: number): number => kb * 1024;

/**
 * Converts megabytes to bytes
 * @param mb - Size in megabytes
 * @returns Size in bytes
 * @example toMB(8) // 8,388,608 bytes
 */
export const toMB = (mb: number): number => mb * 1024 * 1024;

/**
 * Converts gigabytes to bytes
 * @param gb - Size in gigabytes
 * @returns Size in bytes
 * @example toGB(2) // 2,147,483,648 bytes
 */
export const toGB = (gb: number): number => gb * 1024 * 1024 * 1024;
