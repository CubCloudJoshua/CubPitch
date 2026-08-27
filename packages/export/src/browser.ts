import { chromium, type Browser, type LaunchOptions } from 'playwright';

/**
 * Chromium resolution.
 *
 * Playwright pins an exact browser revision and refuses anything else, which
 * breaks the moment the build runs somewhere the browser was provisioned by
 * something other than `playwright install`: a CI image with a shared browser
 * cache, a container that bakes Chromium in, a Lambda layer. Every one of those
 * is a normal way to deploy this.
 *
 * So the executable is configurable, and the error when it is not found says
 * what to do about it rather than quoting a revision number at the operator.
 */

/** Point this at a Chromium binary when the bundled one is absent or mismatched. */
export const CHROMIUM_PATH_ENV = 'CUBPITCH_CHROMIUM_PATH';

export interface BrowserOptions {
  /** Overrides both the environment variable and Playwright's bundled browser. */
  executablePath?: string;
  /** Extra flags. Containers without shared memory usually need --no-sandbox. */
  args?: string[];
}

export async function launchBrowser(options: BrowserOptions = {}): Promise<Browser> {
  const executablePath = options.executablePath ?? process.env[CHROMIUM_PATH_ENV];
  const launchOptions: LaunchOptions = {
    args: options.args ?? [],
    ...(executablePath ? { executablePath } : {}),
  };

  try {
    return await chromium.launch(launchOptions);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message.split('\n')[0] : String(cause);
    throw new Error(
      `Could not start Chromium for PDF export${executablePath ? ` at ${executablePath}` : ''}. ` +
        `Install it with "pnpm exec playwright install chromium", or set ${CHROMIUM_PATH_ENV} to an existing Chromium binary. ` +
        `Underlying error: ${detail}`,
      { cause },
    );
  }
}
