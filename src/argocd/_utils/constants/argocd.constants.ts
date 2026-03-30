export enum ArgoHealthStatus {
  Healthy = 'Healthy',
  Progressing = 'Progressing',
  Degraded = 'Degraded',
  Suspended = 'Suspended',
  Missing = 'Missing',
  Unknown = 'Unknown',
}

export enum ArgoSyncStatus {
  Synced = 'Synced',
  OutOfSync = 'OutOfSync',
  Unknown = 'Unknown',
}
