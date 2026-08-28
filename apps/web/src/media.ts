import { isSafeMediaSrc, MAX_EMBEDDED_SRC_LENGTH, type MediaRef } from '@cubpitch/core';

/**
 * Turning a chosen file into an embedded image.
 *
 * The deck carries its images inside itself as `data:` URIs rather than
 * referencing a server or a CDN. That is a deliberate trade. A hotlinked logo
 * breaks the day its host does, a deck emailed to an investor has to be
 * self-contained, and an embedded image is the one thing the PDF exporter will
 * fetch without the network policy having to allow anything. The cost is deck
 * size, which is why every image is downscaled before it is embedded.
 *
 * All of this runs in the browser. Nothing is uploaded.
 */

/** A slide is 1920 wide; an image never needs to be larger than the slide. */
const DEFAULT_MAX_DIMENSION = 1920;
/** Logos and photos are smaller, and a smaller cap keeps the deck light. */
export const MAX_DIMENSIONS = {
  full: 1920,
  photo: 900,
  logo: 600,
} as const;

/** Refuse a file this large before even trying to decode it. */
const MAX_INPUT_BYTES = 24 * 1024 * 1024;

export interface EmbedOptions {
  /** Longest edge, in pixels, after downscaling. */
  maxDimension?: number;
  /** JPEG/WebP quality, 0..1. Ignored for PNG. */
  quality?: number;
}

export class MediaError extends Error {}

/**
 * Read an image file, downscale it, and return a `data:` URI.
 *
 * SVG is passed through unrasterised: it is already small and scaling it would
 * throw away the one thing it is good for. Everything else is drawn onto a
 * canvas at the capped size and re-encoded, which also strips EXIF and any
 * other metadata the author did not mean to ship inside a deck.
 */
export async function fileToEmbeddedImage(file: File, options: EmbedOptions = {}): Promise<string> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new MediaError(`That image is ${mb(file.size)} MB. Please use one under ${mb(MAX_INPUT_BYTES)} MB.`);
  }
  if (!file.type.startsWith('image/')) {
    throw new MediaError('That is not an image file.');
  }

  if (file.type === 'image/svg+xml') {
    const src = await readAsDataUrl(file);
    return guardSize(src);
  }

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const bitmap = await loadImage(file);

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new MediaError('This browser could not process the image.');
  context.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

  // A photograph re-encodes much smaller as JPEG; a logo or screenshot with
  // flat colour and transparency needs PNG. Pick by whether the source had an
  // alpha channel we should keep.
  const wantsAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
  const mime = wantsAlpha ? 'image/png' : 'image/jpeg';
  const src = canvas.toDataURL(mime, options.quality ?? 0.85);

  return guardSize(src);
}

/** Accept a pasted URL, but only one the deck schema will keep. */
export function normalizeUrl(input: string): MediaRef['src'] {
  const trimmed = input.trim();
  if (!isSafeMediaSrc(trimmed)) {
    throw new MediaError('That has to be an https link to an image, or an embedded image.');
  }
  return trimmed;
}

function guardSize(src: string): string {
  if (src.length > MAX_EMBEDDED_SRC_LENGTH) {
    throw new MediaError('Even downscaled, that image is too large to embed. Try a simpler or smaller one.');
  }
  return src;
}

function mb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(0);
}

async function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new MediaError('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

/** `createImageBitmap` where available, falling back to an `Image` element. */
async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Some formats (a few WebP variants) fail here; fall through.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new MediaError('Could not decode that image.'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
