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

// Game State
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
  } catch (e) {}
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

// Global state
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

// Musical notes for movement melody - B is lowest
const moveNotes = [
  { freq: 247, dur: 0.15 },  // B (lowest note) - beat 1
  { freq: 370, dur: 0.15 },  // F# - beat 2 (SNARE)
  { freq: 370, dur: 0.15 },  // F#
  { freq: 330, dur: 0.15 },  // E - beat 4 (KICK)
  { freq: 294, dur: 0.15 },  // D
  { freq: 277, dur: 0.15 },  // C# - beat 2 (SNARE)
  { freq: 277, dur: 0.15 },  // C#
  { freq: 294, dur: 0.15 },  // D - beat 4 (KICK)
  { freq: 247, dur: 0.15 },  // B
  { freq: 494, dur: 0.15 },  // B (1 octave higher) - beat 2 (SNARE)
  { freq: 440, dur: 0.15 },  // A
  { freq: 247, dur: 0.15 },  // B - beat 4 (KICK)
  { freq: 294, dur: 0.15 },  // D
  // Repeat until double C#
  { freq: 247, dur: 0.15 },  // B
  { freq: 370, dur: 0.15 },  // F# - beat 4 (KICK)
  { freq: 370, dur: 0.15 },  // F#
  { freq: 330, dur: 0.15 },  // E - beat 2 (SNARE)
  { freq: 294, dur: 0.15 },  // D
  { freq: 277, dur: 0.15 },  // C# - beat 4 (KICK)
  { freq: 277, dur: 0.15 },  // C#
  // Then B F#
  { freq: 247, dur: 0.15 },  // B - beat 2 (SNARE)
  { freq: 370, dur: 0.15 }   // F# - beat 4 (KICK)
];
let currentNoteIndex = 0;
let beatCount = 0;

// Adaptive BPM tracking - simplified
let lastMoveTime = 0;
let smoothedInterval = 500; // Start at 500ms between moves (120 BPM)
const SMOOTHING = 0.8; // Higher = more smoothing (0-1)

// Display leaderboard - VERTICAL
function showLb(scene, startY) {
  const lb = getLb();
  if (lb.length === 0) return null;

  const objects = [];

  // Title
  const title = scene.add.text(400, startY, 'TOP SCORES', {
    fontSize: '18px',
    fontFamily: 'Courier New, monospace',
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  objects.push(title);

  // Add solid background for better visibility - more compact
  const bgHeight = 25 + lb.length * 22;
  const bg = scene.add.graphics();
  bg.fillStyle(0x2d1b4e, 1);
  bg.fillRect(320, startY - 15, 160, bgHeight);
  bg.lineStyle(3, 0xff006e, 1);
  bg.strokeRect(320, startY - 15, 160, bgHeight);

  // Draw title AFTER background so it's on top
  title.setDepth(10);

  objects.push(bg);

  // Each score on its own line - more compact
  const colors = ['#ff006e', '#fbbf24', '#00f5ff'];
  lb.forEach((s, i) => {
    const y = startY + 22 + i * 22;
    const txt = (i + 1) + '. ' + s.n + '  ' + s.t.toFixed(1) + 's';
    const scoreText = scene.add.text(400, y, txt, {
      fontSize: '16px',
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

function create() {
  const scene = this;

  // Create particle texture
  const particleGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
  particleGraphics.fillStyle(0xffffff, 1);
  particleGraphics.fillRect(0, 0, 4, 4);
  particleGraphics.generateTexture('particle', 4, 4);
  particleGraphics.destroy();

  // Retro grid background
  gridLines = scene.add.graphics();

  graphics = scene.add.graphics();

  // HUGE vaporwave title (will hide on first input)
  titleText = scene.add.text(400, 180, 'sortEm', {
    fontSize: '120px',
    fontFamily: 'Courier New, monospace',
    color: '#ff006e',
    fontStyle: 'bold',
    stroke: '#00f5ff',
    strokeThickness: 8
  }).setOrigin(0.5);

  // Add vaporwave shadow layers
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

  // Subtitle - ARCADE EDITION (slanted and overlapping)
  subtitleText = scene.add.text(480, 230, 'ARCADE EDITION', {
    fontSize: '32px',
    fontFamily: 'Courier New, monospace',
    color: '#fbbf24',
    fontStyle: 'bold italic',
    stroke: '#ff006e',
    strokeThickness: 3,
    letterSpacing: 6
  }).setOrigin(0.5).setRotation(-0.15).setDepth(100);

  // Pulsing glow effect on title
  scene.tweens.add({
    targets: titleText,
    scale: { from: 1, to: 1.05 },
    duration: 1500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  // Subtle glow on subtitle
  scene.tweens.add({
    targets: subtitleText,
    alpha: { from: 0.9, to: 1 },
    duration: 1000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  // Instructions - compact (will hide on first input)
  instructionsText = scene.add.text(400, 120, 'Arrows: Select • Space: Grab/Drop • Move: Left/Right', {
    fontSize: '16px',
    fontFamily: 'Courier New, monospace',
    color: '#8338ec'
  }).setOrigin(0.5);

  // Credit - retro arcade style signature (different from game style)
  const creditText = scene.add.text(400, 575, '< v4rgas >', {
    fontSize: '16px',
    fontFamily: 'Arial',
    color: '#00ff00',
    fontStyle: 'italic',
    stroke: '#003300',
    strokeThickness: 3
  }).setOrigin(0.5);

  // Glitch effect on signature
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

  // Show leaderboard at bottom (will hide on first input)
  leaderboardText = showLb(scene, 480);

  // Timer - hidden initially, shown after first input - HUGE AND PROMINENT
  timerText = scene.add.text(400, 80, 'Time: 0.0s', {
    fontSize: '56px',
    fontFamily: 'Courier New, monospace',
    color: '#00f5ff',
    fontStyle: 'bold',
    stroke: '#ff006e',
    strokeThickness: 6
  }).setOrigin(0.5);
  timerText.setVisible(false);

  // Add pulsing glow effect to timer
  scene.tweens.add({
    targets: timerText,
    scale: { from: 1, to: 1.08 },
    duration: 800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  // Initialize game - STARTS IMMEDIATELY!
  gameState = new GameState(scene);
  gameState.generateNumbers();

  // Keyboard input
  scene.input.keyboard.on('keydown', (event) => {
    const key = event.code;

    // Name input mode
    if (nameInputActive) {
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

        // Show updated leaderboard and restart prompt
        setTimeout(() => {
          const lbObjs = showLb(scene, 300);

          const restartText = scene.add.text(400, 570, 'Press SPACE to Play Again', {
            fontSize: '20px',
            fontFamily: 'Courier New, monospace',
            color: '#00f5ff',
            fontStyle: 'bold'
          }).setOrigin(0.5);

          scene.tweens.add({
            targets: restartText,
            alpha: { from: 1, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1
          });
        }, 100);
      }
      return;
    }

    // Hide title and instructions on first input, show timer, START TIMER
    if (titleText && titleText.active) {
      titleText.destroy();
      titleShadow1.destroy();
      titleShadow2.destroy();
      subtitleText.destroy();
      instructionsText.destroy();
      if (leaderboardText) {
        leaderboardText.forEach(obj => obj.destroy());
      }
      titleText = null;
      titleShadow1 = null;
      titleShadow2 = null;
      subtitleText = null;
      instructionsText = null;
      leaderboardText = null;
      timerText.setVisible(true);

      // Start the timer on first input!
      if (!gameState.startTime) {
        gameState.startTime = Date.now();
      }
    }

    if (gameState.gameWon) {
      if (key === 'Space' || key === 'Enter') {
        restartGame(scene);
      }
      return;
    }

    if (!gameState.isGrabbed) {
      if ((key === 'ArrowLeft' || key === 'KeyA') && gameState.selectPrevious()) {
        playMelodyNote(scene);
      } else if ((key === 'ArrowRight' || key === 'KeyD') && gameState.selectNext()) {
        playMelodyNote(scene);
      } else if (key === 'Space') {
        gameState.grab();
        playTone(scene, 660, 0.08);
      }
    } else {
      if ((key === 'ArrowLeft' || key === 'KeyA') && gameState.moveLeft()) {
        playMelodyNote(scene);
      } else if ((key === 'ArrowRight' || key === 'KeyD') && gameState.moveRight()) {
        playMelodyNote(scene);
      } else if (key === 'Space') {
        const won = gameState.drop();
        playTone(scene, 880, 0.12);
        if (won) {
          winGame(scene);
        }
      }
    }
  });

  // Start continuous amen break loop
  startAmenLoop(scene);
}

function startAmenLoop(scene) {
  // Simple recursive loop that adapts automatically
  function loopDrums() {
    if (!gameState.gameWon) {
      playAmenBreak(scene, 0);
      // Schedule next loop based on current smoothedInterval * 4 (one bar = 4 moves)
      scene.time.delayedCall(smoothedInterval * 4, loopDrums);
    }
  }
  loopDrums();
}

function update() {
  if (!gameState) return;

  // CRAZY VAPORWAVE ANIMATED GRID
  gridLines.clear();
  const gridY = 420;
  const time = Date.now() / 50;

  // Color cycling through vaporwave palette
  const colorPhase = (Date.now() / 2000) % 1;
  const gridColor = colorPhase < 0.33 ? 0xff006e :
                    colorPhase < 0.66 ? 0x00f5ff : 0x8338ec;

  // CRAZY top section - more vaporwave chaos

  // Floating geometric shapes
  for (let i = 0; i < 7; i++) {
    const xPos = 50 + i * 110;
    const yFloat = 30 + Math.sin(time / 20 + i * 2) * 20;
    const rotation = (time / 30 + i) % (Math.PI * 2);
    const size = 15 + i * 4;

    gridLines.lineStyle(2, gridColor, 0.5);

    // Rotating diamond/square
    const x1 = xPos + Math.cos(rotation) * size;
    const y1 = yFloat + Math.sin(rotation) * size;
    const x2 = xPos + Math.cos(rotation + Math.PI/2) * size;
    const y2 = yFloat + Math.sin(rotation + Math.PI/2) * size;
    const x3 = xPos + Math.cos(rotation + Math.PI) * size;
    const y3 = yFloat + Math.sin(rotation + Math.PI) * size;
    const x4 = xPos + Math.cos(rotation + Math.PI*1.5) * size;
    const y4 = yFloat + Math.sin(rotation + Math.PI*1.5) * size;

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
    const x2 = xPos + Math.cos(rotation + Math.PI * 2/3) * size;
    const y2 = yFloat + Math.sin(rotation + Math.PI * 2/3) * size;
    const x3 = xPos + Math.cos(rotation + Math.PI * 4/3) * size;
    const y3 = yFloat + Math.sin(rotation + Math.PI * 4/3) * size;

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

  // Vertical lines with glow
  gridLines.lineStyle(2, gridColor, 0.5);
  for (let i = -8; i <= 8; i++) {
    const x = 400 + i * 50;
    const glow = Math.sin(time / 15 + i) * 10;
    gridLines.lineBetween(x + glow, gridY, 400 + i * 20, gridY + 200);
  }

  gameState.draw(graphics);

  if (!gameState.gameWon) {
    const elapsed = gameState.getElapsedTime();
    timerText.setText('Time: ' + elapsed.toFixed(1) + 's');

    // Color shifts as time goes
    if (elapsed > 30) {
      timerText.setColor('#ff006e');
    } else if (elapsed > 15) {
      timerText.setColor('#fbbf24');
    }
  }
}

function winGame(scene) {
  const finalTime = gameState.getElapsedTime().toFixed(1);

  // MASSIVE WIN SHAKE - longer and more intense
  scene.cameras.main.shake(3000, 0.025);

  // Victory sound cascade - more notes, more dramatic
  playTone(scene, 523, 0.1);  // C
  setTimeout(() => playTone(scene, 659, 0.1), 80);  // E
  setTimeout(() => playTone(scene, 784, 0.1), 160); // G
  setTimeout(() => playTone(scene, 1047, 0.15), 240); // C high
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

  // Darker overlay so text is readable
  const overlay = scene.add.graphics();
  overlay.fillStyle(0x1a0a2e, 0.95);
  overlay.fillRect(0, 0, 800, 600);

  // Just 2 big explosions from sides
  const explosionPoints = [
    {x: 150, y: 300}, {x: 650, y: 300}
  ];

  explosionPoints.forEach((point, i) => {
    setTimeout(() => {
      scene.add.particles(point.x, point.y, 'particle', {
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
      playKick(scene);
      scene.cameras.main.shake(200, 0.015);
    }, i * 200);
  });

  // Win text - pixel style (moved up)
  const winText = scene.add.text(400, 180, 'SORTED!', {
    fontSize: '96px',
    fontFamily: 'Courier New, monospace',
    color: '#00f5ff',
    fontStyle: 'bold',
    stroke: '#ff006e',
    strokeThickness: 8
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: winText,
    scale: { from: 0.5, to: 1.1 },
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  // Time display (moved down)
  const timeText = scene.add.text(400, 520, 'Time: ' + finalTime + 's', {
    fontSize: '40px',
    fontFamily: 'Courier New, monospace',
    color: '#fbbf24',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  // Check if high score
  setTimeout(() => {
    if (isHigh(finalTime)) {
      // Show name input
      showNameInput(scene, finalTime);
    } else {
      // Just show leaderboard (in the middle)
      const lbObjs = showLb(scene, 300);

      // Restart prompt
      const restartText = scene.add.text(400, 570, 'Press SPACE to Play Again', {
        fontSize: '20px',
        fontFamily: 'Courier New, monospace',
        color: '#00f5ff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      scene.tweens.add({
        targets: restartText,
        alpha: { from: 1, to: 0.3 },
        duration: 800,
        yoyo: true,
        repeat: -1
      });
    }
  }, 800);
}

function restartGame(scene) {
  if (gameState) {
    gameState.cleanup();
  }
  // Reset name input state
  if (nameInputActive) {
    clearNameInput();
  }
  // Reset BPM tracking
  lastMoveTime = 0;
  smoothedInterval = 500;
  currentNoteIndex = 0;

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

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

function playKick(scene) {
  const ctx = scene.sound.context;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
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

  noiseGain.gain.setValueAtTime(0.35, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  noise.start(ctx.currentTime);
}

function playMelodyNote(scene) {
  const note = moveNotes[currentNoteIndex];
  playTone(scene, note.freq, note.dur);
  currentNoteIndex = (currentNoteIndex + 1) % moveNotes.length;

  // Simple exponential smoothing for player rhythm
  const now = Date.now();
  if (lastMoveTime > 0) {
    const interval = now - lastMoveTime;
    // Only update if interval is reasonable (100ms to 1500ms)
    if (interval >= 100 && interval <= 1500) {
      smoothedInterval = (SMOOTHING * smoothedInterval) + ((1 - SMOOTHING) * interval);
    }
  }
  lastMoveTime = now;
}

function playAmenBreak(scene, startTime) {
  // Simple drum pattern - uses smoothedInterval directly
  // Each 16th note is smoothedInterval / 4
  const sixteenth = smoothedInterval / 4000; // Convert ms to seconds, divide by 4
  const amenPattern = [
    { t: 0 * sixteenth, type: 'kick' },   // 1
    { t: 2 * sixteenth, type: 'kick' },   // 1+
    { t: 4 * sixteenth, type: 'snare' },  // 2
    { t: 6 * sixteenth, type: 'kick' },   // 2+
    { t: 8 * sixteenth, type: 'kick' },   // 3
    { t: 10 * sixteenth, type: 'snare' }, // 3+
    { t: 12 * sixteenth, type: 'snare' }, // 4
    { t: 14 * sixteenth, type: 'kick' }   // 4+
  ];

  amenPattern.forEach(hit => {
    scene.time.delayedCall((startTime + hit.t) * 1000, () => {
      if (hit.type === 'kick') {
        playKick(scene);
      } else {
        playSnare(scene);
      }
    });
  });
}

function playFullMelody(scene, withAmen = false) {
  moveNotes.forEach((note, idx) => {
    scene.time.delayedCall(idx * 150, () => {
      playTone(scene, note.freq, note.dur);
    });
  });

  if (withAmen) {
    // Loop amen break throughout the melody
    const melodyDuration = moveNotes.length * 0.15;
    const amenLoops = Math.ceil(melodyDuration / 2);
    for (let i = 0; i < amenLoops; i++) {
      playAmenBreak(scene, i * 2);
    }
  }
}
