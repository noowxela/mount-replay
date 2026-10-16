# SDD: Location beside the elevation strip

- **Repo:** `01_project/o000o_active/mount-replay`
- **Status:** `implemented`
- **Date:** 2026-10-16
- **Related:** `docs/architecture.md`, `docs/modules.md`, [003](003-bottom-collapse.md), [004](004-aside-panel-toggles.md)

## 1. Context / current architecture

`main.layout` is a grid: the stage and a 360px aside on the first row, and `section.bottom` spanning both columns on the second (`index.html`, `src/styles.css`). The aside order is 01, 02, 05, 04, 06. Module 03 is the bottom strip: chapter line, elevation chart, and the play row. Module 04 is `section#panel-loc` inside the aside: the Borneo inset (`svg#inset`, drawn by `src/inset.ts`) and the coordinates. The header toggle `04 Location` shows or hides that section. A reload starts with the aside and the chart closed.

## 2. Problem and non-goals

**Problem:** 04 Location is stacked in the aside. It should sit to the right of 03.

**Non-goals:** Changing what the inset draws. Moving 01, 02, 05, or 06. Changing the play row’s controls. Remembering the 04 toggle after a reload.

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| Where should 04 sit? | To the right of 03, the elevation strip. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:** Move `#panel-loc` out of the aside and into the bottom strip, as a column on the right of the whole 03 block (chapter line, chart, and play row). The column is about 200px. The inset stays `width: 100%` and is capped so the bottom strip does not grow past the chart block. The header toggle still shows and hides 04; when it is hidden, 03 uses the full width. Closing the aside does not hide 04. Collapsing the chart still hides the chapter line and the chart, and leaves 04 and the play row. Under 820px, 04 stacks under the play row at the full width of the strip. The aside order becomes 01, 02, 05, 06.

**Pros:**

- The Borneo map sits next to the profile it describes.
- The aside is four panels instead of five.
- The 04 toggle still works, including while the aside is closed.

**Cons / risks:**

- The chart and the play row get about 200px narrower while 04 is open.
- The inset is smaller than the 360px aside version.
- On a phone the map sits under the play row, so the stacked column is longer.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Put 04 in the grid cell under the aside | Closing the aside would hide the map, and that cell is not to the right of 03 once the aside is closed. |
| Keep 04 in the aside and only scroll it into view | The request is to move it beside 03. |

## 5. Acceptance criteria and verification

- [x] With the chart open, 04 Location is a column on the right of the chapter line, the chart, and the play row. It is no longer in the aside.
- [x] The aside shows 01, 02, 05, and 06 only.
- [x] The `04 Location` toggle hides that column and lets 03 use the full width. Turning it on brings the column back.
- [x] Closing the aside leaves 04 visible. Collapsing the chart hides the chapter line and the chart, and leaves 04 and the play row.
- [x] At 390px, 04 sits under the play row and does not sit beside a crushed chart.
- [x] Verify in the browser: open the chart, confirm 04 is on its right, toggle 04 off and on, close the aside, then check 390px.

Verified 2026-10-16 on `http://localhost:5173/?autoplay=0`:

- Chart open, aside closed: 04 was a 200px column at x=930, covering the chapter line (y=339), the chart (y=395), and the play row (y=569). The aside children were 01, 02, 05, and 06.
- Toggling 04 off hid the column and widened the chart from 902px to 1114px. Turning it on restored the column.
- Collapsing the chart set the chapter line and the chart to `display: none`. 04 stayed visible beside the play row.
- At 390px the chart was 370px wide. 04 was the same width and started below the play row.

## 6. Status history

| Date | Status | Note |
| --- | --- | --- |
| 2026-10-16 | draft | 04 leaves the aside and becomes the right column of the bottom strip |
| 2026-10-16 | approved | User said yes |
| 2026-10-16 | implemented | 04 is the right column of the bottom strip; stacks under the play row at 390px |
