import { LogSeverity } from './log-severity';

export type LogFunction = (message: string) => void;

export interface LoggerFunction {
  (severity: LogSeverity, message: string): void;
}

export type Logger = LoggerFunction & {
  [k in LogSeverity]: LogFunction;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This is ensures console-compatibility, otherwise this will cause a compile error
const defaultLogger: Record<LogSeverity, LogFunction> = console;
