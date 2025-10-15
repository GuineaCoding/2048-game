class Game2048 {
    constructor() {
        this.boardElement = document.getElementById('board');
        this.scoreElement = document.getElementById('score');
        this.messageElement = document.getElementById('message');
        this.messageTextElement = document.getElementById('message-text');
        this.newGameBtn = document.getElementById('new-game');
        
        this.gridSize = 4;
        this.currentBoard = null;
        this.animating = false;
        this.debug = true;
        
        this.init();
    }

    log(...args) {
        if (this.debug) console.log('[2048]', ...args);
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.newGame();
    }

    calculateTilePosition(row, col) {
        const boardRect = this.boardElement.getBoundingClientRect();
        const padding = parseFloat(getComputedStyle(this.boardElement).padding);
        const gap = parseFloat(getComputedStyle(this.boardElement).gap);
        const availableSize = boardRect.width - (padding * 2);
        const cellSize = (availableSize - (gap * (this.gridSize - 1))) / this.gridSize;

        return {
            left: padding + col * (cellSize + gap),
            top: padding + row * (cellSize + gap),
            width: cellSize,
            height: cellSize
        };
    }

    createGrid() {
        this.boardElement.innerHTML = '';
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            this.boardElement.appendChild(cell);
        }
    }

    async newGame() {
        try {
            const response = await fetch('/api/new-game');
            if (!response.ok) throw new Error('Network error');
            const gameState = await response.json();
            this.currentBoard = gameState.board;
            this.updateUI(gameState);
        } catch (error) {
            console.error('Error starting new game:', error);
            this.showError('Failed to start new game. Please try again.');
        }
    }

    async move(direction) {
        if (this.animating) return;
        this.animating = true;

        try {
            const response = await fetch('/api/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ direction })
            });

            if (!response.ok) throw new Error('Network error');
            const gameState = await response.json();

            await this.updateBoardAnimated(gameState.board);
            this.updateScore(gameState.score);
            this.updateMessage(gameState);

            this.currentBoard = gameState.board;
        } catch (error) {
            console.error('Error making move:', error);
            this.showError('Failed to make move. Please try again.');
        } finally {
            this.animating = false;
        }
    }

    updateUI(gameState) {
        this.updateBoardAnimated(gameState.board, true);
        this.updateScore(gameState.score);
        this.updateMessage(gameState);
    }

async updateBoardAnimated(newBoard, instant = false) {
    const existingTiles = Array.from(this.boardElement.querySelectorAll('.tile'));
    const oldBoard = this.currentBoard || Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(0));
    const positions = new Map();
    const usedTiles = new Set();

    // Record existing tiles
    existingTiles.forEach(tile => {
        const value = parseInt(tile.textContent);
        const top = parseFloat(tile.style.top);
        const left = parseFloat(tile.style.left);
        positions.set(`${top}-${left}-${value}`, tile);
    });

    // Move existing tiles first
    for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
            const oldValue = oldBoard[row][col];
            const newValue = newBoard[row][col];
            if (newValue === 0) continue;

            const position = this.calculateTilePosition(row, col);
            const key = [...positions.keys()].find(k => k.endsWith(`-${oldValue}`) && !usedTiles.has(k));

            if (oldValue !== 0 && key) {
                const tile = positions.get(key);
                usedTiles.add(key);
                tile.style.left = `${position.left}px`;
                tile.style.top = `${position.top}px`;
            }
        }
    }

    // Wait for move animation
    if (!instant) await new Promise(r => setTimeout(r, 120));

    // Then handle new tiles — appear in place
    for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
            const oldValue = oldBoard[row][col];
            const newValue = newBoard[row][col];
            if (newValue === 0) continue;

            // Only create if it didn’t exist before
            if (oldValue !== newValue || oldValue === 0) {
                const position = this.calculateTilePosition(row, col);
                const tile = document.createElement('div');
                tile.className = `tile tile-${newValue}`;
                tile.textContent = newValue;
                tile.style.left = `${position.left}px`;
                tile.style.top = `${position.top}px`;
                tile.style.width = `${position.width}px`;
                tile.style.height = `${position.height}px`;
                tile.style.opacity = '0';
                tile.style.transform = 'scale(0.5)';
                this.boardElement.appendChild(tile);

                requestAnimationFrame(() => {
                    tile.style.opacity = '1';
                    tile.style.transform = 'scale(1)';
                });
            }
        }
    }

    // Remove unused tiles
    existingTiles.forEach(tile => {
        const top = parseFloat(tile.style.top);
        const left = parseFloat(tile.style.left);
        const value = parseInt(tile.textContent);
        const stillExists = newBoard.flat().includes(value);
        if (!stillExists) {
            tile.style.opacity = '0';
            tile.style.transform = 'scale(0.5)';
            setTimeout(() => tile.remove(), 150);
        }
    });

    if (!instant) await new Promise(r => setTimeout(r, 160));
}

    updateScore(score) {
        this.scoreElement.textContent = score;
    }

    updateMessage(gameState) {
        this.messageElement.className = 'game-message hidden';
        if (gameState.won) {
            this.messageTextElement.textContent = '🎉 Amazing! You reached 2048! 🎉';
            this.messageElement.className = 'game-message win';
        } else if (gameState.gameOver) {
            this.messageTextElement.textContent = '💫 Game Over! Ready for another try?';
            this.messageElement.className = 'game-message game-over';
        }
    }

    showError(message) {
        this.messageTextElement.textContent = message;
        this.messageElement.className = 'game-message';
        this.messageElement.style.background = 'linear-gradient(135deg, #e67e22, #d35400)';
        this.messageElement.classList.remove('hidden');
        setTimeout(() => this.messageElement.classList.add('hidden'), 3000);
    }

    handleKeyPress(event) {
        const map = {
            'ArrowUp': 'up', 'w': 'up', 'W': 'up',
            'ArrowDown': 'down', 's': 'down', 'S': 'down',
            'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
            'ArrowRight': 'right', 'd': 'right', 'D': 'right'
        };
        const dir = map[event.key];
        if (dir) {
            event.preventDefault();
            this.move(dir);
        }
    }
}

// Touch controls
let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
    if (!touchStartX || !touchStartY) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = touchStartX - endX;
    const diffY = touchStartY - endY;
    const min = 30;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > min)
        game.move(diffX > 0 ? 'left' : 'right');
    else if (Math.abs(diffY) > min)
        game.move(diffY > 0 ? 'up' : 'down');
    touchStartX = 0; touchStartY = 0;
});

// Init
let game;
document.addEventListener('DOMContentLoaded', () => game = new Game2048());
