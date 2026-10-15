# SDD: Aside collapse tab

- **Repo:** `01_project/o000o_active/mount-replay`
- **Status:** `implemented`
- **Date:** 2026-10-15
- **Related:** `docs/architecture.md`

## 1. Context / current architecture

`main.layout` is a two-column grid: the 3D stage and a 360px `aside.side` (`index.html`, `src/styles.css`). The elevation strip (`.bottom`) spans both columns. Under 820px the layout becomes a column: stage, elevation strip, then the aside. The terrain canvas already resizes through a `ResizeObserver` in `src/terrain.ts`. There is no control that hides the aside.

## 2. Problem and non-goals

**Problem:** The aside covers 360px beside the map. There is no way to give that width back to the terrain.

**Non-goals:** Collapsing a single panel inside the aside, remembering the closed state after reload, or translating the tab word.

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| What should the tab show? | A chevron plus a short vertical label. The word is `info`. |
| Should a phone collapse the stacked aside too? | Yes. Desktop and phone. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:** One button on the seam, matching the referenced edge tab: a dark rounded chip, chevron above the word `info` set vertically. It sits on the stage's right edge so it stays reachable when the aside is hidden. Open: chevron points right and `aria-expanded` is true. Closed: the aside is hidden, the grid column drops to 0 so the map widens, and the chevron points left. On a phone the same button hides the stacked aside under the elevation strip. The word stays `info` in English, 中文, and Bahasa Melayu.

**Pros:**

- One control covers every panel in the aside.
- The map grows into the freed width. The canvas already listens for size changes.
- The tab stays on screen when the panels are gone.

**Cons / risks:**

- Live data, checkpoints, and photos are out of reach until the aside is opened again.
- A reload starts with the aside closed.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Put the button inside `aside.side` | A closed aside would clip the control that opens it. |
| Translate `info` | The chosen word is the literal label. |
| Remember an opened aside after reload | A reload starts closed. Opening it lasts only for that visit. |

## 5. Acceptance criteria and verification

- [x] Desktop: the tab reads `info` vertically, with a chevron. Clicking it hides the aside and widens the map. Clicking again restores the 360px column.
- [x] The chevron points right while open and left while closed. `aria-expanded` matches.
- [x] Phone (390px): the same button hides and shows the stacked aside. The stage and elevation strip stay.
- [x] Switching language does not change the word `info`.
- [x] Verify in the browser on desktop and at 390px: collapse, expand, and confirm the terrain canvas resized.

Verified 2026-10-15 on `http://localhost:5173/?autoplay=0`:

- Open: aside 360px, stage 646px, canvas 1290px wide, `aria-expanded="true"`, chevron unrotated.
- Closed: aside 0, stage 1006px, canvas 2010px wide, `aria-expanded="false"`, chevron rotated 180°.
- 中文 leaves the tab word as `info`.
- At 390px, closed sets the aside to `display: none` while the stage and elevation strip stay. Opening it brings the panels back.

## 6. Status history

| Date | Status | Note |
| --- | --- | --- |
| 2026-10-15 | draft | Label word is `info`; desktop and phone |
| 2026-10-15 | approved | User said yes |
| 2026-10-15 | implemented | Tab on the stage edge; desktop column and phone stack |
