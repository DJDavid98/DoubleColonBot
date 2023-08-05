import { isLogSeverity } from '../model/log-severity';
import { Logger, LoggerFunction } from '../model/logger';
import { formatCorrelationId } from '../utils/format-correlation-id';


/**
 * Creates a logger which can log arbitrary messages to the console with the provided correlation ID which
 * can be used to trace back issues from the client side in the server logs
 * @param correlationId
 */
export const correlationIdLoggerFactory = (correlationId: string): Logger => {
  const logger: LoggerFunction = (severity, message) =>
    console[severity](`(${new Date().toISOString()}) ${severity}${formatCorrelationId(correlationId)}: ${message}`);
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
