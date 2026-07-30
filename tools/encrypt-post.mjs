#!/usr/bin/env node
/**
 * Encrypt a blog draft (text + photos) and patch it into blog.html.
 *
 * The published repo is public, so neither post text nor photos are ever
 * committed in the clear. Both are AES-256-GCM encrypted with one key derived
 * from the blog password (PBKDF2-SHA256); blog.html decrypts in the browser via
 * Web Crypto, and photos are fetched and decrypted lazily as you reach them.
 *
 * Photos live next to the draft in <draft dir>/media/ and are matched to cards
 * by the file's base name, e.g. media/img3.jpg  <->  "image": { "id": "img3" }.
 *
 * Usage:
 *   node tools/encrypt-post.mjs drafts/<post>.json "<password>"
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { dirname, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ITERATIONS = 310000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_HTML = join(REPO, 'blog.html');
const MEDIA_OUT = join(REPO, 'media');

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
};

const [, , draftPath, password] = process.argv;
if (!draftPath || !password) {
  console.error('usage: node tools/encrypt-post.mjs <draft.json> <password>');
  process.exit(1);
}

const draft = JSON.parse(readFileSync(draftPath, 'utf8'));
const b64 = (u8) => Buffer.from(u8).toString('base64');

const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));

async function deriveKey() {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

const key = await deriveKey();

async function seal(bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  // Verify by decrypting again, so a broken blob can never reach the site.
  const back = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct));
  if (Buffer.compare(Buffer.from(back), Buffer.from(bytes)) !== 0) {
    throw new Error('round-trip verification failed');
  }
  return { iv: b64(iv), ct };
}

/* ---------- photos ---------- */

const mediaDir = join(dirname(draftPath), 'media');
const manifest = {};
let mediaBytes = 0;

if (existsSync(mediaDir)) {
  rmSync(MEDIA_OUT, { recursive: true, force: true });
  mkdirSync(MEDIA_OUT, { recursive: true });

  const files = readdirSync(mediaDir)
    .filter((f) => MIME[extname(f).toLowerCase()])
    .sort();

  for (const file of files) {
    const id = basename(file, extname(file));
    const bytes = readFileSync(join(mediaDir, file));
    const { iv, ct } = await seal(bytes);
    writeFileSync(join(MEDIA_OUT, id + '.enc'), Buffer.from(ct));
    manifest[id] = { file: 'media/' + id + '.enc', iv, mime: MIME[extname(file).toLowerCase()] };
    mediaBytes += ct.length;
    console.error(`  photo ${id}: ${(bytes.length / 1024).toFixed(0)} KB -> media/${id}.enc`);
  }
}

/* ---------- referenced-photo sanity check ---------- */

const referenced = draft.cards.map((c) => c.image && c.image.id).filter(Boolean);
const missing = referenced.filter((id) => !manifest[id]);
const unused = Object.keys(manifest).filter((id) => !referenced.includes(id));
if (missing.length) {
  console.error(`\nWARNING: cards reference photos with no file: ${missing.join(', ')}`);
  console.error(`  (those cards will render text-only; add them to ${mediaDir}/)`);
}
if (unused.length) console.error(`\nWARNING: unused photos: ${unused.join(', ')}`);

/* ---------- post text ---------- */

const plaintext = new TextEncoder().encode(JSON.stringify(draft));
const post = await seal(plaintext);

const envelope = JSON.stringify({
  v: 1,
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS },
  salt: b64(salt),
  iv: post.iv,
  ct: b64(post.ct),
  media: manifest,
});

if (envelope.includes('</script') || envelope.includes('<!--')) {
  throw new Error('envelope is not safe to inline');
}

/* ---------- patch blog.html ---------- */

const html = readFileSync(BLOG_HTML, 'utf8');
const tag = /(<script type="application\/json" id="post-payload">)([\s\S]*?)(<\/script>)/;
if (!tag.test(html)) {
  console.error('could not find the post-payload script tag in blog.html');
  process.exit(1);
}
writeFileSync(BLOG_HTML, html.replace(tag, (_m, open, _old, close) => open + envelope + close));

console.error(
  `\nok: ${draft.cards.length} cards, ${Object.keys(manifest).length} photos\n` +
  `    text ${(plaintext.length / 1024).toFixed(1)} KB -> ${(post.ct.length / 1024).toFixed(1)} KB inline\n` +
  `    photos ${(mediaBytes / 1024).toFixed(0)} KB in media/\n` +
  `    blog.html patched`
);
