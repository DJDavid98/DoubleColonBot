/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder } from 'node-pg-migrate';

enum TableName {
  STATES = 'states',
}

enum ColumnName {
  CREATED_AT = 'created_at',
  STATE = 'state',
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(TableName.STATES, {
    [ColumnName.STATE]: {
      type: 'uuid',
      notNull: true,
      unique: true,
      primaryKey: true,
    },
    [ColumnName.CREATED_AT]: {
      type: 'timestamptz',
      notNull: true,
      default: 'now()',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable(TableName.STATES);
}
