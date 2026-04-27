import {
  updateCamera,
  getCameraX,
  resetCamera,
  getCameraCurrentSpeed,
} from "./camera.js";
import { player, setupInput, updatePlayer, resetPlayer } from "./player.js";
import {
  platforms,
  createInitialPlatform,
  generateNextPlatform,
  updateDisappearingPlatforms,
  updateMovingPlatforms,
  removeOffscreenPlatforms,
  clearPlatforms,
  tileImage,
} from "./platforms.js";
import {
  drawSpaceBackground,
  drawStarfield,
  updateAndDrawPlanets,
  resetSpaceBackground,
} from "./spaceBackground.js";
import {
  updatePlayerAnimation,
  preloadAstronautSheets,
  drawPlayer,
} from "./player.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("scoreValue");
const highScoreElement = document.getElementById("highScoreValue");

let viewWidth = 0;
let viewHeight = 0;
let gameRunning = true;
let gameTime = 0;
let lastFrameTime = performance.now();
let score = 0;
let lastPlayerX = 0;
let highScore = 0;

// Export score for other modules
export { score };

function updateScore() {
  const currentPlayerX = player.x;
  const distance = currentPlayerX - lastPlayerX;
  if (distance > 0) {
    score += distance / 50;
    if (scoreElement) {
      scoreElement.textContent = Math.floor(score);
    }
    lastPlayerX = currentPlayerX;
    
    // Update high score
    if (score > highScore) {
      highScore = score;
      if (highScoreElement) {
        highScoreElement.textContent = Math.floor(highScore);
      }
      // Save to localStorage
      localStorage.setItem('platformerHighScore', Math.floor(highScore));
    }
  }
}

function loadHighScore() {
  const saved = localStorage.getItem('platformerHighScore');
  if (saved && highScoreElement) {
    highScore = parseInt(saved);
    highScoreElement.textContent = highScore;
  }
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;
  canvas.width = Math.floor(viewWidth * dpr);
  canvas.height = Math.floor(viewHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

setupInput();

function respawn() {
  clearPlatforms();
  createInitialPlatform(viewHeight, gameTime);
  generateNextPlatform(viewHeight, viewWidth, gameTime, player);
  generateNextPlatform(viewHeight, viewWidth, gameTime, player);
  generateNextPlatform(viewHeight, viewWidth, gameTime, player);
  const respawnPlatform = platforms[0];
  resetPlayer(respawnPlatform);
  resetCamera();
  lastFrameTime = performance.now();
  resetSpaceBackground();
  
  score = 0;
  lastPlayerX = player.x;
  if (scoreElement) {
    scoreElement.textContent = score;
  }
  if (highScoreElement) {
    highScoreElement.textContent = Math.floor(highScore);
  }
}

function draw() {
  const cameraX = getCameraX();

  drawSpaceBackground(ctx, cameraX, viewWidth, viewHeight);
  drawStarfield(ctx, cameraX, viewWidth, viewHeight);
  updateAndDrawPlanets(ctx, cameraX, viewWidth, viewHeight);

  ctx.save();
  ctx.translate(-cameraX, 0);

  for (const platform of platforms) {
    if (platform.isDisappearing && platform.hasLanded) {
      const now = Date.now();
      const fadeProgress = Math.min(1, (now - platform.landTime) / 1000);
      ctx.globalAlpha = 1 - fadeProgress * 0.7;
    }

    // Draw tile image stretched to fit platform
    if (tileImage.complete) {
      ctx.drawImage(
        tileImage,
        platform.x,
        platform.y,
        platform.width,
        platform.height,
      );
    } else {
      // Fallback while image loads
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    ctx.strokeStyle = "#2C3E50";
    ctx.lineWidth = 2;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);

    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// Hide legacy DOM player once (if it exists)
const legacyPlayerEl = document.querySelector("#player, .player, .character, .hero");
if (legacyPlayerEl) legacyPlayerEl.style.display = "none";

preloadAstronautSheets();
loadHighScore();

function gameLoop() {
  const now = performance.now();
  const deltaTime = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  if (gameRunning) {
    gameTime += deltaTime;

    updateMovingPlatforms(deltaTime, player);
    updateDisappearingPlatforms(player);

    const died = updatePlayer(deltaTime, platforms, viewHeight);
    if (died) {
      respawn();
    } else {
      updateCamera(deltaTime, player.hasJumped, player.x, viewWidth);
      updateScore();

      const rightmostPlatform = platforms[platforms.length - 1];
      const generationBuffer = Math.max(500, getCameraCurrentSpeed() * 2);
      if (
        rightmostPlatform.x + rightmostPlatform.width <
        getCameraX() + viewWidth + generationBuffer
      ) {
        generateNextPlatform(viewHeight, viewWidth, gameTime, player);
      }

      removeOffscreenPlatforms(getCameraX());
    }
  }

  draw();
  // keep pixel-art crisp
  ctx.imageSmoothingEnabled = false;

  // physics/input update already happens once per tick
  // ...existing player update code...

  // frame-based animation update (exactly once per game tick)
  const animInput = getAnimationInput();
  updatePlayerAnimation(player, animInput);

  // Get camera position for drawing
  const cameraX = getCameraX();
  const cameraY = 0;

  // Ensure canvas player draw is used
  drawPlayer(ctx, player, cameraX, cameraY);

  requestAnimationFrame(gameLoop);
}

function getAnimationInput() {
  const src =
    (typeof keys !== "undefined" && keys) ||
    (typeof keyState !== "undefined" && keyState) ||
    (typeof inputState !== "undefined" && inputState) ||
    {};

  return {
    left: !!(src.ArrowLeft || src.KeyA || src.a || src.left),
    right: !!(src.ArrowRight || src.KeyD || src.d || src.right),
  };
}

respawn();
gameLoop();
