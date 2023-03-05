import { AccessTokenManager } from '../classes/access-token-manager';
import { waitForKeyPress } from './wait-for-keypress';
import { getAuthStartUrl } from './get-auth-start-url';
import { updateUser, UpdateUserDeps } from './update-user';

interface ReadAuthCodeDeps extends Omit<UpdateUserDeps, 'token'> {
  publicHost: string;
  botUsername: string;
  accessTokenManager: AccessTokenManager;
}

export const verifyBotAccessToken = async (deps: ReadAuthCodeDeps): Promise<void> => {
  const obtainCode = async (): Promise<void> => {
    deps.logger.info(`Looking for access token for user ${deps.botUsername}…`);
    const token = await deps.accessTokenManager.getToken(deps.logger, deps.botUsername).catch(error => {
      deps.logger.error(error);
    });

    if (!token) {
      deps.logger.warn(`No access token found for bot user ${deps.botUsername}, please authenticate using the URL below:`);
      deps.logger.info(getAuthStartUrl(deps.publicHost));

      // Wait for user to press a key before trying again
      deps.logger.info('Waiting for authentication, press any key when finished…');
      const keypress = await waitForKeyPress();

      if (keypress.ctrl && keypress.name === 'c') {
        throw new Error('Access code verification aborted');
      }

      return obtainCode();
    }

    const { log } = await updateUser({ ...deps, token });
    if (log) {
      deps.logger(log.severity, log.message);
    }
  };

  return obtainCode();
};
