# SDD: World and Borneo location inset

- **Repo:** `01_project/o000o_active/mount-replay`
- **Status:** `implemented`
- **Date:** 2026-10-16
- **Related:** `docs/modules.md`, `DESIGN.md` §6.5, [006](006-location-beside-chart.md)

## 1. Context / current architecture

`section#panel-loc` is the right column of the bottom strip, about 200px wide (`index.html`, `src/styles.css`). `src/inset.ts` draws one filled Natural Earth outline of Borneo into `svg#inset`, with labels for Borneo, Sabah, and Kota Kinabalu, a dashed frame, and an orange dot on Low's Peak. `src/main.ts` sets the coordinate line to the summit. The column heading is `04 Location`.

## 2. Problem and non-goals

**Problem:** 04 should look like the reference: a world view beside a dotted regional map, a place name on the marker, and the region plus coordinates underneath.

**Non-goals:** Loading a new world dataset. Moving the marker with the replay clock. Changing the elevation chart. Translating the footer into two languages at once.

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| What should 04 look like? | The reference: WORLD beside the region, a globe, a dotted map, the place name on the marker, and coordinates below. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:** Two panes in the location column. The left pane is labelled WORLD and draws a schematic wireframe globe with an orange ring over Borneo. The right pane is labelled BORNEO and redraws the existing coastline as dots, with an orange ring on Low's Peak, the peak name, and a short leader line. Under both panes: the current language's Sabah name, then the summit coordinates. The column widens from 200px to 280px so the pair fits beside the chart. On a phone the pair stays side by side inside the stacked location block. WORLD and BORNEO follow EN / 中文 / BM.

**Pros:**

- The same reading order as the reference: world, then the island, then the name and the coordinates.
- The dotted coast uses the outline already baked in `public/data/inset.json`.
- No new data file.

**Cons / risks:**

- The globe is a schematic, not a coastline of every continent.
- The chart and the play row lose another 80px while 04 is open.
- The peak name can crowd the dotted coast if the column is short.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Keep the filled Borneo outline and only restyle the colours | The reference is two maps, and the region is drawn as dots. |
| Download a world GeoJSON for the globe | A graticule and one marker match the reference without a new dataset. |

## 5. Acceptance criteria and verification

- [x] With the chart open, 04 shows WORLD and a wireframe globe on the left, BORNEO and a dotted coast on the right, the peak name by an orange ring, then Sabah and the coordinates.
- [x] 中文 reads 世界 and 婆罗洲. BM reads Dunia and Borneo. The peak name and Sabah follow the same language.
- [x] The filled land, the Kota Kinabalu label, and the dashed frame are gone.
- [x] At 390px the two maps stay side by side under the play row, and the chart stays full width.
- [x] Verify in the browser: open the chart, read both panes in English and 中文, then check 390px.

Verified 2026-10-16 on `http://localhost:5173/?autoplay=0`:

- English: panes read World and Borneo, the marker reads Low's Peak, the footer reads Sabah and `6.075° N / 116.559° E`. The coast dots stay inside the map.
- 中文: panes read 世界 and 婆罗洲, the marker reads 罗氏峰, the footer reads 沙巴. BM: Dunia, Borneo, Puncak Low, Sabah. No filled land, frame, or Kota Kinabalu label.
- At 390px the panes sit side by side (x=10 and x=183) under the play row. The chart is 370px wide.

## 6. Status history

| Date | Status | Note |
| --- | --- | --- |
| 2026-10-16 | draft | Globe plus dotted Borneo, matching the reference |
| 2026-10-16 | approved | User said yes |
| 2026-10-16 | implemented | Globe and dotted Borneo in the location column |
