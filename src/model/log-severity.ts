import { IdentityMap, identityMap } from '../utils/identity-map';

export const LogSeverity = identityMap(['error', 'info', 'debug', 'warn']);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type LogSeverity = IdentityMap<typeof LogSeverity>;

export const isLogSeverity = (value: unknown): value is LogSeverity =>
  typeof value === 'string' && value in LogSeverity;
