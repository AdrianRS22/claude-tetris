'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// Orden de colores: null, I, O, T, S, Z, J, L, N, comodín, bomba, rayo, tinte, gravedad, congelar
const RETRO_COLORS = [
  null,
  '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#90caf9', '#ffb74d',
  '#b0bec5', // N - tuerca (gris acero)
  '#ffffff', // 9 - comodín (tinte)
  '#ff7043', '#ffee58', '#f06292', '#a1887f', '#4fc3f7',
];

const NEON_COLORS = [
  null,
  '#00f0ff', '#fff200', '#d500f9', '#39ff14', '#ff1744', '#2979ff', '#ff9100',
  '#cfd8dc',
  '#ffffff',
  '#ff6d00', '#ffea00', '#ff4081', '#bcaaa4', '#40c4ff',
];

const PASTEL_COLORS = [
  null,
  '#b5ead7', '#fdfd96', '#d7bde2', '#c7f0bd', '#ffb3ba', '#bae1ff', '#ffdfba',
  '#d9dde0',
  '#fffafa',
  '#ffc9b5', '#fff5ba', '#ffc8dd', '#e0cfc4', '#c4ecfa',
];

const PIXEL_COLORS = [
  null,
  '#00bcd4', '#fcc800', '#9c27b0', '#4caf50', '#e53935', '#3f6fd8', '#fb8c00',
  '#90a4ae',
  '#f5f5f5',
  '#ff5722', '#fdd835', '#ec407a', '#8d6e63', '#29b6f6',
];

function roundedRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

// Cada skin define su paleta, fondo/rejilla (null = los del tema CSS) y cómo se pinta una celda.
const SKINS = {
  retro: {
    colors: RETRO_COLORS,
    bg: null,
    grid: null,
    cell(context, px, py, size, color) {
      context.fillStyle = color;
      context.fillRect(px + 1, py + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px + 1, py + 1, size - 2, 4);
    },
  },
  neon: {
    colors: NEON_COLORS,
    bg: '#000',
    grid: '#16162a',
    cell(context, px, py, size, color) {
      context.shadowColor = color;
      context.shadowBlur = size * 0.45;
      context.fillStyle = color + '55';
      context.fillRect(px + 3, py + 3, size - 6, size - 6);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px + 3, py + 3, size - 6, size - 6);
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
    },
  },
  pastel: {
    colors: PASTEL_COLORS,
    bg: null,
    grid: null,
    cell(context, px, py, size, color) {
      roundedRectPath(context, px + 1.5, py + 1.5, size - 3, size - 3, size * 0.3);
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = 'rgba(255,255,255,0.65)';
      context.lineWidth = 1.5;
      context.stroke();
    },
  },
  pixel: {
    colors: PIXEL_COLORS,
    bg: null,
    grid: null,
    cell(context, px, py, size, color) {
      const x = px + 1, y = py + 1, s = size - 2;
      const t = Math.max(2, Math.floor(s / 6)); // tamaño del "píxel" de la textura
      context.fillStyle = color;
      context.fillRect(x, y, s, s);
      // textura: damero de mini-píxeles claros y oscuros
      for (let i = 1; i < 5; i++) {
        for (let j = 1; j < 5; j++) {
          if ((i + j) % 2) continue;
          context.fillStyle = (i + j) % 4 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';
          context.fillRect(x + i * t, y + j * t, t, t);
        }
      }
      // biselado: luz arriba/izquierda, sombra abajo/derecha
      context.fillStyle = 'rgba(255,255,255,0.45)';
      context.fillRect(x, y, s, t / 2 + 1);
      context.fillRect(x, y, t / 2 + 1, s);
      context.fillStyle = 'rgba(0,0,0,0.45)';
      context.fillRect(x, y + s - t / 2 - 1, s, t / 2 + 1);
      context.fillRect(x + s - t / 2 - 1, y, t / 2 + 1, s);
    },
  },
};

const SKIN_KEY = 'tetris-skin';
let skin = SKINS.retro;
let COLORS = skin.colors;

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
const pauseMenu = document.getElementById('pause-menu');
const pauseMain = document.getElementById('pause-main');
const pauseControls = document.getElementById('pause-controls');
const startLevelSel = document.getElementById('start-level');
const recordMsg = document.getElementById('record-msg');
const recordForm = document.getElementById('record-form');
const playerName = document.getElementById('player-name');
const recordsBox = document.getElementById('records');
const recordsList = document.getElementById('records-list');
const recordsStats = document.getElementById('records-stats');
const resetRecordsBtn = document.getElementById('reset-records');

const RECORDS_KEY = 'tetris-records';
const NAME_KEY = 'tetris-last-name';
const MAX_RECORDS = 5;
const skinSelect = document.getElementById('skin-select');

let gridColor = '#22222e';
let startLevel = 1;
let resumeGuard = false;

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let nextPowerupAt, powerupPending, freezeMs;
let combo = 0, maxCombo = 0, recordPending = false;

function loadRecords() {
  const data = { scores: [], bestCombo: 0, maxLines: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (saved && Array.isArray(saved.scores)) {
      data.scores = saved.scores.slice(0, MAX_RECORDS);
      data.bestCombo = saved.bestCombo | 0;
      data.maxLines = saved.maxLines | 0;
    }
  } catch (e) { /* sin almacenamiento: se trabaja en memoria */ }
  return data;
}

function saveRecords(data) {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(data)); } catch (e) { /* ignorar */ }
}

// Posición (0-4) que ocuparía la puntuación en el top, o -1 si no entra.
function qualifies(s) {
  if (s <= 0) return -1;
  const { scores } = loadRecords();
  const idx = scores.findIndex(r => s > r.score);
  if (idx !== -1) return idx;
  return scores.length < MAX_RECORDS ? scores.length : -1;
}

function renderRecords(highlightIdx = -1) {
  const data = loadRecords();
  recordsList.replaceChildren();
  if (!data.scores.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Sin records todavía';
    recordsList.appendChild(li);
  }
  data.scores.forEach((r, i) => {
    const li = document.createElement('li');
    if (i === highlightIdx) li.className = 'current';
    [`${i + 1}.`, r.name, r.score.toLocaleString(), `${r.lines}L`].forEach(t => {
      const span = document.createElement('span');
      span.textContent = t;
      li.appendChild(span);
    });
    recordsList.appendChild(li);
  });
  recordsStats.textContent = `Mejor combo: ${data.bestCombo} · Líneas máx: ${data.maxLines}`;
}

function submitRecord() {
  if (!recordPending) return;
  recordPending = false;
  const name = playerName.value.trim() || 'Anónimo';
  try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* ignorar */ }
  const data = loadRecords();
  const entry = { name, score, lines, combo: maxCombo };
  // Nombre único (sin distinguir mayúsculas): se conserva solo la mejor puntuación.
  const dup = data.scores.findIndex(r => r.name.toLowerCase() === name.toLowerCase());
  let kept = true;
  if (dup !== -1) {
    if (score > data.scores[dup].score) data.scores[dup] = entry;
    else kept = false;
  } else {
    data.scores.push(entry);
  }
  data.scores.sort((a, b) => b.score - a.score);
  data.scores = data.scores.slice(0, MAX_RECORDS);
  saveRecords(data);
  recordForm.classList.add('hidden');
  if (kept) recordMsg.classList.add('hidden');
  else {
    recordMsg.textContent = `"${name}" ya tiene un record mayor`;
    recordMsg.classList.remove('hidden');
  }
  renderRecords(kept ? data.scores.indexOf(entry) : -1);
}

function showStart() {
  board = createBoard();
  score = 0; lines = 0; level = 1; combo = 0; maxCombo = 0;
  paused = false;
  gameOver = true;
  freezeMs = 0;
  next = randomPiece();
  current = next;
  updateHUD();
  draw();
  drawNext();
  overlayTitle.textContent = 'CLAUDE TETRIS';
  overlayScore.textContent = '';
  recordMsg.classList.add('hidden');
  recordForm.classList.add('hidden');
  recordsBox.classList.remove('hidden');
  renderRecords();
  overlay.classList.remove('hidden');
}

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

function setLevel() {
  level = startLevel + Math.floor(lines / 10);
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
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
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    setLevel();
    while (lines >= nextPowerupAt) {
      powerupPending = true;
      nextPowerupAt += POWERUP_EVERY;
    }
    updateHUD();
  } else {
    combo = 0;
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
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  skin.cell(context, x * size, y * size, size, color);
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

function refreshGridColor() {
  gridColor = skin.grid || getComputedStyle(document.documentElement).getPropertyValue('--grid').trim();
}

function applySkin(name) {
  if (!SKINS[name]) name = 'retro';
  skin = SKINS[name];
  COLORS = skin.colors;
  document.documentElement.dataset.skin = name;
  canvas.style.background = skin.bg || '';
  nextCanvas.style.background = skin.bg || '';
  skinSelect.value = name;
  refreshGridColor();
  try { localStorage.setItem(SKIN_KEY, name); } catch (e) { /* sin persistencia */ }
  if (board) {
    draw();
    drawNext();
  }
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
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()} · Líneas: ${lines} · Combo: ${maxCombo}`;

  const data = loadRecords();
  data.bestCombo = Math.max(data.bestCombo, maxCombo);
  data.maxLines = Math.max(data.maxLines, lines);
  saveRecords(data);

  const pos = qualifies(score);
  recordsBox.classList.remove('hidden');
  renderRecords();
  if (pos !== -1) {
    recordPending = true;
    recordMsg.textContent = `¡Nuevo récord! Puesto #${pos + 1}`;
    recordMsg.classList.remove('hidden');
    recordForm.classList.remove('hidden');
    try { playerName.value = localStorage.getItem(NAME_KEY) || ''; } catch (e) { playerName.value = ''; }
  }
  restartBtn.textContent = 'Reiniciar';
  overlay.classList.remove('hidden');
  if (pos !== -1) playerName.focus();
}

function showPauseView(controls) {
  pauseMain.classList.toggle('hidden', controls);
  pauseControls.classList.toggle('hidden', !controls);
  const btn = (controls ? pauseControls : pauseMain).querySelector('button');
  if (btn) btn.focus();
}

function openPause() {
  if (gameOver || paused) return;
  paused = true;
  cancelAnimationFrame(animId);
  draw();
  pauseMenu.classList.remove('hidden');
  showPauseView(false);
}

function closePause() {
  if (!paused) return;
  paused = false;
  pauseMenu.classList.add('hidden');
  if (document.activeElement) document.activeElement.blur(); // evita que Space/Enter reactive un botón
  resumeGuard = true;
  lastTime = performance.now();
  loop(lastTime);
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
  submitRecord(); // no perder un record pendiente al reiniciar
  recordMsg.classList.add('hidden');
  recordForm.classList.add('hidden');
  board = createBoard();
  score = 0;
  lines = 0;
  combo = 0;
  maxCombo = 0;
  startLevel = Number(startLevelSel.value) || 1;
  setLevel();
  paused = false;
  gameOver = false;
  resumeGuard = false;
  dropAccum = 0;
  nextPowerupAt = POWERUP_EVERY;
  powerupPending = false;
  freezeMs = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (e.repeat) return;
    if (gameOver) return;
    if (!paused) openPause();
    else if (e.code === 'Escape' && pauseMain.classList.contains('hidden')) showPauseView(false);
    else closePause();
    return;
  }
  if (paused) return; // el menú maneja Tab/Enter/Space/flechas por sí mismo
  if (gameOver) return;
  if (resumeGuard && e.repeat) return;
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

restartBtn.addEventListener('click', () => {
  restartBtn.textContent = 'Reiniciar';
  restartBtn.blur(); // evita que el botón capture Space
  init();
});
document.addEventListener('keyup', () => { resumeGuard = false; });


pauseMenu.addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  switch (btn.dataset.action) {
    case 'resume': closePause(); break;
    case 'restart': init(); if (document.activeElement) document.activeElement.blur(); break;
    case 'controls': showPauseView(true); break;
    case 'back': showPauseView(false); break;
  }
});

window.addEventListener('blur', openPause);


recordForm.addEventListener('submit', e => {
  e.preventDefault();
  submitRecord();
  restartBtn.focus();
});

resetRecordsBtn.addEventListener('click', () => {
  if (confirm('¿Borrar todos los records?')) {
    try { localStorage.removeItem(RECORDS_KEY); } catch (err) { /* ignorar */ }
    recordPending = false;
    recordForm.classList.add('hidden');
    recordMsg.classList.add('hidden');
    renderRecords();
  }
  resetRecordsBtn.blur();
});

themeToggle.addEventListener('click', () => {
  const root = document.documentElement;
  const light = root.dataset.theme !== 'light';
  if (light) root.dataset.theme = 'light';
  else delete root.dataset.theme;
  themeToggle.setAttribute('aria-checked', String(light));
  themeToggle.textContent = light ? '☀️' : '🌙';
  refreshGridColor();
  themeToggle.blur(); // evita que el botón capture Space/P
  draw();
  drawNext();
});

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  skinSelect.blur(); // evita que las flechas/Space sigan cambiando el select
});

let savedSkin = 'retro';
try { savedSkin = localStorage.getItem(SKIN_KEY) || 'retro'; } catch (e) { /* sin persistencia */ }
applySkin(savedSkin);
showStart();
