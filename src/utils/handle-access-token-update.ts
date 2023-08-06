import { validateAccessToken } from '../validation/validate-access-token';
import { JsonResponseProps } from '../factories/json-response-factory';
import { updateUser, UpdateUserDeps } from './update-user';

export interface HandleAccessTokenUpdateDeps {
  tokenResponse: unknown;
  updateUserDeps: Omit<UpdateUserDeps, 'token' | 'updateTokens'>;
}

export const handleAccessTokenUpdate = async (deps: HandleAccessTokenUpdateDeps): Promise<JsonResponseProps> => {
  const token = validateAccessToken(deps.tokenResponse);
  if (!token.value || token.error) {
    return {
      statusCode: 500,
      log: {
        severity: 'error',
        message: `Failed to validate access token: ${token.error.annotate()}`,
      },
      body: 'Could not get an access token, please try again later.',
    };
  }

  return updateUser({ ...deps.updateUserDeps, token: token.value.access_token, updateTokens: token.value });
};
