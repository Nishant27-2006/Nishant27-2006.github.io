#!/usr/bin/env bash
# Install blog photos in card order, downscale them, and publish.
#
# Pass the photos in the order they should appear in the post — the first
# becomes img1, the second img2, and so on, matching the "image": { "id": ... }
# values in the draft.
#
#   ./tools/add-photos.sh ~/Desktop/award.jpg ~/Desktop/grandpa.jpg ...
#
# Originals are never modified, and the copies under drafts/media/ are
# gitignored. Only the encrypted media/*.enc files get committed.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRAFT="${DRAFT:-$REPO/drafts/2026-07-30-my-fabricated-lens-of-society.json}"
PASSWORD="${PASSWORD:-nishblog27}"
MAX_PX="${MAX_PX:-1600}"
DEST="$REPO/drafts/media"

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <photo1> <photo2> ... (in card order)" >&2
  echo "       first photo becomes img1, second img2, ..." >&2
  exit 1
fi

mkdir -p "$DEST"

i=0
for src in "$@"; do
  i=$((i + 1))
  if [ ! -f "$src" ]; then
    echo "not a file: $src" >&2
    exit 1
  fi
  out="$DEST/img$i.jpg"
  # -Z fits the longest edge, so portrait and landscape both keep their shape.
  sips -s format jpeg -s formatOptions 82 -Z "$MAX_PX" "$src" --out "$out" >/dev/null
  dims="$(sips -g pixelWidth -g pixelHeight "$out" \
    | awk '/pixelWidth/ {w=$2} /pixelHeight/ {h=$2} END {print w "x" h}')"
  printf '  img%-2s <- %-28s %s\n' "$i" "$(basename "$src")" "$dims"
done

echo
echo "installed $i photo(s); encrypting and patching blog.html..."
echo
node "$REPO/tools/encrypt-post.mjs" "$DRAFT" "$PASSWORD"
