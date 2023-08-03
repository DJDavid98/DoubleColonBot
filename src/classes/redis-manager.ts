import { Redis } from 'ioredis';
import { redisClientFactory } from '../factories/redis-client-factory';
import { LoggerFunction } from '../model/logger';

export class RedisManager {
  private client: Redis | undefined;

  async initClient(startupLogger: LoggerFunction): Promise<void> {
    this.client = await redisClientFactory(startupLogger);
  }

  async get(logger: LoggerFunction, key: string): Promise<string | null> {
    if (!this.client) throw this.getMissingClientError();
    const value = await this.client.get(key);
    logger('debug', `[RedisManager] Get ${key} value: ${value}`);
    return value ?? null;
  }

  async put(logger: LoggerFunction, key: string, value: string, timeoutSeconds: number): Promise<void> {
    if (!this.client) throw this.getMissingClientError();
    await this.client.set(key, value, 'EX', timeoutSeconds);
    logger('debug', `[RedisManager] Set ${key} to ${value} (expires in ${timeoutSeconds}s)`);
  }

  private getMissingClientError() {
    return new Error('Redis client has not been initialized');
  }
}
