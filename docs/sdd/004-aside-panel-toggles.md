# SDD: Aside panel toggles

- **Repo:** `01_project/o000o_active/mount-replay`
- **Status:** `implemented`
- **Date:** 2026-10-16
- **Related:** `docs/architecture.md`, `docs/modules.md`, [002](002-aside-collapse.md)

## 1. Context / current architecture

The header (`header.top` in `index.html`) holds the brand on the left and `.langs` (EN / 中文 / BM) on the right. The aside (`aside.side`) stacks five panels in this order: 01 Live data, 02 Checkpoints, 05 Your photos, 04 Location, 06 Sources & credits. Module 03 is the bottom elevation strip, not part of the aside. The **info** tab on the map edge opens and closes the whole column (`docs/sdd/002-aside-collapse.md`). A reload starts with the aside closed. There is no control that hides a single panel.

## 2. Problem and non-goals

**Problem:** With the aside open, 01, 02, 05, 04, and 06 sit in one 360px column. The stack is too compact to read one panel at a time.

**Non-goals:** Changing module 03 (the elevation strip). Reordering the panels. Remembering which panels are off after a reload. Replacing the **info** tab. Translating the button labels (they are the panel numbers).

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| What should a click on the new buttons do? | Toggle each panel on or off, so several can stay open. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:** A button group immediately left of `.langs`, in aside order: `01` `02` `05` `04` `06`. Each button toggles its matching `section.panel` with the existing `.hidden` class and sets `aria-pressed`. All five start pressed, so the first open of the aside still shows every panel. Turning the last one off leaves an empty aside; the **info** tab still closes the column. Visible labels stay the numbers. Each button’s accessible name is the panel title from `src/i18n.ts` (`live`, `checkpoints`, `media`, `location`, `credits`) and updates when the language changes. The brand can shrink so the header stays one row at 390px.

**Pros:**

- The user can drop the panels they are not reading and leave the rest stacked.
- The numbers match the headings already in the aside.
- Language switching stays where it is.

**Cons / risks:**

- Five extra buttons crowd the header next to EN / 中文 / BM, especially under 820px where the subtitle is already hidden.
- All five start on, so the aside is still compact until the user turns something off.
- A hidden panel is gone until its button is pressed again. Photos, checkpoints, and credits stay in memory; only the section is hidden.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Show only one panel at a time | The chosen behaviour is independent toggles. |
| Scroll the aside to the clicked panel and keep the stack | That leaves the column as compact as it is now. |
| Put the buttons inside the aside | A closed aside would hide the control, and the request places them left of the language group. |

## 5. Acceptance criteria and verification

- [x] Desktop: five number buttons sit immediately left of EN / 中文 / BM, in the order 01, 02, 05, 04, 06. Each starts pressed.
- [x] Clicking a pressed button hides that panel and clears `aria-pressed`. Clicking again shows it. Any combination can be on, including none and all five.
- [x] The **info** tab still opens and closes the whole aside. A reload starts with the aside closed and every panel toggle on.
- [x] Switching to 中文 or BM leaves the numbers as numbers and updates each button’s accessible name to that language’s panel title.
- [x] At 390px the header stays one row: brand, the five numbers, then EN / 中文 / BM. Nothing overlaps.
- [x] Verify in the browser: open the aside, turn 02 and 06 off, confirm only 01, 05, and 04 remain, turn them back on, then repeat one toggle at 390px.

Verified 2026-10-16 on `http://localhost:5173/?autoplay=0`:

- Opened the aside. Turning 02 and 06 off set those sections to `display: none` and left 01, 05, and 04 visible. Turning each back on restored it.
- 中文 names were 实时数据, 检查点, 您的照片, 位置, 资料来源与致谢. English names were Live data, Checkpoints, Your photos, Location, Sources & credits. Visible labels stayed `01` `02` `05` `04` `06`.
- A reload started with the aside closed (`info` collapsed) and all five toggles pressed.
- At 390px the header was 48px tall, one row, no overlapping buttons. The title truncated to `MOU…`.

## 6. Status history

| Date | Status | Note |
| --- | --- | --- |
| 2026-10-16 | draft | Toggles, all start on, numbers left of the language group |
| 2026-10-16 | approved | User said yes |
| 2026-10-16 | implemented | Toggles left of the language group; verified on desktop and at 390px |
