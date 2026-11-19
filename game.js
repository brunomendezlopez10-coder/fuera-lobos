'use strict';
// ¡Fuera, lobos! — la granjera defiende a sus ovejas.

const cv = document.getElementById('juego');
const ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const MAX_OVEJAS = 8;

// ---------- Ian, el granjero (foto real recortada en piezas) ----------
// La foto NO se sube a internet: se elige una vez en el iPhone y se guarda solo en el teléfono.
// La imagen trae 4 piezas (cuerpo, brazo con pistola y dos piernas) sobre fondo rosa,
// que aquí se vuelve transparente.
const PIEZAS = { escala: 0.55, alto: 1400, hoja: [717, 584], piezas: {
  cuerpo: { sx: 10, sy: 10, sw: 339, sh: 564, ox: 53, oy: 7 },
  brazo: { sx: 359, sy: 10, sw: 101, sh: 519, ox: 7, oy: 335 },
  piernaI: { sx: 470, sy: 10, sw: 146, sh: 257, ox: 19, oy: 925 },
  piernaD: { sx: 626, sy: 10, sw: 81, sh: 257, ox: 275, oy: 925 } } };
const IAN_ALTO = 180;                 // altura de Ian en pantalla
const IAN_CX = 280;                   // centro horizontal (en píxeles de la foto original)
const HOMBRO = { x: 100, y: 420 }, CANON = { x: 162, y: 1255 };
const CADERA_I = { x: 150, y: 960 }, CADERA_D = { x: 345, y: 960 };
const BRAZO_REPOSO = Math.atan2(CANON.y - HOMBRO.y, CANON.x - HOMBRO.x);
let ianOK = false, piezasIan = null;

function prepararIan(img) {
  const [hw, hh] = PIEZAS.hoja, f = img.naturalWidth / hw;
  if (Math.abs(img.naturalHeight / f - hh) > 4) return false; // no es la imagen de Ian
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], gr = px[i + 1], b = px[i + 2];
    const rosa = Math.min(r, b) - gr;                      // cuánto se parece al fondo rosa
    let al = 1 - Math.max(0, Math.min(1, (rosa - 45) / 120));
    al *= px[i + 3] / 255;
    if (al > 0.02 && al < 1) {                             // quitar el tinte rosa de los bordes
      const k = 1 - al;
      px[i] = Math.max(0, Math.min(255, (r - 255 * k) / al));
      px[i + 1] = Math.max(0, Math.min(255, gr / al));
      px[i + 2] = Math.max(0, Math.min(255, (b - 255 * k) / al));
    }
    px[i + 3] = Math.round(al * 255);
  }
  g.putImageData(d, 0, 0);
  piezasIan = {};
  for (const [n, p] of Object.entries(PIEZAS.piezas)) {
    const pc = document.createElement('canvas');
    pc.width = Math.round(p.sw * f); pc.height = Math.round(p.sh * f);
    pc.getContext('2d').drawImage(c, p.sx * f, p.sy * f, p.sw * f, p.sh * f, 0, 0, pc.width, pc.height);
    piezasIan[n] = { c: pc, x: p.ox, y: p.oy, w: p.sw / PIEZAS.escala, h: p.sh / PIEZAS.escala };
  }
  ianOK = true;
  pintarRetrato();
  $('btnFoto').textContent = '📷 Cambiar foto de Ian';
  return true;
}

function cargarIan(src, guardar) {
  const img = new Image();
  img.onload = () => {
    if (!prepararIan(img)) {
      if (guardar) alert('Esa no es la imagen de Ian. Elige la que te llegó por AirDrop (la de las piezas con fondo rosa).');
      return;
    }
    if (guardar) {
      try { localStorage.setItem('fl_ian2', src); } catch (err) { alert('No se pudo guardar la foto.'); }
    }
  };
  img.src = src;
}
localStorage.removeItem('fl_ian'); // versión antigua
cargarIan(localStorage.getItem('fl_ian2') || 'ian-piezas.png', false); // ian-piezas.png solo existe en el Mac

$('btnFoto').onclick = () => $('eligeFoto').click();
$('eligeFoto').onchange = e => {
  const archivo = e.target.files[0]; if (!archivo) return;
  const lector = new FileReader();
  lector.onload = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      cargarIan(c.toDataURL('image/png'), true);
    };
    img.src = lector.result;
  };
  lector.readAsDataURL(archivo);
  e.target.value = '';
};

function pintarRetrato() {
  const c = $('retrato'), g = c.getContext('2d');
  const k = c.height / PIEZAS.alto * 0.98;
  g.clearRect(0, 0, c.width, c.height);
  g.save(); g.translate(c.width / 2, c.height); g.scale(k, k);
  for (const n of ['piernaI', 'piernaD', 'cuerpo', 'brazo']) {
    const p = piezasIan[n]; g.drawImage(p.c, p.x - IAN_CX, p.y - PIEZAS.alto, p.w, p.h);
  }
  g.restore();
  c.style.display = '';
}

// ---------- Pantalla ----------
let W = 0, H = 0, S = 1, DPR = 1;
let corral = { x: 0, y: 0, r: 0 };
let fondo = null;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  S = Math.max(0.8, Math.min(W, H) / 400);
  corral = { x: W / 2, y: H * 0.45, r: Math.min(W, H) * 0.27 };
  pintarFondo();
  if (granjera) { granjera.x = Math.min(granjera.x, W); granjera.y = Math.min(granjera.y, H); }
  for (const o of ovejas) if (o.estado === 'corral') dentroCorral(o);
}

function pintarFondo() {
  fondo = document.createElement('canvas');
  fondo.width = cv.width; fondo.height = cv.height;
  const g = fondo.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#6cc04a'); grad.addColorStop(1, '#4a9f3a');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // matas de hierba
  const n = Math.round(W * H / 2500);
  g.strokeStyle = 'rgba(30,90,20,.45)'; g.lineWidth = 2 * S; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = Math.random() * W, y = Math.random() * H, s = rnd(3, 7) * S;
    g.beginPath(); g.moveTo(x - s * .6, y - s); g.lineTo(x, y); g.lineTo(x + s * .6, y - s);
    g.moveTo(x, y); g.lineTo(x, y - s * 1.2); g.stroke();
  }
  // florecitas
  const colores = ['#fff', '#ffe14d', '#ff8ac2', '#9fd3ff'];
  for (let i = 0; i < n / 5; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    g.fillStyle = colores[i % colores.length];
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * TAU / 5) * 3 * S, y + Math.sin(k * TAU / 5) * 3 * S, 2.2 * S, 0, TAU); g.fill(); }
    g.fillStyle = '#f5a623'; g.beginPath(); g.arc(x, y, 1.8 * S, 0, TAU); g.fill();
  }
  // corral: tierra y valla
  const { x, y, r } = corral;
  g.fillStyle = '#c9b46a'; g.beginPath(); g.ellipse(x, y, r, r * 0.92, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(x - r * .2, y - r * .2, r * .5, r * .35, 0, 0, TAU); g.fill();
  g.strokeStyle = '#7a4a1e'; g.lineWidth = 4 * S;
  for (const dy of [-6, 2]) { g.beginPath(); g.ellipse(x, y + dy * S, r, r * 0.92, 0, 0, TAU); g.stroke(); }
  const postes = 22;
  for (let i = 0; i < postes; i++) {
    const a = i / postes * TAU, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.92;
    g.fillStyle = '#8b5a2b'; rr(g, px - 3.5 * S, py - 14 * S, 7 * S, 18 * S, 2 * S); g.fill();
    g.fillStyle = '#a8713a'; rr(g, px - 3.5 * S, py - 14 * S, 7 * S, 4 * S, 2 * S); g.fill();
  }
}

function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function elipse(g, x, y, rx, ry, color) { g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
function circulo(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function estrella(g, x, y, r, rot, color) {
  g.fillStyle = color; g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  g.closePath(); g.fill();
}

// ---------- Sonido (sintetizado, sin archivos) ----------
let ac = null, mudo = localStorage.getItem('fl_mudo') === '1';
function activarAudio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume();
}
function tono(f1, f2, dur, tipo = 'square', vol = 0.1, retraso = 0) {
  if (!ac || mudo) return;
  const t = ac.currentTime + retraso, o = ac.createOscillator(), g = ac.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.05);
}
let bufRuido = null;
function ruido(dur, vol, frec) {
  if (!ac || mudo) return;
  if (!bufRuido) {
    bufRuido = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = bufRuido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = bufRuido; f.type = 'lowpass'; f.frequency.value = frec;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t); s.stop(t + dur + 0.05);
}
const sfx = {
  disparo() { ruido(0.07, 0.18, 2200); tono(220, 70, 0.07, 'square', 0.04); },
  golpe() { tono(600, 250, 0.08, 'square', 0.07); },
  aullido() { tono(380, 820, 0.22, 'sawtooth', 0.05); tono(820, 300, 0.35, 'sawtooth', 0.05, 0.2); },
  bee() { tono(360, 330, 0.12, 'sawtooth', 0.06); tono(350, 290, 0.32, 'sawtooth', 0.06, 0.1); },
  estrella() { [660, 880, 1100, 1320].forEach((f, i) => tono(f, f, 0.09, 'triangle', 0.09, i * 0.07)); },
  oleada() { [523, 659, 784, 1047].forEach((f, i) => tono(f, f, 0.12, 'triangle', 0.1, i * 0.1)); },
  perder() { [392, 330, 262, 196].forEach((f, i) => tono(f, f * 0.97, 0.25, 'triangle', 0.1, i * 0.2)); },
};

// ---------- Estado del juego ----------
let estado = 'menu'; // menu | jugando | pausa | acabando | fin
let granjera = null, ovejas = [], lobos = [], balas = [], parts = [], premios = [];
let puntos = 0, oleada = 1, porSalir = 0, tSalida = 0, oleadaHecha = false, tSiguiente = 0;
let superT = 0, temblor = 0, tFin = 0, cartel = null;
let record = +(localStorage.getItem('fl_record') || 0);

function puntoEnCorral(f = 0.7) {
  const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * corral.r * f;
  return { x: corral.x + Math.cos(a) * d, y: corral.y + Math.sin(a) * d * 0.92 };
}
function dentroCorral(o) {
  const dx = o.x - corral.x, dy = (o.y - corral.y) / 0.92, d = Math.hypot(dx, dy), m = corral.r * 0.82;
  if (d > m) { o.x = corral.x + dx / d * m; o.y = corral.y + dy / d * m * 0.92; }
}
function nuevaOveja() {
  const p = puntoEnCorral();
  return { x: p.x, y: p.y, dx: p.x, dy: p.y, espera: rnd(0, 2), estado: 'corral', cara: Math.random() < .5 ? -1 : 1, paso: rnd(0, 6), lobo: null };
}

function mundoNuevo() {
  granjera = { x: W / 2, y: Math.min(H - 30 * S, corral.y + corral.r + IAN_ALTO * S + 10 * S), tx: 0, ty: 0, enfriar: 0, ang: -Math.PI / 2, retroceso: 0, paso: 0, giro: 1, brazo: 0, brazoObj: 0, apuntaT: 0, salto: 0, anda: false };
  granjera.tx = granjera.x; granjera.ty = granjera.y;
  ovejas = []; for (let i = 0; i < MAX_OVEJAS; i++) ovejas.push(nuevaOveja());
  lobos = []; balas = []; parts = []; premios = [];
  puntos = 0; superT = 0; temblor = 0; cartel = null;
}

function empezarPartida() {
  activarAudio();
  mundoNuevo();
  estado = 'jugando';
  mostrar('hud'); ocultar('menu'); ocultar('fin'); ocultar('pausa');
  dedoMover = null; dedosDisparo.clear();
  empezarOleada(1);
  ponerCartel('Oleada 1', 'Un dedo mueve a Ian · otro dedo dispara', 4);
}

function empezarOleada(n) {
  oleada = n; porSalir = 3 + n * 2; tSalida = 1.6; oleadaHecha = false;
  ponerCartel('Oleada ' + n);
}
function ponerCartel(texto, sub = '', t = 2.2) { cartel = { texto, sub, t, max: t }; }

function aparecerLobo() {
  const grande = oleada >= 3 && Math.random() < Math.min(0.35, 0.07 * oleada);
  const m = 40 * S, lado = Math.floor(Math.random() * 4);
  let x, y;
  if (lado === 0) { x = Math.random() * W; y = -m; }
  else if (lado === 1) { x = W + m; y = Math.random() * H; }
  else if (lado === 2) { x = Math.random() * W; y = H + m; }
  else { x = -m; y = Math.random() * H; }
  const vel = Math.min(120, 40 + oleada * 7) * S * rnd(0.9, 1.15) * (grande ? 0.75 : 1);
  lobos.push({ x, y, grande, vida: grande ? 3 : 1, vel, estado: 'caza', presa: null, lleva: null, cara: 1, paso: rnd(0, 6), golpe: 0, sx: 0, sy: 0 });
}

function texto(x, y, t, color = '#fff', tam = 24) {
  parts.push({ tipo: 'texto', x, y, vx: 0, vy: -50 * S, vida: 1, max: 1, t, color, tam });
}
function chispas(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, v = rnd(80, 240) * S;
    parts.push({ tipo: 'estrella', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * S, vida: rnd(.4, .8), max: .8, color, rot: rnd(0, 6) });
  }
}
function humo(x, y, n) {
  for (let i = 0; i < n; i++) parts.push({ tipo: 'humo', x: x + rnd(-10, 10) * S, y: y + rnd(-8, 8) * S, vx: rnd(-30, 30) * S, vy: rnd(-40, 0) * S, vida: rnd(.4, .7), max: .7, r: rnd(6, 12) * S });
}

// ---------- Actualizar ----------
function actualizar(dt) {
  if (estado === 'jugando' || estado === 'acabando') {
    actualizarGranjera(dt);
    actualizarLobos(dt);
    actualizarBalas(dt);
    actualizarPremios(dt);
    actualizarOleadas(dt);
  }
  actualizarOvejas(dt);
  actualizarParts(dt);
  if (cartel) { cartel.t -= dt; if (cartel.t <= 0) cartel = null; }
  temblor = Math.max(0, temblor - dt * 30);
  if (estado === 'acabando') { tFin -= dt; if (tFin <= 0) terminar(); }
  actualizarHud();
}

// Convierte un punto de la foto original (ya girado) a posición en pantalla
function escalaIan() { return IAN_ALTO * S / PIEZAS.alto; }
function aPantalla(px, py) {
  const g = granjera, k = escalaIan();
  return { x: g.x + g.giro * k * (px - IAN_CX), y: g.y - g.salto + k * (py - PIEZAS.alto) };
}
function girar(px, py, cx, cy, a) {
  const c = Math.cos(a), s = Math.sin(a), dx = px - cx, dy = py - cy;
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
}
function bocaCanon() {
  if (!ianOK) return { x: granjera.x, y: granjera.y - 60 * S };
  const p = girar(CANON.x, CANON.y, HOMBRO.x, HOMBRO.y, granjera.brazo);
  return aPantalla(p.x, p.y);
}
function apuntarA(tx, ty) {
  const g = granjera, k = escalaIan();
  if (Math.abs(tx - g.x) > 8 * S) g.giro = tx > g.x ? -1 : 1; // Ian se gira hacia donde dispara
  const px = (tx - g.x) / (g.giro * k) + IAN_CX, py = (ty - g.y + g.salto) / k + PIEZAS.alto;
  let r = Math.atan2(py - HOMBRO.y, px - HOMBRO.x) - BRAZO_REPOSO;
  while (r > Math.PI) r -= TAU; while (r < -Math.PI) r += TAU;
  g.brazoObj = Math.max(-0.35, Math.min(2.7, r));
  g.brazo = g.brazoObj; g.apuntaT = 0.8;
}

// Dedos: el primero mueve a Ian; cualquier otro dedo dispara hacia donde toca
let dedoMover = null;
const dedosDisparo = new Map();
let ultimoDisparo = 0;

function disparar(tx, ty, toque) {
  const g = granjera, ahora = performance.now() / 1000;
  if (toque ? ahora - ultimoDisparo < 0.12 : g.enfriar > 0) return;
  // ayuda: si tocas cerca de un lobo, apunta a él
  let mejor = null, md = 60 * S;
  for (const l of lobos) { const d = Math.hypot(l.x - tx, l.y - ty); if (d < md) { md = d; mejor = l; } }
  if (mejor) { tx = mejor.x; ty = mejor.y - 4 * S; }
  apuntarA(tx, ty);
  const boca = bocaCanon(), ang = Math.atan2(ty - boca.y, tx - boca.x);
  g.ang = ang; g.enfriar = superT > 0 ? 0.1 : 0.28; ultimoDisparo = ahora;
  const angs = superT > 0 ? [-0.16, 0, 0.16] : [0];
  for (const da of angs) {
    const a = ang + da, v = 760 * S;
    balas.push({ x: boca.x, y: boca.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1.2 });
  }
  g.retroceso = 1;
  parts.push({ tipo: 'fogonazo', x: boca.x, y: boca.y, vida: .06, max: .06, ang });
  sfx.disparo();
}

function actualizarGranjera(dt) {
  const g = granjera;
  const dx = g.tx - g.x, dy = g.ty - g.y, d = Math.hypot(dx, dy), vel = 320 * S;
  g.anda = d > 3;
  if (g.anda) { const p = Math.min(d, vel * dt); g.x += dx / d * p; g.y += dy / d * p; g.paso += dt * 13; }
  else g.paso += (Math.round(g.paso / Math.PI) * Math.PI - g.paso) * Math.min(1, dt * 10); // vuelve a estar de pie
  g.x = Math.max(30 * S, Math.min(W - 30 * S, g.x));
  g.y = Math.max(IAN_ALTO * S + 50 * S, Math.min(H - 10 * S, g.y));
  g.salto = Math.abs(Math.sin(g.paso)) * 5 * S * (g.anda ? 1 : 0);
  g.retroceso = Math.max(0, g.retroceso - dt * 8);
  g.enfriar -= dt; superT = Math.max(0, superT - dt);
  g.apuntaT -= dt;
  if (g.apuntaT <= 0) { // sin disparar: el brazo vuelve abajo y se balancea al andar
    const obj = g.anda ? Math.sin(g.paso) * 0.18 : 0;
    g.brazo += (obj - g.brazo) * Math.min(1, dt * 8);
  }
  if (estado !== 'jugando') return;
  for (const p of dedosDisparo.values()) disparar(p.x, p.y, false); // dedo apoyado: sigue disparando
}

function actualizarOvejas(dt) {
  for (const o of ovejas) {
    o.paso += dt * 10;
    if (o.estado === 'llevada') {
      const l = o.lobo, k = l.grande ? 1.4 : 1;
      o.x = l.x + l.cara * 26 * S * k; o.y = l.y + 2 * S; o.cara = -l.cara;
      continue;
    }
    if (o.estado === 'vuelve') {
      const dx = o.dx - o.x, dy = o.dy - o.y, d = Math.hypot(dx, dy);
      if (d < 4) { o.estado = 'corral'; o.espera = 1; }
      else { const p = Math.min(d, 110 * S * dt); o.x += dx / d * p; o.y += dy / d * p; o.cara = dx < 0 ? -1 : 1; }
      continue;
    }
    // en el corral: pasea y huye si hay un lobo cerca
    let miedo = null, md = 110 * S;
    for (const l of lobos) { if (l.estado !== 'caza') continue; const d = Math.hypot(l.x - o.x, l.y - o.y); if (d < md) { md = d; miedo = l; } }
    if (miedo) {
      const dx = o.x - miedo.x, dy = o.y - miedo.y, d = Math.hypot(dx, dy) || 1;
      o.x += dx / d * 60 * S * dt; o.y += dy / d * 60 * S * dt; o.cara = dx < 0 ? -1 : 1;
      dentroCorral(o); o.espera = 0.5;
      const p = puntoEnCorral(); o.dx = p.x; o.dy = p.y;
      continue;
    }
    if (o.espera > 0) { o.espera -= dt; o.paso -= dt * 10; continue; }
    const dx = o.dx - o.x, dy = o.dy - o.y, d = Math.hypot(dx, dy);
    if (d < 3) { o.espera = rnd(1, 3.5); const p = puntoEnCorral(); o.dx = p.x; o.dy = p.y; }
    else { const p = Math.min(d, 22 * S * dt); o.x += dx / d * p; o.y += dy / d * p; o.cara = dx < 0 ? -1 : 1; }
  }
}

function actualizarLobos(dt) {
  for (let i = lobos.length - 1; i >= 0; i--) {
    const l = lobos[i];
    l.paso += dt * 12; l.golpe = Math.max(0, l.golpe - dt);
    if (l.estado === 'caza') {
      if (!l.presa || l.presa.estado === 'llevada' || !ovejas.includes(l.presa)) {
        l.presa = null; let md = Infinity;
        for (const o of ovejas) { if (o.estado === 'llevada') continue; const d = Math.hypot(o.x - l.x, o.y - l.y); if (d < md) { md = d; l.presa = o; } }
      }
      const tx = l.presa ? l.presa.x - l.cara * 18 * S : corral.x, ty = l.presa ? l.presa.y : corral.y;
      const dx = tx - l.x, dy = ty - l.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 4) l.cara = dx < 0 ? -1 : 1;
      if (l.presa && d < 12 * S) {
        // ¡atrapa una oveja!
        const o = l.presa; o.estado = 'llevada'; o.lobo = l; l.lleva = o; l.estado = 'huye';
        const salidas = [[l.x, -70 * S], [l.x, H + 70 * S], [-70 * S, l.y], [W + 70 * S, l.y]];
        let best = salidas[0], bd = Infinity;
        for (const s of salidas) { const dd = Math.hypot(s[0] - l.x, s[1] - l.y); if (dd < bd) { bd = dd; best = s; } }
        l.sx = best[0]; l.sy = best[1];
        texto(o.x, o.y - 20 * S, '¡Beee!', '#fff', 20); sfx.bee();
      } else if (d > 1) {
        const p = Math.min(d, l.vel * dt); l.x += dx / d * p; l.y += dy / d * p;
      }
    } else if (l.estado === 'huye') {
      const dx = l.sx - l.x, dy = l.sy - l.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 4) l.cara = dx < 0 ? -1 : 1;
      const p = Math.min(d, l.vel * 0.62 * dt); if (d > 0) { l.x += dx / d * p; l.y += dy / d * p; }
      if (l.x < -55 * S || l.x > W + 55 * S || l.y < -55 * S || l.y > H + 55 * S || d < 2) {
        // se escapó con la oveja
        ovejas.splice(ovejas.indexOf(l.lleva), 1);
        lobos.splice(i, 1);
        temblor = 8;
        const tx = Math.max(60 * S, Math.min(W - 60 * S, l.x)), ty = Math.max(90 * S, Math.min(H - 40 * S, l.y));
        texto(tx, ty, '¡Se llevó una oveja!', '#ffd0d0', 20);
        if (ovejas.length === 0 && estado === 'jugando') { estado = 'acabando'; tFin = 1.6; sfx.perder(); }
      }
    }
  }
}

function actualizarBalas(dt) {
  for (let i = balas.length - 1; i >= 0; i--) {
    const b = balas[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.vida -= dt;
    let fuera = b.vida <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20;
    if (!fuera) {
      for (const l of lobos) {
        const r = (l.grande ? 30 : 23) * S;
        if (Math.hypot(l.x - b.x, l.y - 4 * S - b.y) < r) { golpear(l); fuera = true; break; }
      }
    }
    if (fuera) balas.splice(i, 1);
  }
}

const GRITOS = ['¡PAF!', '¡ZAS!', '¡TOMA!', '¡AÚÚÚ!', '¡PUM!', '¡FUERA!', '¡CATAPLÁN!'];
function golpear(l) {
  l.vida--; l.golpe = 0.12;
  if (l.vida > 0) { sfx.golpe(); chispas(l.x, l.y, 4, '#fff'); return; }
  lobos.splice(lobos.indexOf(l), 1);
  let gana = l.grande ? 30 : 10;
  if (l.lleva) {
    const o = l.lleva, p = puntoEnCorral();
    o.estado = 'vuelve'; o.lobo = null; o.dx = p.x; o.dy = p.y;
    gana += 15; texto(o.x, o.y - 26 * S, '¡Salvada!', '#c8ffb0', 20);
  }
  puntos += gana;
  parts.push({ tipo: 'lobo', x: l.x, y: l.y, vx: rnd(-120, 120) * S, vy: -340 * S, rot: 0, vr: (Math.random() < .5 ? -1 : 1) * rnd(8, 13), vida: 1.3, max: 1.3, grande: l.grande, cara: l.cara });
  chispas(l.x, l.y, 9, '#ffe14d'); humo(l.x, l.y, 5);
  texto(l.x, l.y - 30 * S, GRITOS[Math.floor(Math.random() * GRITOS.length)], '#fff', 28);
  texto(l.x, l.y - 4 * S, '+' + gana, '#ffe14d', 18);
  sfx.aullido();
  if (Math.random() < 0.08 && premios.length < 2) premios.push({ x: Math.max(30 * S, Math.min(W - 30 * S, l.x)), y: Math.max(90 * S, Math.min(H - 40 * S, l.y)), vida: 8, rot: 0 });
}

function actualizarPremios(dt) {
  for (let i = premios.length - 1; i >= 0; i--) {
    const p = premios[i]; p.vida -= dt; p.rot += dt * 2;
    if (Math.hypot(p.x - granjera.x, p.y - (granjera.y - IAN_ALTO * S * 0.4)) < 55 * S) {
      premios.splice(i, 1); superT = 7; sfx.estrella(); chispas(p.x, p.y, 12, '#ffe14d');
      texto(granjera.x, granjera.y - IAN_ALTO * S - 20 * S, '¡SUPERDISPARO!', '#ffe14d', 26);
    } else if (p.vida <= 0) premios.splice(i, 1);
  }
}

function actualizarOleadas(dt) {
  if (estado !== 'jugando') return;
  if (porSalir > 0) {
    tSalida -= dt;
    if (tSalida <= 0) {
      aparecerLobo(); porSalir--;
      if (oleada >= 5 && porSalir > 0 && Math.random() < 0.3) { aparecerLobo(); porSalir--; }
      tSalida = Math.max(0.4, 1.6 - oleada * 0.1) * rnd(0.6, 1.4);
    }
  } else if (lobos.length === 0 && !oleadaHecha) {
    oleadaHecha = true; tSiguiente = 2.8;
    const extra = 25 * oleada; puntos += extra;
    let sub = '+' + extra + ' puntos';
    if (ovejas.length < MAX_OVEJAS) {
      const o = nuevaOveja(); o.x = W / 2; o.y = -20 * S; o.estado = 'vuelve'; ovejas.push(o);
      sub += ' · ¡nueva oveja!';
    }
    ponerCartel('¡Oleada superada!', sub); sfx.oleada();
  }
  if (oleadaHecha) { tSiguiente -= dt; if (tSiguiente <= 0) empezarOleada(oleada + 1); }
}

function actualizarParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.vida -= dt;
    if (p.vida <= 0) { parts.splice(i, 1); continue; }
    if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; }
    if (p.tipo === 'estrella') { p.vy += 500 * S * dt; p.rot += dt * 8; }
    if (p.tipo === 'lobo') { p.vy += 700 * S * dt; p.rot += p.vr * dt; }
    if (p.tipo === 'humo') p.r += dt * 20 * S;
  }
}

// ---------- Dibujar ----------
function dibujar() {
  if (!fondo || !fondo.width || !fondo.height) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.save();
  if (temblor > 0) ctx.translate(rnd(-temblor, temblor) * S * 0.5, rnd(-temblor, temblor) * S * 0.5);
  ctx.drawImage(fondo, 0, 0, W, H);

  // ordenar por altura para que se vea con profundidad
  const cosas = [];
  for (const o of ovejas) cosas.push({ y: o.y, f: () => dibujarOveja(o) });
  for (const l of lobos) cosas.push({ y: l.y, f: () => dibujarLobo(l) });
  for (const p of premios) cosas.push({ y: p.y, f: () => dibujarPremio(p) });
  if (granjera && estado !== 'menu') cosas.push({ y: granjera.y, f: dibujarGranjera });
  cosas.sort((a, b) => a.y - b.y);
  for (const c of cosas) c.f();

  for (const b of balas) {
    ctx.strokeStyle = 'rgba(255,200,80,.5)'; ctx.lineWidth = 3 * S; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025); ctx.stroke();
    circulo(ctx, b.x, b.y, 4 * S, '#ff9a1f'); circulo(ctx, b.x - 1 * S, b.y - 1 * S, 1.8 * S, '#fff6c0');
  }
  for (const p of parts) dibujarPart(p);
  ctx.restore();

  if (superT > 0 && estado === 'jugando') {
    ctx.fillStyle = 'rgba(255,225,77,.95)'; ctx.font = `800 ${16 * S}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('⭐ Superdisparo ' + Math.ceil(superT), W / 2, H - 24 * S);
  }
  if (cartel) {
    const a = Math.min(1, cartel.t * 2, (cartel.max - cartel.t) * 4);
    ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center';
    textoBorde(cartel.texto, W / 2, H * 0.2, 38 * S, '#ffe35a', '#7a3d00');
    if (cartel.sub) textoBorde(cartel.sub, W / 2, H * 0.2 + 34 * S, 18 * S, '#fff', '#2d4d1a');
    ctx.globalAlpha = 1;
  }
}

function textoBorde(t, x, y, tam, relleno, borde) {
  ctx.font = `900 ${tam}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = tam * 0.22; ctx.strokeStyle = borde; ctx.strokeText(t, x, y);
  ctx.fillStyle = relleno; ctx.fillText(t, x, y);
}

function dibujarOveja(o) {
  const r = 13 * S, mov = o.estado !== 'corral' || o.espera <= 0;
  const salto = mov ? Math.abs(Math.sin(o.paso)) * 2.5 * S : 0;
  ctx.save(); ctx.translate(o.x, o.y);
  elipse(ctx, 0, r * 0.95, r * 1.15, r * 0.32, 'rgba(0,0,0,.18)');
  ctx.translate(0, -salto); ctx.scale(o.cara, 1);
  // patas
  ctx.fillStyle = '#2b2b2b';
  const pata = mov ? Math.sin(o.paso) * 2 * S : 0;
  for (const [px, s] of [[-r * .55, 1], [-r * .2, -1], [r * .2, 1], [r * .55, -1]]) ctx.fillRect(px - 1.5 * S, r * 0.35, 3 * S, r * 0.55 + pata * s);
  // lana
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 1.5 * S;
  for (const [dx, dy] of [[-.6, .05], [0, .25], [.55, .05], [-.3, -.3], [.25, -.32], [0, -.05]]) {
    ctx.beginPath(); ctx.arc(dx * r, dy * r, r * 0.55, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, r * .85, r * .5, 0, 0, TAU); ctx.fill();
  // cabeza
  elipse(ctx, r * 0.95, -r * 0.2, r * 0.42, r * 0.5, '#333');
  elipse(ctx, r * 0.7, -r * 0.5, r * 0.28, r * 0.12, '#333'); // oreja
  circulo(ctx, r * 0.85, -r * 0.65, r * 0.25, '#fff'); // tupé
  const asustada = o.estado === 'llevada';
  circulo(ctx, r * 1.1, -r * 0.28, (asustada ? 0.2 : 0.13) * r, '#fff');
  circulo(ctx, r * 1.13, -r * 0.28, 0.07 * r, '#000');
  if (asustada) { elipse(ctx, r * 1.15, r * 0.05, r * 0.1, r * 0.13, '#ff7a90'); circulo(ctx, -r * .2, -r * 1.05, r * 0.16, '#7fd0ff'); }
  ctx.restore();
}

function dibujarLobo(l, muerto = false) {
  const k = (l.grande ? 1.4 : 1) * S;
  ctx.save(); ctx.translate(l.x, l.y);
  if (!muerto) elipse(ctx, 0, 14 * k, 22 * k, 6 * k, 'rgba(0,0,0,.2)');
  if (l.golpe > 0) ctx.translate(rnd(-2, 2) * S, 0);
  if (muerto) ctx.rotate(l.rot);
  ctx.scale(l.cara * k, k);
  const pelo = l.grande ? '#5c5f6b' : '#8d929e', claro = l.grande ? '#8a8d99' : '#c3c7d0', oscuro = '#4a4d57';
  // cola
  ctx.fillStyle = pelo; ctx.beginPath(); ctx.moveTo(-16, -2); ctx.quadraticCurveTo(-34, -6 + Math.sin(l.paso) * 3, -32, -20); ctx.quadraticCurveTo(-26, -6, -14, 4); ctx.fill();
  circulo(ctx, -31, -18, 3.5, claro);
  // patas
  const m = muerto ? 0 : Math.sin(l.paso) * 4;
  ctx.fillStyle = oscuro;
  for (const [px, s] of [[-12, 1], [-6, -1], [8, 1], [14, -1]]) rr(ctx, px - 2.5, 4, 5, 11 + m * s * 0.5, 2), ctx.fill();
  // cuerpo
  elipse(ctx, 0, 0, 20, 11, pelo);
  elipse(ctx, 2, 4, 13, 6, claro);
  // cabeza
  circulo(ctx, 18, -9, 10, pelo);
  ctx.fillStyle = pelo; ctx.beginPath(); ctx.moveTo(11, -15); ctx.lineTo(13, -27); ctx.lineTo(19, -17); ctx.fill();
  ctx.beginPath(); ctx.moveTo(18, -17); ctx.lineTo(23, -27); ctx.lineTo(26, -13); ctx.fill();
  ctx.fillStyle = '#e8a0a8'; ctx.beginPath(); ctx.moveTo(13.5, -17); ctx.lineTo(14.5, -23.5); ctx.lineTo(17, -17.5); ctx.fill();
  elipse(ctx, 27, -5, 8, 4.8, claro); // hocico
  circulo(ctx, 34, -7, 2.6, '#1b1b1b'); // nariz
  if (muerto) {
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(18, -14); ctx.lineTo(24, -8); ctx.moveTo(24, -14); ctx.lineTo(18, -8); ctx.stroke();
    ctx.fillStyle = '#ff6b8a'; ctx.beginPath(); ctx.ellipse(28, 1, 2.5, 4, 0.3, 0, TAU); ctx.fill();
  } else {
    circulo(ctx, 21, -11, 3.4, '#ffe14d');
    circulo(ctx, 22, -11, 1.6, '#000');
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(17, -16); ctx.lineTo(25, -13); ctx.stroke(); // ceja de malo
    if (!l.lleva) {
      ctx.fillStyle = '#7a1020'; ctx.beginPath(); ctx.moveTo(22, -2); ctx.lineTo(34, -3); ctx.lineTo(30, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      for (const tx of [25, 29]) { ctx.beginPath(); ctx.moveTo(tx, -2.5); ctx.lineTo(tx + 1.5, 0.5); ctx.lineTo(tx + 3, -2.6); ctx.fill(); }
    }
  }
  if (l.golpe > 0) { ctx.globalAlpha = .5; elipse(ctx, 5, -4, 26, 16, '#fff'); ctx.globalAlpha = 1; }
  ctx.restore();
  if (l.grande && !muerto) {
    for (let i = 0; i < 3; i++) circulo(ctx, l.x - 10 * S + i * 10 * S, l.y - 44 * S, 3.5 * S, i < l.vida ? '#ff4d4d' : 'rgba(0,0,0,.25)');
  }
}

function dibujarCara(x, y, r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.closePath();
  {
    // cara dibujada (solo si no carga la foto de Ian)
    ctx.fillStyle = '#f2c9a0'; ctx.fill();
    circulo(ctx, x - r * .35, y - r * .05, r * .1, '#3b2a14'); circulo(ctx, x + r * .35, y - r * .05, r * .1, '#3b2a14');
    circulo(ctx, x - r * .55, y + r * .25, r * .14, 'rgba(255,120,120,.5)'); circulo(ctx, x + r * .55, y + r * .25, r * .14, 'rgba(255,120,120,.5)');
    ctx.strokeStyle = '#3b2a14'; ctx.lineWidth = r * .08; ctx.beginPath(); ctx.arc(x, y + r * .2, r * .3, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 * S; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
}

function dibujarGranjera() {
  if (ianOK) return dibujarIan();
  ctx.save(); ctx.translate(0, -30 * S); dibujarMunyeco(); ctx.restore();
}

function dibujarIan() {
  const g = granjera, k = escalaIan(), h = IAN_ALTO * S, A = PIEZAS.alto;
  elipse(ctx, g.x, g.y, 34 * S, 8 * S, 'rgba(0,0,0,.25)');
  if (superT > 0) {
    ctx.globalAlpha = .28 + .18 * Math.sin(performance.now() / 80);
    elipse(ctx, g.x, g.y - h / 2, h * 0.38, h * 0.6, '#ffe14d'); ctx.globalAlpha = 1;
  }
  const pieza = (n, rot, piv) => {
    const p = piezasIan[n];
    ctx.save();
    if (rot) { ctx.translate(piv.x - IAN_CX, piv.y - A); ctx.rotate(rot); ctx.translate(-(piv.x - IAN_CX), -(piv.y - A)); }
    ctx.drawImage(p.c, p.x - IAN_CX, p.y - A, p.w, p.h);
    ctx.restore();
  };
  const piernas = g.anda ? Math.sin(g.paso) * 0.3 : 0;
  ctx.save();
  ctx.translate(g.x, g.y - g.salto);
  ctx.scale(g.giro * k, k);
  pieza('piernaI', piernas, CADERA_I);
  pieza('piernaD', -piernas, CADERA_D);
  pieza('cuerpo', 0);
  pieza('brazo', g.brazo - g.retroceso * 0.12, HOMBRO);
  ctx.restore();
  if (superT > 0) estrella(ctx, g.x, g.y - h - 14 * S - g.salto, 10 * S, performance.now() / 300, '#ffe14d');
}

function dibujarMunyeco() {
  const g = granjera, s = S;
  const andar = Math.sin(g.paso) * 4 * s, mov = Math.hypot(g.tx - g.x, g.ty - g.y) > 2;
  ctx.save(); ctx.translate(g.x, g.y);
  elipse(ctx, 0, 30 * s, 24 * s, 7 * s, 'rgba(0,0,0,.22)');
  // botas
  ctx.fillStyle = '#5a3415';
  rr(ctx, -12 * s, 18 * s + (mov ? andar : 0), 10 * s, 12 * s, 3 * s); ctx.fill();
  rr(ctx, 2 * s, 18 * s - (mov ? andar : 0), 10 * s, 12 * s, 3 * s); ctx.fill();
  // camisa y peto
  ctx.fillStyle = '#d63a3a'; rr(ctx, -16 * s, -6 * s, 32 * s, 20 * s, 8 * s); ctx.fill();
  ctx.fillStyle = '#2f6fd6'; rr(ctx, -13 * s, 0, 26 * s, 22 * s, 6 * s); ctx.fill();
  ctx.fillRect(-9 * s, -6 * s, 4 * s, 8 * s); ctx.fillRect(5 * s, -6 * s, 4 * s, 8 * s);
  circulo(ctx, -7 * s, 2 * s, 1.8 * s, '#ffd23a'); circulo(ctx, 7 * s, 2 * s, 1.8 * s, '#ffd23a');
  ctx.fillStyle = '#255bb3'; rr(ctx, -6 * s, 8 * s, 12 * s, 8 * s, 2 * s); ctx.fill(); // bolsillo
  // escopeta de corchos (gira hacia el lobo)
  ctx.save(); ctx.translate(0, -4 * s); ctx.rotate(g.ang);
  const re = -g.retroceso * 5 * s;
  ctx.fillStyle = '#8b5a2b'; rr(ctx, re - 4 * s, -4 * s, 18 * s, 8 * s, 3 * s); ctx.fill();
  ctx.fillStyle = '#6b6f7a'; rr(ctx, re + 12 * s, -2.5 * s, 22 * s, 5 * s, 2 * s); ctx.fill();
  ctx.fillStyle = '#ffd23a'; ctx.fillRect(re + 31 * s, -3 * s, 3 * s, 6 * s);
  circulo(ctx, re + 6 * s, 3 * s, 4 * s, '#f2c9a0'); circulo(ctx, re + 16 * s, 3 * s, 4 * s, '#f2c9a0'); // manos
  ctx.restore();
  // cabeza con la foto real
  const r = 24 * s, cy = -26 * s;
  ctx.fillStyle = '#a0522d'; ctx.beginPath(); ctx.ellipse(-r * .95, cy + r * .5, 6 * s, 12 * s, 0.3, 0, TAU); ctx.ellipse(r * .95, cy + r * .5, 6 * s, 12 * s, -0.3, 0, TAU); ctx.fill(); // trenzas
  dibujarCara(0, cy, r);
  // sombrero de paja
  elipse(ctx, 0, cy - r * 0.78, r * 1.45, r * 0.32, '#e8b84a');
  ctx.fillStyle = '#f0c75e'; rr(ctx, -r * 0.7, cy - r * 1.45, r * 1.4, r * 0.7, r * 0.3); ctx.fill();
  ctx.fillStyle = '#d63a3a'; ctx.fillRect(-r * 0.7, cy - r * 0.98, r * 1.4, r * 0.16);
  ctx.strokeStyle = 'rgba(140,90,20,.5)'; ctx.lineWidth = 1 * s;
  ctx.beginPath(); ctx.ellipse(0, cy - r * 0.78, r * 1.45, r * 0.32, 0, 0, TAU); ctx.stroke();
  if (superT > 0) { ctx.globalAlpha = .35 + .25 * Math.sin(performance.now() / 80); estrella(ctx, 0, cy - r * 1.75, 9 * s, 0, '#ffe14d'); ctx.globalAlpha = 1; }
  ctx.restore();
}

function dibujarPremio(p) {
  if (p.vida < 2 && Math.floor(p.vida * 8) % 2) return;
  const y = p.y + Math.sin(p.rot * 2) * 3 * S;
  elipse(ctx, p.x, p.y + 14 * S, 12 * S, 4 * S, 'rgba(0,0,0,.2)');
  ctx.globalAlpha = .35; circulo(ctx, p.x, y, 22 * S, '#fff6a0'); ctx.globalAlpha = 1;
  estrella(ctx, p.x, y, 15 * S, p.rot * 0.3, '#ffcc00');
  estrella(ctx, p.x, y, 9 * S, p.rot * 0.3, '#fff2a0');
}

function dibujarPart(p) {
  const a = Math.max(0, p.vida / p.max);
  if (p.tipo === 'texto') {
    ctx.globalAlpha = Math.min(1, a * 2); textoBorde(p.t, p.x, p.y, p.tam * S, p.color, '#3b2a14'); ctx.globalAlpha = 1;
  } else if (p.tipo === 'estrella') {
    ctx.globalAlpha = a; estrella(ctx, p.x, p.y, 5 * S, p.rot, p.color); ctx.globalAlpha = 1;
  } else if (p.tipo === 'humo') {
    ctx.globalAlpha = a * 0.7; circulo(ctx, p.x, p.y, p.r, '#f4f4f4'); ctx.globalAlpha = 1;
  } else if (p.tipo === 'fogonazo') {
    estrella(ctx, p.x, p.y, 10 * S, p.ang, '#fff2a0');
  } else if (p.tipo === 'lobo') {
    ctx.globalAlpha = Math.min(1, a * 2); dibujarLobo(p, true); ctx.globalAlpha = 1;
  }
}

// ---------- Interfaz ----------
const hudCache = {};
function ponerTexto(id, t) { if (hudCache[id] !== t) { hudCache[id] = t; $(id).textContent = t; } }
function actualizarHud() {
  if (estado === 'menu') return;
  ponerTexto('hudPuntos', '⭐ ' + puntos);
  ponerTexto('hudOvejas', '🐑 ' + ovejas.length);
  ponerTexto('hudOleada', 'Oleada ' + oleada);
}
function mostrar(id) { $(id).classList.remove('oculto'); }
function ocultar(id) { $(id).classList.add('oculto'); }
function pintarSonido() { $('btnSonido').textContent = mudo ? '🔇 Sonido: no' : '🔊 Sonido: sí'; }
function pintarRecord() { $('menuRecord').textContent = record ? 'Tu récord: ' + record : ''; }

function terminar() {
  estado = 'fin';
  const nuevo = puntos > record;
  if (nuevo) { record = puntos; localStorage.setItem('fl_record', record); }
  $('finPuntos').textContent = puntos + ' puntos · oleada ' + oleada;
  $('finRecord').textContent = nuevo ? '🏆 ¡Nuevo récord!' : 'Tu récord: ' + record;
  ocultar('hud'); mostrar('fin');
}
function pausar() { if (estado !== 'jugando') return; estado = 'pausa'; mostrar('pausa'); }
function seguir() { if (estado !== 'pausa') return; activarAudio(); estado = 'jugando'; ocultar('pausa'); }
function irAlMenu() {
  estado = 'menu'; mundoNuevo(); pintarRecord();
  ocultar('hud'); ocultar('fin'); ocultar('pausa'); mostrar('menu');
}

$('btnJugar').onclick = empezarPartida;
$('btnOtra').onclick = empezarPartida;
$('btnMenu').onclick = irAlMenu;
$('btnSalir').onclick = irAlMenu;
$('btnPausa').onclick = pausar;
$('btnSeguir').onclick = seguir;
$('btnSonido').onclick = () => { mudo = !mudo; localStorage.setItem('fl_mudo', mudo ? '1' : '0'); pintarSonido(); activarAudio(); sfx.bee(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); });

function moverA(e) {
  granjera.tx = e.clientX;
  granjera.ty = e.clientY - 40 * S; // Ian va un poco por encima del dedo para que se vea
}
cv.addEventListener('pointerdown', e => {
  if (estado !== 'jugando') return;
  if (dedoMover === null) { dedoMover = e.pointerId; moverA(e); }
  else { dedosDisparo.set(e.pointerId, { x: e.clientX, y: e.clientY }); disparar(e.clientX, e.clientY, true); }
});
cv.addEventListener('pointermove', e => {
  if (estado !== 'jugando') return;
  if (e.pointerId === dedoMover) moverA(e);
  else if (dedosDisparo.has(e.pointerId)) dedosDisparo.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
const soltar = e => { if (e.pointerId === dedoMover) dedoMover = null; dedosDisparo.delete(e.pointerId); };
cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());

// ---------- Arranque ----------
window.addEventListener('resize', resize);
resize(); mundoNuevo(); pintarSonido(); pintarRecord();
let ultimo = 0;
function bucle(t) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.05, ultimo ? (t - ultimo) / 1000 : 0); ultimo = t;
  if (estado !== 'pausa') actualizar(dt);
  dibujar();
}
requestAnimationFrame(bucle);

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
