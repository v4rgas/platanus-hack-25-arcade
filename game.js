// Platanus Hack 25: Snake Game
// Navigate the snake around the "PLATANUS HACK ARCADE" title made of blocks!

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  scene: {
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

// Game variables
let snake = [];
let snakeSize = 15;
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food;
let score = 0;
let scoreText;
let titleBlocks = [];
let gameOver = false;
let moveTimer = 0;
let moveDelay = 150;
let graphics;

// Pixel font patterns (5x5 grid for each letter)
const letters = {
  P: [[1,1,1,1],[1,0,0,1],[1,1,1,1],[1,0,0,0],[1,0,0,0]],
  L: [[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,1,1,1]],
  A: [[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  T: [[1,1,1,1],[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  N: [[1,0,0,1],[1,1,0,1],[1,0,1,1],[1,0,0,1],[1,0,0,1]],
  U: [[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]],
  S: [[0,1,1,1],[1,0,0,0],[0,1,1,0],[0,0,0,1],[1,1,1,0]],
  H: [[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  C: [[0,1,1,1],[1,0,0,0],[1,0,0,0],[1,0,0,0],[0,1,1,1]],
  K: [[1,0,0,1],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,0,0,1]],
  '2': [[1,1,1,0],[0,0,0,1],[0,1,1,0],[1,0,0,0],[1,1,1,1]],
  '5': [[1,1,1,1],[1,0,0,0],[1,1,1,0],[0,0,0,1],[1,1,1,0]],
  ':': [[0,0,0,0],[0,1,0,0],[0,0,0,0],[0,1,0,0],[0,0,0,0]],
  R: [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,1,0],[1,0,0,1]],
  D: [[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
  E: [[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,1,1,1]]
};

// Bold font for ARCADE (filled/solid style)
const boldLetters = {
  A: [[1,1,1,1,1],[1,1,0,1,1],[1,1,1,1,1],[1,1,0,1,1],[1,1,0,1,1]],
  R: [[1,1,1,1,0],[1,1,0,1,1],[1,1,1,1,0],[1,1,0,1,1],[1,1,0,1,1]],
  C: [[1,1,1,1,1],[1,1,0,0,0],[1,1,0,0,0],[1,1,0,0,0],[1,1,1,1,1]],
  D: [[1,1,1,1,0],[1,1,0,1,1],[1,1,0,1,1],[1,1,0,1,1],[1,1,1,1,0]],
  E: [[1,1,1,1,1],[1,1,0,0,0],[1,1,1,1,0],[1,1,0,0,0],[1,1,1,1,1]]
};

function create() {
  const scene = this;
  graphics = this.add.graphics();

  // Build "PLATANUS HACK ARCADE" in cyan - centered and grid-aligned
  // PLATANUS: 8 letters × (4 cols + 1 spacing) = 40 blocks, but last letter no spacing = 39 blocks × 15px = 585px
  let x = Math.floor((800 - 585) / 2 / snakeSize) * snakeSize;
  let y = Math.floor(180 / snakeSize) * snakeSize;
  'PLATANUS'.split('').forEach(char => {
    x = drawLetter(char, x, y, 0x00ffff);
  });

  // HACK: 4 letters × (4 cols + 1 spacing) = 20 blocks, but last letter no spacing = 19 blocks × 15px = 285px
  x = Math.floor((800 - 285) / 2 / snakeSize) * snakeSize;
  y = Math.floor(280 / snakeSize) * snakeSize;
  'HACK'.split('').forEach(char => {
    x = drawLetter(char, x, y, 0x00ffff);
  });

  // ARCADE: 6 letters × (5 cols + 1 spacing) = 36 blocks, but last letter no spacing = 35 blocks × 15px = 525px
  x = Math.floor((800 - 525) / 2 / snakeSize) * snakeSize;
  y = Math.floor(380 / snakeSize) * snakeSize;
  'ARCADE'.split('').forEach(char => {
    x = drawLetter(char, x, y, 0xff00ff, true);
  });

  // Score display
  scoreText = this.add.text(16, 16, 'Score: 0', {
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    color: '#00ff00'
  });

  // Instructions
  this.add.text(400, 560, 'Arrow Keys | Avoid Walls, Yourself & The Title!', {
    fontSize: '16px',
    fontFamily: 'Arial, sans-serif',
    color: '#888888',
    align: 'center'
  }).setOrigin(0.5);

  // Initialize snake (start top left)
  snake = [
    { x: 75, y: 60 },
    { x: 60, y: 60 },
    { x: 45, y: 60 }
  ];

  // Spawn initial food
  spawnFood();

  // Keyboard input
  this.input.keyboard.on('keydown', (event) => {
    if (gameOver && event.key === 'r') {
      restartGame(scene);
      return;
    }

    if (event.key === 'ArrowUp' && direction.y === 0) {
      nextDirection = { x: 0, y: -1 };
    } else if (event.key === 'ArrowDown' && direction.y === 0) {
      nextDirection = { x: 0, y: 1 };
    } else if (event.key === 'ArrowLeft' && direction.x === 0) {
      nextDirection = { x: -1, y: 0 };
    } else if (event.key === 'ArrowRight' && direction.x === 0) {
      nextDirection = { x: 1, y: 0 };
    }
  });

  playTone(this, 440, 0.1);
}

function drawLetter(char, startX, startY, color, useBold = false) {
  const pattern = useBold ? boldLetters[char] : letters[char];
  if (!pattern) return startX + 30;

  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      if (pattern[row][col]) {
        const blockX = startX + col * snakeSize;
        const blockY = startY + row * snakeSize;
        titleBlocks.push({ x: blockX, y: blockY, color: color });
      }
    }
  }
  return startX + (pattern[0].length + 1) * snakeSize;
}

function update(_time, delta) {
  if (gameOver) return;

  moveTimer += delta;
  if (moveTimer >= moveDelay) {
    moveTimer = 0;
    direction = nextDirection;
    moveSnake(this);
  }

  drawGame();
}

function moveSnake(scene) {
  const head = snake[0];
  const newHead = {
    x: head.x + direction.x * snakeSize,
    y: head.y + direction.y * snakeSize
  };

  // Check wall collision
  if (newHead.x < 0 || newHead.x >= 800 || newHead.y < 0 || newHead.y >= 600) {
    endGame(scene);
    return;
  }

  // Check self collision
  for (let segment of snake) {
    if (segment.x === newHead.x && segment.y === newHead.y) {
      endGame(scene);
      return;
    }
  }

  // Check title block collision
  for (let block of titleBlocks) {
    if (newHead.x === block.x && newHead.y === block.y) {
      endGame(scene);
      return;
    }
  }

  snake.unshift(newHead);

  // Check food collision
  if (newHead.x === food.x && newHead.y === food.y) {
    score += 10;
    scoreText.setText('Score: ' + score);
    spawnFood();
    playTone(scene, 880, 0.1);

    if (moveDelay > 80) {
      moveDelay -= 2;
    }
  } else {
    snake.pop();
  }
}

function spawnFood() {
  let valid = false;
  let attempts = 0;

  while (!valid && attempts < 100) {
    attempts++;
    const gridX = Math.floor(Math.random() * 53) * snakeSize;
    const gridY = Math.floor(Math.random() * 40) * snakeSize;

    // Check not on snake
    let onSnake = false;
    for (let segment of snake) {
      if (segment.x === gridX && segment.y === gridY) {
        onSnake = true;
        break;
      }
    }

    // Check not on title blocks
    let onTitle = false;
    for (let block of titleBlocks) {
      if (gridX === block.x && gridY === block.y) {
        onTitle = true;
        break;
      }
    }

    if (!onSnake && !onTitle) {
      food = { x: gridX, y: gridY };
      valid = true;
    }
  }
}

function drawGame() {
  graphics.clear();

  // Draw title blocks
  titleBlocks.forEach(block => {
    graphics.fillStyle(block.color, 1);
    graphics.fillRect(block.x, block.y, snakeSize - 2, snakeSize - 2);
  });

  // Draw snake
  snake.forEach((segment, index) => {
    if (index === 0) {
      graphics.fillStyle(0x00ff00, 1);
    } else {
      graphics.fillStyle(0x00aa00, 1);
    }
    graphics.fillRect(segment.x, segment.y, snakeSize - 2, snakeSize - 2);
  });

  // Draw food
  graphics.fillStyle(0xff0000, 1);
  graphics.fillRect(food.x, food.y, snakeSize - 2, snakeSize - 2);
}

function endGame(scene) {
  gameOver = true;
  playTone(scene, 220, 0.5);

  // Semi-transparent overlay
  const overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.7);
  overlay.fillRect(0, 0, 800, 600);

  // Game Over title with glow effect
  const gameOverText = scene.add.text(400, 300, 'GAME OVER', {
    fontSize: '64px',
    fontFamily: 'Arial, sans-serif',
    color: '#ff0000',
    align: 'center',
    stroke: '#ff6666',
    strokeThickness: 8
  }).setOrigin(0.5);

  // Pulsing animation for game over text
  scene.tweens.add({
    targets: gameOverText,
    scale: { from: 1, to: 1.1 },
    alpha: { from: 1, to: 0.8 },
    duration: 800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  // Score display
  scene.add.text(400, 400, 'SCORE: ' + score, {
    fontSize: '36px',
    fontFamily: 'Arial, sans-serif',
    color: '#00ffff',
    align: 'center',
    stroke: '#000000',
    strokeThickness: 4
  }).setOrigin(0.5);

  // Restart instruction with subtle animation
  const restartText = scene.add.text(400, 480, 'Press R to Restart', {
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffff00',
    align: 'center',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5);

  // Blinking animation for restart text
  scene.tweens.add({
    targets: restartText,
    alpha: { from: 1, to: 0.3 },
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
}

function restartGame(scene) {
  snake = [
    { x: 75, y: 60 },
    { x: 60, y: 60 },
    { x: 45, y: 60 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  gameOver = false;
  moveDelay = 150;
  scoreText.setText('Score: 0');
  spawnFood();
  scene.scene.restart();
}

function playTone(scene, frequency, duration) {
  const audioContext = scene.sound.context;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'square';

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}
