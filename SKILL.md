---
name: ai-3d-video
description: Make short 3D animated videos of any genre (comedy, explainer, story, ad) with a reusable cast of box-style characters you can pick or define from a spec, ready-made sets (office, kitchen, living room, shop, park, school hall), VOICEVOX multi-speaker lip-sync, optional subtitles and a fast headless-Chrome renderer for 9:16 shorts or 16:9 video. Starts from a fill-in-the-blanks plan sheet (企画書) that non-engineers can write. Use when asked to create a 3D animated short, character skit or tutorial video with consistent characters.
---

# AI 3D Video Production Skill

Make 3D animated videos (9:16 shorts or 16:9) with consistent characters, VOICEVOX dialogue, lip-sync, BGM and optional subtitles.

`$SKILL` below = the directory containing this file. Requirements: Python 3, `ffmpeg`, Chrome/Chromium (`--chrome` or `CHROME_PATH` if not auto-found), VOICEVOX engine on `127.0.0.1:50021`.

## Work cheaply: rules

1. **Do not read the library sources** (`assets/*.js`, `scripts/*.py`). Everything needed is here and in `references/api.md` (full tables: every character, set, prop height, layout). Open a source file only if a call fails.
2. **Plan first** with `kikaku.md` (below). The plan sheet alone decides the video; you should not need to ask anything it does not cover.
3. **Start from the closest example**, not a blank file: `examples/shio-shoushou/` (two new-cast humanoids, a set, a prop in hand, close-up punchline — the generic template), `examples/uketsuke-dake/` (humanoid + flying mascot, props handed in and stacked, sash), `examples/zumen-doori/` (scene cuts indoor→outdoor, own BGM + sfx).
4. **Use a tested layout** (`layouts.duoHumans916` etc.) and `util.place` / `util.shot` / `util.closeUpOn` instead of working out camera and positions.
5. **Check with `--preview`**, which makes ONE contact-sheet image (`preview.png`). Look at that single image; do not open individual frames. Do the full render once, at the end.
6. **Use the ready-made motions** (`setArm`, `point`, `wave`, `walk`, `handOff`, `createStacker`, `tasuki.setPutOn`) instead of deriving paths by hand.

## Plan first: kikaku.md (企画書)

1. On a request, create `kikaku.md` in the work dir from `$SKILL/templates/kikaku.md`. Copy in whatever the user wrote (their own plan sheet or detailed instructions). Fill every missing item yourself and mark it **（仮）**. "おまかせ" = you decide, then write the decision back.
2. Ask only questions that change the result a lot (the punchline, who appears, length) — **at most 3**. Decide everything else provisionally. If the request is detailed enough, ask nothing and start.
3. If many items are （仮）, show the user the plan in a few lines and get one OK before rendering.
4. Build `dialogue.json` and `scene.html` from `kikaku.md` only, with this mapping:

| 企画書 | → | Implementation |
|---|---|---|
| 誰に見せる / どこに載せる | → | tone and length only. Shorts/TikTok/Reels → 9:16; YouTube (normal), slides, TV → 16:9 when 向き is おまかせ |
| 雰囲気 | → | コメディ: quick lines (`speed` 1.1–1.2), a beat of silence + `deadpan` look to camera for the punchline, 明るい music · ほのぼの: `speed` 0.95–1.0, `happy`, のんびり music · 解説: `solo916`/`duo169`, narrator voice 30, steady pace, subtitles burn if おまかせ · 感動: slow (`speed` ~0.9), longer pauses, のんびり music, no joke ending · シュール: `deadpan`, few gestures, ドキドキ or 音楽なし · その他: follow the user's words |
| 向き / 長さ | → | 縦 `--aspect 9:16`, 横 `16:9`; `total_sec` (おまかせ → 12–15 s); layout by head count: 1 `solo916`, 2 `duoHumans916` (human + flying mascot `duo916`), 3 `trio916`, 横 `duo169` |
| 登場人物・見た目 | → | 少年 `boy`, 女の子 `girl`, 会社員 `officeWorker`, コックさん `chef`, おばあちゃん `grandma`, ロボット `robot`, 店員さん `clerk`, とんぼ `dragonfly`, ねこ `cat`, ひよこ `chick`, スライム `slime`; described in words → `AI3DChars.define(name, spec)` (or a cast.js entry) |
| 声の感じ | → | 明るい / 落ち着いた / 元気な子ども / 低め / かわいい / お年寄り / ロボットっぽい → the table in `references/voicevox_speakers.md`; おまかせ → that table's "Fits" column for the character, keeping every character's voice different. One id per character, all video |
| 性格 / 表情・動き | → | `setExpression`, `look`, `point`, `speed`/`pitch` of lines |
| 場所 | → | 学校のホール `schoolHall`, 会社 `office`, キッチン `kitchen`, リビング `livingRoom`, お店 `shop`, 公園 `park`; その他 → `createRoom` / `createOutdoor` + props; おまかせ → the set that fits the story |
| 出てくる物・持っている物 | → | props from `references/api.md`; carried → `createStacker`; held in one hand → child of `rig.arms.L.fore` |
| 流れ（表） | → | one `lines[]` entry per spoken cue; beats timed from the audio printout |
| 音楽の雰囲気 | → | 明るい: built-in loop (no `--bgm`) · のんびり: `--bgm "$SKILL"/examples/zumen-doori/bgm_calm.mp3` · ドキドキ: `--bgm "$SKILL"/assets/bgm_tense.mp3` · 音楽なし: `--bgm none` · おまかせ: by 雰囲気 (row above) |
| 音楽を止めたい瞬間 / 効果音 | → | `bgm_stop_sec` (omit = to the end); `sfx[]`. Bundled sound: `examples/zumen-doori/wind.mp3` only. Other sounds need a file from the user; without one, leave it out and mark （仮） |
| 字幕 | → | `--subtitles burn` (動画に入れる) or `none` (なし / あとで自分で: `subtitles.srt` is still written) |
| 画面内の文字 | → | keep props blank unless 入れたい (then say text is added in editing) |
| こだわり | → | add to the Quality-rules check of `preview.png` |
| 参考 | → | use for mood and pacing only; do not copy someone else's characters, footage or music |

5. Change requests: edit `kikaku.md` first, then the video. The plan sheet is the source of truth.
6. In the final report, list every item you decided provisionally (（仮）) and the voice credit lines needed.

## Workflow

```bash
cp "$SKILL"/assets/*.js .                                        # 1. library into the work dir
cp "$SKILL"/templates/kikaku.md .                                #    plan sheet (fill it first)
cp "$SKILL"/examples/shio-shoushou/{scene.html,dialogue.json} .  #    closest example as the start
# 2. edit dialogue.json from kikaku.md, then:
python3 "$SKILL"/scripts/audio_pipeline.py --script dialogue.json --out-dir .
# 3. edit scene.html, then preview (repeat 3 until right):
python3 "$SKILL"/scripts/render_batch.py --work-dir . --aspect 9:16 --preview
# 4. final:
python3 "$SKILL"/scripts/render_batch.py --work-dir . --aspect 9:16 --subtitles none --out out.mp4
```

### dialogue.json
```json
{ "fps": 15, "total_sec": 12.0, "bgm_stop_sec": 10.0,
  "lines": [ { "id": "L1", "role": "chef", "speaker_id": 13, "start": 0.3, "max_dur": 1.3, "speed": 1.05, "pitch": -0.02, "text": "塩、少々ね。" } ] }
```
- `role` names the lip-sync track (`mouth.chef` in the scene). `max_dur` time-compresses a line that runs long.
- **One line per visual cue.** If props appear on separate words ("荷物！ 写真！ 進行も！"), make them separate lines so each `start` can be set.
- The script prints each line's real start/end; time the choreography from that printout.
- Sound effects / ambience: top-level `"sfx": [{ "file": "wind.mp3", "start": 5.0, "volume": 0.8 }]` (path relative to dialogue.json).
- Options: `--bgm file.mp3 --bgm-volume 0.6` (own music; bundled: `examples/zumen-doori/bgm_calm.mp3` calm, `assets/bgm_tense.mp3` tense), `--bgm none` (no music), `--require-voicevox` (fail instead of falling back to macOS `say`).
- **Keep one `speaker_id` per character for the whole video**; convey emotion with `speed`/`pitch`.

### render_batch.py
`--preview [--step 5]` half-size contact sheet only · `--subtitles none|burn` · `--subtitle-font` · `--timeout 600` · `--chrome` · `--html`.
It clears old frames and **exits with an error if any frame is missing** (a JS error in the scene shows up as this).

## API summary (details: `references/api.md`)

World units; the boy is 1.49 tall; characters face +Z; camera looks from +Z; floor y=0.
scene.html loads `three.min.js, characters.js, cast.js, props.js, stage.js`.

**Stage** — `AI3DStage.start({ aspect, setup(ctx) })`; `setup` returns `update(t, mouth, frame)`. `ctx = { THREE, scene, camera, util, layouts, timing, fps, frames }`.
`util`: `seg(t,a,b)` · `pulse(t,t0,dur)` · `lerp` · `ease` · `clamp01` · `place(rig, slot)` · `shot(camera, a, b?, k)` · `closeUpOn(rig, dist=2.6, side=0)`.
Layouts: `solo916` (a) · `duoHumans916` (a, b) · `duo916` (boy/a + dragonfly/mascot, desk) · `trio916` (a, b, c) · `duo169` (a, b). Each has `camera`, `closeUpA…`, `prop`. Heads stay in frame up to 2.1 tall and the bottom ~15% is floor (captions).

**Characters** — `AI3DChars.create(name, THREE, overrides?)`, `list(kind?)`, `define(name, spec)`, `register(name, factory, kind)`, `createHumanoid(THREE, spec)`, `createMascot(THREE, spec)`, `createBoy`, `createDragonfly`.
Cast: humanoids `boy girl officeWorker chef grandma robot clerk`; mascots `dragonfly cat chick slime` (see `docs/cast.png`).

**Rig contract (humanoid)** — `group, torso, head, arms.{L,R}.{upper,fore}, legs.{L,R}, eyes, browL, browR, mouth, cargoAnchor, materials, parts, height, faceY` +
`setExpression('neutral'|'happy'|'confused'|'deadpan'|'surprised', k)` · `setMouth(level, width=1, base=1)` · `setHoldPose(0..1)` · `setArm(side, {forward, out=0.08, bend, twist})` · `look(yaw, pitch, roll)` (yaw>0 → screen-right, pitch>0 → down) · `point(side, k, dir)` · `wave(side, t, k)` · `blink(t)` (after setExpression) · `walk(phase, k)`.
Side `'L'` = screen-left when facing the camera. Spec height is already in `group.scale`.
**Mascot** — `group, body, head, mouth, eyes, height, faceY` + `setMouth`, `setExpression`, `look(x,y)`, `blink(t)`, `flap(t)`. **Mascots and the dragonfly never get arms/hands**; they gesture with the whole body. Dragonfly: `bodyPivot.rotation.x ≈ 0.42` so the wings read; body at local y=1.0.

**New character** — add a spec to `assets/cast.js` (copy the closest entry), or in a scene: `AI3DChars.define('teacher', { ...AI3DChars.specs.officeWorker, hairStyle: 'bob', glasses: '#333' })`. Humanoid spec keys: colours `skin hair top topAccent bottom socks shoes eye glasses tie apron cheeks hatColor`; `hairStyle short|bob|long|ponytail|bun|cap|bald`; `hat cap|chef|helmet|beanie|antenna`; `topAccentStyle vest|jacket`; `bottomStyle shorts|pants|skirt`; `sleeves short|long`; `height`, `build`, `headScale`. Mascot keys: `body belly cheeks size shape(round|tall|blob) ears(cat|bear|bunny) earInner wings(bird|bug) tail(round|long) tailTip beak muzzle nose whiskers float feet` (a cat reads as a cat with ears:'cat', tail:'long', whiskers, nose, muzzle — see `cat` in cast.js). Colours `'#rrggbb'`.

**Sets** — `AI3DProps.createSet(THREE, scene, 'schoolHall'|'office'|'kitchen'|'livingRoom'|'shop'|'park')` → `{ root, main, mainTopY, …refs }` (`main` = key furniture back-right; move it freely). Build others with `createRoom(THREE, parent, {floor, wall, windows, banner})` / `createOutdoor(THREE, parent, {ground, sky, buildings})`.

**Props** (`{ mesh, height }`, origin bottom-centre): `createBox, createTable, createChair, createCounter, createShelf, createMonitor, createLaptop, createClosedLaptop, createPhone, createPaper, createBook, createMug, createPlate, createWhiteboard, createSignboard, createPlant, createTree, createBench, createSofa, createCardboard, createCameraProp` — heights in `references/api.md`.
Carry: `createStacker(rig.cargoAnchor).add(mesh, height)` (bottom-up, no floating) · `handOff(item, u, fromX)` (call `setHoldPose(1)` first) · `createHelperArm(THREE, parent, length)` · `createTasuki(THREE, rig.torso).setPutOn(p)`. A prop held in one hand: add it to `rig.arms.L.fore` at local y ≈ −0.24.

## Quality rules
1. One Chrome session for all frames (always via `render_batch.py`).
2. Characters come from the library (cast or a spec); never rebuild or recolour one mid-video. Same look and voice for the whole video.
3. Text on props (sash, banner, signboard, screens) and subtitles stay blank unless the plan asks; add them in editing.
4. Before the final render, check `preview.png` for: clipping (arms into other characters or furniture), floating props, hidden faces, characters cut off at the frame edge, and every item under 企画書「こだわり」.
