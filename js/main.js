import {
  updateCamera,
  getCameraX,
  resetCamera,
  getCameraCurrentSpeed,
} from "./camera.js";
import { player, setupInput, updatePlayer, resetPlayer, updatePlayerAnimation, preloadAstronautSheets, drawPlayer, keys } from "./player.js";
import {
  platforms,
  createInitialPlatform,
  generateNextPlatform,
  updateDisappearingPlatforms,
  updateMovingPlatforms,
  removeOffscreenPlatforms,
  clearPlatforms,
  tileImage,
  PLATFORM_TILES,
} from "./platforms.js";
import {
  drawSpaceBackground,
  drawStarfield,
  updateAndDrawPlanets,
  resetSpaceBackground,
} from "./spaceBackground.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let viewWidth = 0;
let viewHeight = 0;
let gameRunning = true;
let gameTime = 0;
let lastFrameTime = performance.now();

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
}

function draw() {
  const cameraX = getCameraX();
  const cameraY = 0;

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

    const tileConfig = PLATFORM_TILES.NORMAL;
    
    if (tileImage.complete) {
      ctx.drawImage(
        tileImage,
        tileConfig.x,
        tileConfig.y,
        tileConfig.width,
        tileConfig.height,
        platform.x,
        platform.y,
        platform.width,
        platform.height,
      );
    } else {
      ctx.fillStyle = platform.isMoving ? "#4ECDC4" : 
                     platform.isDisappearing ? "#FF6B6B" :
                     platform.isVerticalMoving ? "#FFB347" : "#8B4513";
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    ctx.strokeStyle = "#2C3E50";
    ctx.lineWidth = 2;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  drawPlayer(ctx, player, cameraX, cameraY);
}

preloadAstronautSheets();

function gameLoop() {
  const now = performance.now();
  const deltaTime = Math.min((now - lastFrameTime) / 1000, 0.1);
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

    const animInput = getAnimationInput();
    updatePlayerAnimation(player, animInput);
  }

  draw();
  ctx.imageSmoothingEnabled = false;
  requestAnimationFrame(gameLoop);
}

function getAnimationInput() {
  return {
    left: !!(keys["arrowleft"] || keys["a"]),
    right: !!(keys["arrowright"] || keys["d"]),
  };
}

respawn();
gameLoop();
