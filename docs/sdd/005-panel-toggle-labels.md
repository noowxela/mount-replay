# SDD: Panel toggle labels

- **Repo:** `01_project/o000o_active/mount-replay`
- **Status:** `approved`
- **Date:** 2026-10-16
- **Related:** `docs/modules.md`, [004](004-aside-panel-toggles.md)

## 1. Context / current architecture

`div.panels` in `header.top` holds five toggles whose visible text is `01` `02` `05` `04` `06` (`index.html`). Each button’s accessible name is the full panel title from `src/i18n.ts`. [004](004-aside-panel-toggles.md) kept the visible labels as numbers.

## 2. Problem and non-goals

**Problem:** The numbers do not say which panel they open.

**Non-goals:** Renaming the headings inside the aside. Changing which panel a button toggles. Remembering toggle state after a reload.

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| What text should each button show? | 01 Record, 02 Checkpoints, 05 Photos, 04 Location, 06 Credits. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:** Each button keeps its number and adds the short name: `01 Record`, `02 Checkpoints`, `05 Photos`, `04 Location`, `06 Credits`. The words come from new i18n keys so they follow EN / 中文 / BM. English is the list above. Chinese: 记录, 检查点, 照片, 位置, 致谢. Bahasa Melayu: Rekod, Pusat, Foto, Lokasi, Kredit. The accessible name stays the full panel title. On a narrow header the right-hand cluster scrolls sideways so the buttons stay one line and the title is not crushed to a few letters.

**Pros:**

- The number still matches the heading in the aside.
- The word says what that number is.
- Language switching updates the words the same way it updates the rest of the chrome.

**Cons / risks:**

- Five words plus the language buttons are wider than the number row. Below desktop width the cluster scrolls instead of fitting.
- Bahasa Melayu uses `Pusat` for checkpoints, shorter than the aside heading `Pusat pemeriksaan`.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Drop the numbers and show only the words | The aside headings are still numbered, and the request names each word by its number. |
| Leave the words in English in every language | The rest of the header follows the language switch. |
| Wrap the header onto two rows | That changes the 48px header the stage height is measured from. |

## 5. Acceptance criteria and verification

- [ ] The five buttons read `01 Record`, `02 Checkpoints`, `05 Photos`, `04 Location`, `06 Credits` in that order, immediately left of EN / 中文 / BM.
- [ ] 中文 reads `01 记录`, `02 检查点`, `05 照片`, `04 位置`, `06 致谢`. BM reads `01 Rekod`, `02 Pusat`, `05 Foto`, `04 Lokasi`, `06 Kredit`.
- [ ] Clicking a button still shows or hides the same panel. A reload still starts with all five on.
- [ ] At 390px the buttons do not overlap the language group or the brand mark. The right-hand cluster scrolls if it does not fit.
- [ ] Verify in the browser in English, 中文, and at 390px: read the labels, toggle 02 off and on.

## 6. Status history

| Date | Status | Note |
| --- | --- | --- |
| 2026-10-16 | draft | Number plus the short name; words follow the language |
| 2026-10-16 | approved | User said yes |
