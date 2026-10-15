# Design gap audit: DESIGN.md vs the current build

Date: 2026-10-15. Baseline: commit `e6f15f3` (Alex's aside/bottom collapse work, SDD 002/003).
Legend: **have** = already matches · **gap** = to build · **keep** = intentional difference, not changed.

| # | DESIGN.md area | Current state | Status | Plan (step) |
|---|---|---|---|---|
| 1 | Colour tokens | 7 variables (`--bg --panel --line --ink --mute --acc --sand`), many raw hex values in rules | gap | Full token set: surfaces, 4 text levels, lines, accent family, route, chart, map. Rules use tokens (2) |
| 2 | Type scale / letter-spacing | Sizes 9–22 px hard-coded per rule | gap | `--fs-*` scale, `--track-*`, mono labels UPPERCASE (2) |
| 3 | Spacing, radius, border | Radius 2/3/6 px mixed; no scale | gap | `--sp-*`, `--r-0/--r-btn/--r-pill`, hairline token (2) |
| 4 | Pressed state | Pressed = solid ink fill (white) | gap | Accent text and border + ~6–12 % accent tint (DESIGN §6.8); reset stays momentary (2/3) |
| 5 | Focus ring | 2 px accent, 2 px offset | have (tune to 3 px offset) | (2) |
| 6 | Disabled state | No disabled controls | gap | Back disabled at start, The next at end; 50 % + not-allowed (4) |
| 7 | Header | Brand + language buttons, 52 px | have (close) | 48 px, date-free mono nav; keep langs (3) |
| 8 | Chapter panel (aside) | Numbered panels 01–06, collapse tab (SDD 002) | have | Keep the SDD 002 tab and default-closed state; restyle only (3) |
| 9 | Map overlays | Tagline, views, tone, hint | gap | Add camera readout AZ/EL, altitude ruler with scan cursor, replay status dot (AUTO REPLAY / PAUSED), route legend, scanlines (3) |
| 10 | Map labels | Diamond checkpoint markers, codes START/CP1–CP9/SUMMIT | keep codes; gap style | Ring marker + hover/active left accent bar; keep codes (3) |
| 11 | Inset | Borneo SVG with pulse | have | Add zoom frame around Sabah + coordinate line in mono (3) |
| 12 | Media viewer | Plain modal, Close only | gap | Heading, Back/Next between placed items, accent meta line, Esc, focus return (3) |
| 13 | Bottom panel: heading/progress | `03 / ELEVATION · chapter`, progress right | have | — |
| 14 | Back / The next / Trace | Present, Trace pressed state | have | Disabled ends + step status line `stop n / N` (4) |
| 15 | Profile chart | 100 m grid, thinned labels, gradient fill, cp codes | have (keep 100 m) | — |
| 16 | Cluster markers | Cluster click opens the first item only | gap | Picker popover listing the clip/photos (thumb + time), Esc closes (4) |
| 17 | Play / slider / speed / Loop | Present; speeds 30–2400, 600 default | have | Tokens only (4) |
| 18 | Keyboard | Space, Esc | gap | ←/→ seek 1 % (Shift 10 %), `,`/`.` Back/The next, Home/End, layered Esc (picker → viewer) (4) |
| 19 | Dot terrain | Points, hillshade, scan band 14 s | gap (tune) | Size by distance + gentle twinkle, scan band 20 s (5) |
| 20 | Contours | 100 m, 500 m index | gap | 25 m interval, 100 m brighter (5) |
| 21 | Height exaggeration | 1.6× | **keep** | DESIGN reports the demo's 2.4× but does not prescribe it; Kinabalu's 2.4 km of relief already reads at 1.6×. Unchanged, stated in credits (5) |
| 22 | Camera tween | 1.6 s ease-in-out quad | gap | 1.3 s smoothstep (5) |
| 23 | Follow smoothing | rate 2.5/s | gap | rate 6/s, snap when reduced motion (5) |
| 24 | Reduced motion | Animations off, instant camera | have | Also stops twinkle and status glow (5) |
| 25 | Mobile layout | Stacked stage / bottom / aside (SDD 002/003) | keep | DESIGN's floating dock is not adopted: it would undo SDD 003's collapse behaviour. Overlays get mobile sizes ≥ 9 px (3) |
| 26 | Night card | Mount-replay only | keep | Restyle with tokens (3) |
| 27 | Upload states / HEIC / IndexedDB / trail filter | Present | keep | "Not placed" rows stay muted (no red); errors stay red (3) |
| 28 | A11y: canvas/SVG chart labels | `aria-label` only | gap | `role="img"`, status regions for step status, picker `aria-expanded` (4) |
