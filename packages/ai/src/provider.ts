import type { z } from 'zod';

/**
 * The model interface.
 *
 * Every agent in this package depends on this, never on a vendor SDK. That is
 * not ceremony: the pitch agents are prompts plus schemas, and the day a
 * cheaper or better model is worth using, or the day a customer needs this to
 * run against their own endpoint, the change should be one file.
 */

export interface StructuredRequest<T> {
  /** What the model is being asked to do. Stable across calls, so it caches. */
  system: string;
  /** The request itself. */
  user: string;
  /** The shape the answer must take. */
  schema: z.ZodType<T>;
  /** Names the schema for the model. */
  schemaName: string;
  /**
   * Higher effort costs more and thinks longer.
   *
   * These are the levels the installed SDK accepts. `xhigh` exists on the API
   * but not in this SDK's types, so it is deliberately absent rather than cast
   * past the compiler.
   */
  effort?: 'low' | 'medium' | 'high' | 'max';
  maxTokens?: number;
  /** Cache the system prompt. On by default: it is identical between calls. */
  cacheSystem?: boolean;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface StructuredResult<T> {
  value: T;
  usage: ModelUsage;
  model: string;
  latencyMs: number;
}

export interface ModelProvider {
  readonly name: string;
  /**
   * Ask for a value of a known shape.
   *
   * Implementations must either return a value that parsed against the schema
   * or throw. A partially-parsed result is a failed job, never a half-written
   * slide: the deck is a document people send to investors, and a field that
   * silently arrived as undefined is worse than an error.
   */
  structured<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>>;
}

export class ModelError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ModelError';
  }
}

/** Thrown when the model's answer does not fit the schema after retries. */
export class ModelSchemaError extends ModelError {
  constructor(
    message: string,
    readonly issues: z.core.$ZodIssue[],
    readonly raw: unknown,
  ) {
    super(message, false);
    this.name = 'ModelSchemaError';
  }
}
