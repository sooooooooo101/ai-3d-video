# ai-3d-video API reference

World units: metres-ish. The boy is 1.49 tall; characters face +Z; the camera looks from +Z. Floor is y=0.
Colours everywhere: `'#rrggbb'` (colour-picker / sRGB) or `[r,g,b]` linear 0–1 (library internal).
Load order in scene.html: `three.min.js, characters.js, cast.js, props.js, stage.js` (cast.js only if you use the bundled cast).

## Characters (`AI3DChars`, `assets/characters.js` + `assets/cast.js`)

| Call | Returns |
|---|---|
| `create(name, THREE, overrides?)` | rig of a registered character; `overrides` = spec keys to change (e.g. `{ hair: '#222' }`) |
| `list(kind?)` → names | `kind`: `'humanoid'` / `'mascot'` |
| `kindOf(name)` | `'humanoid'` / `'mascot'` / `'custom'` |
| `define(name, spec)` | register a spec-only character (`spec.kind`: `'humanoid'` default, or `'mascot'`) |
| `register(name, factory, kind)` | register any `factory(THREE, overrides) → rig` |
| `createHumanoid(THREE, spec)` / `createMascot(THREE, spec)` | build directly from a spec |
| `createBoy(THREE)` / `createDragonfly(THREE)` | the original two (= `create('boy')`, `create('dragonfly')`) |
| `specs[name]` | the spec object of a defined character (copy it to make a variant) |

### Bundled cast

| name | kind | look | height (world) |
|---|---|---|---|
| `boy` | humanoid | brown hair, cream shirt, rust vest, shorts | 1.49 |
| `girl` | humanoid | ponytail, navy vest + skirt, blush | 1.45 |
| `officeWorker` | humanoid | adult, navy suit, red tie | 1.79 |
| `chef` | humanoid | whites, apron, tall chef hat | 2.1 (with hat) |
| `grandma` | humanoid | grey bun, glasses, cardigan, long skirt | 1.5 |
| `robot` | humanoid | metal head, antenna (`rig.parts.antennaTip`), cyan eyes | 1.72 |
| `clerk` | humanoid | bob hair, green cap + apron | 1.68 |
| `dragonfly` | mascot | orange, 4 wings, **no arms** | body at local y=1.0 |
| `cat` | mascot | standing orange cat, ears, tail | 0.63 |
| `chick` | mascot | flying yellow chick, beak, wings | body at local y=1.0 |
| `slime` | mascot | green blob, no feet | 0.45 |

### Humanoid spec (all optional; missing keys = the boy)
`skin hair top topAccent bottom socks shoes eye` colours (`hair: null` = no hair, `topAccent: null` = plain shirt) ·
`topAccentStyle: 'vest'|'jacket'` (jacket also colours the sleeves) · `bottomStyle: 'shorts'|'pants'|'skirt'` · `sleeves: 'short'|'long'` ·
`hairStyle: 'short'|'bob'|'long'|'ponytail'|'bun'|'cap'|'bald'` (`hairTie` colour for ponytail) ·
`hat: null|'cap'|'chef'|'helmet'|'beanie'|'antenna'`, `hatColor` · `glasses` `tie` `apron` `cheeks` colours (null = none) ·
`height` (uniform scale, 1 = 1.49) · `build` (body width/depth, 0.85–1.25) · `headScale` (adults ~0.9) · `metallic` (robot skin).

### Mascot spec
`body belly eyeWhite pupil mouthColor cheeks` colours · `size` (1 ≈ 0.5 tall) · `shape: 'round'|'tall'|'blob'` ·
`ears: null|'cat'|'bear'|'bunny'` · `wings: null|'bird'|'bug'`, `wingColor` · `tail: null|'round'|'long'` · `beak` colour (replaces the mouth) ·
`float` (hover with body at local y=1.0, like the dragonfly) · `feet` (default true when standing) · `antenna`.

### Rig contract

Every **humanoid** returns:
`group, torso, head, arms.{L,R}.{upper,fore}, legs.{L,R}, eyes[], browL, browR, mouth, cargoAnchor, materials, parts, spec, height, faceY` and

| method | meaning |
|---|---|
| `setExpression(mode, k=1)` | `'neutral'|'happy'|'confused'|'deadpan'|'surprised'` (`happy` shows a smile) |
| `setMouth(level, width=1, baseHeight=1)` | lip-sync: pass `mouth.<role>` |
| `setHoldPose(0..1)` | both forearms forward to carry (stacker/handOff/tasuki are tuned to it) |
| `setArm(side, { forward, out=0.08, bend, twist })` | radians. `side` `'L'` = screen-left when facing the camera |
| `look(yaw, pitch, roll)` | head. yaw>0 toward screen-right, pitch>0 looks down |
| `point(side, k=1, dir=0.25)` | arm out to point (dir 0 = ahead, 1 = sideways) |
| `wave(side, t, k=1)` | hand up beside the head, waving |
| `blink(t, period=2.7, dur=0.12, offset=0)` | call **after** setExpression each frame |
| `walk(phase, k=1)` | leg/arm swing (e.g. `walk(t*9)`); move `group.position` yourself |

`height` = world height of the head top incl. hat; `faceY` = world height of the face centre. `group.scale` already holds `spec.height`; multiply, don't overwrite, if you rescale.
Props attach to `cargoAnchor` (in front of the chest at carry height) and `torso`; both scale with the character, so stacker/handOff/tasuki/helper arms work on every humanoid.

Every **mascot** returns `group, body (= bodyPivot), head, mouth, eyes, wings, height, faceY` and `setMouth(level)`, `setExpression(mode,k)`, `look(x, y)` (pupils, −1..1), `blink(t)`, `flap(t, speed=24, amp=0.35)` (= `wingbeat`). Turn the whole mascot with `group.rotation`, tilt with `body.rotation`. Mascots have **no hands**: they gesture with the body.
The dragonfly's `setExpression` / `look` / `blink` do nothing (it has no eyelids; turn its body instead). It additionally has `bodyPivot` pitch (~0.42 so its wings read from the camera) and `wingbeat(t, speed, amp)`.

### Adding a character
1. Simple: add an entry to `window.AI3DCast` in `assets/cast.js` (copy the closest one, change colours/styles). It is registered automatically.
2. In one scene only: `AI3DChars.define('teacher', { kind: 'humanoid', ...AI3DChars.specs.officeWorker, hairStyle: 'bob', glasses: '#333' })`.
3. Custom geometry: `AI3DChars.register('ghost', (THREE, o) => ({ group, head, mouth, setMouth(){}, ... }), 'mascot')` — follow the contract above so layouts and helpers keep working.

## Sets (`AI3DProps.createSet(THREE, parent, name)`)

Returns `{ root, name, main, mainTopY, ... }`. `main` = the key furniture (Object3D) placed back-right, behind the characters; move it with `set.main.position.set(...)`. `mainTopY` = its usable surface height. Background walls at z=−3.5.

| name | look | refs |
|---|---|---|
| `schoolHall` | event hall, windows, blank banner, reception desk | `deskGroup` (= main, top 0.775) |
| `office` | grey carpet, desk + monitor, whiteboard, shelf, plant | `desk`, `monitor`, `chair`, `desk2`, `whiteboard`, `shelf`, `plant` |
| `kitchen` | back counter with stove + sink, fridge, plate shelf, island | `counter` (island, top 0.95), `backCounter`, `fridge`, `shelf` |
| `livingRoom` | sofa, rug, low table, TV, lamp, plant | `table` (top 0.40), `sofa`, `tv`, `plant`, `lamp` |
| `shop` | goods shelves, blank sign, counter + register | `counter` (top 0.95), `register`, `shelves[]` |
| `park` | grass, path, trees, bench, blank signboard, lamp, sky | `bench` (seat 0.47), `trees[]`, `sign`, `lamp`, `sky` |

Room / outdoor builders: `createRoom(THREE, parent, { floor, wall, width=14, depth=7, windows:[x…], banner, bannerBorder, sideWalls, baseboard })`, `createOutdoor(THREE, parent, { ground, sky, buildings })` → `{ ground, buildings, sky }` (sets `scene.background` if parent is the scene; set it yourself when parent is a group), `createSchoolHall(THREE, parent)` → `{ deskGroup }`.

## Props (`AI3DProps`) — all return `{ mesh, height }`, origin at the bottom centre

| call | height | extra |
|---|---|---|
| `createBox(THREE, w=0.4, h=0.3, d=0.3, color)` | h | |
| `createCardboard(THREE)` | 0.20 | taped box |
| `createCameraProp(THREE)` | 0.11 | |
| `createClosedLaptop(THREE)` | 0.036 | |
| `createLaptop(THREE, { body, screen })` | 0.24 | open; `screen` mesh |
| `createMonitor(THREE, { w=0.55, h=0.34, stand=0.12 })` | 0.46 | `screen` mesh (TV: `{ w:1.1, h:0.62 }`) |
| `createPhone(THREE)` | 0.012 | lying flat, `screen` |
| `createPaper(THREE, { w, d, sheets=1 })` | 0.004×sheets | |
| `createBook(THREE, { color })` | 0.035 | lying flat |
| `createMug(THREE, { color })` | 0.10 | |
| `createPlate(THREE, { r=0.12, color })` | 0.02 | |
| `createTable(THREE, { w=1.2, d=0.7, h=0.74, top, legs })` | h (top) | desk too |
| `createChair(THREE, { color, seatH=0.45 })` | 0.89 | `seatY` |
| `createCounter(THREE, { w=1.6, d=0.6, h=0.95, body, top })` | h (top) | |
| `createShelf(THREE, { w=1, h=1.6, d=0.35, shelves=4, fill=true })` | h | `shelfY[]` board tops |
| `createWhiteboard(THREE, { w=1.4, h=0.9, legs=true })` | 1.78 | blank |
| `createSignboard(THREE)` | 1.10 | blank `face` |
| `createPlant(THREE, { size=1 })` | 0.83×size | |
| `createTree(THREE, { scale=1 })` | 3.4×scale | `crown` (sway with `crown.rotation.z`) |
| `createBench(THREE)` | 0.86 | `seatY` 0.47 |
| `createSofa(THREE, { color })` | 0.85 | `seatY` 0.47 |

Carry helpers (any humanoid): `createStacker(rig.cargoAnchor)` → `.add(mesh, height)`, `.items[{mesh,restY,height}]` (bottom-up, no floating; 3 items stay below the chin) · `handOff(item, u, fromX=-1.5)` slides a stacker item in from off-screen, returns its top Y for a hand (call `setHoldPose(1)` first) · `createHelperArm(THREE, parent, length)` anonymous sleeve + hand, origin = grip, extends along +Y · `createTasuki(THREE, rig.torso)` blank sash, `.setPutOn(0..1)`, `.grip`.
To make a prop rest in a hand without carrying, add it to `rig.arms.L.fore` (hand ≈ local y −0.2; see `examples/shio-shoushou`).

## Stage (`AI3DStage`, `assets/stage.js`)

`AI3DStage.start({ aspect: '9:16'|'16:9', background, setup(ctx) })` — `setup` returns `update(t, mouth, frame)`; `ctx = { THREE, scene, camera, util, layouts, timing, fps, frames }`.

`util`: `seg(t,a,b)` 0→1 ease · `pulse(t,t0,dur)` 0→1→0 · `lerp` · `ease` · `clamp01` ·
`place(rig, slot)` puts a rig on a layout slot `{ pos, rotY, scale? }` ·
`shot(camera, a, b?, k=0)` camera at shot `a` (`{ pos, target, fov? }`) blended toward `b` ·
`closeUpOn(rig, dist=2.6, side=0)` → a chest-up shot of any rig, sized from its face height (use ~1.8 in 16:9).

### Layouts (`ctx.layouts`) — tested: heads in frame up to 2.1 tall, bottom ~15% = floor (caption space)

| name | aspect | slots | shots |
|---|---|---|---|
| `solo916` | 9:16 | `a` centre | `camera`, `closeUpA` |
| `duoHumans916` | 9:16 | `a` left, `b` right (facing each other a little) | `camera`, `closeUpA`, `closeUpB` |
| `duo916` | 9:16 | `boy`/`a` left, `dragonfly`/`mascot` hovering upper-right, `desk` | `camera`, `closeUpBoy`/`closeUpA` |
| `trio916` | 9:16 | `a` left, `b` centre (a step back), `c` right | `camera`, `closeUpA/B/C` |
| `duo169` | 16:9 | `a` left, `b` right | `camera`, `closeUpA`, `closeUpB` |

Each also has `prop` (where a set's `main` reads well). Static `closeUp*` shots are framed for boy-height characters; for other heights use `util.closeUpOn(rig)`.
A standing mascot can take a human slot; a floating mascot (body at local y=1.0) goes in `duo916.mascot` or any slot with `pos[1]` ≈ 0.5–0.9.
