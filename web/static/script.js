class Game2048 {
    constructor() {
        this.boardElement = document.getElementById('board');
        this.scoreElement = document.getElementById('score');
        this.messageElement = document.getElementById('message');
        this.newGameBtn = document.getElementById('new-game');
        
        this.cellSize = 0;
        this.gapSize = 0;
        this.padding = 0;
        
        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        window.addEventListener('resize', () => this.handleResize());
        
        this.newGame();
    }

    calculateSizes() {
        // Get computed styles to calculate responsive sizes
        const boardRect = this.boardElement.getBoundingClientRect();
        const grid = this.boardElement.querySelector('.grid');
        
        if (grid) {
            const cell = grid.querySelector('.cell');
            if (cell) {
                const cellRect = cell.getBoundingClientRect();
                this.cellSize = cellRect.width;
                
                // Calculate gap size (assuming equal gaps)
                const computedStyle = window.getComputedStyle(grid);
                this.gapSize = parseFloat(computedStyle.gap) || 10;
                this.padding = parseFloat(computedStyle.padding) || 10;
            }
        }
        
        // Fallback values
        if (!this.cellSize) {
            const boardWidth = boardRect.width - 20; // account for padding
            this.cellSize = (boardWidth - (3 * 10)) / 4; // 3 gaps between 4 cells
            this.gapSize = 10;
            this.padding = 10;
        }
    }

    async newGame() {
        try {
            const response = await fetch('/api/new-game');
            const gameState = await response.json();
            this.updateUI(gameState);
        } catch (error) {
            console.error('Error starting new game:', error);
        }
    }

    async move(direction) {
        try {
            const response = await fetch('/api/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ direction })
            });
            
            const gameState = await response.json();
            this.updateUI(gameState);
        } catch (error) {
            console.error('Error making move:', error);
        }
    }

    updateUI(gameState) {
        this.updateBoard(gameState.board);
        this.updateScore(gameState.score);
        this.updateMessage(gameState);
    }

    updateBoard(board) {
        // Clear the board
        this.boardElement.innerHTML = '';
        
        // Create grid background
        const grid = document.createElement('div');
        grid.className = 'grid';
        
        // Create empty cells
        for (let i = 0; i < 16; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            grid.appendChild(cell);
        }
        
        this.boardElement.appendChild(grid);
        
        // Calculate sizes based on actual rendered dimensions
        this.calculateSizes();
        
        // Create tiles
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = board[row][col];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = `tile tile-${value}`;
                    tile.textContent = value;
                    
                    // Calculate responsive position
                    const left = this.padding + (col * (this.cellSize + this.gapSize));
                    const top = this.padding + (row * (this.cellSize + this.gapSize));
                    
                    tile.style.left = `${left}px`;
                    tile.style.top = `${top}px`;
                    tile.style.width = `${this.cellSize}px`;
                    tile.style.height = `${this.cellSize}px`;
                    
                    this.boardElement.appendChild(tile);
                }
            }
        }
    }

    handleResize() {
        // Recalculate positions when window is resized
        if (this.boardElement.querySelector('.tile')) {
            this.calculateSizes();
            const tiles = this.boardElement.querySelectorAll('.tile');
            tiles.forEach(tile => {
                const col = parseInt(tile.style.left) / (this.cellSize + this.gapSize);
                const row = parseInt(tile.style.top) / (this.cellSize + this.gapSize);
                
                tile.style.left = `${this.padding + (col * (this.cellSize + this.gapSize))}px`;
                tile.style.top = `${this.padding + (row * (this.cellSize + this.gapSize))}px`;
                tile.style.width = `${this.cellSize}px`;
                tile.style.height = `${this.cellSize}px`;
            });
        }
    }

    updateScore(score) {
        this.scoreElement.textContent = score;
    }

    updateMessage(gameState) {
        this.messageElement.className = 'message hidden';
        
        if (gameState.won) {
            this.messageElement.textContent = '🎉 You Win! You reached 2048!';
            this.messageElement.className = 'message win';
        } else if (gameState.gameOver) {
            this.messageElement.textContent = '💀 Game Over! No more moves.';
            this.messageElement.className = 'message game-over';
        }
    }

    handleKeyPress(event) {
        if (event.key.startsWith('Arrow')) {
            event.preventDefault();
            
            const directionMap = {
                'ArrowUp': 'up',
                'ArrowDown': 'down', 
                'ArrowLeft': 'left',
                'ArrowRight': 'right'
            };
            
            const direction = directionMap[event.key];
            if (direction) {
                this.move(direction);
            }
        }
    }
}

// Enhanced touch swipe support for mobile
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const touchDuration = Date.now() - touchStartTime;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    const minSwipeDistance = 30;
    const maxSwipeTime = 1000;
    
    // Only register swipes that are quick and long enough
    if (touchDuration < maxSwipeTime && 
        (Math.abs(diffX) > minSwipeDistance || Math.abs(diffY) > minSwipeDistance)) {
        
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal swipe
            if (diffX > minSwipeDistance) {
                game.move('left');
            } else if (diffX < -minSwipeDistance) {
                game.move('right');
            }
        } else {
            // Vertical swipe
            if (diffY > minSwipeDistance) {
                game.move('up');
            } else if (diffY < -minSwipeDistance) {
                game.move('down');
            }
        }
    }
    
    touchStartX = 0;
    touchStartY = 0;
    touchStartTime = 0;
});

// Initialize the game when page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game2048();
});