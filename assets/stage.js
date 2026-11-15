// Scene boilerplate for ai-3d-video: renderer, lights, timing.json, lip-sync tracks,
// and the batch-render protocol expected by scripts/render_batch.py.
// A scene.html only has to call AI3DStage.start({ setup }) and return an update(t, mouth, frame) function.
window.AI3DStage = (function () {
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const ease = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
  const util = {
    clamp01, ease,
    lerp: (a, b, k) => a + (b - a) * k,
    /** 0 -> 1 smoothly between times a and b. */
    seg: (t, a, b) => ease((t - a) / (b - a)),
    /** 0 -> 1 -> 0 bump starting at t0 lasting dur. */
    pulse: (t, t0, dur) => { const u = (t - t0) / dur; return u < 0 || u > 1 ? 0 : Math.sin(u * Math.PI); },
    /** Put a rig (or any object with .group, or an Object3D) on a layout slot { pos, rotY, scale? }. */
    place(rig, slot) {
      const o = rig.group || rig;
      o.position.set(slot.pos[0], slot.pos[1], slot.pos[2]);
      o.rotation.y = slot.rotY || 0;
      if (slot.scale) o.scale.setScalar(slot.scale);
      return o;
    },
    /** Aim the camera at shot a ({ pos, target, fov? }), blended toward shot b by k (0..1). */
    shot(camera, a, b, k = 0) {
      const mix = (p, q) => (b ? p.map((v, i) => v + (q[i] - v) * k) : p);
      const pos = mix(a.pos, b && b.pos), tgt = mix(a.target, b && b.target);
      camera.position.set(pos[0], pos[1], pos[2]);
      const fa = a.fov || camera.fov, fov = b && b.fov ? fa + (b.fov - fa) * k : fa;
      if (fov !== camera.fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
      camera.lookAt(tgt[0], tgt[1], tgt[2]);
    },
    /** A close-up shot on a rig, sized by its height: { pos, target } for shot(). side: -1..1 swings the camera. */
    closeUpOn(rig, dist = 1.5, side = 0) {
      const o = rig.group || rig, h = rig.height || 1.49;
      const ty = o.position.y + h * 0.78;
      const target = [o.position.x, ty, o.position.z];
      return { pos: [o.position.x + side * dist * 0.5, ty + 0.18, o.position.z + dist], target };
    },
  };

  // Tested framings. Positions are world units (boy is ~1.49 tall).
  const layouts = {
    // 9:16, boy on the left, dragonfly hovering upper-right, desk behind; bottom ~15% free for captions.
    duo916: {
      camera: { pos: [0.12, 1.3, 4.4], target: [0.1, 0.98, 0], fov: 38 },
      closeUpBoy: { pos: [-0.2, 1.3, 2.9], target: [-0.27, 1.08, 0.1] },
      boy: { pos: [-0.3, 0, 0], rotY: 0.22 },
      dragonfly: { pos: [0.37, 0.95, 0.15], scale: 0.7, rotY: -0.45, pitch: 0.42 },
      desk: { pos: [0.74, 0, -0.8], rotY: -0.25 },
    },
    // ---- generic layouts: a/b/c = characters (feet at y=0), prop = where a set's main furniture reads well.
    // All keep heads inside the frame for heights up to 1.25 (1.86 world units) and leave the bottom ~15% as floor.
    solo916: {
      camera: { pos: [0, 1.2, 4.3], target: [0, 1.0, 0], fov: 38 },
      closeUpA: { pos: [0, 1.45, 2.2], target: [0, 1.25, 0] },
      a: { pos: [0, 0, 0], rotY: 0 },
      prop: { pos: [0.85, 0, -0.95], rotY: -0.25 },
    },
    duoHumans916: {
      camera: { pos: [0, 1.25, 5.2], target: [0, 1.0, 0], fov: 38 },
      closeUpA: { pos: [-0.3, 1.45, 2.4], target: [-0.45, 1.2, 0] },
      closeUpB: { pos: [0.3, 1.45, 2.4], target: [0.45, 1.2, 0] },
      a: { pos: [-0.45, 0, 0], rotY: 0.3 },
      b: { pos: [0.45, 0, 0], rotY: -0.3 },
      prop: { pos: [0.85, 0, -1.2], rotY: -0.25 },
    },
    trio916: {
      camera: { pos: [0, 1.3, 6.2], target: [0, 1.0, 0], fov: 38 },
      closeUpA: { pos: [-0.5, 1.45, 2.6], target: [-0.7, 1.2, 0.15] },
      closeUpB: { pos: [0, 1.45, 2.3], target: [0, 1.2, -0.25] },
      closeUpC: { pos: [0.5, 1.45, 2.6], target: [0.7, 1.2, 0.15] },
      a: { pos: [-0.7, 0, 0.15], rotY: 0.35 },
      b: { pos: [0, 0, -0.25], rotY: 0 },
      c: { pos: [0.7, 0, 0.15], rotY: -0.35 },
      prop: { pos: [1.1, 0, -1.4], rotY: -0.25 },
    },
    duo169: {
      camera: { pos: [0, 1.2, 4.0], target: [0, 0.95, 0], fov: 38 },
      closeUpA: { pos: [-0.35, 1.4, 2.3], target: [-0.6, 1.2, 0] },
      closeUpB: { pos: [0.35, 1.4, 2.3], target: [0.6, 1.2, 0] },
      a: { pos: [-0.6, 0, 0], rotY: 0.3 },
      b: { pos: [0.6, 0, 0], rotY: -0.3 },
      prop: { pos: [1.7, 0, -1.0], rotY: -0.3 },
    },
  };
  layouts.duo916.a = layouts.duo916.boy;          // aliases so code can treat every layout alike
  layouts.duo916.mascot = layouts.duo916.dragonfly;
  layouts.duo916.closeUpA = layouts.duo916.closeUpBoy;

  function addDefaultLights(THREE, scene) {
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c2a0, 1.5));
    const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
    sun.position.set(-2.2, 5, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 4, bottom: -1, near: 0.5, far: 14 });
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    return sun;
  }

  /**
   * opts: { aspect: '9:16'|'16:9', fov, background, lights: true, setup(ctx) -> update(t, mouth, frame) }
   * ctx:  { THREE, scene, camera, renderer, timing, fps, frames, util, layouts }
   * mouth: { <role>: 0..1 } lip-sync level for this frame, from timing.json mouth_tracks.
   */
  async function start(opts) {
    const THREE = window.THREE;
    const q = new URLSearchParams(location.search);
    const batch = q.has('batch');
    const step = Math.max(1, parseInt(q.get('step') || '1', 10));
    const scale = parseFloat(q.get('scale') || '1');
    const [W, H] = opts.aspect === '16:9' ? [1280, 720] : [720, 1280];

    const timing = await (await fetch('timing.json')).json();
    const fps = timing.fps || 15;
    const frames = Math.round(timing.total_sec * fps);
    const tracks = timing.mouth_tracks || {};

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(Math.round(W * scale), Math.round(H * scale));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.style.cssText = 'margin:0;background:#000;overflow:hidden';
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(opts.background !== undefined ? opts.background : 0xf3ead9);
    const camera = new THREE.PerspectiveCamera(opts.fov || 38, W / H, 0.1, 50);
    if (opts.lights !== false) addDefaultLights(THREE, scene);

    const update = await opts.setup({ THREE, scene, camera, renderer, timing, fps, frames, util, layouts });

    window.setFrame = function (fi) {
      const mouth = {};
      for (const k in tracks) mouth[k] = tracks[k][fi] || 0;
      update(fi / fps, mouth, fi);
      renderer.render(scene, camera);
    };

    if (batch) {
      // Protocol: POST /frame/<index> with a PNG data URL per frame, then POST /done.
      for (let i = 0; i < frames; i += step) {
        window.setFrame(i);
        await fetch('/frame/' + i, { method: 'POST', body: renderer.domElement.toDataURL('image/png') });
      }
      await fetch('/done', { method: 'POST', body: '' });
    } else {
      const t0 = performance.now();
      (function loop() {
        window.setFrame(Math.floor(((performance.now() - t0) / 1000 * fps) % frames));
        requestAnimationFrame(loop);
      })();
    }
  }

  return { start, util, layouts, addDefaultLights };
})();
