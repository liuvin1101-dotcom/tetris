// Game Constants
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 20;

// Tetromino Shapes
const TETROMINOES = {
    I: {
        blocks: [[1, 1, 1, 1]],
        color: '#00f0f0'
    },
    O: {
        blocks: [[1, 1], [1, 1]],
        color: '#f0f000'
    },
    T: {
        blocks: [[0, 1, 0], [1, 1, 1]],
        color: '#a000f0'
    },
    S: {
        blocks: [[0, 1, 1], [1, 1, 0]],
        color: '#00f000'
    },
    Z: {
        blocks: [[1, 1, 0], [0, 1, 1]],
        color: '#f00000'
    },
    J: {
        blocks: [[1, 0, 0], [1, 1, 1]],
        color: '#0000f0'
    },
    L: {
        blocks: [[0, 0, 1], [1, 1, 1]],
        color: '#f0a000'
    }
};

class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');

        this.board = this.createBoard();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        this.currentPiece = null;
        this.nextPiece = null;
        this.dropCounter = 0;
        this.dropInterval = 1000;

        this.setupEventListeners();
        this.nextPiece = this.getRandomPiece();
    }

    createBoard() {
        return Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    }

    getRandomPiece() {
        const keys = Object.keys(TETROMINOES);
        const key = keys[Math.floor(Math.random() * keys.length)];
        const tetromino = TETROMINOES[key];
        return {
            blocks: JSON.parse(JSON.stringify(tetromino.blocks)),
            color: tetromino.color,
            x: Math.floor((COLS - tetromino.blocks[0].length) / 2),
            y: 0
        };
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.getRandomPiece();
        console.log('Piece spawned:', this.currentPiece);
        
        if (this.collides()) {
            console.log('Immediate collision detected!');
            this.gameOver = true;
            this.endGame();
        }
    }

    collides() {
        const { blocks, x, y } = this.currentPiece;
        
        for (let row = 0; row < blocks.length; row++) {
            for (let col = 0; col < blocks[row].length; col++) {
                if (blocks[row][col]) {
                    const newX = x + col;
                    const newY = y + row;

                    // Check horizontal bounds
                    if (newX < 0 || newX >= COLS) {
                        return true;
                    }

                    // Check if below board
                    if (newY >= ROWS) {
                        return true;
                    }

                    // Check collision with placed blocks (only if within board height)
                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    merge() {
        const { blocks, x, y, color } = this.currentPiece;

        for (let row = 0; row < blocks.length; row++) {
            for (let col = 0; col < blocks[row].length; col++) {
                if (blocks[row][col]) {
                    const boardY = y + row;
                    const boardX = x + col;

                    if (boardY >= 0) {
                        this.board[boardY][boardX] = color;
                    }
                }
            }
        }
    }

    clearLines() {
        let linesCleared = 0;

        for (let row = ROWS - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== 0)) {
                this.board.splice(row, 1);
                this.board.unshift(Array(COLS).fill(0));
                linesCleared++;
            }
        }

        if (linesCleared > 0) {
            this.lines += linesCleared;
            
            // Score calculation
            const scores = [0, 40, 100, 300, 1200];
            this.score += scores[linesCleared] * this.level;
            
            // Level up every 10 lines
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel !== this.level) {
                this.level = newLevel;
                this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 50);
            }
        }
    }

    moveLeft() {
        if (!this.currentPiece) return;
        this.currentPiece.x--;
        if (this.collides()) {
            this.currentPiece.x++;
        }
    }

    moveRight() {
        if (!this.currentPiece) return;
        this.currentPiece.x++;
        if (this.collides()) {
            this.currentPiece.x--;
        }
    }

    softDrop() {
        if (!this.currentPiece) return;
        this.currentPiece.y++;
        if (this.collides()) {
            this.currentPiece.y--;
            this.merge();
            this.clearLines();
            this.spawnPiece();
        }
    }

    hardDrop() {
        if (!this.currentPiece) return;
        while (!this.collides()) {
            this.currentPiece.y++;
        }
        this.currentPiece.y--;
        this.merge();
        this.clearLines();
        this.spawnPiece();
    }

    rotate() {
        if (!this.currentPiece) return;
        const originalBlocks = this.currentPiece.blocks;
        this.currentPiece.blocks = this.rotateMatrix(this.currentPiece.blocks);

        if (this.collides()) {
            this.currentPiece.blocks = originalBlocks;
        }
    }

    rotateMatrix(matrix) {
        const rotated = [];
        for (let col = 0; col < matrix[0].length; col++) {
            const newRow = [];
            for (let row = matrix.length - 1; row >= 0; row--) {
                newRow.push(matrix[row][col]);
            }
            rotated.push(newRow);
        }
        return rotated;
    }

    getGhostPieceY() {
        if (!this.currentPiece) return 0;
        
        let ghostY = this.currentPiece.y;
        const originalY = this.currentPiece.y;
        
        while (true) {
            this.currentPiece.y++;
            if (this.collides()) {
                this.currentPiece.y = originalY;
                return ghostY;
            }
            ghostY = this.currentPiece.y;
        }
    }

    update(deltaTime) {
        if (this.gameOver || this.isPaused) return;

        this.dropCounter += deltaTime;

        if (this.dropCounter > this.dropInterval) {
            this.softDrop();
            this.dropCounter = 0;
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i <= ROWS; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, i * BLOCK_SIZE);
            this.ctx.stroke();
        }
        for (let i = 0; i <= COLS; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * BLOCK_SIZE, 0);
            this.ctx.lineTo(i * BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }

        // Draw placed blocks
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (this.board[row][col]) {
                    this.drawBlock(col, row, this.board[row][col]);
                }
            }
        }

        // Draw current piece
        if (this.currentPiece) {
            const { blocks, x, y, color } = this.currentPiece;
            for (let row = 0; row < blocks.length; row++) {
                for (let col = 0; col < blocks[row].length; col++) {
                    if (blocks[row][col]) {
                        this.drawBlock(x + col, y + row, color);
                    }
                }
            }
        }

        // Draw ghost piece (drop indicator)
        if (this.currentPiece) {
            const { blocks, x, color } = this.currentPiece;
            const ghostY = this.getGhostPieceY();
            for (let row = 0; row < blocks.length; row++) {
                for (let col = 0; col < blocks[row].length; col++) {
                    if (blocks[row][col]) {
                        this.drawGhostBlock(x + col, ghostY + row, color);
                    }
                }
            }
        }

        // Draw game over overlay
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
        }

        // Draw pause overlay
        if (this.isPaused && !this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    drawBlock(col, row, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(col * BLOCK_SIZE + 1, row * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
        
        // Add shadow/border for depth
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(col * BLOCK_SIZE + 1, row * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
    }

    drawGhostBlock(col, row, color) {
        // Draw semi-transparent outline showing where the piece will land
        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.15)';
        this.ctx.fillRect(col * BLOCK_SIZE + 1, row * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(col * BLOCK_SIZE + 1, row * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
    }

    drawNextPiece() {
        this.nextCtx.fillStyle = '#000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        if (this.nextPiece) {
            const { blocks, color } = this.nextPiece;
            const offsetX = (4 - blocks[0].length) / 2;
            const offsetY = (4 - blocks.length) / 2;

            for (let row = 0; row < blocks.length; row++) {
                for (let col = 0; col < blocks[row].length; col++) {
                    if (blocks[row][col]) {
                        const x = (offsetX + col) * 25;
                        const y = (offsetY + row) * 25;
                        
                        this.nextCtx.fillStyle = color;
                        this.nextCtx.fillRect(x + 1, y + 1, 23, 23);
                        this.nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                        this.nextCtx.lineWidth = 1;
                        this.nextCtx.strokeRect(x + 1, y + 1, 23, 23);
                    }
                }
            }
        }
    }

    updateStats() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }

    endGame() {
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }

    start() {
        console.log('Start button clicked');
        if (!this.currentPiece) {
            console.log('No current piece, spawning...');
            this.spawnPiece();
        }
        this.gameOver = false;
        this.isPaused = false;
        this.dropCounter = 0;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('pauseBtn').textContent = 'PAUSE';
        console.log('Game started');
    }

    pause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? 'RESUME' : 'PAUSE';
    }

    reset() {
        this.board = this.createBoard();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.currentPiece = null;
        this.nextPiece = this.getRandomPiece();
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'PAUSE';
        this.updateStats();
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('dropBtn').addEventListener('click', () => {
            if (!this.gameOver && !this.isPaused && this.currentPiece) {
                this.hardDrop();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.isPaused || !this.currentPiece) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.moveLeft();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.moveRight();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.softDrop();
                    break;
                case ' ':
                    e.preventDefault();
                    this.hardDrop();
                    break;
                case 'z':
                case 'Z':
                    this.rotate();
                    break;
                case 'x':
                case 'X':
                    this.rotate();
                    break;
            }
        });

        this.setupTouchControls();
    }

    setupTouchControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let lastTouchX = 0;
        let accumulatedDeltaX = 0;
        const TAP_THRESHOLD = 150; // ms - max time for a tap
        const TAP_MOVE_THRESHOLD = 15; // pixels - max movement for a tap
        const MOVE_THRESHOLD = BLOCK_SIZE * 0.6; // pixels to move one column

        this.canvas.addEventListener('touchstart', (e) => {
            if (this.gameOver || this.isPaused || !this.currentPiece) return;
            e.preventDefault();

            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            lastTouchX = touch.clientX;
            touchStartTime = Date.now();
            accumulatedDeltaX = 0;
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (this.gameOver || this.isPaused || !this.currentPiece) return;
            e.preventDefault();

            const touch = e.touches[0];
            const deltaX = touch.clientX - lastTouchX;
            accumulatedDeltaX += deltaX;

            // Move piece when accumulated movement exceeds threshold
            while (accumulatedDeltaX >= MOVE_THRESHOLD) {
                this.moveRight();
                accumulatedDeltaX -= MOVE_THRESHOLD;
            }
            while (accumulatedDeltaX <= -MOVE_THRESHOLD) {
                this.moveLeft();
                accumulatedDeltaX += MOVE_THRESHOLD;
            }

            // Soft drop when swiping down
            const deltaY = touch.clientY - touchStartY;
            if (deltaY > BLOCK_SIZE * 2) {
                this.softDrop();
                touchStartY = touch.clientY;
            }

            lastTouchX = touch.clientX;
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.gameOver || this.isPaused || !this.currentPiece) return;
            e.preventDefault();

            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;

            // Detect tap (short touch with minimal movement)
            const totalMoveX = Math.abs(lastTouchX - touchStartX);
            if (touchDuration < TAP_THRESHOLD && totalMoveX < TAP_MOVE_THRESHOLD) {
                this.rotate();
            }
        }, { passive: false });
    }
}

// Game Loop
let lastTime = 0;
const game = new Tetris();

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    game.update(deltaTime);
    game.draw();
    game.drawNextPiece();
    game.updateStats();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
