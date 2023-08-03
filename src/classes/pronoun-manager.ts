import {
  validatePronounsApiResponse,
  validateUserPronounApiResponse,
} from '../validation/validate-pronoun-api-response';
import { Logger } from '../model/logger';
import { getExceptionMessage } from '../utils/get-exteption-message';
import { RedisManager } from './redis-manager';

export type PronounData = Partial<Record<string, string>>;

export class PronounManager {
  private pronounDataCacheKey = 'pronouns';

  private cacheDurationSeconds = 300;

  public static readonly serviceUrl = 'https://pronouns.alejo.io';

  constructor(private redisManager: RedisManager, private logger: Logger) {}

  async getPronoun(login: string): Promise<string | null> {
    // Use empty string to denote a known unknown value
    const cacheKey = this.getUserPronounCacheKey(login);
    let userPronoun = await this.redisManager.get(this.logger, cacheKey);
    if (userPronoun === null) {
      const apiUsername = encodeURIComponent(login.toLowerCase());
      this.logger.debug(`Fetching user pronoun data from API for username ${apiUsername}`);
      const result = await this.fetchData(`/api/users/${apiUsername}`);
      this.logger.debug(`Received user pronoun data from API for username: ${JSON.stringify(result)}`);
      const validatedResult = validateUserPronounApiResponse(result);
      if (validatedResult.error) {
        this.logger.error(`Could not validate user pronoun API response:\n${validatedResult.error.annotate()}`);
        return null;
      }

      userPronoun = '';
      if (validatedResult.value.length > 0) {
        const userPronounId = validatedResult.value[0].pronoun_id;
        const pronounData = await this.getPronounData();
        if (!pronounData) return null;

        userPronoun = pronounData?.[userPronounId] || '';
      }
      await this.redisManager.put(this.logger, cacheKey, userPronoun, this.cacheDurationSeconds);
    }

    // May be empty string, fall back to null in that case
    return userPronoun.length > 0 ? userPronoun : null;
  }

  private async getPronounData(): Promise<PronounData | null> {
    const cacheKey = this.pronounDataCacheKey;
    const cacheValue = await this.redisManager.get(this.logger, cacheKey);
    let rawPronounData: unknown;
    let dataFromCache = false;
    if (typeof cacheValue === 'string') {
      try {
        rawPronounData = JSON.parse(cacheValue);
        dataFromCache = true;
        this.logger.debug('Loaded pronoun data from cache');
      } catch (error) {
        this.logger.error(`Could not parse cached pronoun data: ${getExceptionMessage(error)}`);
      }
    }
    if (!rawPronounData) {
      // Request data if missing from cache
      this.logger.debug('Fetching pronoun data from API');
      rawPronounData = await this.fetchData('/api/pronouns');
      this.logger.debug(`Received pronoun data from API: ${JSON.stringify(rawPronounData)}`);
    }
    const validatedResult = validatePronounsApiResponse(rawPronounData);
    if (validatedResult.error) {
      this.logger.error(`Could not validate pronouns API response:\n${validatedResult.error.annotate()}`);
      return null;
    }
    if (!dataFromCache) {
      await this.redisManager.put(this.logger, cacheKey, JSON.stringify(validatedResult.value), this.cacheDurationSeconds);
    }

    return validatedResult.value.reduce((data, item) => ({ ...data, [item.name]: item.display }), {} as PronounData);
  }

  private getUserPronounCacheKey(login: string): string {
    return `pronoun-${login}`;
  }

  private fetchData(endpoint: string): Promise<unknown> {
    return fetch(PronounManager.serviceUrl + endpoint).then(r => r.json());
  }
}
