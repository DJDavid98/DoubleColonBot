import { typescriptOfSchema } from 'pg-to-ts';
import { env } from '../constants/env';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import * as defaultConfig from '../node-pg-migrate.config.json';

/**
 * Takes the generated schema and a set of transformer functions to alter the schema file with
 */
const transformSchema = (schema: string, transformers: Array<((input: string) => string)>) =>
  transformers.reduce((finalSchema, transformer) => transformer(finalSchema), schema);

(async () => {
  console.info('Generating schema definitions…');
  const databaseSchema = await typescriptOfSchema(env.DATABASE_URL, undefined, [defaultConfig['migrations-table']], undefined, {
    camelCase: false,
  });

  console.info('Writing schema file…');
  const databaseSchemaPath = join(__dirname, '..', 'database', 'database-schema.ts');
  await fs.writeFile(databaseSchemaPath, transformSchema(databaseSchema, [
    // Fix empty `tables` constant with invalid syntax
    s => s.replace(/tables = {\s+,\s+}/g, 'tables = {}'),
    // Remove unnecessary ignore line
    s => s.replace(/\/\* tslint:disable \*\/\r?\n/, ''),
    // Replace lengthy generation command with package script
    s => s.replace(/^([\s*]+)\$ pg-to-ts.*/m, '$1$ npm run postdb'),
  ]));

  console.info(`Schema file written to ${databaseSchemaPath}`);
})();


