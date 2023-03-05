/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder } from 'node-pg-migrate';

enum TableName {
  USERS = 'users',
}

enum ColumnName {
  ACCESS_TOKEN = 'access_token',
  DISPLAY_NAME = 'display_name',
  EXPIRES = 'expires',
  ID = 'id',
  LOGIN = 'login',
  REFRESH_TOKEN = 'refresh_token',
  SCOPE = 'scope',
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(TableName.USERS, {
    [ColumnName.ID]: {
      type: 'character varying(64)',
      notNull: true,
      unique: true,
      primaryKey: true,
    },
    [ColumnName.LOGIN]: {
      type: 'character varying(25)',
      notNull: true,
      unique: true,
    },
    [ColumnName.DISPLAY_NAME]: {
      type: 'character varying(25)',
      notNull: true,
      unique: true,
    },
    [ColumnName.ACCESS_TOKEN]: {
      type: 'character varying(128)',
      notNull: false,
    },
    [ColumnName.REFRESH_TOKEN]: {
      type: 'character varying(128)',
      notNull: false,
    },
    [ColumnName.SCOPE]: {
      // Longest known scope value is 33 chars long at the time of writing
      type: 'character varying(40) array',
      notNull: false,
    },
    [ColumnName.EXPIRES]: {
      type: 'timestamptz',
      notNull: false,
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable(TableName.USERS);
}
