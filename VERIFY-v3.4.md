# v3.4 Verification Report

- JavaScript syntax: PASS
- Standard/Weird regression suite: PASS
- v3.4 UI/architecture smoke suite: PASS
- Real Chromium mobile viewport: PASS

Measured at 390 × 844 CSS pixels:
- document scroll height: 844
- body scroll height: 844
- body overflow during match: hidden
- board: 378 × 378, fully inside viewport
- Match Panel: fixed bottom sheet; page remains 844px tall and panel scrolls internally

The browser verification used the exact production HTML/CSS/JS injected into Chrome because this execution environment blocks localhost/file navigation by enterprise URL policy.
