import Joi from 'joi';

/**
 * Access token response
 * @see https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#use-the-authorization-code-to-get-a-token
 */
export interface AccessToken {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string[];
  token_type: string;
}

const accessTokenSchema = Joi.object<AccessToken>({
  access_token: Joi.string().required(),
  expires_in: Joi.number().required().greater(0),
  refresh_token: Joi.string().required(),
  scope: Joi.array().items(Joi.string()).required(),
  token_type: Joi.string().required(),
});

export const validateAccessToken = (response: unknown) => accessTokenSchema.validate(response, { stripUnknown: true });
