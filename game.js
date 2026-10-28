'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#b0bec5', // N - tuerca (gris acero)
  '#ffffff', // 9 - comodín (tinte)
  '#ff7043', // 10 - bomba
  '#ffee58', // 11 - rayo
  '#f06292', // 12 - tinte
  '#a1887f', // 13 - gravedad
  '#4fc3f7', // 14 - congelar
];

const SKIN_KEY = 'tetris.skin';

const SKINS = {
  retro: {
    colors: COLORS,
    drawCell(context, px, py, size, color) {
      context.fillStyle = color;
      context.fillRect(px + 1, py + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px + 1, py + 1, size - 2, 4);
    },
  },
  neon: {
    colors: [
      null, '#00e5ff', '#ffea00', '#d500f9', '#00e676', '#ff1744', '#2979ff', '#ff9100',
      '#cfd8dc', '#ffffff', '#ff5722', '#ffff00', '#ff4081', '#bcaaa4', '#40c4ff',
    ],
    drawCell(context, px, py, size, color) {
      context.fillStyle = '#0a0a12';
      context.fillRect(px + 2, py + 2, size - 4, size - 4);
      context.shadowColor = color;
      context.shadowBlur = 10;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px + 3, py + 3, size - 6, size - 6);
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
    },
  },
  pastel: {
    colors: [
      null, '#a8e6f0', '#fff1a8', '#d9b8f0', '#b8ecc0', '#f7b5b5', '#b5d4f7', '#ffd2a6',
      '#d0dadf', '#ffffff', '#ffb59e', '#fff59e', '#f7b5cf', '#d4c2ba', '#a8dcf5',
    ],
    drawCell(context, px, py, size, color) {
      const r = Math.floor(size * 0.3);
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(px + 1 + r, py + 1);
      context.arcTo(px + size - 1, py + 1, px + size - 1, py + size - 1, r);
      context.arcTo(px + size - 1, py + size - 1, px + 1, py + size - 1, r);
      context.arcTo(px + 1, py + size - 1, px + 1, py + 1, r);
      context.arcTo(px + 1, py + 1, px + size - 1, py + 1, r);
      context.closePath();
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.35)';
      context.beginPath();
      context.arc(px + size * 0.32, py + size * 0.32, size * 0.1, 0, Math.PI * 2);
      context.fill();
    },
  },
  pixel: {
    colors: [
      null, '#26c6da', '#fdd835', '#ab47bc', '#66bb6a', '#ef5350', '#42a5f5', '#ffa726',
      '#90a4ae', '#ffffff', '#ff7043', '#ffee58', '#ec407a', '#8d6e63', '#29b6f6',
    ],
    drawCell(context, px, py, size, color) {
      context.fillStyle = color;
      context.fillRect(px + 1, py + 1, size - 2, size - 2);
      const n = 4;
      const s = (size - 2) / n;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if ((i + j) % 2 === 0) context.fillStyle = 'rgba(255,255,255,0.22)';
          else if (i === n - 1 || j === n - 1) context.fillStyle = 'rgba(0,0,0,0.28)';
          else continue;
          context.fillRect(px + 1 + j * s, py + 1 + i * s, s, s);
        }
      }
    },
  },
};

let skin = SKINS.retro;

const WILD = 9;
const POWERUPS = [
  { name: 'bomb', icon: '💣' },
  { name: 'ray', icon: '⚡' },
  { name: 'tint', icon: '🎨' },
  { name: 'gravity', icon: '⬇️' },
  { name: 'freeze', icon: '❄️' },
];
const POWERUP_BASE = 10;
const POWERUP_EVERY = 5;
const FREEZE_MS = 5000;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');

let gridColor = '#22222e';

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let nextPowerupAt, powerupPending, freezeMs;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPowerup() {
  const i = Math.floor(Math.random() * POWERUPS.length);
  const type = POWERUP_BASE + i;
  return { type, shape: [[type]], power: POWERUPS[i].name, x: Math.floor(COLS / 2), y: 0 };
}

// Una fila se limpia si está llena, o si tiene un comodín y le falta como máximo 1 celda.
function rowComplete(row) {
  const gaps = row.filter(v => v === 0).length;
  return gaps === 0 || (gaps === 1 && row.includes(WILD));
}

function applyPowerup(p) {
  const cx = p.x, cy = p.y;
  switch (p.power) {
    case 'bomb':
      for (let r = cy - 1; r <= cy + 1; r++)
        for (let c = cx - 1; c <= cx + 1; c++)
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
      break;
    case 'ray':
      board[cy].fill(0);
      for (let r = 0; r < ROWS; r++) board[r][cx] = 0;
      break;
    case 'tint': {
      let target = cy + 1 < ROWS ? board[cy + 1][cx] : 0;
      if (target < 1 || target > 8) {
        const counts = new Array(9).fill(0);
        for (const row of board) for (const v of row) if (v >= 1 && v <= 8) counts[v]++;
        const max = Math.max(...counts);
        target = max ? counts.indexOf(max) : 0;
      }
      if (target)
        for (const row of board)
          for (let c = 0; c < COLS; c++) if (row[c] === target) row[c] = WILD;
      break;
    }
    case 'gravity':
      for (let c = 0; c < COLS; c++) {
        const col = [];
        for (let r = 0; r < ROWS; r++) if (board[r][c]) col.push(board[r][c]);
        for (let r = ROWS - 1; r >= 0; r--) board[r][c] = col.pop() || 0;
      }
      break;
    case 'freeze':
      freezeMs = FREEZE_MS;
      break;
  }
  score += 50 * level;
  updateHUD();
}

function randomPiece() {
  const type = Math.floor(Math.random() * (PIECES.length - 1)) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (rowComplete(board[r])) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    while (lines >= nextPowerupAt) {
      powerupPending = true;
      nextPowerupAt += POWERUP_EVERY;
    }
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  if (current.power) applyPowerup(current);
  else merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = powerupPending ? randomPowerup() : randomPiece();
  powerupPending = false;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  context.globalAlpha = alpha ?? 1;
  skin.drawCell(context, x * size, y * size, size, skin.colors[colorIndex], colorIndex);
  if (colorIndex === WILD) {
    context.strokeStyle = '#ab47bc';
    context.lineWidth = 2;
    context.strokeRect(x * size + 3, y * size + 3, size - 6, size - 6);
  } else if (colorIndex >= POWERUP_BASE) {
    context.font = `${Math.floor(size * 0.6)}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#000';
    context.fillText(POWERUPS[colorIndex - POWERUP_BASE].icon, x * size + size / 2, y * size + size / 2 + 1);
  }
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  if (gameOver) return;

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);

  if (freezeMs > 0) {
    ctx.fillStyle = 'rgba(79,195,247,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(`❄️ ${Math.ceil(freezeMs / 1000)}s`, 8, 8);
  }
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  draw();
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  if (freezeMs > 0) {
    freezeMs = Math.max(0, freezeMs - dt);
    dropAccum = 0;
  } else {
    dropAccum += dt;
  }
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  nextPowerupAt = POWERUP_EVERY;
  powerupPending = false;
  freezeMs = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

themeToggle.addEventListener('click', () => {
  const root = document.documentElement;
  const light = root.dataset.theme !== 'light';
  if (light) root.dataset.theme = 'light';
  else delete root.dataset.theme;
  themeToggle.setAttribute('aria-checked', String(light));
  themeToggle.textContent = light ? '☀️' : '🌙';
  gridColor = getComputedStyle(root).getPropertyValue('--grid').trim();
  themeToggle.blur(); // evita que el botón capture Space/P
  draw();
  drawNext();
});

function applySkin(name) {
  if (!SKINS[name]) name = 'retro';
  const root = document.documentElement;
  skin = SKINS[name];
  root.dataset.skin = name;
  skinSelect.value = name;
  gridColor = getComputedStyle(root).getPropertyValue('--grid').trim();
}

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  try { localStorage.setItem(SKIN_KEY, skinSelect.value); } catch (e) {}
  skinSelect.blur(); // evita que el select capture flechas/Space/P
  draw();
  drawNext();
});

let savedSkin = null;
try { savedSkin = localStorage.getItem(SKIN_KEY); } catch (e) {}
applySkin(savedSkin);

init();
