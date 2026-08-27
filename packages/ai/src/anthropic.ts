import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import {
  ModelError,
  ModelSchemaError,
  type ModelProvider,
  type StructuredRequest,
  type StructuredResult,
} from './provider.js';

/**
 * The Anthropic implementation.
 *
 * Three choices worth stating. Structured output is enforced by the API against
 * the same zod schema the rest of the codebase uses, so a draft either parses
 * into a real Deck or fails loudly. The system prompt is cached, because it is
 * byte-identical between calls and carries the whole methodology. And every
 * call streams: a twelve-slide deck is a large structured output, and a
 * non-streaming request that large is a request that times out.
 */

/** Deck drafting is a long structured output; give it room. */
const DEFAULT_MAX_TOKENS = 32_000;

export interface AnthropicProviderOptions {
  apiKey?: string;
  /** Defaults to Claude Opus 5. */
  model?: string;
  /** Passed through to the SDK. Deck drafting can run for minutes. */
  timeoutMs?: number;
  maxRetries?: number;
}

export class AnthropicProvider implements ModelProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: AnthropicProviderOptions = {}) {
    const apiKey = options.apiKey ?? process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new ModelError(
        'No Anthropic API key. Set ANTHROPIC_API_KEY, or pass one to AnthropicProvider.',
        false,
      );
    }

    this.client = new Anthropic({
      apiKey,
      timeout: options.timeoutMs ?? 10 * 60 * 1000,
      maxRetries: options.maxRetries ?? 2,
    });
    this.model = options.model ?? 'claude-opus-5';
  }

  async structured<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const started = Date.now();

    // The system prompt carries the methodology and the house rules and does
    // not change between calls, so it is worth a cache breakpoint.
    const system: Anthropic.TextBlockParam[] = [
      {
        type: 'text',
        text: request.system,
        ...(request.cacheSystem === false ? {} : { cache_control: { type: 'ephemeral' as const } }),
      },
    ];

    try {
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        system,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: request.effort ?? 'high',
          format: zodOutputFormat(request.schema),
        },
        messages: [{ role: 'user', content: request.user }],
      });

      const response = await stream.finalMessage();

      if (response.stop_reason === 'refusal') {
        throw new ModelError(
          'The model declined this request. Deck content is author-supplied, so check the brief for ' +
            'anything that reads as a request to impersonate a real company or person.',
          false,
        );
      }

      const parsed = this.parse(request, response);

      return {
        value: parsed,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
          cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
        },
        model: response.model,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      throw wrap(error);
    }
  }

  /**
   * Read the structured answer.
   *
   * The API validates against the schema, but the SDK's parsed value can still
   * be null when the model hits the token ceiling mid-object. Re-parsing here
   * turns that into a typed error naming the fields rather than a null
   * dereference three layers up.
   */
  private parse<T>(request: StructuredRequest<T>, response: Anthropic.Message): T {
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    if (response.stop_reason === 'max_tokens') {
      throw new ModelError(
        `The answer was cut off at the token limit (${request.maxTokens ?? DEFAULT_MAX_TOKENS}). Raise maxTokens or ask for fewer slides at once.`,
        true,
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (cause) {
      throw new ModelError(`The model did not return JSON for ${request.schemaName}.`, true, { cause });
    }

    const result = request.schema.safeParse(raw);
    if (!result.success) {
      const summary = result.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
      throw new ModelSchemaError(
        `The model's ${request.schemaName} did not match the schema: ${summary}`,
        result.error.issues,
        raw,
      );
    }
    return result.data;
  }
}

/** Map SDK errors onto our own, preserving whether a retry could help. */
function wrap(error: unknown): unknown {
  if (error instanceof ModelError) return error;

  if (error instanceof Anthropic.RateLimitError) {
    return new ModelError('Rate limited by the Anthropic API.', true, { cause: error });
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return new ModelError('The Anthropic API key was rejected.', false, { cause: error });
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new ModelError(`The Anthropic API rejected the request: ${error.message}`, false, { cause: error });
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new ModelError('Could not reach the Anthropic API.', true, { cause: error });
  }
  if (error instanceof Anthropic.APIError) {
    return new ModelError(`Anthropic API error ${error.status}: ${error.message}`, (error.status ?? 500) >= 500, {
      cause: error,
    });
  }
  return error;
}
