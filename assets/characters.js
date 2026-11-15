// Reusable 3D Character Library (Three.js).
// - createHumanoid(THREE, spec): box-built person, configurable (colours, hair, clothes, height, props).
// - createMascot(THREE, spec):   round non-human sidekick (ears, wings, tail, floating or standing).
// - createBoy / createDragonfly: the original two characters (createBoy is a createHumanoid preset).
// - register / create / list:    named cast. assets/cast.js (optional) adds more presets.
window.AI3DChars = (function () {
  // rgb: [r,g,b] linear 0..1 (library-internal) or a CSS colour '#rrggbb' / 0xrrggbb (sRGB, colour-picker values).
  function toColor(THREE, c) {
    return Array.isArray(c) ? new THREE.Color(c[0], c[1], c[2]) : new THREE.Color(c);
  }
  function stdMat(THREE, rgb, rough = 0.72, metal = 0.05) {
    return new THREE.MeshStandardMaterial({ color: toColor(THREE, rgb), roughness: rough, metalness: metal });
  }

  function addBox(THREE, parent, bx, by, bz, sx, sy, sz, material, pivotB = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sz, sy), material);
    mesh.position.set(bx - pivotB[0], bz - pivotB[2], -(by - pivotB[1]));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addEllipsoid(THREE, parent, bx, by, bz, sx, sy, sz, material, rotZ_blender = 0, pivotB = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), material);
    mesh.scale.set(sx, sz, sy);
    mesh.position.set(bx - pivotB[0], bz - pivotB[2], -(by - pivotB[1]));
    mesh.rotation.y = rotZ_blender;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // ---------------------------------------------------------------------------------------------
  // Humanoid
  // ---------------------------------------------------------------------------------------------
  // The boy's spec. Every other humanoid is a variation of these numbers (see assets/cast.js).
  const BOY_SPEC = {
    skin: [0.76, 0.48, 0.30], hair: [0.20, 0.085, 0.035], top: [0.91, 0.85, 0.70], topAccent: [0.64, 0.24, 0.13],
    bottom: [0.25, 0.31, 0.35], socks: [0.91, 0.85, 0.70], shoes: [0.19, 0.12, 0.08], eye: [0.055, 0.035, 0.025],
    height: 1, build: 1, headScale: 1,
    hairStyle: 'short', topAccentStyle: 'vest', bottomStyle: 'shorts', sleeves: 'short',
    glasses: null, hat: null, hatColor: null, tie: null, apron: null, cheeks: null, metallic: false,
  };
  const HAIR_STYLES = ['short', 'bob', 'long', 'ponytail', 'bun', 'cap', 'bald'];
  const HATS = ['cap', 'chef', 'helmet', 'beanie', 'antenna'];

  /**
   * Box-built humanoid. Returns the Rig contract:
   * { group, torso, head, arms{L,R}{upper,fore}, legs{L,R}, eyes, browL, browR, mouth, cargoAnchor, materials,
   *   setHoldPose, setExpression, setMouth, setArm, look, point, wave, blink, walk, spec, height }
   * Proportions are those of the boy (1.49 tall); spec.height scales the whole group uniformly, so props
   * that attach to the rig (cargoAnchor, torso) keep fitting.
   */
  function createHumanoid(THREE, specIn = {}) {
    const spec = Object.assign({}, BOY_SPEC, specIn);
    if (spec.hairStyle === 'cap') spec.hat = spec.hat || 'cap';
    const bw = spec.build;
    const P = [0, 0, 1.07], T = [0, 0, 0.61];
    const group = new THREE.Group();

    const cache = {};
    const mat = (c, rough = 0.72, metal = 0.05) => {
      const k = JSON.stringify([c, rough, metal]);
      return cache[k] || (cache[k] = stdMat(THREE, c, rough, metal));
    };
    // Creation order matters for exact reproduction of createBoy's draw order.
    const skin = spec.metallic ? mat(spec.skin, 0.38, 0.55) : mat(spec.skin);
    const hair = mat(spec.hair || spec.skin);
    const top = mat(spec.top);
    const accent = spec.topAccent ? mat(spec.topAccent) : null;
    const bottom = mat(spec.bottom);
    const shoe = mat(spec.shoes);
    const eyeMat = mat(spec.eye);
    const socks = mat(spec.socks || spec.skin);
    const jacket = accent && spec.topAccentStyle === 'jacket';
    const sleeveMat = jacket ? accent : top;
    const longSleeves = spec.sleeves === 'long' || jacket;

    // ---- torso ----
    const torso = new THREE.Group();
    torso.position.set(0, 0.61, 0);
    torso.userData.build = bw;              // read by AI3DProps.createTasuki
    group.add(torso);
    addBox(THREE, torso, 0, 0, 0.855, 0.40 * bw, 0.22 * bw, 0.45, top, T);
    if (accent) {
      if (jacket) addBox(THREE, torso, 0, 0.002 * bw, 0.83, 0.408 * bw, 0.236 * bw, 0.42, accent, T);
      else addBox(THREE, torso, 0, 0.002 * bw, 0.835, 0.408 * bw, 0.236 * bw, 0.37, accent, T);
      addBox(THREE, torso, 0, -0.118 * bw, 0.835, 0.14, 0.018, 0.37, top, T);
      addBox(THREE, torso, 0, -0.119 * bw, 1.015, 0.14, 0.012, 0.09, top, T);
    }
    if (spec.tie) {
      const tm = mat(spec.tie), ty = -(accent ? 0.128 : 0.111) * bw - 0.008;
      addBox(THREE, torso, 0, ty, 0.90, 0.05, 0.012, 0.24, tm, T);
      addBox(THREE, torso, 0, ty - 0.002, 1.035, 0.065, 0.016, 0.04, tm, T);
    }
    if (spec.apron) {
      const am = mat(spec.apron), ay = -(accent ? 0.13 : 0.118) * bw - 0.004;
      addBox(THREE, torso, 0, ay, 0.70, 0.34 * bw, 0.012, 0.56, am, T);
      for (const sx of [-1, 1]) addBox(THREE, torso, sx * 0.13 * bw, ay, 1.03, 0.025, 0.012, 0.1, am, T);
    }

    // ---- head ----
    const head = new THREE.Group();
    head.position.set(0, 1.07 - 0.61, 0);
    if (spec.headScale !== 1) head.scale.setScalar(spec.headScale);
    torso.add(head);
    addBox(THREE, head, 0, 0, 1.265, 0.38, 0.34, 0.37, skin, P);
    const hs = spec.hair ? spec.hairStyle : 'none';
    if (hs === 'short' || hs === 'cap') {
      addBox(THREE, head, 0, 0.005, 1.445, 0.40, 0.36, 0.09, hair, P);
      addBox(THREE, head, 0, 0.153, 1.315, 0.40, 0.055, 0.22, hair, P);
      addBox(THREE, head, -0.095, -0.177, 1.385, 0.21, 0.045, 0.10, hair, P);
    } else if (hs === 'bob' || hs === 'long') {
      const long = hs === 'long';
      addBox(THREE, head, 0, 0.005, 1.445, 0.40, 0.36, 0.09, hair, P);
      if (long) addBox(THREE, head, 0, 0.158, 1.19, 0.40, 0.07, 0.55, hair, P);
      else addBox(THREE, head, 0, 0.153, 1.29, 0.40, 0.06, 0.30, hair, P);
      for (const sx of [-1, 1]) {
        if (long) addBox(THREE, head, sx * 0.2, 0.02, 1.27, 0.04, 0.32, 0.34, hair, P);
        else addBox(THREE, head, sx * 0.2, 0.02, 1.30, 0.04, 0.32, 0.28, hair, P);
      }
      addBox(THREE, head, 0, -0.177, 1.395, 0.38, 0.045, 0.08, hair, P);
    } else if (hs === 'ponytail' || hs === 'bun') {
      addBox(THREE, head, 0, 0.005, 1.445, 0.40, 0.36, 0.09, hair, P);
      addBox(THREE, head, 0, 0.153, 1.315, 0.40, 0.055, 0.22, hair, P);
      for (const sx of [-1, 1]) addBox(THREE, head, sx * 0.2, 0.04, 1.33, 0.035, 0.26, 0.20, hair, P);
      addBox(THREE, head, 0.05, -0.177, 1.40, 0.30, 0.045, 0.075, hair, P);
      if (hs === 'ponytail') {
        addBox(THREE, head, 0, 0.19, 1.39, 0.09, 0.03, 0.06, mat(spec.hairTie || [0.8, 0.12, 0.18]), P);
        const tail = addBox(THREE, head, 0, 0.225, 1.24, 0.10, 0.09, 0.30, hair, P);
        tail.rotation.x = -0.15;
      } else {
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.095, 18, 12), hair);
        bun.position.set(0, 1.53 - 1.07, -0.10); bun.castShadow = true; head.add(bun);
      }
    } else if (hs === 'bald') {
      for (const sx of [-1, 1]) addBox(THREE, head, sx * 0.195, 0.06, 1.27, 0.03, 0.20, 0.11, hair, P);
      addBox(THREE, head, 0, 0.176, 1.26, 0.38, 0.03, 0.11, hair, P);
    }

    const eyes = [];
    for (const ex of [-0.085, 0.085]) {
      eyes.push(addBox(THREE, head, ex, -0.174, 1.27, 0.035, 0.012, 0.043, eyeMat, P));
    }
    const browMat = spec.hair && hs !== 'bald' ? hair : (spec.hair ? hair : eyeMat);
    const browL = addBox(THREE, head, -0.085, -0.176, 1.32, 0.055, 0.012, 0.014, browMat, P);
    const browR = addBox(THREE, head, 0.085, -0.176, 1.32, 0.055, 0.012, 0.014, browMat, P);
    const mouth = addBox(THREE, head, 0, -0.175, 1.175, 0.058, 0.014, 0.014, eyeMat, P);
    // Upturned mouth corners: hidden unless the expression is 'happy'.
    const smile = [-1, 1].map(sign => {
      const c = addBox(THREE, head, 0, -0.175, 1.175, 0.026, 0.014, 0.013, eyeMat, P);
      c.rotation.z = sign * 0.75;
      c.castShadow = false;
      c.visible = false;
      return { mesh: c, sign };
    });
    let mouthWidth = 1.0;
    const placeSmile = () => smile.forEach(({ mesh, sign }) => {
      mesh.position.x = sign * (0.029 * mouthWidth + 0.007);
      mesh.position.y = mouth.position.y + 0.008;
    });
    placeSmile();

    if (spec.cheeks) {
      const cm = mat(spec.cheeks);
      for (const sx of [-1, 1]) addBox(THREE, head, sx * 0.125, -0.172, 1.215, 0.05, 0.006, 0.024, cm, P).castShadow = false;
    }
    if (spec.glasses) {
      const gm = mat(spec.glasses, 0.4, 0.3), gy = -0.188;
      for (const ex of [-0.085, 0.085]) {
        addBox(THREE, head, ex, gy, 1.307, 0.10, 0.01, 0.012, gm, P);
        addBox(THREE, head, ex, gy, 1.233, 0.10, 0.01, 0.012, gm, P);
        addBox(THREE, head, ex - 0.044, gy, 1.27, 0.012, 0.01, 0.075, gm, P);
        addBox(THREE, head, ex + 0.044, gy, 1.27, 0.012, 0.01, 0.075, gm, P);
      }
      addBox(THREE, head, 0, gy, 1.285, 0.05, 0.01, 0.01, gm, P);
      for (const sx of [-1, 1]) addBox(THREE, head, sx * 0.195, -0.11, 1.29, 0.012, 0.15, 0.012, gm, P);
    }
    if (spec.hat) {
      const hm = mat(spec.hatColor || ({ chef: '#f7f7f4', helmet: '#f2c230', antenna: '#9aa3ad' }[spec.hat] || '#2f5fa8'));
      if (spec.hat === 'cap') {
        addBox(THREE, head, 0, 0.005, 1.475, 0.41, 0.37, 0.10, hm, P);
        addBox(THREE, head, 0, -0.25, 1.432, 0.32, 0.16, 0.02, hm, P);
      } else if (spec.hat === 'chef') {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.28, 24), hm);
        band.position.y = 1.56 - 1.07; band.castShadow = true; head.add(band);
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), hm);
        puff.scale.set(0.25, 0.12, 0.23); puff.position.y = 1.71 - 1.07; puff.castShadow = true; head.add(puff);
      } else if (spec.hat === 'helmet') {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hm);
        dome.scale.set(0.235, 0.2, 0.215); dome.position.y = 1.39 - 1.07; dome.castShadow = true; head.add(dome);
        addBox(THREE, head, 0, -0.06, 1.395, 0.46, 0.42, 0.02, hm, P);
      } else if (spec.hat === 'beanie') {
        addBox(THREE, head, 0, 0.005, 1.47, 0.41, 0.37, 0.14, hm, P);
        const pom = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), hm);
        pom.position.y = 1.58 - 1.07; head.add(pom);
      } else if (spec.hat === 'antenna') {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), hm);
        stick.position.y = 1.52 - 1.07; head.add(stick);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), mat(spec.antennaTip || '#ff5a4a', 0.4));
        ball.position.y = 1.6 - 1.07; head.add(ball);
      }
    }

    // ---- arms ----
    const arms = {};
    for (const [side, x0] of [['L', -0.285], ['R', 0.285]]) {
      const x = x0 * bw;
      const upper = new THREE.Group();
      upper.position.set(x, 1.02 - 0.61, 0);
      torso.add(upper);
      addBox(THREE, upper, x, 0, 0.97, 0.16, 0.22, 0.17, sleeveMat, [x, 0, 1.02]);
      if (longSleeves) addBox(THREE, upper, x, 0, 0.845, 0.15, 0.20, 0.08, sleeveMat, [x, 0, 1.02]);
      else addBox(THREE, upper, x, 0, 0.845, 0.145, 0.19, 0.08, skin, [x, 0, 1.02]);

      const fore = new THREE.Group();
      fore.position.set(0, 0.80 - 1.02, 0);
      upper.add(fore);
      if (longSleeves) {
        addBox(THREE, fore, x, 0, 0.72, 0.15, 0.20, 0.16, sleeveMat, [x, 0, 0.80]);
        addBox(THREE, fore, x, 0, 0.6025, 0.13, 0.17, 0.075, skin, [x, 0, 0.80]);
      } else {
        addBox(THREE, fore, x, 0, 0.685, 0.145, 0.19, 0.23, skin, [x, 0, 0.80]);
      }
      arms[side] = { upper, fore };
    }

    // ---- legs (each in a hip pivot so walk() can swing them) ----
    const legs = {};
    for (const [side, x0] of [['L', -0.105], ['R', 0.105]]) {
      const x = x0 * bw, H = [x, 0, 0.64];
      const leg = new THREE.Group();
      leg.position.set(x, 0.64, 0);
      group.add(leg);
      legs[side] = leg;
      if (spec.bottomStyle === 'pants') {
        addBox(THREE, leg, x, 0, 0.535, 0.195 * bw, 0.23, 0.21, bottom, H);
        addBox(THREE, leg, x, 0, 0.315, 0.17, 0.20, 0.23, bottom, H);
        addBox(THREE, leg, x, 0, 0.155, 0.165, 0.195, 0.09, socks, H);
      } else if (spec.bottomStyle === 'skirt') {
        addBox(THREE, leg, x, 0, 0.33, 0.15, 0.18, 0.20, skin, H);
        addBox(THREE, leg, x, 0, 0.17, 0.165, 0.195, 0.12, socks, H);
      } else {
        addBox(THREE, leg, x, 0, 0.535, 0.195 * bw, 0.23, 0.21, bottom, H);
        addBox(THREE, leg, x, 0, 0.39, 0.16, 0.19, 0.08, skin, H);
        addBox(THREE, leg, x, 0, 0.29, 0.16, 0.19, 0.12, skin, H);
        addBox(THREE, leg, x, 0, 0.17, 0.165, 0.195, 0.12, socks, H);
      }
      addBox(THREE, leg, x, -0.035, 0.055, 0.19, 0.29, 0.11, shoe, H);
    }
    if (spec.bottomStyle === 'skirt') {
      addBox(THREE, group, 0, 0, 0.6, 0.42 * bw, 0.25 * bw, 0.12, bottom);
      addBox(THREE, group, 0, 0, 0.47, 0.48 * bw, 0.29 * bw, 0.14, bottom);
    }

    const cargoAnchor = new THREE.Group();
    cargoAnchor.position.set(0, 0.63, 0.34 + (bw - 1) * 0.11);
    group.add(cargoAnchor);
    if (spec.height !== 1) group.scale.setScalar(spec.height);

    const headTop = { cap: 1.53, chef: 1.83, helmet: 1.6, beanie: 1.6, antenna: 1.64 }[spec.hat] || 1.49;
    const sgn = side => (side === 'L' ? -1 : 1);
    const rig = {
      group, torso, head, arms, legs, eyes, browL, browR, mouth, cargoAnchor, spec,
      /** World height of the top of the head (incl. hat) when group.scale is left as built. */
      height: headTop * spec.height,
      materials: { skin, hair, cream: top, vest: accent, shorts: bottom, shoe, eyeMat,
        top, topAccent: accent, bottom, socks, shoes: shoe, eye: eyeMat },
      setHoldPose(blend) {
        arms.L.upper.rotation.set(-blend * 0.45, 0, -0.08 * (1 - blend));
        arms.L.fore.rotation.set(-blend * 1.05, 0, 0);
        arms.R.upper.rotation.set(-blend * 0.45, 0, 0.08 * (1 - blend));
        arms.R.fore.rotation.set(-blend * 1.05, 0, 0);
      },
      setExpression(mode, intensity = 1.0) {
        smile.forEach(c => { c.mesh.visible = mode === 'happy' && intensity > 0.5; });
        if (mode === 'happy') {
          browL.rotation.z = 0.15 * intensity;
          browR.rotation.z = -0.15 * intensity;
          eyes.forEach(e => { e.scale.y = 1.0; });
        } else if (mode === 'confused') {
          browL.rotation.z = -0.22 * intensity;
          browR.rotation.z = 0.22 * intensity;
          eyes.forEach(e => { e.scale.y = 1.0; });
        } else if (mode === 'deadpan') {
          browL.rotation.z = 0;
          browR.rotation.z = 0;
          eyes.forEach(e => { e.scale.y = 1.0 - 0.28 * intensity; });
        } else if (mode === 'surprised') {
          browL.rotation.z = 0;
          browR.rotation.z = 0;
          browL.position.y = browR.position.y = 1.32 - 1.07 + 0.025 * intensity;
          eyes.forEach(e => { e.scale.y = 1.0 + 0.4 * intensity; });
          return;
        } else {
          browL.rotation.z = 0;
          browR.rotation.z = 0;
          eyes.forEach(e => { e.scale.y = 1.0; });
        }
        if (browL.position.y !== 1.32 - 1.07) browL.position.y = browR.position.y = 1.32 - 1.07;
      },
      setMouth(rms, widthScale = 1.0, baseHeight = 1.0) {
        mouth.scale.set(widthScale, baseHeight + (rms || 0) * 2.0, 1);
        mouthWidth = widthScale;
        placeSmile();
      },
      /** forward: raise toward camera (rad), out: away from the body (rest 0.08), bend: elbow (rad), twist: upper-arm yaw. */
      setArm(side, { forward = 0, out = 0.08, bend = 0, twist = 0 } = {}) {
        arms[side].upper.rotation.set(-forward, twist, sgn(side) * out);
        arms[side].fore.rotation.set(-bend, 0, 0);
      },
      /** yaw > 0 turns toward screen-right (when facing camera), pitch > 0 looks down, roll tilts. */
      look(yaw = 0, pitch = 0, roll = 0) { head.rotation.set(pitch, yaw, roll); },
      /** Arm straight out to the front/side (amount 0..1). dir: 0 = straight ahead, 1 = fully to the side. */
      point(side, amount = 1, dir = 0.25) {
        rig.setArm(side, { forward: 1.45 * amount * (1 - dir * 0.6), out: 0.08 + 1.3 * amount * dir, bend: 0.1 * amount });
      },
      /** Hand raised beside the head, waving with time t (amount 0..1). */
      wave(side, t, amount = 1) {
        rig.setArm(side, { forward: 0.25 * amount, out: 0.08 + 2.3 * amount + Math.sin(t * 12) * 0.18 * amount, bend: 0.5 * amount });
      },
      /** Call after setExpression each frame: closes the eyes briefly every `period` seconds. */
      blink(t, period = 2.7, dur = 0.12, offset = 0) {
        if (((t + offset) % period) > period - dur) eyes.forEach(e => { e.scale.y *= 0.15; });
      },
      /** Leg + arm swing for a walk cycle. phase in radians (e.g. t*9), amount 0..1. Move group yourself. */
      walk(phase, amount = 1) {
        const s = Math.sin(phase) * 0.45 * amount;
        legs.L.rotation.x = s; legs.R.rotation.x = -s;
        arms.L.upper.rotation.x = -s * 0.8; arms.R.upper.rotation.x = s * 0.8;
      },
    };
    return rig;
  }

  /** The original boy: a createHumanoid preset (identical to the v1 model). */
  function createBoy(THREE) {
    return createHumanoid(THREE, BOY_SPEC);
  }

  // ---------------------------------------------------------------------------------------------
  // Dragonfly (original sidekick)
  // ---------------------------------------------------------------------------------------------
  /**
   * Create Dragonfly character (exact match to create_models.py, 4 wings, NO arms/hands)
   */
  function createDragonfly(THREE) {
    const group = new THREE.Group();
    const orangeMat = stdMat(THREE, [1, 0.34, 0.035]);
    const darkOrange = stdMat(THREE, [0.75, 0.20, 0.02]);

    const bodyPivot = new THREE.Group();
    bodyPivot.position.set(0, 1.0, 0);
    group.add(bodyPivot);

    addEllipsoid(THREE, bodyPivot, 0, 0, 1, 0.08, 0.15, 0.075, orangeMat, 0, [0, 0, 1]);
    const head = new THREE.Group();
    head.position.set(0, 0, 0.20);
    bodyPivot.add(head);
    addEllipsoid(THREE, head, 0, -0.23, 1, 0.10, 0.09, 0.08, orangeMat, 0, [0, -0.20, 1]);
    for (const ex of [-0.073, 0.073]) {
      addEllipsoid(THREE, head, ex, -0.28, 1.035, 0.038, 0.04, 0.04, orangeMat, 0, [0, -0.20, 1]);
    }
    const pupilMat = stdMat(THREE, [0.07, 0.035, 0.02], 0.35);
    for (const ex of [-0.078, 0.078]) {
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.019, 16, 10), pupilMat);
      pupil.position.set(ex, 0.052, 0.106);   // front-top of each eye, visible from the front and from above
      head.add(pupil);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.015, 0.02), darkOrange);
    mouth.position.set(0, -0.03, 0.115);
    head.add(mouth);

    addEllipsoid(THREE, bodyPivot, 0, 0.43, 1, 0.043, 0.43, 0.043, orangeMat, 0, [0, 0, 1]);

    const wings = [];
    for (const [side, sign] of [['L', -1], ['R', 1]]) {
      for (const [row, y, sweep] of [['front', -0.07, -0.13], ['rear', 0.07, 0.15]]) {
        const start = new THREE.Vector3(sign * 0.04, y, 1.035);
        const end = new THREE.Vector3(sign * 0.59, y + sweep, 1.035);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const len = start.distanceTo(end);
        const angleZ = Math.atan2(end.y - start.y, end.x - start.x);

        const wPivot = new THREE.Group();
        wPivot.position.set(start.x, start.z - 1.0, -start.y);
        bodyPivot.add(wPivot);
        addEllipsoid(THREE, wPivot, mid.x, mid.y, mid.z, len / 2 + 0.025, 0.047, 0.018, orangeMat, angleZ, [start.x, start.y, start.z]);
        wings.push({ pivot: wPivot, sign });
      }
    }

    const rig = {
      group, bodyPivot, body: bodyPivot, head, mouth, wings,
      wingbeat(t, speed = 24, amp = 0.25) {
        wings.forEach(w => {
          w.pivot.rotation.z = Math.sin(t * speed) * amp * (-w.sign);
        });
      },
      setMouth(rms) {
        mouth.scale.y = 1.0 + (rms || 0) * 2.5;
      },
    };
    rig.flap = rig.wingbeat;
    return rig;
  }

  // ---------------------------------------------------------------------------------------------
  // Mascot (generic non-human sidekick)
  // ---------------------------------------------------------------------------------------------
  const MASCOT_SPEC = {
    body: '#f2a541', belly: '#fff1d6', eyeWhite: '#ffffff', pupil: '#2a1d14', mouthColor: '#5a2a1a',
    cheeks: null, size: 1, shape: 'round', ears: null, wings: null, wingColor: null, tail: null,
    beak: null, float: false, antenna: false,
  };
  /**
   * Round mascot. Contract: { group, body (=bodyPivot), head, mouth, eyes, setMouth, setExpression, look, blink, flap }.
   * float:true hovers with the body centre at local y=1.0 (like the dragonfly); otherwise it stands on y=0.
   * shape: 'round' | 'tall' | 'blob'. ears: null|'cat'|'bear'|'bunny'. wings: null|'bird'|'bug'. tail: null|'round'|'long'.
   */
  function createMascot(THREE, specIn = {}) {
    const spec = Object.assign({}, MASCOT_SPEC, specIn);
    const s = spec.size;
    const cache = {};
    const mat = (c, rough = 0.6, metal = 0.02) => {
      const k = JSON.stringify([c, rough, metal]);
      return cache[k] || (cache[k] = stdMat(THREE, c, rough, metal));
    };
    const bodyM = mat(spec.body);
    const sph = (parent, r, sx, sy, sz, m, x, y, z) => {
      const o = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m);
      o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
      parent.add(o); return o;
    };
    const R = 0.24 * s;
    const [ax, ay, az] = { round: [1, 0.95, 0.92], tall: [0.85, 1.25, 0.82], blob: [1.15, 0.78, 1.0] }[spec.shape] || [1, 0.95, 0.92];
    const halfH = R * ay;

    const group = new THREE.Group();
    const bodyPivot = new THREE.Group();
    bodyPivot.position.set(0, spec.float ? 1.0 : halfH + (spec.float ? 0 : 0.035 * s), 0);
    group.add(bodyPivot);
    sph(bodyPivot, R, ax, ay, az, bodyM, 0, 0, 0);
    if (spec.belly) sph(bodyPivot, R * 0.62, ax, ay * 0.9, 0.5, mat(spec.belly), 0, -halfH * 0.28, R * az * 0.62);

    const head = new THREE.Group();      // face lives here; turn it to look around
    bodyPivot.add(head);
    const fz = R * az;                   // front surface
    const eyeY = halfH * 0.22, eyeX = R * ax * 0.36;
    const eyes = [], pupils = [];
    for (const sx of [-1, 1]) {
      const e = sph(head, 0.06 * s, 0.85, 1.1, 0.5, mat(spec.eyeWhite, 0.3), sx * eyeX, eyeY, fz * 0.93);
      eyes.push(e);
      const p = sph(head, 0.033 * s, 1, 1.15, 0.5, mat(spec.pupil, 0.3), sx * eyeX, eyeY - 0.004 * s, fz * 0.93 + 0.028 * s);
      p.castShadow = false;
      pupils.push(p);
    }
    const pupilBase = pupils.map(p => p.position.clone());
    let mouth;
    if (spec.beak) {
      mouth = new THREE.Mesh(new THREE.ConeGeometry(0.045 * s, 0.09 * s, 12), mat(spec.beak));
      mouth.rotation.x = Math.PI / 2; mouth.position.set(0, -halfH * 0.05, fz + 0.03 * s);
      head.add(mouth);
    } else {
      mouth = new THREE.Mesh(new THREE.BoxGeometry(0.07 * s, 0.018 * s, 0.02 * s), mat(spec.mouthColor));
      mouth.position.set(0, -halfH * 0.16, fz * 0.97);
      head.add(mouth);
    }
    if (spec.cheeks) for (const sx of [-1, 1]) {
      sph(head, 0.03 * s, 1.2, 0.7, 0.3, mat(spec.cheeks), sx * eyeX * 1.45, -halfH * 0.08, fz * 0.86).castShadow = false;
    }

    const topY = halfH;
    if (spec.ears === 'cat') {
      for (const sx of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.ConeGeometry(0.065 * s, 0.13 * s, 4), bodyM);
        e.position.set(sx * R * 0.55, topY * 0.92, 0); e.rotation.set(0, Math.PI / 4, -sx * 0.3); e.castShadow = true;
        head.add(e);
      }
    } else if (spec.ears === 'bear') {
      for (const sx of [-1, 1]) sph(head, 0.065 * s, 1, 1, 0.7, bodyM, sx * R * 0.62, topY * 0.85, 0);
    } else if (spec.ears === 'bunny') {
      for (const sx of [-1, 1]) {
        const e = sph(head, 0.05 * s, 0.8, 3.0, 0.5, bodyM, sx * R * 0.35, topY + 0.1 * s, -0.02 * s);
        e.rotation.z = -sx * 0.15;
      }
    }
    if (spec.antenna) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * s, 0.008 * s, 0.12 * s, 8), mat(spec.pupil));
      st.position.set(0, topY + 0.05 * s, 0); head.add(st);
      sph(head, 0.025 * s, 1, 1, 1, mat(spec.cheeks || '#ff6b5a'), 0, topY + 0.12 * s, 0);
    }

    const wings = [];
    if (spec.wings) {
      const wm = mat(spec.wingColor || spec.body, 0.5);
      for (const sign of [-1, 1]) {
        const pv = new THREE.Group();
        if (spec.wings === 'bug') {
          pv.position.set(sign * R * 0.3, halfH * 0.5, -R * az * 0.7);
          const w = sph(pv, 0.16 * s, 1, 0.55, 0.12, wm, sign * 0.13 * s, 0.05 * s, 0);
          w.rotation.z = sign * 0.5;
        } else {
          pv.position.set(sign * R * ax * 0.92, 0, -0.02 * s);
          sph(pv, 0.11 * s, 0.35, 0.8, 0.9, wm, sign * 0.03 * s, -0.04 * s, 0);
        }
        bodyPivot.add(pv);
        wings.push({ pivot: pv, sign });
      }
    }
    if (spec.tail === 'round') sph(bodyPivot, 0.06 * s, 1, 1, 1, mat(spec.belly || spec.body), 0, -halfH * 0.4, -R * az * 0.98);
    else if (spec.tail === 'long') {
      const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * s, 0.025 * s, 0.32 * s, 10), bodyM);
      tl.position.set(0, -halfH * 0.35, -R * az - 0.08 * s); tl.rotation.x = -1.0; tl.castShadow = true;
      bodyPivot.add(tl);
    }
    if (!spec.float) {
      for (const sx of [-1, 1]) sph(group, 0.055 * s, 1, 0.55, 1.3, bodyM, sx * R * 0.42, 0.03 * s, 0.03 * s);
    }

    const rig = {
      group, body: bodyPivot, bodyPivot, head, mouth, eyes, wings, spec,
      height: (spec.float ? 1.0 + halfH : halfH * 2 + 0.035 * s) + (spec.ears === 'bunny' ? 0.25 * s : spec.ears ? 0.08 * s : 0),
      setMouth(rms) {
        if (spec.beak) mouth.scale.set(1, 1, 1 + (rms || 0) * 0.6);
        else mouth.scale.y = 1.0 + (rms || 0) * 3.0;
      },
      setExpression(mode, intensity = 1) {
        const k = intensity;
        eyes.forEach((e, i) => {
          e.scale.set(0.85, 1.1, 0.5);
          if (mode === 'deadpan') e.scale.y = 1.1 * (1 - 0.45 * k);
          if (mode === 'surprised') e.scale.multiplyScalar(1 + 0.25 * k);
          if (mode === 'confused') e.scale.y = 1.1 * (i === 0 ? 1 - 0.3 * k : 1 + 0.1 * k);
          pupils[i].scale.set(1, mode === 'deadpan' ? 1.15 * (1 - 0.45 * k) : 1.15, 0.5);
        });
        if (!spec.beak) mouth.scale.x = mode === 'happy' ? 1 + 0.5 * k : mode === 'surprised' ? 0.6 : 1;
      },
      /** Move the pupils: x -1..1 (screen-left..right when facing camera), y -1..1 (down..up). */
      look(x = 0, y = 0) {
        pupils.forEach((p, i) => p.position.set(pupilBase[i].x + x * 0.018 * s, pupilBase[i].y + y * 0.02 * s, pupilBase[i].z));
      },
      blink(t, period = 3.1, dur = 0.12, offset = 0) {
        if (((t + offset) % period) > period - dur) { eyes.forEach(e => { e.scale.y *= 0.12; }); pupils.forEach(p => { p.scale.y *= 0.12; }); }
      },
      flap(t, speed = 24, amp = 0.35) {
        wings.forEach(w => { w.pivot.rotation.z = Math.sin(t * speed) * amp * w.sign; });
      },
    };
    rig.wingbeat = rig.flap;
    rig.setExpression('neutral');
    return rig;
  }

  // ---------------------------------------------------------------------------------------------
  // Registry
  // ---------------------------------------------------------------------------------------------
  const registry = {};
  const specs = {};
  /** factory(THREE, overrides) -> rig. kind: 'humanoid' | 'mascot' | other. */
  function register(name, factory, kind = 'custom') {
    registry[name] = { factory, kind };
  }
  /** Register a spec-only character: kind 'humanoid' -> createHumanoid, 'mascot' -> createMascot. */
  function define(name, spec) {
    const kind = spec.kind || 'humanoid';
    specs[name] = spec;
    const make = kind === 'mascot' ? createMascot : createHumanoid;
    register(name, (THREE, o) => make(THREE, Object.assign({}, spec, o || {})), kind);
  }
  function create(name, THREE, overrides) {
    const r = registry[name];
    if (!r) throw new Error(`AI3DChars: unknown character "${name}". Known: ${list().join(', ')}`);
    return r.factory(THREE, overrides || {});
  }
  function list(kind) {
    return Object.keys(registry).filter(n => !kind || registry[n].kind === kind);
  }
  function kindOf(name) { return registry[name] ? registry[name].kind : null; }

  specs.boy = BOY_SPEC;
  register('boy', (THREE, o) => (o && Object.keys(o).length ? createHumanoid(THREE, Object.assign({}, BOY_SPEC, o)) : createBoy(THREE)), 'humanoid');
  register('dragonfly', THREE => createDragonfly(THREE), 'mascot');

  return {
    createBoy, createDragonfly, createHumanoid, createMascot, stdMat, toColor,
    register, define, create, list, kindOf, specs, BOY_SPEC, HAIR_STYLES, HATS,
  };
})();
