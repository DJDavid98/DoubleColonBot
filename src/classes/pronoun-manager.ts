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

  async getPronouns(login: string): Promise<string[]> {
    // Use empty string to denote a known unknown value
    const cacheKey = this.getUserPronounCacheKey(login);
    const userPronouns: string[] = [];
    const cacheValue = await this.redisManager.get(this.logger, cacheKey);
    let rawPronounData: unknown;
    let dataFromCache = false;
    if (cacheValue !== null) {
      try {
        rawPronounData = JSON.parse(cacheValue);
        dataFromCache = true;
        this.logger.debug('Loaded pronoun data from cache');
      } catch (error) {
        this.logger.error(`Could not parse cached pronoun data: ${getExceptionMessage(error)}`);
      }
      return JSON.parse(cacheValue);
    }
    if (!rawPronounData) {
      const apiUsername = encodeURIComponent(login.toLowerCase());
      this.logger.debug(`Fetching user pronoun data from API for username ${apiUsername}`);
      rawPronounData = await this.fetchData(`/api/users/${apiUsername}`);
      this.logger.debug(`Received user pronoun data from API for username: ${JSON.stringify(rawPronounData)}`);
    }
    const validatedResult = validateUserPronounApiResponse(rawPronounData);
    if (validatedResult.error) {
      this.logger.error(`Could not validate user pronoun API response:\n${validatedResult.error.annotate()}`);
      return [];
    }

    if (validatedResult.value.length > 0) {
      const pronounData = await this.getPronounData();
      if (!pronounData) return [];

      for (const value of validatedResult.value) {
        const userPronounId = value.pronoun_id;
        const label = pronounData?.[userPronounId];
        if (label) {
          userPronouns.push(label);
        }
      }
    }
    if (!dataFromCache) {
      await this.redisManager.put(this.logger, cacheKey, JSON.stringify(userPronouns), this.cacheDurationSeconds);
    }

    return userPronouns;
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
