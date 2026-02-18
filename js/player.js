export const player = {
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
  hasJumped: false,
};

const keys = {};

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
}

/**
 * Update player physics and collision. Returns true if player died (fell off bottom).
 */
export function updatePlayer(deltaTime, platforms, viewHeight) {
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
    player.hasJumped = true;
  }

  player.velocityY += player.gravity;

  player.onGround = false;
  const prevPlayerX = player.x;
  const prevPlayerY = player.y;

  player.x += player.velocityX;

  for (const platform of platforms) {
    // Skip horizontal collision for vertical moving platforms
    if (platform.isVerticalMoving) continue;
    
    if (
      player.y < platform.y + platform.height &&
      player.y + player.height > platform.y &&
      player.x < platform.x + platform.width &&
      player.x + player.width > platform.x
    ) {
      // ... rest of collision code
    
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
