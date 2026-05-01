document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const cells = document.querySelectorAll('.cell');
    const statusText = document.getElementById('status');
    const restartBtn = document.getElementById('restart-btn');
    const resetBtn = document.getElementById('reset-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMsg = document.getElementById('modal-msg');
    const playAgainBtn = document.getElementById('play-again-btn');
    const scoreXText = document.getElementById('score-x');
    const scoreOText = document.getElementById('score-o');
    const cardX = document.getElementById('card-x');
    const cardO = document.getElementById('card-o');

    let currentPlayer = 'X';
    let gameState = ["", "", "", "", "", "", "", "", ""];
    let gameActive = true;
    let scores = { X: 0, O: 0 };

    // Load scores from localStorage
    const savedScores = localStorage.getItem('ttt-scores');
    if (savedScores) {
        scores = JSON.parse(savedScores);
        updateScoreboard();
    }

    const winningConditions = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];

    function handleCellClick(e) {
        const clickedCell = e.target;
        const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

        if (gameState[clickedCellIndex] !== "" || !gameActive) {
            return;
        }

        handleCellPlayed(clickedCell, clickedCellIndex);
        handleResultValidation();
    }

    function handleCellPlayed(clickedCell, clickedCellIndex) {
        gameState[clickedCellIndex] = currentPlayer;
        clickedCell.innerText = currentPlayer;
        clickedCell.classList.add(currentPlayer.toLowerCase());
    }

    function handlePlayerChange() {
        currentPlayer = currentPlayer === "X" ? "O" : "X";
        statusText.innerText = `Player ${currentPlayer}'s Turn`;
        
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
        for (let i = 0; i <= 7; i++) {
            const winCondition = winningConditions[i];
            let a = gameState[winCondition[0]];
            let b = gameState[winCondition[1]];
            let c = gameState[winCondition[2]];
            if (a === '' || b === '' || c === '') {
                continue;
            }
            if (a === b && b === c) {
                roundWon = true;
                break;
            }
        }

        if (roundWon) {
            scores[currentPlayer]++;
            updateScoreboard();
            showModal(`Victory!`, `Player ${currentPlayer} has won the match.`);
            gameActive = false;
            return;
        }

        let roundDraw = !gameState.includes("");
        if (roundDraw) {
            showModal(`Draw!`, `It's a tie. Both players played well.`);
            gameActive = false;
            return;
        }

        handlePlayerChange();
    }

    function updateScoreboard() {
        scoreXText.innerText = scores.X;
        scoreOText.innerText = scores.O;
        localStorage.setItem('ttt-scores', JSON.stringify(scores));
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
        statusText.innerText = `Player X's Turn`;
        cardX.classList.add('active');
        cardO.classList.remove('active');
        cells.forEach(cell => {
            cell.innerText = "";
            cell.classList.remove('x', 'o');
        });
        modalOverlay.classList.remove('active');
    }

    function resetScores() {
        scores = { X: 0, O: 0 };
        updateScoreboard();
        restartGame();
    }

    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    restartBtn.addEventListener('click', restartGame);
    playAgainBtn.addEventListener('click', restartGame);
    resetBtn.addEventListener('click', resetScores);
});
