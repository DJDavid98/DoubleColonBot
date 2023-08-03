import { Client } from 'pg';
import { ChatSettings, ChatSettingsInput, TableTypes } from './database-schema';
import { runInsertQuery } from './common';

const TABLE: keyof TableTypes = 'chat_settings';

export const chatSettingsTable = {
  createChatSetting: (db: Client, input: ChatSettingsInput) => runInsertQuery(db, TABLE, input),
  selectChatSetting: (db: Client, login: ChatSettings['login']) => db.query<ChatSettings>('SELECT * FROM chat_settings WHERE login = $1', [login]),
  updateChatSetting: (db: Client, login: ChatSettings['login'], column: Omit<keyof ChatSettings, 'login'>, value: string | null) =>
    db.query<ChatSettings>(`UPDATE chat_settings
    SET ${column} = $1
    WHERE login = $2`, [value, login]),
  deleteChatSetting: (db: Client, login: ChatSettings['login']) => db.query('DELETE FROM chat_settings WHERE login = $1', [login]),
};
