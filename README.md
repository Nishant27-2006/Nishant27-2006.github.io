# Nishant Gadde — Portfolio

Personal resume / research portfolio site. Static HTML + CSS, no build step.

**Live:** https://Nishant27-2006.github.io

## Files
- `index.html` — the whole site
- `blog.html` — password-gated blog (flashcard reader)
- `tools/encrypt-post.mjs` — encrypts a draft for publishing
- `nishant-gadde-cv.pdf` — CV linked from the page
- swap the `NG` monogram for a photo: in `index.html` replace the `<div class="avatar">…</div>` with `<img class="avatar" src="photo.jpg" alt="Nishant Gadde">`

## Blog

`blog.html` is a flashcard reader: one paragraph per card, `←` / `→` (or swipe) to
move between them. It is gated by a password, and the post text is **AES-256-GCM
encrypted** with a key derived from that password via PBKDF2-SHA256 (310k
iterations). Only ciphertext is committed — the plaintext never enters this
public repo, and a visitor without the password has nothing to read in the page
source.

### Publishing a new post

1. Write the post as JSON in `drafts/` (gitignored, so plaintext stays local):

   ```json
   {
     "title": "Post title",
     "date": "July 30, 2026",
     "cards": [
       { "html": "First paragraph." },
       { "kind": "note", "label": "Disclaimer", "html": "An aside." },
       { "kind": "pull", "html": "A paragraph set in the serif pull style." }
     ]
   }
   ```

   `kind` is optional — `note` for an indented aside, `pull` for a serif emphasis
   card. `label` adds a small orange chip above the text.

2. Encrypt it:

   ```bash
   node tools/encrypt-post.mjs drafts/my-post.json "nishblog27"
   ```

   The script verifies its own output by decrypting it again before printing.

3. Paste the printed JSON as the contents of the
   `<script type="application/json" id="post-payload">` tag in `blog.html`.

Changing the password just means re-running step 2 with the new one.

## Deploy to GitHub Pages
This repo must be named **`Nishant27-2006.github.io`** (user site).

```bash
git init
git add .
git commit -m "Portfolio site"
git branch -M main
git remote add origin https://github.com/Nishant27-2006/Nishant27-2006.github.io.git
git push -u origin main
```

Then in GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `root`**.
The site goes live at https://Nishant27-2006.github.io within a minute or two.
