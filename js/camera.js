import {
  CAMERA_BASE_SPEED,
  CAMERA_MAX_SPEED,
  CAMERA_ACCELERATION,
} from "./constants.js";

let cameraX = 0;
let cameraCurrentSpeed = 0;

export function getCameraX() {
  return cameraX;
}

export function updateCamera(deltaTime, hasJumped, playerX, viewWidth) {
  if (hasJumped) {
    if (cameraCurrentSpeed === 0) {
      cameraCurrentSpeed = CAMERA_BASE_SPEED;
    }
    cameraCurrentSpeed = Math.min(
      cameraCurrentSpeed + CAMERA_ACCELERATION * deltaTime,
      CAMERA_MAX_SPEED
    );
    cameraX += cameraCurrentSpeed * deltaTime;
  }
  const targetCameraX = playerX - viewWidth / 3;
  cameraX = Math.max(cameraX, targetCameraX);
}

export function resetCamera() {
  cameraX = 0;
  cameraCurrentSpeed = 0;
}

export function getCameraCurrentSpeed() {
  return cameraCurrentSpeed;
}
