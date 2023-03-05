import { Client } from 'pg';
import { States, StatesInput, TableTypes } from './database-schema';
import { cleanStaleRecords, runInsertQuery } from './common';

const TABLE: keyof TableTypes = 'states';

export const statesTable = {
  createState: (db: Client, input: StatesInput) => runInsertQuery(db, TABLE, input),
  deleteState: (db: Client, state: States['state']) => db.query('DELETE FROM states WHERE state = $1', [state]),
  deleteStaleRecords: (db: Client, staleTimeMs: number) =>
    cleanStaleRecords(db, 'states', 'created_at', staleTimeMs),
};
