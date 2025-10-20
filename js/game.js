// game.js — versión con múltiples tipos de fantasmas

// ---- CONFIG ----
const ASSETS = {
  ghostPrefix: "assets/ghost",  // base para ghost1.png, ghost2.png, etc.
  ghostCount: 10,                // cantidad de tipos disponibles (ghost1.png ... ghost5.png)
  shootSound: "assets/shoot.wav",
  bgMusic: "assets/bg-music.mp3"
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const GHOST_MIN = 4;
const GHOST_MAX = 10;
const SPAWN_INTERVAL = 1500; // ms - intento de spawn
const GHOST_BASE_SPEED = 0.4;
// ----------------

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Ajustar tamaños reales del canvas para alta DPI
function setupCanvasSize() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = CANVAS_WIDTH * ratio;
  canvas.height = CANVAS_HEIGHT * ratio;
  canvas.style.width = CANVAS_WIDTH + "px";
  canvas.style.height = CANVAS_HEIGHT + "px";
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
setupCanvasSize();
window.addEventListener('resize', setupCanvasSize);

// Estado del juego
let ghosts = [];
let lastSpawn = 0;
let lastTime = 0;
let score = 0;

// UI
const scoreEl = document.getElementById("score");

// Recursos: precarga de imágenes de fantasmas
const ghostImages = [];
for (let i = 1; i <= ASSETS.ghostCount; i++) {
  const img = new Image();
  img.src = `${ASSETS.ghostPrefix}${i}.jpeg`;
  ghostImages.push(img);
}

const shootAudio = new Audio(ASSETS.shootSound);
shootAudio.volume = 0.7;

const bgMusic = document.getElementById("bgMusic");
bgMusic.volume = 0.35;
bgMusic.play().catch(() => {/* autoplay bloqueado */});

// Utilidades
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function distance(x1,y1,x2,y2){ return Math.hypot(x2-x1, y2-y1); }

// Clases / tipos de movimiento
const MovementType = {
  RANDOM: "random",
  LINEAR: "linear",
  CIRCULAR: "circular"
};

// Generador de nuevo fantasma
function createGhost() {
  const size = rand(36, 80);
  const x = rand(50, CANVAS_WIDTH - 50);
  const y = rand(50, CANVAS_HEIGHT - 50);
  const img = ghostImages[randInt(0, ghostImages.length - 1)]; // imagen aleatoria

  // tipo de movimiento
  const r = Math.random();
  let type;
  if (r < 0.45) type = MovementType.RANDOM;
  else if (r < 0.8) type = MovementType.LINEAR;
  else type = MovementType.CIRCULAR;

  const angle = rand(0, Math.PI * 2);
  const speed = rand(GHOST_BASE_SPEED, GHOST_BASE_SPEED * 2.3);

  const ghost = {
    id: Date.now() + Math.random(),
    x, y,
    size,
    img,
    type,
    angle,
    speed,
    opacity: 1,
    life: 0,
    ttl: rand(8000, 22000),
    centerX: x,
    centerY: y,
    radius: rand(20, 90),
    angularSpeed: rand(-0.03, 0.03)
  };

  if (type === MovementType.LINEAR) {
    ghost.vx = Math.cos(angle) * speed;
    ghost.vy = Math.sin(angle) * speed;
  }

  if (type === MovementType.RANDOM) {
    ghost.target = { x: rand(40, CANVAS_WIDTH - 40), y: rand(40, CANVAS_HEIGHT - 40) };
    ghost.changeTargetTime = rand(600, 2200);
    ghost.timeSinceTarget = 0;
  }

  return ghost;
}

// Inicializar fantasmas
function initGhosts() {
  ghosts = [];
  const initial = randInt(GHOST_MIN, GHOST_MAX);
  for (let i = 0; i < initial; i++) ghosts.push(createGhost());
}
initGhosts();

// Dibujo
function drawGhost(g) {
  ctx.save();
  ctx.globalAlpha = g.opacity;
  const w = g.size;
  const h = g.size;
  ctx.drawImage(g.img, g.x - w / 2, g.y - h / 2, w, h);
  ctx.restore();
}

// Actualización
function update(dt) {
  for (let i = ghosts.length - 1; i >= 0; i--) {
    const g = ghosts[i];
    g.life += dt;

    if (g.type === MovementType.LINEAR) {
      g.x += g.vx * dt;
      g.y += g.vy * dt;
    } else if (g.type === MovementType.RANDOM) {
      g.timeSinceTarget += dt;
      const tx = g.target.x, ty = g.target.y;
      const dx = tx - g.x, dy = ty - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 3) {
        const nx = dx / dist, ny = dy / dist;
        g.x += nx * g.speed * dt * 0.9;
        g.y += ny * g.speed * dt * 0.9;
      }
      if (g.timeSinceTarget > g.changeTargetTime) {
        g.target = { x: rand(40, CANVAS_WIDTH - 40), y: rand(40, CANVAS_HEIGHT - 40) };
        g.timeSinceTarget = 0;
      }
    } else if (g.type === MovementType.CIRCULAR) {
      g.angle += g.angularSpeed * dt;
      g.x = g.centerX + Math.cos(g.angle) * g.radius;
      g.y = g.centerY + Math.sin(g.angle) * g.radius;
    }

    if (g.x < 20) g.x = 20, g.vx = Math.abs(g.vx || 0);
    if (g.x > CANVAS_WIDTH - 20) g.x = CANVAS_WIDTH - 20, g.vx = -Math.abs(g.vx || 0);
    if (g.y < 20) g.y = 20, g.vy = Math.abs(g.vy || 0);
    if (g.y > CANVAS_HEIGHT - 20) g.y = CANVAS_HEIGHT - 20, g.vy = -Math.abs(g.vy || 0);

    if (g.life > g.ttl) {
      g.opacity -= 0.002 * dt;
      if (g.opacity <= 0) {
        ghosts.splice(i, 1);
        ghosts.push(createGhost());
      }
    }
  }

  lastSpawn += dt;
  if (lastSpawn > SPAWN_INTERVAL) {
    lastSpawn = 0;
    if (ghosts.length < GHOST_MAX) ghosts.push(createGhost());
  }
}

// Render
function render() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  for (const g of ghosts) drawGhost(g);
}

// Loop principal
function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = ts - lastTime;
  lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Click para eliminar
canvas.addEventListener('click', function(evt) {
  const rect = canvas.getBoundingClientRect();
  const x = (evt.clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1);
  const y = (evt.clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1);

  for (let i = ghosts.length - 1; i >= 0; i--) {
    const g = ghosts[i];
    const half = g.size / 2;
    if (distance(x, y, g.x, g.y) <= half * 0.9) {
      ghosts.splice(i, 1);
      score += Math.round(10 + g.size / 10);
      scoreEl.textContent = `Puntos: ${score}`;
      try { shootAudio.currentTime = 0; shootAudio.play(); } catch(e){}
      ghosts.push(createGhost());
      break;
    }
  }
});

// Permitir cambiar cursor en tiempo real
function updateCursor(imagePath, hotspotX = 16, hotspotY = 16) {
  canvas.style.cursor = `url('${imagePath}') ${hotspotX} ${hotspotY}, auto`;
}

window.game = {
  ghosts,
  createGhost,
  updateCursor,
  setMusicMuted: (v) => { bgMusic.muted = !!v; }
};
