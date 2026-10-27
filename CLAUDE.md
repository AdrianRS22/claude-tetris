# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla JS Tetris (HTML5 Canvas). No `package.json`, no build, no tests, no linter. Run by opening `index.html` or serving the directory statically (e.g. `python -m http.server 8000`). The README and UI text are in Spanish.

## Architecture

Three files: `index.html` (DOM + two canvases), `style.css`, and `game.js` (all logic, one script loaded with `'use strict'`, global state, no modules).

- State lives in top-level `let` variables in `game.js` (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, ...). `init()` resets everything and is also the restart handler.
- Board is a `ROWS × COLS` matrix of `0` or a piece-type index 1–7; the same index selects the entry in `COLORS` and `PIECES` (index 0 is `null` in both).
- Piece lifecycle: `lockPiece()` = `merge()` → `clearLines()` → `spawn()`. `spawn()` promotes `next` to `current` and calls `endGame()` if it collides immediately.
- Gravity is in `loop()` (requestAnimationFrame + `dropAccum`); player input is a single `keydown` listener. Both paths call `lockPiece()`, so lock behavior changes must cover `loop`, `softDrop`, and `hardDrop`.
- `endGame()` and pausing use `cancelAnimationFrame(animId)`; resuming/restarting restarts the loop manually.

## Gotchas

- Changing `COLS`/`ROWS`/`BLOCK` requires updating the `width`/`height` attributes of `<canvas id="board">` in `index.html` (`COLS*BLOCK` × `ROWS*BLOCK`). The next-piece canvas assumes a 4×4 grid of 30px blocks (`drawNext`).
- Rotation is `rotateCW` plus simple horizontal kicks `[0,-1,1,-2,2]` in `tryRotate` (not SRS).
- `spawn()` calls `drawNext()`, which uses DOM elements, so DOM lookups at the top of `game.js` must stay before `init()`.
