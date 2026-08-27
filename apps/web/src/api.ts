import type { CritiqueResult, QaResult } from '@cubpitch/ai';
import type { Deck, DeckReview } from '@cubpitch/core';

/**
 * The editor's view of the server.
 *
 * Every mutation carries the `updatedAt` the client last saw, so a save that
 * would overwrite someone else's edit comes back as a conflict the editor can
 * explain rather than as silent data loss.
 */

export interface DeckSummary {
  id: string;
  title: string;
  company: string;
  themeId: string;
  methodologyId: string;
  slideCount: number;
  updatedAt: string;
}

export interface OverflowFinding {
  slideId: string;
  title: string;
  number: number;
  overflowPx: number;
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/** A model call failed. `retryable` decides whether the UI offers a retry. */
export class ModelCallError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ModelCallError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = (body as { error?: string } | null)?.error ?? `${response.status} ${response.statusText}`;
    if (response.status === 409) throw new ConflictError(message);
    if (response.status === 502 || response.status === 503) {
      throw new ModelCallError(message, (body as { retryable?: boolean } | null)?.retryable ?? response.status === 503);
    }
    throw new Error(message);
  }
  return body as T;
}

export const api = {
  listDecks: (): Promise<DeckSummary[]> => request('/api/decks'),

  createDeck: (input: { company: string; title?: string; methodologyId?: string; themeId?: string }): Promise<Deck> =>
    request('/api/decks', { method: 'POST', body: JSON.stringify(input) }),

  getDeck: (id: string): Promise<Deck> => request(`/api/decks/${id}`),

  saveDeck: (deck: Deck, expectedUpdatedAt: string, note?: string): Promise<Deck> =>
    request(`/api/decks/${deck.id}`, {
      method: 'PUT',
      body: JSON.stringify({ deck, expectedUpdatedAt, note }),
    }),

  deleteDeck: (id: string): Promise<void> => request(`/api/decks/${id}`, { method: 'DELETE' }),

  review: (id: string): Promise<DeckReview> => request(`/api/decks/${id}/review`),

  layout: (id: string): Promise<OverflowFinding[]> => request(`/api/decks/${id}/layout`),

  exportUrl: (id: string, format: 'pdf' | 'pptx'): string => `/api/decks/${id}/export.${format}`,

  draft: (input: { brief: string; company: string; methodologyId?: string; themeId?: string; guidance?: string }): Promise<{
    deck: Deck;
    assumptions: string[];
    missing: string[];
  }> => request('/api/ai/draft', { method: 'POST', body: JSON.stringify(input) }),

  critique: (id: string, audience?: string): Promise<CritiqueResult> =>
    request(`/api/decks/${id}/critique`, { method: 'POST', body: JSON.stringify({ audience }) }),

  qa: (id: string, audience?: string): Promise<QaResult> =>
    request(`/api/decks/${id}/qa`, { method: 'POST', body: JSON.stringify({ audience }) }),
};
