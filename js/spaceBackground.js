/**
 * Space theme: gradient, parallax star field (pixelStar image), and ambient planets (planet1–3 PNGs).
 */

const STAR_LAYERS = [
  { count: 35, parallax: 0.12, maxBrightness: 0.5 },
  { count: 25, parallax: 0.35, maxBrightness: 0.75 },
  { count: 18, parallax: 0.6, maxBrightness: 1 },
];
const STAR_SPAN_X = 8000;
const STAR_SPAN_Y = 1;
const STAR_SIZE = 12;

const PLANET_PARALLAX = 0.08;
const PLANET_MIN_SPAWN_DISTANCE = 10000;
const PLANET_MAX_SPAWN_DISTANCE = 15000;
const PLANET_POOL_SIZE = 8;
const PLANET_MIN_RADIUS = 75;
const PLANET_MAX_RADIUS = 150;

const imgStar = new Image();
imgStar.src = "images/pixelStar.png";

// NOTE: Browser JS cannot auto-enumerate folder contents.
// Add/adjust filenames here from your "images Pixel Art Space" folder.
const SPACE_ART_PLANET_PATHS = [
  "images/Pixel Art Space/Planet1.png",
  "images/Pixel Art Space/Planet2.png",
  "images/Pixel Art Space/Planet5.png",
  "images/Pixel Art Space/Planet4.png",
  "images/Pixel Art Space/Earth.png",
  "images/Pixel Art Space/Moon.png",
];

const imgPlanets = SPACE_ART_PLANET_PATHS.map((src) => {
  const img = new Image();
  img.src = src;
  return img;
});

let starsInitialized = false;
let lastStarViewHeight = 0;
const starLayers = [];
const planets = [];
let nextPlanetSpawnX = 0;

function ensureStarsInitialized(viewWidth, viewHeight) {
  if (
    starsInitialized &&
    starLayers.length > 0 &&
    lastStarViewHeight === viewHeight
  )
    return;
  starsInitialized = true;
  lastStarViewHeight = viewHeight;
  starLayers.length = 0;

  for (const layer of STAR_LAYERS) {
    const list = [];
    for (let i = 0; i < layer.count; i++) {
      list.push({
        x: Math.random() * STAR_SPAN_X,
        y: Math.random() * viewHeight * STAR_SPAN_Y,
        brightness: 0.7 + Math.random() * (layer.maxBrightness - 0.3),
      });
    }
    starLayers.push({ ...layer, list });
  }
}

function maybeSpawnPlanet(cameraX, viewWidth, viewHeight) {
  if (cameraX < nextPlanetSpawnX) return;
  const gap =
    PLANET_MIN_SPAWN_DISTANCE +
    Math.random() * (PLANET_MAX_SPAWN_DISTANCE - PLANET_MIN_SPAWN_DISTANCE);
  nextPlanetSpawnX = cameraX + gap;

  const pool = planets;
  const reuse = pool.find((p) => {
    const size = p.displaySize || p.radius * 2;
    const sx = p.x - cameraX * (p.parallax ?? PLANET_PARALLAX);
    return sx + size < -150;
  });
  const planet = reuse || {};

  planet.x = cameraX * PLANET_PARALLAX + viewWidth + 80 + Math.random() * 120;
  planet.y = viewHeight * (0.12 + Math.random() * 0.5);
  planet.radius =
    PLANET_MIN_RADIUS + Math.random() * (PLANET_MAX_RADIUS - PLANET_MIN_RADIUS);
  planet.displaySize = planet.radius * 2;
  planet.imageIndex = imgPlanets.length
    ? Math.floor(Math.random() * imgPlanets.length)
    : -1;
  planet.parallax = PLANET_PARALLAX;
  if (!reuse) pool.push(planet);
}

export function drawSpaceBackground(ctx, cameraX, viewWidth, viewHeight) {
  const gradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
  gradient.addColorStop(0, "#1a0a2e");
  gradient.addColorStop(0.4, "#2d1b4e");
  gradient.addColorStop(0.85, "#3d2a5c");
  gradient.addColorStop(1, "#4a3560");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewWidth, viewHeight);
}

export function drawStarfield(ctx, cameraX, viewWidth, viewHeight) {
  ensureStarsInitialized(viewWidth, viewHeight);
  const useImg = imgStar.complete && imgStar.naturalWidth > 0;
  const size = STAR_SIZE;
  const half = size / 2;

  for (const layer of starLayers) {
    const factor = layer.parallax;
    for (const star of layer.list) {
      const sx = star.x - cameraX * factor;
      if (sx < -size || sx > viewWidth + size) continue;
      const alpha = 0.2 + star.brightness * 0.5;
      ctx.globalAlpha = alpha;
      if (useImg) {
        ctx.drawImage(imgStar, sx - half, star.y - half, size, size);
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.beginPath();
        ctx.arc(sx, star.y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

export function updateAndDrawPlanets(ctx, cameraX, viewWidth, viewHeight) {
  maybeSpawnPlanet(cameraX, viewWidth, viewHeight);

  const d = PLANET_MAX_RADIUS * 2;
  for (const p of planets) {
    const sx = p.x - cameraX * p.parallax;
    const size = p.displaySize || p.radius * 2;
    if (sx + size < -100 || sx - size > viewWidth + 100) continue;

    const img = p.imageIndex >= 0 ? imgPlanets[p.imageIndex] : null;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img, sx - size / 2, p.y - size / 2, size, size);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = "hsla(280, 45%, 35%, 0.6)";
      ctx.beginPath();
      ctx.arc(sx, p.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function resetSpaceBackground() {
  nextPlanetSpawnX = 600;
  planets.length = 0;
}
