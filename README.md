# Neon Runner

A neon synthwave endless-runner built with [three.js](https://threejs.org), served locally by a tiny Node static server (no build tooling, no CDN — `three` is imported from the local `node_modules` via an import map).

## Requirements

- Node.js (LTS or current) with `npm`

## Run

```bash
npm install three   # installs three@0.186.1 into ./node_modules
npm start           # runs node server.js
```

Then open **http://localhost:8000** in your browser.

## Controls

| Action        | Keys                        |
| ------------- | --------------------------- |
| Move left     | `←` / `A`                   |
| Move right    | `→` / `D`                   |
| Jump          | `↑` / `W` / `Space`         |
| Slide         | `↓` / `S`                   |
| Pause         | `P`                         |
| Restart       | `R` / `Enter`               |

Touch: tap the left/right halves of the canvas to strafe, top half to jump, bottom half to slide.

## How it works

- `server.js` — a ~50-line `node:http` static file server rooted at the workspace; it serves `index.html`, `game.js`, and the local `node_modules/three/...` module files with correct MIME types.
- `index.html` — declares an import map (`three` → `/node_modules/three/build/three.module.js`, `three/addons/` → `/node_modules/three/examples/jsm/`) and loads `game.js` as a module.
- `game.js` — the whole game: scrolling grid ground, synthwave sun, three lanes, obstacles (walls / low hurdles / overhead bars), coins, jump & slide physics, WebAudio SFX, bloom postprocessing (with a plain-render fallback), HUD, and `localStorage` best score.
