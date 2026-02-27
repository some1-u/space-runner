import {
  JUMP_VX_MIN,
  MIN_GAP,
  MAX_GAP,
  MAX_VERTICAL_INCREASE,
  MAX_VERTICAL_DECREASE,
  DIFFICULTY,
  PLATFORM_Y_MIN,
  PLATFORM_Y_MAX_FRAC,
  MIN_HEIGHT_INCREASE,
  MIN_VERTICAL_STEP,
  PLATFORM_HEIGHT,
  VERTICAL_MOVING_SPEED,
  VERTICAL_MOVING_RANGE,
} from "./constants.js";

export const platforms = [];
export { PLATFORM_HEIGHT as platformHeight };

export function getPlatformWidth(gameTime) {
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

function shouldSpawnDisappearingPlatform(gameTime) {
  const lastPlatform = platforms[platforms.length - 1];
  if (lastPlatform && lastPlatform.isMoving) return false;

  const difficultyProgress = Math.min(1, gameTime / 180);
  const spawnChance = 0.1 + (0.25 - 0.1) * difficultyProgress;

  return Math.random() < spawnChance;
}

function shouldSpawnMovingPlatform(gameTime) {
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

function shouldSpawnVerticalMovingPlatform(gameTime) {
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

export function updateDisappearingPlatforms(player) {
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

export function updateMovingPlatforms(deltaTime, player) {
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

export function createInitialPlatform(viewHeight, gameTime = 0) {
  platforms.push({
    x: 0,
    y: viewHeight - 100,
    width: getPlatformWidth(gameTime),
    height: PLATFORM_HEIGHT,
  });
}

export function getReachableHorizontalRange(dy, player) {
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

export function generateNextPlatform(viewHeight, viewWidth, gameTime, player) {
  const lastPlatform = platforms[platforms.length - 1];
  const yMin = PLATFORM_Y_MIN;
  let yMax = Math.min(
    viewHeight - PLATFORM_HEIGHT - 50,
    viewHeight * PLATFORM_Y_MAX_FRAC,
  );
  if (yMax <= yMin || !Number.isFinite(yMax)) {
    yMax = Math.max(yMin + 200, (viewHeight || 600) - PLATFORM_HEIGHT - 50);
  }

  let reachableYMin = Math.max(yMin, lastPlatform.y - MAX_VERTICAL_INCREASE);
  let reachableYMax = Math.min(yMax, lastPlatform.y + MAX_VERTICAL_DECREASE);

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
    range = getReachableHorizontalRange(dy, player);
  } else if (canGoHigher) {
    nextY = bandAbove[0] + Math.random() * (bandAbove[1] - bandAbove[0]);
    dy = nextY - lastPlatform.y;
    range = getReachableHorizontalRange(dy, player);
  } else if (canGoLower) {
    nextY = bandBelow[0] + Math.random() * (bandBelow[1] - bandBelow[0]);
    dy = nextY - lastPlatform.y;
    range = getReachableHorizontalRange(dy, player);
  } else {
    dy =
      Math.random() < 0.5
        ? -Math.min(MIN_HEIGHT_INCREASE, MAX_VERTICAL_INCREASE)
        : Math.min(MIN_VERTICAL_STEP, 100);
    nextY = lastPlatform.y + dy;
    nextY = Math.max(yMin, Math.min(nextY, yMax));
    dy = nextY - lastPlatform.y;
    range = getReachableHorizontalRange(dy, player);
  }

  if (range.max <= range.min) {
    nextY =
      lastPlatform.y +
      (Math.random() < 0.5 ? -MIN_HEIGHT_INCREASE : MIN_VERTICAL_STEP);
    nextY = Math.max(reachableYMin, Math.min(nextY, reachableYMax));
    dy = nextY - lastPlatform.y;
    range = getReachableHorizontalRange(dy, player);
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

  const isDisappearing = shouldSpawnDisappearingPlatform(gameTime);
  const isMoving = !isDisappearing && shouldSpawnMovingPlatform(gameTime);
  const isVerticalMoving =
    !isDisappearing && !isMoving && shouldSpawnVerticalMovingPlatform(gameTime);

  const platform = {
    x: nextX,
    y: nextY,
    width: getPlatformWidth(gameTime),
    height: PLATFORM_HEIGHT,
    isDisappearing,
    isMoving,
    isVerticalMoving,
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

export function removeOffscreenPlatforms(cameraX) {
  while (
    platforms.length > 0 &&
    platforms[0].x + platforms[0].width < cameraX - 200
  ) {
    platforms.shift();
  }
}

export function clearPlatforms() {
  platforms.length = 0;
}

// Platform tile atlas configuration
const tileImage = new Image();
tileImage.decoding = "async";
tileImage.src = "images/Space_Runner/Tiles/RunnerTileSet.png";

// Platform tile configuration
// Single stretchable platform sprite (96×31px) with rounded ends
const PLATFORM_TILES = {
  NORMAL: { x: 0, y: 0, width: 96, height: 31 },  // Single platform sprite
  MOVING: { x: 0, y: 0, width: 96, height: 31 },  // Same sprite, different color tint
  DISAPPEARING: { x: 0, y: 0, width: 96, height: 31 },  // Same sprite, different color tint
  VERTICAL_MOVING: { x: 0, y: 0, width: 96, height: 31 }  // Same sprite, different color tint
};

export { tileImage, PLATFORM_TILES };
