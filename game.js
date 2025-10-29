// sortEm - Instant zen mode puzzle with retro vibes

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a0a2e',
  scene: {
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

// Vibrant vaporwave palette
const colors = {
  bg: 0x1a0a2e,
  hotPink: 0xff006e,
  purple: 0x8338ec,
  cyan: 0x00f5ff,
  yellow: 0xfbbf24,
  green: 0x10b981,
  blockDark: 0x2d1b4e,
  blockSelected: 0x8338ec,
  blockGrabbed: 0xff006e
};

// ==========================================
// GAME PHASES
// ==========================================
const GamePhase = {
  START_SCREEN: 'START_SCREEN',     // Title screen with leaderboard
  PLAYING: 'PLAYING',                // Active gameplay
  WIN_ANIMATION: 'WIN_ANIMATION',   // Victory animation playing
  NAME_INPUT: 'NAME_INPUT',          // High score name entry
  GAME_OVER: 'GAME_OVER',           // Show final score/leaderboard
  TRANSITIONING: 'TRANSITIONING'     // Prevent input during transitions
};

// ==========================================
// GAME STATE MANAGER
// ==========================================
class GameStateManager {
  constructor() {
    this.currentPhase = GamePhase.START_SCREEN;
    this.phaseStartTime = Date.now();
    this.inputBlocked = false;
    this.blockDuration = 0;
  }

  setPhase(newPhase) {
    // Block input briefly during phase transitions
    this.currentPhase = GamePhase.TRANSITIONING;
    this.inputBlocked = true;
    this.blockDuration = 200; // 200ms input block

    setTimeout(() => {
      this.currentPhase = newPhase;
      this.phaseStartTime = Date.now();
      this.inputBlocked = false;
    }, this.blockDuration);
  }

  getPhase() {
    return this.currentPhase;
  }

  isInputAllowed() {
    return !this.inputBlocked && this.currentPhase !== GamePhase.TRANSITIONING;
  }

  getPhaseTime() {
    return Date.now() - this.phaseStartTime;
  }
}

// ==========================================
// GAME LOGIC CLASS
// ==========================================
class GameState {
  constructor(scene) {
    this.scene = scene;
    this.blocks = [];
    this.textObjects = [];
    this.selectedIdx = 0;
    this.isGrabbed = false;
    this.gameWon = false;
    this.startTime = null; // Will be set on first input
    this.blockPositions = [];
  }

  generateNumbers() {
    let numbers;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 1000) {
      attempts++;
      numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
      }

      valid = true;
      for (let i = 0; i < numbers.length - 1; i++) {
        if (Math.abs(numbers[i] - numbers[i + 1]) === 1) {
          valid = false;
          break;
        }
      }
    }

    this.blocks = numbers.map(n => [n]);
    this.createTextObjects();
    this.calculatePositions();
  }

  calculatePositions() {
    const blockW = 60;
    const spacing = 12;
    const totalW = 10 * blockW + 9 * spacing;
    let x = (800 - totalW) / 2;

    this.blockPositions = [];
    this.blocks.forEach(block => {
      const w = blockW * block.length + spacing * (block.length - 1);
      this.blockPositions.push(x);
      x += w + spacing;
    });
  }

  createTextObjects() {
    this.textObjects.forEach(blockTexts => {
      blockTexts.forEach(t => t.destroy());
    });
    this.textObjects = [];

    this.blocks.forEach(block => {
      const blockTexts = block.map(num => {
        // Pixel-style text - larger, bolder, monospace
        return this.scene.add.text(0, 0, num.toString(), {
          fontSize: '42px',
          fontFamily: 'Courier New, monospace',
          color: '#00f5ff',
          fontStyle: 'bold',
          stroke: '#ff006e',
          strokeThickness: 2
        }).setOrigin(0.5);
      });
      this.textObjects.push(blockTexts);
    });
  }

  selectPrevious() {
    if (this.selectedIdx > 0) {
      this.selectedIdx--;
      this.scene.cameras.main.shake(80, 0.002);
      return true;
    }
    return false;
  }

  selectNext() {
    if (this.selectedIdx < this.blocks.length - 1) {
      this.selectedIdx++;
      this.scene.cameras.main.shake(80, 0.002);
      return true;
    }
    return false;
  }

  grab() {
    this.isGrabbed = true;
    this.scene.cameras.main.shake(100, 0.003);
    this.createCoolParticles(this.selectedIdx, 0xff006e, 'grab');
    this.scene.tweens.add({
      targets: this.textObjects[this.selectedIdx],
      scale: 1.15,
      duration: 120,
      ease: 'Back.easeOut'
    });
  }

  drop() {
    this.isGrabbed = false;
    this.scene.cameras.main.shake(120, 0.004);

    this.scene.tweens.add({
      targets: this.textObjects[this.selectedIdx],
      scale: 1.0,
      duration: 120,
      ease: 'Back.easeIn'
    });

    const oldLength = this.blocks.length;
    this.checkMerges(this.selectedIdx);

    if (oldLength > this.blocks.length) {
      // MERGE - BIG SHAKE!
      const mergeSize = oldLength - this.blocks.length;
      this.scene.cameras.main.shake(300 * mergeSize, 0.008 * mergeSize);
      this.createCoolParticles(this.selectedIdx, 0x10b981, 'merge', mergeSize);
    }

    return this.checkWin();
  }

  checkMerges(droppedIdx) {
    let changed = true;
    while (changed) {
      changed = false;

      if (droppedIdx > 0) {
        const current = this.blocks[droppedIdx - 1];
        const next = this.blocks[droppedIdx];

        if (current[current.length - 1] + 1 === next[0]) {
          this.blocks[droppedIdx - 1] = [...current, ...next];
          this.blocks.splice(droppedIdx, 1);
          droppedIdx--;
          if (this.selectedIdx >= droppedIdx) {
            this.selectedIdx--;
          }
          changed = true;
          continue;
        }
      }

      if (droppedIdx < this.blocks.length - 1) {
        const current = this.blocks[droppedIdx];
        const next = this.blocks[droppedIdx + 1];

        if (current[current.length - 1] + 1 === next[0]) {
          this.blocks[droppedIdx] = [...current, ...next];
          this.blocks.splice(droppedIdx + 1, 1);
          if (this.selectedIdx > droppedIdx) {
            this.selectedIdx--;
          }
          changed = true;
          continue;
        }
      }
    }

    this.createTextObjects();
    this.calculatePositions();
  }

  moveLeft() {
    if (!this.isGrabbed || this.selectedIdx === 0) return false;

    const temp = this.blocks[this.selectedIdx];
    this.blocks[this.selectedIdx] = this.blocks[this.selectedIdx - 1];
    this.blocks[this.selectedIdx - 1] = temp;

    const tempText = this.textObjects[this.selectedIdx];
    this.textObjects[this.selectedIdx] = this.textObjects[this.selectedIdx - 1];
    this.textObjects[this.selectedIdx - 1] = tempText;

    this.selectedIdx--;
    this.calculatePositions();

    // SHAKE ON MOVE!
    this.scene.cameras.main.shake(150, 0.004);
    this.createCoolParticles(this.selectedIdx, 0xfbbf24, 'move');

    return true;
  }

  moveRight() {
    if (!this.isGrabbed || this.selectedIdx === this.blocks.length - 1) return false;

    const temp = this.blocks[this.selectedIdx];
    this.blocks[this.selectedIdx] = this.blocks[this.selectedIdx + 1];
    this.blocks[this.selectedIdx + 1] = temp;

    const tempText = this.textObjects[this.selectedIdx];
    this.textObjects[this.selectedIdx] = this.textObjects[this.selectedIdx + 1];
    this.textObjects[this.selectedIdx + 1] = tempText;

    this.selectedIdx++;
    this.calculatePositions();

    // SHAKE ON MOVE!
    this.scene.cameras.main.shake(150, 0.004);
    this.createCoolParticles(this.selectedIdx, 0xfbbf24, 'move');

    return true;
  }

  createCoolParticles(idx, color, type, intensity = 1) {
    const blockW = 60;
    const spacing = 12;
    const block = this.blocks[idx];
    const w = blockW * block.length + spacing * (block.length - 1);
    const x = this.blockPositions[idx] + w / 2;
    const y = 340;

    let config;

    if (type === 'grab') {
      // Sharp lines shooting out
      config = {
        x: x,
        y: y,
        lifespan: 400,
        speed: { min: 150, max: 250 },
        angle: { min: 0, max: 360 },
        scale: { start: 2, end: 0 },
        quantity: 8,
        tint: color,
        blendMode: 'ADD',
        emitting: false
      };
    } else if (type === 'move') {
      // Trail effect - sharp streaks
      config = {
        x: x,
        y: y,
        lifespan: 300,
        speedX: { min: -200, max: 200 },
        speedY: { min: -150, max: -50 },
        scale: { start: 1.5, end: 0 },
        quantity: 6,
        tint: color,
        blendMode: 'ADD',
        emitting: false
      };
    } else if (type === 'merge') {
      // Explosion with directional burst
      config = {
        x: x,
        y: y,
        lifespan: 600,
        speed: { min: 200, max: 450 },
        angle: { min: -100, max: -80 },
        scale: { start: 2.5, end: 0 },
        quantity: 20 * intensity,
        tint: [color, 0xfbbf24, 0xffffff],
        blendMode: 'ADD',
        gravityY: 400,
        emitting: false
      };
    }

    const emitter = this.scene.add.particles(0, 0, 'particle', config);
    emitter.explode();

    this.scene.time.delayedCall(700, () => emitter.destroy());
  }

  checkWin() {
    const allNumbers = this.blocks.flat();
    for (let i = 1; i < allNumbers.length; i++) {
      if (allNumbers[i] < allNumbers[i - 1]) {
        return false;
      }
    }
    this.gameWon = true;
    return true;
  }

  draw(graphics) {
    graphics.clear();

    const blockW = 60;
    const spacing = 12;
    const y = 300;
    const h = 80;

    this.blocks.forEach((block, blockIdx) => {
      const isSelected = blockIdx === this.selectedIdx;
      const isGrabbed = isSelected && this.isGrabbed;
      const w = blockW * block.length + spacing * (block.length - 1);
      const x = this.blockPositions[blockIdx];

      // Retro shadow
      graphics.fillStyle(0x8338ec, 0.4);
      graphics.fillRect(x + 3, y + 3, w, h);

      // Block fill - vibrant colors
      if (isGrabbed) {
        graphics.fillStyle(colors.blockGrabbed, 1);
      } else if (isSelected) {
        graphics.fillStyle(colors.blockSelected, 1);
      } else {
        graphics.fillStyle(colors.blockDark, 1);
      }
      graphics.fillRect(x, y, w, h);

      // Pixel-style inner highlight
      graphics.fillStyle(0x00f5ff, 0.2);
      graphics.fillRect(x + 2, y + 2, w - 4, 4);

      // Bold border
      const borderColor = isGrabbed ? colors.cyan :
        isSelected ? colors.hotPink : colors.purple;
      const borderWidth = isSelected ? 4 : 3;

      graphics.lineStyle(borderWidth, borderColor, 1);
      graphics.strokeRect(x, y, w, h);

      // Pulsing glow for grabbed
      if (isGrabbed) {
        const pulse = Math.sin(Date.now() / 150) * 0.3 + 0.5;
        graphics.lineStyle(6, colors.cyan, pulse);
        graphics.strokeRect(x - 3, y - 3, w + 6, h + 6);
      }

      // Merged indicator - bright green
      if (block.length > 1) {
        graphics.lineStyle(3, colors.green, 0.7);
        graphics.strokeRect(x + 4, y + 4, w - 8, h - 8);
      }

      // Update text positions
      block.forEach((num, numIdx) => {
        const textObj = this.textObjects[blockIdx][numIdx];
        if (textObj) {
          textObj.setPosition(
            x + blockW / 2 + numIdx * (blockW + spacing),
            y + 40
          );
        }
      });
    });
  }

  getElapsedTime() {
    if (!this.startTime) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  cleanup() {
    this.textObjects.forEach(blockTexts => {
      blockTexts.forEach(t => t.destroy());
    });
  }
}

// Leaderboard functions
function getLb() {
  try {
    const data = localStorage.getItem('sortEmLb');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveLb(lb) {
  try {
    localStorage.setItem('sortEmLb', JSON.stringify(lb.slice(0, 3)));
  } catch (e) { }
}

function addScore(name, time) {
  const lb = getLb();
  lb.push({ n: name, t: parseFloat(time) });
  lb.sort((a, b) => a.t - b.t);
  saveLb(lb);
  return lb.slice(0, 3);
}

function isHigh(time) {
  const lb = getLb();
  return lb.length < 3 || parseFloat(time) < lb[2].t;
}

// ==========================================
// GLOBAL VARIABLES
// ==========================================
let phaseManager;
let gameState;
let graphics;
let timerText;
let gridLines;
let titleText;
let titleShadow1;
let titleShadow2;
let subtitleText;
let instructionsText;
let leaderboardText;
let nameInputActive = false;
let currentName = ['A', 'A', 'A'];
let nameInputPos = 0;
let nameInputObjects = [];
let gameOverObjects = [];

// ==========================================
// SIMPLIFIED MUSIC SYSTEM - Adaptive Drum Loop
// ==========================================

// Drum patterns - string based for easy modification
// Each word = 8th note, so you can make complex syncopated patterns!
// Synth notes: C, D, E, F, G, A (play for 4 beats)
const drumPatterns = {
  intro: "kick snare hihat kick . snare hihat kick hihat snare . kick hihat snare hihat kick",
  transition: ". . snare . snare hihat snare snare kick kick hihat kick",
  playing: "kick hihat snare hihat kick . snare kick",
  gameOver: "kick . . . snare . . . kick . . . . . snare .",
  win: "kick snare hihat snare kick hihat snare kick kick kick snare snare hihat hihat kick kick"
};

// Synth patterns - Simple transposed chords that resolve!
const synthPatterns = {
  intro: "B3 . . F#4 .  F#4 E4 D4 C#4 C#4 . D4 B3 . . . . B4 A4 . . . D4",  // Your melody
  transition: "E4 G#4 B4 D#5 E4 G#4 B4 D#5 E4 G#4 B4 D#5 E4 G#4 B4 D#5",  // Emaj7 arpeggio x4
  playing: "F4 A4 C5 E5",                         // Fmaj7 (transposed up one)
  gameOver: "C4 . . E4 . . G4 . . B4 . . . . . .",  // Cmaj7 arpeggio (slow)
  win: "C4 E4 G4 B4"                              // Cmaj7 - RESOLVED!
};

// Music configuration
let baseBPM = 95;           // Default BPM (vaporwave slow tempo)
let currentBPM = 95;        // Current playing BPM
let targetBPM = 95;         // Target BPM based on player speed
let playerMoves = [];       // Track last 10 move timestamps
const MAX_MOVES_TRACKED = 10;
const BPM_MIN = 80;         // Minimum BPM
const BPM_MAX = 300;        // Maximum BPM
const BPM_SMOOTHING = 0.9;  // How quickly BPM adapts (0-1, higher = slower)

// Drum loop state
let currentPattern = 'intro';
let drumLoopTimer = null;
let patternIndex = 0;
let synthPatternIndex = 0;
let isTransitioning = false;

// Parse drum pattern string into array
function parseDrumPattern(patternStr) {
  return patternStr.split(' ').map(item => {
    if (item === '.' || item === 'nothing') return null;
    return item; // 'kick', 'snare', 'hihat', etc.
  });
}

// Calculate BPM from recent player moves
function calculatePlayerBPM() {
  if (playerMoves.length < 2) return baseBPM;

  // Calculate average interval between moves
  let totalInterval = 0;
  let count = 0;

  for (let i = 1; i < playerMoves.length; i++) {
    const interval = playerMoves[i] - playerMoves[i - 1];
    // Filter out unreasonable intervals (too fast or too slow)
    if (interval >= 200 && interval <= 2000) {
      totalInterval += interval;
      count++;
    }
  }

  if (count === 0) return currentBPM;

  // Convert average interval to BPM
  const avgInterval = totalInterval / count;
  const calculatedBPM = Math.round(60000 / avgInterval);

  // Clamp to reasonable range
  return Math.max(BPM_MIN, Math.min(BPM_MAX, calculatedBPM));
}

// Track player move for BPM calculation
function trackPlayerMove() {
  const now = Date.now();
  playerMoves.push(now);

  // Keep only the last N moves
  if (playerMoves.length > MAX_MOVES_TRACKED) {
    playerMoves.shift();
  }

  // Update target BPM
  if (phaseManager.getPhase() === GamePhase.PLAYING) {
    targetBPM = calculatePlayerBPM();
  }
}

// Display leaderboard - VERTICAL
function showLb(scene, startY, scale = 1) {
  const lb = getLb();
  if (lb.length === 0) return null;

  const objects = [];

  // Scale-based sizing
  const titleSize = Math.round(18 * scale);
  const scoreSize = Math.round(16 * scale);
  const lineHeight = Math.round(22 * scale);
  const bgWidth = Math.round(160 * scale);
  const bgX = 400 - bgWidth / 2;

  // Title
  const title = scene.add.text(400, startY, 'TOP SCORES', {
    fontSize: titleSize + 'px',
    fontFamily: 'Courier New, monospace',
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  objects.push(title);

  // Add solid background for better visibility
  const bgHeight = Math.round(25 * scale) + lb.length * lineHeight;
  const bg = scene.add.graphics();
  bg.fillStyle(0x2d1b4e, 1);
  bg.fillRect(bgX, startY - Math.round(15 * scale), bgWidth, bgHeight);
  bg.lineStyle(3, 0xff006e, 1);
  bg.strokeRect(bgX, startY - Math.round(15 * scale), bgWidth, bgHeight);

  // Draw title AFTER background so it's on top
  title.setDepth(10);

  objects.push(bg);

  // Each score on its own line
  const colors = ['#ff006e', '#fbbf24', '#00f5ff'];
  lb.forEach((s, i) => {
    const y = startY + lineHeight + i * lineHeight;
    const txt = (i + 1) + '. ' + s.n + '  ' + s.t.toFixed(1) + 's';
    const scoreText = scene.add.text(400, y, txt, {
      fontSize: scoreSize + 'px',
      fontFamily: 'Courier New, monospace',
      color: colors[i],
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);
    objects.push(scoreText);
  });

  return objects;
}

// Name input screen
function showNameInput(scene, finalTime) {
  nameInputActive = true;
  currentName = ['A', 'A', 'A'];
  nameInputPos = 0;
  nameInputObjects = [];

  // High score banner (moved up to match SORTED position)
  const banner = scene.add.text(400, 260, 'NEW HIGH SCORE!', {
    fontSize: '40px',
    fontFamily: 'Courier New, monospace',
    color: '#fbbf24',
    fontStyle: 'bold',
    stroke: '#ff006e',
    strokeThickness: 4
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: banner,
    scale: { from: 1, to: 1.1 },
    duration: 500,
    yoyo: true,
    repeat: -1
  });

  nameInputObjects.push(banner);

  // Instructions
  const inst = scene.add.text(400, 310, 'Enter Your Name', {
    fontSize: '18px',
    fontFamily: 'Courier New, monospace',
    color: '#00f5ff'
  }).setOrigin(0.5);
  nameInputObjects.push(inst);

  // Letter blocks (in the middle area)
  const letterY = 370;
  const letterSpacing = 80;
  const startX = 400 - letterSpacing;

  for (let i = 0; i < 3; i++) {
    const x = startX + i * letterSpacing;

    // Block background
    const bg = scene.add.graphics();
    bg.fillStyle(0x2d1b4e, 1);
    bg.fillRect(x - 30, letterY - 40, 60, 80);
    bg.lineStyle(3, 0x8338ec, 1);
    bg.strokeRect(x - 30, letterY - 40, 60, 80);
    nameInputObjects.push(bg);

    // Letter text
    const letter = scene.add.text(x, letterY, currentName[i], {
      fontSize: '56px',
      fontFamily: 'Courier New, monospace',
      color: '#00f5ff',
      fontStyle: 'bold',
      stroke: '#ff006e',
      strokeThickness: 3
    }).setOrigin(0.5);
    nameInputObjects.push(letter);
  }

  // Cursor indicator
  const cursor = scene.add.graphics();
  nameInputObjects.push(cursor);

  // Arrow instructions - arcade controller friendly
  const arrows = scene.add.text(400, 460, '↑↓: Change Letter  ←→: Move  SPACE: Confirm', {
    fontSize: '16px',
    fontFamily: 'Courier New, monospace',
    color: '#00f5ff',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  nameInputObjects.push(arrows);

  scene.tweens.add({
    targets: arrows,
    alpha: { from: 1, to: 0.5 },
    duration: 600,
    yoyo: true,
    repeat: -1
  });

  // Update function for cursor
  scene.events.on('update', () => {
    if (!nameInputActive) return;
    cursor.clear();
    const x = startX + nameInputPos * letterSpacing;
    const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
    cursor.lineStyle(4, 0xff006e, pulse);
    cursor.strokeRect(x - 32, letterY - 42, 64, 84);
  });
}

// Update name input letter
function updateNameLetter(scene, delta) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const idx = chars.indexOf(currentName[nameInputPos]);
  const newIdx = (idx + delta + chars.length) % chars.length;
  currentName[nameInputPos] = chars[newIdx];

  // Update text object (letter texts are at positions 3, 5, 7)
  // Structure: 0=banner, 1=inst, 2=bg0, 3=text0, 4=bg1, 5=text1, 6=bg2, 7=text2, 8=cursor, 9=arrows
  const textIdx = 3 + nameInputPos * 2;
  if (nameInputObjects[textIdx]) {
    nameInputObjects[textIdx].setText(currentName[nameInputPos]);
  }

  playTone(scene, 440 + delta * 110, 0.05);
}

// Clear name input
function clearNameInput() {
  nameInputObjects.forEach(obj => obj.destroy());
  nameInputObjects = [];
  nameInputActive = false;
}

// ==========================================
// CREATE FUNCTION
// ==========================================
function create() {
  const scene = this;

  // Initialize phase manager
  phaseManager = new GameStateManager();

  // Create particle texture
  const particleGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
  particleGraphics.fillStyle(0xffffff, 1);
  particleGraphics.fillRect(0, 0, 4, 4);
  particleGraphics.generateTexture('particle', 4, 4);
  particleGraphics.destroy();

  // Grid background
  gridLines = scene.add.graphics();
  graphics = scene.add.graphics();

  // Create start screen UI
  createStartScreen(scene);

  // Start intro drum loop
  startDrumLoop(scene, 'intro');

  // Initialize game
  gameState = new GameState(scene);
  gameState.generateNumbers();

  // Timer (hidden initially)
  timerText = scene.add.text(400, 80, 'Time: 0.0s', {
    fontSize: '56px',
    fontFamily: 'Courier New, monospace',
    color: '#00f5ff',
    fontStyle: 'bold',
    stroke: '#ff006e',
    strokeThickness: 6
  }).setOrigin(0.5);
  timerText.setVisible(false);

  scene.tweens.add({
    targets: timerText,
    scale: { from: 1, to: 1.08 },
    duration: 800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  // Keyboard input
  scene.input.keyboard.on('keydown', (event) => {
    handleKeyInput(scene, event);
  });
}

// ==========================================
// START SCREEN UI
// ==========================================
function createStartScreen(scene) {
  // Title
  titleText = scene.add.text(400, 180, 'sortEm', {
    fontSize: '120px',
    fontFamily: 'Courier New, monospace',
    color: '#ff006e',
    fontStyle: 'bold',
    stroke: '#00f5ff',
    strokeThickness: 8
  }).setOrigin(0.5);

  // Shadow layers
  titleShadow1 = scene.add.text(403, 183, 'sortEm', {
    fontSize: '120px',
    fontFamily: 'Courier New, monospace',
    color: '#8338ec',
    fontStyle: 'bold',
    alpha: 0.6
  }).setOrigin(0.5);

  titleShadow2 = scene.add.text(406, 186, 'sortEm', {
    fontSize: '120px',
    fontFamily: 'Courier New, monospace',
    color: '#00f5ff',
    fontStyle: 'bold',
    alpha: 0.4
  }).setOrigin(0.5);

  // Subtitle
  subtitleText = scene.add.text(480, 230, 'ARCADE EDITION', {
    fontSize: '32px',
    fontFamily: 'Courier New, monospace',
    color: '#fbbf24',
    fontStyle: 'bold italic',
    stroke: '#ff006e',
    strokeThickness: 3,
    letterSpacing: 6
  }).setOrigin(0.5).setRotation(-0.15).setDepth(100);

  // Animations
  scene.tweens.add({
    targets: titleText,
    scale: { from: 1, to: 1.05 },
    duration: 1500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  scene.tweens.add({
    targets: subtitleText,
    alpha: { from: 0.9, to: 1 },
    duration: 1000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  // Instructions
  instructionsText = scene.add.text(400, 120, 'Arrows: Select • Space: Grab/Drop • Move: Left/Right', {
    fontSize: '16px',
    fontFamily: 'Courier New, monospace',
    color: '#8338ec'
  }).setOrigin(0.5);

  // Credit
  const creditText = scene.add.text(400, 575, '< v4rgas >', {
    fontSize: '16px',
    fontFamily: 'Arial',
    color: '#00ff00',
    fontStyle: 'italic',
    stroke: '#003300',
    strokeThickness: 3
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: creditText,
    x: { from: 400, to: 402 },
    duration: 150,
    yoyo: true,
    repeat: -1
  });

  scene.tweens.add({
    targets: creditText,
    alpha: { from: 0.8, to: 1 },
    duration: 80,
    yoyo: true,
    repeat: -1
  });

  // Leaderboard
  leaderboardText = showLb(scene, 480);
}

// ==========================================
// INPUT HANDLER
// ==========================================
function handleKeyInput(scene, event) {
  const key = event.code;

  // Check if input is allowed
  if (!phaseManager.isInputAllowed()) {
    return;
  }

  const phase = phaseManager.getPhase();

  // Handle input based on current phase
  switch (phase) {
    case GamePhase.START_SCREEN:
      handleStartScreenInput(scene, key);
      break;
    case GamePhase.PLAYING:
      handlePlayingInput(scene, key);
      break;
    case GamePhase.NAME_INPUT:
      handleNameInput(scene, key);
      break;
    case GamePhase.GAME_OVER:
      handleGameOverInput(scene, key);
      break;
  }
}

function handleStartScreenInput(scene, key) {
  // Any game input starts the game
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'KeyA' || key === 'KeyD' || key === 'Space') {
    // Play transition pattern first
    startDrumLoop(scene, 'transition');

    // Hide title elements
    if (titleText) titleText.destroy();
    if (titleShadow1) titleShadow1.destroy();
    if (titleShadow2) titleShadow2.destroy();
    if (subtitleText) subtitleText.destroy();
    if (instructionsText) instructionsText.destroy();
    if (leaderboardText) {
      leaderboardText.forEach(obj => obj.destroy());
    }

    titleText = null;
    titleShadow1 = null;
    titleShadow2 = null;
    subtitleText = null;
    instructionsText = null;
    leaderboardText = null;

    // Show timer and start game
    timerText.setVisible(true);
    gameState.startTime = Date.now();

    phaseManager.setPhase(GamePhase.PLAYING);

    // After transition, switch to playing pattern
    const transitionPattern = parseDrumPattern(synthPatterns.transition);
    const transitionDuration = 60000 / (currentBPM * 2) * transitionPattern.length;
    setTimeout(() => {
      startDrumLoop(scene, 'playing');
    }, transitionDuration);

    // Process the actual input for the game
    setTimeout(() => {
      handlePlayingInput(scene, key);
    }, phaseManager.blockDuration + 10);
  }
}

function handlePlayingInput(scene, key) {
  if (!gameState.isGrabbed) {
    if ((key === 'ArrowLeft' || key === 'KeyA') && gameState.selectPrevious()) {
      trackPlayerMove();
    } else if ((key === 'ArrowRight' || key === 'KeyD') && gameState.selectNext()) {
      trackPlayerMove();
    } else if (key === 'Space') {
      gameState.grab();
      playTone(scene, 660, 0.08);
    }
  } else {
    if ((key === 'ArrowLeft' || key === 'KeyA') && gameState.moveLeft()) {
      trackPlayerMove();
    } else if ((key === 'ArrowRight' || key === 'KeyD') && gameState.moveRight()) {
      trackPlayerMove();
    } else if (key === 'Space') {
      const won = gameState.drop();
      playTone(scene, 880, 0.12);
      if (won) {
        phaseManager.setPhase(GamePhase.WIN_ANIMATION);
        winGame(scene);
      }
    }
  }
}

function handleNameInput(scene, key) {
  if (key === 'ArrowUp') {
    updateNameLetter(scene, 1);
  } else if (key === 'ArrowDown') {
    updateNameLetter(scene, -1);
  } else if (key === 'ArrowLeft') {
    if (nameInputPos > 0) {
      nameInputPos--;
      playTone(scene, 330, 0.05);
    }
  } else if (key === 'ArrowRight') {
    if (nameInputPos < 2) {
      nameInputPos++;
      playTone(scene, 330, 0.05);
    }
  } else if (key === 'Space' || key === 'Enter') {
    const name = currentName.join('');
    const finalTime = gameState.getElapsedTime().toFixed(1);
    addScore(name, finalTime);
    clearNameInput();
    playTone(scene, 880, 0.15);
    scene.cameras.main.shake(200, 0.01);

    // Show game over screen
    phaseManager.setPhase(GamePhase.GAME_OVER);
    transitionToGameOver(scene);
    showGameOverScreen(scene);
  }
}

function handleGameOverInput(scene, key) {
  if (key === 'Space' || key === 'Enter') {
    // Add extra delay to prevent accidental restarts
    if (phaseManager.getPhaseTime() > 500) {
      restartGame(scene);
    }
  }
}

// ==========================================
// AUDIO FUNCTIONS
// ==========================================

// Main drum loop function
function playDrumLoop(scene) {
  if (!drumLoopTimer) return;

  const pattern = parseDrumPattern(drumPatterns[currentPattern] || drumPatterns.intro);
  const synthPattern = parseDrumPattern(synthPatterns[currentPattern] || synthPatterns.intro);

  // Play current beat
  if (patternIndex < pattern.length) {
    const drum = pattern[patternIndex];

    if (drum === 'kick') {
      playKick(scene);
    } else if (drum === 'snare') {
      playSnare(scene);
    } else if (drum === 'hihat') {
      playHihat(scene);
    }
    // null/rest = silence

    patternIndex = (patternIndex + 1) % pattern.length;
  }

  // Play synth pattern
  if (synthPatternIndex < synthPattern.length) {
    const note = synthPattern[synthPatternIndex];
    if (note) {
      playSynth(scene, note);
    }
    synthPatternIndex = (synthPatternIndex + 1) % synthPattern.length;
  }

  // Calculate next beat timing based on current BPM
  const beatInterval = 60000 / (currentBPM * 2); // 8th notes (2 per beat)

  // Update current BPM to gradually approach target
  if (!isTransitioning) {
    currentBPM = currentBPM * BPM_SMOOTHING + targetBPM * (1 - BPM_SMOOTHING);
  }

  // Schedule next beat
  drumLoopTimer = scene.time.delayedCall(beatInterval, () => playDrumLoop(scene));
}

// Start drum loop with specified pattern
function startDrumLoop(scene, pattern = 'intro') {
  stopDrumLoop(scene);

  currentPattern = pattern;
  patternIndex = 0;
  synthPatternIndex = 0;

  // Reset BPM for new patterns
  if (pattern === 'intro' || pattern === 'gameOver') {
    targetBPM = baseBPM;
    currentBPM = baseBPM;
    playerMoves = [];
  }

  // Start the loop
  drumLoopTimer = scene.time.delayedCall(10, () => playDrumLoop(scene));
}

// Stop drum loop
function stopDrumLoop(scene) {
  if (drumLoopTimer) {
    scene.time.removeEvent(drumLoopTimer);
    drumLoopTimer = null;
  }
}

// Transition to game over (gradually slow down)
function transitionToGameOver(scene) {
  isTransitioning = true;
  currentPattern = 'gameOver';

  // Gradually slow down over 3 seconds
  const transitionSteps = 30;
  let step = 0;

  const slowDownTimer = scene.time.addEvent({
    delay: 100,
    callback: () => {
      step++;
      const progress = step / transitionSteps;
      currentBPM = currentBPM * 0.98 + baseBPM * 0.02;

      if (step >= transitionSteps) {
        isTransitioning = false;
        currentBPM = baseBPM;
        targetBPM = baseBPM;
      }
    },
    repeat: transitionSteps - 1
  });
}

// Add hihat sound
function playHihat(scene) {
  const ctx = scene.sound.context;

  // Create tone oscillator for punch
  const osc = ctx.createOscillator();
  osc.frequency.value = 10000;
  osc.type = 'square';

  // Create noise
  const noise = ctx.createBufferSource();
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  for (let i = 0; i < output.length; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  noise.buffer = noiseBuffer;

  const highpass = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const oscGain = ctx.createGain();

  // Simple highpass - less filtering means more volume
  highpass.type = 'highpass';
  highpass.frequency.value = 6000;

  // Tone for attack
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  oscGain.gain.setValueAtTime(0.4, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.01);

  // Noise body
  noise.connect(highpass);
  highpass.connect(gain);
  gain.connect(ctx.destination);

  // Punchy with good balance
  gain.gain.setValueAtTime(1.8, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.01);
  noise.start(ctx.currentTime);
}

// ==========================================
// UPDATE FUNCTION
// ==========================================
function update() {
  if (!gameState) return;

  // Draw animated grid
  drawAnimatedGrid();

  // Draw game blocks
  gameState.draw(graphics);

  // Update timer if playing
  if (phaseManager.getPhase() === GamePhase.PLAYING && !gameState.gameWon) {
    const elapsed = gameState.getElapsedTime();
    timerText.setText('Time: ' + elapsed.toFixed(1) + 's');

    // Color shifts over time
    if (elapsed > 30) {
      timerText.setColor('#ff006e');
    } else if (elapsed > 15) {
      timerText.setColor('#fbbf24');
    }
  }
}

// ==========================================
// GRAPHICS FUNCTIONS
// ==========================================
function drawAnimatedGrid() {
  gridLines.clear();
  const gridY = 420;
  const time = Date.now() / 50;

  // Color cycling
  const colorPhase = (Date.now() / 2000) % 1;
  const gridColor = colorPhase < 0.33 ? 0xff006e :
    colorPhase < 0.66 ? 0x00f5ff : 0x8338ec;

  // Floating shapes
  for (let i = 0; i < 7; i++) {
    const xPos = 50 + i * 110;
    const yFloat = 30 + Math.sin(time / 20 + i * 2) * 20;
    const rotation = (time / 30 + i) % (Math.PI * 2);
    const size = 15 + i * 4;

    gridLines.lineStyle(2, gridColor, 0.5);

    // Rotating diamond/square
    const x1 = xPos + Math.cos(rotation) * size;
    const y1 = yFloat + Math.sin(rotation) * size;
    const x2 = xPos + Math.cos(rotation + Math.PI / 2) * size;
    const y2 = yFloat + Math.sin(rotation + Math.PI / 2) * size;
    const x3 = xPos + Math.cos(rotation + Math.PI) * size;
    const y3 = yFloat + Math.sin(rotation + Math.PI) * size;
    const x4 = xPos + Math.cos(rotation + Math.PI * 1.5) * size;
    const y4 = yFloat + Math.sin(rotation + Math.PI * 1.5) * size;

    gridLines.beginPath();
    gridLines.moveTo(x1, y1);
    gridLines.lineTo(x2, y2);
    gridLines.lineTo(x3, y3);
    gridLines.lineTo(x4, y4);
    gridLines.closePath();
    gridLines.strokePath();
  }

  // Horizontal scan lines at top
  gridLines.lineStyle(1, gridColor, 0.15);
  for (let i = 0; i < 15; i++) {
    const y = i * 8 + (time % 8);
    gridLines.lineBetween(0, y, 800, y);
  }

  // Floating triangles
  for (let i = 0; i < 4; i++) {
    const xPos = 150 + i * 180;
    const yFloat = 80 + Math.cos(time / 25 + i * 3) * 25;
    const rotation = -(time / 40 + i * 1.5) % (Math.PI * 2);
    const size = 25;

    const altColor = i % 2 === 0 ? 0xfbbf24 : gridColor;
    gridLines.lineStyle(2, altColor, 0.4);

    const x1 = xPos + Math.cos(rotation) * size;
    const y1 = yFloat + Math.sin(rotation) * size;
    const x2 = xPos + Math.cos(rotation + Math.PI * 2 / 3) * size;
    const y2 = yFloat + Math.sin(rotation + Math.PI * 2 / 3) * size;
    const x3 = xPos + Math.cos(rotation + Math.PI * 4 / 3) * size;
    const y3 = yFloat + Math.sin(rotation + Math.PI * 4 / 3) * size;

    gridLines.beginPath();
    gridLines.moveTo(x1, y1);
    gridLines.lineTo(x2, y2);
    gridLines.lineTo(x3, y3);
    gridLines.closePath();
    gridLines.strokePath();
  }

  gridLines.lineStyle(2, gridColor, 0.4);

  // Horizontal lines receding with wave effect
  for (let i = 0; i < 10; i++) {
    const offset = (time + i * 20) % 200;
    const y = gridY + offset;
    const scale = 1 - offset / 400;

    // Add wave distortion
    const wave = Math.sin(time / 10 + i) * 15 * scale;
    const x1 = 400 - 350 * scale + wave;
    const x2 = 400 + 350 * scale + wave;

    if (scale > 0.1) {
      // Thickness and alpha based on distance
      const thickness = 1 + scale * 3;
      const alpha = 0.2 + scale * 0.4;
      gridLines.lineStyle(thickness, gridColor, alpha);
      gridLines.lineBetween(x1, y, x2, y);
    }
  }

  // Vertical lines
  gridLines.lineStyle(2, gridColor, 0.5);
  for (let i = -8; i <= 8; i++) {
    const x = 400 + i * 50;
    const glow = Math.sin(time / 15 + i) * 10;
    gridLines.lineBetween(x + glow, gridY, 400 + i * 20, gridY + 200);
  }
}

// ==========================================
// WIN GAME
// ==========================================
function winGame(scene) {
  const finalTime = gameState.getElapsedTime().toFixed(1);

  // Switch to victory drum pattern
  startDrumLoop(scene, 'win');

  // Victory effects
  scene.cameras.main.shake(3000, 0.025);

  // Victory sounds
  playTone(scene, 523, 0.1);
  setTimeout(() => playTone(scene, 659, 0.1), 80);
  setTimeout(() => playTone(scene, 784, 0.1), 160);
  setTimeout(() => playTone(scene, 1047, 0.15), 240);
  setTimeout(() => {
    playTone(scene, 1047, 0.3);
    playKick(scene);
  }, 400);
  setTimeout(() => {
    playTone(scene, 1319, 0.3);
    playSnare(scene);
  }, 550);
  setTimeout(() => {
    playTone(scene, 1568, 0.5);
    playKick(scene);
    playSnare(scene);
  }, 700);

  // Flash effect
  const flash = scene.add.graphics();
  flash.fillStyle(0xffffff, 1);
  flash.fillRect(0, 0, 800, 600);
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: 300,
    onComplete: () => flash.destroy()
  });

  // Overlay
  const overlay = scene.add.graphics();
  overlay.fillStyle(0x1a0a2e, 0.95);
  overlay.fillRect(0, 0, 800, 600);
  gameOverObjects.push(overlay);

  // Explosions
  const explosionPoints = [
    { x: 150, y: 300 }, { x: 650, y: 300 }
  ];

  explosionPoints.forEach((point, i) => {
    setTimeout(() => {
      const particles = scene.add.particles(point.x, point.y, 'particle', {
        speed: { min: 300, max: 600 },
        angle: { min: 0, max: 360 },
        scale: { start: 3, end: 0 },
        lifespan: 1500,
        quantity: 15,
        frequency: 50,
        tint: [0xff006e, 0x8338ec, 0x00f5ff, 0xfbbf24],
        blendMode: 'ADD',
        gravityY: 200
      });
      gameOverObjects.push(particles);
      playKick(scene);
      scene.cameras.main.shake(200, 0.015);
    }, i * 200);
  });

  // Win text
  const winText = scene.add.text(400, 180, 'SORTED!', {
    fontSize: '96px',
    fontFamily: 'Courier New, monospace',
    color: '#00f5ff',
    fontStyle: 'bold',
    stroke: '#ff006e',
    strokeThickness: 8
  }).setOrigin(0.5);
  gameOverObjects.push(winText);

  scene.tweens.add({
    targets: winText,
    scale: { from: 0.5, to: 1.1 },
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  // Time display
  const timeText = scene.add.text(400, 520, 'Time: ' + finalTime + 's', {
    fontSize: '40px',
    fontFamily: 'Courier New, monospace',
    color: '#fbbf24',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  gameOverObjects.push(timeText);

  // Check if high score
  setTimeout(() => {
    if (isHigh(finalTime)) {
      phaseManager.setPhase(GamePhase.NAME_INPUT);
      showNameInput(scene, finalTime);
    } else {
      phaseManager.setPhase(GamePhase.GAME_OVER);
      transitionToGameOver(scene);
      showGameOverScreen(scene);
    }
  }, 1500);
}

// ==========================================
// GAME OVER SCREEN
// ==========================================
function showGameOverScreen(scene) {
  // Clear any existing game over objects
  clearGameOverObjects();

  // Hide timer
  if (timerText) {
    timerText.setVisible(false);
  }

  // Dark overlay to cover game elements
  const overlay = scene.add.graphics();
  overlay.fillStyle(0x1a0a2e, 0.97);
  overlay.fillRect(0, 0, 800, 600);
  gameOverObjects.push(overlay);

  // Add some floating particles in the background
  const bgParticles = scene.add.particles(400, 300, 'particle', {
    x: { min: -400, max: 400 },
    y: { min: -300, max: 300 },
    scale: { start: 1.5, end: 0 },
    alpha: { start: 0.3, end: 0 },
    speed: 50,
    lifespan: 3000,
    quantity: 1,
    frequency: 300,
    tint: [0xff006e, 0x8338ec, 0x00f5ff],
    blendMode: 'ADD'
  });
  gameOverObjects.push(bgParticles);

  // "GAME COMPLETE" text with retro style
  const completeText = scene.add.text(400, 100, 'GAME COMPLETE', {
    fontSize: '48px',
    fontFamily: 'Courier New, monospace',
    color: '#fbbf24',
    fontStyle: 'bold',
    stroke: '#ff006e',
    strokeThickness: 4
  }).setOrigin(0.5);
  gameOverObjects.push(completeText);

  // Add shadow effect
  const completeShadow = scene.add.text(403, 103, 'GAME COMPLETE', {
    fontSize: '48px',
    fontFamily: 'Courier New, monospace',
    color: '#8338ec',
    fontStyle: 'bold',
    alpha: 0.5
  }).setOrigin(0.5);
  gameOverObjects.push(completeShadow);

  // Animate the complete text
  scene.tweens.add({
    targets: [completeText, completeShadow],
    scale: { from: 0.8, to: 1.05 },
    duration: 1500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  // Time display
  const finalTime = gameState.getElapsedTime().toFixed(1);
  const timeText = scene.add.text(400, 160, 'Time: ' + finalTime + 's', {
    fontSize: '32px',
    fontFamily: 'Courier New, monospace',
    color: '#00f5ff',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  gameOverObjects.push(timeText);

  // Show leaderboard with a nice frame - bigger scale
  const lbScale = 1.5;
  const lbFrame = scene.add.graphics();
  lbFrame.lineStyle(4, 0xff006e, 1);
  lbFrame.strokeRect(240, 220, 320, 200);

  // Add glowing effect to frame
  const lbFrameGlow = scene.add.graphics();
  lbFrameGlow.lineStyle(8, 0x00f5ff, 0.3);
  lbFrameGlow.strokeRect(236, 216, 328, 208);

  gameOverObjects.push(lbFrame);
  gameOverObjects.push(lbFrameGlow);

  // Animate frame glow
  scene.tweens.add({
    targets: lbFrameGlow,
    alpha: { from: 0.2, to: 0.6 },
    duration: 1000,
    yoyo: true,
    repeat: -1
  });

  const lbObjs = showLb(scene, 265, lbScale);
  if (lbObjs) {
    gameOverObjects = gameOverObjects.concat(lbObjs);
  }

  // Cool divider line
  const divider = scene.add.graphics();
  divider.lineStyle(3, 0x8338ec, 1);
  divider.lineBetween(200, 450, 600, 450);
  gameOverObjects.push(divider);

  // Decorative triangles
  const tri1 = scene.add.graphics();
  tri1.lineStyle(2, 0xfbbf24, 0.8);
  tri1.strokeTriangle(150, 480, 170, 510, 130, 510);
  gameOverObjects.push(tri1);

  const tri2 = scene.add.graphics();
  tri2.lineStyle(2, 0xfbbf24, 0.8);
  tri2.strokeTriangle(650, 480, 670, 510, 630, 510);
  gameOverObjects.push(tri2);

  // Rotating animation for triangles
  scene.tweens.add({
    targets: [tri1, tri2],
    rotation: Math.PI * 2,
    duration: 8000,
    repeat: -1
  });

  // "PLAY AGAIN?" text
  const readyText = scene.add.text(400, 490, 'PLAY AGAIN?', {
    fontSize: '28px',
    fontFamily: 'Courier New, monospace',
    color: '#00f5ff',
    fontStyle: 'bold italic',
    stroke: '#8338ec',
    strokeThickness: 3
  }).setOrigin(0.5);
  gameOverObjects.push(readyText);

  // Glitch effect on text
  scene.tweens.add({
    targets: readyText,
    x: { from: 398, to: 402 },
    duration: 100,
    yoyo: true,
    repeat: -1
  });

  // "PRESS SPACE TO PLAY" text
  const pressText = scene.add.text(400, 550, 'PRESS SPACE TO PLAY', {
    fontSize: '24px',
    fontFamily: 'Courier New, monospace',
    color: '#fbbf24',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  gameOverObjects.push(pressText);

  // Pulse text
  scene.tweens.add({
    targets: pressText,
    scale: { from: 1, to: 1.1 },
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  // Add some animated stars
  for (let i = 0; i < 5; i++) {
    const star = scene.add.text(
      100 + i * 150,
      100,
      '★',
      {
        fontSize: '24px',
        color: '#00f5ff'
      }
    );
    gameOverObjects.push(star);

    scene.tweens.add({
      targets: star,
      y: { from: 100, to: 120 },
      alpha: { from: 0.3, to: 1 },
      duration: 1000 + i * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    scene.tweens.add({
      targets: star,
      rotation: Math.PI * 2,
      duration: 3000 + i * 500,
      repeat: -1
    });
  }
}

function clearGameOverObjects() {
  gameOverObjects.forEach(obj => {
    if (obj && obj.destroy) obj.destroy();
  });
  gameOverObjects = [];
}

// ==========================================
// RESTART GAME
// ==========================================
function restartGame(scene) {
  // Clean up
  if (gameState) {
    gameState.cleanup();
  }
  if (nameInputActive) {
    clearNameInput();
  }
  clearGameOverObjects();

  // Stop drum loop
  stopDrumLoop(scene);

  // Reset music state
  currentBPM = baseBPM;
  targetBPM = baseBPM;
  playerMoves = [];
  patternIndex = 0;
  isTransitioning = false;

  // Reset phase manager
  phaseManager = new GameStateManager();

  // Restart scene
  scene.scene.restart();
}

function playTone(scene, freq, dur) {
  const ctx = scene.sound.context;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = freq;
  osc.type = 'square';

  // MAX VOLUME
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

function playKick(scene) {
  const ctx = scene.sound.context;

  // Main 808 bass
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  // Tight, punchy 808 - fast pitch drop
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.05);
  osc.type = 'sine';

  // Hard attack, quick decay
  gain.gain.setValueAtTime(1.0, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);

  // Original kick layer for extra punch
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc2.frequency.setValueAtTime(250, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
  osc2.type = 'sine';

  gain2.gain.setValueAtTime(0.4, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

  osc2.start(ctx.currentTime);
  osc2.stop(ctx.currentTime + 0.12);
}

function playSnare(scene) {
  const ctx = scene.sound.context;
  const noise = ctx.createBufferSource();
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  for (let i = 0; i < output.length; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  noise.buffer = noiseBuffer;
  const noiseGain = ctx.createGain();

  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  // MAX VOLUME
  noiseGain.gain.setValueAtTime(0.8, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  noise.start(ctx.currentTime);
}

function playSynth(scene, note) {
  const ctx = scene.sound.context;

  // Note frequencies (proper notation: NoteOctave)
  const noteFreqs = {
    'B3': 246.94,
    'C4': 261.63,
    'C#4': 277.18,
    'D4': 293.66,
    'D#4': 311.13,
    'E4': 329.63,
    'F4': 349.23,
    'F#4': 369.99,
    'G4': 392.00,
    'G#4': 415.30,
    'A4': 440.00,
    'A#4': 466.16,
    'B4': 493.88,
    'C5': 523.25,
    'D5': 587.33,
    'D#5': 622.25,
    'E5': 659.25,
    'F5': 698.46,
    'F#5': 739.99,
    'G5': 783.99,
    'A5': 880.00
  };

  const freq = noteFreqs[note];
  if (!freq) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = freq;
  osc.type = 'sine';  // Sine wave for smooth, dreamy vaporwave sound

  // Longer, sustained envelope for vaporwave feel
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.6);
}

