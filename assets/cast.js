// Bundled cast: spec-only characters. Load after characters.js:
//   <script src="characters.js"></script><script src="cast.js"></script>
// Then: const rig = AI3DChars.create('chef', THREE);   // or create('chef', THREE, { hair: '#222' }) to tweak
//
// To add your own character, copy an entry below and change it (keys not given fall back to the boy).
// humanoid keys: skin hair top topAccent topAccentStyle('vest'|'jacket') bottom bottomStyle('shorts'|'pants'|'skirt')
//   socks shoes eye sleeves('short'|'long') hairStyle('short'|'bob'|'long'|'ponytail'|'bun'|'cap'|'bald')
//   height(1 = boy 1.49) build(body width, 0.85..1.25) headScale glasses tie apron cheeks hairTie
//   hat('cap'|'chef'|'helmet'|'beanie'|'antenna') hatColor metallic antennaTip
// mascot keys (kind:'mascot'): body belly eyeWhite pupil mouthColor cheeks size shape('round'|'tall'|'blob')
//   ears(null|'cat'|'bear'|'bunny') earInner wings(null|'bird'|'bug') wingColor tail(null|'round'|'long') tailTip beak float antenna feet
//   muzzle nose whiskers (colours; a cat reads best with ears:'cat', tail:'long', whiskers, nose, muzzle)
// Colours: '#rrggbb' as picked in any colour picker.
window.AI3DCast = {
  // ---- humanoids ----
  girl: {
    kind: 'humanoid', note: 'schoolgirl, ponytail, skirt',
    skin: '#e9b48e', hair: '#3a2418', hairStyle: 'ponytail', hairTie: '#e84a5f',
    top: '#f6f3ea', topAccent: '#2f4f86', topAccentStyle: 'vest', bottom: '#2f4f86', bottomStyle: 'skirt',
    socks: '#f6f3ea', shoes: '#5a3a28', cheeks: '#f19a9a', height: 0.97,
  },
  officeWorker: {
    kind: 'humanoid', note: 'adult in suit and tie',
    skin: '#e3b08a', hair: '#1f1a17', hairStyle: 'short',
    top: '#f4f6f8', topAccent: '#2b3a55', topAccentStyle: 'jacket', tie: '#b8323a', bottom: '#2b3a55', bottomStyle: 'pants',
    socks: '#222222', shoes: '#1c1c1c', height: 1.2, headScale: 0.9, build: 1.05,
  },
  chef: {
    kind: 'humanoid', note: 'cook in whites, tall hat, apron',
    skin: '#d9a07a', hair: '#4a2e1c', hairStyle: 'short', hat: 'chef',
    top: '#f7f7f4', topAccent: null, sleeves: 'long', apron: '#e8e8e2', bottom: '#40464d', bottomStyle: 'pants',
    socks: '#222222', shoes: '#222222', height: 1.15, headScale: 0.92, build: 1.15,
  },
  grandma: {
    kind: 'humanoid', note: 'grey bun, glasses, cardigan, long skirt',
    skin: '#e6b896', hair: '#c9c6c0', hairStyle: 'bun', glasses: '#6b4a2e',
    top: '#f2e6d0', topAccent: '#8a4f6b', topAccentStyle: 'jacket', bottom: '#5b5a6e', bottomStyle: 'skirt',
    socks: '#d9c9b0', shoes: '#4a3a30', cheeks: '#eba29a', height: 1.02, headScale: 0.95,
  },
  robot: {
    kind: 'humanoid', note: 'friendly metal robot',
    skin: '#b9c3cc', metallic: true, hair: null, hairStyle: 'bald', hat: 'antenna', eye: '#1fb7e0',
    top: '#e0e5ea', topAccent: '#3d7fc1', topAccentStyle: 'vest', sleeves: 'long', bottom: '#7f8b96', bottomStyle: 'pants',
    socks: '#7f8b96', shoes: '#3b4249', height: 1.05,
  },
  clerk: {
    kind: 'humanoid', note: 'shop clerk, cap and apron, bob hair',
    skin: '#f0c4a0', hair: '#5a3220', hairStyle: 'bob', hat: 'cap', hatColor: '#2e8b57',
    top: '#fbfbf7', topAccent: null, apron: '#2e8b57', bottom: '#33302e', bottomStyle: 'pants',
    socks: '#33302e', shoes: '#2a2624', height: 1.1, headScale: 0.94,
  },
  // ---- mascots ----
  cat: {
    kind: 'mascot', note: 'standing orange cat',
    body: '#f0a04b', belly: '#fff2df', ears: 'cat', earInner: '#f6b3b0', tail: 'long', tailTip: '#c8742a',
    muzzle: '#fff6ea', nose: '#e8737a', whiskers: '#3a2a20', cheeks: '#f6a6a0', size: 1.1,
  },
  chick: {
    kind: 'mascot', note: 'flying yellow chick',
    body: '#ffd84a', belly: null, beak: '#f28c28', wings: 'bird', float: true, cheeks: '#ffab91', size: 0.8, tail: 'round',
  },
  slime: {
    kind: 'mascot', note: 'squishy green blob',
    body: '#7ed37a', belly: null, shape: 'blob', size: 1.1, cheeks: '#f9a3b1', feet: false,
  },
};
for (const [name, spec] of Object.entries(window.AI3DCast)) window.AI3DChars.define(name, spec);
