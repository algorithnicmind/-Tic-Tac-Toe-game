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
        if (currentUser) {
            navAuth.innerHTML = `
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
            navAuth.innerHTML = `<button class="btn-sm secondary" id="nav-login-btn">Login</button>`;
            document.getElementById('nav-login-btn').addEventListener('click', () => navigateTo('auth'));
        }
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
            setTimeout(() => showModal(`Victory!`, `${winnerName} has won the match.`), 600);
            gameActive = false;
            return true;
        }

        if (!gameState.includes("")) {
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
});
