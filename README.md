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

**Touch / mobile** — swipe anywhere on the canvas (one action per swipe, even on long drags):

| Action        | Gesture                          |
| ------------- | -------------------------------- |
| Move left     | Swipe `←`                        |
| Move right    | Swipe `→`                        |
| Jump          | Swipe `↑`                        |
| Slide         | Swipe `↓` (fast-falls if airborne) |
| Pause         | Tap the `❚❚` button (top right, under the best score) |
| Restart       | Tap anywhere                     |

A compact corner widget also appears on touch devices as a fallback: a D-pad cluster (◀ ▲ ▼ ▶) in the bottom-right corner, and the pause button (`❚❚`) tucked under the best-score readout in the top right. Keyboard controls are unchanged on desktop; mouse drags on the canvas also register as swipes.

**iOS Safari note:** iOS has a system-level "swipe to go back / forward" gesture that fires when a touch starts within a strip of the screen edge, hijacking the swipe before the page ever sees it — no CSS can suppress it. Two things mitigate this:

- Swipes that start within 40px of the left or right screen edge are ignored (dead zone), so an edge swipe can never register as a half-action. Use the corner D-pad to strafe there, or start your swipe a little further in from the edge.
- The page ships a web-app manifest (`manifest.webmanifest`, `display: standalone`). Add the game to the Home Screen and launch it in Safari's web-app mode: fullscreen web-app mode disables the system swipe gestures, so edge swipes work normally there.

## How it works

- `index.html` — Vite's entry point; it loads `game.js` as a module. The bare `three` / `three/addons/*` imports in `game.js` are resolved from `node_modules` and bundled by Vite.
- `vite.config.mjs` — minimal Vite config; `vite build` emits a self-contained `dist/`.
- `game.js` — the whole game: scrolling grid ground, synthwave sun, three lanes, obstacles (walls / low hurdles / overhead bars), coins, jump & slide physics, WebAudio SFX, bloom postprocessing (with a plain-render fallback), HUD, and `localStorage` best score.
