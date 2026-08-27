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

/**
 * What the renderer is allowed to fetch.
 *
 * Deck content is author-supplied and may be pasted or imported, and every
 * image URL in it becomes an outbound request made *by the server* when someone
 * exports a PDF or measures a layout. That is a server-side request forgery
 * primitive: a deck carrying `http://10.0.0.5:8080/admin/reboot` reaches an
 * internal host the moment a colleague hits export, and a unique URL is a
 * beacon that says when the deck was opened.
 *
 * So the renderer fetches nothing by default. Embedded `data:` images always
 * work, which is what a deck should use anyway: a logo that hotlinks somewhere
 * breaks the day that host does. Remote media is an explicit opt-in, and the
 * blocked URLs are reported rather than silently dropped.
 */
export const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

export interface NetworkPolicy {
  /** Let the page fetch images and media from any host. Off by default. */
  allowRemoteMedia?: boolean;
  /** Let the page fetch the theme's web fonts. */
  allowFonts?: boolean;
}

export function isAllowedUrl(rawUrl: string, policy: NetworkPolicy): boolean {
  // data:, blob: and about: never leave the process.
  if (/^(data|blob|about):/i.test(rawUrl)) return true;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  // file: would let a deck read the host's disk into an exported PDF.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (policy.allowFonts && FONT_HOSTS.has(url.hostname)) return true;
  return policy.allowRemoteMedia === true;
}

/**
 * Apply the policy to a page, collecting what it refused.
 *
 * Returns the blocked URLs so a caller can tell the author which images did not
 * load, rather than handing them a deck with silent holes in it.
 */
export async function applyNetworkPolicy(
  page: import('playwright').Page,
  policy: NetworkPolicy,
): Promise<string[]> {
  const blocked: string[] = [];

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (isAllowedUrl(url, policy)) return route.continue();
    if (!blocked.includes(url)) blocked.push(url);
    return route.abort();
  });

  return blocked;
}
