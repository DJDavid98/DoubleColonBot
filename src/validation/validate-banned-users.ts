import Joi from 'joi';

/**
 * Banned users response body
 * @see https://dev.twitch.tv/docs/api/reference/#get-banned-users
 */
export interface BannedUsers {
  /**
   * The list of users.
   */
  data: Array<{
    /**
     *    The ID of the banned user.
     */
    user_id: string;
    /**
     * The banned user’s login name.
     */
    user_login: string;
    /**
     * The banned user’s display name.
     */
    user_name: string;
    /**
     * The UTC date and time (in RFC3339 format) of when the timeout expires, or an empty string if the user is permanently banned.
     */
    expires_at: string;
    /**
     * The UTC date and time (in RFC3339 format) of when the user was banned.
     */
    created_at: string;
    /**
     * The reason the user was banned or put in a timeout if the moderator provided one.
     */
    reason: string;
    /**
     * The ID of the moderator that banned the user or put them in a timeout.
     */
    moderator_id: string;
    /**
     * The moderator’s login name.
     */
    moderator_login: string;
    /**
     * The moderator’s display name.
     */
    moderator_name: string;
  }>;
}

const schema = Joi.object<BannedUsers>({
  data: Joi.array().required().items(Joi.object({
    user_id: Joi.string().required(),
    user_login: Joi.string().required().lowercase(),
    user_name: Joi.string().required(),
    expires_at: Joi.string().required().allow(''),
    created_at: Joi.string().required(),
    reason: Joi.string().required().allow(''),
    moderator_id: Joi.string().required(),
    moderator_login: Joi.string().required().lowercase(),
    moderator_name: Joi.string().required(),
  })),
});

export const validateBannedUsers = (data: unknown) => schema.validate(data, { stripUnknown: true });
