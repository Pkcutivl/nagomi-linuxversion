import * as THREE from "three";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FISH,
  KOI_PALETTES,
  MAX_FISH,
  SPINE_NODES,
} from "./config";
import { ButterflyPass } from "./butterflies";
import { DuckweedPass } from "./duckweed";
import {
  createFishAppearance,
  patchesFor,
  type FishAppearance,
} from "./fish-appearance";
import { Koi, SwimState } from "./koi";
import { LotusLeavesPass } from "./lotus-leaves";
import {
  add,
  fromAngle,
  lerp,
  mul,
  normalize,
  perpendicular,
  sub,
  type Vec2,
} from "./math";
import { PondBedPass } from "./pond-bed";
import { School } from "./school";
import { SurfaceDisturbancePass } from "./surface-disturbance";
import { TinyFishRenderer } from "./tiny-fish-renderer";
import { WaterSurfacePass } from "./water-surface";
import { WeatherPass } from "./weather-pass";
import type { WeatherPresetId } from "./weather";

const TRIANGLE_FLOAT_CAPACITY = 72_000;
const LINE_FLOAT_CAPACITY = 18_000;
const DEFAULT_COLOR = new THREE.Color(0xffffff);

const shadowVertexShader = /* glsl */ `
  varying float vStrength;
  void main() {
    vStrength = color.r;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const shadowFragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vStrength;
  void main() {
    gl_FragColor = vec4(uColor, uOpacity * vStrength);
  }
`;

function shadowMaterial(opacity: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(FISH.shadow.color) },
      uOpacity: { value: opacity },
    },
    vertexShader: shadowVertexShader,
    fragmentShader: shadowFragmentShader,
    vertexColors: true,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

class GeometryBatch {
  private readonly values: Float32Array;
  private readonly attribute: THREE.BufferAttribute;
  private readonly colorValues?: Float32Array;
  private readonly colorAttribute?: THREE.BufferAttribute;
  private cursor = 0;
  private previewOrigin: Vec2 | null = null;
  private previewScale = 1;

  public constructor(
    private readonly geometry: THREE.BufferGeometry,
    capacity: number,
    includeColors = false,
  ) {
    this.values = new Float32Array(capacity);
    this.attribute = new THREE.BufferAttribute(this.values, 3);
    this.attribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", this.attribute);
    this.geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.5, 0),
      Math.hypot(CANVAS_WIDTH, CANVAS_HEIGHT),
    );
    if (includeColors) {
      this.colorValues = new Float32Array(capacity);
      this.colorAttribute = new THREE.BufferAttribute(this.colorValues, 3);
      this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute("color", this.colorAttribute);
    }
  }

  public reset(): void {
    this.cursor = 0;
  }

  public setPreviewTransform(origin: Vec2 | null, scale = 1): void {
    this.previewOrigin = origin;
    this.previewScale = scale;
  }

  public point(point: Vec2, color: THREE.Color = DEFAULT_COLOR): void {
    if (this.cursor + 3 > this.values.length) return;
    this.values[this.cursor] = this.previewOrigin
      ? CANVAS_WIDTH * 0.5 + (point.x - this.previewOrigin.x) * this.previewScale
      : point.x;
    this.values[this.cursor + 1] = this.previewOrigin
      ? CANVAS_HEIGHT * 0.5 + (point.y - this.previewOrigin.y) * this.previewScale
      : point.y;
    this.values[this.cursor + 2] = 0;
    if (this.colorValues) {
      this.colorValues[this.cursor] = color.r;
      this.colorValues[this.cursor + 1] = color.g;
      this.colorValues[this.cursor + 2] = color.b;
    }
    this.cursor += 3;
  }

  public triangle(a: Vec2, b: Vec2, c: Vec2, color: THREE.Color = DEFAULT_COLOR): void {
    this.point(a, color);
    this.point(b, color);
    this.point(c, color);
  }

  public line(a: Vec2, b: Vec2, color: THREE.Color = DEFAULT_COLOR): void {
    this.point(a, color);
    this.point(b, color);
  }

  public circle(
    center: Vec2,
    radius: number,
    color: THREE.Color = DEFAULT_COLOR,
    segments = 12,
  ): void {
    for (let index = 0; index < segments; index += 1) {
      const angleA = (index / segments) * Math.PI * 2;
      const angleB = ((index + 1) / segments) * Math.PI * 2;
      this.triangle(
        center,
        add(center, mul(fromAngle(angleA), radius)),
        add(center, mul(fromAngle(angleB), radius)),
        color,
      );
    }
  }

  public ellipse(
    center: Vec2,
    forward: Vec2,
    normal: Vec2,
    forwardRadius: number,
    sideRadius: number,
    color: THREE.Color,
    phase: number,
    segments = 10,
  ): void {
    const pointAt = (angle: number): Vec2 => {
      const wobble =
        1 +
        Math.sin(angle * 3 + phase) * 0.08 +
        Math.cos(angle * 2 - phase * 0.7) * 0.045;
      return add(
        add(center, mul(forward, Math.cos(angle) * forwardRadius * wobble)),
        mul(normal, Math.sin(angle) * sideRadius * wobble),
      );
    };

    for (let index = 0; index < segments; index += 1) {
      const angleA = (index / segments) * Math.PI * 2;
      const angleB = ((index + 1) / segments) * Math.PI * 2;
      this.triangle(center, pointAt(angleA), pointAt(angleB), color);
    }
  }

  public commit(): void {
    this.geometry.setDrawRange(0, this.cursor / 3);
    this.attribute.clearUpdateRanges();
    this.attribute.addUpdateRange(0, this.cursor);
    this.attribute.needsUpdate = true;
    if (this.colorAttribute) {
      this.colorAttribute.clearUpdateRanges();
      this.colorAttribute.addUpdateRange(0, this.cursor);
      this.colorAttribute.needsUpdate = true;
    }
  }
}

export class FishRenderer {
  public readonly canvas: HTMLCanvasElement;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly bedScene = new THREE.Scene();
  private readonly shadowScene = new THREE.Scene();
  private readonly fishShadowScene = new THREE.Scene();
  private readonly fishScene = new THREE.Scene();
  private readonly surfaceScene = new THREE.Scene();
  private readonly surfaceShadowScene = new THREE.Scene();
  private readonly surfaceObjectScene = new THREE.Scene();
  private readonly weatherScene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(
    0,
    CANVAS_WIDTH,
    0,
    CANVAS_HEIGHT,
    -10,
    10,
  );
  private readonly surfaceCamera = new THREE.Camera();
  private readonly underwaterTarget: THREE.WebGLRenderTarget;
  private readonly compositeTarget: THREE.WebGLRenderTarget;
  private readonly pondBed: PondBedPass;
  private readonly surfaceDisturbance = new SurfaceDisturbancePass();
  private readonly waterSurface: WaterSurfacePass;
  private readonly weather: WeatherPass;
  private readonly tinyFishRenderer = new TinyFishRenderer();
  private readonly duckweed = new DuckweedPass();
  private readonly lotusLeaves = new LotusLeavesPass();
  private readonly butterflies = new ButterflyPass();
  private readonly fishShadowMaterial = shadowMaterial(1);
  private readonly shadowTriangles: GeometryBatch;
  private readonly outerTriangles: GeometryBatch;
  private readonly bodyTriangles: GeometryBatch;
  private readonly outlineLines: GeometryBatch;
  private readonly appearances = Array.from(
    { length: MAX_FISH },
    (_, index) => createFishAppearance(index),
  );
  private readonly depthAppearances = Array.from(
    { length: MAX_FISH },
    (_, index) => createFishAppearance(index),
  );
  private readonly shadowStrengthColor = new THREE.Color();
  private readonly targetFishShadowColor = new THREE.Color(FISH.shadow.color);
  private previousAppearanceTime = -1;
  private currentVisualDepth = 0;
  private previewFamilyIndex: number | null = null;

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT, false);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.underwaterTarget = new THREE.WebGLRenderTarget(CANVAS_WIDTH, CANVAS_HEIGHT, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.underwaterTarget.texture.generateMipmaps = false;

    this.compositeTarget = new THREE.WebGLRenderTarget(CANVAS_WIDTH, CANVAS_HEIGHT, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.compositeTarget.texture.generateMipmaps = false;

    this.pondBed = new PondBedPass();
    this.waterSurface = new WaterSurfacePass(
      this.underwaterTarget.texture,
      this.surfaceDisturbance.texture,
    );
    this.weather = new WeatherPass(this.compositeTarget.texture);
    this.bedScene.add(this.pondBed.mesh);
    this.shadowScene.add(
      this.lotusLeaves.shadowGroup,
      this.tinyFishRenderer.shadowGroup,
    );
    this.fishScene.add(this.tinyFishRenderer.group);
    this.surfaceScene.add(this.waterSurface.mesh);
    this.surfaceShadowScene.add(
      this.duckweed.shadowGroup,
      this.butterflies.shadowGroup,
    );
    this.surfaceObjectScene.add(
      this.duckweed.group,
      this.lotusLeaves.group,
      this.butterflies.group,
    );
    this.weatherScene.add(this.weather.mesh);

    const shadowGeometry = new THREE.BufferGeometry();
    const whiteGeometry = new THREE.BufferGeometry();
    const blackGeometry = new THREE.BufferGeometry();
    const lineGeometry = new THREE.BufferGeometry();
    shadowGeometry.name = "fish shadows";
    whiteGeometry.name = "fish silhouettes";
    blackGeometry.name = "fish markings";
    lineGeometry.name = "fish debug lines";
    this.shadowTriangles = new GeometryBatch(
      shadowGeometry,
      TRIANGLE_FLOAT_CAPACITY,
      true,
    );
    this.outerTriangles = new GeometryBatch(whiteGeometry, TRIANGLE_FLOAT_CAPACITY, true);
    this.bodyTriangles = new GeometryBatch(blackGeometry, TRIANGLE_FLOAT_CAPACITY, true);
    this.outlineLines = new GeometryBatch(lineGeometry, LINE_FLOAT_CAPACITY, true);

    const outerMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const bodyMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const shadowMesh = new THREE.Mesh(shadowGeometry, this.fishShadowMaterial);
    const outerMesh = new THREE.Mesh(whiteGeometry, outerMaterial);
    const bodyMesh = new THREE.Mesh(blackGeometry, bodyMaterial);
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    shadowMesh.frustumCulled = false;
    outerMesh.frustumCulled = false;
    bodyMesh.frustumCulled = false;
    lines.frustumCulled = false;
    outerMesh.renderOrder = 1;
    bodyMesh.renderOrder = 2;
    lines.renderOrder = 3;
    this.fishShadowScene.add(shadowMesh);
    this.fishScene.add(outerMesh, bodyMesh, lines);
  }

  public refreshConfig(): void {
    for (const section of [
      "koi", "koi-palettes", "tiny-fish", "pond-bed", "water",
      "lotus", "duckweed", "butterflies",
    ]) this.refreshSection(section);
  }

  public refreshSection(sectionId: string): void {
    switch (sectionId) {
      case "koi":
        this.targetFishShadowColor.setHex(FISH.shadow.color);
        // Eye color and the shared koi palette are baked into appearances.
        this.refreshFishAppearances();
        break;
      case "koi-palettes":
      case "koi-patterns":
        this.refreshFishAppearances();
        break;
      case "tiny-fish":
        this.tinyFishRenderer.refreshConfig();
        break;
      case "pond-bed":
        this.pondBed.refreshConfig();
        break;
      case "water":
        this.waterSurface.refreshConfig();
        break;
      case "lotus":
        this.lotusLeaves.refreshConfig();
        break;
      case "duckweed":
      case "duckweed-patches":
        this.duckweed.refreshConfig();
        break;
      case "butterflies":
        this.butterflies.refreshConfig(true);
        break;
      case "butterfly-spawns":
        this.butterflies.refreshConfig();
        break;
      default:
        break;
    }
  }

  private refreshFishAppearances(): void {
    for (let index = 0; index < this.appearances.length; index += 1) {
      this.appearances[index] = createFishAppearance(index);
      this.depthAppearances[index] = createFishAppearance(index);
    }
  }

  public resize(width: number, height: number, oldWidth: number, oldHeight: number): void {
    this.renderer.setSize(width, height, false);
    this.underwaterTarget.setSize(width, height);
    this.compositeTarget.setSize(width, height);
    this.camera.right = width;
    this.camera.bottom = height;
    this.camera.updateProjectionMatrix();
    this.pondBed.resize(width, height);
    this.surfaceDisturbance.resize(width, height);
    this.waterSurface.resize(width, height);
    this.butterflies.resize(width / oldWidth, height / oldHeight);
  }

  public dispose(): void {
    this.underwaterTarget.dispose();
    this.compositeTarget.dispose();
    this.surfaceDisturbance.dispose();
    this.fishShadowMaterial.dispose();
    this.weather.dispose();
    this.renderer.dispose();
  }

  public setWeatherPreset(id: WeatherPresetId): void {
    this.weather.setPreset(id);
  }

  public setPreviewFamily(index: number | null): void {
    this.previewFamilyIndex = index;
  }

  public draw(school: School, time: number, showDebug: boolean): void {
    if (this.previousAppearanceTime >= 0) {
      const deltaTime = Math.min(
        0.1,
        Math.max(0, time - this.previousAppearanceTime),
      );
      const blend = 1 - Math.exp(-deltaTime * 2.25);
      this.fishShadowMaterial.uniforms.uColor.value.lerp(
        this.targetFishShadowColor,
        blend,
      );
    }
    this.previousAppearanceTime = time;
    this.shadowTriangles.reset();
    this.outerTriangles.reset();
    this.bodyTriangles.reset();
    this.outlineLines.reset();

    const previewIndex = this.previewFamilyIndex;
    let selectedFishIndex = 0;
    if (previewIndex !== null) {
      for (let index = 0; index < school.count; index += 1) {
        if (
          index % KOI_PALETTES.length === previewIndex &&
          (index + 1) % FISH.tinyEvery !== 0
        ) {
          selectedFishIndex = index;
          break;
        }
      }
    }
    const transformOrigin = previewIndex === null
      ? null
      : school.fish[selectedFishIndex].position;
    for (const batch of [this.shadowTriangles, this.outerTriangles, this.bodyTriangles, this.outlineLines]) {
      batch.setPreviewTransform(transformOrigin, previewIndex === null ? 1 : 1.6);
    }

    for (let index = 0; index < school.count; index += 1) {
      if (previewIndex !== null && index !== selectedFishIndex) continue;
      const fish = school.fish[index];
      this.buildRenderSpine(fish);
      const appearanceIndex = previewIndex ?? index;
      const appearance = this.depthAppearances[appearanceIndex];
      this.updateDepthAppearance(fish, this.appearances[appearanceIndex], appearance);
      this.drawKoi(fish, appearance);
      if (showDebug) this.drawDebug(fish, appearance);
    }

    this.shadowTriangles.commit();
    this.outerTriangles.commit();
    this.bodyTriangles.commit();
    this.outlineLines.commit();
    this.tinyFishRenderer.group.visible = previewIndex === null;
    this.tinyFishRenderer.shadowGroup.visible = previewIndex === null;
    if (previewIndex === null) this.tinyFishRenderer.update(school.tinyFish);
    this.pondBed.update(time);
    this.surfaceDisturbance.render(
      this.renderer,
      school,
      time,
      previewIndex === null ? null : selectedFishIndex,
    );
    this.waterSurface.update(school, time);
    this.duckweed.update(time, school.ripples);
    this.lotusLeaves.update(time);
    this.butterflies.update(time);

    this.renderer.setRenderTarget(this.underwaterTarget);
    this.renderer.clear();
    this.renderer.autoClear = false;
    this.renderer.render(this.bedScene, this.camera);
    this.renderer.render(this.shadowScene, this.camera);
    this.renderer.render(this.fishShadowScene, this.camera);
    this.renderer.render(this.fishScene, this.camera);
    this.renderer.autoClear = true;
    this.renderer.setRenderTarget(this.compositeTarget);
    this.renderer.clear();
    this.renderer.render(this.surfaceScene, this.surfaceCamera);
    this.renderer.autoClear = false;
    this.renderer.render(this.surfaceShadowScene, this.camera);
    this.renderer.render(this.surfaceObjectScene, this.camera);
    this.renderer.autoClear = true;
    this.weather.update(time);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.weatherScene, this.surfaceCamera);
  }

  private buildRenderSpine(fish: Koi): void {
    fish.renderSpine[0] = { ...fish.spine[0] };
    for (let node = 1; node < SPINE_NODES; node += 1) {
      const t = node / (SPINE_NODES - 1);
      const previous = Math.max(0, node - 1);
      const next = Math.min(SPINE_NODES - 1, node + 1);
      const tangent = normalize(
        sub(fish.spine[previous], fish.spine[next]),
        fromAngle(fish.heading),
      );
      const normal = perpendicular(tangent);
      const waveEnvelope = Math.pow(t, 1.72);
      const wave =
        Math.sin(fish.swimPhase - t * 6.1) *
        fish.bodyWidth *
        1.15 *
        waveEnvelope *
        (0.08 + fish.tailEffort * 0.92);
      fish.renderSpine[node] = add(fish.spine[node], mul(normal, wave));
    }
  }

  private widthAt(fish: Koi, node: number): number {
    const t = node / (SPINE_NODES - 1);
    const profile =
      t < 0.18
        ? 0.73 + (t / 0.18) * 0.27
        : Math.pow(Math.max(0, 1 - (t - 0.18) / 0.82), 0.72);
    return Math.max(0.7, fish.bodyWidth * profile);
  }

  private visualDepth(depth: number): number {
    const range = Math.max(FISH.depth.visualEnd - FISH.depth.visualStart, 0.001);
    const linear = Math.max(
      0,
      Math.min(1, (depth - FISH.depth.visualStart) / range),
    );
    return linear * linear * (3 - 2 * linear);
  }

  private updateDepthAppearance(
    fish: Koi,
    source: FishAppearance,
    target: FishAppearance,
  ): void {
    const visualDepth = this.visualDepth(fish.depth);
    this.applyDepthColor(source.base, target.base, visualDepth);
    this.applyDepthColor(source.accent, target.accent, visualDepth);
    this.applyDepthColor(source.marking, target.marking, visualDepth);
    this.applyDepthColor(source.fin, target.fin, visualDepth);
    this.applyDepthColor(source.eye, target.eye, visualDepth);
  }

  private applyDepthColor(
    source: THREE.Color,
    target: THREE.Color,
    visualDepth: number,
  ): void {
    const brightness = 1 + (FISH.depth.deepBrightness - 1) * visualDepth;
    const saturation = 1 + (FISH.depth.deepSaturation - 1) * visualDepth;
    const luminance = source.r * 0.2126 + source.g * 0.7152 + source.b * 0.0722;
    const [tintR, tintG, tintB] = FISH.depth.deepWaterTint;
    target.setRGB(
      (luminance + (source.r - luminance) * saturation) *
        brightness *
        (1 + (tintR - 1) * visualDepth),
      (luminance + (source.g - luminance) * saturation) *
        brightness *
        (1 + (tintG - 1) * visualDepth),
      (luminance + (source.b - luminance) * saturation) *
        brightness *
        (1 + (tintB - 1) * visualDepth),
    );
  }

  private addShadowTriangle(a: Vec2, b: Vec2, c: Vec2): void {
    const shadowOffset = {
      x:
        FISH.shadow.offset.x +
        FISH.shadow.depthOffset.x * this.currentVisualDepth,
      y:
        FISH.shadow.offset.y +
        FISH.shadow.depthOffset.y * this.currentVisualDepth,
    };
    const opacity =
      FISH.shadow.surfaceOpacity +
      (FISH.shadow.deepOpacity - FISH.shadow.surfaceOpacity) *
        this.currentVisualDepth;
    this.shadowStrengthColor.setRGB(
      opacity,
      opacity,
      opacity,
    );
    this.shadowTriangles.triangle(
      add(a, shadowOffset),
      add(b, shadowOffset),
      add(c, shadowOffset),
      this.shadowStrengthColor,
    );
  }

  private addShadowCircle(center: Vec2, radius: number): void {
    const shadowOffset = {
      x:
        FISH.shadow.offset.x +
        FISH.shadow.depthOffset.x * this.currentVisualDepth,
      y:
        FISH.shadow.offset.y +
        FISH.shadow.depthOffset.y * this.currentVisualDepth,
    };
    const opacity =
      FISH.shadow.surfaceOpacity +
      (FISH.shadow.deepOpacity - FISH.shadow.surfaceOpacity) *
        this.currentVisualDepth;
    this.shadowStrengthColor.setRGB(
      opacity,
      opacity,
      opacity,
    );
    this.shadowTriangles.circle(
      add(center, shadowOffset),
      radius,
      this.shadowStrengthColor,
    );
  }

  private silhouetteTriangle(
    a: Vec2,
    b: Vec2,
    c: Vec2,
    color: THREE.Color,
  ): void {
    this.addShadowTriangle(a, b, c);
    this.outerTriangles.triangle(a, b, c, color);
  }

  private silhouetteCircle(center: Vec2, radius: number, color: THREE.Color): void {
    this.addShadowCircle(center, radius);
    this.outerTriangles.circle(center, radius, color);
  }

  private drawKoi(fish: Koi, appearance: FishAppearance): void {
    this.currentVisualDepth = this.visualDepth(fish.depth);
    const left: Vec2[] = [];
    const right: Vec2[] = [];

    for (let node = 0; node < SPINE_NODES; node += 1) {
      const previous = Math.max(0, node - 1);
      const next = Math.min(SPINE_NODES - 1, node + 1);
      const tangent = normalize(
        sub(fish.renderSpine[previous], fish.renderSpine[next]),
        fromAngle(fish.heading),
      );
      const normal = perpendicular(tangent);
      const halfWidth = this.widthAt(fish, node);
      left[node] = add(fish.renderSpine[node], mul(normal, halfWidth));
      right[node] = add(fish.renderSpine[node], mul(normal, -halfWidth));
    }

    const pectoralFront = 3;
    const pectoralCenter = 4;
    const pectoralBack = 6;
    const pectoralTangent = normalize(
      sub(fish.renderSpine[pectoralCenter - 1], fish.renderSpine[pectoralCenter + 1]),
      fromAngle(fish.heading),
    );
    const pectoralNormal = perpendicular(pectoralTangent);
    const gulpProgress =
      fish.gulpAnimation / Math.max(FISH.feeding.animationDurationSeconds, 0.001);
    const gulpPaddle = Math.sin(Math.PI * gulpProgress) * 0.85;
    const paddleActivity =
      (fish.state === SwimState.Hover ? 1 : fish.state === SwimState.Pivot ? 0.85 : 0.45)
      + gulpPaddle;
    const finPulse =
      0.82 +
      paddleActivity * 0.25 * Math.sin(fish.swimPhase * 0.64 + fish.phaseOffset);
    const pectoralReach =
      fish.bodyWidth * (0.55 + paddleActivity * 0.25) * finPulse;
    const leftPectoral = add(
      add(left[pectoralCenter], mul(pectoralNormal, pectoralReach)),
      mul(pectoralTangent, -fish.bodyWidth * 0.22),
    );
    const rightPectoral = add(
      add(right[pectoralCenter], mul(pectoralNormal, -pectoralReach)),
      mul(pectoralTangent, -fish.bodyWidth * 0.22),
    );
    this.silhouetteTriangle(
      left[pectoralFront],
      leftPectoral,
      left[pectoralBack],
      appearance.fin,
    );
    this.silhouetteTriangle(
      right[pectoralFront],
      right[pectoralBack],
      rightPectoral,
      appearance.fin,
    );

    const pelvicFront = 7;
    const pelvicCenter = 8;
    const pelvicBack = 9;
    const pelvicTangent = normalize(
      sub(fish.renderSpine[pelvicCenter - 1], fish.renderSpine[pelvicCenter + 1]),
      fromAngle(fish.heading),
    );
    const pelvicNormal = perpendicular(pelvicTangent);
    const pelvicReach = fish.bodyWidth * (0.28 + 0.05 * finPulse);
    const leftPelvic = add(left[pelvicCenter], mul(pelvicNormal, pelvicReach));
    const rightPelvic = add(right[pelvicCenter], mul(pelvicNormal, -pelvicReach));
    this.silhouetteTriangle(
      left[pelvicFront],
      leftPelvic,
      left[pelvicBack],
      appearance.fin,
    );
    this.silhouetteTriangle(
      right[pelvicFront],
      right[pelvicBack],
      rightPelvic,
      appearance.fin,
    );

    for (let node = SPINE_NODES - 2; node >= 0; node -= 1) {
      this.silhouetteTriangle(
        left[node],
        right[node],
        right[node + 1],
        appearance.base,
      );
      this.silhouetteTriangle(
        left[node],
        right[node + 1],
        left[node + 1],
        appearance.base,
      );
    }

    const headForward = normalize(
      sub(fish.renderSpine[0], fish.renderSpine[1]),
      fromAngle(fish.heading),
    );
    const headNormal = perpendicular(headForward);
    const noseCenter = add(fish.renderSpine[0], mul(headForward, fish.bodyWidth * 0.43));
    const noseHalfWidth = this.widthAt(fish, 0) * 0.72;
    const noseLeft = add(noseCenter, mul(headNormal, noseHalfWidth));
    const noseRight = add(noseCenter, mul(headNormal, -noseHalfWidth));
    this.silhouetteTriangle(left[0], noseLeft, noseRight, appearance.base);
    this.silhouetteTriangle(left[0], noseRight, right[0], appearance.base);
    this.silhouetteCircle(
      noseCenter,
      Math.max(1, noseHalfWidth * 0.72),
      appearance.base,
    );

    const tailNode = SPINE_NODES - 1;
    const tailForward = normalize(
      sub(fish.renderSpine[tailNode - 1], fish.renderSpine[tailNode]),
      fromAngle(fish.heading),
    );
    const tailNormal = perpendicular(tailForward);
    const tailBackward = mul(tailForward, -1);
    const tailSpread =
      fish.bodyWidth * (0.58 + 0.08 * Math.sin(fish.swimPhase - 0.8));
    const upperFin = add(
      add(fish.renderSpine[tailNode], mul(tailBackward, fish.bodyWidth * 1.38)),
      mul(tailNormal, tailSpread),
    );
    const lowerFin = add(
      add(fish.renderSpine[tailNode], mul(tailBackward, fish.bodyWidth * 1.38)),
      mul(tailNormal, -tailSpread),
    );
    const tailNotch = add(
      fish.renderSpine[tailNode],
      mul(tailBackward, fish.bodyWidth * 0.86),
    );
    this.silhouetteTriangle(
      fish.renderSpine[tailNode],
      upperFin,
      tailNotch,
      appearance.fin,
    );
    this.silhouetteTriangle(
      fish.renderSpine[tailNode],
      tailNotch,
      lowerFin,
      appearance.fin,
    );

    // Pattern positions are authored in normalized body space. The shapes sample
    // the live spine, so they stay attached when the fish bends and turns.
    for (const [patchIndex, patch] of patchesFor(appearance).entries()) {
      const spinePosition = patch.position * (SPINE_NODES - 1);
      const node = Math.min(SPINE_NODES - 2, Math.floor(spinePosition));
      const amount = spinePosition - node;
      const center = lerp(fish.renderSpine[node], fish.renderSpine[node + 1], amount);
      const previous = Math.max(0, node - 1);
      const next = Math.min(SPINE_NODES - 1, node + 2);
      const forward = normalize(
        sub(fish.renderSpine[previous], fish.renderSpine[next]),
        fromAngle(fish.heading),
      );
      const normal = perpendicular(forward);
      const localWidth =
        this.widthAt(fish, node) * (1 - amount) +
        this.widthAt(fish, node + 1) * amount;
      const patchCenter = add(center, mul(normal, localWidth * patch.offset));
      const patchColor =
        patch.color === "accent" ? appearance.accent : appearance.marking;

      this.bodyTriangles.ellipse(
        patchCenter,
        forward,
        normal,
        fish.bodyLength * patch.length,
        localWidth * patch.width,
        patchColor,
        patchIndex * 1.73 + patch.position * 5.1,
      );
    }

    const eyeAnchor = add(
      fish.renderSpine[0],
      mul(headForward, fish.bodyWidth * 0.08),
    );
    const eyeOffset = this.widthAt(fish, 0) * 0.58;
    const eyeRadius = Math.max(0.58, fish.bodyWidth * 0.11);
    this.bodyTriangles.circle(
      add(eyeAnchor, mul(headNormal, eyeOffset)),
      eyeRadius,
      appearance.eye,
      6,
    );
    this.bodyTriangles.circle(
      add(eyeAnchor, mul(headNormal, -eyeOffset)),
      eyeRadius,
      appearance.eye,
      6,
    );
  }

  private drawDebug(fish: Koi, appearance: FishAppearance): void {
    for (let node = 0; node < SPINE_NODES - 1; node += 1) {
      this.outlineLines.line(
        fish.renderSpine[node],
        fish.renderSpine[node + 1],
        appearance.eye,
      );
    }
  }
}
