import { RequestHandler } from 'express';
import { validateAuthorizationCode } from '../validation/validate-authorization-code';
import { fetchAccessToken } from '../utils/fetch-access-token';
import { AppHandlerDependencies } from '../model/app-handler-dependencies';
import { getRandomUuid } from '../utils/random';
import { jsonResponseFactory } from '../factories/json-response-factory';
import { handleAccessTokenUpdate } from '../utils/handle-access-token-update';

/**
 * Handles the authorization code redirection target route
 */
export const redirectTargetHandler = (deps: AppHandlerDependencies): RequestHandler => async (req, res) => {
  const correlationId = getRandomUuid();
  const { respond: jsonResponse, logger } = jsonResponseFactory(res, correlationId);
  const { query } = req;

  // Input validation
  const authCode = validateAuthorizationCode(query);
  if (!authCode.value || authCode.error) {
    return jsonResponse({
      statusCode: 400,
      log: {
        severity: 'info',
        message: 'Invalid request parameters provided',
      },
      body: authCode.error,
    });
  }

  // Check provided state
  const stateValid = await deps.stateManager.validateState(logger, authCode.value.state);
  if (!stateValid) {
    return jsonResponse({
      statusCode: 403,
      log: {
        severity: 'info',
        message: `Invalid state parameter ${authCode.value.state} provided, discarding request`,
      },
      body: 'Invalid (or expired) state parameter provided',
    });
  }

  // Get an access token
  const tokenResponse = await fetchAccessToken({
    logger,
    publicHost: deps.publicHost,
    input: authCode.value,
    clientId: deps.clientId,
    clientSecret: deps.clientSecret,
  });

  const appResponse = await handleAccessTokenUpdate({
    tokenResponse,
    updateUserDeps: {
      logger,
      clientId: deps.clientId,
      db: deps.db,
      accessTokenManager: deps.accessTokenManager,
      channelManager: deps.channelManager,
      twitchEventSubManager: deps.twitchEventSubManager,
    },
  });

  jsonResponse(appResponse);
};
