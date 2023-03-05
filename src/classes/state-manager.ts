import { Client } from 'pg';
import { statesTable } from '../database/states-table';
import { getRandomUuid } from '../utils/random';

const HOUR_IN_MS = 3600e3;

/**
 * Stores secure state values for OAuth authentication in the database
 */
export class StateManager {
  constructor(private db: Client) {}

  async startCleanupInterval(staleTimeMs = HOUR_IN_MS) {
    console.debug(`[StateManager] Initializing with stale time of ${staleTimeMs} ms`);

    await this.cleanupOldStateValues(staleTimeMs);
    setInterval(() => void this.cleanupOldStateValues(staleTimeMs), staleTimeMs);
  }

  async getState(): Promise<string> {
    const state = getRandomUuid();
    console.debug(`[StateManager] Generated state: ${state}, saving…`);
    await statesTable.createState(this.db, { state });
    console.debug(`[StateManager] State ${state} saved`);
    return state;
  }

  /**
   * Validates the provided state value by trying to delete it from the database and checking the affected rows
   * @param state
   */
  async validateState(state: string): Promise<boolean> {
    console.debug(`[StateManager] Validating state: ${state}…`);
    const valid = await statesTable.deleteState(this.db, state).then(({ rowCount }) => rowCount > 0);
    console.debug(`[StateManager] State ${state} validation result: ${valid}`);
    return valid;
  }

  /**
   * Delete old state values that have been in the process for over an hour
   */
  async cleanupOldStateValues(staleTimeMs: number) {
    console.info('[StateManager] Cleaning up stale state values…');
    await statesTable.deleteStaleRecords(this.db, staleTimeMs);
    console.info('[StateManager] Stale state values cleaned up successfully');
  }
}
