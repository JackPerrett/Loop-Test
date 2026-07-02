import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BRAND_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'brand');

function toDataUri(file, mime) {
  const data = fs.readFileSync(path.join(BRAND_DIR, file));
  return `data:${mime};base64,${data.toString('base64')}`;
}

// Mad River Ltd brand assets (see MR_Creative_Template_Final.pdf for the full
// spec). Loaded once and reused across every render.
export const BRAND = {
  fontDinBoldCondensed: toDataUri('DINNextLTProBoldCondensed.otf', 'font/otf'),
  fontSpockStriked: toDataUri('SpockStrikedRegular.otf', 'font/otf'),
  wordmark: toDataUri('mad-river-wordmark.png', 'image/png'),
};
