/**
 * Schema.
 *
 * Migrations are plain SQL strings applied in order and recorded, rather than a
 * migration framework: there is one table, one history table, and no reason for
 * a dependency that has opinions about both.
 */

export interface Migration {
  id: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'decks',
    sql: `
      CREATE TABLE IF NOT EXISTS decks (
        id             TEXT PRIMARY KEY,
        title          TEXT NOT NULL,
        company        TEXT NOT NULL,
        theme_id       TEXT NOT NULL,
        methodology_id TEXT NOT NULL,
        slide_count    INTEGER NOT NULL DEFAULT 0,
        document       JSONB NOT NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS decks_updated_at_idx ON decks (updated_at DESC);

      CREATE TABLE IF NOT EXISTS deck_versions (
        deck_id   TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
        version   INTEGER NOT NULL,
        note      TEXT NOT NULL DEFAULT '',
        document  JSONB NOT NULL,
        saved_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (deck_id, version)
      );

      CREATE INDEX IF NOT EXISTS deck_versions_deck_idx ON deck_versions (deck_id, version DESC);
    `,
  },
];

export const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS cubpitch_migrations (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;
