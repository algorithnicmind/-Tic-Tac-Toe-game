document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('.app-section');
    const getStartedBtn = document.getElementById('get-started-btn');
    const loginTab = document.getElementById('tab-login');
    const signupTab = document.getElementById('tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const p2InputGroup = document.getElementById('p2-input-group');
    const p2Label = document.getElementById('p2-label');
    const gridSizeSelect = document.getElementById('grid-size');
    const aiDifficultySelect = document.getElementById('ai-difficulty');
    const aiDifficultyGroup = document.getElementById('ai-difficulty-group');
    const startGameBtn = document.getElementById('start-game-btn');
    const exitGameBtn = document.getElementById('exit-game-btn');
    
    // Game Elements
    const board = document.getElementById('board');
    const cells = document.querySelectorAll('.cell');
    const statusText = document.getElementById('status');
    const restartBtn = document.getElementById('restart-btn');
    const resetScoreBtn = document.getElementById('reset-score-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMsg = document.getElementById('modal-msg');
    const playAgainBtn = document.getElementById('play-again-btn');
    const scoreXText = document.getElementById('score-x');
    const scoreOText = document.getElementById('score-o');
    const labelX = document.getElementById('label-x');
    const labelO = document.getElementById('label-o');
    const cardX = document.getElementById('card-x');
    const cardO = document.getElementById('card-o');

    // --- State Management ---
    let currentUser = JSON.parse(localStorage.getItem('ttt-user')) || null;
    let gameMode = 'pvp'; // 'pvp' or 'pve'
    let aiDifficulty = 'impossible'; // 'easy', 'medium', 'impossible'
    let currentGridSize = 3;
    let player1Name = 'Player X';
    let player2Name = 'Player O';
    let currentPlayer = 'X';
    let gameState = [];
    let winningConditions = [];
    let gameActive = true;
    let scores = { X: 0, O: 0 };

    // --- Audio System ---
    let audioCtx = null;
    let isAudioEnabled = false;
    let ambientOscillator = null;
    let ambientGain = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function toggleAudio() {
        isAudioEnabled = !isAudioEnabled;
        const btn = document.getElementById('audio-toggle-btn');
        if (btn) btn.innerText = isAudioEnabled ? '🔊' : '🔇';
        
        if (isAudioEnabled) {
            initAudio();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            playAmbient();
        } else {
            stopAmbient();
        }
    }

    function playAmbient() {
        if (!isAudioEnabled || !audioCtx) return;
        if (ambientOscillator) return;
        
        ambientOscillator = audioCtx.createOscillator();
        ambientGain = audioCtx.createGain();
        
        ambientOscillator.type = 'sine';
        ambientOscillator.frequency.setValueAtTime(55, audioCtx.currentTime);
        
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 5;
        lfo.connect(lfoGain);
        lfoGain.connect(ambientOscillator.frequency);
        lfo.start();

        ambientGain.gain.setValueAtTime(0, audioCtx.currentTime);
        ambientGain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 2);
        
        ambientOscillator.connect(ambientGain);
        ambientGain.connect(audioCtx.destination);
        ambientOscillator.start();
    }

    function stopAmbient() {
        if (ambientOscillator && ambientGain) {
            ambientGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
            setTimeout(() => {
                if (ambientOscillator) {
                    ambientOscillator.stop();
                    ambientOscillator.disconnect();
                    ambientOscillator = null;
                }
            }, 1000);
        }
    }

    function playMoveSound(player) {
        if (!isAudioEnabled || !audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = player === 'X' ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(player === 'X' ? 880 : 1200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(player === 'X' ? 440 : 600, audioCtx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }

    function playWinSound() {
        if (!isAudioEnabled || !audioCtx) return;
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.1);
            gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + i * 0.1 + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.5);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.start(audioCtx.currentTime + i * 0.1);
            osc.stop(audioCtx.currentTime + i * 0.1 + 0.5);
        });
    }

    function playDrawSound() {
        if (!isAudioEnabled || !audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }

    // --- History Logic ---
    function saveMatchHistory(winner) {
        const history = JSON.parse(localStorage.getItem('ttt-history')) || [];
        const match = {
            date: new Date().toLocaleString(),
            p1: player1Name,
            p2: player2Name,
            winner: winner,
            mode: gameMode
        };
        history.unshift(match);
        if (history.length > 20) history.pop();
        localStorage.setItem('ttt-history', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        const history = JSON.parse(localStorage.getItem('ttt-history')) || [];
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-msg">No match history available.</p>';
            return;
        }

        historyList.innerHTML = history.map(match => {
            let resultText = '';
            let resultClass = '';
            if (match.winner === 'tie') {
                resultText = 'Draw';
                resultClass = 'draw';
            } else {
                resultText = `${match.winner} Won`;
                resultClass = 'win';
            }

            return `
                <div class="history-item">
                    <div class="history-info">
                        <div class="history-date">${match.date} &bull; ${match.mode === 'pvp' ? 'PvP' : 'PvE'}</div>
                        <div class="history-players">${match.p1} vs ${match.p2}</div>
                    </div>
                    <div class="history-result ${resultClass}">${resultText}</div>
                </div>
            `;
        }).join('');
    }


    // --- Navigation Logic ---
    function navigateTo(targetId) {
        sections.forEach(s => s.classList.remove('active'));
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.add('active');
        
        navLinks.forEach(l => {
            l.classList.toggle('active', l.getAttribute('data-target') === targetId);
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.getAttribute('data-target'));
        });
    });

    getStartedBtn.addEventListener('click', () => {
        if (currentUser) {
            navigateTo('selection');
        } else {
            navigateTo('auth');
        }
    });

    // --- Auth Logic ---
    function updateAuthUI() {
        const navAuth = document.getElementById('nav-user-info');
        const audioBtnHtml = `<button id="audio-toggle-btn" class="btn-sm secondary" title="Toggle Audio">${isAudioEnabled ? '🔊' : '🔇'}</button>`;
        
        if (currentUser) {
            navAuth.innerHTML = `
                ${audioBtnHtml}
                <span class="user-greeting">Hi, ${currentUser.username}</span>
                <button class="btn-sm secondary" id="logout-btn">Logout</button>
            `;
            document.getElementById('logout-btn').addEventListener('click', () => {
                currentUser = null;
                localStorage.removeItem('ttt-user');
                updateAuthUI();
                navigateTo('home');
            });
        } else {
            navAuth.innerHTML = `${audioBtnHtml}<button class="btn-sm secondary" id="nav-login-btn">Login</button>`;
            document.getElementById('nav-login-btn').addEventListener('click', () => navigateTo('auth'));
        }
        
        document.getElementById('audio-toggle-btn').addEventListener('click', toggleAudio);
    }

    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });

    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        // Mock authentication
        currentUser = { username };
        localStorage.setItem('ttt-user', JSON.stringify(currentUser));
        updateAuthUI();
        navigateTo('selection');
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        currentUser = { username };
        localStorage.setItem('ttt-user', JSON.stringify(currentUser));
        updateAuthUI();
        navigateTo('selection');
    });

    // --- Selection Logic ---
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameMode = btn.getAttribute('data-mode');
            
            if (gameMode === 'pve') {
                p2InputGroup.style.display = 'none';
                aiDifficultyGroup.style.display = 'flex';
                player2Name = 'Smart AI';
            } else {
                p2InputGroup.style.display = 'flex';
                aiDifficultyGroup.style.display = 'none';
                player2Name = document.getElementById('p2-name').value || 'Player O';
            }
        });
    });

    startGameBtn.addEventListener('click', () => {
        player1Name = document.getElementById('p1-name').value || 'Player X';
        currentGridSize = parseInt(gridSizeSelect.value);
        aiDifficulty = aiDifficultySelect.value;
        winningConditions = generateWinningConditions(currentGridSize);
        board.style.setProperty('--grid-size', currentGridSize);

        if (gameMode === 'pvp') {
            player2Name = document.getElementById('p2-name').value || 'Player O';
        } else {
            player2Name = aiDifficulty === 'easy' ? 'Easy AI' : aiDifficulty === 'medium' ? 'Medium AI' : 'Impossible AI';
        }
        
        labelX.innerText = player1Name.toUpperCase();
        labelO.innerText = player2Name.toUpperCase();
        
        createBoard();
        restartGame();
        navigateTo('game');
    });

    exitGameBtn.addEventListener('click', () => {
        navigateTo('selection');
    });

    // --- Game Logic ---
    function handleCellClick(e) {
        const clickedCell = e.target;
        const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

        if (gameState[clickedCellIndex] !== "" || !gameActive) return;

        handleCellPlayed(clickedCell, clickedCellIndex);
        if (handleResultValidation()) return;

        if (gameMode === 'pve' && gameActive) {
            setTimeout(makeAiMove, 500);
        }
    }

    function handleCellPlayed(clickedCell, clickedCellIndex) {
        gameState[clickedCellIndex] = currentPlayer;
        clickedCell.innerText = currentPlayer;
        clickedCell.classList.add(currentPlayer.toLowerCase());
        playMoveSound(currentPlayer);
    }

    function handlePlayerChange() {
        currentPlayer = currentPlayer === "X" ? "O" : "X";
        const name = currentPlayer === 'X' ? player1Name : player2Name;
        statusText.innerText = `${name}'s Turn`;
        
        if (currentPlayer === 'X') {
            cardX.classList.add('active');
            cardO.classList.remove('active');
        } else {
            cardO.classList.add('active');
            cardX.classList.remove('active');
        }
    }

    function handleResultValidation() {
        let roundWon = false;
        let winLine = null;

        for (let i = 0; i < winningConditions.length; i++) {
            const winCondition = winningConditions[i];
            let firstCell = gameState[winCondition[0]];
            if (firstCell === '') continue;
            
            let allMatch = true;
            for (let j = 1; j < winCondition.length; j++) {
                if (gameState[winCondition[j]] !== firstCell) {
                    allMatch = false;
                    break;
                }
            }
            if (allMatch) {
                roundWon = true;
                winLine = winCondition;
                break;
            }
        }

        if (roundWon) {
            scores[currentPlayer]++;
            updateScoreboard();
            
            const allCells = document.querySelectorAll('.cell');
            winLine.forEach(idx => allCells[idx].classList.add('winner'));
            
            const winnerName = currentPlayer === 'X' ? player1Name : player2Name;
            playWinSound();
            saveMatchHistory(winnerName);
            setTimeout(() => showModal(`Victory!`, `${winnerName} has won the match.`), 600);
            gameActive = false;
            return true;
        }

        if (!gameState.includes("")) {
            playDrawSound();
            saveMatchHistory('tie');
            showModal(`Draw!`, `It's a tie. Great game both of you!`);
            gameActive = false;
            return true;
        }

        handlePlayerChange();
        return false;
    }

    function updateScoreboard() {
        scoreXText.innerText = scores.X;
        scoreOText.innerText = scores.O;
    }

    function showModal(title, msg) {
        modalTitle.innerText = title;
        modalMsg.innerText = msg;
        modalOverlay.classList.add('active');
    }

    function createBoard() {
        board.innerHTML = '';
        const totalCells = currentGridSize * currentGridSize;
        gameState = new Array(totalCells).fill("");
        
        let fontSize = '3rem';
        if (currentGridSize === 4) fontSize = '2.2rem';
        if (currentGridSize === 5) fontSize = '1.8rem';

        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.setAttribute('data-index', i);
            cell.style.fontSize = fontSize;
            cell.addEventListener('click', handleCellClick);
            board.appendChild(cell);
        }
    }

    function restartGame() {
        gameActive = true;
        currentPlayer = "X";
        const totalCells = currentGridSize * currentGridSize;
        gameState = new Array(totalCells).fill("");
        statusText.innerText = `${player1Name}'s Turn`;
        cardX.classList.add('active');
        cardO.classList.remove('active');
        
        const allCells = document.querySelectorAll('.cell');
        allCells.forEach(cell => {
            cell.innerText = "";
            cell.classList.remove('x', 'o', 'winner');
        });
        modalOverlay.classList.remove('active');
    }

    // --- AI Logic (Minimax & Difficulties) ---
    function makeAiMove() {
        if (!gameActive) return;
        
        let moveIndex;
        const totalCells = currentGridSize * currentGridSize;
        const availableMoves = [];
        for (let i = 0; i < totalCells; i++) {
            if (gameState[i] === "") availableMoves.push(i);
        }

        if (availableMoves.length === 0) return;

        if (aiDifficulty === 'easy') {
            moveIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        } else if (aiDifficulty === 'medium') {
            if (Math.random() < 0.5) {
                moveIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            } else {
                moveIndex = getBestMove(gameState, 2); // Shallow depth
            }
        } else {
            let maxDepth = currentGridSize === 3 ? 8 : (currentGridSize === 4 ? 4 : 3);
            moveIndex = getBestMove(gameState, maxDepth);
        }
        
        const allCells = document.querySelectorAll('.cell');
        const cell = allCells[moveIndex];
        handleCellPlayed(cell, moveIndex);
        handleResultValidation();
    }

    function getBestMove(boardState, maxDepth = 8) {
        let bestScore = -Infinity;
        let move;
        const totalCells = currentGridSize * currentGridSize;
        
        let emptyCount = boardState.filter(s => s === "").length;
        if (currentGridSize > 3 && emptyCount === totalCells) {
            return Math.floor(totalCells / 2);
        }

        for (let i = 0; i < totalCells; i++) {
            if (boardState[i] === "") {
                boardState[i] = "O";
                let score = minimax(boardState, 0, false, maxDepth, -Infinity, Infinity);
                boardState[i] = "";
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        if (move === undefined) {
            let empty = boardState.map((val, idx) => val === "" ? idx : -1).filter(idx => idx !== -1);
            move = empty[0];
        }
        return move;
    }

    function minimax(boardState, depth, isMaximizing, maxDepth, alpha, beta) {
        const result = checkWinner(boardState);
        if (result !== null) {
            return result === "O" ? 10 - depth : result === "X" ? depth - 10 : 0;
        }

        if (depth >= maxDepth) return 0; 

        const totalCells = currentGridSize * currentGridSize;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < totalCells; i++) {
                if (boardState[i] === "") {
                    boardState[i] = "O";
                    let score = minimax(boardState, depth + 1, false, maxDepth, alpha, beta);
                    boardState[i] = "";
                    bestScore = Math.max(score, bestScore);
                    alpha = Math.max(alpha, score);
                    if (beta <= alpha) break;
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < totalCells; i++) {
                if (boardState[i] === "") {
                    boardState[i] = "X";
                    let score = minimax(boardState, depth + 1, true, maxDepth, alpha, beta);
                    boardState[i] = "";
                    bestScore = Math.min(score, bestScore);
                    beta = Math.min(beta, score);
                    if (beta <= alpha) break;
                }
            }
            return bestScore;
        }
    }

    function checkWinner(boardState) {
        for (let i = 0; i < winningConditions.length; i++) {
            const winCondition = winningConditions[i];
            let firstCell = boardState[winCondition[0]];
            if (firstCell === '') continue;
            
            let allMatch = true;
            for (let j = 1; j < winCondition.length; j++) {
                if (boardState[winCondition[j]] !== firstCell) {
                    allMatch = false;
                    break;
                }
            }
            if (allMatch) return firstCell;
        }
        if (!boardState.includes("")) return "tie";
        return null;
    }

    function generateWinningConditions(size) {
        let conditions = [];
        for (let r = 0; r < size; r++) {
            let row = [];
            for (let c = 0; c < size; c++) row.push(r * size + c);
            conditions.push(row);
        }
        for (let c = 0; c < size; c++) {
            let col = [];
            for (let r = 0; r < size; r++) col.push(r * size + c);
            conditions.push(col);
        }
        let diag1 = [];
        let diag2 = [];
        for (let i = 0; i < size; i++) {
            diag1.push(i * size + i);
            diag2.push(i * size + (size - 1 - i));
        }
        conditions.push(diag1);
        conditions.push(diag2);
        return conditions;
    }

    // --- Init ---
    restartBtn.addEventListener('click', restartGame);
    if (resetScoreBtn) {
        resetScoreBtn.addEventListener('click', () => {
            scores = { X: 0, O: 0 };
            updateScoreboard();
        });
    }
    playAgainBtn.addEventListener('click', restartGame);
    
    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioBtn) {
        audioBtn.addEventListener('click', toggleAudio);
    }
    
    updateAuthUI();
    renderHistory();
    winningConditions = generateWinningConditions(3); // init defaults
    createBoard();
});
