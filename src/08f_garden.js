/* ============ Home: the campus grows with you (docs/design.md, section 16) ============ */
// Every badge plants something in the Badge Garden under the grounds, in the order you earned them, and a topic's
// trophy raises a landmark next to its building. Each one does something when tapped. A badge names its piece with
// `reward`, a topic its landmark with `landmark`; the art lives here so any topic can use it.
const GARDEN_NEW = 'Look! Something new is growing on the map.';
const GARDEN_SIGN = 'Every badge you earn plants something new in the Badge Garden!';
const Garden = { pokeT: {}, seeds: [] };

// a piece is drawn with its base at (0, 0), about 100 wide and 130 tall; e is seconds since it was last tapped
const poked = (e, dur) => !RM && e < dur ? 1 - e / dur : 0;
const GARDEN = {
  birdhouse: { sound() { Sound.chirp(); Sound.tap(6); }, draw(c, t, e) {
    c.fillStyle = '#A87445'; c.fillRect(-5, -70, 10, 70); c.strokeRect(-5, -70, 10, 70);
    const box = rrect(-30, -122, 60, 56, 4); c.fillStyle = '#E8A65A'; c.fill(box); c.stroke(box);
    c.fillStyle = C.petal; c.beginPath(); c.moveTo(-40, -118); c.lineTo(0, -150); c.lineTo(40, -118); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = C.ink; c.beginPath(); c.arc(0, -96, 11, 0, TAU); c.fill();
    const k = poked(e, 1.6); if (k) { c.save(); c.beginPath(); c.arc(0, -96, 11, 0, TAU); c.clip(); drawBird(c, 4, -96 + 8 * (1 - Math.min(1, k * 3)), t, 1); c.restore(); }
    c.fillStyle = '#A87445'; c.fillRect(-14, -78, 28, 5); c.strokeRect(-14, -78, 28, 5);
  } },
  wheelbarrow: { sound() { Sound.hop(); }, draw(c, t, e) {
    const k = poked(e, 1); c.rotate(Math.sin(e * 18) * .08 * k);
    c.lineWidth = 5; c.beginPath(); c.moveTo(20, -30); c.lineTo(56, -12); c.moveTo(-20, -30); c.lineTo(-30, 0); c.stroke(); c.lineWidth = 4;
    const tray = new Path2D('M-44 -62 L44 -62 L30 -28 L-30 -28 Z'); c.fillStyle = '#6FA8DC'; c.fill(tray); c.stroke(tray);
    for (const [bx, by] of [[-22, -66], [-4, -70], [14, -66], [28, -70]]) { const b = kidneyAt(bx, by); c.fillStyle = '#F2E2B8'; c.fill(b); c.lineWidth = 2; c.stroke(b); }
    if (k) { const h = Math.sin(PI * (1 - k)) * 50; c.fillStyle = '#F2E2B8'; const b = kidneyAt(0, -78 - h); c.fill(b); c.stroke(b); }
    c.lineWidth = 4; c.fillStyle = '#5A6470'; c.beginPath(); c.arc(-20, -16, 14, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#C8CDD2'; c.beginPath(); c.arc(-20, -16, 4, 0, TAU); c.fill();
  } },
  beehive: { sound() { Sound.bzz(); }, draw(c, t, e) {
    c.fillStyle = '#A87445'; c.fillRect(-36, -20, 72, 12); c.strokeRect(-36, -20, 72, 12); c.fillRect(-30, -8, 8, 8); c.fillRect(22, -8, 8, 8);
    for (let i = 0; i < 4; i++) { const w = 40 - i * 7, y = -36 - i * 18; const r = ellipse(0, y, w, 12); c.fillStyle = i % 2 ? '#E8B84A' : '#F2C95E'; c.fill(r); c.stroke(r); }
    const top = ellipse(0, -100, 16, 10); c.fillStyle = '#F2C95E'; c.fill(top); c.stroke(top);
    c.fillStyle = C.ink; c.beginPath(); c.ellipse(0, -30, 9, 6, 0, 0, TAU); c.fill();
    const k = poked(e, 2.4), n = k ? 3 : 1;
    for (let i = 0; i < n; i++) { const a = t * (k ? 3 : 1.2) + i * 2.1, r = k ? 60 * Math.sin(PI * (1 - k)) + 26 : 46; bee(c, Math.cos(a) * r, -70 + Math.sin(a) * r * .5, t, .45, { flip: Math.sin(a) > 0 }); }
  } },
  pumpkins: { sound() { [3, 5, 7].forEach((n, i) => Sound.xylo(PENTA[n] / 2, i * .12)); }, draw(c, t, e) {
    c.strokeStyle = C.leafDeep; c.lineWidth = 4; c.beginPath(); c.moveTo(-50, -10); c.bezierCurveTo(-20, -40, 20, 0, 50, -20); c.stroke();
    drawLeaf(c, -12, -22, -120, .22); drawLeaf(c, 26, -14, -60, .2);
    [[-30, 0, 24], [8, 2, 30], [42, -4, 18]].forEach(([x, y, r], i) => {
      const k = poked(e - i * .15, .5), h = Math.sin(PI * (1 - k)) * 16 * (k ? 1 : 0);
      c.save(); c.translate(x, y - h); c.strokeStyle = C.ink; c.lineWidth = 3.5; c.fillStyle = C.carrot;
      const p = ellipse(0, -r * .8, r, r * .8); c.fill(p); c.stroke(p);
      c.lineWidth = 2; c.beginPath(); c.ellipse(0, -r * .8, r * .45, r * .8, 0, 0, TAU); c.stroke();
      c.fillStyle = C.leafDeep; c.fillRect(-3, -r * 1.6 - 8, 6, 10); c.restore();
    });
  } },
  scarecrow: { sound() { Sound.fwip(); Sound.chirp(.15); }, draw(c, t, e) {
    const k = poked(e, 1.6), wave = Math.sin(e * 14) * .35 * k;
    c.fillStyle = '#A87445'; c.fillRect(-4, -120, 8, 120); c.strokeRect(-4, -120, 8, 120);
    c.save(); c.translate(0, -88); c.rotate(wave); c.fillRect(-52, -4, 104, 8); c.strokeRect(-52, -4, 104, 8);
    c.fillStyle = '#F2D06B'; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 52, -4); c.lineTo(sx * 62, -10); c.lineTo(sx * 60, 0); c.lineTo(sx * 64, 8); c.lineTo(sx * 52, 4); c.fill(); c.stroke(); } c.restore();
    const shirt = new Path2D('M-26 -96 L26 -96 L22 -44 L-22 -44 Z'); c.fillStyle = '#6FA8DC'; c.fill(shirt); c.stroke(shirt);
    c.fillStyle = C.petal; c.fillRect(-10, -80, 12, 12); c.strokeRect(-10, -80, 12, 12);
    c.fillStyle = '#F2E2B8'; c.beginPath(); c.arc(0, -112, 16, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = C.ink; for (const ex of [-6, 6]) { c.beginPath(); c.arc(ex, -114, 2.4, 0, TAU); c.fill(); } c.lineWidth = 2; c.beginPath(); c.arc(0, -110, 6, .3, PI - .3); c.stroke(); c.lineWidth = 4;
    c.fillStyle = '#C9955A'; c.beginPath(); c.ellipse(0, -126, 30, 6, 0, 0, TAU); c.fill(); c.stroke(); const hat = rrect(-14, -146, 28, 20, 5); c.fill(hat); c.stroke(hat);
    if (k) drawBird(c, 40 + (1 - k) * 120, -130 - (1 - k) * 90, t, 1);
  } },
  dandelions: { sound() { Sound.fwip(); Sound.sparkle(); }, draw(c, t, e) {
    const blown = !RM && e < 4.5, grow = blown ? clamp((e - 2.5) / 2, 0, 1) : 1;
    [[-30, -70], [4, -96], [36, -62]].forEach(([x, y], i) => {
      const sw = RM ? 0 : Math.sin(t * 1.5 + i) * 3;
      c.strokeStyle = C.stem; c.lineWidth = 4; c.beginPath(); c.moveTo(x * .6, 0); c.quadraticCurveTo(x, y * .5, x + sw, y); c.stroke();
      if (grow > 0) { c.save(); c.globalAlpha = grow; c.strokeStyle = 'rgba(36,54,40,.35)'; c.lineWidth = 1.5; for (let j = 0; j < 14; j++) { const a = j / 14 * TAU; c.beginPath(); c.moveTo(x + sw, y); c.lineTo(x + sw + Math.cos(a) * 18 * grow, y + Math.sin(a) * 18 * grow); c.stroke(); } c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(x + sw, y, 18 * grow, 0, TAU); c.fill(); c.restore(); }
      c.fillStyle = '#C8B060'; c.beginPath(); c.arc(x + sw, y, 4, 0, TAU); c.fill();
      if (blown && e < 2.6) for (let j = 0; j < 5; j++) { const f = e / 2.6, sx = x + sw + f * (90 + j * 18), sy = y - f * (40 + j * 14) + Math.sin(e * 4 + j) * 6; c.save(); c.globalAlpha = 1 - f; c.strokeStyle = C.ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 4, sy + 8); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(sx, sy, 4, 0, TAU); c.fill(); c.restore(); }
    });
    drawLeaf(c, -8, -2, -160, .24); drawLeaf(c, 8, -2, -20, .24);
  } },
  appleTree: { sound() { Sound.fwip(); Sound.plunk(); }, draw(c, t, e) {
    const k = poked(e, 1.4), sh = Math.sin(e * 30) * 4 * Math.min(1, k * 2);
    c.fillStyle = C.soil; c.fillRect(-8, -60, 16, 60); c.strokeRect(-8, -60, 16, 60);
    c.fillStyle = C.leaf; c.beginPath(); c.arc(sh, -96, 46, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(sh - 16, -116, 14, 8, -.5, 0, TAU); c.fill();
    const apples = [[-20, -104], [16, -88], [22, -118], [-6, -76]];
    apples.forEach(([x, y], i) => { const drop = i === 3 && k ? Math.min(1, (1 - k) * 2.2) : 0; if (drop >= 1 && k < .3) return; drawApple(c, x + sh, y + drop * 72 - (drop >= 1 ? Math.abs(Math.sin((1 - k) * 12)) * 8 * k : 0)); });
  } },
  sprinkler: { sound() { Sound.splash(); }, draw(c, t, e) {
    c.strokeStyle = '#3E8A4F'; c.lineWidth = 6; c.beginPath(); c.moveTo(-60, -4); c.quadraticCurveTo(-30, 8, -10, -6); c.stroke(); c.strokeStyle = C.ink; c.lineWidth = 4;
    c.fillStyle = '#9AA3AD'; c.fillRect(-12, -12, 24, 12); c.strokeRect(-12, -12, 24, 12); c.fillRect(-3, -40, 6, 28); c.strokeRect(-3, -40, 6, 28);
    const sw = RM ? 0 : Math.sin(t * (e < 3 ? 6 : 1)) * .6; c.save(); c.translate(0, -40); c.rotate(sw); c.fillStyle = C.sun; c.fillRect(-16, -4, 32, 8); c.strokeRect(-16, -4, 32, 8); c.restore();
    if (!RM && e < 3) for (let j = 0; j < 14; j++) { const f = ((t * 1.4 + j / 14) % 1), a = sw + (j % 2 ? -.5 : .5) - PI / 2, v = 120; const x = Math.cos(a) * v * f, y = -44 + Math.sin(a) * v * f + 140 * f * f; c.fillStyle = 'rgba(91,184,232,.8)'; c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill(); }
  } },
  beanTeepee: { sound() { Sound.grow(2); }, draw(c, t, e) {
    const k = poked(e, 1.2), wig = Math.sin(e * 20) * 3 * k;
    c.strokeStyle = '#A87445'; c.lineWidth = 6; for (const x of [-38, 0, 38]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(0, -140); c.stroke(); }
    c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(-8, -126); c.lineTo(8, -126); c.stroke();
    c.strokeStyle = C.leafDeep; c.lineWidth = 3;
    for (const x of [-38, 38]) { c.beginPath(); for (let u = 0; u <= 1.001; u += .05) { const px = lerp(x, 0, u * .85) + Math.sin(u * 18) * 6 + wig, py = -u * .85 * 140; u ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
    [[-30, -30], [-18, -70], [26, -40], [14, -86], [-6, -104]].forEach(([x, y], i) => drawLeaf(c, x + wig, y, i % 2 ? -20 : -160, .17));
    for (const [x, y] of [[-22, -50], [22, -64]]) { c.strokeStyle = C.ink; c.lineWidth = 2.5; c.fillStyle = '#7CC56A'; const pod = ellipse(x + wig, y, 5, 16, .2); c.fill(pod); c.stroke(pod); }
  } },
  gnome: { sound() { Sound.boing(); }, draw(c, t, e) {
    const k = poked(e, 1), hop = Math.abs(Math.sin(PI * (1 - k))) * 22 * (k ? 1 : 0);
    c.fillStyle = 'rgba(36,54,40,.15)'; c.beginPath(); c.ellipse(0, 0, 26, 6, 0, 0, TAU); c.fill();
    c.translate(0, -hop);
    const body = new Path2D('M-24 0 C-26 -30 -18 -50 0 -52 C18 -50 26 -30 24 0 Z'); c.fillStyle = '#3E7FC1'; c.fill(body); c.stroke(body);
    c.fillStyle = '#F4D2B0'; c.beginPath(); c.arc(0, -60, 13, 0, TAU); c.fill(); c.stroke();
    const beard = new Path2D('M-13 -58 C-16 -36 -4 -26 0 -24 C4 -26 16 -36 13 -58 C6 -52 -6 -52 -13 -58 Z'); c.fillStyle = '#fff'; c.fill(beard); c.stroke(beard);
    c.fillStyle = C.ink; for (const ex of [-5, 5]) { c.beginPath(); c.arc(ex, -63, 2, 0, TAU); c.fill(); } c.fillStyle = '#F2A08A'; c.beginPath(); c.arc(0, -58, 3.5, 0, TAU); c.fill();
    c.save(); c.translate(0, -70); c.rotate(-k * .4); const hat = new Path2D('M-16 0 C-10 -24 0 -40 6 -48 C8 -30 14 -14 16 0 Z'); c.fillStyle = '#E04B4B'; c.fill(hat); c.stroke(hat); c.restore();
    c.save(); c.translate(20, -34); c.rotate(.4); c.fillStyle = '#A87445'; c.fillRect(-2, 0, 4, 18); c.strokeRect(-2, 0, 4, 18); c.fillStyle = 'rgba(221,243,247,.9)'; c.beginPath(); c.arc(0, -4, 9, 0, TAU); c.fill(); c.lineWidth = 3; c.stroke(); c.restore();
  } },
  starFlag: { sound() { [0, 2, 4, 7].forEach((n, i) => Sound.xylo(PENTA[n], i * .09)); }, draw(c, t, e) {
    const k = poked(e, 1.5), rise = k ? Math.sin(PI * (1 - k)) : 0;
    c.fillStyle = '#C8CDD2'; c.fillRect(-3, -150, 6, 150); c.strokeRect(-3, -150, 6, 150); c.fillStyle = C.sun; c.beginPath(); c.arc(0, -154, 6, 0, TAU); c.fill(); c.stroke();
    const y = -140 + (1 - rise) * 26, wv = RM ? 0 : Math.sin(t * 4) * 4;
    const flag = new Path2D(); flag.moveTo(3, y); flag.quadraticCurveTo(26, y - 6 + wv, 52, y + wv); flag.lineTo(52, y + 36 + wv); flag.quadraticCurveTo(26, y + 30 + wv, 3, y + 36); flag.closePath();
    c.fillStyle = C.petal; c.fill(flag); c.stroke(flag); c.save(); c.translate(27, y + 17 + wv * .6); c.scale(.34, .34); c.fillStyle = C.sun; c.fill(STAR_PATH()); c.lineWidth = 8; c.stroke(STAR_PATH()); c.restore();
  } },
  // a topic's landmark: Botanist's giant sunflower
  sunflower: { tall: true, sound() { Sound.grow(4); }, draw(c, t, e) {
    const k = poked(e, 1.6), nod = Math.sin(e * 9) * .25 * k + (RM ? 0 : Math.sin(t * .9) * .04);
    c.strokeStyle = C.leafDeep; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-10, -110, 0, -200); c.stroke();
    c.strokeStyle = C.stem; c.lineWidth = 6; c.stroke(); c.lineWidth = 4; c.strokeStyle = C.ink;
    drawLeaf(c, -4, -70, -160, .5); drawLeaf(c, -2, -120, -20, .46);
    c.save(); c.translate(0, -204); c.rotate(nod);
    for (let i = 0; i < 16; i++) { c.save(); c.rotate(i / 16 * TAU); const p = ellipse(0, -44, 11, 22); c.fillStyle = i % 2 ? C.sun : '#F2B53A'; c.fill(p); c.lineWidth = 2.5; c.stroke(p); c.restore(); }
    c.fillStyle = '#7A4E2A'; c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fill(); c.lineWidth = 4; c.stroke();
    c.fillStyle = '#5A3920'; for (let i = 0; i < 24; i++) { const a = i * 2.4, r = Math.sqrt(i) * 5.4; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 2.2, 0, TAU); c.fill(); }
    c.restore();
    if (k) for (let j = 0; j < 4; j++) { const f = 1 - k, x = -20 + j * 14, y = -190 + f * f * 200; if (y < 0) { c.fillStyle = '#3A2A1A'; c.beginPath(); c.ellipse(x, y, 3, 5, 0, 0, TAU); c.fill(); } }
  } },
};
function kidneyAt(x, y) { const p = new Path2D(); p.ellipse(x, y, 9, 6, -.2, 0, TAU); return p; }
function drawApple(c, x, y) { c.fillStyle = '#E04B4B'; c.strokeStyle = C.ink; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x - 3, y - 3, 2.2, 0, TAU); c.fill(); c.lineWidth = 4; }
let STAR_P = null; const STAR_PATH = () => STAR_P || (STAR_P = (() => { const p = new Path2D(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? 22 : 50; i ? p.lineTo(Math.cos(a) * r, Math.sin(a) * r) : p.moveTo(Math.cos(a) * r, Math.sin(a) * r); } p.closePath(); return p; })());

// which pieces are earned, oldest first, and which topics have their landmark
function gardenPieces() {
  const B = Store.data.badges;
  return TOPICS.flatMap(tp => tp.activities).filter(a => a.badge.reward && B[a.badge.id] && GARDEN[a.badge.reward]).sort((a, b) => B[a.badge.id] - B[b.badge.id]).map(a => ({ id: a.badge.id, kind: a.badge.reward }));
}
const landmarkOf = tp => tp.landmark && GARDEN[tp.landmark] && tp.master && Store.data.badges[tp.master.id] ? tp.landmark : null;
// rows of the Badge Garden under the grounds, with a sign at the start; a landmark takes the spot beside its building
function gardenLayout(L) {
  const pieces = gardenPieces(), wide = L.cols !== 1, per = wide ? 9 : 3, dx = wide ? 145 : 140, x0 = wide ? 330 : 200, row = wide ? 200 : 210;
  const gs = wide ? 1.05 : .9;
  L.garden = pieces.map((p, i) => ({ ...p, s: gs, x: x0 + (i % per) * dx, y: L.h + 170 + Math.floor(i / per) * row }));
  if (pieces.length) { L.sign = { x: wide ? 170 : 70, y: L.h + 170 }; L.h += 60 + Math.ceil(pieces.length / per) * row; } else L.sign = null;
  L.landmarks = [];
  Home.lots.forEach((lot, i) => {
    const kind = lot.tp && landmarkOf(lot.tp); if (!kind) return;
    const p = L.lots[i], x = p.x + 165 * L.scale, y = p.y - 6;
    L.trees = L.trees.filter(tr => Math.abs(tr.x - x) > 110 || tr.y > y + 40);   // the landmark takes the tree's spot
    L.landmarks.push({ id: lot.tp.master.id, kind, x, y, s: L.scale * .8 });
  });
}
function gardenHit(x, y) {
  const L = Home.L; if (!L || !L.garden) return null;
  for (const g of [...L.garden, ...L.landmarks]) if (Math.abs(x - g.x) < 55 * g.s && y < g.y + 12 && y > g.y - (GARDEN[g.kind].tall ? 260 : 150) * g.s) return g;
  if (L.sign && Math.abs(x - L.sign.x) < 60 && y < L.sign.y + 10 && y > L.sign.y - 110) return { sign: true };
  return null;
}
function gardenTap(x, y) {
  const g = gardenHit(x, y); if (!g) return false;
  if (g.sign) { Sound.plunk(); say(GARDEN_SIGN, { lock: false }); return true; }
  Garden.pokeT[g.id] = Loop.t; GARDEN[g.kind].sound(); Home.fresh && Home.fresh.delete(g.id); return true;
}
function drawGarden(c, t) {
  const L = Home.L; if (!L.garden) return;
  const piece = (g, s) => {
    c.save(); c.translate(g.x, g.y); c.scale(s, s); c.strokeStyle = C.ink; c.lineWidth = 4; c.lineJoin = 'round';
    c.fillStyle = 'rgba(36,54,40,.13)'; c.beginPath(); c.ellipse(0, 2, 46, 9, 0, 0, TAU); c.fill();
    GARDEN[g.kind].draw(c, t, t - (Garden.pokeT[g.id] ?? -99)); c.restore();
    if (Home.fresh && Home.fresh.has(g.id) && !RM) sparkle(c, g.x + 40 * s, g.y - 120 * s - Math.abs(Math.sin(t * 3)) * 8, 9);
  };
  if (L.sign) {
    const { x, y } = L.sign; c.save(); c.strokeStyle = C.ink; c.lineWidth = 4; c.fillStyle = '#A87445'; c.fillRect(x - 5, y - 60, 10, 60); c.strokeRect(x - 5, y - 60, 10, 60);
    const b = rrect(x - 62, y - 108, 124, 52, 10); c.fillStyle = '#E8C58E'; c.fill(b); c.stroke(b); c.restore();
    label(c, "Badge", x, y - 92, { size: 19, weight: 700, stroke: null }); label(c, "Garden", x, y - 70, { size: 19, weight: 700, stroke: null });
  }
  for (const g of [...L.garden, ...L.landmarks]) piece(g, g.s);
}
