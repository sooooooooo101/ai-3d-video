// Reusable 3D Stage & Props Library (Three.js)
window.AI3DProps = (function () {
  function stdMat(THREE, rgb, rough = 0.72, metal = 0.05) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(rgb[0], rgb[1], rgb[2]),
      roughness: rough,
      metalness: metal,
    });
  }

  /**
   * School event hall under preparation (floor, walls, windows, blank banner, reception desk)
   */
  function createSchoolHall(THREE, scene) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), stdMat(THREE, [0.78, 0.62, 0.44], 0.8, 0));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.2), stdMat(THREE, [0.94, 0.92, 0.86], 0.9));
    backWall.position.set(0, 3, -3.5);
    backWall.receiveShadow = true;
    scene.add(backWall);

    [-2.4, 0, 2.4].forEach(wx => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.08), stdMat(THREE, [0.55, 0.45, 0.35], 0.7));
      frame.position.set(wx, 2.7, -3.38);
      scene.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.1), stdMat(THREE, [0.75, 0.90, 0.99], 0.2));
      glass.position.set(wx, 2.7, -3.37);
      scene.add(glass);
    });

    const banner = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 0.05), stdMat(THREE, [0.98, 0.98, 0.96], 0.6));
    banner.position.set(0, 3.9, -3.36);
    scene.add(banner);
    const border = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.63, 0.03), stdMat(THREE, [0.22, 0.45, 0.75], 0.6));
    border.position.set(0, 3.9, -3.37);
    scene.add(border);

    const deskGroup = new THREE.Group();
    deskGroup.position.set(1.15, 0, -0.45);
    deskGroup.rotation.y = -0.35;
    scene.add(deskGroup);
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.68), stdMat(THREE, [0.96, 0.96, 0.95], 0.5));
    deskTop.position.y = 0.74;
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    deskGroup.add(deskTop);
    const deskCloth = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.70, 0.64), stdMat(THREE, [0.25, 0.48, 0.78], 0.85));
    deskCloth.position.y = 0.35;
    deskCloth.castShadow = true;
    deskCloth.receiveShadow = true;
    deskGroup.add(deskCloth);

    return { deskGroup };
  }

  /**
   * Bottom-up Stacker: stacks props strictly on top of each other without floating or clipping.
   */
  function createStacker(anchorGroup) {
    let currentY = 0;
    const items = [];
    return {
      add(mesh, height) {
        const restY = currentY + height / 2;
        currentY += height;
        anchorGroup.add(mesh);
        items.push({ mesh, restY, height });
        return restY;
      },
      items,
      getTotalHeight() { return currentY; },
    };
  }

  function createCardboard(THREE, w = 0.40, h = 0.20, d = 0.26) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(THREE, [0.74, 0.54, 0.34], 0.85));
    box.castShadow = true; box.receiveShadow = true;
    g.add(box);
    const tape = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.035, 0.05), stdMat(THREE, [0.88, 0.80, 0.60], 0.6));
    tape.position.y = h / 2 - 0.015;
    g.add(tape);
    return { mesh: g, height: h };
  }

  function createCameraProp(THREE, w = 0.18, h = 0.11, d = 0.12) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(THREE, [0.15, 0.16, 0.18], 0.4, 0.3));
    body.castShadow = true;
    g.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.06, 16), stdMat(THREE, [0.35, 0.38, 0.42], 0.3, 0.6));
    lens.rotation.x = Math.PI / 2;
    lens.position.z = d / 2 + 0.01;
    g.add(lens);
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.018, 12), stdMat(THREE, [0.8, 0.2, 0.2], 0.4));
    // On the front face (not the top) so another prop can rest flat on the camera.
    btn.rotation.x = Math.PI / 2;
    btn.position.set(w * 0.32, h * 0.22, d / 2 + 0.004);
    g.add(btn);
    return { mesh: g, height: h };
  }

  function createClosedLaptop(THREE, w = 0.34, h = 0.036, d = 0.23) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(THREE, [0.72, 0.75, 0.80], 0.35, 0.5));
    body.castShadow = true;
    g.add(body);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.002, 0.006, d + 0.002), stdMat(THREE, [0.2, 0.2, 0.22], 0.5));
    g.add(seam);
    return { mesh: g, height: h };
  }

  /**
   * Blank Tasuki (Sash) attached to Boy's torso: front strip + back strip + shoulder connector,
   * forming one loop from the boy's left shoulder to his right hip.
   * Returns the group, plus group.setPutOn(p): p=0 held open above the head, p=1 resting on the body.
   * The path is tuned so the loop clears createBoy's head and a createStacker pile in his arms.
   */
  function createTasuki(THREE, boyTorso) {
    const g = new THREE.Group();
    const mat = stdMat(THREE, [0.97, 0.97, 0.96], 0.55);
    const ZF = 0.132, ZB = -0.126;
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.52, 0.016), mat);
    f.position.set(0, 0.24, ZF); f.rotation.z = -0.68; g.add(f);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.52, 0.016), mat);
    b.position.set(0, 0.24, ZB); b.rotation.z = -0.68; g.add(b);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.27), mat);
    s.position.set(0.15, 0.47, 0); g.add(s);
    g.visible = false;
    boyTorso.add(g);

    const sm = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
    const mix = (a, c, k) => a + (c - a) * k;
    /** Grip point (torso-local) where a helper hand holds the sash; updated by setPutOn. */
    g.grip = new THREE.Vector3(0.18, 0.48, 0);
    g.setPutOn = function (p) {
      p = Math.max(0, Math.min(1, p));
      const d = mix(1.05, 0, sm(p / 0.7));          // height above rest
      const setX = sm((p - 0.7) / 0.15), setZ = sm((p - 0.82) / 0.18);
      const sx = mix(1.7, 1.0, setX);                // loop held wide to pass the head
      // Front strip rides in the gap between face (z<=0.18) and cargo (z>=0.21).
      const zOpen = d >= 0.45 ? 0.22 : d <= 0.34 ? 0.196 : mix(0.196, 0.22, (d - 0.34) / 0.11);
      const zf = mix(zOpen, ZF, setZ), zb = mix(-0.225, ZB, setZ);
      g.position.y = d; g.scale.x = sx;
      f.position.z = zf; b.position.z = zb;
      s.position.z = (zf + zb) / 2; s.scale.z = (zf - zb + 0.016) / 0.27;
      g.grip.set(0.15 * sx + 0.03, 0.48 + d, 0);
    };
    g.setPutOn(1);
    return g;
  }

  /**
   * Anonymous off-screen helper arm (sleeve + hand). The group's origin is the grip point;
   * the arm extends along local +Y, so rotate the group to choose where it reaches in from.
   */
  function createHelperArm(THREE, parent, length = 1.6, sleeveRgb = [0.20, 0.36, 0.62], skinRgb = [0.76, 0.48, 0.30]) {
    const g = new THREE.Group();
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, length, 0.11), stdMat(THREE, sleeveRgb));
    sleeve.position.y = 0.14 + length / 2; sleeve.castShadow = true;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), stdMat(THREE, skinRgb));
    hand.position.y = 0.07; hand.castShadow = true;
    g.add(sleeve, hand);
    g.visible = false;
    parent.add(g);
    return g;
  }

  /**
   * Hand a stacked prop in from off-screen without clipping the boy's arms:
   * slides in above the forearms, then lowers straight down onto the pile.
   * item = { mesh, restY, height } (a stacker item), u = 0..1, fromX = start X in anchor space.
   * Returns the top-centre Y of the prop (anchor space) for placing a helper hand.
   */
  function handOff(item, u, fromX = -1.5, lift = 0.3) {
    const sm = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
    u = Math.max(0, Math.min(1, u));
    const slide = sm(u / 0.68), drop = sm((u - 0.62) / 0.38);
    item.mesh.position.set(fromX * (1 - slide), item.restY + lift * (1 - drop), 0);
    item.mesh.rotation.z = (1 - slide) * 0.12 * Math.sign(-fromX);
    return item.mesh.position.y + item.height / 2;
  }

  return {
    createSchoolHall,
    createStacker,
    createCardboard,
    createCameraProp,
    createClosedLaptop,
    createTasuki,
    createHelperArm,
    handOff,
  };
})();
