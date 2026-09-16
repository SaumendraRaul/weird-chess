# Weird Chess v3.5

A polished purple-themed mobile-first chess website with:

- Full standard chess rules baseline
- 2-player pass-and-play
- Five optional Weird modifiers
- Tap-to-move and drag-and-drop
- Animated moves
- Human-like bot delays
- Easy bot
- Normal bot
- High: Stockfish with UCI Elo set to 1500 (Classic rules)
- StorkPiss: Stockfish with UCI Elo set to 3000 (Classic rules)
- PWA manifest / home-screen installation when hosted over HTTPS
- 5 board skins with saved preferences
- 5 piece skins with mutation/evolution/fusion visual effects

## Run

You need Node.js installed.

```bash
npm install
npm start
```

Then open:

http://localhost:8080

`npm install` installs Stockfish 18 and copies the lite single-threaded browser
engine into `public/engine/`.

## Important: Weird modifiers + Stockfish

Stockfish only knows orthodox chess. High and StorkPiss use Stockfish when every
Weird modifier is OFF. If custom rules are enabled, the game transparently uses
the built-in Weird Engine instead.

## Install on a phone home screen

Host the `public/` folder over HTTPS (GitHub Pages, Netlify, Vercel, etc.), open
the site in Chrome on Android, and choose **Add to Home screen / Install app**.

## GitHub Pages deployment

The repository includes `.github/workflows/deploy-pages.yml`.
Every push to `main` installs Stockfish, runs the JavaScript syntax checks, and deploys the `public/` directory through GitHub Pages.

## Stockfish

This project uses the `stockfish` npm package (Stockfish.js / Stockfish 18),
licensed under GPL-3.0. See the upstream package/repository for source and license.

## Core weird-game systems

- Player-specific Evolution Gates
- Both Evolution Gates relocate after every move
- Gate placement favors difficult, far-away squares in the opponent half
- Pieces need 2 captures to become Evolution Ready, then must reach their own gate
- Branching evolution choices
- Multiple mutation types
- Fusion is limited to one fusion per piece
- Match presets
- Optional per-turn timers
- Funny announcer commentary
- Selected-piece XP / mutation / fusion info
- Match statistics and end screen
- Local save / resume

## v3.3 stability + multiplayer-readiness
- Fair, reachable moving Evolution Gates with HUD guidance
- Mutation squares show their effect and relocate every 4 plies
- Optional undo policy, haptics, timer pause during dialogs/bot thinking
- Fog visibility safeguards and Weird-mode draw-rule fixes
- Versioned save/resume with canonical export/import + state hash API
- PWA update banner and cache versioning
- Better Weird Engine evaluation, including bot Fusion
- Remembered match setup and Custom/Mutation Mayhem presets

## v3.4 polish + pre-multiplayer architecture

- Match view fits the phone viewport without page scrolling; secondary panels use a bottom sheet
- Seeded deterministic Weird randomness and deterministic Weird Engine choices
- Replay viewer, event timeline, share/load match codes
- Local player profiles, achievements, 50-match history and Match MVP
- Chaos Meter (visual only)
- Rulebook/encyclopedia
- Accessibility: high contrast, larger pieces, reduced motion, King danger preview, special-action confirmations
- Custom Weird rule editor and “Give Me Something Stupid” generator
- Chess960-style shuffled starting position with castling-safe generated layouts
- Network-ready rules versioning, turn-ownership validation helper, spectator snapshots, reconnect snapshots and authoritative desync recovery interface

## v3.5 game modes

Game modes are independent from Weird modifiers:

- Classic
- King Hunt
- Horde
- Sudden Death
- Evolution Race
- Draft Chess
- Boss Battle
- Infection
- Random Army

Kings are permanently excluded from Evolution: no Evolution XP, readiness, gate use, or evolution branches.
