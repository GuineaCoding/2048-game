class Game2048 {
    constructor() {
        this.boardElement = document.getElementById('board');
        this.scoreElement = document.getElementById('score');
        this.messageElement = document.getElementById('message');
        this.newGameBtn = document.getElementById('new-game');
        
        this.cellSize = 100; 
        this.gapSize = 10;   
        this.padding = 10;   
        
        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        this.newGame();
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
        
        // Create tiles
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = board[row][col];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = `tile tile-${value}`;
                    tile.textContent = value;
                    
                    // Calculate exact position
                    // Formula: padding + (col * (cellSize + gap))
                    const left = this.padding + (col * (this.cellSize + this.gapSize));
                    const top = this.padding + (row * (this.cellSize + this.gapSize));
                    
                    tile.style.left = `${left}px`;
                    tile.style.top = `${top}px`;
                    
                    this.boardElement.appendChild(tile);
                }
            }
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

// Touch swipe support for mobile
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    const minSwipeDistance = 30; // Minimum swipe distance
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
        // Horizontal swipe
        if (diffX > 0) {
            game.move('left');
        } else {
            game.move('right');
        }
    } else if (Math.abs(diffY) > minSwipeDistance) {
        // Vertical swipe
        if (diffY > 0) {
            game.move('up');
        } else {
            game.move('down');
        }
    }
    
    touchStartX = 0;
    touchStartY = 0;
});

// Initialize the game when page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game2048();
});