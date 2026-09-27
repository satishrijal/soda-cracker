'use strict';
/* Soda Cracker — pure game logic (no DOM). Tested with node. */

const CANS = [
  { id: 'cola',   name: 'Cola',   short: 'C',  color: '#e63946', dark: '#9e1b28' },
  { id: 'orange', name: 'Orange', short: 'O',  color: '#f4842c', dark: '#b25a14' },
  { id: 'lime',   name: 'Lime',   short: 'L',  color: '#7ac74f', dark: '#4c8a2e' },
  { id: 'berry',  name: 'Berry',  short: 'B',  color: '#3a86ff', dark: '#1d54b4' },
  { id: 'grape',  name: 'Grape',  short: 'G',  color: '#8338ec', dark: '#571cab' },
  { id: 'energy', name: 'Energy', short: 'E',  color: '#ffbe0b', dark: '#bd8704' },
  { id: 'boba',   name: 'Boba',   short: 'Bo', color: '#c68e5e', dark: '#8a5f36' },
  { id: 'mint',   name: 'Mint',   short: 'M',  color: '#2ec4b6', dark: '#1a7a71' },
];

// level: { slots, cans (can types in play), tries, hints }
const LEVELS = [
  { slots: 3, cans: 4, tries: 8,  hints: 3 },
  { slots: 3, cans: 5, tries: 8,  hints: 3 },
  { slots: 4, cans: 5, tries: 9,  hints: 3 },
  { slots: 4, cans: 6, tries: 9,  hints: 2 },
  { slots: 4, cans: 6, tries: 8,  hints: 2 },
  { slots: 5, cans: 6, tries: 10, hints: 2 },
  { slots: 5, cans: 7, tries: 10, hints: 2 },
  { slots: 5, cans: 7, tries: 9,  hints: 1 },
  { slots: 5, cans: 8, tries: 10, hints: 1 },
  { slots: 6, cans: 8, tries: 10, hints: 1 },
];

// Secret uses each can at most once (matches the shelf: placed cans leave the options).
function randomSecret(slots, canCount, rand) {
  const r = rand || Math.random;
  const pool = [];
  for (let i = 0; i < canCount; i++) pool.push(i);
  const secret = [];
  for (let i = 0; i < slots && pool.length; i++) {
    secret.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  }
  return secret; // distinct indexes into the level's can set
}

// Classic Mastermind scoring. secret/guess are arrays of can indexes.
// Returns { black: right can right place, white: right can wrong place }.
function scoreGuess(secret, guess) {
  let black = 0, white = 0;
  const sUsed = new Array(secret.length).fill(false);
  const gUsed = new Array(guess.length).fill(false);
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) { black++; sUsed[i] = gUsed[i] = true; }
  }
  for (let i = 0; i < guess.length; i++) {
    if (gUsed[i]) continue;
    for (let j = 0; j < secret.length; j++) {
      if (!sUsed[j] && guess[i] === secret[j]) { white++; sUsed[j] = true; break; }
    }
  }
  return { black, white };
}

// 3 stars: solved fast, 2: comfortable, 1: just barely
function starsFor(triesUsed, triesAllowed) {
  const ratio = triesUsed / triesAllowed;
  if (ratio <= 0.4) return 3;
  if (ratio <= 0.7) return 2;
  return 1;
}

if (typeof module !== 'undefined') {
  module.exports = { CANS, LEVELS, randomSecret, scoreGuess, starsFor };
}
