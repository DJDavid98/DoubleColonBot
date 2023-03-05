import { RequestHandler } from 'express';
import { AppHandlerDependencies } from '../model/app-handler-dependencies';
import { getRandomUuid } from '../utils/random';
import { correlationIdLoggerFactory } from '../utils/correlation-id-logger-factory';
import { getAuthorizationUrl } from '../utils/get-authorization-url';

/**
 * Redirects the user to the Witch OAuth2 authorization URL
 */
export const authStartHandler = (deps: AppHandlerDependencies): RequestHandler => async (req, res) => {
  const logger = correlationIdLoggerFactory(getRandomUuid());
  logger.info('Generating authorization URL…');
  const target = await getAuthorizationUrl(deps.publicHost, deps.clientId, await deps.stateManager.getState());
  logger.info(`Generated authorization URL: ${target}`);
  res.redirect(target);
};
