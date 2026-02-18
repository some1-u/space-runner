// Shared game constants

// Jump physics for reachability
export const JUMP_VX_MIN = 2;
export const MIN_GAP = 60;
export const MAX_GAP = 140;
export const MAX_VERTICAL_INCREASE = 85;
export const MAX_VERTICAL_DECREASE = 450;

export const DIFFICULTY = [
  { weight: 0.5, name: "medium", gapFrac: [0.55, 0.9] },
  { weight: 0.5, name: "hard", gapFrac: [0.8, 1] },
];

export const PLATFORM_Y_MIN = 80;
export const PLATFORM_Y_MAX_FRAC = 0.85;
export const MIN_HEIGHT_INCREASE = 80;
export const MIN_VERTICAL_STEP = 60;

export const PLATFORM_HEIGHT = 20;

// Moving / special platforms
export const VERTICAL_MOVING_SPEED = 1.5;
export const VERTICAL_MOVING_RANGE = 75;

// Camera
export const CAMERA_BASE_SPEED = 10;
export const CAMERA_MAX_SPEED = 180;
export const CAMERA_ACCELERATION = 10;
