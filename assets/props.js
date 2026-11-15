// Reusable 3D Stage & Props Library (Three.js)
// Colours: [r,g,b] linear 0..1 or CSS '#rrggbb' (sRGB). Every prop returns { mesh, height, ... } with its
// origin at the bottom centre, so it can stand on the floor (y=0), sit on a table (y=table.height) or go in a stacker.
window.AI3DProps = (function () {
  function stdMat(THREE, rgb, rough = 0.72, metal = 0.05) {
    return new THREE.MeshStandardMaterial({
      color: Array.isArray(rgb) ? new THREE.Color(rgb[0], rgb[1], rgb[2]) : new THREE.Color(rgb),
      roughness: rough,
      metalness: metal,
    });
  }
  // Box with its centre at (x, y, z); casts and receives shadows.
  function bx(THREE, parent, w, h, d, m, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  function cyl(THREE, parent, rt, rb, h, m, x = 0, y = 0, z = 0, seg = 20) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  const opt = (o, d) => Object.assign({}, d, o || {});

  // ---------------------------------------------------------------------------------------------
  // Rooms, outdoor, sets
  // ---------------------------------------------------------------------------------------------
  /**
   * Generic room: floor, back wall (z = -depth/2), windows, optional blank banner, optional side walls.
   * Adds meshes straight to parent. Returns { floor, wall, windows[], banner, wallZ }.
   */
  function createRoom(THREE, parent, o) {
    o = opt(o, {
      floor: [0.78, 0.62, 0.44], wall: [0.94, 0.92, 0.86], width: 14, depth: 7, wallHeight: 6, floorSize: 16,
      windows: [-2.4, 0, 2.4], windowY: 2.7, windowFrame: [0.55, 0.45, 0.35], glass: [0.75, 0.90, 0.99],
      banner: true, bannerColor: [0.98, 0.98, 0.96], bannerBorder: [0.22, 0.45, 0.75], bannerY: 3.9,
      sideWalls: false, baseboard: null,
    });
    const wallZ = -o.depth / 2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(o.floorSize, o.floorSize), stdMat(THREE, o.floor, 0.8, 0));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    parent.add(floor);

    const wall = new THREE.Mesh(new THREE.BoxGeometry(o.width, o.wallHeight, 0.2), stdMat(THREE, o.wall, 0.9));
    wall.position.set(0, o.wallHeight / 2, wallZ);
    wall.receiveShadow = true;
    parent.add(wall);

    const windows = [];
    (o.windows || []).forEach(wx => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.08), stdMat(THREE, o.windowFrame, 0.7));
      frame.position.set(wx, o.windowY, wallZ + 0.12);
      parent.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.1), stdMat(THREE, o.glass, 0.2));
      glass.position.set(wx, o.windowY, wallZ + 0.13);
      parent.add(glass);
      windows.push({ frame, glass });
    });

    let banner = null;
    if (o.banner) {
      banner = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 0.05), stdMat(THREE, o.bannerColor, 0.6));
      banner.position.set(0, o.bannerY, wallZ + 0.14);
      parent.add(banner);
      const border = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.63, 0.03), stdMat(THREE, o.bannerBorder, 0.6));
      border.position.set(0, o.bannerY, wallZ + 0.13);
      parent.add(border);
    }
    if (o.sideWalls) {
      for (const sx of [-1, 1]) {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(0.2, o.wallHeight, o.depth), stdMat(THREE, o.wall, 0.9));
        sw.position.set(sx * o.width / 2, o.wallHeight / 2, 0); sw.receiveShadow = true; parent.add(sw);
      }
    }
    if (o.baseboard) bx(THREE, parent, o.width, 0.12, 0.04, stdMat(THREE, o.baseboard, 0.6), 0, 0.06, wallZ + 0.12);
    return { floor, wall, windows, banner, wallZ };
  }

  /**
   * School event hall under preparation (floor, walls, windows, blank banner, reception desk)
   */
  function createSchoolHall(THREE, scene) {
    createRoom(THREE, scene);

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
   * Outdoor ground with an optional row of distant buildings. Returns { ground, buildings, sky } where sky is a
   * THREE.Color for scene.background (applied automatically when parent is the scene).
   */
  function createOutdoor(THREE, parent, o) {
    o = opt(o, {
      ground: [0.45, 0.66, 0.38], size: 60, sky: 0xbfe3f5, buildings: true,
      buildingColor: [0.93, 0.90, 0.83], windowColor: [0.72, 0.86, 0.95], buildingZ: -9.5,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(o.size, o.size), stdMat(THREE, o.ground, 0.95));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; parent.add(ground);
    let buildings = null;
    if (o.buildings) {
      buildings = bx(THREE, parent, 16, 3.4, 1, stdMat(THREE, o.buildingColor, 0.8), 0, 1.7, o.buildingZ);
      for (let i = -3; i <= 3; i++) bx(THREE, parent, 1.3, 1.1, 0.1, stdMat(THREE, o.windowColor, 0.3), i * 2.1, 2.0, o.buildingZ + 0.52);
    }
    const sky = typeof o.sky === 'number' || typeof o.sky === 'string' ? new THREE.Color(o.sky)
      : new THREE.Color(o.sky[0], o.sky[1], o.sky[2]);
    if (parent.isScene) parent.background = sky;
    return { ground, buildings, sky };
  }

  /**
   * Ready-made sets. Returns { root, name, main, ... } where main is the set's key piece of furniture
   * (desk / counter / table / bench) placed back-right, behind where layouts put the characters.
   * names: schoolHall, office, kitchen, livingRoom, shop, park.
   */
  function createSet(THREE, parent, name, o) {
    const root = new THREE.Group(); parent.add(root);
    const m = (c, r) => stdMat(THREE, c, r);
    const at = (p, x, z, ry = 0, y = 0) => { p.mesh.position.set(x, y, z); p.mesh.rotation.y = ry; root.add(p.mesh); return p; };
    const res = { root, name };
    if (name === 'schoolHall') {
      const h = createSchoolHall(THREE, root);
      Object.assign(res, { deskGroup: h.deskGroup, main: h.deskGroup, mainTopY: 0.775 });
    } else if (name === 'office') {
      createRoom(THREE, root, { floor: '#8f9aa1', wall: '#e9edf0', windowFrame: '#c9d0d6', glass: '#cfe6f5', banner: false, baseboard: '#7d868c' });
      const wb = at(createWhiteboard(THREE), -1.4, -3.3);
      const desk = at(createTable(THREE, { w: 1.3, d: 0.7, top: '#e6e1d8', legs: '#555b60' }), 0.85, -0.95, -0.25);
      const mon = createMonitor(THREE); mon.mesh.position.set(0, desk.height, -0.15); desk.mesh.add(mon.mesh);
      const mug = createMug(THREE, { color: '#c0392b' }); mug.mesh.position.set(0.42, desk.height, 0.12); desk.mesh.add(mug.mesh);
      const papers = createPaper(THREE); papers.mesh.position.set(-0.38, desk.height, 0.1); papers.mesh.rotation.y = 0.3; desk.mesh.add(papers.mesh);
      const chair = at(createChair(THREE, { color: '#3d4a57' }), 0.95, -1.65, -0.25);
      const desk2 = at(createTable(THREE, { w: 1.3, d: 0.7, top: '#e6e1d8', legs: '#555b60' }), -1.7, -1.9, 0.15);
      const mon2 = createMonitor(THREE); mon2.mesh.position.set(0, desk2.height, -0.15); desk2.mesh.add(mon2.mesh);
      const shelf = at(createShelf(THREE, { color: '#b7a58c' }), 2.5, -3.15);
      const plant = at(createPlant(THREE), 1.6, -3.0);
      Object.assign(res, { desk, main: desk.mesh, mainTopY: desk.height, monitor: mon, chair, desk2, whiteboard: wb, shelf, plant });
    } else if (name === 'kitchen') {
      createRoom(THREE, root, { floor: '#d6cfc2', wall: '#f3eee4', windows: [1.9], windowY: 2.0, banner: false, baseboard: '#bfb6a6' });
      // tiled splash-back
      bx(THREE, root, 4.4, 0.6, 0.02, m('#ffffff', 0.4), -0.6, 1.25, -3.36);
      const back = at(createCounter(THREE, { w: 3.2, d: 0.62, body: '#8fb3a6', top: '#e8e4dc' }), -0.9, -3.05);
      // stove + sink on the back counter
      bx(THREE, back.mesh, 0.6, 0.02, 0.5, m('#2b2b2b', 0.4), -0.6, back.height + 0.01, 0);
      [[-0.75, -0.1], [-0.45, -0.1], [-0.75, 0.12], [-0.45, 0.12]].forEach(([x, z]) => cyl(THREE, back.mesh, 0.07, 0.07, 0.012, m('#555555', 0.5), x, back.height + 0.026, z));
      bx(THREE, back.mesh, 0.55, 0.012, 0.4, m('#b8c0c6', 0.25), 0.6, back.height + 0.004, 0);
      const fridge = at(createBox(THREE, 0.75, 1.85, 0.7, '#f4f4f2'), -3.0, -3.0);
      bx(THREE, fridge.mesh, 0.03, 0.5, 0.03, m('#9aa0a6', 0.3), 0.3, 1.25, 0.36);
      const shelf = createShelf(THREE, { w: 1.6, h: 0.6, d: 0.28, shelves: 2, color: '#c9a77c', fill: false });
      at(shelf, -0.9, -3.25, 0, 1.75);
      for (let i = 0; i < 4; i++) { const p = createPlate(THREE); p.mesh.position.set(-0.55 + i * 0.36, shelf.shelfY[0], 0); p.mesh.rotation.x = 1.25; shelf.mesh.add(p.mesh); }
      const island = at(createCounter(THREE, { w: 1.3, d: 0.7, body: '#7a5b45', top: '#efe9df' }), 0.8, -0.95, -0.2);
      const board = createBox(THREE, 0.4, 0.025, 0.28, '#d8b07a'); board.mesh.position.set(-0.25, island.height, 0); island.mesh.add(board.mesh);
      const pl = createPlate(THREE); pl.mesh.position.set(0.3, island.height, 0.05); island.mesh.add(pl.mesh);
      Object.assign(res, { counter: island, main: island.mesh, mainTopY: island.height, backCounter: back, fridge, shelf });
    } else if (name === 'livingRoom') {
      createRoom(THREE, root, { floor: '#b9895b', wall: '#efe2cf', windows: [-2.3, 2.3], windowFrame: '#f7f3ec', banner: false, baseboard: '#8a6a4c' });
      bx(THREE, root, 2.6, 0.01, 1.8, m('#c96f53', 0.95), 0.2, 0.005, -1.4).castShadow = false;   // rug
      const sofa = at(createSofa(THREE, { color: '#4f7a8c' }), 0, -2.75);
      const table = at(createTable(THREE, { w: 1.0, d: 0.55, h: 0.4, top: '#6b4a33', legs: '#4a3322' }), 0.8, -1.0, -0.15);
      const mug = createMug(THREE, { color: '#f0f0ea' }); mug.mesh.position.set(0.25, table.height, 0); table.mesh.add(mug.mesh);
      const book = createBook(THREE, { color: '#2f6f9f' }); book.mesh.position.set(-0.2, table.height, 0.05); book.mesh.rotation.y = 0.4; table.mesh.add(book.mesh);
      const tvStand = at(createBox(THREE, 1.2, 0.45, 0.4, '#5a4636'), -2.6, -2.9, 0.5);
      const tv = createMonitor(THREE, { w: 1.1, h: 0.62, stand: 0.08 }); tv.mesh.position.set(0, 0.45, 0); tvStand.mesh.add(tv.mesh);
      const plant = at(createPlant(THREE, { size: 1.3 }), 2.4, -2.9);
      const lamp = new THREE.Group(); root.add(lamp); lamp.position.set(1.55, 0, -2.85);
      cyl(THREE, lamp, 0.15, 0.15, 0.03, m('#333333'), 0, 0.015, 0); cyl(THREE, lamp, 0.015, 0.015, 1.4, m('#333333'), 0, 0.72, 0);
      cyl(THREE, lamp, 0.12, 0.22, 0.28, m('#f5ead2', 0.9), 0, 1.5, 0);
      Object.assign(res, { table, main: table.mesh, mainTopY: table.height, sofa, tv, plant, lamp });
    } else if (name === 'shop') {
      createRoom(THREE, root, { floor: '#cfc5b5', wall: '#f5e6d0', windows: [], banner: true, bannerBorder: '#c0392b', bannerY: 2.9, baseboard: '#a08a6e' });
      const shelves = [-2.3, -1.1, 2.2].map(x => at(createShelf(THREE, { w: 1.1, h: 1.9, d: 0.4, color: '#e4d6bf' }), x, -3.15));
      const counter = at(createCounter(THREE, { w: 1.4, d: 0.6, body: '#a0522d', top: '#f2ece2' }), 0.8, -0.9, -0.25);
      const reg = new THREE.Group(); reg.position.set(0.35, counter.height, 0); counter.mesh.add(reg);
      bx(THREE, reg, 0.3, 0.1, 0.26, m('#3a3a3a', 0.4), 0, 0.05, 0);
      const scr = bx(THREE, reg, 0.22, 0.14, 0.02, m('#20303e', 0.3), 0, 0.17, -0.06); scr.rotation.x = -0.35;
      const goods = createBox(THREE, 0.22, 0.16, 0.18, '#e9b44c'); goods.mesh.position.set(-0.3, counter.height, 0.02); counter.mesh.add(goods.mesh);
      Object.assign(res, { counter, main: counter.mesh, mainTopY: counter.height, register: reg, shelves });
    } else if (name === 'park') {
      const out = createOutdoor(THREE, root, { buildingColor: '#e2d8c8' });
      res.sky = out.sky;
      if (parent.isScene) parent.background = out.sky;
      bx(THREE, root, 1.6, 0.012, 30, m('#d8c9a8', 0.95), -0.2, 0.006, -6).castShadow = false;   // path
      const trees = [[-2.4, -3.2, 1.0], [2.7, -4.6, 1.2], [-4.2, -6.5, 1.1], [4.6, -2.6, 0.9]].map(([x, z, s]) => {
        const t = createTree(THREE, { scale: s }); return at(t, x, z);
      });
      const bench = at(createBench(THREE), 0.95, -1.1, -0.2);
      const sign = at(createSignboard(THREE), -1.35, -1.9, 0.25);
      const lamp = new THREE.Group(); root.add(lamp); lamp.position.set(1.9, 0, -2.4);
      cyl(THREE, lamp, 0.04, 0.05, 2.6, m('#3b4148', 0.5), 0, 1.3, 0); bx(THREE, lamp, 0.22, 0.22, 0.22, m('#fff6d8', 0.4), 0, 2.65, 0);
      Object.assign(res, { bench, main: bench.mesh, mainTopY: bench.seatY, trees, sign, lamp });
    } else {
      throw new Error(`AI3DProps.createSet: unknown set "${name}". Known: ${SETS.join(', ')}`);
    }
    return res;
  }
  const SETS = ['schoolHall', 'office', 'kitchen', 'livingRoom', 'shop', 'park'];

  // ---------------------------------------------------------------------------------------------
  // Generic props: all return { mesh, height } with the origin at the bottom centre.
  // ---------------------------------------------------------------------------------------------
  function createBox(THREE, w = 0.4, h = 0.3, d = 0.3, color = '#c9a27a') {
    const g = new THREE.Group();
    bx(THREE, g, w, h, d, stdMat(THREE, color, 0.8), 0, h / 2, 0);
    return { mesh: g, height: h };
  }
  /** Table / desk. height = top surface. */
  function createTable(THREE, o) {
    o = opt(o, { w: 1.2, d: 0.7, h: 0.74, top: '#d9c3a0', legs: '#6b5a48' });
    const g = new THREE.Group(), lm = stdMat(THREE, o.legs, 0.6);
    bx(THREE, g, o.w, 0.05, o.d, stdMat(THREE, o.top, 0.55), 0, o.h - 0.025, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(THREE, g, 0.05, o.h - 0.05, 0.05, lm, sx * (o.w / 2 - 0.06), (o.h - 0.05) / 2, sz * (o.d / 2 - 0.06));
    return { mesh: g, height: o.h };
  }
  /** Chair facing +Z. height = top of the backrest; seatY = seat surface. */
  function createChair(THREE, o) {
    o = opt(o, { color: '#7a5a3c', legs: '#4a4a4a', seatH: 0.45 });
    const g = new THREE.Group(), cm = stdMat(THREE, o.color, 0.7), lm = stdMat(THREE, o.legs, 0.5);
    bx(THREE, g, 0.44, 0.05, 0.42, cm, 0, o.seatH - 0.025, 0);
    bx(THREE, g, 0.44, 0.42, 0.05, cm, 0, o.seatH + 0.23, -0.19);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(THREE, g, 0.04, o.seatH - 0.05, 0.04, lm, sx * 0.19, (o.seatH - 0.05) / 2, sz * 0.18);
    return { mesh: g, height: o.seatH + 0.44, seatY: o.seatH };
  }
  /** Solid counter (shop / kitchen / reception). height = top surface. */
  function createCounter(THREE, o) {
    o = opt(o, { w: 1.6, d: 0.6, h: 0.95, body: '#9c6b45', top: '#efe9df' });
    const g = new THREE.Group();
    bx(THREE, g, o.w - 0.04, o.h - 0.04, o.d - 0.06, stdMat(THREE, o.body, 0.75), 0, (o.h - 0.04) / 2, 0);
    bx(THREE, g, o.w, 0.04, o.d, stdMat(THREE, o.top, 0.45), 0, o.h - 0.02, 0);
    return { mesh: g, height: o.h };
  }
  /** Open shelf against a wall (open side +Z). shelfY[] = top of each board. fill: put books/boxes on it. */
  function createShelf(THREE, o) {
    o = opt(o, { w: 1.0, h: 1.6, d: 0.35, shelves: 4, color: '#b08d64', fill: true });
    const g = new THREE.Group(), sm = stdMat(THREE, o.color, 0.75);
    bx(THREE, g, o.w, o.h, 0.03, sm, 0, o.h / 2, -o.d / 2 + 0.015);
    for (const sx of [-1, 1]) bx(THREE, g, 0.03, o.h, o.d, sm, sx * (o.w / 2 - 0.015), o.h / 2, 0);
    const shelfY = [];
    for (let i = 0; i < o.shelves; i++) {
      const yy = o.shelves === 1 ? 0.03 : 0.03 + i * (o.h - 0.06) / (o.shelves - 1);
      bx(THREE, g, o.w - 0.04, 0.03, o.d - 0.02, sm, 0, yy, 0);
      shelfY.push(yy + 0.015);
    }
    if (o.fill) {
      const cols = ['#c0392b', '#2e86c1', '#f1c40f', '#27ae60', '#8e44ad', '#e67e22', '#ecf0f1'];
      shelfY.slice(0, -1).forEach((y, si) => {
        let x = -o.w / 2 + 0.07;
        let k = si * 3;
        while (x < o.w / 2 - 0.16) {
          const isBox = (k % 4) === 3;
          const w = isBox ? 0.18 : 0.035 + (k % 3) * 0.012, h = isBox ? 0.14 : 0.2 + (k % 5) * 0.025;
          bx(THREE, g, w, h, o.d * 0.7, stdMat(THREE, cols[k % cols.length], 0.7), x + w / 2, y + h / 2, 0.01);
          x += w + 0.012; k++;
        }
      });
    }
    return { mesh: g, height: o.h, shelfY };
  }
  /** Monitor / TV on a small stand, screen facing +Z. */
  function createMonitor(THREE, o) {
    o = opt(o, { w: 0.55, h: 0.34, screen: '#24384a', frame: '#222428', stand: 0.12 });
    const g = new THREE.Group(), fm = stdMat(THREE, o.frame, 0.4, 0.2);
    bx(THREE, g, 0.2, 0.015, 0.14, fm, 0, 0.0075, 0);
    bx(THREE, g, 0.04, o.stand, 0.03, fm, 0, o.stand / 2, -0.02);
    bx(THREE, g, o.w, o.h, 0.035, fm, 0, o.stand + o.h / 2, 0);
    const scr = new THREE.Mesh(new THREE.BoxGeometry(o.w - 0.03, o.h - 0.03, 0.004), stdMat(THREE, o.screen, 0.25));
    scr.position.set(0, o.stand + o.h / 2, 0.019); g.add(scr);
    return { mesh: g, height: o.stand + o.h, screen: scr };
  }
  /** Open laptop, screen at the back facing +Z. */
  function createLaptop(THREE, o) {
    o = opt(o, { body: [0.72, 0.75, 0.80], screen: '#24384a', w: 0.34, d: 0.23 });
    const g = new THREE.Group(), bm = stdMat(THREE, o.body, 0.35, 0.5);
    bx(THREE, g, o.w, 0.018, o.d, bm, 0, 0.009, 0);
    const lid = new THREE.Group(); lid.position.set(0, 0.018, -o.d / 2); lid.rotation.x = -0.25; g.add(lid);
    bx(THREE, lid, o.w, o.d, 0.012, bm, 0, o.d / 2, 0);
    const scr = new THREE.Mesh(new THREE.BoxGeometry(o.w - 0.03, o.d - 0.03, 0.002), stdMat(THREE, o.screen, 0.25));
    scr.position.set(0, o.d / 2, 0.007); lid.add(scr);
    return { mesh: g, height: 0.018 + o.d * Math.cos(0.25), screen: scr };
  }
  /** Blank whiteboard on legs (or wall-mounted with legs:false). */
  function createWhiteboard(THREE, o) {
    o = opt(o, { w: 1.4, h: 0.9, bottom: 0.85, legs: true, frame: '#9aa3ab' });
    const g = new THREE.Group(), fm = stdMat(THREE, o.frame, 0.4, 0.3);
    bx(THREE, g, o.w + 0.06, o.h + 0.06, 0.04, fm, 0, o.bottom + o.h / 2, 0);
    bx(THREE, g, o.w, o.h, 0.02, stdMat(THREE, '#fbfbf8', 0.3), 0, o.bottom + o.h / 2, 0.02);
    bx(THREE, g, o.w * 0.6, 0.03, 0.08, fm, 0, o.bottom - 0.02, 0.05);
    if (o.legs) for (const sx of [-1, 1]) bx(THREE, g, 0.04, o.bottom, 0.04, fm, sx * o.w * 0.42, o.bottom / 2, 0);
    return { mesh: g, height: o.bottom + o.h + 0.03 };
  }
  /** Potted plant. */
  function createPlant(THREE, o) {
    o = opt(o, { size: 1, pot: '#c4683f', leaves: '#3f8a46' });
    const s = o.size, g = new THREE.Group(), lm = stdMat(THREE, o.leaves, 0.85);
    cyl(THREE, g, 0.16 * s, 0.12 * s, 0.3 * s, stdMat(THREE, o.pot, 0.8), 0, 0.15 * s, 0, 16);
    [[0, 0.55, 0, 0.2], [-0.12, 0.45, 0.06, 0.15], [0.13, 0.48, -0.04, 0.16], [0.02, 0.7, 0.03, 0.13]].forEach(([x, y, z, r]) => {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(r * s, 14, 10), lm);
      sp.position.set(x * s, y * s, z * s); sp.castShadow = true; g.add(sp);
    });
    return { mesh: g, height: 0.83 * s };
  }
  /** Round tree (trunk + 4-sphere crown). crown can be swayed with crown.rotation.z. */
  function createTree(THREE, o) {
    o = opt(o, { scale: 1, trunk: [0.45, 0.30, 0.18], leaves: [0.25, 0.52, 0.24] });
    const g = new THREE.Group();
    if (o.scale !== 1) g.scale.setScalar(o.scale);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 1.7, 12), stdMat(THREE, o.trunk, 0.8));
    trunk.position.y = 0.85; trunk.castShadow = true; g.add(trunk);
    const crown = new THREE.Group(); crown.position.y = 1.6; g.add(crown);
    [[0, 0.75, 0, 1.05], [-0.6, 0.45, 0.2, 0.75], [0.6, 0.5, -0.1, 0.8], [0.1, 0.4, 0.55, 0.7]].forEach(([x, y, z, r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), stdMat(THREE, o.leaves, 0.9));
      s.position.set(x, y, z); s.castShadow = true; crown.add(s);
    });
    return { mesh: g, height: 3.4 * o.scale, crown, trunk };
  }
  /** Blank standing signboard (two legs). face = the blank panel, for text added in editing. */
  function createSignboard(THREE, o) {
    o = opt(o, { frame: [0.55, 0.40, 0.26], face: [0.98, 0.98, 0.96] });
    const g = new THREE.Group(), fm = () => stdMat(THREE, o.frame, 0.8);
    bx(THREE, g, 0.56, 0.72, 0.04, fm(), 0, 0.74, 0);
    const face = bx(THREE, g, 0.48, 0.62, 0.02, stdMat(THREE, o.face, 0.6), 0, 0.75, 0.02);
    bx(THREE, g, 0.05, 0.4, 0.05, fm(), -0.2, 0.2, 0);
    bx(THREE, g, 0.05, 0.4, 0.05, fm(), 0.2, 0.2, 0);
    return { mesh: g, height: 1.1, face };
  }
  /** Park bench facing +Z. seatY = seat surface. */
  function createBench(THREE, o) {
    o = opt(o, { w: 1.4, wood: '#a8743f', metal: '#3b4148' });
    const g = new THREE.Group(), wm = stdMat(THREE, o.wood, 0.8), mm = stdMat(THREE, o.metal, 0.5, 0.3);
    for (let i = 0; i < 3; i++) bx(THREE, g, o.w, 0.04, 0.12, wm, 0, 0.45, -0.15 + i * 0.14);
    for (let i = 0; i < 2; i++) bx(THREE, g, o.w, 0.11, 0.035, wm, 0, 0.62 + i * 0.15, -0.24);
    for (const sx of [-1, 1]) { bx(THREE, g, 0.05, 0.43, 0.42, mm, sx * (o.w / 2 - 0.12), 0.215, -0.03); bx(THREE, g, 0.05, 0.4, 0.05, mm, sx * (o.w / 2 - 0.12), 0.65, -0.26); }
    return { mesh: g, height: 0.86, seatY: 0.47 };
  }
  /** Sofa facing +Z. seatY = cushion surface. */
  function createSofa(THREE, o) {
    o = opt(o, { w: 1.8, color: '#4f7a8c' });
    const g = new THREE.Group(), cm = stdMat(THREE, o.color, 0.95);
    bx(THREE, g, o.w, 0.3, 0.8, cm, 0, 0.2, 0);
    bx(THREE, g, o.w, 0.5, 0.2, cm, 0, 0.6, -0.3);
    for (const sx of [-1, 1]) bx(THREE, g, 0.18, 0.55, 0.8, cm, sx * (o.w / 2 - 0.09), 0.33, 0);
    for (const sx of [-1, 1]) bx(THREE, g, o.w / 2 - 0.2, 0.12, 0.6, stdMat(THREE, o.color, 0.9), sx * (o.w / 4 - 0.05), 0.41, 0.06);
    return { mesh: g, height: 0.85, seatY: 0.47 };
  }
  /** A sheet (or thin stack with sheets>1) of blank paper lying flat. */
  function createPaper(THREE, o) {
    o = opt(o, { w: 0.21, d: 0.297, color: '#fbfaf5', sheets: 1 });
    const h = 0.004 * o.sheets, g = new THREE.Group();
    bx(THREE, g, o.w, h, o.d, stdMat(THREE, o.color, 0.6), 0, h / 2, 0);
    return { mesh: g, height: h };
  }
  /** Closed book lying flat. */
  function createBook(THREE, o) {
    o = opt(o, { w: 0.17, d: 0.24, t: 0.035, color: '#8e2c2c' });
    const g = new THREE.Group();
    bx(THREE, g, o.w, o.t, o.d, stdMat(THREE, o.color, 0.7), 0, o.t / 2, 0);
    bx(THREE, g, o.w - 0.012, o.t - 0.008, o.d - 0.006, stdMat(THREE, '#f4efe2', 0.8), 0.006, o.t / 2, 0);
    return { mesh: g, height: o.t };
  }
  function createMug(THREE, o) {
    o = opt(o, { color: '#f2f2ee', h: 0.1 });
    const g = new THREE.Group(), cm = stdMat(THREE, o.color, 0.4);
    cyl(THREE, g, 0.045, 0.042, o.h, cm, 0, o.h / 2, 0, 18);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 8, 16), cm);
    handle.position.set(0.05, o.h * 0.5, 0); g.add(handle);
    return { mesh: g, height: o.h };
  }
  function createPlate(THREE, o) {
    o = opt(o, { r: 0.12, color: '#fbfbf8' });
    const g = new THREE.Group();
    cyl(THREE, g, o.r, o.r * 0.7, 0.02, stdMat(THREE, o.color, 0.3), 0, 0.01, 0, 28);
    return { mesh: g, height: 0.02 };
  }
  /** Smartphone lying flat, screen up (screen = mesh for colour changes). */
  function createPhone(THREE, o) {
    o = opt(o, { body: '#1f2226', screen: '#2f4a63' });
    const g = new THREE.Group();
    bx(THREE, g, 0.075, 0.01, 0.155, stdMat(THREE, o.body, 0.35, 0.3), 0, 0.005, 0);
    const scr = bx(THREE, g, 0.067, 0.002, 0.145, stdMat(THREE, o.screen, 0.2), 0, 0.011, 0);
    scr.castShadow = false;
    return { mesh: g, height: 0.012, screen: scr };
  }

  // ---------------------------------------------------------------------------------------------
  // Carry / hand-off helpers (work with any humanoid rig)
  // ---------------------------------------------------------------------------------------------
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
   * Blank Tasuki (Sash) attached to a humanoid's torso: front strip + back strip + shoulder connector,
   * forming one loop from the left shoulder to the right hip.
   * Returns the group, plus group.setPutOn(p): p=0 held open above the head, p=1 resting on the body.
   * The path is tuned so the loop clears the head and a createStacker pile in the arms; it follows spec.build.
   */
  function createTasuki(THREE, boyTorso) {
    const bw = (boyTorso.userData && boyTorso.userData.build) || 1;
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
      const zf = mix(zOpen, ZF * bw, setZ), zb = mix(-0.225 * bw, ZB * bw, setZ);
      g.position.y = d; g.scale.x = sx * bw;
      f.position.z = zf; b.position.z = zb;
      s.position.z = (zf + zb) / 2; s.scale.z = (zf - zb + 0.016) / 0.27;
      g.grip.set(0.15 * sx * bw + 0.03, 0.48 + d, 0);
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
   * Hand a stacked prop in from off-screen without clipping the holder's arms:
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
    // rooms & sets
    createRoom, createSchoolHall, createOutdoor, createSet, SETS,
    // generic props
    createBox, createTable, createChair, createCounter, createShelf, createMonitor, createLaptop,
    createWhiteboard, createPlant, createTree, createSignboard, createBench, createSofa,
    createPaper, createBook, createMug, createPlate, createPhone,
    // carry props & helpers
    createStacker, createCardboard, createCameraProp, createClosedLaptop, createTasuki, createHelperArm, handOff,
  };
})();
