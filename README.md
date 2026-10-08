# Neon Runner

A neon synthwave endless-runner built with [three.js](https://threejs.org), built and served statically with [Vite](https://vite.dev) (no CDN — `three` is bundled from the local `node_modules`).

## Requirements

- Node.js (LTS or current) with `npm`

## Run

```bash
npm install         # installs three + vite into ./node_modules
npm run dev         # Vite dev server (live reload) → http://localhost:5173
npm run build       # static build → ./dist
npm run preview     # serve ./dist → http://localhost:4173
```

Deploy the `dist/` output to any static host.

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

- `index.html` — Vite's entry point; it loads `game.js` as a module. The bare `three` / `three/addons/*` imports in `game.js` are resolved from `node_modules` and bundled by Vite.
- `vite.config.mjs` — minimal Vite config; `vite build` emits a self-contained `dist/`.
- `game.js` — the whole game: scrolling grid ground, synthwave sun, three lanes, obstacles (walls / low hurdles / overhead bars), coins, jump & slide physics, WebAudio SFX, bloom postprocessing (with a plain-render fallback), HUD, and `localStorage` best score.
