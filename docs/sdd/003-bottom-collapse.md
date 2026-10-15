# SDD: Bottom bar collapse

- **Repo:** `01_project/o000o_active/mount-replay`
- **Status:** `implemented`
- **Date:** 2026-10-15
- **Related:** `docs/sdd/002-aside-collapse.md`, `docs/architecture.md`

## 1. Context / current architecture

`section.bottom` sits under the map and spans the full width (`index.html`, `src/styles.css`). It holds the chapter heading and Back / The next / Trace buttons (`.ch-head`), the elevation chart (`#chart`), and the transport row (`.transport`: play, timeline scrubber, speed, loop). The layout row is `1fr auto`, so a shorter bottom bar gives the map more height. The chart redraws through a `ResizeObserver`. The aside already collapses from a tab on the map edge. The bottom bar does not.

## 2. Problem and non-goals

**Problem:** The elevation strip stays open. There is no way to keep playback controls and give the chart's height back to the map.

**Non-goals:** Hiding the transport row, collapsing the aside from this control, a text label on the tab, or remembering the closed state after reload.

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| What stays visible when the bottom bar is closed? | The whole `.transport` row: play, timeline, speed, and loop. The chapter heading, checkpoint buttons, and chart hide. |
| Same control on a phone? | Yes, matching the aside tab. On a phone the stage height stays `62vh`; the page below it gets shorter. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:** A chevron-only tab centered on the top edge of `.bottom`, same dark chip as the aside tab. Open: chevron points down, `aria-expanded` is true. Closed: `.ch-head` and `#chart` are hidden, `.transport` stays, and the chevron points up. Desktop map row grows because the bottom row is `auto`. A reload starts with the chart closed.

**Pros:**

- Playback stays usable while the chart is out of the way.
- The map gains the chart's height on desktop. The chart already redraws when its box changes.

**Cons / risks:**

- Back, The next, and Trace are unavailable until the chart is opened again. The aside checkpoint list still jumps along the trail.
- On a phone the map does not grow; only the scroll length below it shrinks.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Hide the scrubber too | The request keeps the `.transport` element, and the scrubber is inside it. |
| A word on the tab | No word was asked for. The aside tab already carries `info`. |

## 5. Acceptance criteria and verification

- [x] Desktop: a chevron tab on the top edge of the bottom bar. Clicking it hides the chapter heading, Back / The next / Trace, and the chart. Play, the timeline, speed, and loop stay.
- [x] The map grows by about the chart's height. Opening the bar restores the chart and the map shrinks back.
- [x] The chevron points down while open and up while closed. `aria-expanded` matches.
- [x] Phone (390px): the same button hides and shows the chart block. The transport row stays.
- [x] A reload starts with the chart closed.
- [x] Verify in the browser on desktop and at 390px: collapse, expand, and confirm the map height changed on desktop.

Verified 2026-10-15 on `http://localhost:5173/?autoplay=0`:

- Open: bottom 301px, stage 202px, chart `display: block`, chevron unrotated, `aria-expanded="true"`.
- Closed: bottom 83px, stage 420px, chart and chapter heading `display: none`, transport row 44px with play, timeline, speed, and loop. Chevron rotated 180°.
- Opening again restores Back / The next / Trace and the chart.
- At 390px, closed hides the chart and keeps the transport row. The stage stays 523px (`62vh`).

## 6. Status history

| Date | Status | Note |
| --- | --- | --- |
| 2026-10-15 | draft | Closed state keeps `.transport` only |
| 2026-10-15 | approved | User said build |
| 2026-10-15 | implemented | Chevron on the bottom bar; transport row stays |
