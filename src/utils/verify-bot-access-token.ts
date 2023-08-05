import { AccessTokenManager } from '../classes/access-token-manager';
import { waitForKeyPress } from './wait-for-keypress';
import { updateUser, UpdateUserDeps } from './update-user';
import { TwitchEventSubManager } from '../classes/twitch-event-sub-manager';

interface ReadAuthCodeDeps extends Omit<UpdateUserDeps, 'token' | 'updateTokens'> {
  publicHost: string;
  botUsername: string;
  accessTokenManager: AccessTokenManager;
  twitchEventSubManager: TwitchEventSubManager;
}

export const verifyBotAccessToken = async (deps: ReadAuthCodeDeps): Promise<void> => {
  const obtainCode = async (): Promise<void> => {
    deps.logger.info(`[verifyBotAccessToken] Looking for access token for user ${deps.botUsername}…`);
    const token = await deps.accessTokenManager.getToken(deps.logger, deps.botUsername).catch(error => {
      deps.logger.error(`[verifyBotAccessToken] ${error}`);
    });

    if (!token) {
      deps.logger.warn(`[verifyBotAccessToken] No access token found for bot user ${deps.botUsername}, please authenticate using the URL below:\n${deps.publicHost}`);

      // Wait for user to press a key before trying again
      deps.logger.info('[verifyBotAccessToken] Waiting for authentication, press any key when finished…');
      const keypress = await waitForKeyPress();

      if (keypress.ctrl && keypress.name === 'c') {
        throw new Error('[verifyBotAccessToken] Access code verification aborted');
      }

      return obtainCode();
    }

    const { log } = await updateUser({ ...deps, token: token.access_token, updateTokens: undefined });
    if (log) {
      deps.logger(log.severity, `[verifyBotAccessToken] ${log.message}`);
    }
  };

  return obtainCode();
};
