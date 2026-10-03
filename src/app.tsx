import {
  Cloud,
  CloudFog,
  CloudRain,
  EyeOff,
  Gauge,
  Maximize2,
  Minus,
  Minimize2,
  Moon,
  Plus,
  RotateCcw,
  Settings2,
  Shuffle,
  Sun,
  Sunset as SunsetIcon,
  Undo2,
  Volume2,
  Waves,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { GitHubStars } from "@/components/github-stars";
import { WallpaperAppLink } from "@/components/wallpaper-app-link";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AUDIO } from "./audio-config";
import { ConfigEditor } from "./config-editor";
import {
  CANVAS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FISH,
  FIXED_STEP,
  setCanvasSize,
} from "./config";
import { FishRenderer } from "./fish-renderer";
import { createFrameLimiter } from "./frame-limiter";
import { useIsMobile } from "./hooks/use-mobile";
import { clamp, vec } from "./math";
import {
  FRAME_RATE_OPTIONS,
  effectiveFrameRate,
  frameRateOption,
  isFrameRateCap,
  loadPerformancePrefs,
  savePerformancePrefs,
  type PerformancePrefs,
} from "./performance-prefs";
import { connectSettingsEffects } from "./settings/effects";
import { connectPersistence, loadInto } from "./settings/persistence";
import { useSettingsMeta } from "./settings/react";
import { settings } from "./settings/store";
import type { SectionId } from "./settings/definition";
import { School } from "./school";
import {
  DEFAULT_WEATHER_PRESET_ID,
  getWeatherPreset,
  WEATHER_PRESETS,
  type WeatherPresetId,
} from "./weather";
import { initLinuxMod } from "./linux-mod";

interface SceneStats {
  koi: number;
}

interface PondRuntime {
  school: School;
  renderer: FishRenderer;
  showDebug: boolean;
}

const emptyStats: SceneStats = {
  koi: FISH.initialCount,
};

const AMBIENT_IDLE_DELAY_MS = 2400;
const GITHUB_REPOSITORY = "msk1039/procedural-koi-threejs";
const WALLPAPER_APP_URL = "https://nagomi.m4yank.com/";

// Restores v2 (or migrates v1) localStorage settings into the store before
if (typeof localStorage !== "undefined") {
  localStorage.removeItem("nagomi:pond-settings:v2");
  localStorage.removeItem("nagomi:pond-settings:v1");
}
loadInto(settings);
connectPersistence(settings);

function pondRenderSize(display: HTMLElement): { width: number; height: number } {
  const { width, height } = display.getBoundingClientRect();
  const portrait =
    window.matchMedia("(max-width: 700px) and (orientation: portrait)").matches &&
    width > 0 &&
    height > 0;
  if (!portrait) return { width: CANVAS.width, height: CANVAS.height };

  const renderWidth = Math.min(
    CANVAS.width,
    Math.max(CANVAS.height, Math.round(width * 0.7)),
  );
  return {
    width: renderWidth,
    height: Math.max(CANVAS.height, Math.round((renderWidth * height) / width)),
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function sceneStats(runtime: PondRuntime): SceneStats {
  return {
    koi: runtime.school.count,
  };
}

function WeatherIcon({ id }: { id: WeatherPresetId }) {
  switch (id) {
    case "sunny":
      return <Sun aria-hidden="true" />;
    case "deep-clear":
      return <Waves aria-hidden="true" />;
    case "overcast":
      return <Cloud aria-hidden="true" />;
    case "mist":
      return <CloudFog aria-hidden="true" />;
    case "sunset":
      return <SunsetIcon aria-hidden="true" />;
    case "moonlight":
      return <Moon aria-hidden="true" />;
    case "rain":
      return <CloudRain aria-hidden="true" />;
  }
}

export function App() {
  const isMobile = useIsMobile();
  const stageRef = useRef<HTMLElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientAudioContextRef = useRef<AudioContext | null>(null);
  const ambientAudioGainRef = useRef<GainNode | null>(null);
  const ambientAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ambientAudioLoadingRef = useRef<Promise<void> | null>(null);
  const runtimeRef = useRef<PondRuntime | null>(null);
  const ambientModeRef = useRef(false);
  const soundEnabledRef = useRef<boolean>(AUDIO.defaultEnabled);
  const [stats, setStats] = useState<SceneStats>(emptyStats);
  const [showInterface, setShowInterface] = useState(false);
  const [ambientMode, setAmbientMode] = useState(false);
  const [ambientControlsVisible, setAmbientControlsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false);
  const [frameRateMenuOpen, setFrameRateMenuOpen] = useState(false);
  const [performancePrefs, setPerformancePrefs] =
    useState<PerformancePrefs>(loadPerformancePrefs);
  const frameRateCap = effectiveFrameRate(performancePrefs, ambientMode);
  // The render loop reads the cap from a ref so changing it never re-runs the
  // runtime effect (which would dispose and recreate the renderer).
  const frameRateCapRef = useRef(frameRateCap);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    AUDIO.defaultEnabled,
  );
  const settingsMeta = useSettingsMeta();
  const { weather: weatherPreset, rain: rainEnabled, canUndo } = settingsMeta;
  const [selectedFamily, setSelectedFamily] = useState(0);
  const [previewFamily, setPreviewFamily] = useState<number | null>(null);
  const previewFamilyRef = useRef<number | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const scatter = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.school.scatter();
    setStats(sceneStats(runtime));
  }, []);

  const setFamilyPreview = useCallback((index: number | null) => {
    previewFamilyRef.current = index;
    setPreviewFamily(index);
    runtimeRef.current?.renderer.setPreviewFamily(index);
  }, []);

  // Clears the family preview on any settings edit that doesn't keep it
  // (koi-palettes/koi-patterns edits and a few koi body/eye fields do).
  useEffect(() => {
    return settings.subscribe((batch) => {
      if (previewFamilyRef.current === null) return;
      if (batch.some((change) => !change.keepsFamilyPreview)) setFamilyPreview(null);
    });
  }, [setFamilyPreview]);

  // Keeps the koi count readout in sync after a koi:count effect runs
  // (settings/effects.ts calls school.setCount on the next animation frame).
  useEffect(() => {
    return settings.subscribe((batch) => {
      if (!batch.some((change) => change.effect === "koi:count")) return;
      requestAnimationFrame(() => {
        const runtime = runtimeRef.current;
        if (runtime) setStats(sceneStats(runtime));
      });
    });
  }, []);

  const changeKoiCount = useCallback((amount: number) => {
    const current = runtimeRef.current?.school.count ?? settings.live.koi.initialCount;
    settings.set(["koi", "initialCount"], clamp(current + amount, 1, 48));
  }, []);

  const setAmbientModeState = useCallback((active: boolean) => {
    ambientModeRef.current = active;
    setAmbientMode(active);
    setAmbientControlsVisible(true);
  }, []);

  useEffect(() => {
    frameRateCapRef.current = frameRateCap;
  }, [frameRateCap]);

  const changeFrameRate = useCallback((value: string) => {
    if (!isFrameRateCap(value)) return;
    const next: PerformancePrefs = { version: 1, frameRate: value, explicit: true };
    setPerformancePrefs(next);
    savePerformancePrefs(next);
  }, []);

  const toggleAmbientMode = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    if (ambientModeRef.current) {
      setAmbientModeState(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      return;
    }

    setAmbientModeState(true);
    const fullscreenRoot = document.documentElement;
    if (!document.fullscreenElement && fullscreenRoot.requestFullscreen) {
      await fullscreenRoot.requestFullscreen().catch(() => undefined);
    }
  }, [setAmbientModeState]);

  // Keeps the renderer's weather look and the simulation's rain intensity in
  // sync with the store, whether they change via a slider, Undo, or reload.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.renderer.setWeatherPreset(weatherPreset);
  }, [weatherPreset]);
  useEffect(() => {
    runtimeRef.current?.school.setRainIntensity(rainEnabled ? 1 : 0);
  }, [rainEnabled]);

  const startAmbientAudio = useCallback(async (): Promise<void> => {
    if (ambientAudioSourceRef.current) {
      await ambientAudioContextRef.current?.resume();
      return;
    }
    if (ambientAudioLoadingRef.current) {
      await ambientAudioLoadingRef.current;
      return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = soundEnabledRef.current ? AUDIO.ambient.volume : 0;
    gain.connect(context.destination);
    ambientAudioContextRef.current = context;
    ambientAudioGainRef.current = gain;

    const loading = (async (): Promise<void> => {
      await context.resume();
      const loadBuffer = async (path: string): Promise<AudioBuffer> => {
        const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
        if (!response.ok) throw new Error(`Unable to load ${path}`);
        return context.decodeAudioData(await response.arrayBuffer());
      };
      const ambientBuffer = await loadBuffer(AUDIO.ambient.source);
      if (context.state === "closed") return;

      const ambientSource = context.createBufferSource();
      ambientSource.buffer = ambientBuffer;
      ambientSource.loop = true;
      ambientSource.connect(gain);
      ambientSource.start();
      ambientAudioSourceRef.current = ambientSource;
    })();
    ambientAudioLoadingRef.current = loading;
    try {
      await loading;
    } finally {
      ambientAudioLoadingRef.current = null;
    }
  }, []);

  const setAmbientSoundEnabled = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled;
    setSoundEnabled(enabled);
    if (enabled) void startAmbientAudio().catch(() => undefined);

    const context = ambientAudioContextRef.current;
    const gain = ambientAudioGainRef.current;
    if (context && gain) {
      const now = context.currentTime;
      // cancelAndHoldAtTime is missing in Firefox; pin the current value manually there.
      if (typeof gain.gain.cancelAndHoldAtTime === "function") {
        gain.gain.cancelAndHoldAtTime(now);
      } else {
        const current = gain.gain.value;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(current, now);
      }
      gain.gain.linearRampToValueAtTime(
        enabled ? AUDIO.ambient.volume : 0,
        now + AUDIO.toggleFadeSeconds,
      );
    }
  }, [startAmbientAudio]);

  const undoLastInteraction = useCallback(() => {
    settings.undo();
  }, []);

  const resetSection = useCallback((sectionIds: readonly SectionId[]) => {
    settings.resetSections(sectionIds);
    if (previewFamilyRef.current !== null && sectionIds.some((id) => id !== "koi-palettes" && id !== "koi-patterns")) {
      setFamilyPreview(null);
    }
  }, [setFamilyPreview]);

  const resetSettings = useCallback(() => {
    settings.resetAll();
    setFamilyPreview(null);
    setConfirmResetAll(false);
  }, [setFamilyPreview]);

  const changeFamily = useCallback((index: number) => {
    setSelectedFamily(index);
    setFamilyPreview(index);
  }, [setFamilyPreview]);

  const handleSettingsOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setFamilyPreview(null);
      setConfirmResetAll(false);
    }
    setSettingsOpen(open);
  }, [setFamilyPreview]);

  useEffect(() => {
    const unlockAmbientAudio = (): void => {
      window.removeEventListener("pointerdown", unlockAmbientAudio);
      window.removeEventListener("keydown", unlockAmbientAudio);
      if (soundEnabledRef.current) {
        void startAmbientAudio().catch(() => undefined);
      }
    };

    window.addEventListener("pointerdown", unlockAmbientAudio);
    window.addEventListener("keydown", unlockAmbientAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAmbientAudio);
      window.removeEventListener("keydown", unlockAmbientAudio);
    };
  }, [startAmbientAudio]);

  useEffect(() => () => {
    ambientAudioSourceRef.current?.stop();
    ambientAudioSourceRef.current = null;
    ambientAudioGainRef.current = null;
    const context = ambientAudioContextRef.current;
    ambientAudioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
  }, []);

  const changeWeather = useCallback((id: WeatherPresetId) => {
    setFamilyPreview(null);
    settings.setWeather(id);
    setWeatherMenuOpen(false);
  }, [setFamilyPreview]);

  const handleRainChange = useCallback((enabled: boolean) => {
    settings.setRain(enabled);
  }, []);

  const handleSoundChange = useCallback((enabled: boolean) => {
    setAmbientSoundEnabled(enabled);
  }, [setAmbientSoundEnabled]);

  const resetAtmosphere = useCallback(() => {
    changeWeather(DEFAULT_WEATHER_PRESET_ID);
    setAmbientSoundEnabled(false);
  }, [changeWeather, setAmbientSoundEnabled]);

  const weatherPresetRef = useRef(weatherPreset);
  weatherPresetRef.current = weatherPreset;
  const rainEnabledRef = useRef(rainEnabled);
  rainEnabledRef.current = rainEnabled;

  useEffect(() => {
    return initLinuxMod({
      setWeather: changeWeather,
      setRain: handleRainChange,
      scatter,
      changeKoiCount,
      getCurrentWeather: () => weatherPresetRef.current,
      getRainEnabled: () => rainEnabledRef.current,
    });
  }, [changeWeather, handleRainChange, scatter, changeKoiCount]);

  useEffect(() => {
    const handleFullscreenChange = (): void => {
      if (document.fullscreenElement === document.documentElement) {
        setAmbientModeState(true);
      } else if (ambientModeRef.current && !document.fullscreenElement) {
        setAmbientModeState(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [setAmbientModeState]);

  useEffect(() => {
    if (!ambientMode || settingsOpen || weatherMenuOpen || frameRateMenuOpen) {
      setAmbientControlsVisible(true);
      return;
    }

    let idleTimer = window.setTimeout(
      () => setAmbientControlsVisible(false),
      AMBIENT_IDLE_DELAY_MS,
    );
    const revealControls = (): void => {
      setAmbientControlsVisible(true);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(
        () => setAmbientControlsVisible(false),
        AMBIENT_IDLE_DELAY_MS,
      );
    };

    window.addEventListener("pointermove", revealControls);
    window.addEventListener("pointerdown", revealControls);
    window.addEventListener("keydown", revealControls);
    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener("pointermove", revealControls);
      window.removeEventListener("pointerdown", revealControls);
      window.removeEventListener("keydown", revealControls);
    };
  }, [ambientMode, settingsOpen, weatherMenuOpen, frameRateMenuOpen]);

  useEffect(() => {
    if (!showInterface && previewFamilyRef.current !== null) setFamilyPreview(null);
  }, [showInterface, setFamilyPreview]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const display = displayRef.current;
    if (!canvas || !display) return;
    const initialSize = pondRenderSize(display);
    setCanvasSize(initialSize.width, initialSize.height);
    const school = new School();
    const renderer = new FishRenderer(canvas);
    const runtime: PondRuntime = { school, renderer, showDebug: false };
    runtimeRef.current = runtime;
    const activeWeather = getWeatherPreset(settings.meta().weather);
    renderer.setWeatherPreset(activeWeather.id);
    school.setRainIntensity(settings.meta().rain ? 1 : 0);
    const disconnectEffects = connectSettingsEffects(settings, { school, renderer });

    const resizeObserver = new ResizeObserver(() => {
      const nextSize = pondRenderSize(display);
      if (nextSize.width === CANVAS_WIDTH && nextSize.height === CANVAS_HEIGHT) return;
      const oldWidth = CANVAS_WIDTH;
      const oldHeight = CANVAS_HEIGHT;
      setCanvasSize(nextSize.width, nextSize.height);
      school.resize(nextSize.width / oldWidth, nextSize.height / oldHeight);
      renderer.resize(nextSize.width, nextSize.height, oldWidth, oldHeight);
    });
    resizeObserver.observe(display);

    let animationFrame = 0;
    let accumulator = 0;
    let simulationTime = 0;
    let previousTime = performance.now();
    const frameLimiter = createFrameLimiter();
    const animate = (now: number): void => {
      const cap = frameRateOption(frameRateCapRef.current);
      if (!frameLimiter.shouldRender(now, cap.fps)) {
        // previousTime only advances on rendered frames, so the accumulator
        // below still receives the full real elapsed time.
        animationFrame = requestAnimationFrame(animate);
        return;
      }
      accumulator += Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      while (accumulator >= FIXED_STEP) {
        simulationTime += FIXED_STEP;
        school.update(FIXED_STEP, simulationTime);
        accumulator -= FIXED_STEP;
      }

      renderer.draw(school, simulationTime, runtime.showDebug);
      animationFrame = requestAnimationFrame(animate);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      if (isEditableTarget(event.target)) return;
      switch (event.code) {
        case "Space":
          event.preventDefault();
          school.scatter();
          break;
        case "BracketLeft":
          changeKoiCount(-1);
          break;
        case "BracketRight":
          changeKoiCount(1);
          break;
        case "KeyD":
          runtime.showDebug = !runtime.showDebug;
          break;
        case "KeyH":
          setShowInterface((current) => !current);
          break;
        case "KeyR":
          school.reset();
          break;
        case "KeyF":
          event.preventDefault();
          void toggleAmbientMode();
          break;
        default:
          return;
      }
      setStats(sceneStats(runtime));
    };

    window.addEventListener("keydown", handleKeyDown);
    setStats(sceneStats(runtime));
    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      disconnectEffects();
      resizeObserver.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
      renderer.dispose();
      runtimeRef.current = null;
    };
  }, [changeKoiCount, toggleAmbientMode]);

  const callFish = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    runtime.school.callTo(
      vec(
        clamp(
          ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH,
          0,
          CANVAS_WIDTH,
        ),
        clamp(
          ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT,
          0,
          CANVAS_HEIGHT,
        ),
      ),
    );
    setStats(sceneStats(runtime));
  };

  const revealHiddenInterfaceOnMobile = (
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    if (!isMobile || showInterface) return;
    event.preventDefault();
    event.stopPropagation();
    setShowInterface(true);
  };

  const selectedWeather = getWeatherPreset(weatherPreset);
  const selectedFrameRate = frameRateOption(frameRateCap);
  const ambientUiHeldOpen = settingsOpen || weatherMenuOpen || frameRateMenuOpen;
  const ambientUiHidden =
    ambientMode && !ambientControlsVisible && !ambientUiHeldOpen;

  return (
    <main
      ref={stageRef}
      className={`stage${ambientMode ? " stage--ambient" : ""}${
        ambientUiHidden
          ? " stage--ambient-idle"
          : ""
      }`}
      aria-label="Procedural koi simulation"
      onPointerDownCapture={revealHiddenInterfaceOnMobile}
    >
      <div className="pond-shell">
        <div className="display" ref={displayRef}>
          <canvas
            ref={canvasRef}
            id="pond"
            aria-label="Animated procedural koi"
            onPointerDown={callFish}
          />
          {previewFamily !== null && settingsOpen && (
            <div className="pond-preview-label" aria-live="polite">
              {settings.live["koi-palettes"][previewFamily]?.name ?? "Koi"} family preview
            </div>
          )}
        </div>

        {showInterface && (
          <div
            className={`pond-ui${
              ambientUiHidden
                ? " pond-ui--hidden"
                : ""
            }`}
          >
            <header className="brand-float">
              <h1 className="brand-wordmark">nagomi</h1>
            </header>

            <div className="top-actions">
              <GitHubStars repo={GITHUB_REPOSITORY} stargazersCount={2} />
              <Separator orientation="vertical" />
              <WallpaperAppLink href={WALLPAPER_APP_URL} />
              <Separator orientation="vertical" />
              <Drawer
                open={settingsOpen}
                onOpenChange={handleSettingsOpenChange}
                modal={false}
                swipeDirection={isMobile ? "down" : "right"}
                showSwipeHandle={isMobile}
                disablePointerDismissal
              >
              <DrawerTrigger
                render={
                  <Button
                    className="settings-trigger"
                    variant="ghost"
                    aria-label="Open pond settings"
                  />
                }
              >
                <Settings2 aria-hidden="true" />
                <span>Settings</span>
              </DrawerTrigger>
              <DrawerContent className="settings-drawer">
                <DrawerHeader className="settings-drawer__header">
                  <div>
                    <DrawerTitle>Pond settings</DrawerTitle>
                    <DrawerDescription>
                      Changes preview in the pond and save on this device.
                    </DrawerDescription>
                  </div>
                  <DrawerClose
                    render={
                      <Button variant="ghost" size="icon" aria-label="Close settings" />
                    }
                  >
                    <X aria-hidden="true" />
                  </DrawerClose>
                </DrawerHeader>
                <div className="settings-scroll">
                  <ConfigEditor
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    weather={weatherPreset}
                    rainEnabled={rainEnabled}
                    soundEnabled={soundEnabled}
                    onWeatherChange={changeWeather}
                    onRainChange={handleRainChange}
                    onSoundChange={handleSoundChange}
                    onResetSection={resetSection}
                    onResetAtmosphere={resetAtmosphere}
                    selectedFamily={selectedFamily}
                    previewFamily={previewFamily}
                    onFamilyChange={changeFamily}
                    onPreviewFamilyChange={setFamilyPreview}
                  />
                </div>
                <DrawerFooter className="settings-drawer__footer">
                  {confirmResetAll ? (
                    <div className="settings-reset-confirm" role="group" aria-label="Confirm reset all settings">
                      <span>Reset all settings on this device?</span>
                      <Button variant="ghost" onClick={() => setConfirmResetAll(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={resetSettings}>Reset all</Button>
                    </div>
                  ) : (
                    <>
                      <Button variant="ghost" onClick={undoLastInteraction} disabled={!canUndo}>
                        <Undo2 aria-hidden="true" /> Undo
                      </Button>
                      <Button variant="outline" onClick={() => setConfirmResetAll(true)}>
                        <RotateCcw aria-hidden="true" /> Reset all
                      </Button>
                      <DrawerClose render={<Button />}>Done</DrawerClose>
                    </>
                  )}
                </DrawerFooter>
              </DrawerContent>
              </Drawer>
            </div>
          </div>
        )}

        {showInterface && (
          <nav
            className={`control-dock${
              ambientUiHidden
                ? " control-dock--hidden"
                : ""
            }`}
            aria-label="Simulation controls"
          >
            <div className="control-group control-group--view">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void toggleAmbientMode()}
                aria-label={ambientMode ? "Exit ambient mode" : "Enter ambient mode"}
                aria-keyshortcuts="F"
                aria-pressed={ambientMode}
              >
                {ambientMode ? (
                  <Minimize2 aria-hidden="true" />
                ) : (
                  <Maximize2 aria-hidden="true" />
                )}
                <span className="control-label">{ambientMode ? "Exit" : "Ambient"}</span>
                <Kbd className="control-shortcut">F</Kbd>
              </Button>
              <DropdownMenu
                open={frameRateMenuOpen}
                onOpenChange={setFrameRateMenuOpen}
              >
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="frame-rate-trigger"
                      variant="ghost"
                      size="sm"
                      aria-label={`Frame rate: ${selectedFrameRate.label}`}
                    />
                  }
                >
                  <Gauge aria-hidden="true" />
                  <span className="control-label">{selectedFrameRate.label}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="frame-rate-menu"
                  side="top"
                  align="center"
                  sideOffset={8}
                >
                  <DropdownMenuRadioGroup
                    value={frameRateCap}
                    onValueChange={changeFrameRate}
                  >
                    <DropdownMenuLabel>Frame rate</DropdownMenuLabel>
                    {FRAME_RATE_OPTIONS.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.id}
                        value={option.id}
                        closeOnClick
                      >
                        <span className="frame-rate-option">
                          <span className="frame-rate-option__label">{option.label}</span>
                          <span className="frame-rate-option__hint">{option.description}</span>
                        </span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInterface(false)}
                aria-label="Hide interface"
                aria-keyshortcuts="H"
              >
                <EyeOff aria-hidden="true" />
                <span className="control-label">Hide UI</span>
                <Kbd className="control-shortcut">H</Kbd>
              </Button>
            </div>
            <Separator className="control-divider" orientation="vertical" />
            <div className="control-group control-group--simulation">
              <Button
                variant="secondary"
                size="sm"
                onClick={scatter}
                aria-keyshortcuts="Space"
              >
                <Shuffle aria-hidden="true" />
                <span className="control-label">Scatter</span>
                <Kbd className="control-shortcut">Space</Kbd>
              </Button>
              <Separator orientation="vertical" />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => changeKoiCount(-1)}
                aria-label="Remove one koi"
                aria-keyshortcuts="["
              >
                <Minus aria-hidden="true" />
              </Button>
              <output className="koi-count" aria-live="polite">
                {stats.koi}
              </output>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => changeKoiCount(1)}
                aria-label="Add one koi"
                aria-keyshortcuts="]"
              >
                <Plus aria-hidden="true" />
              </Button>
            </div>
            <Separator className="control-divider" orientation="vertical" />
            <div className="control-group control-group--environment">
              <DropdownMenu
                open={weatherMenuOpen}
                onOpenChange={setWeatherMenuOpen}
              >
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="weather-trigger"
                      variant="ghost"
                      size="sm"
                      aria-label={`Weather: ${selectedWeather.label}`}
                    />
                  }
                >
                  <WeatherIcon id={weatherPreset} />
                  <span className="control-label">{selectedWeather.label}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="weather-menu"
                  side="top"
                  align="center"
                  sideOffset={8}
                >
                  <DropdownMenuRadioGroup
                    value={weatherPreset}
                    onValueChange={(value) =>
                      changeWeather(value as WeatherPresetId)
                    }
                  >
                    <DropdownMenuLabel>Weather and lighting</DropdownMenuLabel>
                    {WEATHER_PRESETS.map((preset) => (
                      <DropdownMenuRadioItem
                        key={preset.id}
                        value={preset.id}
                        closeOnClick
                      >
                        <WeatherIcon id={preset.id} />
                        {preset.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="rain-control">
                <CloudRain aria-hidden="true" />
                <span className="rain-control__label">Rain</span>
                <Switch
                  size="sm"
                  checked={rainEnabled}
                  onCheckedChange={handleRainChange}
                  aria-label="Toggle rain ripples"
                />
              </div>
              <div className="rain-control">
                <Volume2 aria-hidden="true" />
                <span className="rain-control__label">Sound</span>
                <Switch
                  size="sm"
                  checked={soundEnabled}
                  onCheckedChange={handleSoundChange}
                  aria-label="Toggle pond ambience"
                />
              </div>
            </div>
          </nav>
        )}
      </div>
    </main>
  );
}
