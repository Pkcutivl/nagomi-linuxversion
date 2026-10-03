import type { WeatherPresetId } from "./weather";

export interface LinuxModCallbacks {
  setWeather: (preset: WeatherPresetId) => void;
  setRain: (enabled: boolean) => void;
  scatter: () => void;
  changeKoiCount: (delta: number) => void;
  getCurrentWeather: () => WeatherPresetId;
  getRainEnabled: () => boolean;
}

export function getTimeOfDayPreset(date = new Date()): WeatherPresetId {
  const hours = date.getHours() + date.getMinutes() / 60;
  if (hours >= 5.0 && hours < 6.75) {
    return "mist";
  } else if (hours >= 17.0 && hours < 18.75) {
    return "sunset";
  }
  return "sunny";
}

export async function syncRealWeather(): Promise<{
  weather?: WeatherPresetId;
  rain?: boolean;
}> {
  try {
    let lat = 16.0685;
    let lon = 108.2215;

    try {
      const geoRes = await fetch("https://get.geojs.io/v1/ip/geo.json", {
        signal: AbortSignal.timeout(4000),
      });
      if (geoRes.ok) {
        const geo = await geoRes.json();
        if (geo.latitude && geo.longitude) {
          lat = parseFloat(geo.latitude);
          lon = parseFloat(geo.longitude);
        }
      }
    } catch {
      // Ignore geo lookup failure
    }

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day,precipitation`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!weatherRes.ok) return {};

    const data = await weatherRes.json();
    const current = data.current;
    if (!current) return {};

    const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99];
    const isRaining =
      current.precipitation > 0 || rainCodes.includes(current.weather_code);
    const isFoggy = [45, 48].includes(current.weather_code);
    const isOvercast = current.weather_code === 3;

    if (isRaining) {
      return { weather: "rain", rain: true };
    }
    if (isFoggy) {
      return { weather: "mist", rain: false };
    }
    if (isOvercast) {
      return { weather: "overcast", rain: false };
    }

    return { weather: getTimeOfDayPreset(), rain: false };
  } catch {
    return {};
  }
}

export function initLinuxMod(callbacks: LinuxModCallbacks): () => void {
  let autoMode = true;

  const updateAutoState = async () => {
    if (!autoMode) return;
    const realWeather = await syncRealWeather();
    if (realWeather.weather) {
      callbacks.setWeather(realWeather.weather);
    } else {
      callbacks.setWeather(getTimeOfDayPreset());
    }
    if (typeof realWeather.rain === "boolean") {
      callbacks.setRain(realWeather.rain);
    }
  };

  callbacks.setWeather(getTimeOfDayPreset());
  void updateAutoState();

  const timeInterval = window.setInterval(() => {
    if (autoMode) {
      callbacks.setWeather(getTimeOfDayPreset());
    }
  }, 60_000);

  const weatherInterval = window.setInterval(() => {
    if (autoMode) {
      void updateAutoState();
    }
  }, 30 * 60_000);

  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource("http://127.0.0.1:39123/events");
    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "weather") {
          if (msg.value === "auto") {
            autoMode = true;
            void updateAutoState();
          } else {
            autoMode = false;
            callbacks.setWeather(msg.value as WeatherPresetId);
          }
        } else if (msg.type === "rain") {
          if (msg.value === "toggle") {
            callbacks.setRain(!callbacks.getRainEnabled());
          } else {
            callbacks.setRain(Boolean(msg.value));
          }
        } else if (msg.type === "scatter") {
          callbacks.scatter();
        } else if (msg.type === "koi-count") {
          callbacks.changeKoiCount(Number(msg.delta) || 1);
        }
      } catch {
        // Ignore malformed messages
      }
    };
  } catch {
    // SSE not supported or bridge unreachable
  }

  return () => {
    window.clearInterval(timeInterval);
    window.clearInterval(weatherInterval);
    eventSource?.close();
  };
}
