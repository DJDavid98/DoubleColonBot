import { isLogSeverity, LogSeverity } from '../model/log-severity';
import { Logger, LoggerFunction } from '../model/logger';


/**
 * Creates a logger which can log arbitrary messages to the console with the provided correlation ID which
 * can be used to trace back issues from the client side in the server logs
 * @param correlationId
 */
export const correlationIdLoggerFactory = (correlationId: string): Logger => {
  const logger: LoggerFunction = (severity: LogSeverity, message: string) =>
    console[severity](`${message} (${correlationId})`);
  const loggerCache: Partial<Logger> = {};
  return new Proxy(logger as Logger, {
    get(_, p) {
      if (!isLogSeverity(p)) return;

      if (!(p in loggerCache)) {
        loggerCache[p] = (message: string) => logger(p, message);
      }
      return loggerCache[p];
    },
  });
};
