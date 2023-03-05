import { Response } from 'express';
import { correlationIdLoggerFactory } from '../utils/correlation-id-logger-factory';
import { LogMessage } from '../model/log-message';

export interface JsonResponseProps {
  statusCode: number;
  log?: LogMessage;
  body: unknown;
}

/**
 * Creates a function that can be used to respond to an Express request with a custom status and a JSON payload
 * while allowing to log a different message to the console.
 *
 * The `correlationId` is always added to the response and can be used to identify connected a log messages
 * if the user complaining about the errors can provide the ID
 *
 * @param res
 * @param correlationId
 */
export const jsonResponseFactory = (res: Response, correlationId: string) => {
  const logger = correlationIdLoggerFactory(correlationId);
  return {
    respond: ({ statusCode, log, body }: JsonResponseProps): void => {
      res.status(statusCode);
      if (log) {
        logger(log.severity, log.message);
      }
      res.json({ body, correlationId });
    },
    logger,
  };
};
