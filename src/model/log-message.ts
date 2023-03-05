import { LogSeverity } from './log-severity';

export interface LogMessage {
  severity: LogSeverity;
  message: string;
}
