import { reviewDeck, type Deck, type DeckReview } from '@cubpitch/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ConflictError } from './api.js';

/**
 * Deck editing state.
 *
 * Three things this has to get right, all of them things authors notice only
 * when they go wrong:
 *
 * Undo works because every operation in `@cubpitch/core` returns a new deck, so
 * the history is a list of previous decks rather than a log of inverse edits.
 *
 * Saving is debounced and skipped when nothing changed, because a deck with
 * embedded images is not small and a save on every keystroke makes typing feel
 * like it is fighting back.
 *
 * The review runs locally on every change. It is pure and fast, and an author
 * who has to press a button to find out their ask has no number will not press
 * it.
 */

const SAVE_DEBOUNCE_MS = 900;
const HISTORY_LIMIT = 100;

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'error';

export interface DeckEditor {
  deck: Deck | null;
  review: DeckReview | null;
  saveState: SaveState;
  saveError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  /** Apply a pure operation from `@cubpitch/core`. */
  apply: (change: (deck: Deck) => Deck) => void;
  undo: () => void;
  redo: () => void;
  saveNow: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useDeck(deckId: string | null): DeckEditor {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const past = useRef<Deck[]>([]);
  const future = useRef<Deck[]>([]);
  /** The updatedAt the server last confirmed, for conflict detection. */
  const baseline = useRef<string>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Deck | null>(null);

  const load = useCallback(async (id: string) => {
    const loaded = await api.getDeck(id);
    past.current = [];
    future.current = [];
    baseline.current = loaded.updatedAt;
    pending.current = null;
    setDeck(loaded);
    setSaveState('idle');
    setSaveError(null);
  }, []);

  useEffect(() => {
    if (!deckId) {
      setDeck(null);
      return;
    }
    void load(deckId).catch((error: unknown) => {
      setSaveError((error as Error).message);
      setSaveState('error');
    });
  }, [deckId, load]);

  const flush = useCallback(async () => {
    const target = pending.current;
    if (!target) return;

    setSaveState('saving');
    try {
      const saved = await api.saveDeck(target, baseline.current);
      baseline.current = saved.updatedAt;
      pending.current = null;
      setSaveState('saved');
      setSaveError(null);
    } catch (error) {
      if (error instanceof ConflictError) {
        // Never overwrite silently. The editor keeps the author's work in
        // memory and asks them what to do.
        setSaveState('conflict');
      } else {
        setSaveState('error');
      }
      setSaveError((error as Error).message);
    }
  }, []);

  const schedule = useCallback(
    (next: Deck) => {
      pending.current = next;
      setSaveState('dirty');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  const apply = useCallback(
    (change: (deck: Deck) => Deck) => {
      setDeck((current) => {
        if (!current) return current;
        const next = change(current);
        if (next === current) return current;

        past.current = [...past.current.slice(-HISTORY_LIMIT), current];
        future.current = [];
        schedule(next);
        return next;
      });
    },
    [schedule],
  );

  const undo = useCallback(() => {
    setDeck((current) => {
      const previous = past.current.at(-1);
      if (!current || !previous) return current;
      past.current = past.current.slice(0, -1);
      future.current = [...future.current, current];
      schedule(previous);
      return previous;
    });
  }, [schedule]);

  const redo = useCallback(() => {
    setDeck((current) => {
      const next = future.current.at(-1);
      if (!current || !next) return current;
      future.current = future.current.slice(0, -1);
      past.current = [...past.current, current];
      schedule(next);
      return next;
    });
  }, [schedule]);

  const saveNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await flush();
  }, [flush]);

  const reload = useCallback(async () => {
    if (deckId) await load(deckId);
  }, [deckId, load]);

  // Saving on unload is best-effort; the debounce means a tab closed mid-edit
  // would otherwise lose the last second of typing.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent): void => {
      if (pending.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const review = useMemo(() => (deck ? reviewDeck(deck) : null), [deck]);

  return {
    deck,
    review,
    saveState,
    saveError,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    apply,
    undo,
    redo,
    saveNow,
    reload,
  };
}
