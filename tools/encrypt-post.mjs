#!/usr/bin/env node
/**
 * Encrypt a blog draft for embedding in blog.html.
 *
 * The published repo is public, so post text is never committed in the clear.
 * Instead we AES-256-GCM encrypt it with a key derived from the blog password
 * (PBKDF2-SHA256), and blog.html decrypts in the browser via Web Crypto.
 *
 * Usage:
 *   node tools/encrypt-post.mjs drafts/<post>.json "<password>"
 *
 * Prints a JSON envelope: paste it as the value of the `data-payload`
 * attribute / POSTS entry in blog.html.
 */
import { readFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const ITERATIONS = 310000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const [, , draftPath, password] = process.argv;
if (!draftPath || !password) {
  console.error('usage: node tools/encrypt-post.mjs <draft.json> <password>');
  process.exit(1);
}

const draft = JSON.parse(readFileSync(draftPath, 'utf8'));

async function deriveKey(password, salt) {
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

const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
const key = await deriveKey(password, salt);

const plaintext = new TextEncoder().encode(JSON.stringify(draft));
const ciphertext = new Uint8Array(
  await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
);

const b64 = (u8) => Buffer.from(u8).toString('base64');

// Round-trip through the same Web Crypto API the browser uses, so a bad
// envelope can never reach the site.
const check = JSON.parse(
  new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      await deriveKey(password, salt),
      ciphertext
    )
  )
);
if (JSON.stringify(check) !== JSON.stringify(draft)) {
  console.error('round-trip verification FAILED — not emitting payload');
  process.exit(1);
}

console.log(
  JSON.stringify({
    v: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS },
    salt: b64(salt),
    iv: b64(iv),
    ct: b64(ciphertext),
  })
);
console.error(
  `ok: ${draft.cards.length} cards, ${plaintext.length} B plaintext -> ${ciphertext.length} B ciphertext`
);
