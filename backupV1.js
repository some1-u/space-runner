const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let viewWidth = 0;
let viewHeight = 0;

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

let gameRunning = true;

const player = {
  x: 100,
  y: 300,
  width: 40,
  height: 40,
  velocityX: 0,
  velocityY: 0,
  speed: 5,
  jumpPower: -13.4,
  gravity: 0.8,
  onGround: false,
  onMovingPlatform: null,
  color: "#FF6B6B",
};

const platforms = [];
const platformHeight = 20;

let gameTime = 0;

function getPlatformWidth() {
  const roll = Math.random();
  const difficultyProgress = Math.min(1, gameTime / 180);
  const narrowWeight = 0.2 + difficultyProgress * 0.3;
  const mediumWeight = 0.6 - difficultyProgress * 0.2;
  const wideWeight = 0.2 - difficultyProgress * 0.1;
  const totalWeight = narrowWeight + mediumWeight + wideWeight;
  const normalizedNarrow = narrowWeight / totalWeight;
  const normalizedMedium = mediumWeight / totalWeight;

  if (roll < normalizedNarrow) {
    return Math.floor(80 + Math.random() * 40);
  } else if (roll < normalizedNarrow + normalizedMedium) {
    return Math.floor(120 + Math.random() * 40);
  } else {
    return Math.floor(160 + Math.random() * 40);
  }
}

function shouldSpawnDisappearingPlatform() {
  const lastPlatform = platforms[platforms.length - 1];
  if (lastPlatform && lastPlatform.isMoving) return false;

  const difficultyProgress = Math.min(1, gameTime / 180);
  const spawnChance = 0.1 + (0.25 - 0.1) * difficultyProgress;

  return Math.random() < spawnChance;
}

function shouldSpawnMovingPlatform() {
  const lastPlatform = platforms[platforms.length - 1];
  if (
    lastPlatform &&
    (lastPlatform.isDisappearing || lastPlatform.isVerticalMoving)
  )
    return false;

  let platformsSinceLastMoving = 0;
  for (let i = platforms.length - 1; i >= 0; i--) {
    if (platforms[i].isMoving || platforms[i].isVerticalMoving) break;
    platformsSinceLastMoving++;
  }

  if (platformsSinceLastMoving < 3) return false;

  const difficultyProgress = Math.min(1, gameTime / 180);
  const spawnChance = 0.08 + (0.2 - 0.08) * difficultyProgress;

  return Math.random() < spawnChance;
}

function shouldSpawnVerticalMovingPlatform() {
  const lastPlatform = platforms[platforms.length - 1];
  if (
    lastPlatform &&
    (lastPlatform.isDisappearing ||
      lastPlatform.isMoving ||
      lastPlatform.isVerticalMoving)
  )
    return false;

  let platformsSinceLastVerticalMoving = 0;
  for (let i = platforms.length - 1; i >= 0; i--) {
    if (platforms[i].isVerticalMoving) break;
    platformsSinceLastVerticalMoving++;
  }

  if (platformsSinceLastVerticalMoving < 3) return false;

  const difficultyProgress = Math.min(1, gameTime / 180);
  const spawnChance = 0.07 + (0.15 - 0.07) * difficultyProgress;

  return Math.random() < spawnChance;
}

function updateDisappearingPlatforms() {
  const now = Date.now();

  for (let i = platforms.length - 1; i >= 0; i--) {
    const platform = platforms[i];
    if (!platform.isDisappearing || !platform.hasLanded) continue;

    if (now - platform.landTime >= 1000) {
      if (player.onMovingPlatform === platform) {
        player.onMovingPlatform = null;
        player.onGround = false;
      }
      platforms.splice(i, 1);
    }
  }
}

function updateMovingPlatforms(deltaTime) {
  for (let i = platforms.length - 1; i >= 0; i--) {
    const platform = platforms[i];
    if (!platform.isMoving && !platform.isVerticalMoving) continue;

    if (platform.isMoving) {
      const previousX = platform.x;

      if (platform.phase === "extending") {
        const newX = platform.x + platform.speed;
        if (newX >= platform.targetX) {
          platform.x = platform.targetX;
          platform.phase = "returning";
        } else {
          platform.x = newX;
        }
      } else {
        const newX = platform.x - platform.speed;
        if (newX <= platform.startingX) {
          platform.x = platform.startingX;
          platform.phase = "extending";
        } else {
          platform.x = newX;
        }
      }

      platform.deltaX = platform.x - previousX;

      if (
        player.onMovingPlatform === platform &&
        (platform.x < -1000 || platform.x > 10000)
      ) {
        player.onMovingPlatform = null;
        player.onGround = false;
      }
    }

    if (platform.isVerticalMoving) {
      const previousY = platform.y;

      if (platform.direction === "down") {
        const newY = platform.y + platform.speed;
        if (newY >= platform.startingY + platform.movementRange) {
          platform.y = platform.startingY + platform.movementRange;
          platform.direction = "up";
        } else {
          platform.y = newY;
        }
      } else {
        const newY = platform.y - platform.speed;
        if (newY <= platform.startingY - platform.movementRange) {
          platform.y = platform.startingY - platform.movementRange;
          platform.direction = "down";
        } else {
          platform.y = newY;
        }
      }

      platform.deltaY = platform.y - previousY;

      if (
        player.onMovingPlatform === platform &&
        (platform.y < -1000 || platform.y > 10000)
      ) {
        player.onMovingPlatform = null;
        player.onGround = false;
      }
    }
  }
}

const JUMP_VX_MIN = 2;
const MIN_GAP = 60;
const MAX_GAP = 140;
const MAX_VERTICAL_INCREASE = 85;
const MAX_VERTICAL_DECREASE = 450;
const DIFFICULTY = [
  { weight: 0.5, name: "medium", gapFrac: [0.55, 0.9] },
  { weight: 0.5, name: "hard", gapFrac: [0.8, 1] },
];
const PLATFORM_Y_MIN = 80;
const PLATFORM_Y_MAX_FRAC = 0.85;
const MIN_HEIGHT_INCREASE = 80;
const MIN_VERTICAL_STEP = 60;

const VERTICAL_MOVING_SPEED = 1.5;
const VERTICAL_MOVING_RANGE = 75;

let cameraX = 0;
const CAMERA_BASE_SPEED = 10;
const CAMERA_MAX_SPEED = 180;
const CAMERA_ACCELERATION = 10;
let cameraCurrentSpeed = 0;
let lastFrameTime = performance.now();
let hasJumped = false;

const keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === "ArrowUp" || e.key === " ") {
    e.preventDefault();
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function createInitialPlatform() {
  platforms.push({
    x: 0,
    y: viewHeight - 100,
    width: getPlatformWidth(),
    height: platformHeight,
    color: "#4ECDC4",
  });
}

function getReachableHorizontalRange(dy) {
  const g = player.gravity;
  const vy = player.jumpPower;
  const vxMax = player.speed;
  const radicand = vy * vy + 2 * g * dy;
  if (radicand < 0) {
    return { min: MIN_GAP, max: MIN_GAP };
  }
  const sqrtR = Math.sqrt(radicand);
  const k = (-vy + sqrtR) / g;
  const kUp = (-vy - sqrtR) / g;
  let dMin, dMax;
  if (dy >= 0) {
    dMin = JUMP_VX_MIN * k;
    dMax = vxMax * k;
  } else {
    dMin = JUMP_VX_MIN * kUp;
    dMax = vxMax * kUp;
  }
  dMin = Math.max(MIN_GAP, dMin);
  dMax = Math.max(MIN_GAP, dMax);
  return { min: dMin, max: dMax };
}

function generateNextPlatform() {
  const lastPlatform = platforms[platforms.length - 1];
  const yMin = PLATFORM_Y_MIN;
  let yMax = Math.min(
    viewHeight - platformHeight - 50,
    viewHeight * PLATFORM_Y_MAX_FRAC,
  );
  if (yMax <= yMin || !Number.isFinite(yMax)) {
    yMax = Math.max(yMin + 200, (viewHeight || 600) - platformHeight - 50);
  }

  let reachableYMin = Math.max(yMin, lastPlatform.y - MAX_VERTICAL_INCREASE);
  let reachableYMax = Math.min(yMax, lastPlatform.y + MAX_VERTICAL_DECREASE);

  // For vertical moving platforms, expand the reachable range to account for movement
  if (lastPlatform.isVerticalMoving) {
    reachableYMin = Math.max(yMin, reachableYMin - VERTICAL_MOVING_RANGE);
    reachableYMax = Math.min(yMax, reachableYMax + VERTICAL_MOVING_RANGE);
  }

  const bandAbove = [
    reachableYMin,
    Math.min(reachableYMax, lastPlatform.y - MIN_HEIGHT_INCREASE),
  ];
  const bandBelow = [
    Math.max(reachableYMin, lastPlatform.y + MIN_VERTICAL_STEP),
    reachableYMax,
  ];
  const canGoHigher = bandAbove[1] >= bandAbove[0];
  const canGoLower = bandBelow[1] >= bandBelow[0];

  let nextY, dy, range;

  if (canGoHigher && canGoLower) {
    if (Math.random() < 0.65) {
      nextY = bandAbove[0] + Math.random() * (bandAbove[1] - bandAbove[0]);
    } else {
      nextY = bandBelow[0] + Math.random() * (bandBelow[1] - bandBelow[0]);
    }
    dy = nextY - lastPlatform.y;
    range = getReachableHorizontalRange(dy);
  } else if (canGoHigher) {
    nextY = bandAbove[0] + Math.random() * (bandAbove[1] - bandAbove[0]);
    dy = nextY - lastPlatform.y;
    range = getReachableHorizontalRange(dy);
  } else if (canGoLower) {
    nextY = bandBelow[0] + Math.random() * (bandBelow[1] - bandBelow[0]);
    dy = nextY - lastPlatform.y;
    range = getReachableHorizontalRange(dy);
  } else {
    dy =
      Math.random() < 0.5
        ? -Math.min(MIN_HEIGHT_INCREASE, MAX_VERTICAL_INCREASE)
        : Math.min(MIN_VERTICAL_STEP, 100);
    nextY = lastPlatform.y + dy;
    nextY = Math.max(yMin, Math.min(nextY, yMax));
    dy = nextY - lastPlatform.y;
    range = getReachableHorizontalRange(dy);
  }

  if (range.max <= range.min) {
    nextY =
      lastPlatform.y +
      (Math.random() < 0.5 ? -MIN_HEIGHT_INCREASE : MIN_VERTICAL_STEP);
    nextY = Math.max(reachableYMin, Math.min(nextY, reachableYMax));
    dy = nextY - lastPlatform.y;
    range = getReachableHorizontalRange(dy);
  }

  range.min = Math.max(MIN_GAP, range.min);
  range.max = Math.min(MAX_GAP, range.max);
  if (range.max <= range.min) range.max = range.min + 10;

  const r = Math.random();
  const diff = r < 0.5 ? DIFFICULTY[0] : DIFFICULTY[1];
  const span = range.max - range.min;
  const gapMin = range.min + span * diff.gapFrac[0];
  const gapMax = range.min + span * diff.gapFrac[1];
  const gap = Math.max(
    MIN_GAP,
    Math.min(MAX_GAP, gapMin + Math.random() * (gapMax - gapMin)),
  );
  let nextX = lastPlatform.x + lastPlatform.width + gap;

  if (lastPlatform.isMoving) {
    const maxExtensionX = Math.max(lastPlatform.x, lastPlatform.targetX);
    nextX = maxExtensionX + lastPlatform.width + gap;
  }

  const isDisappearing = shouldSpawnDisappearingPlatform();
  const isMoving = !isDisappearing && shouldSpawnMovingPlatform();
  const isVerticalMoving =
    !isDisappearing && !isMoving && shouldSpawnVerticalMovingPlatform();

  const platform = {
    x: nextX,
    y: nextY,
    width: getPlatformWidth(),
    height: platformHeight,
    color: isMoving
      ? "#4ECDC4"
      : isVerticalMoving
        ? "#FFB347"
        : `hsl(${Math.random() * 60 + 180}, 70%, 60%)`,
    isDisappearing: isDisappearing,
    isMoving: isMoving,
    isVerticalMoving: isVerticalMoving,
    hasLanded: false,
    landTime: 0,
  };

  if (isMoving) {
    platform.startingX = nextX;
    platform.targetX = nextX + 150;
    platform.speed = 1.5 + (Math.random() - 0.5) * 0.5;
    platform.phase = "extending";
  }

  if (isVerticalMoving) {
    platform.startingY = nextY;
    platform.speed = VERTICAL_MOVING_SPEED + (Math.random() - 0.5) * 0.5;
    platform.movementRange = VERTICAL_MOVING_RANGE;
    platform.direction = Math.random() < 0.5 ? "up" : "down";
  }

  platforms.push(platform);
}

function updatePlayer(deltaTime) {
  updateMovingPlatforms(deltaTime);
  updateDisappearingPlatforms();

  if (keys["a"] || keys["arrowleft"]) {
    player.velocityX = -player.speed;
    if (player.onMovingPlatform && !player.onMovingPlatform.isVerticalMoving) {
      player.onMovingPlatform = null;
    }
  } else if (keys["d"] || keys["arrowright"]) {
    player.velocityX = player.speed;
    if (player.onMovingPlatform && !player.onMovingPlatform.isVerticalMoving) {
      player.onMovingPlatform = null;
    }
  } else {
    if (!player.onMovingPlatform || player.onMovingPlatform.isVerticalMoving) {
      player.velocityX *= 0.8;
    }
  }

  if ((keys["w"] || keys["arrowup"] || keys[" "]) && player.onGround) {
    player.velocityY = player.jumpPower;
    player.onGround = false;
    hasJumped = true;
  }

  player.velocityY += player.gravity;

  player.onGround = false;
  const prevPlayerX = player.x;
  const prevPlayerY = player.y;

  player.x += player.velocityX;

  for (const platform of platforms) {
    if (
      player.y < platform.y + platform.height &&
      player.y + player.height > platform.y &&
      player.x < platform.x + platform.width &&
      player.x + player.width > platform.x
    ) {
      if (prevPlayerX < player.x) {
        player.x = platform.x - player.width;
      } else {
        player.x = platform.x + platform.width;
      }
      player.velocityX = 0;
    }
  }

  player.y += player.velocityY;

  for (const platform of platforms) {
    if (
      player.x < platform.x + platform.width &&
      player.x + player.width > platform.x &&
      player.y < platform.y + platform.height &&
      player.y + player.height > platform.y
    ) {
      if (prevPlayerY < player.y) {
        player.y = platform.y - player.height;
        player.velocityY = 0;
        player.onGround = true;

        if (platform.isMoving || platform.isVerticalMoving) {
          player.onMovingPlatform = platform;
        } else {
          player.onMovingPlatform = null;
        }

        if (platform.isDisappearing && !platform.hasLanded) {
          platform.hasLanded = true;
          platform.landTime = Date.now();
        }
      } else {
        player.y = platform.y + platform.height;
        player.velocityY = 0;
      }
    }
  }

  if (player.onMovingPlatform && player.onGround) {
    const platform = player.onMovingPlatform;

    if (platform.deltaX !== undefined && platform.deltaX !== 0) {
      player.x += platform.deltaX;
      player.velocityX = 0;
    }

    if (platform.deltaY !== undefined && platform.deltaY !== 0) {
      player.y += platform.deltaY;
      player.velocityY = 0;
    }
  } else if (!player.onGround) {
    player.onMovingPlatform = null;
  }

  if (player.y + player.height >= viewHeight) {
    respawn();
    return;
  }

  if (player.y < 0) {
    player.y = 0;
    player.velocityY = 0;
  }

  if (hasJumped) {
    if (cameraCurrentSpeed === 0) {
      cameraCurrentSpeed = CAMERA_BASE_SPEED;
    }
    cameraCurrentSpeed = Math.min(
      cameraCurrentSpeed + CAMERA_ACCELERATION * deltaTime,
      CAMERA_MAX_SPEED,
    );
    cameraX += cameraCurrentSpeed * deltaTime;
  }
  const targetCameraX = player.x - viewWidth / 3;
  cameraX = Math.max(cameraX, targetCameraX);

  const rightmostPlatform = platforms[platforms.length - 1];
  const generationBuffer = Math.max(500, cameraCurrentSpeed * 2);
  if (
    rightmostPlatform.x + rightmostPlatform.width <
    cameraX + viewWidth + generationBuffer
  ) {
    generateNextPlatform();
  }

  while (
    platforms.length > 0 &&
    platforms[0].x + platforms[0].width < cameraX - 200
  ) {
    platforms.shift();
  }
}

function draw() {
  const gradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
  gradient.addColorStop(0, "#87CEEB");
  gradient.addColorStop(0.5, "#98D8E8");
  gradient.addColorStop(1, "#B0E0E6");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  ctx.save();
  ctx.translate(-cameraX, 0);

  for (const platform of platforms) {
    if (platform.isDisappearing && platform.hasLanded) {
      const now = Date.now();
      const fadeProgress = Math.min(1, (now - platform.landTime) / 1000);
      ctx.globalAlpha = 1 - fadeProgress * 0.7;
    }

    ctx.fillStyle = platform.color;
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    ctx.strokeStyle = "#2C3E50";
    ctx.lineWidth = 2;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);

    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.strokeStyle = "#2C3E50";
  ctx.lineWidth = 2;
  ctx.strokeRect(player.x, player.y, player.width, player.height);

  ctx.fillStyle = "#FFF";
  ctx.fillRect(player.x + 8, player.y + 10, 8, 8);
  ctx.fillRect(player.x + 24, player.y + 10, 8, 8);
  ctx.fillStyle = "#000";
  ctx.fillRect(player.x + 10, player.y + 12, 4, 4);
  ctx.fillRect(player.x + 26, player.y + 12, 4, 4);

  ctx.restore();
}

function respawn() {
  platforms.length = 0;
  createInitialPlatform();
  generateNextPlatform();
  generateNextPlatform();
  generateNextPlatform();
  const respawnPlatform = platforms[0];
  player.x = respawnPlatform.x + respawnPlatform.width / 2 - player.width / 2;
  player.y = respawnPlatform.y - player.height;
  player.velocityX = 0;
  player.velocityY = 0;
  player.onMovingPlatform = null;
  cameraX = 0;
  cameraCurrentSpeed = 0;
  hasJumped = false;
  lastFrameTime = performance.now();
}

function gameLoop() {
  const now = performance.now();
  const deltaTime = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  if (gameRunning) {
    gameTime += deltaTime;
    updatePlayer(deltaTime);
  }
  draw();
  requestAnimationFrame(gameLoop);
}

respawn();
gameLoop();
