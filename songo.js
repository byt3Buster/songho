const COLS = 6;
let board, scores, currentPlayer, gameOver, history;

function holeIndex(row, col) { return row * COLS + col; }

function nextHole(row, col) {
  if (row === 1) {
    if (col < COLS - 1) return [1, col + 1];
    else return [0, COLS - 1];
  } else {
    if (col > 0) return [0, col - 1];
    else return [1, 0];
  }
}

function prevHole(row, col) {
  if (row === 1) {
    if (col > 0) return [1, col - 1];
    else return [0, 0];
  } else {
    if (col < COLS - 1) return [0, col + 1];
    else return [1, COLS - 1];
  }
}

function deepCopy(b) { return b.map(r => [...r]); }

function resetGame() {
  board = Array(2).fill(null).map(() => Array(COLS).fill(4));
  scores = [0, 0];
  currentPlayer = 0;
  gameOver = false;
  history = [];
  render();
  setStatus('Joueur 1 commence !\nCliquez un trou de votre rangée.');
  updateScoreHighlight();
}

function canPlay(player) {
  const row = player === 0 ? 1 : 0;
  return board[row].some(v => v > 0);
}

function getValidMoves(player) {
  const row = player === 0 ? 1 : 0;
  const oppRow = 1 - row;
  const moves = [];
  for (let c = 0; c < COLS; c++) {
    if (board[row][c] === 0) continue;
    if (board[oppRow].some(v => v > 0)) {
      const sim = doSow(deepCopy(board), row, c, player, true);
      if (sim.newBoard[oppRow].every(v => v === 0)) continue;
    }
    moves.push(c);
  }
  if (moves.length === 0) {
    for (let c = 0; c < COLS; c++) {
      if (board[row][c] > 0) moves.push(c);
    }
  }
  return moves;
}

function doSow(b, startRow, startCol, player, simulate) {
  let seeds = b[startRow][startCol];
  b[startRow][startCol] = 0;
  let r = startRow, c = startCol;
  let captured = 0;

  while (seeds > 0) {
    [r, c] = nextHole(r, c);
    if (r === startRow && c === startCol) continue;
    b[r][c]++;
    seeds--;
  }

  const oppRow = player === 0 ? 0 : 1;
  let cr = r, cc = c;
  while (cr === oppRow && (b[cr][cc] === 2 || b[cr][cc] === 3)) {
    captured += b[cr][cc];
    b[cr][cc] = 0;
    [cr, cc] = prevHole(cr, cc);
  }

  return { newBoard: b, captured };
}

let selectedHole = null;

function onHoleClick(row, col) {
  if (gameOver) return;
  const playerRow = currentPlayer === 0 ? 1 : 0;
  if (row !== playerRow) return;
  if (board[row][col] === 0) return;

  const valid = getValidMoves(currentPlayer);
  if (!valid.includes(col)) {
    setStatus('⚠️ Ce coup est interdit\n(laisserait l\'adversaire sans graines)');
    return;
  }

  history.push({ board: deepCopy(board), scores: [...scores], currentPlayer });
  selectedHole = [row, col];
  render();

  setTimeout(() => {
    const { newBoard, captured } = doSow(deepCopy(board), row, col, currentPlayer, false);
    board = newBoard;
    scores[currentPlayer] += captured;
    selectedHole = null;

    const nextP = 1 - currentPlayer;
    if (!canPlay(nextP)) {
      const myRow = currentPlayer === 0 ? 1 : 0;
      for (let c = 0; c < COLS; c++) {
        scores[currentPlayer] += board[myRow][c];
        board[myRow][c] = 0;
      }
      gameOver = true;
      render();
      updateScoreHighlight();
      showResult();
      return;
    }
    currentPlayer = nextP;
    render();
    updateScoreHighlight();
    setStatus(`Joueur ${currentPlayer + 1} joue…`);
  }, 300);
}

function showResult() {
  const [s1, s2] = scores;
  let msg;
  if (s1 > s2) msg = `🏆 Joueur 1 gagne ! (${s1} vs ${s2})`;
  else if (s2 > s1) msg = `🏆 Joueur 2 gagne ! (${s2} vs ${s1})`;
  else msg = `🤝 Match nul ! (${s1} chacun)`;
  document.getElementById('status-box').innerHTML =
    `<span class="winner-banner">${msg}</span>`;
}

function undoMove() {
  if (history.length === 0) return;
  const prev = history.pop();
  board = prev.board;
  scores = prev.scores;
  currentPlayer = prev.currentPlayer;
  gameOver = false;
  selectedHole = null;
  render();
  updateScoreHighlight();
  setStatus(`Joueur ${currentPlayer + 1} joue…`);
}

function setStatus(msg) {
  if (gameOver) return;
  document.getElementById('status-box').textContent = msg;
}

function updateScoreHighlight() {
  document.getElementById('score-p1').classList.toggle('active-player', currentPlayer === 0);
  document.getElementById('score-p2').classList.toggle('active-player', currentPlayer === 1);
  document.getElementById('lbl-p1').classList.toggle('active', currentPlayer === 0);
  document.getElementById('lbl-p2').classList.toggle('active', currentPlayer === 1);
  document.getElementById('lbl-p1').textContent = currentPlayer === 0 && !gameOver
    ? 'Joueur 1 (Sud) — À vous de jouer ▲'
    : 'Joueur 1 (Sud)';
  document.getElementById('lbl-p2').textContent = currentPlayer === 1 && !gameOver
    ? '▼ Joueur 2 (Nord) — À vous de jouer'
    : 'Joueur 2 (Nord)';
}

function toggleRules() {
  const p = document.getElementById('rules-panel');
  p.style.display = p.style.display === 'block' ? 'none' : 'block';
}

function render() {
  document.getElementById('val-p1').textContent = scores[0];
  document.getElementById('val-p2').textContent = scores[1];
  const validMoves = !gameOver ? getValidMoves(currentPlayer) : [];
  const playerRow = currentPlayer === 0 ? 1 : 0;
  renderRow('row-top', 0, playerRow, validMoves);
  renderRow('row-bottom', 1, playerRow, validMoves);
}

function renderRow(containerId, rowIdx, playerRow, validMoves) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (let c = 0; c < COLS; c++) {
    const col = rowIdx === 0 ? (COLS - 1 - c) : c;
    const count = board[rowIdx][col];
    const hole = document.createElement('div');
    hole.className = 'hole';

    const isPlayerHole = rowIdx === playerRow;
    const isSelected = selectedHole && selectedHole[0] === rowIdx && selectedHole[1] === col;
    const isPlayable = isPlayerHole && validMoves.includes(col) && !gameOver;

    if (isSelected) hole.classList.add('selected');
    else if (isPlayable && count > 0) hole.classList.add('playable');
    if (!isPlayerHole || gameOver) hole.classList.add('disabled');
    if (isPlayerHole && count === 0 && !gameOver) hole.classList.add('empty-disabled');

    if (!gameOver && isPlayerHole && count > 0) {
      hole.addEventListener('click', () => onHoleClick(rowIdx, col));
    }

    const seeds = document.createElement('div');
    seeds.className = 'seeds';
    const show = Math.min(count, 12);
    for (let i = 0; i < show; i++) {
      const s = document.createElement('div');
      s.className = 'seed';
      seeds.appendChild(s);
    }
    hole.appendChild(seeds);

    if (count > 0) {
      const badge = document.createElement('div');
      badge.className = 'count-badge';
      badge.textContent = count;
      hole.appendChild(badge);
    }

    container.appendChild(hole);
  }
}

// Lancement
resetGame();