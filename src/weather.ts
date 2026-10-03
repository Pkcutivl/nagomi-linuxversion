export type WeatherPresetId =
  | "sunny"
  | "deep-clear"
  | "overcast"
  | "mist"
  | "sunset"
  | "moonlight"
  | "rain";

export type ColorTriplet = readonly [number, number, number];
type Direction = readonly [number, number];

export interface WeatherConfigValues {
  koi: {
    shadow: {
      color: number;
    };
  };
  "pond-bed": {
    deepColor: ColorTriplet;
    shallowColor: ColorTriplet;
    verticalTone: number;
    edgeDarkening: number;
  };
  water: {
    colorTint: ColorTriplet;
    largeCurrentColor: ColorTriplet;
    largeCurrentCoreColor: ColorTriplet;
    largeCellSize: number;
    largeCurrentOpacity: number;
    largeCurrentSpeed: number;
    secondaryLargeCurrentColor: ColorTriplet;
    secondaryLargeCurrentCoreColor: ColorTriplet;
    secondaryLargeCellSize: number;
    secondaryLargeCurrentOpacity: number;
    secondaryLargeCurrentSpeed: number;
    detailCurrentColor: ColorTriplet;
    detailCurrentCoreColor: ColorTriplet;
    detailCellSize: number;
    detailCurrentOpacity: number;
    detailCurrentSpeed: number;
  };
}

export interface WeatherPreset {
  id: WeatherPresetId;
  label: string;
  tint: ColorTriplet;
  brightness: number;
  contrast: number;
  saturation: number;
  vignette: number;
  cloudStrength: number;
  lightColor: ColorTriplet;
  lightStrength: number;
  lightDirection: Direction;
  rainStrength: number;
  config: WeatherConfigValues;
}

export const DEFAULT_WEATHER_PRESET_ID: WeatherPresetId = "sunny";

// `config` contains final values, not multipliers. Selecting a preset overwrites
// exactly these fields in the live config and leaves every other setting alone.
export const WEATHER_PRESETS: readonly WeatherPreset[] = [
  {
    id: "sunny",
    label: "Sunny",
    tint: [1, 1, 1],
    brightness: 1.08,
    contrast: 1.02,
    saturation: 1.05,
    vignette: 0,
    cloudStrength: 0,
    lightColor: [1, 0.96, 0.85],
    lightStrength: 0.04,
    lightDirection: [-0.58, 0.82],
    rainStrength: 0,
    config: {
      koi: { shadow: { color: 0x0b211e } },
      "pond-bed": {
        deepColor: [0.50, 0.73, 0.65],
        shallowColor: [0.17, 0.42, 0.28],
        verticalTone: 0.8,
        edgeDarkening: 0.52,
      },
      water: {
        colorTint: [0.98, 1.04, 1.02],
        largeCurrentColor: [0.022, 0.068, 0.047],
        largeCurrentCoreColor: [0.052, 0.155, 0.108],
        largeCellSize: 908,
        largeCurrentOpacity: 0.55,
        largeCurrentSpeed: 1,
        secondaryLargeCurrentColor: [0.022, 0.068, 0.047],
        secondaryLargeCurrentCoreColor: [0.052, 0.155, 0.108],
        secondaryLargeCellSize: 10,
        secondaryLargeCurrentOpacity: 0.1,
        secondaryLargeCurrentSpeed: 1,
        detailCurrentColor: [0.01, 0.034, 0.023],
        detailCurrentCoreColor: [0.028, 0.09, 0.061],
        detailCellSize: 20,
        detailCurrentOpacity: 0.5,
        detailCurrentSpeed: 1,
      },
    },
  },
  {
    id: "rain",
    label: "Rain",
    tint: [0.82, 0.93, 1.0],
    brightness: 0.92,
    contrast: 0.98,
    saturation: 0.88,
    vignette: 0.14,
    cloudStrength: 0.45,
    lightColor: [0.70, 0.88, 0.95],
    lightStrength: 0.07,
    lightDirection: [0.36, 0.93],
    rainStrength: 10,
    config: {
      koi: { shadow: { color: 0x0b211e } },
      "pond-bed": {
        deepColor: [0.52, 0.75, 0.68],
        shallowColor: [0.18, 0.45, 0.30],
        verticalTone: 0.8,
        edgeDarkening: 0.50,
      },
      water: {
        colorTint: [0.98, 1.03, 1.02],
        largeCurrentColor: [0.015, 0.065, 0.065],
        largeCurrentCoreColor: [0.035, 0.15, 0.15],
        largeCellSize: 908,
        largeCurrentOpacity: 0.7,
        largeCurrentSpeed: 1.2,
        secondaryLargeCurrentColor: [0.012, 0.06, 0.068],
        secondaryLargeCurrentCoreColor: [0.03, 0.14, 0.16],
        secondaryLargeCellSize: 10,
        secondaryLargeCurrentOpacity: 0.1,
        secondaryLargeCurrentSpeed: 1.0,
        detailCurrentColor: [0.008, 0.035, 0.03],
        detailCurrentCoreColor: [0.02, 0.095, 0.085],
        detailCellSize: 20,
        detailCurrentOpacity: 0.7,
        detailCurrentSpeed: 1.4,
      },
    },
  },

  {
    id: "deep-clear",
    label: "Deep clear",
    tint: [1, 1, 1],
    brightness: 1,
    contrast: 1,
    saturation: 1,
    vignette: 0,
    cloudStrength: 0,
    lightColor: [1, 0.94, 0.72],
    lightStrength: 0,
    lightDirection: [-0.58, 0.82],
    rainStrength: 0,
    config: {
      koi: { shadow: { color: 0x0b211e } },
      "pond-bed": {
        deepColor: [0.09, 0.15, 0.18],
        shallowColor: [0.05, 0.02, 0.02],
        verticalTone: 0.99,
        edgeDarkening: 0.57,
      },
      water: {
        colorTint: [0.96, 1.02, 1],
        largeCurrentColor: [0.022, 0.068, 0.047],
        largeCurrentCoreColor: [0.03744, 0.2325, 0.135],
        largeCellSize: 908,
        largeCurrentOpacity: 0.59,
        largeCurrentSpeed: 1,
        secondaryLargeCurrentColor: [0.022, 0.068, 0.047],
        secondaryLargeCurrentCoreColor: [0.052, 0.155, 0.108],
        secondaryLargeCellSize: 10,
        secondaryLargeCurrentOpacity: 0.1,
        secondaryLargeCurrentSpeed: 1,
        detailCurrentColor: [0.01, 0.034, 0.023],
        detailCurrentCoreColor: [0.028, 0.09, 0.061],
        detailCellSize: 20,
        detailCurrentOpacity: 0.2,
        detailCurrentSpeed: 1,
      },
    },
  },
  {
    id: "overcast",
    label: "Overcast",
    tint: [0.87, 0.96, 1.02],
    brightness: 0.86,
    contrast: 0.9,
    saturation: 0.78,
    vignette: 0.1,
    cloudStrength: 0.62,
    lightColor: [0.72, 0.84, 0.9],
    lightStrength: 0.035,
    lightDirection: [0.42, 0.9],
    rainStrength: 0,
    config: {
      koi: { shadow: { color: 0x0b211e } },
      "pond-bed": {
        deepColor: [0.486, 0.718, 0.631],
        shallowColor: [0.145, 0.395, 0.255],
        verticalTone: 0.8,
        edgeDarkening: 0.57,
      },
      water: {
        colorTint: [0.96, 1.02, 1],
        largeCurrentColor: [0.01452, 0.05848, 0.04935],
        largeCurrentCoreColor: [0.03224, 0.1364, 0.11664],
        largeCellSize: 908,
        largeCurrentOpacity: 0.693,
        largeCurrentSpeed: 0.54,
        secondaryLargeCurrentColor: [0.01276, 0.05576, 0.05264],
        secondaryLargeCurrentCoreColor: [0.02808, 0.1333, 0.12528],
        secondaryLargeCellSize: 10,
        secondaryLargeCurrentOpacity: 0.087,
        secondaryLargeCurrentSpeed: 0.42,
        detailCurrentColor: [0.007, 0.03128, 0.02484],
        detailCurrentCoreColor: [0.01848, 0.0864, 0.06832],
        detailCellSize: 20,
        detailCurrentOpacity: 0.495,
        detailCurrentSpeed: 0.7,
      },
    },
  },
  {
    id: "mist",
    label: "Mist",
    tint: [0.76, 0.9, 0.88],
    brightness: 0.8,
    contrast: 0.86,
    saturation: 0.68,
    vignette: 0.14,
    cloudStrength: 0.82,
    lightColor: [0.78, 0.93, 0.88],
    lightStrength: 0.025,
    lightDirection: [0.32, 0.95],
    rainStrength: 0,
    config: {
      koi: { shadow: { color: 0x0b211e } },
      "pond-bed": {
        deepColor: [0.486, 0.718, 0.631],
        shallowColor: [0.145, 0.395, 0.255],
        verticalTone: 0.8,
        edgeDarkening: 0.57,
      },
      water: {
        colorTint: [0.96, 1.02, 1],
        largeCurrentColor: [0.01276, 0.06256, 0.03666],
        largeCurrentCoreColor: [0.02912, 0.1364, 0.081],
        largeCellSize: 1089.6,
        largeCurrentOpacity: 0.4356,
        largeCurrentSpeed: 0.24,
        secondaryLargeCurrentColor: [0.01144, 0.05848, 0.03572],
        secondaryLargeCurrentCoreColor: [0.026, 0.1271, 0.07776],
        secondaryLargeCellSize: 17,
        secondaryLargeCurrentOpacity: 0.054,
        secondaryLargeCurrentSpeed: 0.18,
        detailCurrentColor: [0.0062, 0.03332, 0.01978],
        detailCurrentCoreColor: [0.0168, 0.0846, 0.05002],
        detailCellSize: 26,
        detailCurrentOpacity: 0.288,
        detailCurrentSpeed: 0.3,
      },
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    tint: [1.08, 0.86, 0.7],
    brightness: 0.93,
    contrast: 1.06,
    saturation: 1.1,
    vignette: 0.2,
    cloudStrength: 0.16,
    lightColor: [1, 0.42, 0.15],
    lightStrength: 0.2,
    lightDirection: [-0.7, 0.72],
    rainStrength: 0,
    config: {
      koi: { shadow: { color: 0x0b211e } },
      "pond-bed": {
        deepColor: [0.486, 0.718, 0.631],
        shallowColor: [0.145, 0.395, 0.255],
        verticalTone: 0.8,
        edgeDarkening: 0.57,
      },
      water: {
        colorTint: [0.96, 1.02, 1],
        largeCurrentColor: [0.03124, 0.05168, 0.0235],
        largeCurrentCoreColor: [0.06968, 0.1054, 0.0432],
        largeCellSize: 908,
        largeCurrentOpacity: 0.9108,
        largeCurrentSpeed: 0.72,
        secondaryLargeCurrentColor: [0.0264, 0.04216, 0.02162],
        secondaryLargeCurrentCoreColor: [0.06656, 0.1023, 0.0432],
        secondaryLargeCellSize: 10,
        secondaryLargeCurrentOpacity: 0.099,
        secondaryLargeCurrentSpeed: 0.5,
        detailCurrentColor: [0.0128, 0.02856, 0.01334],
        detailCurrentCoreColor: [0.03808, 0.0774, 0.0305],
        detailCellSize: 20,
        detailCurrentOpacity: 0.468,
        detailCurrentSpeed: 0.86,
      },
    },
  },
  {
    id: "moonlight",
    label: "Sunny",
    tint: [1, 1, 1],
    brightness: 1.08,
    contrast: 1.02,
    saturation: 1.05,
    vignette: 0,
    cloudStrength: 0,
    lightColor: [1, 0.96, 0.85],
    lightStrength: 0.04,
    lightDirection: [-0.58, 0.82],
    rainStrength: 0,
    config: {
      koi: { shadow: { color: 0x0b211e } },
      "pond-bed": {
        deepColor: [0.50, 0.73, 0.65],
        shallowColor: [0.17, 0.42, 0.28],
        verticalTone: 0.8,
        edgeDarkening: 0.52,
      },
      water: {
        colorTint: [0.98, 1.04, 1.02],
        largeCurrentColor: [0.022, 0.068, 0.047],
        largeCurrentCoreColor: [0.052, 0.155, 0.108],
        largeCellSize: 908,
        largeCurrentOpacity: 0.55,
        largeCurrentSpeed: 1,
        secondaryLargeCurrentColor: [0.022, 0.068, 0.047],
        secondaryLargeCurrentCoreColor: [0.052, 0.155, 0.108],
        secondaryLargeCellSize: 10,
        secondaryLargeCurrentOpacity: 0.1,
        secondaryLargeCurrentSpeed: 1,
        detailCurrentColor: [0.01, 0.034, 0.023],
        detailCurrentCoreColor: [0.028, 0.09, 0.061],
        detailCellSize: 20,
        detailCurrentOpacity: 0.5,
        detailCurrentSpeed: 1,
      },
    },
  },

];

export function getWeatherPreset(id: WeatherPresetId): WeatherPreset {
  return (
    WEATHER_PRESETS.find((preset) => preset.id === id) ?? WEATHER_PRESETS[0]
  );
}
