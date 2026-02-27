export const player = {
  x: 100,
  y: 300,
  width: 48,
  height: 44,
  velocityX: 0,
  velocityY: 0,
  speed: 5,
  jumpPower: -13.4,
  gravity: 0.8,
  onGround: false,
  onMovingPlatform: null,
  color: "#FF6B6B",
  hasJumped: false,
};

const keys = {};

export { keys };

export function setupInput() {
  document.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === "ArrowUp" || e.key === " ") {
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });
  
  window.keys = keys;
}

/*
  Astronaut filmstrip configuration:
  Based on sprite sheet specs:
  - Image size: 144 × 24 px
  - Frame size: 24 × 24 px each  
  - Total frames: 6 per animation
  - Layout: horizontal strip, left → right
  - Spacing: none (frames touch edge-to-edge)
  - Background: transparent
  - Recommended: 8-12 FPS for idle animation
  
  Display configuration:
  - Player size: 48 × 44 px (2x scale, reduced height for platform alignment)
  - Scale factor: 2.0x (24×24 → 48×48 visual, 44px collision)
  - Anchor point: center-bottom for better platform alignment
  
  Animation configuration:
  - FRAME_W / FRAME_H: single-frame size (24×24 px)
  - FRAME_COUNT: max frames available (6)
  - STATES.*.start/end: frame range per animation state
  - STEP_TICKS: game ticks before advancing frame (8-12 FPS recommended)
*/
const ASTRONAUT_ANIM = {
  FRAME_W: 24,
  FRAME_H: 24,
  FRAME_COUNT: 6,
  STEP_TICKS: {
    idle: 8,
    run: 6,
  },
  STATES: {
    idle: { sheet: "idle", start: 0, end: 5, loop: true },
    run: { sheet: "run", start: 0, end: 5, loop: true },
  },
};

// astronaut sheets (canvas-based visuals only)
const astronautSheets = {
  idle: { img: new Image(), loaded: false },
  run: { img: new Image(), loaded: false },
};

const ASTRONAUT_PATHS = {
  idle: ["images/Space_Runner/Astronaut/Astronaut_Idle.png"],
  run: ["images/Space_Runner/Astronaut/Astronaut_Run.png"],
};

function loadWithFallback(target, paths) {
  return new Promise((resolve) => {
    let i = 0;
    const tryNext = () => {
      if (i >= paths.length) return resolve(false);
      const src = paths[i++];
      target.onload = () => resolve(true);
      target.onerror = tryNext;
      target.src = src;
    };
    tryNext();
  });
}

let astronautPreloadStarted = false;
export async function preloadAstronautSheets() {
  if (astronautPreloadStarted) return;
  astronautPreloadStarted = true;

  const [idleOk, runOk] = await Promise.all([
    loadWithFallback(astronautSheets.idle.img, ASTRONAUT_PATHS.idle),
    loadWithFallback(astronautSheets.run.img, ASTRONAUT_PATHS.run),
  ]);

  astronautSheets.idle.loaded = idleOk;
  astronautSheets.run.loaded = runOk;
}

function clampFrame(frame) {
  return Math.max(0, Math.min(ASTRONAUT_ANIM.FRAME_COUNT - 1, frame));
}

export function initPlayerAnimation(player) {
  if (player.animState) return;
  player.animState = "idle";
  player.animFrameIndex = 0; // local index within current state's range
  player.animTickCounter = 0;
}

export function resolvePlayerAnimState(player, input) {
  const moving = Math.abs(player.velocityX) > 0.01 || !!input?.left || !!input?.right;
  return moving ? "run" : "idle";
}

export function updatePlayerAnimation(player, input) {
  initPlayerAnimation(player);
  const nextState = resolvePlayerAnimState(player, input);

  if (nextState !== player.animState) {
    player.animState = nextState;
    player.animFrameIndex = 0;
    player.animTickCounter = 0;
  }

  const def = ASTRONAUT_ANIM.STATES[player.animState];
  const frameTotal = def.end - def.start + 1;
  const step = ASTRONAUT_ANIM.STEP_TICKS[player.animState] ?? 8;

  player.animTickCounter += 1;
  if (player.animTickCounter % step === 0) {
    player.animFrameIndex = def.loop
      ? (player.animFrameIndex + 1) % frameTotal
      : Math.min(player.animFrameIndex + 1, frameTotal - 1);
  }

  if (player.velocityX < -0.01) player.facing = -1;
  if (player.velocityX > 0.01) player.facing = 1;
  if (!player.facing) player.facing = 1;
}

export function drawPlayer(ctx, player, cameraX = 0, cameraY = 0) {
  initPlayerAnimation(player);
  const def = ASTRONAUT_ANIM.STATES[player.animState] || ASTRONAUT_ANIM.STATES.idle;
  const sheetRef = astronautSheets[def.sheet] || astronautSheets.idle;
  const imageReady = sheetRef.loaded && sheetRef.img.complete;

  const dx = Math.round(player.x - cameraX);
  const dy = Math.round(player.y - cameraY);
  const dw = player.width;
  const dh = player.height;

  if (!imageReady) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(dx, dy, dw, dh);
    return;
  }

  const frame = Math.max(
    def.start,
    Math.min(def.end, def.start + player.animFrameIndex),
  );
  
  const sx = frame * ASTRONAUT_ANIM.FRAME_W;
  const sy = 0;
  const sw = ASTRONAUT_ANIM.FRAME_W;
  const sh = ASTRONAUT_ANIM.FRAME_H;

  ctx.save();
  if (player.facing === -1) {
    ctx.translate(dx + dw / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(dx + dw / 2), 0);
  }
  
  ctx.drawImage(
    sheetRef.img,
    sx,
    sy,
    sw,
    sh,
    dx,
    dy,
    dw,
    dh,
  );
  ctx.restore();
}

/**
 * Update player physics and collision. Returns true if player died (fell off bottom).
 */
export function updatePlayer(deltaTime, platforms, viewHeight) {
  if (keys["a"] || keys["arrowleft"]) {
    player.velocityX = -player.speed;
  } else if (keys["d"] || keys["arrowright"]) {
    player.velocityX = player.speed;
  } else {
    player.velocityX *= 0.8;
  }

  if ((keys["w"] || keys["arrowup"] || keys[" "]) && player.onGround) {
    player.velocityY = player.jumpPower;
    player.onGround = false;
    player.hasJumped = true;
  }

  player.velocityY += player.gravity;

  player.onGround = false;
  const prevPlayerX = player.x;
  const prevPlayerY = player.y;

  player.x += player.velocityX;

  for (const platform of platforms) {
    if (platform.isVerticalMoving) continue;

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
    return true;
  }

  if (player.y < 0) {
    player.y = 0;
    player.velocityY = 0;
  }

  return false;
}

export function resetPlayer(respawnPlatform) {
  player.x = respawnPlatform.x + respawnPlatform.width / 2 - player.width / 2;
  player.y = respawnPlatform.y - player.height;
  player.velocityX = 0;
  player.velocityY = 0;
  player.onMovingPlatform = null;
  player.hasJumped = false;
}
