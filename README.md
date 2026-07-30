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
move between them. The page never scrolls when you change cards. It is gated by a
password, and both the post text and the photos are **AES-256-GCM encrypted** with
one key derived from that password via PBKDF2-SHA256 (310k iterations). Only
ciphertext is committed — no plaintext or photo ever enters this public repo, and a
visitor without the password has nothing to read in the page source.

Unlocking is cached in `localStorage`, so it stays unlocked on later visits and the
gate is removed from the page entirely. "Lock this blog" at the bottom clears it.

### Publishing a new post

1. Write the post as JSON in `drafts/` (gitignored, so plaintext stays local):

   ```json
   {
     "title": "Post title",
     "date": "July 30, 2026",
     "cards": [
       { "html": "First paragraph." },
       { "kind": "note", "label": "Disclaimer", "html": "An aside." },
       { "kind": "pull", "html": "A paragraph set in the serif pull style." },
       { "html": "A paragraph with a photo.",
         "image": { "id": "img3", "alt": "Alt text", "caption": "Optional caption." } }
     ]
   }
   ```

   `kind` is optional — `note` for an indented aside, `pull` for a serif emphasis
   card. `label` adds a small orange chip above the text. `image.id` must match a
   file base name in `drafts/media/` (see below).

2. Put photos in `drafts/media/` (also gitignored), named to match the `image.id`
   values — `drafts/media/img3.jpg` pairs with `"id": "img3"`. JPEG, PNG, WebP,
   GIF and HEIC are handled. Resizing them to ~1600px first keeps the site quick.

3. Encrypt everything and patch `blog.html` in one step:

   ```bash
   node tools/encrypt-post.mjs drafts/my-post.json "nishblog27"
   ```

   The script encrypts the text inline into `blog.html`, writes one `media/<id>.enc`
   per photo, verifies every blob by decrypting it again, and warns about cards that
   reference a photo you haven't added yet (those render text-only rather than
   breaking).

Changing the password just means re-running step 3 with the new one.

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
