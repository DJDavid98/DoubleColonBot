import Joi from 'joi';

export interface SearchCategory {
  /**
   * An ID that uniquely identifies the game or category.
   */
  id: string;
  /**
   * The name of the game or category.
   */
  name: string;
}

/**
 * Category search response body
 * @see https://dev.twitch.tv/docs/api/reference/#search-categories
 */
export interface SearchCategories {
  /**
   * The list of games or categories that match the query. The list is empty if there are no matches.
   */
  data: SearchCategory[];
}

const searchCategoriesSchema = Joi.object<SearchCategories>({
  data: Joi.array().required().items({
    id: Joi.string().required(),
    name: Joi.string().required(),
  }),
});

export const validateSearchCategories = (response: unknown) =>
  searchCategoriesSchema.validate(response, { stripUnknown: true });
