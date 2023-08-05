import { Client } from 'pg';
import { tables, TableTypes } from './database-schema';

type DateKeys<T> = keyof { [k in keyof T & string]: T[k] extends Date ? Date : never };

/**
 * Creates an INSERT query with the provided parameters
 * @param db Database client
 * @param table Name of the table to insert into
 * @param params Input options for inserting into the provided table
 * @param upsertCols When specified, an "upsert" (update insert) will be performed on the specified columns
 */
export const runInsertQuery = <Table extends keyof TableTypes>(db: Client, table: Table, params: TableTypes[Table]['input'], upsertCols?: Array<keyof TableTypes[Table]['input'] & string>) => {
  const { columns, requiredForInsert } = tables[table];
  const requiredForInsertSet = new Set(requiredForInsert);
  /**
   * List of columns for which we actually have data
   */
  const filteredColumns = (columns as unknown as Array<keyof typeof params>).filter(col => {
    const key = col as keyof typeof params;
    return requiredForInsertSet.has(key as never) || params[key] !== undefined;
  });
  const filteredColumnsSet = new Set(filteredColumns);
  let paramIndex = 1;
  const columnNames = filteredColumns.join(', ');
  const columnPlaceholders = filteredColumns.map(() => `$${paramIndex++}`).join(', ');
  let columnData = filteredColumns.map(col => {
    const key = col as keyof typeof params;
    return key in params ? params[key] : null;
  }) as unknown[];
  let sql = `INSERT INTO ${table} (${columnNames})
  VALUES (${columnPlaceholders})`;
  const availableUpsertCols = upsertCols?.filter(upsertCol => filteredColumnsSet.has(upsertCol));
  if (availableUpsertCols && 'id' in params) {
    sql += ` ON CONFLICT (id) DO UPDATE SET ${availableUpsertCols.map((upsertCol) => `${upsertCol} = $${paramIndex++}`).join(', ')};`;
    columnData = [...columnData, ...availableUpsertCols.map(upsertCol => params[upsertCol])];
  }
  return db.query(sql, columnData);
};

export const cleanStaleRecords = <Table extends keyof TableTypes>(
  db: Client,
  table: Table,
  field: DateKeys<TableTypes[Table]['select']>,
  staleTimeMs: number) =>
    db.query(`DELETE
  FROM ${table}
  WHERE ${field} + INTERVAL '${Math.round(staleTimeMs / 1e3)} SECOND' < NOW()`);
