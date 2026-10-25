# EchoCrime: The Midnight Theft

**A 3D detective mystery you solve with your eyes, your ears, and (if you like) just your hand.**

▶ **Play it: [echocrime.onrender.com](https://echocrime.onrender.com/)** (Chrome or Edge, desktop)

> The free server sleeps when idle, so the first load can take up to a minute.

Riverside Museum, 11:47 PM. A priceless artifact is gone, and the security cameras were switched off. But one microphone kept recording. Walk the museum, collect evidence, listen to the tape, catch a lie, and name the thief.

## Features
- **Explore a 3D museum.** Five connected rooms, a third-person detective, real physics.
- **Find evidence by looking closely.** Walking past an object reveals nothing; you have to inspect it. Each clue adds an event to the **timeline of the night**.
- **Listen for the hidden clue.** The audio lab shows the real waveform of the security tape, and one faint sound isn't labelled anywhere.
- **Ask "What if?"** Type a theory like *"What if the glass broke after the footsteps?"* and hear the tape rebuilt in that order. It's a way to think, never evidence.
- **Catch the lie.** Test any suspect's statement against any clue.
- **Accuse.** Name the right suspect and back it up with evidence. You get three tries.
- **Play with your hand.** Webcam gesture control works alongside the keyboard.
- **No cheating.** The solution lives only on the server and never reaches your browser.

## Controls

| Keyboard and mouse | Hand (click **Use hand control**, then hold your hand still for a second) | Action |
|---|---|---|
| W A S D or arrow keys | Move your hand up / down | Walk |
| Mouse (click the scene first) | Move your hand left / right | Turn |
| Shift | Move your hand further up | Run |
| | Swipe with an open hand towards a doorway | Walk into the next room automatically |
| E | Pinch | Inspect |
| Enter | Hold a pinch | Collect evidence |
| Esc | Make a fist | Stop / close |
| Tab, T, M | | Evidence, timeline, map |

The hand panel has a **Slow / Normal / Fast** speed setting (Slow is the default). Video is processed in your browser and never uploaded.

## Run locally
Needs Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open http://localhost:5173. `npm run dev` starts both the game and the API on port 8787. Accusations and the theory board need the API.

| Command | What it does |
|---|---|
| `npm run build` | Type-check and production build |
| `npm run test:logic` | Unit tests for the "What if?" parser and tape reconstruction |
| `npx tsx scripts/test-hand-speed.ts` | Unit tests for the hand-joystick speed settings |
| `node scripts/make-audio.mjs` | Regenerate the audio files |

## Deploy
`render.yaml` sets up one Render web service that serves both the game and the API from a single HTTPS address. The webcam only works over HTTPS. Build: `npm install --include=dev && npm run build`. Start: `npm start`. Health check: `/api/health`. Setting `ANTHROPIC_API_KEY` is optional and turns on an AI sentence parser for "What if?"; without it, a built-in rule parser is used.

## How it's built
- **Game:** React, TypeScript, Vite, React Three Fiber (Three.js), Rapier physics, Zustand, Tailwind, Framer Motion
- **Audio:** wavesurfer.js and the Web Audio API. "What if?" rebuilds the tape in the browser, and the same theory always gives the same result.
- **Hand tracking:** MediaPipe hand landmarks. The palm acts as a joystick; swipes pick a doorway and the detective walks a route found with A\* around the furniture.
- **Server:** Node, Express and Zod. It checks theories and accusations against the hidden solution (`server/solution.ts`).

| Folder | Contents |
|---|---|
| `src/scene/` | Museum, props, collisions, detective and camera |
| `src/components/` | HUD, inspection, timeline, map, audio lab, theory board, accusation, hand panel |
| `src/state/` | Game, evidence, audio and mystery state |
| `src/lib/hand/` | Webcam tracking, gestures, speed settings, room navigation |
| `server/` | API and hidden solution |

## Good to know
- The audio was **generated with code**, not recorded and not AI-generated. "What if?" reorders the existing clips.
- The 3D scene is demanding. Laptops without a separate graphics card may stutter, especially the first time each room appears.

## Credits
All assets are CC0 or public domain: [Poly Haven](https://polyhaven.com) (models, textures), [Quaternius](https://quaternius.com) (character, animations), [The Met Open Access](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access) (paintings by Vermeer, Bruegel, Turner and van Gogh). Details in `public/models/ASSETS.md` and `public/art/paintings.json`.

Step-by-step walkthrough (with spoilers): [HOW_TO_PLAY.md](HOW_TO_PLAY.md).
