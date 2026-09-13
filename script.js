// ======================================================================
// PIXEL QUEST ADVENTURE - script.js
// Game platformer 2D sederhana menggunakan HTML5 Canvas + Vanilla JS
// ======================================================================

// ==============================
// KONSTANTA GAME
// ==============================
const GAME_WIDTH = 480;     // lebar "dunia layar" logis (bukan piksel asli layar HP)
const GAME_HEIGHT = 270;    // tinggi "dunia layar" logis
const GRAVITY = 0.005;        // percepatan jatuh
const JUMP_VELOCITY = -1; // kecepatan awal saat lompat (negatif = ke atas)
const MOVE_SPEED = 2.3;     // kecepatan jalan kiri/kanan
const MAX_FALL_SPEED = 9;   // batas kecepatan jatuh maksimum
const PLAYER_W = 20;
const PLAYER_H = 28;
const STORAGE_KEY = 'pixelQuestProgress';
const VOID_DEATH_Y = 420;   // kalau player jatuh melebihi ini -> mati

// ==============================
// STATE GLOBAL
// ==============================
let canvas, ctx;
let dpr = 1;

let gameState = 'menu'; // 'playing' | 'paused' | 'gameover' | 'stagecomplete' | 'win'
let currentStageIndex = 0;
let unlockedStage = 1;

const input = { left: false, right: false, jumpQueued: false };
const camera = { x: 0 };

let player = null;
let activeLevel = null; // hasil clone dari LEVELS[i]
let score = 0;
let coinCount = 0;
let lives = 3;
let startTime = 0;

let soundOn = true;
let audioCtx = null;

let loopRunning = false;
let lastTimestamp = 0;

// ==============================
// LEVEL DATA
// (semua koordinat dalam satuan "dunia" logis, bukan piksel layar asli)
// ==============================
const LEVELS = [
  // ------------------------------------------------------------------
  // STAGE 1 - GREEN VALLEY (EASY)
  // ------------------------------------------------------------------
  {
    name: 'GREEN VALLEY',
    difficulty: 'Easy',
    theme: 'valley',
    width: 2650,
    playerStart: { x: 40, y: 190 },
    platforms: [
      { type: 'ground', x: 0, y: 240, w: 520, h: 60 },
      { type: 'ground', x: 590, y: 240, w: 330, h: 60 },
      { type: 'ground', x: 1000, y: 240, w: 380, h: 60 },
      { type: 'ground', x: 1550, y: 240, w: 450, h: 60 },
      { type: 'ground', x: 2070, y: 240, w: 580, h: 60 },

      { type: 'platform', x: 230, y: 175, w: 90, h: 16 },
      { type: 'platform', x: 650, y: 155, w: 90, h: 16 },
      { type: 'platform', x: 1120, y: 170, w: 100, h: 16 },
      { type: 'platform', x: 1650, y: 160, w: 100, h: 16 },
      { type: 'platform', x: 2150, y: 150, w: 90, h: 16 },

      { type: 'moving-h', x: 1400, y: 220, w: 80, h: 16, minX: 1400, maxX: 1520, speed: 0.9, dir: 1 }
    ],
    spikes: [
      { x: 760, y: 224, w: 26, h: 16 },
      { x: 1220, y: 224, w: 26, h: 16 },
      { x: 1750, y: 224, w: 26, h: 16 }
    ],
    coins: [
      { x: 260, y: 150 }, { x: 290, y: 150 }, { x: 320, y: 150 },
      { x: 680, y: 130 }, { x: 710, y: 130 },
      { x: 1140, y: 145 }, { x: 1170, y: 145 }, { x: 1200, y: 145 },
      { x: 1670, y: 135 }, { x: 1700, y: 135 },
      { x: 2170, y: 125 }, { x: 2200, y: 125 }, { x: 2230, y: 125 },
      { x: 100, y: 210 }, { x: 130, y: 210 }
    ],
    enemies: [
      { x: 1080, y: 216, w: 24, h: 24, minX: 1020, maxX: 1340, speed: 0.8, dir: 1 },
      { x: 1720, y: 216, w: 24, h: 24, minX: 1600, maxX: 1950, speed: 1.0, dir: -1 }
    ],
    checkpoints: [
      { x: 1560, y: 190, w: 20, h: 50 }
    ],
    finish: { x: 2580, y: 160, w: 40, h: 80 }
  },

  // ------------------------------------------------------------------
  // STAGE 2 - CRYSTAL CAVE (MEDIUM)
  // ------------------------------------------------------------------
  {
    name: 'CRYSTAL CAVE',
    difficulty: 'Medium',
    theme: 'cave',
    width: 3100,
    playerStart: { x: 40, y: 190 },
    platforms: [
      { type: 'ground', x: 0, y: 240, w: 380, h: 60 },
      { type: 'ground', x: 480, y: 240, w: 220, h: 60 },
      { type: 'ground', x: 820, y: 240, w: 200, h: 60 },
      { type: 'ground', x: 1180, y: 240, w: 180, h: 60 },
      { type: 'ground', x: 1650, y: 240, w: 220, h: 60 },
      { type: 'ground', x: 2050, y: 240, w: 200, h: 60 },
      { type: 'ground', x: 2420, y: 240, w: 680, h: 60 },

      { type: 'platform', x: 260, y: 175, w: 80, h: 16 },
      { type: 'platform', x: 640, y: 150, w: 70, h: 16 },
      { type: 'platform', x: 960, y: 190, w: 70, h: 16 },
      { type: 'platform', x: 1420, y: 175, w: 70, h: 16 },
      { type: 'platform', x: 2260, y: 190, w: 70, h: 16 },
      { type: 'platform', x: 2650, y: 160, w: 80, h: 16 },
      { type: 'platform', x: 2860, y: 130, w: 80, h: 16 },

      { type: 'moving-h', x: 700, y: 210, w: 70, h: 16, minX: 700, maxX: 800, speed: 1.1, dir: 1 },
      { type: 'moving-v', x: 1020, y: 130, w: 70, h: 16, minY: 100, maxY: 210, speed: 0.7, dir: 1 },
      { type: 'moving-h', x: 1360, y: 240, w: 90, h: 16, minX: 1360, maxX: 1600, speed: 1.0, dir: 1 },
      { type: 'moving-v', x: 1900, y: 120, w: 70, h: 16, minY: 100, maxY: 230, speed: 0.8, dir: 1 }
    ],
    spikes: [
      { x: 500, y: 224, w: 26, h: 16 },
      { x: 840, y: 224, w: 26, h: 16 },
      { x: 1200, y: 224, w: 26, h: 16 },
      { x: 1670, y: 224, w: 50, h: 16 },
      { x: 2070, y: 224, w: 26, h: 16 },
      { x: 2500, y: 224, w: 26, h: 16 }
    ],
    coins: [
      { x: 280, y: 150 }, { x: 305, y: 150 },
      { x: 655, y: 125 }, { x: 680, y: 125 },
      { x: 975, y: 165 },
      { x: 1435, y: 150 }, { x: 1460, y: 150 },
      { x: 2275, y: 165 }, { x: 2300, y: 165 },
      { x: 2665, y: 135 }, { x: 2690, y: 135 },
      { x: 2875, y: 105 }, { x: 2900, y: 105 }, { x: 2925, y: 105 },
      { x: 1930, y: 90 }
    ],
    enemies: [
      { x: 860, y: 216, w: 24, h: 24, minX: 820, maxX: 1010, speed: 1.0, dir: 1 },
      { x: 1690, y: 216, w: 24, h: 24, minX: 1650, maxX: 1860, speed: 1.1, dir: 1 },
      { x: 2100, y: 216, w: 24, h: 24, minX: 2050, maxX: 2240, speed: 1.2, dir: -1 },
      { x: 2500, y: 216, w: 24, h: 24, minX: 2450, maxX: 2900, speed: 1.3, dir: 1 }
    ],
    checkpoints: [
      { x: 1660, y: 190, w: 20, h: 50 },
      { x: 2430, y: 190, w: 20, h: 50 }
    ],
    finish: { x: 3040, y: 160, w: 40, h: 80 }
  },

  // ------------------------------------------------------------------
  // STAGE 3 - SKY CASTLE (HARD)
  // ------------------------------------------------------------------
  {
    name: 'SKY CASTLE',
    difficulty: 'Hard',
    theme: 'castle',
    width: 3500,
    playerStart: { x: 40, y: 190 },
    platforms: [
      { type: 'ground', x: 0, y: 240, w: 260, h: 60 },

      { type: 'platform', x: 320, y: 210, w: 80, h: 16 },
      { type: 'platform', x: 470, y: 180, w: 70, h: 16 },
      { type: 'platform', x: 620, y: 150, w: 60, h: 16 },
      { type: 'platform', x: 770, y: 190, w: 60, h: 16 },
      { type: 'platform', x: 950, y: 220, w: 200, h: 16 },
      { type: 'platform', x: 1300, y: 200, w: 60, h: 16 },
      { type: 'platform', x: 1550, y: 170, w: 60, h: 16 },
      { type: 'platform', x: 1800, y: 220, w: 160, h: 16 },
      { type: 'platform', x: 2150, y: 190, w: 60, h: 16 },
      { type: 'platform', x: 2400, y: 160, w: 60, h: 16 },
      { type: 'platform', x: 2650, y: 220, w: 180, h: 16 },
      { type: 'platform', x: 3000, y: 190, w: 60, h: 16 },
      { type: 'ground', x: 3150, y: 240, w: 350, h: 60 },

      { type: 'moving-h', x: 1080, y: 150, w: 70, h: 16, minX: 1080, maxX: 1260, speed: 1.2, dir: 1 },
      { type: 'moving-v', x: 1650, y: 100, w: 70, h: 16, minY: 90, maxY: 210, speed: 1.0, dir: 1 },
      { type: 'moving-h', x: 1970, y: 200, w: 80, h: 16, minX: 1970, maxX: 2110, speed: 1.3, dir: 1 },
      { type: 'moving-v', x: 2500, y: 90, w: 70, h: 16, minY: 90, maxY: 220, speed: 1.1, dir: -1 },
      { type: 'moving-h', x: 2830, y: 170, w: 70, h: 16, minX: 2830, maxX: 2970, speed: 1.4, dir: 1 }
    ],
    spikes: [
      { x: 990, y: 204, w: 160, h: 16 },
      { x: 1830, y: 204, w: 100, h: 16 },
      { x: 2680, y: 204, w: 120, h: 16 }
    ],
    coins: [
      { x: 340, y: 185 }, { x: 490, y: 155 }, { x: 635, y: 125 },
      { x: 785, y: 165 },
      { x: 1000, y: 195 }, { x: 1030, y: 195 }, { x: 1060, y: 195 },
      { x: 1315, y: 175 },
      { x: 1565, y: 145 },
      { x: 1850, y: 195 }, { x: 1880, y: 195 },
      { x: 2165, y: 165 },
      { x: 2415, y: 135 },
      { x: 2700, y: 195 }, { x: 2730, y: 195 }, { x: 2760, y: 195 },
      { x: 3015, y: 165 },
      { x: 3200, y: 210 }, { x: 3230, y: 210 }, { x: 3260, y: 210 }
    ],
    enemies: [
      { x: 970, y: 196, w: 24, h: 24, minX: 950, maxX: 1130, speed: 1.2, dir: 1 },
      { x: 1830, y: 196, w: 24, h: 24, minX: 1800, maxX: 1940, speed: 1.3, dir: 1 },
      { x: 2680, y: 196, w: 24, h: 24, minX: 2650, maxX: 2810, speed: 1.4, dir: -1 },
      { x: 3200, y: 216, w: 24, h: 24, minX: 3150, maxX: 3450, speed: 1.5, dir: 1 },
      { x: 1350, y: 176, w: 24, h: 24, minX: 1300, maxX: 1360, speed: 1.0, dir: 1 }
    ],
    checkpoints: [
      { x: 960, y: 170, w: 20, h: 50 },
      { x: 1810, y: 170, w: 20, h: 50 },
      { x: 2660, y: 170, w: 20, h: 50 }
    ],
    finish: { x: 3460, y: 160, w: 40, h: 80 }
  }
];

// ==============================
// INISIALISASI
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');

  loadProgress();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 200));

  setupMenuButtons();
  setupTouchControls();
  setupKeyboardControls();

  showScreen('screen-main-menu');
  renderStageList();
});

// Menyesuaikan resolusi canvas terhadap ukuran layar (responsive)
function resizeCanvas() {
  if (!canvas) return;
  dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(rect.width, 1);
  const cssH = Math.max(rect.height, 1);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  // Hitung skala supaya sistem gambar tetap memakai koordinat logis GAME_WIDTH x GAME_HEIGHT
  const scale = Math.min(canvas.width / GAME_WIDTH, canvas.height / GAME_HEIGHT);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  // Simpan info agar draw() tahu berapa banyak area logis yang benar-benar terlihat
  window.__viewW = canvas.width / scale;
  window.__viewH = canvas.height / scale;

  maybeShowRotateMessage();
}

function maybeShowRotateMessage() {
  const msg = document.getElementById('rotate-message');
  if (!msg) return;
  const isPortraitNarrow = window.innerHeight > window.innerWidth && window.innerWidth < 420;
  if (isPortraitNarrow && gameState === 'playing') {
    msg.classList.add('show');
    clearTimeout(window.__rotateTimeout);
    window.__rotateTimeout = setTimeout(() => msg.classList.remove('show'), 3000);
  } else {
    msg.classList.remove('show');
  }
}

// ==============================
// NAVIGASI ANTAR LAYAR (MENU)
// ==============================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function hideAllOverlays() {
  document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
}

function setupMenuButtons() {
  document.getElementById('btn-play').addEventListener('click', () => {
    ensureAudio();
    currentStageIndex = Math.min(unlockedStage - 1, LEVELS.length - 1);
    startStage(currentStageIndex);
  });

  document.getElementById('btn-how-to-play').addEventListener('click', () => showScreen('screen-how-to-play'));
  document.getElementById('btn-howto-back').addEventListener('click', () => showScreen('screen-main-menu'));

  document.getElementById('btn-select-stage').addEventListener('click', () => {
    renderStageList();
    showScreen('screen-select-stage');
  });
  document.getElementById('btn-stage-back').addEventListener('click', () => showScreen('screen-main-menu'));

  document.getElementById('btn-reset-progress').addEventListener('click', () => {
    if (confirm('Reset semua progress stage?')) {
      unlockedStage = 1;
      saveProgress();
      renderStageList();
    }
  });

  // Pause overlay
  document.getElementById('btn-pause').addEventListener('click', pauseGame);
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-restart').addEventListener('click', () => {
    hideAllOverlays();
    startStage(currentStageIndex);
  });
  document.getElementById('btn-mainmenu-from-pause').addEventListener('click', backToMainMenu);

  // Sound toggle
  document.getElementById('btn-sound').addEventListener('click', toggleSound);

  // Game over overlay
  document.getElementById('btn-tryagain').addEventListener('click', () => {
    hideAllOverlays();
    startStage(currentStageIndex);
  });
  document.getElementById('btn-gameover-mainmenu').addEventListener('click', backToMainMenu);

  // Stage complete overlay
  document.getElementById('btn-nextstage').addEventListener('click', () => {
    hideAllOverlays();
    startStage(currentStageIndex + 1);
  });
  document.getElementById('btn-complete-mainmenu').addEventListener('click', backToMainMenu);

  // Win overlay
  document.getElementById('btn-playagain').addEventListener('click', () => {
    hideAllOverlays();
    currentStageIndex = 0;
    startStage(0);
  });
}

function backToMainMenu() {
  gameState = 'menu';
  hideAllOverlays();
  showScreen('screen-main-menu');
}

function renderStageList() {
  const list = document.getElementById('stage-list');
  list.innerHTML = '';
  LEVELS.forEach((lvl, idx) => {
    const locked = (idx + 1) > unlockedStage;
    const card = document.createElement('div');
    card.className = 'stage-card' + (locked ? ' locked' : '');
    card.innerHTML = `
      <div class="stage-num">${idx + 1}</div>
      <div class="stage-info">
        <div class="stage-name">${lvl.name}</div>
        <div class="stage-diff">${lvl.difficulty}</div>
      </div>
      <div class="stage-lock">${locked ? '&#128274;' : '&#9654;'}</div>
    `;
    if (!locked) {
      card.addEventListener('click', () => {
        ensureAudio();
        currentStageIndex = idx;
        startStage(idx);
      });
    }
    list.appendChild(card);
  });
}

// ==============================
// LOCAL STORAGE (PROGRESS)
// ==============================
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data.unlockedStage === 'number') {
        unlockedStage = Math.max(1, Math.min(data.unlockedStage, LEVELS.length));
      }
    }
  } catch (e) {
    unlockedStage = 1;
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlockedStage }));
  } catch (e) {
    // localStorage tidak tersedia, abaikan saja
  }
}

// ==============================
// MEMULAI STAGE / GAME
// ==============================
function startStage(index) {
  if (index < 0 || index >= LEVELS.length) index = 0;
  currentStageIndex = index;

  // Deep clone level data supaya level asli (LEVELS) tidak berubah saat dimainkan
  activeLevel = JSON.parse(JSON.stringify(LEVELS[index]));
  activeLevel.coins.forEach(c => c.collected = false);
  activeLevel.enemies.forEach(e => e.alive = true);
  activeLevel.platforms.forEach(p => {
    if (p.type === 'moving-h' || p.type === 'moving-v') {
      p.prevX = p.x;
      p.prevY = p.y;
    }
  });
  activeLevel.checkpoints.forEach(c => c.activated = false);

  player = {
    x: activeLevel.playerStart.x,
    y: activeLevel.playerStart.y,
    prevY: activeLevel.playerStart.y,
    width: PLAYER_W,
    height: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    state: 'idle',
    invincible: 0,
    dead: false,
    standingPlatform: null
  };

  score = 0;
  coinCount = 0;
  lives = 3;
  camera.x = 0;
  startTime = Date.now();

  activeLevel.checkpointPos = { x: player.x, y: player.y };

  document.getElementById('hud-stage-name').textContent = activeLevel.name;
  updateHUD();

  hideAllOverlays();
  showScreen('screen-game');
  gameState = 'playing';

  resizeCanvas();
  maybeShowRotateMessage();

  if (!loopRunning) {
    loopRunning = true;
    lastTimestamp = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

// ==============================
// GAME LOOP
// ==============================
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 16.6667, 3); // normalisasi ke ~1 pada 60fps
  lastTimestamp = timestamp;

  if (gameState === 'playing') {
    update(dt);
  }
  draw();

  requestAnimationFrame(gameLoop);
}

// ==============================
// UPDATE (LOGIKA GAME)
// ==============================
function update(dt) {
  updatePlatforms(dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateCheckpoints();
  checkCoinCollisions();
  checkSpikeCollisions();
  checkEnemyCollisions();
  checkFinish();
  updateCamera();

  if (player.invincible > 0) player.invincible -= dt;
}

// ---- PLAYER ----
function updatePlayer(dt) {
  if (player.dead) return;

  // Jika sedang berdiri di atas moving platform, ikut bergerak sesuai delta platform
  if (player.standingPlatform) {
    const p = player.standingPlatform;
    if (p.type === 'moving-h') player.x += (p.x - p.prevX);
    if (p.type === 'moving-v') player.y += (p.y - p.prevY);
  }
  player.standingPlatform = null;

  // Input horizontal
  player.vx = 0;
  if (input.left) { player.vx = -MOVE_SPEED; player.facing = -1; }
  if (input.right) { player.vx = MOVE_SPEED; player.facing = 1; }

  // Input lompat
  if (input.jumpQueued && player.onGround) {
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
    playSound('jump');
  }
  input.jumpQueued = false;

  // Gravitasi
  player.vy += GRAVITY * dt;
  if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;

  player.prevY = player.y;

  // Gerak horizontal + collision
  player.x += player.vx * dt;
  resolveHorizontalCollision(player);

  // Gerak vertikal + collision
  player.onGround = false;
  player.y += player.vy * dt;
  resolveVerticalCollision(player);

  // Batasi agar tidak keluar dari kiri level
  if (player.x < 0) player.x = 0;

  // Update animasi state
  if (!player.onGround) {
    player.state = player.vy < 0 ? 'jump' : 'fall';
  } else if (player.vx !== 0) {
    player.state = 'walk';
  } else {
    player.state = 'idle';
  }

  // Jatuh ke jurang -> mati
  if (player.y > VOID_DEATH_Y) {
    loseLife();
  }
}

// ---- COLLISION (AABB SEDERHANA) ----
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getPlayerRect(p) {
  return { x: p.x, y: p.y, w: p.width, h: p.height };
}

function resolveHorizontalCollision(p) {
  const rect = getPlayerRect(p);
  for (const plat of activeLevel.platforms) {
    if (!rectsOverlap(rect, plat)) continue;
    if (p.vx > 0) {
      p.x = plat.x - p.width;
    } else if (p.vx < 0) {
      p.x = plat.x + plat.w;
    }
    rect.x = p.x;
  }
}

function resolveVerticalCollision(p) {
  const rect = getPlayerRect(p);
  for (const plat of activeLevel.platforms) {
    if (!rectsOverlap(rect, plat)) continue;
    if (p.vy >= 0) {
      // sedang jatuh, mendarat di atas platform
      p.y = plat.y - p.height;
      p.vy = 0;
      p.onGround = true;
      p.standingPlatform = plat;
    } else {
      // sedang naik, kepala menabrak bawah platform
      p.y = plat.y + plat.h;
      p.vy = 0;
    }
    rect.y = p.y;
  }
}

// ---- PLATFORM BERGERAK ----
function updatePlatforms(dt) {
  for (const plat of activeLevel.platforms) {
    if (plat.type === 'moving-h') {
      plat.prevX = plat.x;
      plat.x += plat.speed * plat.dir * dt;
      if (plat.x <= plat.minX) { plat.x = plat.minX; plat.dir = 1; }
      if (plat.x >= plat.maxX) { plat.x = plat.maxX; plat.dir = -1; }
    } else if (plat.type === 'moving-v') {
      plat.prevY = plat.y;
      plat.y += plat.speed * plat.dir * dt;
      if (plat.y <= plat.minY) { plat.y = plat.minY; plat.dir = 1; }
      if (plat.y >= plat.maxY) { plat.y = plat.maxY; plat.dir = -1; }
    }
  }
}

// ---- MUSUH ----
function updateEnemies(dt) {
  for (const e of activeLevel.enemies) {
    if (!e.alive) continue;
    e.x += e.speed * e.dir * dt;
    if (e.x <= e.minX) { e.x = e.minX; e.dir = 1; }
    if (e.x >= e.maxX) { e.x = e.maxX; e.dir = -1; }
  }
}

function checkEnemyCollisions() {
  if (player.dead || player.invincible > 0) return;
  const rect = getPlayerRect(player);
  for (const e of activeLevel.enemies) {
    if (!e.alive) continue;
    if (!rectsOverlap(rect, e)) continue;

    const playerBottomBefore = player.prevY + player.height;
    const stomping = player.vy > 0 && playerBottomBefore <= e.y + 10;

    if (stomping) {
      e.alive = false;
      player.vy = JUMP_VELOCITY * 0.6;
      score += 50;
      updateHUD();
      playSound('stomp');
    } else {
      loseLife();
      return;
    }
  }
}

// ---- KOIN ----
function checkCoinCollisions() {
  const rect = getPlayerRect(player);
  for (const c of activeLevel.coins) {
    if (c.collected) continue;
    const coinRect = { x: c.x - 8, y: c.y - 8, w: 16, h: 16 };
    if (rectsOverlap(rect, coinRect)) {
      c.collected = true;
      coinCount++;
      score += 10;
      updateHUD();
      playSound('coin');
    }
  }
}

// ---- SPIKE / OBSTACLE ----
function checkSpikeCollisions() {
  if (player.invincible > 0 || player.dead) return;
  const rect = getPlayerRect(player);
  for (const s of activeLevel.spikes) {
    if (rectsOverlap(rect, s)) {
      loseLife();
      return;
    }
  }
}

// ---- CHECKPOINT ----
function updateCheckpoints() {
  const rect = getPlayerRect(player);
  for (const cp of activeLevel.checkpoints) {
    if (cp.activated) continue;
    if (rectsOverlap(rect, cp)) {
      cp.activated = true;
      activeLevel.checkpointPos = { x: cp.x, y: cp.y - PLAYER_H + cp.h };
      playSound('checkpoint');
    }
  }
}

// ---- FINISH ----
function checkFinish() {
  if (player.dead) return;
  const rect = getPlayerRect(player);
  if (rectsOverlap(rect, activeLevel.finish)) {
    finishStage();
  }
}

function finishStage() {
  gameState = 'stagecomplete';
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  playSound('complete');

  // Buka stage berikutnya jika ada
  if (currentStageIndex + 1 < LEVELS.length) {
    if (unlockedStage < currentStageIndex + 2) {
      unlockedStage = currentStageIndex + 2;
      saveProgress();
    }
  }

  if (currentStageIndex >= LEVELS.length - 1) {
    // Stage terakhir selesai -> layar kemenangan
    document.getElementById('win-score').textContent = score;
    document.getElementById('win-coin').textContent = coinCount;
    document.getElementById('overlay-win').classList.remove('hidden');
  } else {
    document.getElementById('complete-score').textContent = score;
    document.getElementById('complete-coin').textContent = coinCount;
    document.getElementById('complete-time').textContent = `${mm}:${ss}`;
    const nextBtn = document.getElementById('btn-nextstage');
    nextBtn.style.display = 'block';
    document.getElementById('overlay-stagecomplete').classList.remove('hidden');
  }
}

// ---- NYAWA / MATI ----
function loseLife() {
  if (player.dead || player.invincible > 0) return;
  lives--;
  updateHUD();
  playSound('hit');

  if (lives <= 0) {
    gameOver();
  } else {
    respawnAtCheckpoint();
  }
}

function respawnAtCheckpoint() {
  const cp = activeLevel.checkpointPos;
  player.x = cp.x;
  player.y = cp.y;
  player.vx = 0;
  player.vy = 0;
  player.invincible = 90; // sekitar 1.5 detik pada 60fps
}

function gameOver() {
  gameState = 'gameover';
  player.dead = true;
  document.getElementById('gameover-score').textContent = score;
  document.getElementById('gameover-coin').textContent = coinCount;
  document.getElementById('overlay-gameover').classList.remove('hidden');
}

// ---- KAMERA ----
function updateCamera() {
  const viewW = window.__viewW || GAME_WIDTH;
  const targetX = player.x + player.width / 2 - viewW / 2;
  camera.x = Math.max(0, Math.min(targetX, Math.max(0, activeLevel.width - viewW)));
}

// ==============================
// HUD
// ==============================
function updateHUD() {
  document.getElementById('coin-count').textContent = coinCount;
  document.getElementById('score-count').textContent = score;
  const heartsEl = document.getElementById('hud-lives');
  let hearts = '';
  for (let i = 0; i < 3; i++) {
    hearts += i < lives ? '&#10084;&#65039;' : '&#128148;';
  }
  heartsEl.innerHTML = hearts;
}

// ==============================
// PAUSE / RESUME
// ==============================
function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  document.getElementById('overlay-pause').classList.remove('hidden');
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  document.getElementById('overlay-pause').classList.add('hidden');
}

// ==============================
// RENDER / DRAW
// ==============================
function draw() {
  const viewW = window.__viewW || GAME_WIDTH;
  const viewH = window.__viewH || GAME_HEIGHT;

  ctx.clearRect(0, 0, viewW, viewH);

  if (gameState === 'menu') return;
  if (!activeLevel) return;

  drawBackground(viewW, viewH);

  ctx.save();
  ctx.translate(-camera.x, 0);

  drawPlatforms();
  drawSpikes();
  drawCheckpoints();
  drawFinish();
  drawCoins();
  drawEnemies();
  drawPlayer();

  ctx.restore();
}

function drawBackground(viewW, viewH) {
  const theme = activeLevel.theme;
  let skyTop = '#87ceeb', skyBottom = '#e0f7fa';
  if (theme === 'cave') { skyTop = '#1a1a2e'; skyBottom = '#302b63'; }
  if (theme === 'castle') { skyTop = '#4a6fa5'; skyBottom = '#a9c9ff'; }

  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, skyTop);
  grad.addColorStop(1, skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  // Parallax dekorasi sederhana (bergerak lebih lambat dari kamera)
  const parallax = camera.x * 0.3;
  ctx.save();
  ctx.translate(-parallax % 400, 0);
  for (let i = -1; i < viewW / 200 + 2; i++) {
    const bx = i * 400;
    if (theme === 'valley') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      drawCloud(bx + 40, 40);
      ctx.fillStyle = 'rgba(76, 120, 60, 0.5)';
      drawMountain(bx + 150, viewH);
    } else if (theme === 'cave') {
      ctx.fillStyle = 'rgba(140, 100, 220, 0.35)';
      drawCrystalDeco(bx + 80, viewH);
    } else if (theme === 'castle') {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      drawCloud(bx + 60, 60);
      ctx.fillStyle = 'rgba(120, 120, 160, 0.4)';
      drawFloatingIsland(bx + 220, 150);
    }
  }
  ctx.restore();
}

function drawCloud(x, y) {
  ctx.beginPath();
  ctx.ellipse(x, y, 22, 12, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 18, y + 4, 16, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 16, y + 4, 14, 9, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMountain(x, viewH) {
  ctx.beginPath();
  ctx.moveTo(x - 60, viewH);
  ctx.lineTo(x, viewH - 90);
  ctx.lineTo(x + 60, viewH);
  ctx.closePath();
  ctx.fill();
}

function drawCrystalDeco(x, viewH) {
  ctx.beginPath();
  ctx.moveTo(x, viewH - 120);
  ctx.lineTo(x + 14, viewH - 40);
  ctx.lineTo(x - 14, viewH - 40);
  ctx.closePath();
  ctx.fill();
}

function drawFloatingIsland(x, y) {
  ctx.beginPath();
  ctx.ellipse(x, y, 40, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlatforms() {
  for (const p of activeLevel.platforms) {
    let color = '#8d6e63';
    let topColor = '#8bc34a';
    if (activeLevel.theme === 'cave') { color = '#4a3f6b'; topColor = '#b39ddb'; }
    if (activeLevel.theme === 'castle') { color = '#78909c'; topColor = '#eceff1'; }

    if (p.type === 'moving-h' || p.type === 'moving-v') {
      color = '#ff8a65';
      topColor = '#ffccbc';
    }

    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = topColor;
    ctx.fillRect(p.x, p.y, p.w, 6);
  }
}

function drawSpikes() {
  ctx.fillStyle = '#e53935';
  for (const s of activeLevel.spikes) {
    const count = Math.max(1, Math.floor(s.w / 16));
    const spikeW = s.w / count;
    for (let i = 0; i < count; i++) {
      const sx = s.x + i * spikeW;
      ctx.beginPath();
      ctx.moveTo(sx, s.y + s.h);
      ctx.lineTo(sx + spikeW / 2, s.y);
      ctx.lineTo(sx + spikeW, s.y + s.h);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawCheckpoints() {
  for (const cp of activeLevel.checkpoints) {
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cp.x, cp.y);
    ctx.lineTo(cp.x, cp.y + cp.h);
    ctx.stroke();

    ctx.fillStyle = cp.activated ? '#66bb6a' : '#bdbdbd';
    ctx.beginPath();
    ctx.moveTo(cp.x, cp.y);
    ctx.lineTo(cp.x + 16, cp.y + 6);
    ctx.lineTo(cp.x, cp.y + 12);
    ctx.closePath();
    ctx.fill();
  }
}

function drawFinish() {
  const f = activeLevel.finish;
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(f.x, f.y);
  ctx.lineTo(f.x, f.y + f.h);
  ctx.stroke();

  ctx.fillStyle = '#ffca28';
  ctx.beginPath();
  ctx.moveTo(f.x, f.y);
  ctx.lineTo(f.x + 28, f.y + 10);
  ctx.lineTo(f.x, f.y + 20);
  ctx.closePath();
  ctx.fill();
}

function drawCoins() {
  for (const c of activeLevel.coins) {
    if (c.collected) continue;
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff9c4';
    ctx.beginPath();
    ctx.arc(c.x - 2, c.y - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const e of activeLevel.enemies) {
    if (!e.alive) continue;
    ctx.fillStyle = '#8e24aa';
    ctx.beginPath();
    ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // mata
    ctx.fillStyle = '#fff';
    const eyeDir = e.dir >= 0 ? 1 : -1;
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2 + eyeDir * 5, e.y + e.h / 2 - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2 + eyeDir * 6, e.y + e.h / 2 - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible / 6) % 2 === 0) {
    return; // efek berkedip saat invincible
  }

  const p = player;
  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
  if (p.facing < 0) ctx.scale(-1, 1);

  // Badan
  ctx.fillStyle = '#42a5f5';
  const squash = p.state === 'jump' ? 0.92 : p.state === 'fall' ? 1.05 : 1;
  ctx.fillRect(-p.width / 2, -p.height / 2 * squash, p.width, p.height * squash);

  // Wajah sederhana
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(3, -p.height / 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(4, -p.height / 4, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Kaki (animasi jalan sederhana)
  ctx.fillStyle = '#1e88e5';
  const legOffset = p.state === 'walk' ? Math.sin(Date.now() / 80) * 4 : 0;
  ctx.fillRect(-p.width / 2 + 2, p.height / 2 - 4, 6, 6 + legOffset);
  ctx.fillRect(p.width / 2 - 8, p.height / 2 - 4, 6, 6 - legOffset);

  ctx.restore();
}

// ==============================
// INPUT: KEYBOARD (DESKTOP)
// ==============================
function setupKeyboardControls() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') input.left = true;
    if (e.code === 'ArrowRight') input.right = true;
    if (e.code === 'ArrowUp' || e.code === 'Space') {
      if (!e.repeat) input.jumpQueued = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') input.left = false;
    if (e.code === 'ArrowRight') input.right = false;
  });
}

// ==============================
// INPUT: TOUCH / POINTER (MOBILE)
// ==============================
function setupTouchControls() {
  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');
  const btnJump = document.getElementById('btn-jump');

  bindHoldButton(btnLeft, () => (input.left = true), () => (input.left = false));
  bindHoldButton(btnRight, () => (input.right = true), () => (input.right = false));
  bindHoldButton(btnJump, () => (input.jumpQueued = true), () => { });
}

function bindHoldButton(el, onPress, onRelease) {
  const press = (e) => {
    e.preventDefault();
    el.classList.add('pressed');
    onPress();
  };
  const release = (e) => {
    if (e) e.preventDefault();
    el.classList.remove('pressed');
    onRelease();
  };

  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', release);
  // Fallback touch events (untuk kompatibilitas browser lama)
  el.addEventListener('touchstart', press, { passive: false });
  el.addEventListener('touchend', release, { passive: false });
}

// ==============================
// AUDIO (WEB AUDIO API - TANPA FILE EKSTERNAL)
// ==============================
function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null;
    }
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (!soundOn || !audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  let freq = 440, duration = 0.12, waveType = 'square';

  switch (type) {
    case 'jump': freq = 520; duration = 0.12; waveType = 'square'; break;
    case 'coin': freq = 880; duration = 0.09; waveType = 'triangle'; break;
    case 'hit': freq = 160; duration = 0.25; waveType = 'sawtooth'; break;
    case 'stomp': freq = 300; duration = 0.12; waveType = 'square'; break;
    case 'checkpoint': freq = 660; duration = 0.15; waveType = 'sine'; break;
    case 'complete': freq = 700; duration = 0.35; waveType = 'triangle'; break;
  }

  osc.type = waveType;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.start(now);
  osc.stop(now + duration);
}

function toggleSound() {
  soundOn = !soundOn;
  document.getElementById('btn-sound').innerHTML = soundOn ? '&#128266;' : '&#128263;';
  ensureAudio();
}