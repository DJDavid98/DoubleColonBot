/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder } from 'node-pg-migrate';

enum TableName {
  CHAT_SETTINGS = 'chat_settings',
}

enum ColumnName {
  LOGIN = 'login',
  NAME_COLOR = 'name_color',
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(TableName.CHAT_SETTINGS, {
    [ColumnName.LOGIN]: {
      type: 'character varying(25)',
      notNull: true,
      unique: true,
      primaryKey: true,
    },
    [ColumnName.NAME_COLOR]: {
      type: 'character(6)',
      notNull: false,
      default: null,
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable(TableName.CHAT_SETTINGS);
}
