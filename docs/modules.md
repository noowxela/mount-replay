# Modules

Screen map for the numbered panels. The stack and data flow are in `docs/architecture.md`.

The numbers are the reading order of the climb, not the order in the sidebar. In `index.html` the aside is 01, 02, 05, 06. Module 03 is the bottom strip, and 04 sits on its right. A reload starts with the aside and the chart closed.

| # | Panel | Where | Shows |
| --- | --- | --- | --- |
| | Stage | Map | Terrain, trail, labels, cameras, night card |
| 01 | Live data | Aside | Time, day, elevation, distance, elapsed |
| 02 | Checkpoints | Aside | START, CP1–CP9, SUMMIT |
| 03 | Elevation | Bottom strip | Profile, chapter line, play and timeline |
| 04 | Location | Right of 03 | World globe, dotted Malaysia, Kinabalu |
| 05 | Your photos | Aside and viewer | Files, Day 1 date, camera-clock offset |
| 06 | Sources & credits | Aside | Terrain, trail, height, and outline credits |

## Chrome

The header carries the mountain mark, the title, five panel toggles (`01 Record`, `02 Checkpoints`, `05 Photos`, `04 Location`, `06 Credits`), and EN / 中文 / BM. The words follow the language. 01, 02, 05, and 06 show or hide those aside panels. 04 shows or hides the map beside the elevation strip. All five start on, and a reload turns them back on. The **info** tab on the right edge of the map opens and closes the aside. It is not a numbered module.

## Stage

The map. Not numbered.

**Shows** the 3D terrain, the trail, checkpoint labels, photo pins, the tagline, Auto / Follow / Oblique / Top / Reset, Colour / Mono, and the night card at Laban Rata.

**Reads** the baked terrain and trail, the replay clock, and placed photos.

**Does** orbit, zoom, and camera changes. Reset returns the camera to oblique.

**Does not** own the clock. Play, the timeline, and speed live in 03.

## 01 Live data

Aside. Marked TYPICAL.

**Shows** time, day, elevation, distance walked, and elapsed time, plus the note that this is a typical two-day climb.

**Reads** the replay clock and the typical itinerary.

**Does** report where the replay is right now.

**Does not** record a real hike, and it does not move the clock.

## 02 Checkpoints

Aside.

**Shows** START (Timpohon Gate), CP1–CP9 (the shelters, Laban Rata, Sayat-Sayat), and SUMMIT (Low's Peak), each with height, distance, and source.

**Reads** the checkpoint list on the baked trail.

**Does** jump the replay to that point.

**Does not** rename checkpoints. Short codes stay on the map and the profile. Full names stay in the list, the tooltips, and the 03 chapter line.

## 03 Elevation

Bottom strip. Collapsed on load. The chevron opens the chart. Play, the timeline, speed, and loop stay visible either way.

**Shows** the time-axis profile, checkpoint codes, photo markers, the chapter line, Back / The next / Trace, and the transport row.

**Reads** the typical itinerary and the placed photos.

**Does** play, pause, scrub, change speed, loop, and step through checkpoints and photos in order. Trace follows the hiker.

**Does not** place photos. That is 05. Back / The next / Trace are hidden while the chart is collapsed.

## 04 Location

Bottom strip, in a column on the right of 03. On a phone it stacks under the play row. The header toggle hides it without closing the aside.

**Shows** a filled world globe labelled WORLD (pale land, white coast), a dotted Malaysia map labelled MALAYSIA, Mount Kinabalu on an orange ring, then Sabah and the summit coordinates.

**Reads** Natural Earth coasts and the summit position.

**Does** mark Mount Kinabalu on the globe and on Malaysia.

**Does not** change the camera or the clock.

## 05 Your photos

Aside, plus the full-screen viewer.

**Shows** the add control, Day 1 date, camera-clock offset, and one row per file. The viewer opens a photo or video.

**Reads** EXIF or video metadata on this device, then IndexedDB after a reload.

**Does** place a GPS photo within 300 m of the trail, or a photo with no GPS by time of day. Clear my photos removes them.

**Does not** upload anything. A file outside the trail, or with no usable time, stays in the list and is not drawn on the map or the profile.

## 06 Sources & credits

Aside.

**Shows** the terrain, trail, height, and outline attributions.

**Reads** the credit strings for the current language.

**Does** name where the baked data came from.

**Does not** load or change that data.
