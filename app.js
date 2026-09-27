'use strict';
/* Soda Cracker — UI + game flow. logic.js must load first. */

const $ = id => document.getElementById(id);
const SAVE_KEY = 'soda-cracker-progress';

function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (p && typeof p.unlocked === 'number') return p;
  } catch (e) {}
  return { unlocked: 1, stars: {} };
}
function saveProgress(p) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(p)); } catch (e) {}
}
let progress = loadProgress();

/* ---------------- sound (tiny synth, no assets) ---------------- */
let actx = null;
function beep(freq, dur, type, vol, when) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime + (when || 0);
    const o = actx.createOscillator(), g = actx.createGain();
    o.connect(g); g.connect(actx.destination);
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
const sfx = {
  pick:  () => beep(600, 0.07, 'square', 0.08),
  place: () => beep(440, 0.09, 'triangle', 0.12),
  clear: () => beep(300, 0.08, 'triangle', 0.08),
  check: () => { beep(220, 0.1, 'sawtooth', 0.08); beep(330, 0.1, 'sawtooth', 0.08, 0.1); },
  hint:  () => { beep(880, 0.12, 'sine', 0.12); beep(1320, 0.16, 'sine', 0.12, 0.1); },
  win:   () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'triangle', 0.14, i * 0.12)),
  lose:  () => [400, 340, 280, 200].forEach((f, i) => beep(f, 0.2, 'sawtooth', 0.08, i * 0.14)),
};

/* ---------------- game state ---------------- */
let levelIdx = 0, secret = [], guess = [], locked = [], triesLeft = 0, hintsLeft = 0;
let selectedCan = null, gameOver = false;

function canEl(canIdx, mini) {
  const c = CANS[canIdx];
  const d = document.createElement('div');
  d.className = 'can' + (mini ? ' mini' : '');
  d.style.setProperty('--c', c.color);
  d.style.setProperty('--dark', c.dark);
  d.innerHTML = '<div class="lid"></div><div class="body"><span class="label">' +
    c.short + '</span></div><div class="base"></div>';
  return d;
}

/* ---------------- level select ---------------- */
function renderLevels() {
  const grid = $('level-grid');
  grid.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    const locked = i >= progress.unlocked;
    b.className = 'level-btn' + (locked ? ' locked' : '');
    const st = progress.stars[i] || 0;
    b.innerHTML = '<div class="lv">' + (locked ? '🔒' : (i + 1)) + '</div>' +
      '<div class="st">' + ('★'.repeat(st) + '☆'.repeat(3 - st)) + '</div>' +
      '<div class="st" style="color:var(--muted);font-size:11px;letter-spacing:0">' +
      lv.slots + ' slots · ' + lv.cans + ' cans</div>';
    if (!locked) b.onclick = () => { sfx.pick(); startLevel(i); };
    grid.appendChild(b);
  });
  $('screen-levels').classList.remove('hidden');
  $('screen-game').classList.add('hidden');
}

$('back-btn').onclick = () => { renderLevels(); };
$('how-btn').onclick = () => { sfx.pick(); $('how-overlay').classList.remove('hidden'); };
$('how-close').onclick = () => $('how-overlay').classList.add('hidden');

/* ---------------- game ---------------- */
function startLevel(i) {
  levelIdx = i;
  const lv = LEVELS[i];
  secret = randomSecret(lv.slots, lv.cans);
  guess = new Array(lv.slots).fill(null);
  locked = new Array(lv.slots).fill(false);
  triesLeft = lv.tries;
  hintsLeft = lv.hints;
  selectedCan = null;
  gameOver = false;
  $('screen-levels').classList.add('hidden');
  $('screen-game').classList.remove('hidden');
  $('level-badge').textContent = 'LEVEL ' + (i + 1);
  updateTries();
  updateHintBtn();
  renderSecret(false);
  $('board').innerHTML = '';
  renderGuess();
  renderPalette();
  updateCheck();
}

function updateTries() {
  $('tries-badge').textContent = triesLeft + (triesLeft === 1 ? ' try' : ' tries') + ' left';
}

function updateHintBtn() {
  const b = $('hint-btn');
  b.textContent = '💡 ' + hintsLeft;
  b.classList.toggle('empty', hintsLeft <= 0);
}

$('hint-btn').onclick = () => {
  if (gameOver || hintsLeft <= 0) return;
  const candidates = [];
  for (let i = 0; i < secret.length; i++) if (!locked[i]) candidates.push(i);
  if (!candidates.length) return;
  const i = candidates[Math.floor(Math.random() * candidates.length)];
  const can = secret[i];
  // that can leaves any other slot — it's now locked in the right place
  for (let j = 0; j < guess.length; j++) if (guess[j] === can) guess[j] = null;
  guess[i] = can;
  locked[i] = true;
  hintsLeft--;
  sfx.hint();
  updateHintBtn();
  renderGuess();
  renderPalette();
  updateCheck();
};

function renderSecret(reveal) {
  const row = $('secret-row');
  row.innerHTML = '';
  const lv = LEVELS[levelIdx];
  for (let s = 0; s < lv.slots; s++) {
    if (reveal) {
      row.appendChild(canEl(secret[s]));
    } else {
      const d = document.createElement('div');
      d.className = 'can secret';
      d.innerHTML = '<div class="lid"></div><div class="body"><span class="label">?</span></div><div class="base"></div>';
      row.appendChild(d);
    }
  }
}

function renderGuess() {
  const row = $('guess-row');
  row.innerHTML = '';
  guess.forEach((g, i) => {
    const s = document.createElement('div');
    s.className = 'slot' + (g !== null ? ' filled' : '') + (locked[i] ? ' locked' : '');
    if (g !== null) s.appendChild(canEl(g));
    s.onclick = () => onSlotTap(i);
    row.appendChild(s);
  });
}

function renderPalette() {
  const pal = $('palette');
  pal.innerHTML = '';
  const lv = LEVELS[levelIdx];
  const usedCans = new Set(guess.filter(g => g !== null));
  for (let c = 0; c < lv.cans; c++) {
    const el = canEl(c);
    el.dataset.can = c;
    const name = document.createElement('div');
    name.className = 'pname';
    name.textContent = CANS[c].name;
    el.appendChild(name);
    if (selectedCan === c) el.classList.add('selected');
    if (usedCans.has(c)) {
      // placed cans leave the shelf
      el.classList.add('used');
      el.onclick = () => {
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      };
    } else {
      el.onclick = () => {
        if (gameOver) return;
        sfx.pick();
        selectedCan = (selectedCan === c) ? null : c;
        renderPalette();
      };
    }
    pal.appendChild(el);
  }
}

function onSlotTap(i) {
  if (gameOver || locked[i]) return;
  if (guess[i] !== null && selectedCan === null) {
    // tap a filled slot with nothing selected = clear it
    guess[i] = null;
    sfx.clear();
  } else if (selectedCan !== null) {
    guess[i] = selectedCan;
    selectedCan = null; // that can left the shelf — pick another
    sfx.place();
  } else {
    // nothing selected: hint the palette
    $('palette').classList.remove('hint');
    void $('palette').offsetWidth;
    $('palette').classList.add('hint');
    return;
  }
  renderGuess();
  renderPalette();
  updateCheck();
}

function updateCheck() {
  $('check-btn').disabled = gameOver || guess.some(g => g === null);
}

$('check-btn').onclick = () => {
  if (gameOver || guess.some(g => g === null)) return;
  sfx.check();
  const { black, white } = scoreGuess(secret, guess);
  triesLeft--;
  addBoardRow(guess.slice(), black, white, LEVELS[levelIdx].tries - triesLeft);
  updateTries();
  if (black === secret.length) {
    endGame(true);
  } else if (triesLeft <= 0) {
    endGame(false);
  } else {
    if (black + white === 0) {
      // total miss: shake the guess row for feedback
      const gr = $('guess-row');
      gr.classList.remove('shake'); void gr.offsetWidth; gr.classList.add('shake');
    }
    // new guess — hint-locked cans stay locked in
    const ng = new Array(secret.length).fill(null);
    for (let i = 0; i < secret.length; i++) if (locked[i]) ng[i] = secret[i];
    guess = ng;
    renderGuess();
    renderPalette();
    updateCheck();
  }
};

function addBoardRow(g, black, white, num) {
  const row = document.createElement('div');
  row.className = 'board-row';
  const cans = document.createElement('div');
  cans.className = 'board-cans';
  g.forEach(c => cans.appendChild(canEl(c, true)));
  const pegs = document.createElement('div');
  pegs.className = 'pegs';
  for (let i = 0; i < black; i++) { const p = document.createElement('span'); p.className = 'peg black'; pegs.appendChild(p); }
  for (let i = 0; i < white; i++) { const p = document.createElement('span'); p.className = 'peg white'; pegs.appendChild(p); }
  const n = document.createElement('div');
  n.className = 'row-num';
  n.textContent = num;
  row.appendChild(n); row.appendChild(cans); row.appendChild(pegs);
  const board = $('board');
  board.appendChild(row);
  board.scrollTop = board.scrollHeight;
}

/* ---------------- end of game ---------------- */
function endGame(won) {
  gameOver = true;
  updateCheck();
  renderSecret(true);
  const lv = LEVELS[levelIdx];
  const triesUsed = lv.tries - triesLeft;
  // show the answer right in the card — win or lose
  const ans = $('end-answer');
  ans.innerHTML = '';
  secret.forEach(c => ans.appendChild(canEl(c, true)));
  if (won) {
    sfx.win();
    const stars = starsFor(triesUsed, lv.tries);
    progress.stars[levelIdx] = Math.max(progress.stars[levelIdx] || 0, stars);
    progress.unlocked = Math.max(progress.unlocked, Math.min(levelIdx + 2, LEVELS.length));
    saveProgress(progress);
    $('end-emoji').textContent = '🏆';
    $('end-title').textContent = 'CRACKED!';
    $('end-sub').textContent = 'You cracked level ' + (levelIdx + 1) + ' in ' + triesUsed + (triesUsed === 1 ? ' try!' : ' tries!');
    $('end-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('next-btn').style.display = levelIdx + 1 < LEVELS.length ? '' : 'none';
    fireConfetti();
  } else {
    sfx.lose();
    $('end-emoji').textContent = '🫧';
    $('end-title').textContent = 'OUT OF TRIES';
    $('end-sub').textContent = 'The secret lineup is revealed above. Try again!';
    $('end-stars').textContent = '';
    $('next-btn').style.display = 'none';
  }
  setTimeout(() => $('end-overlay').classList.remove('hidden'), won ? 900 : 600);
}

$('retry-btn').onclick = () => { $('end-overlay').classList.add('hidden'); sfx.pick(); startLevel(levelIdx); };
$('next-btn').onclick = () => { $('end-overlay').classList.add('hidden'); sfx.pick(); startLevel(levelIdx + 1); };
$('end-levels-btn').onclick = () => { $('end-overlay').classList.add('hidden'); renderLevels(); };

/* ---------------- confetti ---------------- */
function fireConfetti() {
  const cv = $('confetti');
  const ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = CANS.map(c => c.color).concat(['#ffffff', '#ffbe0b']);
  const parts = [];
  for (let i = 0; i < 160; i++) {
    parts.push({
      x: innerWidth / 2, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14, vy: Math.random() * -11 - 3,
      s: Math.random() * 7 + 3, c: colors[i % colors.length],
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, life: 1,
    });
  }
  let frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.r += p.vr; p.life -= 0.008;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    }
    if (++frames < 220) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  })();
}

/* ---------------- boot ---------------- */
renderLevels();
