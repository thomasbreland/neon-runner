// Neon Runner — endless 3D runner. Module script; three.js bundled by Vite.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// ---------- Tuning constants ----------
const LANE_X = [-2.2, 0, 2.2];
const SPAWN_Z = -120;
const DESPAWN_Z = 14;
const BASE_SPEED = 13;
const MAX_SPEED = 44;
const SPEED_RAMP = 0.4;
const JUMP_V = 10.4;
const GRAVITY = 27;
const SLIDE_TIME = 0.7;
const LANE_SPEED = 11; // lanes/s while strafing
const SPAWN_GAP = 16;

// ---------- DOM ----------
const canvas = document.getElementById("c");
const scoreEl = document.getElementById("score");
const speedEl = document.getElementById("speed");
const bestEl = document.getElementById("best");
const centerEl = document.getElementById("center");
const subEl = document.getElementById("sub");

let best = 0;
try { best = parseInt(localStorage.getItem("neonRunnerBest") || "0", 10); } catch (e) { /* private mode */ }

// ---------- Audio (procedural WebAudio SFX) ----------
let actx = null;
try { actx = new AudioContext(); } catch (e) { /* no audio */ }

function tone(freq, dur, type = "triangle", vol = 0.2, slideTo = null) {
  if (!actx) return;
  const t0 = actx.currentTime;
  const osc = actx.createOscillator();
  const g = actx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g);
  g.connect(actx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

function crashNoise() {
  if (!actx) return;
  const dur = 0.35;
  const buf = actx.createBuffer(1, Math.floor(actx.sampleRate * dur), actx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (1 - t);
  }
  const src = actx.createBufferSource();
  src.buffer = buf;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.5, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
  src.connect(g);
  g.connect(actx.destination);
  src.start();
  tone(160, 0.3, "sawtooth", 0.25, 60);
}

function sfxCoin() { tone(880, 0.12, "triangle", 0.15, 1320); }
function sfxJump() { tone(300, 0.18, "square", 0.12, 600); }

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0520);
scene.fog = new THREE.Fog(0x0b0520, 34, 115);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
camera.position.set(0, 3.4, 7.5);

scene.add(new THREE.HemisphereLight(0x88aaff, 0x220833, 0.7));
const dirLight = new THREE.DirectionalLight(0xff66cc, 0.8);
dirLight.position.set(6, 12, 4);
scene.add(dirLight);

// ---------- Material helper ----------
function neon(color, intensity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0.2,
  });
}

// ---------- Scrolling grid ground ----------
function makeGridTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#05010f";
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#22d9ff";
  g.lineWidth = 3;
  g.shadowColor = "#22d9ff";
  g.shadowBlur = 8;
  for (let i = 0; i <= 512; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 60);
  return tex;
}
const gridTex = makeGridTexture();
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 400),
  new THREE.MeshBasicMaterial({ map: gridTex })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, 0, -160);
scene.add(ground);

// ---------- Synthwave sun ----------
function makeSunTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#ffd166");
  grad.addColorStop(0.5, "#ff4bd8");
  grad.addColorStop(1, "#7b2cbf");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(256, 256, 250, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = "destination-out";
  for (let y = 280; y < 512; y += 24) {
    const h = ((y - 280) / 232) * 14;
    g.fillRect(0, y, 512, Math.max(2, h));
  }
  return new THREE.CanvasTexture(c);
}
const sun = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshBasicMaterial({ map: makeSunTexture(), transparent: true, fog: false })
);
sun.position.set(0, 14, -140);
scene.add(sun);

// ---------- Stars ----------
{
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 600; i++) {
    starPos.push((Math.random() - 0.5) * 240, 20 + Math.random() * 90, -40 - Math.random() * 200);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, fog: false }));
  scene.add(stars);
}

// ---------- Side neon rails ----------
for (const sx of [-4.4, 4.4]) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 300), neon(0xff4bd8, 1.4));
  rail.position.set(sx, 0.08, -130);
  scene.add(rail);
}

// ---------- Player ----------
const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.7), neon(0x7bdcff, 1.2));
body.position.y = 0.85;
const visor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.2), neon(0xff4bd8, 2));
visor.position.set(0, 1.15, 0.36);
const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24), neon(0xffd166, 1.5));
disc.position.y = 0.05;
player.add(body, visor, disc);
scene.add(player);

// ---------- World objects ----------
const world = []; // { mesh, kind, lane }

function laneIndexAt(x) {
  let bi = 0;
  let bd = Infinity;
  for (let i = 0; i < 3; i++) {
    const d = Math.abs(x - LANE_X[i]);
    if (d < bd) { bd = d; bi = i; }
  }
  return bi;
}

function addObstacle(kind, laneIdx, z) {
  let mesh;
  if (kind === "wall") {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.4, 0.5), neon(0xff2d55, 1.1));
    mesh.position.set(LANE_X[laneIdx], 1.2, z);
  } else if (kind === "hurdle") {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.4), neon(0xffd166, 1.2));
    mesh.position.set(LANE_X[laneIdx], 0.35, z);
  } else {
    // overhead bar: hangs from y=1.1 to y=2.7 — slide under it
    mesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.6, 0.4), neon(0xb066ff, 1.2));
    mesh.position.set(LANE_X[laneIdx], 1.9, z);
  }
  scene.add(mesh);
  world.push({ mesh, kind, lane: laneIdx });
}

function addCoin(x, y, z) {
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), neon(0xffd166, 1.6));
  mesh.position.set(x, y, z);
  scene.add(mesh);
  world.push({ mesh, kind: "coin", lane: laneIndexAt(x) });
}

function addPillar(z) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const h = 4 + Math.random() * 6;
  const color = Math.random() < 0.5 ? 0x22d9ff : 0xff4bd8;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, h, 0.6), neon(color, 1));
  mesh.position.set(9.5 * side, h / 2, z);
  scene.add(mesh);
  world.push({ mesh, kind: "pillar", lane: -1 });
}

// ---------- Spawn patterns ----------
function spawnRow() {
  const r = Math.random();
  const freeLane = Math.floor(Math.random() * 3);
  if (r < 0.3) {
    // wall pattern: walls block two lanes, coin trail in the free lane
    for (let i = 0; i < 3; i++) if (i !== freeLane) addObstacle("wall", i, SPAWN_Z);
    for (let k = 0; k < 3; k++) addCoin(LANE_X[freeLane], 1, SPAWN_Z + k * 2.5);
  } else if (r < 0.55) {
    // low hurdles across all lanes, coin arc over the free lane
    for (let i = 0; i < 3; i++) addObstacle("hurdle", i, SPAWN_Z);
    addCoin(LANE_X[freeLane], 1, SPAWN_Z - 4);
    addCoin(LANE_X[freeLane], 1.8, SPAWN_Z - 1.5);
    addCoin(LANE_X[freeLane], 1, SPAWN_Z + 1);
  } else if (r < 0.8) {
    // overhead bars in two lanes, coins in the free lane
    for (let i = 0; i < 3; i++) if (i !== freeLane) addObstacle("bar", i, SPAWN_Z);
    for (let k = 0; k < 3; k++) addCoin(LANE_X[freeLane], 1, SPAWN_Z + k * 2.5);
  } else {
    // coin line / zigzag
    let lane = freeLane;
    for (let k = 0; k < 6; k++) {
      addCoin(LANE_X[lane], 1, SPAWN_Z + k * 2.5);
      if (k % 2 === 1) lane = Math.min(2, Math.max(0, lane + (Math.random() < 0.5 ? -1 : 1)));
    }
  }
}

// ---------- Game state ----------
let state = "menu"; // menu | play | paused | dead
let dist = 0;
let score = 0;
let speed = BASE_SPEED;
let survived = 0;
let laneTarget = 1;
let py = 0;
let vy = 0;
let grounded = true;
let sliding = 0;
let shake = 0;
let nextSpawn = 0;
let nextPillar = 0;

function reset() {
  for (const w of world) scene.remove(w.mesh);
  world.length = 0;
  dist = 0;
  score = 0;
  speed = BASE_SPEED;
  survived = 0;
  laneTarget = 1;
  py = 0;
  vy = 0;
  grounded = true;
  sliding = 0;
  nextSpawn = 0;
  nextPillar = 0;
  player.position.set(0, 0, 0);
  player.scale.set(1, 1, 1);
  state = "play";
  centerEl.textContent = "";
  subEl.textContent = "";
}

function die() {
  state = "dead";
  shake = 0.5;
  crashNoise();
  if (score > best) {
    best = score;
    try { localStorage.setItem("neonRunnerBest", String(best)); } catch (e) { /* private mode */ }
  }
  centerEl.textContent = "CRASHED";
  subEl.textContent = "press R or Enter to run again";
}

// ---------- Update ----------
function update(dt) {
  if (state === "paused" || state === "dead") return;

  if (state === "play" || state === "menu") {
    if (state === "play") {
      speed = Math.min(MAX_SPEED, speed + SPEED_RAMP * dt);
      survived += dt;
    }
    dist += speed * dt;
    while (dist >= nextSpawn) {
      spawnRow();
      nextSpawn += SPAWN_GAP + Math.random() * 8 - Math.min(6, survived * 0.1);
    }
    while (dist >= nextPillar) {
      addPillar(SPAWN_Z);
      nextPillar += 10;
    }
    if (state === "play") score = Math.floor(dist);
  }

  // move world toward player
  const dz = speed * dt;
  for (let i = world.length - 1; i >= 0; i--) {
    const w = world[i];
    w.mesh.position.z += dz;
    if (w.kind === "coin") w.mesh.rotation.y += 3 * dt;
    if (w.mesh.position.z > DESPAWN_Z) {
      scene.remove(w.mesh);
      world.splice(i, 1);
    }
  }

  // strafe toward target lane
  const targetX = LANE_X[laneTarget];
  const dx = targetX - player.position.x;
  const step = LANE_SPEED * dt;
  player.position.x += Math.abs(dx) <= step ? dx : Math.sign(dx) * step;

  // jump / gravity
  if (!grounded) {
    vy -= GRAVITY * dt;
    py += vy * dt;
    if (py <= 0) { py = 0; vy = 0; grounded = true; }
  }
  if (sliding > 0) sliding = Math.max(0, sliding - dt);
  player.position.y = py;
  player.scale.y = sliding > 0 ? 0.5 : 1;

  // collision (only while playing)
  if (state === "play") {
    const px = player.position.x;
    const pLane = laneIndexAt(px);
    for (let i = world.length - 1; i >= 0; i--) {
      const w = world[i];
      const z = w.mesh.position.z;
      if (w.lane !== pLane) continue;
      if (w.kind === "coin") {
        if (Math.abs(z) < 0.9) {
          const coinY = w.mesh.position.y;
          const playerTop = py + (sliding > 0 ? 0.8 : 1.7);
          if (coinY >= py - 0.4 && coinY <= playerTop + 0.4) {
            scene.remove(w.mesh);
            world.splice(i, 1);
            score += 10;
            sfxCoin();
          }
        }
      } else if (w.kind !== "pillar" && Math.abs(z) < 0.8) {
        const hit =
          w.kind === "wall" ? true :
          w.kind === "hurdle" ? py < 0.75 :
          sliding <= 0; // overhead bar: only a slide clears it
        if (hit) { die(); break; }
      }
    }
  }

  // HUD
  scoreEl.textContent = String(score);
  speedEl.textContent = Math.round(speed) + " m/s";
  bestEl.textContent = "BEST " + best;

  // camera follow + speed FOV kick + shake
  const t = (speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
  camera.fov = 60 + t * 12;
  camera.updateProjectionMatrix();
  camera.position.x = player.position.x * 0.5;
  camera.position.y = 3.4 + Math.sin(performance.now() * 0.002) * 0.05;
  if (shake > 0) {
    shake = Math.max(0, shake - dt * 2);
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
  }
  camera.lookAt(player.position.x, 1.2, -4);
}

// ---------- Actions (shared by keyboard, swipe gestures and the touch widget) ----------
function doStrafeLeft() {
  laneTarget = Math.max(0, laneTarget - 1);
}
function doStrafeRight() {
  laneTarget = Math.min(2, laneTarget + 1);
}
function doJump() {
  if (grounded && sliding <= 0) {
    vy = JUMP_V;
    grounded = false;
    sfxJump();
  }
}
function doSlide() {
  if (grounded) {
    sliding = SLIDE_TIME;
  } else {
    vy = -JUMP_V * 0.6; // fast-fall while airborne
  }
}
function togglePause() {
  if (state === "paused") {
    state = "play";
    centerEl.textContent = "";
    subEl.textContent = "";
  } else if (state === "play") {
    state = "paused";
    centerEl.textContent = "PAUSED";
    subEl.textContent = "press P to resume";
  }
}

// ---------- Input ----------
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (state === "dead") {
    if (k === "r" || k === "enter") reset();
    return;
  }
  if (state === "menu") {
    if (!e.repeat) reset();
    return;
  }
  if (state === "paused") {
    if (k === "p") togglePause();
    return;
  }

  // playing
  if (k === "p") {
    togglePause();
    return;
  }
  if (k === "arrowleft" || k === "a") {
    doStrafeLeft();
  } else if (k === "arrowright" || k === "d") {
    doStrafeRight();
  } else if (k === "arrowup" || k === "w" || k === " ") {
    doJump();
  } else if (k === "arrowdown" || k === "s") {
    doSlide();
  }
});

// ---------- Swipe gestures (touch / mouse drag on the canvas) ----------
// One action per gesture: each pointerId tracks its origin and fires at most
// once, so a long drag changes lanes a single time. Multi-touch works because
// each finger has its own pointerId.
const gestures = new Map();
canvas.addEventListener("pointerdown", (e) => {
  if (state === "dead") { reset(); return; }
  if (state === "menu") { reset(); return; }
  if (state === "paused") return;
  gestures.set(e.pointerId, { x: e.clientX, y: e.clientY, armed: true });
});
canvas.addEventListener("pointermove", (e) => {
  const g = gestures.get(e.pointerId);
  if (!g || !g.armed) return;
  const rect = canvas.getBoundingClientRect();
  const T = Math.max(30, Math.min(rect.width, rect.height) * 0.07);
  const dx = e.clientX - g.x;
  const dy = e.clientY - g.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < T) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) doStrafeLeft();
    else doStrafeRight();
  } else {
    if (dy < 0) doJump();
    else doSlide();
  }
  g.armed = false;
});
canvas.addEventListener("pointerup", (e) => gestures.delete(e.pointerId));
canvas.addEventListener("pointercancel", (e) => gestures.delete(e.pointerId));

// ---------- Touch widget buttons (corner fallback for touch devices) ----------
function tapButton(id, action) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("pointerdown", () => {
    if (state === "menu" || state === "dead") { reset(); return; }
    if (state === "paused") return;
    action();
  });
}
tapButton("btn-left", doStrafeLeft);
tapButton("btn-right", doStrafeRight);
tapButton("btn-up", doJump);
tapButton("btn-down", doSlide);

// The pause button works in both play and paused states.
document.getElementById("pause-btn").addEventListener("pointerdown", () => togglePause());

// ---------- Prevent default gestures, e.g., double-tap zoom, on mobile controls ----------
const controls = document.querySelector("#touchpad");
let lastTouchEnd = 0;
controls.addEventListener(
  "touchend",
  (event) => {
    const now = performance.now();
    if (now - lastTouchEnd <= 350) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  },
  { passive: false }
);

// ---------- Postprocessing (bloom) with fallback ----------
let composer = null;
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.45, 0.55, 0.3));
  composer.addPass(new OutputPass());
} catch (e) {
  composer = null;
}

// ---------- Resize ----------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  if (composer) composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ---------- Menu attract screen ----------
centerEl.textContent = "NEON RUNNER";
subEl.textContent = "press any key to start";

// ---------- Main loop ----------
let last = performance.now();
function tick() {
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  if (composer) composer.render();
  else renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
