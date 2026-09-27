# 🥫 Soda Cracker

Crack the secret soda lineup — a Mastermind-style deduction game with soda cans.

## How to play
1. The machine hides a secret lineup of soda cans.
2. Tap a can, then tap a slot to place it. Tap a filled slot (with nothing selected) to clear it.
3. Hit **CHECK** — pegs tell you:
   - ⚫ right can, right spot
   - ⚪ right can, wrong spot
4. Crack the exact lineup before your tries run out.

## Levels
10 levels — longer lineups, more can types, tighter try limits as you go.
Stars (1–3) based on how fast you crack it. Progress saves on your device.

## Run / deploy
Static site, no build, no backend. Open `index.html` or deploy to Render as a
Static Site with publish directory = project root.

## Files
- `index.html` — screens
- `style.css` — vending-machine arcade UI, CSS-drawn cans
- `logic.js` — pure game logic (cans, levels, Mastermind scoring)
- `app.js` — UI + flow + sounds + confetti
- `test.js` — `node test.js` (20 tests)
