/**
 * ==========================================================================
 * WeatherAPI Engine - Unified Weather API Service
 * ==========================================================================
 * Provides real-time weather data and 5-day forecasts.
 * 
 * Features:
 * 1. Live Real-Time Weather API (Powered by high-precision global meteorological data,
 *    works immediately worldwide with ZERO registration / no API key required).
 * 2. Custom Local API Server support (for self-hosted backend).
 * 3. OpenWeatherMap API support (when custom key is provided).
 * ==========================================================================
 */

const WeatherAPI = (() => {
  // Public Geocoding and Meteorological Endpoints
  const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  const REVERSE_GEO_URL = 'https://nominatim.openstreetmap.org/reverse';
  const METEO_URL = 'https://api.open-meteo.com/v1/forecast';

  /**
   * Translates WMO (World Meteorological Organization) weather codes to human-readable
   * condition descriptions and OpenWeather-compatible standard icons.
   */
  function parseWMOCode(code, isDay = 1) {
    const dayNight = isDay ? 'd' : 'n';

    switch (code) {
      case 0:
        return { main: 'Clear', description: 'Clear sky', icon: `01${dayNight}`, id: 800 };
      case 1:
        return { main: 'Clear', description: 'Mainly clear', icon: `02${dayNight}`, id: 801 };
      case 2:
        return { main: 'Clouds', description: 'Partly cloudy', icon: `03${dayNight}`, id: 802 };
      case 3:
        return { main: 'Clouds', description: 'Overcast', icon: `04${dayNight}`, id: 804 };
      case 45:
      case 48:
        return { main: 'Mist', description: 'Fog / Depositing rime fog', icon: `50${dayNight}`, id: 741 };
      case 51:
      case 53:
      case 55:
        return { main: 'Drizzle', description: 'Light to dense drizzle', icon: `09${dayNight}`, id: 300 };
      case 56:
      case 57:
        return { main: 'Drizzle', description: 'Freezing drizzle', icon: `09${dayNight}`, id: 311 };
      case 61:
        return { main: 'Rain', description: 'Slight rain', icon: `10${dayNight}`, id: 500 };
      case 63:
        return { main: 'Rain', description: 'Moderate rain', icon: `10${dayNight}`, id: 501 };
      case 65:
        return { main: 'Rain', description: 'Heavy rain', icon: `10${dayNight}`, id: 502 };
      case 66:
      case 67:
        return { main: 'Rain', description: 'Freezing rain', icon: `13${dayNight}`, id: 511 };
      case 71:
      case 73:
      case 75:
      case 77:
        return { main: 'Snow', description: 'Snowfall', icon: `13${dayNight}`, id: 600 };
      case 80:
      case 81:
      case 82:
        return { main: 'Rain', description: 'Rain showers', icon: `09${dayNight}`, id: 521 };
      case 85:
      case 86:
        return { main: 'Snow', description: 'Snow showers', icon: `13${dayNight}`, id: 621 };
      case 95:
        return { main: 'Thunderstorm', description: 'Thunderstorm', icon: `11${dayNight}`, id: 200 };
      case 96:
      case 99:
        return { main: 'Thunderstorm', description: 'Thunderstorm with hail', icon: `11${dayNight}`, id: 211 };
      default:
        return { main: 'Clouds', description: 'Scattered clouds', icon: `03${dayNight}`, id: 803 };
    }
  }

  /**
   * Geocodes a city name to obtain latitude, longitude, and country
   * @param {string} cityName 
   * @returns {Promise<{lat: number, lon: number, name: string, country: string}>}
   */
  async function geocodeCity(cityName) {
    const url = `${GEO_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding failed with status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new Error(`City "${cityName}" not found.`);
    }

    const first = data.results[0];
    return {
      lat: first.latitude,
      lon: first.longitude,
      name: first.name,
      country: first.country_code ? first.country_code.toUpperCase() : (first.country || '')
    };
  }

  /**
   * Fetches real-time weather and 5-day forecast using meteorological parameters
   * @param {number} lat 
   * @param {number} lon 
   * @param {string} displayName 
   * @param {string} countryCode 
   */
  async function fetchLiveMeteoData(lat, lon, displayName, countryCode = '') {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m',
      hourly: 'temperature_2m,weather_code,precipitation_probability',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max',
      timezone: 'auto'
    });

    const response = await fetch(`${METEO_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Weather service returned error ${response.status}`);
    }
    const raw = await response.json();

    // 1. Format Current Weather (matching OpenWeather standard format)
    const current = raw.current;
    const isDay = current.is_day !== undefined ? current.is_day : 1;
    const weatherInfo = parseWMOCode(current.weather_code, isDay);
    const nowUnix = Math.floor(new Date(current.time).getTime() / 1000);

    const sunriseToday = raw.daily?.sunrise?.[0] ? Math.floor(new Date(raw.daily.sunrise[0]).getTime() / 1000) : nowUnix - 18000;
    const sunsetToday = raw.daily?.sunset?.[0] ? Math.floor(new Date(raw.daily.sunset[0]).getTime() / 1000) : nowUnix + 25200;

    const formattedCurrent = {
      name: displayName,
      sys: {
        country: countryCode,
        sunrise: sunriseToday,
        sunset: sunsetToday
      },
      main: {
        temp: current.temperature_2m,
        feels_like: current.apparent_temperature,
        temp_min: raw.daily?.temperature_2m_min?.[0] ?? (current.temperature_2m - 2),
        temp_max: raw.daily?.temperature_2m_max?.[0] ?? (current.temperature_2m + 2),
        humidity: current.relative_humidity_2m,
        pressure: Math.round(current.surface_pressure || 1013)
      },
      wind: {
        speed: (current.wind_speed_10m / 3.6), // Convert km/h to m/s
        deg: current.wind_direction_10m || 0
      },
      visibility: 10000,
      weather: [{
        id: weatherInfo.id,
        main: weatherInfo.main,
        description: weatherInfo.description,
        icon: weatherInfo.icon
      }],
      dt: nowUnix,
      timezone: raw.utc_offset_seconds || 0
    };

    // 2. Format Hourly Forecast (Next 24 hours in 3-hour increments)
    const formattedHourly = [];
    if (raw.hourly && raw.hourly.time) {
      const currentTimeIndex = raw.hourly.time.findIndex(t => new Date(t).getTime() >= new Date(current.time).getTime());
      const startIndex = currentTimeIndex >= 0 ? currentTimeIndex : 0;

      // Extract every 3 hours for next 24 hours (8 points)
      for (let i = 0; i < 8; i++) {
        const idx = startIndex + (i * 3);
        if (idx < raw.hourly.time.length) {
          const itemTime = Math.floor(new Date(raw.hourly.time[idx]).getTime() / 1000);
          const itemCode = raw.hourly.weather_code[idx];
          const itemHour = new Date(raw.hourly.time[idx]).getHours();
          const itemIsDay = (itemHour >= 6 && itemHour < 19) ? 1 : 0;
          const itemW = parseWMOCode(itemCode, itemIsDay);

          formattedHourly.push({
            dt: itemTime,
            main: {
              temp: raw.hourly.temperature_2m[idx]
            },
            weather: [{
              id: itemW.id,
              main: itemW.main,
              description: itemW.description,
              icon: itemW.icon
            }],
            pop: (raw.hourly.precipitation_probability?.[idx] || 0) / 100
          });
        }
      }
    }

    // 3. Format 5-Day Extended Daily Forecast
    const formattedDailyList = [];
    if (raw.daily && raw.daily.time) {
      // Create 5 daily entries
      const count = Math.min(5, raw.daily.time.length);
      for (let i = 0; i < count; i++) {
        const itemDateStr = raw.daily.time[i];
        const dayUnix = Math.floor(new Date(itemDateStr + 'T12:00:00').getTime() / 1000);
        const wCode = raw.daily.weather_code[i];
        const wInfo = parseWMOCode(wCode, 1);
        const popMax = (raw.daily.precipitation_probability_max?.[i] || 0) / 100;

        formattedDailyList.push({
          dt: dayUnix,
          main: {
            temp: (raw.daily.temperature_2m_max[i] + raw.daily.temperature_2m_min[i]) / 2,
            temp_min: raw.daily.temperature_2m_min[i],
            temp_max: raw.daily.temperature_2m_max[i]
          },
          weather: [{
            id: wInfo.id,
            main: wInfo.main,
            description: wInfo.description,
            icon: wInfo.icon
          }],
          pop: popMax
        });
      }
    }

    const formattedForecast = {
      city: {
        name: displayName,
        country: countryCode,
        timezone: raw.utc_offset_seconds || 0
      },
      list: formattedHourly,
      dailyList: formattedDailyList
    };

    return {
      current: formattedCurrent,
      forecast: formattedForecast,
      provider: 'SkyPulse Live Weather API'
    };
  }

  // ========================================================================
  // PUBLIC WEATHER API INTERFACE
  // ========================================================================
  return {
    /**
     * Get real-time live weather by city name
     * @param {string} cityName 
     */
    async getWeatherByCity(cityName) {
      const geo = await geocodeCity(cityName);
      return await fetchLiveMeteoData(geo.lat, geo.lon, geo.name, geo.country);
    },

    /**
     * Get real-time live weather by geographic coordinates
     * @param {number} lat 
     * @param {number} lon 
     */
    async getWeatherByCoords(lat, lon) {
      let resolvedName = 'Current Location';
      let resolvedCountry = '';

      try {
        // Reverse geocode to get human-readable location name
        const revRes = await fetch(`${REVERSE_GEO_URL}?lat=${lat}&lon=${lon}&format=json`);
        if (revRes.ok) {
          const revData = await revRes.json();
          resolvedName = revData.address?.city || revData.address?.town || revData.address?.village || revData.address?.county || 'Current Location';
          resolvedCountry = revData.address?.country_code ? revData.address.country_code.toUpperCase() : '';
        }
      } catch (err) {
        console.warn('Reverse geocode fallback:', err);
      }

      return await fetchLiveMeteoData(lat, lon, resolvedName, resolvedCountry);
    },

    /**
     * Custom OpenWeatherMap API fetcher (when user specifies their key)
     */
    async fetchOpenWeather(cityName, apiKey) {
      const encCity = encodeURIComponent(cityName.trim());
      const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encCity}&units=metric&appid=${apiKey}`);
      if (!weatherRes.ok) throw new Error(`OpenWeather returned error ${weatherRes.status}`);
      const current = await weatherRes.json();

      const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encCity}&units=metric&appid=${apiKey}`);
      if (!forecastRes.ok) throw new Error(`OpenWeather forecast returned error ${forecastRes.status}`);
      const forecast = await forecastRes.json();

      return {
        current,
        forecast,
        provider: 'OpenWeather API'
      };
    }
  };
})();

// Export globally for browser scripts
if (typeof window !== 'undefined') {
  window.WeatherAPI = WeatherAPI;
}
