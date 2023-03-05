import { Client } from 'pg';
import { statesTable } from '../database/states-table';
import { getRandomUuid } from '../utils/random';
import { Logger } from '../model/logger';

const HOUR_IN_MS = 3600e3;

/**
 * Stores secure state values for OAuth authentication in the database
 */
export class StateManager {
  constructor(private db: Client) {}

  async startCleanupInterval(logger: Logger, staleTimeMs = HOUR_IN_MS) {
    logger.debug(`[StateManager] Initializing with stale time of ${staleTimeMs} ms`);

    await this.cleanupOldStateValues(logger, staleTimeMs);
    setInterval(() => void this.cleanupOldStateValues(logger, staleTimeMs), staleTimeMs);
  }

  async getState(logger: Logger): Promise<string> {
    const state = getRandomUuid();
    logger.debug(`[StateManager] Generated state: ${state}, saving…`);
    await statesTable.createState(this.db, { state });
    logger.debug(`[StateManager] State ${state} saved`);
    return state;
  }

  /**
   * Validates the provided state value by trying to delete it from the database and checking the affected rows
   */
  async validateState(logger: Logger, state: string): Promise<boolean> {
    logger.debug(`[StateManager] Validating state: ${state}…`);
    const valid = await statesTable.deleteState(this.db, state).then(({ rowCount }) => rowCount > 0);
    logger.debug(`[StateManager] State ${state} validation result: ${valid}`);
    return valid;
  }

  /**
   * Delete old state values that have been in the process for over an hour
   */
  async cleanupOldStateValues(logger: Logger, staleTimeMs: number) {
    logger.info('[StateManager] Cleaning up stale state values…');
    await statesTable.deleteStaleRecords(this.db, staleTimeMs);
    logger.info('[StateManager] Stale state values cleaned up successfully');
  }
}
