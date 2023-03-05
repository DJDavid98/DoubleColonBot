import Joi from 'joi';

/**
 * Users response body
 * @see https://dev.twitch.tv/docs/api/reference/#get-users
 */
export interface Users {
  /**
   * The list of users.
   */
  data: Array<{
    /**
     * An ID that identifies the user.
     */
    id: string;
    /**
     * The user’s login name.
     */
    login: string;
    /**
     * The user’s display name.
     */
    display_name: string;
  }>;
}

const usersSchema = Joi.object<Users>({
  data: Joi.array().required().items(Joi.object({
    id: Joi.string().required(),
    login: Joi.string().required().lowercase(),
    display_name: Joi.string().required(),
  })),
});

export const validateUsers = (data: unknown) => usersSchema.validate(data, { stripUnknown: true });
