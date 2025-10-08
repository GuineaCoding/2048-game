class Game2048 {
    constructor() {
        this.boardElement = document.getElementById('board');
        this.scoreElement = document.getElementById('score');
        this.messageElement = document.getElementById('message');
        this.messageTextElement = document.getElementById('message-text');
        this.newGameBtn = document.getElementById('new-game');
        
        this.gridSize = 4;
        this.currentBoard = null;
        this.tileElements = new Map(); // Track tile elements by their position
        this.debug = true;
        this.init();
    }

    log(...args) {
        if (this.debug) {
            console.log('[2048]', ...args);
        }
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

    getPositionKey(row, col) {
        return `${row}-${col}`;
    }

    async newGame() {
        try {
            this.log('Starting new game...');
            const response = await fetch('/api/new-game');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const gameState = await response.json();
            this.currentBoard = gameState.board;
            this.tileElements.clear();
            this.log('New game board:', this.currentBoard);
            this.updateUI(gameState);
        } catch (error) {
            console.error('Error starting new game:', error);
            this.showError('Failed to start new game. Please try again.');
        }
    }

    async move(direction) {
        this.log(`=== MOVE REQUEST: ${direction} ===`);
        this.log('Current board before move:', this.currentBoard);
        
        try {
            const oldBoard = JSON.parse(JSON.stringify(this.currentBoard));
            
            const response = await fetch('/api/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ direction })
            });
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const gameState = await response.json();
            this.log('New board from server:', gameState.board);
            
            // Check if the board actually changed
            const boardChanged = !this.areBoardsEqual(oldBoard, gameState.board);
            this.log('Board changed?', boardChanged);
            
            if (boardChanged) {
                this.log('Animating movement...');
                this.animateTileMovements(oldBoard, gameState.board, direction);
                this.currentBoard = gameState.board;
            } else {
                this.log('No movement possible - no animation needed');
                this.currentBoard = gameState.board;
            }
            
            this.updateScore(gameState.score);
            this.updateMessage(gameState);
            
        } catch (error) {
            console.error('Error making move:', error);
            this.showError('Failed to make move. Please try again.');
        }
    }

    areBoardsEqual(board1, board2) {
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (board1[i][j] !== board2[i][j]) {
                    return false;
                }
            }
        }
        return true;
    }

    animateTileMovements(oldBoard, newBoard, direction) {
        this.log('=== ANIMATING TILE MOVEMENTS ===');
        this.log('Direction:', direction);
        
        // Track which tiles need to be moved and which are new
        const movements = [];
        const newTiles = [];
        const tilesToRemove = [];
        
        // First pass: identify movements and new tiles
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const oldValue = oldBoard[row][col];
                const newValue = newBoard[row][col];
                const positionKey = this.getPositionKey(row, col);
                
                if (oldValue !== newValue) {
                    if (oldValue === 0 && newValue !== 0) {
                        // New tile (spawned)
                        this.log(`New tile ${newValue} at [${row}][${col}]`);
                        newTiles.push({ value: newValue, row, col });
                    } else if (oldValue !== 0 && newValue === 0) {
                        // Tile moved away from here (will be handled by the tile that moves here)
                        this.log(`Tile moved away from [${row}][${col}]`);
                    } else if (oldValue !== 0 && newValue !== 0 && oldValue !== newValue) {
                        // Tile merged (will be handled as movement + new tile)
                        this.log(`Tile merged at [${row}][${col}] from ${oldValue} to ${newValue}`);
                    }
                }
            }
        }
        
        // Second pass: find where tiles moved to
        for (let newRow = 0; newRow < this.gridSize; newRow++) {
            for (let newCol = 0; newCol < this.gridSize; newCol++) {
                const newValue = newBoard[newRow][newCol];
                if (newValue === 0) continue;
                
                const newKey = this.getPositionKey(newRow, newCol);
                let foundSource = false;
                
                // Look for where this tile came from
                for (let oldRow = 0; oldRow < this.gridSize; oldRow++) {
                    for (let oldCol = 0; oldCol < this.gridSize; oldCol++) {
                        const oldValue = oldBoard[oldRow][oldCol];
                        if (oldValue === newValue) {
                            const oldKey = this.getPositionKey(oldRow, oldCol);
                            const existingTile = this.tileElements.get(oldKey);
                            
                            if (existingTile && (oldRow !== newRow || oldCol !== newCol)) {
                                // This tile moved
                                this.log(`Tile ${newValue} moved from [${oldRow}][${oldCol}] to [${newRow}][${newCol}]`);
                                movements.push({
                                    tile: existingTile,
                                    fromRow: oldRow,
                                    fromCol: oldCol,
                                    toRow: newRow,
                                    toCol: newCol,
                                    value: newValue
                                });
                                foundSource = true;
                                
                                // Update tracking - remove from old position, add to new position
                                this.tileElements.delete(oldKey);
                                this.tileElements.set(newKey, existingTile);
                                break;
                            }
                        }
                    }
                    if (foundSource) break;
                }
                
                // If no source found and it's not a new tile, it might be a merged tile
                if (!foundSource && !newTiles.some(t => t.row === newRow && t.col === newCol)) {
                    this.log(`Could not find source for tile ${newValue} at [${newRow}][${newCol}] - treating as new`);
                    newTiles.push({ value: newValue, row: newRow, col: newCol });
                }
            }
        }
        
        // Animate movements
        movements.forEach(movement => {
            this.animateTileMovement(movement.tile, movement.toRow, movement.toCol, direction);
        });
        
        // Create new tiles with animation
        newTiles.forEach(tileInfo => {
            this.createTileWithAnimation(tileInfo.value, tileInfo.row, tileInfo.col, direction);
        });
        
        // Remove tiles that are no longer needed (merged tiles that disappeared)
        this.tileElements.forEach((tile, key) => {
            const [row, col] = key.split('-').map(Number);
            if (newBoard[row][col] === 0) {
                this.log(`Removing tile at [${row}][${col}]`);
                tile.remove();
                this.tileElements.delete(key);
            }
        });
    }

    animateTileMovement(tile, toRow, toCol, direction) {
        const newPosition = this.calculateTilePosition(toRow, toCol);
        
        this.log(`Animating tile movement to [${toRow}][${toCol}]`);
        
        // Update tile data attributes
        tile.dataset.row = toRow;
        tile.dataset.col = toCol;
        
        // Add movement class
        tile.classList.add('moving');
        
        // Animate to new position
        setTimeout(() => {
            tile.style.transition = 'all 0.15s ease-in-out';
            tile.style.left = `${newPosition.left}px`;
            tile.style.top = `${newPosition.top}px`;
            
            // Remove movement class after animation
            setTimeout(() => {
                tile.classList.remove('moving');
            }, 150);
        }, 10);
    }

    createTileWithAnimation(value, row, col, direction) {
        const position = this.calculateTilePosition(row, col);
        const tile = document.createElement('div');
        const positionKey = this.getPositionKey(row, col);
        
        tile.className = `tile tile-${value}`;
        tile.textContent = value;
        tile.dataset.row = row;
        tile.dataset.col = col;
        
        // Set final position
        tile.style.left = `${position.left}px`;
        tile.style.top = `${position.top}px`;
        tile.style.width = `${position.width}px`;
        tile.style.height = `${position.height}px`;
        
        // Add new tile animation
        tile.classList.add('new');
        tile.style.opacity = '0';
        tile.style.transform = 'scale(0.5)';
        
        this.boardElement.appendChild(tile);
        this.tileElements.set(positionKey, tile);
        
        // Animate in
        setTimeout(() => {
            tile.style.transition = 'all 0.2s ease-in-out';
            tile.style.opacity = '1';
            tile.style.transform = 'scale(1)';
            
            // Remove animation class after completion
            setTimeout(() => {
                tile.classList.remove('new');
            }, 200);
        }, 10);
    }

    updateUI(gameState) {
        if (!this.currentBoard) {
            this.updateBoard(gameState.board);
        }
        this.updateScore(gameState.score);
        this.updateMessage(gameState);
    }

    updateBoard(board) {
        this.log('Initial board setup');
        this.createGrid();
        this.tileElements.clear();
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const value = board[row][col];
                if (value !== 0) {
                    this.createInitialTile(value, row, col);
                }
            }
        }
    }

    createInitialTile(value, row, col) {
        const position = this.calculateTilePosition(row, col);
        const positionKey = this.getPositionKey(row, col);
        const tile = document.createElement('div');

        tile.className = `tile tile-${value}`;
        tile.textContent = value;
        tile.dataset.row = row;
        tile.dataset.col = col;
        
        tile.style.left = `${position.left}px`;
        tile.style.top = `${position.top}px`;
        tile.style.width = `${position.width}px`;
        tile.style.height = `${position.height}px`;
        
        // Initial appearance animation
        tile.style.opacity = '0';
        tile.style.transform = 'scale(0.5)';
        
        this.boardElement.appendChild(tile);
        this.tileElements.set(positionKey, tile);
        
        // Animate in
        setTimeout(() => {
            tile.style.transition = 'all 0.3s ease';
            tile.style.opacity = '1';
            tile.style.transform = 'scale(1)';
        }, 50);
    }

    updateScore(score) {
        this.log(`Updating score: ${score}`);
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
            this.log('GAME WON!');
            this.messageTextElement.textContent = '🎉 Amazing! You reached 2048! 🎉';
            this.messageElement.className = 'game-message win';
            this.confettiEffect();
        } else if (gameState.gameOver) {
            this.log('GAME OVER');
            this.messageTextElement.textContent = '💫 Game Over! Ready for another try?';
            this.messageElement.className = 'game-message game-over';
        }
    }

    confettiEffect() {
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
        // Reposition all tiles on resize
        game.tileElements.forEach((tile, key) => {
            const [row, col] = key.split('-').map(Number);
            const position = game.calculateTilePosition(row, col);
            tile.style.left = `${position.left}px`;
            tile.style.top = `${position.top}px`;
            tile.style.width = `${position.width}px`;
            tile.style.height = `${position.height}px`;
        });
    }
});

// Initialize game
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game2048();
});