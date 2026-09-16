# Weird Chess v3.3 — Stability & Multiplayer Readiness

## Evolution
- White and Black have separate moving Evolution Gates.
- Gates relocate after every move.
- If an Evolution Ready piece exists, its player's new gate is guaranteed to be on a legal, reachable empty destination for at least one ready piece that turn.
- Gate placement still favors awkward/deep locations and reduces repeatedly unsafe placements.
- Gate HUD shows the active gate coordinate, readiness count, and directional hint when a piece is selected.
- Pieces show 0/2 capture progress, a much stronger ready glow, and a permanent evolution-level badge.
- Evolution chooser previews the movement style of each branch.

## Mutation
- Every mutation square now advertises its exact effect with a distinct icon/color.
- Mutation squares relocate every 4 plies.
- Phase Hop, Rift Step, Wild Leaper, and Sidewinder remain useful as special leap/wrap abilities.
- Selected-piece info explains the active mutation.

## Fusion
- Kings cannot fuse.
- A fused piece cannot fuse again.
- Fused pieces display both movement identities and a stronger dual aura.
- The Weird Engine can now evaluate and perform Fusion moves.
- Fixed self-fusion as part of regression testing.

## Fog of War
- A clear Fog ACTIVE badge appears in-match.
- Friendly pieces, the active Evolution Gate, and legal move/capture indicators remain visible as intended.
- Fog does not alter check, castling, en passant, promotion, or move legality.

## Timers / Controls
- Promotion and evolution choice dialogs pause the turn clock.
- Bot thinking does not consume a player clock.
- Local matches can enable or disable Undo before starting.
- Bot Undo still rewinds a full human+bot cycle.

## Mobile feedback
- Optional haptics for moves, captures, checks, mutation, evolution, and fusion.
- Improved touch hit areas, drag behavior, selection prevention, and overscroll control.
- Stronger last-move visibility across dark board themes.

## Save / PWA
- Save format is versioned at 3.3.0; incompatible old saves are safely cleared.
- Full Weird state, gates, mutations, timer state, powers, stats, and match settings are serialized.
- New PWA versions can display an Update Available banner and reload into the waiting service worker.
- Cache key bumped to `weird-chess-v3-3-stability`.

## Multiplayer foundation
- Added canonical `window.gameState` / `window.WeirdChessState` API with export, replace, and deterministic gameplay hash.
- Cosmetic preferences such as skins and haptics are deliberately excluded from the gameplay hash so two future online clients can use different cosmetics without false desyncs.

## Bot personality
- Easy intentionally chooses weaker moves most of the time.
- Normal weighs king safety more heavily.
- Weird Engine values gates, mutations, fused material, and Fusion actions.
- High/StorkPiss retain Stockfish in Classic mode and gracefully fall back to Weird Engine if Stockfish cannot load.
