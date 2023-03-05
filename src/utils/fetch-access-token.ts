import { OAUTH_TOKEN_URL, URL_ENCODED_CONTENT_TYPE_HEADER } from '../constants/twitch';
import { getRedirectUri } from './get-redirect-uri';
import { loggedFetch } from './logged-fetch';
import { Logger } from '../model/logger';

type GetAccessTokenInput = { code: string } | { refresh_token: string };

interface FetchAccessTokenParams {
  publicHost: string;
  input: GetAccessTokenInput;
  clientId: string;
  clientSecret: string;
  logger: Logger;
}

/**
 * Can be used to request a token from Twitch
 * @see https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#authorization-code-grant-flow
 * @see https://dev.twitch.tv/docs/authentication/refresh-tokens/
 */
export const fetchAccessToken = ({
  logger,
  publicHost,
  input,
  clientId,
  clientSecret,
}: FetchAccessTokenParams): Promise<unknown> => {
  const body = new URLSearchParams();
  if ('code' in input) {
    body.append('grant_type', 'authorization_code');
    body.append('code', input.code);
  } else if ('refresh_token' in input) {
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', input.refresh_token);
  } else {
    throw new Error(`Cannot fetch access token based on input: ${JSON.stringify(input)}`);
  }
  body.append('redirect_uri', getRedirectUri(publicHost));
  body.append('client_id', clientId);
  body.append('client_secret', clientSecret);
  return loggedFetch(logger, OAUTH_TOKEN_URL, {
    method: 'POST',
    body,
    headers: URL_ENCODED_CONTENT_TYPE_HEADER,
  }).then(r => r.json());
};
