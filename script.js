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
    const startGameBtn = document.getElementById('start-game-btn');
    const exitGameBtn = document.getElementById('exit-game-btn');
    
    // Game Elements
    const board = document.getElementById('board');
    const cells = document.querySelectorAll('.cell');
    const statusText = document.getElementById('status');
    const restartBtn = document.getElementById('restart-btn');
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
    let player1Name = 'Player X';
    let player2Name = 'Player O';
    let currentPlayer = 'X';
    let gameState = ["", "", "", "", "", "", "", "", ""];
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

    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

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
                player2Name = 'Smart AI';
            } else {
                p2InputGroup.style.display = 'flex';
                player2Name = document.getElementById('p2-name').value || 'Player O';
            }
        });
    });

    startGameBtn.addEventListener('click', () => {
        player1Name = document.getElementById('p1-name').value || 'Player X';
        if (gameMode === 'pvp') {
            player2Name = document.getElementById('p2-name').value || 'Player O';
        } else {
            player2Name = 'Smart AI';
        }
        
        labelX.innerText = player1Name.toUpperCase();
        labelO.innerText = player2Name.toUpperCase();
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

        for (let i = 0; i <= 7; i++) {
            const winCondition = winningConditions[i];
            let a = gameState[winCondition[0]];
            let b = gameState[winCondition[1]];
            let c = gameState[winCondition[2]];
            if (a === '' || b === '' || c === '') continue;
            if (a === b && b === c) {
                roundWon = true;
                winLine = winCondition;
                break;
            }
        }

        if (roundWon) {
            scores[currentPlayer]++;
            updateScoreboard();
            
            winLine.forEach(idx => cells[idx].classList.add('winner'));
            
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

    function restartGame() {
        gameActive = true;
        currentPlayer = "X";
        gameState = ["", "", "", "", "", "", "", "", ""];
        statusText.innerText = `${player1Name}'s Turn`;
        cardX.classList.add('active');
        cardO.classList.remove('active');
        cells.forEach(cell => {
            cell.innerText = "";
            cell.classList.remove('x', 'o', 'winner');
        });
        modalOverlay.classList.remove('active');
    }

    // --- AI Logic (Minimax) ---
    function makeAiMove() {
        if (!gameActive) return;
        
        const bestMove = getBestMove(gameState);
        const cell = cells[bestMove];
        handleCellPlayed(cell, bestMove);
        handleResultValidation();
    }

    function getBestMove(boardState) {
        let bestScore = -Infinity;
        let move;
        for (let i = 0; i < 9; i++) {
            if (boardState[i] === "") {
                boardState[i] = "O";
                let score = minimax(boardState, 0, false);
                boardState[i] = "";
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }

    function minimax(boardState, depth, isMaximizing) {
        const result = checkWinner(boardState);
        if (result !== null) {
            return result === "O" ? 10 : result === "X" ? -10 : 0;
        }

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (boardState[i] === "") {
                    boardState[i] = "O";
                    let score = minimax(boardState, depth + 1, false);
                    boardState[i] = "";
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (boardState[i] === "") {
                    boardState[i] = "X";
                    let score = minimax(boardState, depth + 1, true);
                    boardState[i] = "";
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    function checkWinner(boardState) {
        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
                return boardState[a];
            }
        }
        if (!boardState.includes("")) return "tie";
        return null;
    }

    // --- Init ---
    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    restartBtn.addEventListener('click', restartGame);
    playAgainBtn.addEventListener('click', restartGame);
    
    updateAuthUI();
    renderHistory();
});
