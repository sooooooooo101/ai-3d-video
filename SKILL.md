---
name: ai-3d-video
description: Reusable 3D character/props library (Three.js/WebGL), VOICEVOX multi-speaker lip-sync audio pipeline, optional SRT/burned subtitles, and fast 1-session Chrome batch renderer for 9:16 vertical shorts or 16:9 videos. Use when creating 3D animated videos, comedy shorts, or tutorial videos with consistent 3D characters.
---

# AI 3D Video Production Skill

Make 3D animated videos (9:16 shorts or 16:9) with consistent characters, VOICEVOX dialogue, lip-sync, BGM and optional subtitles.

`$SKILL` below = the directory containing this file. Requirements: Python 3, `ffmpeg`, Chrome/Chromium (`--chrome` or `CHROME_PATH` if not auto-found), VOICEVOX engine on `127.0.0.1:50021`.

## Work cheaply: rules

1. **Do not read the library sources** (`assets/*.js`, `scripts/*.py`). Everything needed is in the API table below. Open a source file only if a call fails.
2. **Start from the example**, not a blank file: copy `examples/uketsuke-dake/scene.html` and edit the choreography inside `update(t, mouth)`.
3. **Use the tested layout** (`layouts.duo916`) instead of working out camera and positions.
4. **Check with `--preview`**, which makes ONE contact-sheet image (`preview.png`, ~12 s). Look at that single image; do not open individual frames. Do the full render once, at the end.
5. **Use the ready-made motions** (`handOff`, `tasuki.setPutOn`, `createStacker`) instead of deriving clip-free paths by hand.

## Workflow

```bash
cp "$SKILL"/assets/*.js .                                   # 1. library into the work dir
cp "$SKILL"/examples/uketsuke-dake/{scene.html,dialogue.json} .   #    starting point
# 2. edit dialogue.json, then:
python3 "$SKILL"/scripts/audio_pipeline.py --script dialogue.json --out-dir .
# 3. edit scene.html, then preview (repeat 3 until right):
python3 "$SKILL"/scripts/render_batch.py --work-dir . --aspect 9:16 --preview
# 4. final:
python3 "$SKILL"/scripts/render_batch.py --work-dir . --aspect 9:16 --subtitles none --out out.mp4
```

### dialogue.json
```json
{ "fps": 15, "total_sec": 15.0, "bgm_stop_sec": 9.9,
  "lines": [ { "id": "L1", "role": "df", "speaker_id": 8, "start": 0.15, "max_dur": 1.35, "speed": 1.15, "pitch": 0.02, "text": "受付だけ、お願い！" } ] }
```
- `role` names the lip-sync track (`mouth.df`, `mouth.boy` in the scene). `max_dur` time-compresses a line that runs long.
- **One line per visual cue.** If props appear on separate words ("荷物！ 写真！ 進行も！"), make them separate lines so each `start` can be set.
- The script prints each line's real start/end; time the choreography from that printout.
- Sound effects / ambience: top-level `"sfx": [{ "file": "wind.wav", "start": 5.0, "volume": 0.8 }]` (path relative to dialogue.json) is mixed in from `start`.
- Options: `--bgm file.mp3 --bgm-volume 0.6` (own music), `--require-voicevox` (fail instead of falling back to macOS `say`).
- Speaker IDs: `references/voicevox_speakers.md`. **Keep one `speaker_id` per character for the whole video** — a style variant (e.g. 39 喜び vs 11 ノーマル) sounds like a different person. Convey emotion with `speed`/`pitch` instead.

### render_batch.py
`--preview [--step 5]` half-size contact sheet only · `--subtitles none|burn` · `--subtitle-font` · `--timeout 600` · `--chrome`.
It clears old frames and **exits with an error if any frame is missing**.

## API (world units; boy is 1.49 tall, faces +Z, camera looks from +Z)

**`AI3DStage.start({ aspect, setup(ctx) })`** – `setup` builds the scene and returns `update(t, mouth, frame)`. `ctx = { THREE, scene, camera, util, layouts, timing, fps, frames }`. Lights, renderer, timing.json and the batch protocol are handled.
- `util`: `seg(t,a,b)` 0→1 ease between two times · `pulse(t,t0,dur)` 0→1→0 bump · `lerp` · `ease` · `clamp01`.
- `layouts.duo916`: `camera{pos,target,fov}`, `closeUpBoy{pos,target}`, `boy{pos,rotY}`, `dragonfly{pos,scale,rotY,pitch}`, `desk{pos,rotY}`. Boy left, dragonfly upper-right, bottom ~15% free for captions.

**`AI3DChars.createBoy(THREE)`** → `{ group, torso, head, arms, eyes, mouth, cargoAnchor, materials }`
- `setExpression('happy'|'confused'|'deadpan'|'neutral', intensity)` (`happy` also turns the mouth corners up) · `setMouth(level, width=1, baseHeight=1)` · `setHoldPose(0..1)` (arms forward to carry).
- Head look: `head.rotation.set(x, y, z)`; +y turns toward screen-right, −x looks up. Chin is at y=1.08.

**`AI3DChars.createDragonfly(THREE)`** → `{ group, bodyPivot, head, mouth, wings }` – 4 wings, **never add arms/hands**; it gestures with its whole body. Dark pupils show where it is looking.
- `wingbeat(t, speed, amp)` · `setMouth(level)`. Body is at local y=1.0. Pitch nose-down with `bodyPivot.rotation.x` (~0.4 so the camera sees the wings from above; head-on it reads as a thin line).

**`AI3DProps`**
- `createSchoolHall(THREE, scene)` → `{ deskGroup }` (blank banner, reception desk).
- `createCardboard` (h 0.20) · `createCameraProp` (h 0.11) · `createClosedLaptop` (h 0.036) → `{ mesh, height }`.
- `createStacker(boy.cargoAnchor)` → `.add(mesh, height)`, `.items[{mesh,restY,height}]`. Stacks bottom-up, no floating/clipping. A 3-item pile tops out below the chin, so the face stays visible.
- `handOff(item, u, fromX=-1.5)` – moves a stacker item in from off-screen (u 0→1) above the forearms, then straight down. Returns the prop's top Y for placing a hand. Call `boy.setHoldPose(1)` first.
- `createHelperArm(THREE, parent, length)` – anonymous sleeve+hand; origin = grip, extends along local +Y; rotate to choose the side it enters from.
- `createTasuki(THREE, boy.torso)` – blank sash. `setPutOn(p)` p 0→1 lowers it over the head without touching head or cargo; `.grip` is where a helper hand holds it.

## Quality rules
1. One Chrome session for all frames (always via `render_batch.py`).
2. Characters always come from `assets/characters.js`; never rebuild or recolour them in a scene.
3. Text on props (sash, banner) and subtitles stay blank unless asked; add them in editing.
4. Before the final render, check `preview.png` for: clipping, floating props, hidden faces, characters cut off at the frame edge.
