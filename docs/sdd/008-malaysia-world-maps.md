# SDD: World globe and Malaysia map

- **Repo:** `01_project/o000o_active/mount-replay`
- **Status:** `implemented`
- **Date:** 2026-10-16
- **Related:** `docs/modules.md`, [007](007-world-borneo-inset.md)

## 1. Context / current architecture

`src/inset.ts` draws two panes in `#panel-loc`. The left SVG (`#globe`) is a wireframe sphere with a handful of land dots. The right SVG (`#inset`) is a dotted Natural Earth clip of Borneo, with the orange ring on Low's Peak (`D.cp.lowspeak`). The right pane's heading is `data-i="borneo"` (BORNEO / 婆罗洲 / Borneo). The footer still says Sabah. `public/data/inset.json` is land around `[108, -4.5, 120, 7.6]`, not a Malaysia-only outline.

## 2. Problem and non-goals

**Problem:** The globe does not read as a world map. The right pane should be Malaysia, with the highlight on Mount Kinabalu, not Low's Peak as the marker name.

**Non-goals:** Changing the 3D map, the trail, or the checkpoint named Low's Peak. Drawing every Malaysian island. Animating the marker with the replay clock.

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| What should the globe show? | A real world map, not a schematic grid. |
| What should the right pane show? | Malaysia. The orange dot highlights Mount Kinabalu. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:** Bake two dotted outlines from Natural Earth 110m land, already used for the Borneo clip: a world coast for the globe, and Malaysia (Peninsular plus Sabah and Sarawak) for the right pane. `scripts/bake.py` writes `world.json` and `malaysia.json` under `public/data/`. At run time the globe still uses an orthographic projection facing SE Asia, but the land is the world coast as dots, with an orange ring on Kinabalu. The right pane is labelled MALAYSIA (马来西亚 / Malaysia), shows the dotted Malaysia outline, and names the marker Mount Kinabalu (京那巴鲁山 / Gunung Kinabalu). The footer stays Sabah plus the summit coordinates. `inset.json` stays for the old Borneo clip until a later cleanup.

**Pros:**

- The globe shows continents, not a few sample points.
- Peninsular Malaysia and East Malaysia both appear, so the country is readable.
- The marker name matches the mountain, not the summit checkpoint.

**Cons / risks:**

- Two extra JSON files. 110m land is coarse, so the peninsula and Borneo will look simplified.
- Bake needs the Natural Earth land file on disk. Until bake is rerun, the new files can be generated once from that same source and committed.
- The footer still says Sabah, not Malaysia.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Keep the schematic globe and only rename the right pane | The request is a correct world map. |
| Zoom the existing Borneo clip and call it Malaysia | That file is the island, not Peninsular Malaysia. |
| Label the marker Kota Kinabalu the city | The request is the mountain. The city sits west of the peak. |

## 5. Acceptance criteria and verification

- [x] The globe shows dotted continents, not only a grid. An orange ring sits over northern Borneo.
- [x] The right pane heading reads MALAYSIA (马来西亚 / Malaysia). The dotted outline includes Peninsular Malaysia and East Malaysia.
- [x] The orange marker on that map is labelled Mount Kinabalu (京那巴鲁山 / Gunung Kinabalu), at the summit coordinates.
- [x] At 390px the two panes stay side by side under the play row.
- [x] Verify in the browser in English and 中文: read both headings, confirm the marker name, confirm the globe shows more than one continent.

Verified 2026-10-16 on `http://localhost:5173/?autoplay=0`:

- English: World / Malaysia, marker Mount Kinabalu, footer Sabah and `6.075° N / 116.559° E`. Globe had 319 coast dots. Malaysia showed Peninsular and East Malaysia, ring on the north of Sabah.
- 中文: 世界 / 马来西亚 / 京那巴鲁山 / 沙巴.

## 6. Status history

| Date | Status | Note |
| --- | --- | --- |
| 2026-10-16 | draft | Real world coast, Malaysia outline, Kinabalu marker |
| 2026-10-16 | approved | User said yes |
| 2026-10-16 | implemented | World coast + 10m Malaysia, Kinabalu marker |
