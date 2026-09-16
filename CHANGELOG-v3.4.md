# Weird Chess v3.4

Major polish and multiplayer-readiness release.

### Playability
- Match screen is fixed to the viewport on phones: no page scrolling during play.
- Match panels are available in a bottom sheet.
- Added accessibility settings and King-danger preview.

### Replay / persistence
- Replay frames, event timeline, local history, match codes, achievements, player profiles.
- Versioned rules + deterministic state hashing retained.
- Match MVP and Chaos Meter.

### Rules / weirdness
- Seeded deterministic gameplay randomness.
- Configurable evolution capture threshold, gate movement rate, mutation shift rate, and mutation-square count.
- Chess960-style shuffled starting positions.
- Random balanced-ish “Give Me Something Stupid” setup.

### Multiplayer architecture
- Rules-versioned action envelopes.
- Turn ownership validation helper.
- Spectator snapshot format.
- Reconnect snapshot storage.
- Authoritative snapshot application + desync recovery.
- These are the client architecture for v4; no remote room server is included in v3.4.
