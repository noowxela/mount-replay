# SDD: Brand mark, favicon, and Open Graph card

- **Repo:** `01_project/o000o_active/mount-replay`
- **Status:** `implemented`
- **Date:** 2026-10-15
- **Related:** `docs/architecture.md`

## 1. Context / current architecture

`index.html` shows the brand as the text character `▲` inside `.brand .mark`, colored `#ff8a3d`. The tab icon is an empty `data:,` link. The page has a `<title>` and `<meta name="description">` and no Open Graph or Twitter tags. `src/main.ts` rewrites `document.title` from `src/i18n.ts` after load. Vite `base` is `./`, and the live site is `https://noowxela.github.io/mount-replay/`.

## 2. Problem and non-goals

**Problem:** The header, browser tab, and link previews have no shared mountain mark, and shares have no title, description, or image tags.

**Non-goals:** Per-language share cards, an apple-touch icon, changing the localized in-page title, or restyling the rest of the header.

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| What should the mark look like? | Minimalist monoline geometric ridge: shoulder, Low's Peak, lower south peak. Orange in the header, same path on `#0b0d0e` for the favicon and share image. |
| What copy and thumbnail? | Title `Mount Kinabalu · Hike replay`. Shorter description for `og:` / `twitter:`. Keep the longer meta description for search. Thumbnail later changed to the 3D trail screenshot. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:** One SVG path. Inline it in `.brand .mark` at 18×12 with `currentColor`. Ship `public/favicon.svg` (relative `href`, so it works under `/mount-replay/`). Ship `public/og.png` and point `og:image` and `twitter:image` at the absolute Pages URL.

**Pros:**

- The header, tab, and share card use the same ridge.
- SVG favicon stays sharp and needs no extra raster.
- Absolute `og:image` is what crawlers require. Relative favicon still works with `base: './'`.

**Cons / risks:**

- `og.png` 404s on the live site until the next Pages deploy.
- Very old browsers do not render SVG favicons.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Keep the `▲` character | It is not the monoline mark requested. |
| Use `docs/screenshots/hero-desktop.jpg` as the share image | The request is a thumbnail of this mark, not a product screenshot. |
| Root-absolute `/favicon.svg` | Breaks on GitHub Pages, which serves the app under `/mount-replay/`. |

## 5. Acceptance criteria and verification

- [x] Header `.brand` shows the orange ridge beside the localized title, about 18×12 inside the 19px row.
- [x] `favicon.svg` is linked and is the same ridge on `#0b0d0e`.
- [x] `og:title`, `og:description`, `og:image` (1200×630), and Twitter large-card tags are in `index.html`.
- [x] The existing meta description is unchanged. Language switching still replaces the visible title and does not remove the SVG.
- [x] Verify in the browser: header mark, favicon request, and the PNG dimensions.

Verified 2026-10-15 on `http://localhost:5173/?autoplay=0`:

- Desktop and 390px: brand row is 19px tall; the mark is 18×12 and `#ff8a3d`. At 390px the row is 168px wide, left 12px, and does not meet the language buttons. Subtitle hides.
- Switching to 中文 sets the title to `京那巴鲁山 · 登山回放` and leaves the SVG path in place.
- `GET /favicon.svg` returns `image/svg+xml`. `public/og.png` is 1200×630 and `GET /og.png` returns `image/png`.
- Share image URL is absolute and will 404 on the live site until the next Pages deploy.

## 6. Status history

| Date | Status | Note |
| --- | --- | --- |
| 2026-10-15 | draft | Spec agreed in chat |
| 2026-10-15 | approved | User said do it |
| 2026-10-15 | implemented | Header mark, favicon, and Open Graph card |
| 2026-10-15 | implemented | `og.png` replaced with the 3D trail screenshot, 1200×630, left edge kept |
