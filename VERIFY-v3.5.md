# Weird Chess v3.5 Verification

- JavaScript syntax: PASS
- Standard chess / Weird regression suite: PASS
- v3.5 mode smoke suite: PASS
- King Evolution exclusion: PASS
- Mobile Chromium layout: PASS

### Mode checks passed
- King Hunt ignores check restrictions and ends on physical King capture
- Horde creates the oversized pawn swarm correctly
- Sudden Death blocks collapsed board rings
- Evolution Race ends on the configured Evolution target
- Draft Chess always includes both Kings
- Boss Battle Boss King receives extended movement
- Infection converts captured non-Kings
- Random Army produces equal material sets for both sides
- Mode data is included in exported state and state hashes

### Mobile check
Viewport: 390 × 844 CSS px

- document height: 844 px
- body height: 844 px
- board: 378 × 378 px
- game page scrolling: none
- Match Panel: overlay/bottom sheet with internal scrolling
- selected mode HUD verified with King Hunt

Kings are permanently excluded from Evolution:
- no Evolution XP
- no Evolution Ready state
- no Evolution Gate use
- no evolution branches
