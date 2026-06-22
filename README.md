# Nishant Gadde — Portfolio

Personal resume / research portfolio site. Static HTML + CSS, no build step.

**Live:** https://Nishant27-2006.github.io

## Files
- `index.html` — the whole site
- `nishant-gadde-cv.pdf` — CV linked from the page
- swap the `NG` monogram for a photo: in `index.html` replace the `<div class="avatar">…</div>` with `<img class="avatar" src="photo.jpg" alt="Nishant Gadde">`

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
