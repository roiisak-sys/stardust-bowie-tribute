// Build-time image dimensions, so every <img> can carry width/height attributes.
// With the attributes the browser reserves the right box before the file
// arrives (no layout shift) and Lighthouse's "unsized images" check passes.
// Reads the file from /public, so pass the same path used in the src attribute.
import sharp from 'sharp';
import { join } from 'node:path';

const cache = new Map<string, { width: number; height: number }>();

export async function imageSize(publicPath: string): Promise<{ width: number; height: number }> {
  const hit = cache.get(publicPath);
  if (hit) return hit;
  const meta = await sharp(join(process.cwd(), 'public', publicPath)).metadata();
  const size = { width: meta.width ?? 0, height: meta.height ?? 0 };
  cache.set(publicPath, size);
  return size;
}
