// The full settings tree. Every value here is transcribed from the previous
// src/config.ts globals; see docs/how-it-works.md for how to add a setting.
//
// Section ids match the old RUNTIME_CONFIG_SECTIONS ids exactly, so v1
// localStorage data migrates cleanly (see settings/persistence.ts).

import {
  bool,
  choice,
  collection,
  color,
  group,
  index,
  list,
  num,
  range,
  rgb,
  text,
  vec2,
  type ValueOf,
} from "./schema";

const TAU = Math.PI * 2;

// The settings coordinates below are authored in this fixed landscape layout
// (see config.ts's CANVAS); the live canvas can be a different size on
// mobile portrait, but random placements are still generated in this space.
const LAYOUT = { width: 480, height: 270 };

function randomEdgePosition(): { x: number; y: number } {
  const randomInt = (min: number, maxExclusive: number): number =>
    Math.floor(min + Math.random() * (maxExclusive - min));
  const side = randomInt(0, 4);
  if (side === 0) return { x: randomInt(16, LAYOUT.width - 15), y: randomInt(8, 43) };
  if (side === 1) {
    return { x: randomInt(LAYOUT.width - 42, LAYOUT.width - 7), y: randomInt(16, LAYOUT.height - 15) };
  }
  if (side === 2) {
    return { x: randomInt(16, LAYOUT.width - 15), y: randomInt(LAYOUT.height - 42, LAYOUT.height - 7) };
  }
  return { x: randomInt(8, 43), y: randomInt(16, LAYOUT.height - 15) };
}

function offsetGroup(dx: number, dy: number, limit = 20) {
  return group({
    x: num({ default: dx, min: -limit, max: limit, step: 0.1 }),
    y: num({ default: dy, min: -limit, max: limit, step: 0.1 }),
  });
}

// ---- koi ---------------------------------------------------------------

const koiPalette = group({
  name: text({ default: "", hidden: true }),
  base: color({ default: 0xffffff }),
  accent: color({ default: 0xffffff }),
  marking: color({ default: 0xffffff }),
  fin: color({ default: 0xffffff }),
});

const koiPatch = group({
  position: num({ default: 0, min: 0, max: 1, step: 0.005 }),
  length: num({ default: 0, min: 0, max: 1, step: 0.005 }),
  width: num({ default: 0, min: 0, max: 1, step: 0.01 }),
  offset: num({ default: 0, min: -1, max: 1, step: 0.01 }),
  color: choice<"accent" | "marking">({
    default: "accent",
    options: [
      { value: "accent", label: "Accent" },
      { value: "marking", label: "Marking" },
    ],
  }),
});
// koi-patterns is a list of per-family patch lists (each family owns a
// different number of patches). The inner list's own `defaults` is unused —
// the outer list supplies the real per-family arrays — it only gives the
// item shape for validation and the UI.
const koiPatchList = list(koiPatch, []);

const koi = group(
  {
    initialCount: num({
      default: 14,
      min: 1,
      max: 48,
      step: 1,
      int: true,
      label: "Koi count",
      effect: "koi:count",
    }),
    regularLength: range({
      default: [27, 40],
      min: 5,
      max: 80,
      step: 0.5,
      effect: "koi:body",
      keepsFamilyPreview: true,
    }),
    tinyEvery: num({ default: 2, min: 2, max: 12, step: 1, int: true, effect: "koi:body" }),
    tinyLength: range({ default: [16, 22], min: 5, max: 60, step: 0.5, effect: "koi:body" }),
    regularWidthRatio: range({
      default: [0.17, 0.2],
      min: 0.05,
      max: 0.6,
      step: 0.005,
      effect: "koi:body",
      keepsFamilyPreview: true,
    }),
    tinyWidthRatio: range({
      default: [0.18, 0.22],
      min: 0.05,
      max: 0.6,
      step: 0.005,
      effect: "koi:body",
    }),
    eyeColor: color({ default: 0x171815, effect: "koi:appearance", keepsFamilyPreview: true }),
    shadow: group({
      color: color({ default: 0x0b211e, effect: "koi:appearance" }),
      surfaceOpacity: num({ default: 0.38, min: 0, max: 1, step: 0.01 }),
      deepOpacity: num({ default: 0.56, min: 0, max: 1, step: 0.01 }),
      offset: offsetGroup(4.4, 10.4),
      // Moved from the old FISH.depth.shadow.additionalOffset (depth.shadow.offset was dead).
      depthOffset: offsetGroup(-3, -7),
    }),
    depth: group({
      initialRange: range({ default: [0.05, 0.18], min: 0, max: 1, step: 0.01 }),
      shallowRange: range({ default: [0.04, 0.22], min: 0, max: 1, step: 0.01 }),
      deepRange: range({ default: [0.45, 0.75], min: 0, max: 1, step: 0.01 }),
      surfaceDurationSeconds: range({ default: [8, 22], min: 0, max: 60, step: 0.05 }),
      deepDurationSeconds: range({ default: [4, 10], min: 0, max: 60, step: 0.05 }),
      changeProbability: num({ default: 0.72, min: 0, max: 1, step: 0.01 }),
      transitionSeconds: range({ default: [2, 5], min: 0, max: 60, step: 0.05 }),
      callRiseDepth: num({ default: 0.035, min: 0, max: 1, step: 0.001 }),
      callRiseSeconds: num({ default: 2.4, min: 0, max: 60, step: 0.05 }),
      visualStart: num({ default: 0.1, min: 0, max: 1, step: 0.01 }),
      visualEnd: num({ default: 0.72, min: 0, max: 1, step: 0.01 }),
      deepBrightness: num({ default: 0.59, min: 0, max: 2, step: 0.01 }),
      deepSaturation: num({ default: 0.76, min: 0, max: 2, step: 0.01 }),
      deepWaterTint: rgb({ default: [0.66, 0.84, 0.8], min: 0, max: 2, step: 0.01 }),
      localDistortion: group({
        strength: num({ default: 2.3, min: 0, max: 20, step: 0.05 }),
        lengthScale: num({ default: 0.72, min: 0, max: 5, step: 0.01 }),
        widthScale: num({ default: 1.85, min: 0, max: 5, step: 0.01 }),
        waveFrequency: num({ default: 8.5, min: 0, max: 80, step: 0.5 }),
        waveSpeed: num({ default: 2.4, min: -10, max: 10, step: 0.05 }),
      }),
    }),
    feeding: group({
      intervalSeconds: range({ default: [1, 4], min: 0, max: 60, step: 0.05 }),
      retryDelaySeconds: range({ default: [0.55, 1.35], min: 0, max: 60, step: 0.05 }),
      eligibleDepth: num({ default: 0.23, min: 0, max: 1, step: 0.01 }),
      eligibleSpeedFraction: num({ default: 0.62, min: 0, max: 2, step: 0.01 }),
      mouthForwardOffset: num({ default: 0.66, min: 0, max: 3, step: 0.01 }),
      animationDurationSeconds: num({ default: 0.24, min: 0, max: 10, step: 0.01 }),
    }),
    callResponse: group({
      minimumDelaySeconds: num({ default: 0.04, min: 0, max: 10, step: 0.01 }),
      distanceAtMaximumDelay: num({ default: 360, min: 0, max: 2000, step: 5 }),
      maximumDistanceDelaySeconds: num({ default: 1.05, min: 0, max: 10, step: 0.01 }),
      distanceExponent: num({ default: 1.5, min: 0, max: 5, step: 0.05 }),
      randomJitterSeconds: num({ default: 0.18, min: 0, max: 5, step: 0.01 }),
      temperamentDelaySeconds: num({ default: 0.22, min: 0, max: 5, step: 0.01 }),
      targetLifetimeSeconds: num({ default: 4.4, min: 0, max: 30, step: 0.1 }),
      chaseBoostSeconds: num({ default: 2.6, min: 0, max: 30, step: 0.1 }),
      chaseSpeedMultiplier: num({ default: 2.3, min: 0, max: 10, step: 0.05 }),
      initialExtraSpeedMultiplier: num({ default: 0.34, min: 0, max: 5, step: 0.01 }),
    }),
  },
  { label: "Koi" },
);

const koiPalettes = list(
  koiPalette,
  [
    { name: "Kohaku", base: 0xf1eadb, accent: 0xdc4b2f, marking: 0x27251f, fin: 0xe6ddca },
    { name: "Sanke", base: 0xf2ebdc, accent: 0xdf5032, marking: 0x20211f, fin: 0xe7dece },
    { name: "Showa", base: 0xeee6d5, accent: 0xd9482e, marking: 0x242622, fin: 0xc9bfaa },
    { name: "Ogon", base: 0xe7aa31, accent: 0xcf7626, marking: 0x78431f, fin: 0xd9922a },
    { name: "Tancho", base: 0xf2ebdc, accent: 0xda4430, marking: 0x292723, fin: 0xe7dece },
    { name: "Shiro", base: 0xeae5da, accent: 0x252825, marking: 0x4f5c5a, fin: 0xd7d2c7 },
  ],
  { label: "Koi palettes", effect: "koi:appearance", keepsFamilyPreview: true },
);

// The order is Kohaku, Sanke, Showa, Ogon, Tancho, and Shiro.
const koiPatterns = list(
  koiPatchList,
  [
    [
      { position: 0.17, length: 0.09, width: 0.74, offset: 0.04, color: "accent" },
      { position: 0.48, length: 0.115, width: 0.69, offset: -0.12, color: "accent" },
      { position: 0.76, length: 0.085, width: 0.62, offset: 0.16, color: "accent" },
    ],
    [
      { position: 0.19, length: 0.095, width: 0.7, offset: 0.04, color: "accent" },
      { position: 0.58, length: 0.105, width: 0.66, offset: -0.14, color: "accent" },
      { position: 0.38, length: 0.045, width: 0.3, offset: 0.38, color: "marking" },
      { position: 0.79, length: 0.04, width: 0.28, offset: -0.36, color: "marking" },
    ],
    [
      { position: 0.15, length: 0.082, width: 0.63, offset: -0.05, color: "accent" },
      { position: 0.53, length: 0.092, width: 0.58, offset: 0.17, color: "accent" },
      { position: 0.32, length: 0.09, width: 0.72, offset: 0.1, color: "marking" },
      { position: 0.73, length: 0.105, width: 0.67, offset: -0.14, color: "marking" },
    ],
    [],
    [{ position: 0.16, length: 0.07, width: 0.52, offset: 0, color: "accent" }],
    [
      { position: 0.22, length: 0.092, width: 0.68, offset: 0.08, color: "accent" },
      { position: 0.51, length: 0.09, width: 0.6, offset: -0.18, color: "accent" },
      { position: 0.79, length: 0.074, width: 0.54, offset: 0.22, color: "accent" },
    ],
  ] as const,
  { label: "Koi markings", effect: "koi:appearance", keepsFamilyPreview: true },
);

// ---- tiny fish -----------------------------------------------------------

const tinyFishPalette = group({
  body: color({ default: 0xffffff }),
  light: color({ default: 0xffffff }),
  accent: color({ default: 0xffffff }),
  fin: color({ default: 0xffffff }),
  eye: color({ default: 0xffffff }),
});

const tinyFish = group(
  {
    visibleSchoolCount: num({
      default: 3,
      min: 0,
      max: 32,
      step: 1,
      int: true,
      effect: "tiny-fish:respawn",
    }),
    bodyLength: range({ default: [5.8, 8.2], min: 1, max: 30, step: 0.1, effect: "tiny-fish:respawn" }),
    bodyWidthRatio: range({
      default: [0.1, 0.32],
      min: 0.02,
      max: 1,
      step: 0.01,
      effect: "tiny-fish:respawn",
    }),
    tailLengthScale: num({ default: 0.34, min: 0, max: 3, step: 0.01 }),
    tailWidthScale: num({ default: 0.92, min: 0, max: 3, step: 0.01 }),
    finReachScale: num({ default: 1.28, min: 0, max: 3, step: 0.01 }),
    eyeRadius: num({ default: 0.28, min: 0, max: 2, step: 0.01 }),
    cruiseSpeed: range({ default: [19, 27], min: 1, max: 100, step: 0.5, effect: "tiny-fish:respawn" }),
    speedVariation: num({ default: 0.46, min: 0, max: 2, step: 0.01 }),
    edgeMargin: num({ default: 14, min: 0, max: 100, step: 1 }),
    neighbourRadius: num({ default: 25, min: 0, max: 200, step: 1 }),
    separationRadius: num({ default: 6.2, min: 0, max: 100, step: 0.1 }),
    cohesionStrength: num({ default: 0.62, min: 0, max: 10, step: 0.01 }),
    alignmentStrength: num({ default: 0.56, min: 0, max: 10, step: 0.01 }),
    separationStrength: num({ default: 2.8, min: 0, max: 10, step: 0.01 }),
    swirlStrength: num({ default: 0.46, min: 0, max: 10, step: 0.01 }),
    wanderStrength: num({ default: 0.34, min: 0, max: 10, step: 0.01 }),
    edgeStrength: num({ default: 4.8, min: 0, max: 20, step: 0.01 }),
    steeringResponse: num({ default: 4.7, min: 0, max: 20, step: 0.01 }),
    maximumTurnRate: num({ default: 2.4, min: 0, max: 20, step: 0.01 }),
    flee: group({
      reactionRadius: num({ default: 270, min: 0, max: 1000, step: 1 }),
      propagationSpeed: num({ default: 180, min: 0, max: 1000, step: 1 }),
      randomDelay: num({ default: 0.16, min: 0, max: 5, step: 0.01 }),
      duration: range({ default: [1.45, 2.35], min: 0, max: 60, step: 0.05 }),
      speed: range({ default: [49, 64], min: 0, max: 200, step: 1 }),
      directionStrength: num({ default: 5.8, min: 0, max: 20, step: 0.01 }),
      schoolingStrength: num({ default: 0.58, min: 0, max: 10, step: 0.01 }),
      initialImpulse: num({ default: 13, min: 0, max: 100, step: 0.5 }),
    }),
    shadow: group(
      {
        color: color({ default: 0x12352f }),
        opacity: num({ default: 0.28, min: 0, max: 1, step: 0.01 }),
        offset: offsetGroup(1.5, 2.8),
      },
      { effect: "tiny-fish:render" },
    ),
    palettes: list(
      tinyFishPalette,
      [
        { body: 0xffe66d, light: 0xfff3a0, accent: 0xff8c42, fin: 0xffc857, eye: 0x203638 },
        { body: 0x56dffc, light: 0xb2f2ff, accent: 0x3877ed, fin: 0x85edff, eye: 0x173b52 },
        { body: 0xff72ad, light: 0xffbad2, accent: 0xffd05e, fin: 0xff9bc2, eye: 0x4d2940 },
        { body: 0xa8ed48, light: 0xddff8c, accent: 0x38bb78, fin: 0xc5f56d, eye: 0x254535 },
      ],
      { effect: "tiny-fish:render" },
    ),
  },
  { label: "Tiny fish" },
);

const tinyFishSchoolItem = group({
  x: num({ default: 0, min: -80, max: 560, step: 1, effect: "tiny-fish:shift" }),
  y: num({ default: 0, min: -80, max: 350, step: 1, effect: "tiny-fish:shift" }),
  count: num({ default: 1, min: 1, max: 80, step: 1, int: true }),
  heading: num({ default: 0, min: -TAU, max: TAU, step: 0.01 }),
  spreadX: num({ default: 20, min: 0, max: 100, step: 1 }),
  spreadY: num({ default: 12, min: 0, max: 100, step: 1 }),
  palette: index({ default: 0, of: ["tiny-fish", "palettes"] }),
  sizeScale: num({ default: 1, min: 0.2, max: 3, step: 0.01 }),
  speedScale: num({ default: 1, min: 0.2, max: 3, step: 0.01 }),
  swirlDirection: choice<-1 | 1>({
    default: 1,
    options: [
      { value: -1, label: "Left" },
      { value: 1, label: "Right" },
    ],
  }),
});

const tinyFishSchools = collection(tinyFishSchoolItem, [
  { x: 174, y: 82, count: 24, heading: 0.35, spreadX: 32, spreadY: 15, palette: 0, sizeScale: 0.88, speedScale: 1.04, swirlDirection: 1 },
  { x: 343, y: 174, count: 15, heading: 2.75, spreadX: 22, spreadY: 11, palette: 1, sizeScale: 1.08, speedScale: 0.95, swirlDirection: -1 },
  { x: 139, y: 204, count: 34, heading: -0.72, spreadX: 40, spreadY: 18, palette: 2, sizeScale: 0.82, speedScale: 1.12, swirlDirection: 1 },
  { x: 377, y: 69, count: 19, heading: 2.2, spreadX: 28, spreadY: 13, palette: 3, sizeScale: 0.94, speedScale: 1, swirlDirection: -1 },
] as const, {
  label: "Tiny fish schools",
  countFrom: ["tiny-fish", "visibleSchoolCount"],
  max: 32,
  effect: "tiny-fish:respawn",
  create: (live) => {
    const l = live as { "tiny-fish": ValueOf<typeof tinyFish> };
    const random = (min: number, max: number): number => min + Math.random() * (max - min);
    const randomInt = (min: number, maxExclusive: number): number => Math.floor(random(min, maxExclusive));
    const rounded = (min: number, max: number): number => Number(random(min, max).toFixed(2));
    return {
      x: randomInt(48, LAYOUT.width - 47),
      y: randomInt(38, LAYOUT.height - 37),
      count: randomInt(10, 19),
      heading: rounded(-Math.PI, Math.PI),
      spreadX: randomInt(18, 41),
      spreadY: randomInt(9, 21),
      palette: randomInt(0, l["tiny-fish"].palettes.length),
      sizeScale: rounded(0.8, 1.14),
      speedScale: rounded(0.88, 1.14),
      swirlDirection: (Math.random() < 0.5 ? -1 : 1) as -1 | 1,
    };
  },
});

// ---- pond bed --------------------------------------------------------

const pondBed = group(
  {
    deepColor: rgb({ default: [0.486, 0.718, 0.631], min: 0, max: 1, step: 0.001 }),
    shallowColor: rgb({ default: [0.145, 0.395, 0.255], min: 0, max: 1, step: 0.001 }),
    speckColor: rgb({ default: [0.02, 0.065, 0.04], min: 0, max: 1, step: 0.001 }),
    verticalTone: num({ default: 0.8, min: 0, max: 1, step: 0.01 }),
    grainScale: num({ default: 0.54, min: 0, max: 2, step: 0.01 }),
    edgeDarkening: num({ default: 0.57, min: 0, max: 1, step: 0.01 }),
  },
  { label: "Pond bed", effect: "pond-bed" },
);

// ---- ripples -----------------------------------------------------------

function rippleType(defaultValue: {
  maximumActive: number;
  ripplesPerEvent: number;
  intervalSeconds: number;
  initialStrength: number;
  strengthFalloff: number;
  lifetime: number;
  startRadius: number;
  expansionSpeed: number;
  distortion: number;
  bandSharpness: number;
  fadeStart: number;
  strengthDecay: number;
}) {
  return group({
    maximumActive: num({
      default: defaultValue.maximumActive,
      min: 0,
      max: 64,
      step: 1,
      int: true,
      description: "Kept under MAX_RIPPLES (64) across all three ripple types combined.",
    }),
    ripplesPerEvent: num({ default: defaultValue.ripplesPerEvent, min: 1, max: 20, step: 1, int: true }),
    intervalSeconds: num({ default: defaultValue.intervalSeconds, min: 0.005, max: 0.5, step: 0.001 }),
    initialStrength: num({ default: defaultValue.initialStrength, min: 0, max: 5, step: 0.01 }),
    strengthFalloff: num({ default: defaultValue.strengthFalloff, min: 0, max: 5, step: 0.01 }),
    lifetime: num({ default: defaultValue.lifetime, min: 0, max: 10, step: 0.05 }),
    startRadius: num({ default: defaultValue.startRadius, min: 0, max: 20, step: 0.1 }),
    expansionSpeed: num({ default: defaultValue.expansionSpeed, min: 0, max: 200, step: 1 }),
    distortion: num({ default: defaultValue.distortion, min: 0, max: 20, step: 0.05 }),
    bandSharpness: num({ default: defaultValue.bandSharpness, min: 0, max: 2, step: 0.01 }),
    fadeStart: num({ default: defaultValue.fadeStart, min: 0, max: 1, step: 0.01 }),
    strengthDecay: num({ default: defaultValue.strengthDecay, min: 0, max: 2, step: 0.01 }),
  });
}

const ripples = group(
  {
    types: group({
      touch: rippleType({
        maximumActive: 16, ripplesPerEvent: 5, intervalSeconds: 0.023, initialStrength: 1,
        strengthFalloff: 0.92, lifetime: 2.2, startRadius: 4, expansionSpeed: 62,
        distortion: 5.55, bandSharpness: 0.3, fadeStart: 0.58, strengthDecay: 0.18,
      }),
      rain: rippleType({
        maximumActive: 48, ripplesPerEvent: 3, intervalSeconds: 0.103, initialStrength: 1.55,
        strengthFalloff: 1, lifetime: 1.25, startRadius: 0.8, expansionSpeed: 30,
        distortion: 4.8, bandSharpness: 0.62, fadeStart: 0.34, strengthDecay: 0.18,
      }),
      mouth: rippleType({
        maximumActive: 10, ripplesPerEvent: 1, intervalSeconds: 0.08, initialStrength: 0.5,
        strengthFalloff: 0.65, lifetime: 0.9, startRadius: 1.2, expansionSpeed: 17,
        distortion: 10.4, bandSharpness: 0.7, fadeStart: 0.25, strengthDecay: 0.45,
      }),
    }),
    rainEmitter: group({
      dropsPerSecond: num({ default: 12, min: 0, max: 200, step: 1 }),
      frequencyVariation: num({ default: 0.35, min: 0, max: 1, step: 0.01 }),
      maximumDropsPerFrame: num({ default: 40, min: 1, max: 200, step: 1, int: true }),
      edgeMargin: num({ default: 5, min: 0, max: 100, step: 1 }),
    }),
  },
  { label: "Ripples" },
);

// ---- water ---------------------------------------------------------------

const currentWave = group({
  direction: vec2({ default: [1, 0], min: -1, max: 1, step: 0.01 }),
  frequency: num({ default: 20, min: 0, max: 80, step: 0.5 }),
  speed: num({ default: 1, min: -10, max: 10, step: 0.05 }),
  strength: num({ default: 1, min: 0, max: 5, step: 0.01 }),
});

const water = group(
  {
    showCurrentEffect: bool({ default: true }),
    // 0 preserves the original surface pattern; 1 reveals the koi more clearly.
    clarity: num({ default: 0.5, min: 0, max: 1, step: 0.01 }),
    colorTint: rgb({ default: [0.96, 1.02, 1.0], min: 0, max: 2, step: 0.001 }),
    largeCurrentColor: rgb({ default: [0.022, 0.068, 0.047], min: 0, max: 1, step: 0.0005 }),
    largeCurrentCoreColor: rgb({ default: [0.052, 0.155, 0.108], min: 0, max: 1, step: 0.0005 }),
    secondaryLargeCurrentColor: rgb({ default: [0.022, 0.068, 0.047], min: 0, max: 1, step: 0.0005 }),
    secondaryLargeCurrentCoreColor: rgb({ default: [0.052, 0.155, 0.108], min: 0, max: 1, step: 0.0005 }),
    detailCurrentColor: rgb({ default: [0.01, 0.034, 0.023], min: 0, max: 1, step: 0.0005 }),
    detailCurrentCoreColor: rgb({ default: [0.028, 0.09, 0.061], min: 0, max: 1, step: 0.0005 }),
    // Use 0 to hide one layer without changing its colors.
    largeCellSize: num({ default: 908, min: 1, max: 2000, step: 1 }),
    largeCurrentOpacity: num({ default: 0.99, min: 0, max: 2, step: 0.01 }),
    largeCurrentSpeed: num({ default: 1, min: -10, max: 10, step: 0.05 }),
    secondaryLargeCellSize: num({ default: 10, min: 1, max: 2000, step: 1 }),
    secondaryLargeCurrentOpacity: num({ default: 0.15, min: 0, max: 2, step: 0.01 }),
    secondaryLargeCurrentSpeed: num({ default: 1, min: -10, max: 10, step: 0.05 }),
    detailCellSize: num({ default: 20, min: 1, max: 2000, step: 1 }),
    detailCurrentOpacity: num({ default: 0.9, min: 0, max: 2, step: 0.01 }),
    detailCurrentSpeed: num({ default: 1, min: -10, max: 10, step: 0.05 }),
    currentDistortion: group({
      amplitude: num({ default: 0.015, min: 0, max: 1, step: 0.001 }),
      waves: list(currentWave, [
        { direction: [0.94, 0.34], frequency: 22, speed: 0.92, strength: 1.2 },
        { direction: [-0.38, 0.92], frequency: 31, speed: 0.51, strength: 0.55 },
        { direction: [0.71, 0.71], frequency: 59, speed: -6.38, strength: 0.28 },
      ]),
    }),
  },
  { label: "Water", effect: "water" },
);

// ---- lotus -----------------------------------------------------------

const lotusLeafPalette = group({
  base: color({ default: 0xffffff }),
  light: color({ default: 0xffffff }),
  shade: color({ default: 0xffffff }),
  vein: color({ default: 0xffffff }),
  center: color({ default: 0xffffff }),
});

const lotusFlowerPalette = group({
  outerPetal: color({ default: 0xffffff }),
  innerPetal: color({ default: 0xffffff }),
  petalLight: color({ default: 0xffffff }),
  center: color({ default: 0xffffff }),
  centerDark: color({ default: 0xffffff }),
});

const lotus = group(
  {
    // Leaf and flower geometry is built once per lotus:rebuild (only transforms
    // change per frame), so every field in this section carries that tag.
    visibleLeafCount: num({ default: 15, min: 0, max: 32, step: 1, int: true, effect: "lotus:rebuild" }),
    visibleFlowerCount: num({ default: 4, min: 0, max: 16, step: 1, int: true, effect: "lotus:rebuild" }),
    radiusScale: num({ default: 1.18, min: 0, max: 5, step: 0.01 }),
    flowerRadiusScale: num({ default: 2.38, min: 0, max: 5, step: 0.01 }),
    leafSegments: num({ default: 24, min: 3, max: 64, step: 1, int: true }),
    veinCount: num({ default: 5, min: 0, max: 20, step: 1, int: true }),
    notchHalfAngle: num({ default: 0.3, min: 0, max: Math.PI, step: 0.01 }),
    verticalScale: num({ default: 0.92, min: 0, max: 2, step: 0.01 }),
    driftX: num({ default: 0.7, min: 0, max: 20, step: 0.01 }),
    driftY: num({ default: 0.55, min: 0, max: 20, step: 0.01 }),
    rotationAmount: num({ default: 0.055, min: 0, max: 2, step: 0.001 }),
    shadow: group(
      {
        color: color({ default: 0x0a2b26 }),
        opacity: num({ default: 0.5, min: 0, max: 1, step: 0.01 }),
        offset: offsetGroup(4.8, 10.4),
      },
      { effect: "lotus:rebuild" },
    ),
    leafPalettes: list(
      lotusLeafPalette,
      [
        { base: 0x5f9d78, light: 0x76aa84, shade: 0x487c66, vein: 0x3f705e, center: 0x4f866b },
        { base: 0x568f6f, light: 0x6ca17b, shade: 0x416f5b, vein: 0x386653, center: 0x497d63 },
      ],
      { effect: "lotus:rebuild" },
    ),
    flowerPalettes: list(
      lotusFlowerPalette,
      [
        { outerPetal: 0xf29aaa, innerPetal: 0xffc4cc, petalLight: 0xffe1e2, center: 0xf2bd45, centerDark: 0xb96d31 },
        { outerPetal: 0xe985ac, innerPetal: 0xfab7ce, petalLight: 0xffdce6, center: 0xf5c64b, centerDark: 0xbd7330 },
      ],
      { effect: "lotus:rebuild" },
    ),
  },
  { label: "Lotus", effect: "lotus:rebuild" },
);

const lotusLeafItem = group({
  x: num({ default: 0, min: -80, max: 560, step: 1 }),
  y: num({ default: 0, min: -80, max: 350, step: 1 }),
  radius: num({ default: 20, min: 1, max: 60, step: 0.5 }),
  angle: num({ default: 0, min: -TAU, max: TAU, step: 0.01 }),
  phase: num({ default: 0, min: -TAU, max: TAU, step: 0.01 }),
  palette: index({ default: 0, of: ["lotus", "leafPalettes"] }),
});

// Raise lotus.visibleLeafCount up to this list's length to reveal reserve placements.
const lotusLeaves = collection(lotusLeafItem, [
  { x: -3, y: 37, radius: 22, angle: 0.35, phase: 0.2, palette: 0 },
  { x: 76, y: 17, radius: 16, angle: 2.15, phase: 1.4, palette: 1 },
  { x: 431, y: 18, radius: 23, angle: 2.75, phase: 2.2, palette: 0 },
  { x: 476, y: 88, radius: 17, angle: 4.25, phase: 3.3, palette: 1 },
  { x: 460, y: 151, radius: 23, angle: 0.95, phase: 4.6, palette: 0 },
  { x: 488, y: 216, radius: 20, angle: 3.55, phase: 5.4, palette: 1 },
  { x: 395, y: 252, radius: 22, angle: 5.3, phase: 0.9, palette: 0 },
  { x: 113, y: 260, radius: 28, angle: 4.65, phase: 2.8, palette: 1 },
  { x: 31, y: 230, radius: 19, angle: 1.85, phase: 4.1, palette: 0 },
  { x: 140, y: 10, radius: 21, angle: 0.7, phase: 5.9, palette: 1 },
  { x: 330, y: 7, radius: 14, angle: 3.85, phase: 1.8, palette: 0 },
  { x: 447, y: 57, radius: 20, angle: 5.65, phase: 3.8, palette: 1 },
  { x: 82, y: 76, radius: 32, angle: 1.25, phase: 4.9, palette: 0 },
  { x: 414, y: 194, radius: 23, angle: 4.85, phase: 2.5, palette: 1 },
  { x: 444, y: 224, radius: 20, angle: 2.85, phase: 2.5, palette: 1 },
  { x: 10, y: 165, radius: 14, angle: 2.55, phase: 2.5, palette: 0 },
  { x: 451, y: 246, radius: 10, angle: 0.15, phase: 3.1, palette: 1 },
  { x: 58, y: 202, radius: 15, angle: 5.15, phase: 5.0, palette: 0 },
  { x: 374, y: 31, radius: 19, angle: 2.25, phase: 1.1, palette: 1 },
], {
  label: "Lotus placements",
  countFrom: ["lotus", "visibleLeafCount"],
  max: 32,
  effect: "lotus:rebuild",
  create: () => {
    const randomInt = (min: number, maxExclusive: number): number =>
      Math.floor(min + Math.random() * (maxExclusive - min));
    const rounded = (min: number, max: number): number => Number((min + Math.random() * (max - min)).toFixed(2));
    return {
      ...randomEdgePosition(),
      radius: randomInt(12, 27),
      angle: rounded(0, Math.PI * 2),
      phase: rounded(0, Math.PI * 2),
      palette: randomInt(0, lotus.children.leafPalettes.defaults.length),
    };
  },
});

const lotusFlowerItem = group({
  // A visible leaf by default (leafIndex 15 used to point at a hidden reserve leaf).
  leafIndex: index({ default: 0, of: ["lotus-leaves"] }),
  radius: num({ default: 5, min: 1, max: 15, step: 0.1 }),
  offsetX: num({ default: 0, min: -5, max: 5, step: 0.05 }),
  offsetY: num({ default: 0, min: -5, max: 5, step: 0.05 }),
  rotation: num({ default: 0, min: -TAU, max: TAU, step: 0.01 }),
  palette: index({ default: 0, of: ["lotus", "flowerPalettes"] }),
});

// Raise lotus.visibleFlowerCount up to this list's length to reveal reserve flowers.
const lotusFlowers = collection(lotusFlowerItem, [
  { leafIndex: 12, radius: 5.4, offsetX: 0.5, offsetY: -0.5, rotation: 0.25, palette: 0 },
  { leafIndex: 13, radius: 5.0, offsetX: -0.8, offsetY: 0.3, rotation: 0.75, palette: 1 },
  { leafIndex: 7, radius: 4.8, offsetX: 2.0, offsetY: -1.0, rotation: 0.45, palette: 0 },
  // Data fix: was leafIndex 15, a hidden reserve leaf, so flower #4 was invisible by default.
  { leafIndex: 9, radius: 4.5, offsetX: -1.0, offsetY: 0.5, rotation: 0.15, palette: 1 },
], {
  label: "Lotus flowers",
  countFrom: ["lotus", "visibleFlowerCount"],
  max: 16,
  effect: "lotus:rebuild",
  create: (live) => {
    const l = live as { lotus: ValueOf<typeof lotus>; ["lotus-leaves"]: ValueOf<typeof lotusLeaves> };
    const randomInt = (min: number, maxExclusive: number): number =>
      Math.floor(min + Math.random() * (maxExclusive - min));
    const rounded = (min: number, max: number): number => Number((min + Math.random() * (max - min)).toFixed(2));
    const availableLeaves = l["lotus-leaves"].length;
    const visibleLeaves = Math.max(1, Math.min(availableLeaves, Math.round(l.lotus.visibleLeafCount)));
    return {
      leafIndex: randomInt(0, visibleLeaves),
      radius: rounded(4.2, 6.2),
      offsetX: rounded(-2.2, 2.2),
      offsetY: rounded(-2.2, 2.2),
      rotation: rounded(0, Math.PI * 2),
      palette: randomInt(0, l.lotus.flowerPalettes.length),
    };
  },
});

// ---- duckweed ------------------------------------------------------------

const duckweedPalette = group({
  base: color({ default: 0xffffff }),
  light: color({ default: 0xffffff }),
  shade: color({ default: 0xffffff }),
  center: color({ default: 0xffffff }),
});

// Upper bound of the duckweed-patches collection; the renderer sizes its
// per-patch uniform array from this.
export const MAX_DUCKWEED_PATCHES = 32;

// Read live every frame into shader uniforms, so edits never rebuild the
// duckweed geometry: the "duckweed:live" tag overrides the parent's rebuild.
const duckweedRippleResponse = group(
  {
    enabled: bool({
      default: true,
      description: "Leaves drift away from touch, mouth, and rain ripples as the ring passes under them.",
    }),
    strength: num({
      default: 0.8,
      min: 0,
      max: 8,
      step: 0.1,
      unit: "px",
      description: "Peak push of a leaf right next to a full-strength ripple.",
    }),
    bandWidth: num({
      default: 7,
      min: 1,
      max: 30,
      step: 0.5,
      unit: "px",
      description: "Width of the ring front that pushes leaves. Wider rings move more leaves at once.",
    }),
    falloffDistance: num({
      default: 181,
      min: 5,
      max: 200,
      step: 1,
      unit: "px",
      description: "Distance from the ripple at which the push has halved.",
    }),
    maxPush: num({
      default: 6,
      min: 0,
      max: 10,
      step: 0.1,
      unit: "px",
      description: "Hard limit on how far overlapping ripples can move a leaf.",
    }),
    spin: num({
      default: 0.39,
      min: 0,
      max: 1.5,
      step: 0.01,
      unit: "rad",
      description: "Slight twist a leaf picks up while a ripple passes it.",
    }),
    touchWeight: num({ default: 0.8, min: 0, max: 2, step: 0.05 }),
    mouthWeight: num({ default: 0.4, min: 0, max: 2, step: 0.05 }),
    rainWeight: num({ default: 1.4, min: 0, max: 2, step: 0.05 }),
  },
  { label: "Ripple response", effect: "duckweed:live" },
);

const duckweed = group(
  {
    visiblePatchCount: num({ default: 8, min: 0, max: 16, step: 1, int: true }),
    minimumLeafRadius: num({ default: 1.05, min: 0, max: 10, step: 0.01 }),
    maximumLeafRadius: num({ default: 3.35, min: 0, max: 10, step: 0.01 }),
    verticalScale: num({ default: 0.76, min: 0, max: 2, step: 0.01 }),
    pairChance: num({ default: 0.42, min: 0, max: 1, step: 0.01 }),
    spreadExponent: num({ default: 0.68, min: 0, max: 3, step: 0.01 }),
    driftX: num({ default: 5.55, min: 0, max: 30, step: 0.01 }),
    driftY: num({ default: 5.42, min: 0, max: 30, step: 0.01 }),
    rotationAmount: num({ default: 0.045, min: 0, max: 2, step: 0.001 }),
    shadow: group({
      color: color({ default: 0x123b2d }),
      opacity: num({ default: 0.24, min: 0, max: 1, step: 0.01 }),
      offset: offsetGroup(1.4, 5.1),
    }),
    rippleResponse: duckweedRippleResponse,
    palettes: list(duckweedPalette, [
      { base: 0x6fc94f, light: 0x9be66c, shade: 0x45963e, center: 0xc3ee75 },
      { base: 0x83d35b, light: 0xb1ed76, shade: 0x549e43, center: 0xd0f28a },
    ]),
  },
  { label: "Duckweed", effect: "duckweed:rebuild" },
);

const duckweedPatchItem = group({
  x: num({ default: 0, min: -80, max: 560, step: 1 }),
  y: num({ default: 0, min: -80, max: 350, step: 1 }),
  radius: num({ default: 20, min: 1, max: 100, step: 1 }),
  count: num({ default: 20, min: 0, max: 250, step: 1, int: true }),
  phase: num({ default: 0, min: -TAU, max: TAU, step: 0.01 }),
  palette: index({ default: 0, of: ["duckweed", "palettes"] }),
});

// Duckweed stays near the pond boundary and the existing lotus clusters.
const duckweedPatches = collection(duckweedPatchItem, [
  { x: 28, y: 45, radius: 30, count: 42, phase: 0.3, palette: 0 },
  { x: 102, y: 17, radius: 22, count: 28, phase: 1.7, palette: 1 },
  { x: 447, y: 34, radius: 77, count: 138, phase: 2.8, palette: 0 },
  { x: 470, y: 116, radius: 25, count: 34, phase: 4.1, palette: 1 },
  { x: 451, y: 225, radius: 31, count: 44, phase: 5.3, palette: 0 },
  { x: 378, y: 259, radius: 22, count: 29, phase: 0.9, palette: 1 },
  { x: 71, y: 244, radius: 29, count: 40, phase: 3.4, palette: 0 },
  { x: 13, y: 168, radius: 64, count: 200, phase: 4.8, palette: 0 },
], {
  label: "Duckweed patches",
  countFrom: ["duckweed", "visiblePatchCount"],
  max: MAX_DUCKWEED_PATCHES,
  effect: "duckweed:rebuild",
  create: (live) => {
    const l = live as { duckweed: ValueOf<typeof duckweed> };
    const randomInt = (min: number, maxExclusive: number): number =>
      Math.floor(min + Math.random() * (maxExclusive - min));
    const rounded = (min: number, max: number): number => Number((min + Math.random() * (max - min)).toFixed(2));
    return {
      ...randomEdgePosition(),
      radius: randomInt(18, 43),
      count: randomInt(18, 33),
      phase: rounded(0, Math.PI * 2),
      palette: randomInt(0, l.duckweed.palettes.length),
    };
  },
});

// ---- butterflies -------------------------------------------------------

const butterflyPalette = group({
  wing: color({ default: 0xffffff }),
  wingLight: color({ default: 0xffffff }),
  accent: color({ default: 0xffffff }),
  body: color({ default: 0xffffff }),
});

const butterflies = group(
  {
    visibleCount: num({ default: 4, min: 0, max: 12, step: 1, int: true }),
    edgeMargin: num({ default: 14, min: 0, max: 100, step: 1 }),
    bodyLength: num({ default: 3.8, min: 0, max: 20, step: 0.1 }),
    bodyWidth: num({ default: 0.32, min: 0, max: 5, step: 0.01 }),
    headRadius: num({ default: 0.72, min: 0, max: 5, step: 0.01 }),
    wingLength: num({ default: 4.7, min: 0, max: 20, step: 0.1 }),
    wingWidth: num({ default: 5.4, min: 0, max: 20, step: 0.1 }),
    wingSpotRadius: num({ default: 0.58, min: 0, max: 5, step: 0.01 }),
    minimumSpeed: num({ default: 8.5, min: 0, max: 100, step: 0.5 }),
    maximumSpeed: num({ default: 30.5, min: 0, max: 100, step: 0.5 }),
    flowerApproachSpeed: num({ default: 18, min: 0, max: 100, step: 0.5 }),
    turnResponsiveness: num({ default: 3.4, min: 0, max: 20, step: 0.01 }),
    wanderTargetDistance: range({ default: [42, 105], min: 0, max: 300, step: 1 }),
    wanderTargetTurnRange: num({ default: 2.2, min: 0, max: TAU, step: 0.01 }),
    randomTurnInterval: range({ default: [0.32, 1.15], min: 0, max: 30, step: 0.01 }),
    randomTurnAngle: num({ default: 0.72, min: 0, max: TAU, step: 0.01 }),
    sharpTurnChance: num({ default: 0.18, min: 0, max: 1, step: 0.01 }),
    sharpTurnAngle: num({ default: 1.45, min: 0, max: TAU, step: 0.01 }),
    turnSmoothing: num({ default: 3.1, min: 0, max: 20, step: 0.01 }),
    curvedFlightStrength: num({ default: 0.34, min: 0, max: 5, step: 0.01 }),
    curvedFlightFrequency: range({ default: [0.65, 1.35], min: 0, max: 10, step: 0.01 }),
    speedVariation: num({ default: 0.27, min: 0, max: 2, step: 0.01 }),
    flowerArrivalRadius: num({ default: 7.5, min: 0, max: 50, step: 0.1 }),
    flowerOrbitRadius: range({ default: [7, 12], min: 0, max: 50, step: 0.1 }),
    flowerOrbitSpeed: range({ default: [0.9, 1.5], min: 0, max: 10, step: 0.01 }),
    wanderDuration: range({ default: [3.8, 7.4], min: 0, max: 60, step: 0.05 }),
    flowerVisitDuration: range({ default: [2.2, 4.6], min: 0, max: 60, step: 0.05 }),
    flowerRestDuration: range({ default: [0.8, 1.8], min: 0, max: 60, step: 0.05 }),
    flowerVisitChance: num({ default: 0.92, min: 0, max: 1, step: 0.01 }),
    flapSpeed: range({ default: [17.5, 31.5], min: 0, max: 100, step: 0.5 }),
    driftAmount: num({ default: 1.3, min: 0, max: 10, step: 0.01 }),
    shadow: group({
      color: color({ default: 0x17372f }),
      opacity: num({ default: 0.2, min: 0, max: 1, step: 0.01 }),
      offset: offsetGroup(2.4, 3.2),
      scale: num({ default: 0.82, min: 0, max: 3, step: 0.01 }),
    }),
    palettes: list(butterflyPalette, [
      { wing: 0xf3a64c, wingLight: 0xffd36b, accent: 0x75448b, body: 0x3e2d35 },
      { wing: 0x71bce8, wingLight: 0xb8e4f5, accent: 0x315b9d, body: 0x293747 },
      { wing: 0xe9789d, wingLight: 0xffb4c5, accent: 0x8f416b, body: 0x49303c },
      { wing: 0xc4df58, wingLight: 0xeaf68a, accent: 0x508c61, body: 0x334239 },
    ]),
  },
  { label: "Butterflies", effect: "butterflies:keep" },
);

const butterflySpawnItem = group({
  x: num({ default: 0, min: -80, max: 560, step: 1 }),
  y: num({ default: 0, min: -80, max: 350, step: 1 }),
  phase: num({ default: 0, min: -TAU, max: TAU, step: 0.01 }),
  palette: index({ default: 0, of: ["butterflies", "palettes"] }),
});

const butterflySpawns = collection(butterflySpawnItem, [
  { x: 56, y: 61, phase: 0.2, palette: 0 },
  { x: 416, y: 71, phase: 1.9, palette: 1 },
  { x: 394, y: 214, phase: 3.6, palette: 2 },
  { x: 101, y: 218, phase: 5.2, palette: 3 },
  { x: 244, y: 30, phase: 0.9, palette: 1 },
  { x: 252, y: 242, phase: 4.4, palette: 0 },
], {
  label: "Butterfly spawns",
  countFrom: ["butterflies", "visibleCount"],
  max: 24,
  // Growing follows the count field's own tag (butterflies:keep, preserving
  // movement); a *direct* edit of an existing spawn respawns instead.
  effect: "butterflies:respawn",
  create: (live) => {
    const l = live as { butterflies: ValueOf<typeof butterflies> };
    const randomInt = (min: number, maxExclusive: number): number =>
      Math.floor(min + Math.random() * (maxExclusive - min));
    const rounded = (min: number, max: number): number => Number((min + Math.random() * (max - min)).toFixed(2));
    return {
      x: randomInt(24, LAYOUT.width - 23),
      y: randomInt(24, LAYOUT.height - 23),
      phase: rounded(0, Math.PI * 2),
      palette: randomInt(0, l.butterflies.palettes.length),
    };
  },
});

// ---- root ---------------------------------------------------------------

export const definition = group({
  koi,
  "koi-palettes": koiPalettes,
  "koi-patterns": koiPatterns,
  "tiny-fish": tinyFish,
  "tiny-fish-schools": tinyFishSchools,
  "pond-bed": pondBed,
  water,
  ripples,
  lotus,
  "lotus-leaves": lotusLeaves,
  "lotus-flowers": lotusFlowers,
  duckweed,
  "duckweed-patches": duckweedPatches,
  butterflies,
  "butterfly-spawns": butterflySpawns,
});

export type SettingsValues = ValueOf<typeof definition>;
export type SectionId = keyof SettingsValues & string;
export const SECTION_IDS = Object.keys(definition.children) as SectionId[];

export type KoiPaletteSetting = ValueOf<typeof koiPalette>;
export type KoiPatchSetting = ValueOf<typeof koiPatch>;
export type TinyFishSchoolSetting = ValueOf<typeof tinyFishSchoolItem>;
export type LotusLeafSetting = ValueOf<typeof lotusLeafItem>;
export type LotusFlowerSetting = ValueOf<typeof lotusFlowerItem>;
export type DuckweedPatchSetting = ValueOf<typeof duckweedPatchItem>;
export type ButterflySpawnSetting = ValueOf<typeof butterflySpawnItem>;
export type Rgb = readonly [number, number, number];

// Section-group labels used by the advanced-controls UI (was CONFIG_GROUPS).
export interface SettingsGroup {
  id: string;
  title: string;
  description: string;
  sectionIds: readonly SectionId[];
}

export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  { id: "koi", title: "Koi", description: "Fish behavior, palettes, and body markings.", sectionIds: ["koi", "koi-palettes", "koi-patterns"] },
  { id: "tiny-fish", title: "Tiny fish", description: "School behavior, appearance, and placement.", sectionIds: ["tiny-fish", "tiny-fish-schools"] },
  { id: "water", title: "Water", description: "Pond bed, currents, tint, and ripple behavior.", sectionIds: ["pond-bed", "water", "ripples"] },
  { id: "lotus", title: "Lotus", description: "Leaves, flowers, palettes, and placement.", sectionIds: ["lotus", "lotus-leaves", "lotus-flowers"] },
  { id: "duckweed", title: "Duckweed", description: "Leaf appearance and floating patches.", sectionIds: ["duckweed", "duckweed-patches"] },
  { id: "butterflies", title: "Butterflies", description: "Flight behavior, colors, and spawn points.", sectionIds: ["butterflies", "butterfly-spawns"] },
];

export const SECTION_TITLES: Record<SectionId, string> = {
  koi: "Koi",
  "koi-palettes": "Koi palettes",
  "koi-patterns": "Koi markings",
  "tiny-fish": "Tiny fish",
  "tiny-fish-schools": "Tiny fish schools",
  "pond-bed": "Pond bed",
  water: "Water",
  ripples: "Ripples",
  lotus: "Lotus",
  "lotus-leaves": "Lotus placements",
  "lotus-flowers": "Lotus flowers",
  duckweed: "Duckweed",
  "duckweed-patches": "Duckweed patches",
  butterflies: "Butterflies",
  "butterfly-spawns": "Butterfly spawns",
};

export const SECTION_DESCRIPTIONS: Record<SectionId, string> = {
  koi: "Population, depth, feeding, shadows, and call response.",
  "koi-palettes": "Body, marking, and fin colors for each koi family.",
  "koi-patterns": "Placement and shape of the colored body patches.",
  "tiny-fish": "Schooling, flee behavior, proportions, and colors.",
  "tiny-fish-schools": "Population, origin, spread, and palette per school.",
  "pond-bed": "Base water-bed colors, grain, and edge depth.",
  water: "Current layers, distortion, and tint.",
  ripples: "Touch, rain, and koi-mouth ripples plus rainfall frequency.",
  lotus: "Leaf and flower geometry, drift, shadows, and palettes.",
  "lotus-leaves": "Position, scale, rotation, and palette for every leaf.",
  "lotus-flowers": "Leaf attachment, position, size, and palette.",
  duckweed: "Leaf size, drift, shadows, and green palettes.",
  "duckweed-patches": "Population, spread, and origin of each patch.",
  butterflies: "Flight, flower visits, proportions, and colors.",
  "butterfly-spawns": "Initial position, phase, and palette per butterfly.",
};
