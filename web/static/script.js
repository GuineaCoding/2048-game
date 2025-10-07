class Game2048 {
    constructor() {
        this.boardElement = document.getElementById('board');
        this.scoreElement = document.getElementById('score');
        this.messageElement = document.getElementById('message');
        this.messageTextElement = document.getElementById('message-text');
        this.newGameBtn = document.getElementById('new-game');
        
        this.gridSize = 4;
        this.currentBoard = null;
        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Add loading state with better visual feedback
        this.newGameBtn.addEventListener('click', () => {
            this.newGameBtn.classList.add('loading');
            setTimeout(() => this.newGameBtn.classList.remove('loading'), 1000);
        });
        
        this.newGame();
    }

    calculateTilePosition(row, col) {
        const boardRect = this.boardElement.getBoundingClientRect();
        const padding = parseFloat(getComputedStyle(this.boardElement).padding);
        const gap = parseFloat(getComputedStyle(this.boardElement).gap);
        
        const availableSize = boardRect.width - (padding * 2);
        const cellSize = (availableSize - (gap * (this.gridSize - 1))) / this.gridSize;
        
        const left = padding + (col * (cellSize + gap));
        const top = padding + (row * (cellSize + gap));
        
        return {
            left: left,
            top: top,
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
            if (!response.ok) throw new Error('Network response was not ok');
            
            const gameState = await response.json();
            this.currentBoard = gameState.board;
            this.updateUI(gameState);
        } catch (error) {
            console.error('Error starting new game:', error);
            this.showError('Failed to start new game. Please try again.');
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
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const gameState = await response.json();
            this.currentBoard = gameState.board;
            this.updateUI(gameState);
        } catch (error) {
            console.error('Error making move:', error);
            this.showError('Failed to make move. Please try again.');
        }
    }

    updateUI(gameState) {
        this.updateBoard(gameState.board);
        this.updateScore(gameState.score);
        this.updateMessage(gameState);
    }

    updateBoard(board) {
        this.createGrid();
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const value = board[row][col];
                if (value !== 0) {
                    this.createTile(value, row, col);
                }
            }
        }
    }

    createTile(value, row, col) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value}`;
        tile.textContent = value;
        
        const position = this.calculateTilePosition(row, col);
        
        tile.style.left = `${position.left}px`;
        tile.style.top = `${position.top}px`;
        tile.style.width = `${position.width}px`;
        tile.style.height = `${position.height}px`;
        
        // Add animation
        tile.style.opacity = '0';
        tile.style.transform = 'scale(0.5)';
        
        this.boardElement.appendChild(tile);
        
        // Animate in
        setTimeout(() => {
            tile.style.transition = 'all 0.3s ease';
            tile.style.opacity = '1';
            tile.style.transform = 'scale(1)';
        }, 50);
    }

    updateScore(score) {
        this.scoreElement.textContent = score;
        
        // Add score animation
        this.scoreElement.style.transform = 'scale(1.1)';
        this.scoreElement.style.color = '#f39c12';
        
        setTimeout(() => {
            this.scoreElement.style.transform = 'scale(1)';
            this.scoreElement.style.color = '';
        }, 300);
    }

    updateMessage(gameState) {
        this.messageElement.className = 'game-message hidden';
        
        if (gameState.won) {
            this.messageTextElement.textContent = '🎉 Amazing! You reached 2048! 🎉';
            this.messageElement.className = 'game-message win';
            this.confettiEffect();
        } else if (gameState.gameOver) {
            this.messageTextElement.textContent = '💫 Game Over! Ready for another try?';
            this.messageElement.className = 'game-message game-over';
        }
    }

    confettiEffect() {
        // Simple confetti effect
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
        const boardRect = this.boardElement.getBoundingClientRect();
        
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    top: ${boardRect.top + boardRect.height/2}px;
                    left: ${boardRect.left + boardRect.width/2}px;
                    border-radius: 2px;
                    pointer-events: none;
                    z-index: 1000;
                    animation: confettiFall 1s ease-out forwards;
                `;
                
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 1000);
            }, i * 100);
        }
        
        // Add CSS for animation
        if (!document.querySelector('#confetti-style')) {
            const style = document.createElement('style');
            style.id = 'confetti-style';
            style.textContent = `
                @keyframes confettiFall {
                    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                    100% { 
                        transform: translate(${Math.random() * 200 - 100}px, ${window.innerHeight}px) rotate(360deg); 
                        opacity: 0; 
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    showError(message) {
        this.messageTextElement.textContent = message;
        this.messageElement.className = 'game-message';
        this.messageElement.style.background = 'linear-gradient(135deg, #e67e22, #d35400)';
        this.messageElement.classList.remove('hidden');
        
        setTimeout(() => {
            this.messageElement.classList.add('hidden');
        }, 3000);
    }

    handleKeyPress(event) {
        if (event.key.startsWith('Arrow') || ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(event.key)) {
            event.preventDefault();
            
            const directionMap = {
                'ArrowUp': 'up', 'w': 'up', 'W': 'up',
                'ArrowDown': 'down', 's': 'down', 'S': 'down',
                'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
                'ArrowRight': 'right', 'd': 'right', 'D': 'right'
            };
            
            const direction = directionMap[event.key];
            if (direction) {
                this.move(direction);
            }
        }
    }
}

// Enhanced touch support
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    const minSwipeDistance = 30;
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
        game.move(diffX > 0 ? 'left' : 'right');
    } else if (Math.abs(diffY) > minSwipeDistance) {
        game.move(diffY > 0 ? 'up' : 'down');
    }
    
    touchStartX = 0;
    touchStartY = 0;
});

// Handle window resize
window.addEventListener('resize', () => {
    if (game && game.currentBoard) {
        game.updateBoard(game.currentBoard);
    }
});

// Initialize game
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game2048();
});