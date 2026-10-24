import { readFile } from 'node:fs/promises';

const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS = 40;

function splitStatements(text) {
  return text
    .split(/;[ \t]*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function migrate(pool) {
  const statements = splitStatements(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));

  for (let attempt = 1; ; attempt += 1) {
    try {
      for (const statement of statements) await pool.query(statement);
      console.log(`Datenbankschema aktuell (${statements.length} Anweisungen)`);
      return;
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) throw error;
      console.log(`Datenbank noch nicht bereit (${error.code ?? error.message}), neuer Versuch ${attempt}/${MAX_ATTEMPTS}`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}
