// Reusable 3D Character Library (Three.js, create_models.py compatible)
window.AI3DChars = (function () {
  function stdMat(THREE, rgb, rough = 0.72, metal = 0.05) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(rgb[0], rgb[1], rgb[2]),
      roughness: rough,
      metalness: metal,
    });
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

  /**
   * Create Boy character (exact match to create_models.py)
   * Returns rig controller with setExpression(), setMouth(), setHoldPose().
   */
  function createBoy(THREE) {
    const group = new THREE.Group();
    const skin = stdMat(THREE, [0.76, 0.48, 0.30]);
    const hair = stdMat(THREE, [0.20, 0.085, 0.035]);
    const cream = stdMat(THREE, [0.91, 0.85, 0.70]);
    const vest = stdMat(THREE, [0.64, 0.24, 0.13]);
    const shorts = stdMat(THREE, [0.25, 0.31, 0.35]);
    const shoe = stdMat(THREE, [0.19, 0.12, 0.08]);
    const eyeMat = stdMat(THREE, [0.055, 0.035, 0.025]);

    const torso = new THREE.Group();
    torso.position.set(0, 0.61, 0);
    group.add(torso);
    addBox(THREE, torso, 0, 0, 0.855, 0.40, 0.22, 0.45, cream, [0, 0, 0.61]);
    addBox(THREE, torso, 0, 0.002, 0.835, 0.408, 0.236, 0.37, vest, [0, 0, 0.61]);
    addBox(THREE, torso, 0, -0.118, 0.835, 0.14, 0.018, 0.37, cream, [0, 0, 0.61]);
    addBox(THREE, torso, 0, -0.119, 1.015, 0.14, 0.012, 0.09, cream, [0, 0, 0.61]);

    const head = new THREE.Group();
    head.position.set(0, 1.07 - 0.61, 0);
    torso.add(head);
    addBox(THREE, head, 0, 0, 1.265, 0.38, 0.34, 0.37, skin, [0, 0, 1.07]);
    addBox(THREE, head, 0, 0.005, 1.445, 0.40, 0.36, 0.09, hair, [0, 0, 1.07]);
    addBox(THREE, head, 0, 0.153, 1.315, 0.40, 0.055, 0.22, hair, [0, 0, 1.07]);
    addBox(THREE, head, -0.095, -0.177, 1.385, 0.21, 0.045, 0.10, hair, [0, 0, 1.07]);

    const eyes = [];
    for (const ex of [-0.085, 0.085]) {
      eyes.push(addBox(THREE, head, ex, -0.174, 1.27, 0.035, 0.012, 0.043, eyeMat, [0, 0, 1.07]));
    }
    const browL = addBox(THREE, head, -0.085, -0.176, 1.32, 0.055, 0.012, 0.014, hair, [0, 0, 1.07]);
    const browR = addBox(THREE, head, 0.085, -0.176, 1.32, 0.055, 0.012, 0.014, hair, [0, 0, 1.07]);
    const mouth = addBox(THREE, head, 0, -0.175, 1.175, 0.058, 0.014, 0.014, eyeMat, [0, 0, 1.07]);
    // Upturned mouth corners: hidden unless the expression is 'happy'.
    const smile = [-1, 1].map(sign => {
      const c = addBox(THREE, head, 0, -0.175, 1.175, 0.026, 0.014, 0.013, eyeMat, [0, 0, 1.07]);
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

    const arms = {};
    for (const [side, x] of [['L', -0.285], ['R', 0.285]]) {
      const upper = new THREE.Group();
      upper.position.set(x, 1.02 - 0.61, 0);
      torso.add(upper);
      addBox(THREE, upper, x, 0, 0.97, 0.16, 0.22, 0.17, cream, [x, 0, 1.02]);
      addBox(THREE, upper, x, 0, 0.845, 0.145, 0.19, 0.08, skin, [x, 0, 1.02]);

      const fore = new THREE.Group();
      fore.position.set(0, 0.80 - 1.02, 0);
      upper.add(fore);
      addBox(THREE, fore, x, 0, 0.685, 0.145, 0.19, 0.23, skin, [x, 0, 0.80]);
      arms[side] = { upper, fore };
    }

    for (const [side, x] of [['L', -0.105], ['R', 0.105]]) {
      addBox(THREE, group, x, 0, 0.535, 0.195, 0.23, 0.21, shorts);
      addBox(THREE, group, x, 0, 0.39, 0.16, 0.19, 0.08, skin);
      addBox(THREE, group, x, 0, 0.29, 0.16, 0.19, 0.12, skin);
      addBox(THREE, group, x, 0, 0.17, 0.165, 0.195, 0.12, cream);
      addBox(THREE, group, x, -0.035, 0.055, 0.19, 0.29, 0.11, shoe);
    }

    const cargoAnchor = new THREE.Group();
    cargoAnchor.position.set(0, 0.63, 0.34);
    group.add(cargoAnchor);

    return {
      group, torso, head, arms, eyes, browL, browR, mouth, cargoAnchor,
      materials: { skin, hair, cream, vest, shorts, shoe, eyeMat },
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
        } else {
          browL.rotation.z = 0;
          browR.rotation.z = 0;
          eyes.forEach(e => { e.scale.y = 1.0; });
        }
      },
      setMouth(rms, widthScale = 1.0, baseHeight = 1.0) {
        mouth.scale.set(widthScale, baseHeight + (rms || 0) * 2.0, 1);
        mouthWidth = widthScale;
        placeSmile();
      },
    };
  }

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

    return {
      group, bodyPivot, head, mouth, wings,
      wingbeat(t, speed = 24, amp = 0.25) {
        wings.forEach(w => {
          w.pivot.rotation.z = Math.sin(t * speed) * amp * (-w.sign);
        });
      },
      setMouth(rms) {
        mouth.scale.y = 1.0 + (rms || 0) * 2.5;
      },
    };
  }

  return { createBoy, createDragonfly, stdMat };
})();
