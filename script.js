const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');

// Game Constants
const GRID_SIZE = 20; // Size of one grid cell in pixels (base)
let TILE_COUNT_X = 20;
let TILE_COUNT_Y = 20;
let TILE_SIZE = 20;

// Game State
let snake = [];
let food = { x: 0, y: 0 };
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameRunning = false;
let lastRenderTime = 0;
let gameSpeed = 10; // Moves per second
let particles = [];

// Initialize High Score
highScoreElement.textContent = highScore;

// Resize handling
function resizeCanvas() {
    const container = document.querySelector('.game-container');
    const maxWidth = container.clientWidth;
    const maxHeight = container.clientHeight;

    // Calculate optimal tile size
    // We want at least 15 tiles width on small screens
    const targetTileCount = window.innerWidth < 600 ? 15 : 25;
    TILE_SIZE = Math.floor(maxWidth / targetTileCount);
    
    // Ensure tile size is even for better rendering
    TILE_SIZE = TILE_SIZE - (TILE_SIZE % 2);

    TILE_COUNT_X = Math.floor(maxWidth / TILE_SIZE);
    TILE_COUNT_Y = Math.floor(maxHeight / TILE_SIZE);

    canvas.width = TILE_COUNT_X * TILE_SIZE;
    canvas.height = TILE_COUNT_Y * TILE_SIZE;
}

window.addEventListener('resize', () => {
    resizeCanvas();
    if (!gameRunning) {
        draw();
    }
});
resizeCanvas();

// Input Handling
document.addEventListener('keydown', handleKeyDown);

// Touch Handling
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    
    if (!gameRunning) {
        startGame();
    } else if (gameOverScreen.classList.contains('hidden') === false) {
        resetGame();
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!gameRunning) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 0) setDirection(1, 0);
        else setDirection(-1, 0);
    } else {
        // Vertical swipe
        if (dy > 0) setDirection(0, 1);
        else setDirection(0, -1);
    }
});

function handleKeyDown(e) {
    if (!gameRunning && (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        startGame();
        return;
    }

    if (!gameRunning && !gameOverScreen.classList.contains('hidden')) {
        resetGame();
        return;
    }

    switch (e.key) {
        case 'ArrowUp': setDirection(0, -1); break;
        case 'ArrowDown': setDirection(0, 1); break;
        case 'ArrowLeft': setDirection(-1, 0); break;
        case 'ArrowRight': setDirection(1, 0); break;
    }
}

function setDirection(x, y) {
    // Prevent reversing direction
    if (direction.x !== 0 && x === -direction.x) return;
    if (direction.y !== 0 && y === -direction.y) return;
    
    // Prevent multiple moves in one frame
    const isGoingHorizontal = direction.x !== 0;
    const isGoingVertical = direction.y !== 0;
    const willGoHorizontal = x !== 0;
    const willGoVertical = y !== 0;

    // Simple check to update next direction
    nextDirection = { x, y };
}

// Game Logic
function startGame() {
    if (gameRunning) return;
    
    snake = [
        { x: Math.floor(TILE_COUNT_X / 2), y: Math.floor(TILE_COUNT_Y / 2) }
    ];
    direction = { x: 0, y: 0 }; // Start stationary until move
    nextDirection = { x: 0, y: -1 }; // Default move up
    score = 0;
    scoreElement.textContent = score;
    gameRunning = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    placeFood();
    window.requestAnimationFrame(gameLoop);
}

function resetGame() {
    gameRunning = false;
    startGame();
}

function gameOver() {
    gameRunning = false;
    gameOverScreen.classList.remove('hidden');
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }
}

function placeFood() {
    let validPosition = false;
    while (!validPosition) {
        food = {
            x: Math.floor(Math.random() * TILE_COUNT_X),
            y: Math.floor(Math.random() * TILE_COUNT_Y)
        };
        // Check if food is on snake
        validPosition = !snake.some(segment => segment.x === food.x && segment.y === food.y);
    }
}

function update() {
    direction = nextDirection;

    // If no direction set (start of game), don't move yet
    if (direction.x === 0 && direction.y === 0) return;

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Wall Collision
    if (head.x < 0 || head.x >= TILE_COUNT_X || head.y < 0 || head.y >= TILE_COUNT_Y) {
        gameOver();
        return;
    }

    // Self Collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);

    // Eat Food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        createParticles(head.x * TILE_SIZE + TILE_SIZE/2, head.y * TILE_SIZE + TILE_SIZE/2, '#ff0055');
        placeFood();
        // Increase speed slightly
        gameSpeed = Math.min(20, 10 + Math.floor(score / 50));
    } else {
        snake.pop();
    }
}

// Particle System
function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
}

// ...existing code...
function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// Rendering
function draw() {
    // Clear background
    ctx.fillStyle = 'rgba(15, 15, 26, 1)'; // Opaque clear
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Optional, subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw Food
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0055';
    ctx.fillStyle = '#ff0055';
    const foodX = food.x * TILE_SIZE + TILE_SIZE / 2;
    const foodY = food.y * TILE_SIZE + TILE_SIZE / 2;
    const pulse = Math.sin(Date.now() / 200) * 2;
    
    ctx.beginPath();
    ctx.arc(foodX, foodY, (TILE_SIZE / 2) - 4 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Snake
    snake.forEach((segment, index) => {
        const x = segment.x * TILE_SIZE;
        const y = segment.y * TILE_SIZE;
        
        if (index === 0) {
            // Head
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00ff88';
            ctx.fillStyle = '#00ff88';
        } else {
            // Body
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(0, 204, 106, ${1 - index / (snake.length + 5)})`; // Fade tail
        }

        // Rounded rectangles for body
        drawRoundedRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2, 4);
    });
    ctx.shadowBlur = 0;

    drawParticles();
}

function gameLoop(currentTime) {
    window.requestAnimationFrame(gameLoop);

    if (!gameRunning) {
        // Still draw particles and idle animations if we wanted
        return;
    }

    const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
    
    // Update Game Logic (Snake movement) based on speed
    if (secondsSinceLastRender >= 1 / gameSpeed) {
        lastRenderTime = currentTime;
        update();
    }

    // Update Visuals (Particles) every frame for smoothness
    updateParticles();
    
    // Draw everything every frame
    draw();
}

// Start the loop
window.requestAnimationFrame(gameLoop);

// Remove the old renderLoop
// ...existing code...
