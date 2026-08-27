import { parseDeck, type Deck } from '@cubpitch/core';
import pg from 'pg';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations.js';
import {
  ConcurrentWriteError,
  DeckNotFoundError,
  summarise,
  type DeckStore,
  type DeckSummary,
  type DeckVersion,
} from './store.js';

/**
 * Decks in Postgres, for when more than one person edits them.
 *
 * The document is stored whole in a JSONB column rather than shredded across
 * tables. Slides are not independently queried, they are always read and
 * written as part of a deck, and normalising them would buy nothing while
 * making every schema change a migration of the deck model.
 *
 * The columns beside the document are denormalised copies used for the deck
 * list, so listing does not deserialise every deck's slides.
 */

export interface PostgresStoreOptions {
  connectionString?: string;
  pool?: pg.Pool;
}

export class PostgresDeckStore implements DeckStore {
  private readonly pool: pg.Pool;
  private readonly ownsPool: boolean;

  constructor(options: PostgresStoreOptions = {}) {
    if (options.pool) {
      this.pool = options.pool;
      this.ownsPool = false;
    } else {
      this.pool = new pg.Pool({ connectionString: options.connectionString ?? process.env['DATABASE_URL'] });
      this.ownsPool = true;
    }
  }

  /** Apply pending migrations. Safe to call on every boot. */
  async migrate(): Promise<number[]> {
    const client = await this.pool.connect();
    const applied: number[] = [];
    try {
      await client.query('BEGIN');
      await client.query(MIGRATIONS_TABLE);
      const { rows } = await client.query<{ id: number }>('SELECT id FROM cubpitch_migrations');
      const done = new Set(rows.map((row) => row.id));

      for (const migration of MIGRATIONS) {
        if (done.has(migration.id)) continue;
        await client.query(migration.sql);
        await client.query('INSERT INTO cubpitch_migrations (id, name) VALUES ($1, $2)', [migration.id, migration.name]);
        applied.push(migration.id);
      }
      await client.query('COMMIT');
      return applied;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async list(): Promise<DeckSummary[]> {
    const { rows } = await this.pool.query<{
      id: string;
      title: string;
      company: string;
      theme_id: string;
      methodology_id: string;
      slide_count: number;
      updated_at: Date;
    }>(
      `SELECT id, title, company, theme_id, methodology_id, slide_count, updated_at
       FROM decks ORDER BY updated_at DESC`,
    );

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      themeId: row.theme_id,
      methodologyId: row.methodology_id,
      slideCount: row.slide_count,
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async get(id: string): Promise<Deck | null> {
    const { rows } = await this.pool.query<{ document: unknown }>('SELECT document FROM decks WHERE id = $1', [id]);
    const row = rows[0];
    return row ? parseDeck(row.document) : null;
  }

  async put(deck: Deck, options: { expectedUpdatedAt?: string; note?: string } = {}): Promise<Deck> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // FOR UPDATE so a concurrent save blocks here rather than racing us to
      // the write and losing one of the two edits.
      const { rows } = await client.query<{ document: unknown; updated_at: Date }>(
        'SELECT document, updated_at FROM decks WHERE id = $1 FOR UPDATE',
        [deck.id],
      );
      const existing = rows[0];

      if (options.expectedUpdatedAt !== undefined && existing) {
        const actual = parseDeck(existing.document).updatedAt;
        if (actual !== options.expectedUpdatedAt) {
          throw new ConcurrentWriteError(deck.id, options.expectedUpdatedAt, actual);
        }
      }

      if (existing) {
        const { rows: versionRows } = await client.query<{ next: number }>(
          'SELECT COALESCE(MAX(version), 0) + 1 AS next FROM deck_versions WHERE deck_id = $1',
          [deck.id],
        );
        await client.query('INSERT INTO deck_versions (deck_id, version, note, document) VALUES ($1, $2, $3, $4)', [
          deck.id,
          versionRows[0]?.next ?? 1,
          options.note ?? '',
          existing.document,
        ]);
      }

      const saved: Deck = { ...deck, updatedAt: new Date().toISOString() };
      await client.query(
        `INSERT INTO decks (id, title, company, theme_id, methodology_id, slide_count, document, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           company = EXCLUDED.company,
           theme_id = EXCLUDED.theme_id,
           methodology_id = EXCLUDED.methodology_id,
           slide_count = EXCLUDED.slide_count,
           document = EXCLUDED.document,
           updated_at = EXCLUDED.updated_at`,
        [
          saved.id,
          saved.title,
          saved.company.name,
          saved.themeId,
          saved.methodologyId,
          saved.slides.length,
          JSON.stringify(saved),
          saved.createdAt,
          saved.updatedAt,
        ],
      );

      await client.query('COMMIT');
      return saved;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const result = await this.pool.query('DELETE FROM decks WHERE id = $1', [id]);
    if (result.rowCount === 0) throw new DeckNotFoundError(id);
  }

  async versions(id: string): Promise<DeckVersion[]> {
    const { rows } = await this.pool.query<{ version: number; note: string; saved_at: Date }>(
      'SELECT version, note, saved_at FROM deck_versions WHERE deck_id = $1 ORDER BY version DESC',
      [id],
    );
    return rows.map((row) => ({ version: row.version, note: row.note, savedAt: row.saved_at.toISOString() }));
  }

  async getVersion(id: string, version: number): Promise<Deck | null> {
    const { rows } = await this.pool.query<{ document: unknown }>(
      'SELECT document FROM deck_versions WHERE deck_id = $1 AND version = $2',
      [id, version],
    );
    const row = rows[0];
    return row ? parseDeck(row.document) : null;
  }

  async close(): Promise<void> {
    if (this.ownsPool) await this.pool.end();
  }
}

export { summarise };
