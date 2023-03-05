import { BOT_REQUIRED_SCOPES, OAUTH_AUTHORIZE_URL } from '../constants/twitch';
import { getRedirectUri } from './get-redirect-uri';

export const getAuthorizationUrl = async (publicHost: string, clientId: string, state: string): Promise<string> => {
  const params = {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getRedirectUri(publicHost),
    scope: BOT_REQUIRED_SCOPES.join(' '),
    state,
  };
  console.debug(JSON.stringify(params, null, 4));
  return `${OAUTH_AUTHORIZE_URL}?${new URLSearchParams(params)}`;
};
