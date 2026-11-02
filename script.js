/**
 * ==========================================================================
 * SkyPulse - Modern Weather Forecast Application
 * Vanilla JavaScript (ES6+)
 * 
 * Integrated with:
 * - Dedicated WeatherAPI Engine (Real-Time Live Global Weather Data)
 * - Local REST Weather API Server (http://localhost:3000/api)
 * - OpenWeatherMap API (optional with personal API key)
 * ==========================================================================
 */

// ==========================================================================
// 1. CONFIGURATION & STORAGE KEYS
// ==========================================================================
const STORAGE_KEY_PROVIDER = 'skypulse_api_provider';
const STORAGE_KEY_API = 'skypulse_openweather_api_key';
const STORAGE_KEY_LOCAL_SERVER = 'skypulse_local_server_url';
const STORAGE_KEY_LAST_CITY = 'skypulse_last_city';
const STORAGE_KEY_UNIT = 'skypulse_temp_unit';

// ==========================================================================
// 2. APPLICATION STATE
// ==========================================================================
const state = {
  provider: localStorage.getItem(STORAGE_KEY_PROVIDER) || 'builtin', // 'builtin' | 'local' | 'openweather'
  apiKey: localStorage.getItem(STORAGE_KEY_API) || '',
  localServerUrl: localStorage.getItem(STORAGE_KEY_LOCAL_SERVER) || 'http://localhost:3000/api',
  unit: localStorage.getItem(STORAGE_KEY_UNIT) || 'C',               // 'C' for Celsius, 'F' for Fahrenheit
  currentWeatherData: null,                                         // Current weather metrics
  forecastData: null                                                // Hourly and daily forecasts
};

// ==========================================================================
// 3. DOM ELEMENTS SELECTION
// ==========================================================================
const elements = {
  // Search and Location
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  locationBtn: document.getElementById('location-btn'),
  cityChips: document.querySelectorAll('.city-chip'),

  // Unit Conversion
  unitCBtn: document.getElementById('unit-c'),
  unitFBtn: document.getElementById('unit-f'),

  // API Modal & Settings
  apiSettingsBtn: document.getElementById('api-settings-btn'),
  apiStatusBadge: document.getElementById('api-status-badge'),
  apiModal: document.getElementById('api-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  apiProviderSelect: document.getElementById('api-provider-select'),
  openweatherGroup: document.getElementById('openweather-group'),
  apiKeyInput: document.getElementById('api-key-input'),
  localServerGroup: document.getElementById('local-server-group'),
  localServerInput: document.getElementById('local-server-input'),
  saveApiKeyBtn: document.getElementById('save-api-key-btn'),
  resetApiBtn: document.getElementById('reset-api-btn'),

  // Notifications & Loaders
  statusBanner: document.getElementById('status-banner'),
  statusMessage: document.getElementById('status-message'),
  statusIcon: document.getElementById('status-icon'),
  closeBannerBtn: document.getElementById('close-banner-btn'),
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingText: document.getElementById('loading-text'),

  // Weather Displays
  cityName: document.getElementById('city-name'),
  currentDate: document.getElementById('current-date'),
  weatherBadge: document.getElementById('weather-badge'),
  weatherConditionText: document.getElementById('weather-condition-text'),
  currentWeatherIcon: document.getElementById('current-weather-icon'),
  currentTemp: document.getElementById('current-temp'),
  tempUnitSymbol: document.querySelector('.temp-unit-symbol'),
  feelsLikeTemp: document.getElementById('feels-like-temp'),
  tempMax: document.getElementById('temp-max'),
  tempMin: document.getElementById('temp-min'),

  // Weather Highlights Metrics
  humidityValue: document.getElementById('humidity-value'),
  humidityLevel: document.getElementById('humidity-level'),
  windValue: document.getElementById('wind-value'),
  windDirection: document.getElementById('wind-direction'),
  pressureValue: document.getElementById('pressure-value'),
  visibilityValue: document.getElementById('visibility-value'),
  visibilityDesc: document.getElementById('visibility-desc'),
  sunriseTime: document.getElementById('sunrise-time'),
  sunsetTime: document.getElementById('sunset-time'),

  // Forecast Containers
  hourlyContainer: document.getElementById('hourly-forecast-container'),
  forecastContainer: document.getElementById('forecast-container')
};

// ==========================================================================
// 4. HELPER FUNCTIONS & UTILITIES
// ==========================================================================

/**
 * Converts Celsius temperature to Fahrenheit
 */
function celsiusToFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}

/**
 * Formats a temperature according to the current active unit ('C' or 'F')
 */
function formatTemperature(tempInC) {
  if (tempInC === null || tempInC === undefined || isNaN(tempInC)) return '--';
  const val = state.unit === 'F' ? celsiusToFahrenheit(tempInC) : tempInC;
  return Math.round(val).toString();
}

/**
 * Formats wind speed based on active unit (km/h for C, mph for F)
 */
function formatWindSpeed(speedMps) {
  if (!speedMps && speedMps !== 0) return '-- km/h';
  if (state.unit === 'F') {
    const mph = speedMps * 2.23694;
    return `${Math.round(mph)} mph`;
  } else {
    const kmh = speedMps * 3.6;
    return `${Math.round(kmh)} km/h`;
  }
}

/**
 * Converts wind degrees into compass direction (e.g., "NE", "SSW")
 */
function getWindDirection(deg) {
  if (deg === undefined || deg === null) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

/**
 * Formats Unix timestamp to local time string (e.g., "06:45 AM")
 */
function formatLocalTime(unixTimestamp, timezoneOffsetSeconds = 0) {
  const date = new Date((unixTimestamp + timezoneOffsetSeconds) * 1000);
  return date.toUTCString().replace(/^.*:\d\d\s/, '').slice(11, 16);
}

/**
 * Formats a Unix timestamp into readable Date (e.g., "Monday, Nov 2, 2026")
 */
function formatFullDate(unixTimestamp, timezoneOffsetSeconds = 0) {
  const date = new Date((unixTimestamp + timezoneOffsetSeconds) * 1000);
  const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Capitalizes every first letter of a string
 */
function capitalizeWords(str) {
  if (!str) return '';
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Displays a non-intrusive status/error banner at the top
 */
function showBanner(message, type = 'danger') {
  elements.statusMessage.textContent = message;
  elements.statusBanner.className = 'status-banner';

  if (type === 'danger') {
    elements.statusBanner.classList.add('banner-danger');
    elements.statusIcon.className = 'fa-solid fa-triangle-exclamation';
  } else if (type === 'warning') {
    elements.statusBanner.classList.add('banner-warning');
    elements.statusIcon.className = 'fa-solid fa-circle-exclamation';
  } else {
    elements.statusBanner.classList.add('banner-info');
    elements.statusIcon.className = 'fa-solid fa-circle-info';
  }

  elements.statusBanner.classList.remove('hidden');
}

/**
 * Hides the status banner
 */
function hideBanner() {
  elements.statusBanner.classList.add('hidden');
}

/**
 * Helper to compute element center coordinates for spreading wave origin
 */
function getElementCenter(el) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

/**
 * Triggers the Flowing Wind atmospheric animation in the middle dashboard
 */
function toggleLoading(show, message = 'Measuring Atmospheric Wind Currents...', target = 'WIND STREAM', origin = null) {
  if (window.WindFlow) {
    if (show) {
      WindFlow.start(message, target, origin);
      const dashboard = document.getElementById('weather-dashboard');
      if (dashboard) {
        const rect = dashboard.getBoundingClientRect();
        if (rect.top < -100) {
          dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } else {
      WindFlow.stop();
    }
  }
}

/**
 * Selects a high-definition background picture matching current weather condition & day/night
 * @param {number} code - OpenWeather / WMO weather condition code
 * @param {boolean} isNight - Whether it is nighttime
 * @returns {string} URL to background photo
 */
function getWeatherPhoto(code, isNight) {
  // Thunderstorm (200 - 299)
  if (code >= 200 && code < 300) {
    return 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?auto=format&fit=crop&w=1920&q=80';
  }

  // Drizzle / Rain (300 - 599)
  if (code >= 300 && code < 600) {
    return isNight
      ? 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1920&q=80'  // Atmospheric night rain & city reflections
      : 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1920&q=80'; // Daylight rain droplets
  }

  // Snow (600 - 699)
  if (code >= 600 && code < 700) {
    return isNight
      ? 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?auto=format&fit=crop&w=1920&q=80'  // Peaceful snowy winter night
      : 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?auto=format&fit=crop&w=1920&q=80'; // Crisp falling snow in daylight
  }

  // Atmosphere: Mist, Smoke, Fog (700 - 799)
  if (code >= 700 && code < 800) {
    return isNight
      ? 'https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?auto=format&fit=crop&w=1920&q=80'  // Night fog & glowing lamps
      : 'https://images.unsplash.com/photo-1487621167305-5d248087c724?auto=format&fit=crop&w=1920&q=80'; // Ethereal morning daylight mist
  }

  // Clear Sky (800)
  if (code === 800) {
    return isNight
      ? 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80'  // Starry night sky with stars and moonlight
      : 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?auto=format&fit=crop&w=1920&q=80'; // Bright sunny daylight sky
  }

  // Clouds (801 - 804)
  if (code > 800) {
    return isNight
      ? 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=1920&q=80'  // Moonlit night clouds
      : 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1920&q=80'; // Rolling daytime cumulus clouds
  }

  // Default fallback
  return isNight
    ? 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80'
    : 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?auto=format&fit=crop&w=1920&q=80';
}

/**
 * Smoothly updates background image backdrop
 * @param {string} photoUrl 
 */
function updateBackgroundPhoto(photoUrl) {
  const backdrop = document.getElementById('bg-weather-backdrop');
  if (!backdrop) return;

  const img = new Image();
  img.src = photoUrl;
  img.onload = () => {
    backdrop.style.backgroundImage = `url('${photoUrl}')`;
    backdrop.style.opacity = '1';
  };
}

/**
 * Updates dynamic theme on body based on weather condition code and day/night icon
 */
function applyWeatherTheme(conditionCode, iconCode = 'd') {
  const data = state.currentWeatherData;
  let isNight = iconCode.endsWith('n');

  // Check if current time at destination is night (between sunset and sunrise)
  if (data && data.sys && data.sys.sunrise && data.sys.sunset && data.dt) {
    isNight = data.dt < data.sys.sunrise || data.dt >= data.sys.sunset;
  }

  document.body.className = '';

  if (conditionCode >= 200 && conditionCode < 300) {
    document.body.classList.add('theme-thunderstorm');
  } else if (conditionCode >= 300 && conditionCode < 600) {
    document.body.classList.add('theme-rain');
  } else if (conditionCode >= 600 && conditionCode < 700) {
    document.body.classList.add('theme-snow');
  } else if (conditionCode >= 700 && conditionCode < 800) {
    document.body.classList.add('theme-mist');
  } else if (conditionCode === 800) {
    document.body.classList.add(isNight ? 'theme-clear-night' : 'theme-clear');
  } else if (conditionCode > 800) {
    document.body.classList.add('theme-clouds');
  } else {
    document.body.classList.add('theme-default');
  }

  // Dynamically change background picture based on weather condition & night/day
  const photo = getWeatherPhoto(conditionCode, isNight);
  updateBackgroundPhoto(photo);
}

// ==========================================================================
// 5. WEATHER RENDERING FUNCTIONS
// ==========================================================================

/**
 * Updates the primary current weather card and highlights grid
 */
function renderCurrentWeather() {
  const data = state.currentWeatherData;
  if (!data) return;

  const { name, sys, main, weather, wind, visibility, dt, timezone } = data;
  const currentWeather = weather[0] || {};

  // City and Country
  const countryDisplay = sys && sys.country ? `, ${sys.country}` : '';
  elements.cityName.textContent = `${name}${countryDisplay}`;
  
  // Date and Time
  elements.currentDate.textContent = formatFullDate(dt, timezone);

  // Condition Badge & Icon
  const description = capitalizeWords(currentWeather.description || 'Clear Sky');
  elements.weatherConditionText.textContent = description;
  elements.currentWeatherIcon.src = `https://openweathermap.org/img/wn/${currentWeather.icon || '01d'}@4x.png`;
  elements.currentWeatherIcon.alt = description;

  // Temperatures
  elements.currentTemp.textContent = formatTemperature(main.temp);
  elements.tempUnitSymbol.textContent = `°${state.unit}`;
  elements.feelsLikeTemp.textContent = `${formatTemperature(main.feels_like)}°${state.unit}`;
  elements.tempMax.textContent = `${formatTemperature(main.temp_max)}°`;
  elements.tempMin.textContent = `${formatTemperature(main.temp_min)}°`;

  // Humidity
  elements.humidityValue.textContent = `${main.humidity}%`;
  if (main.humidity > 70) elements.humidityLevel.textContent = 'High / Muggy';
  else if (main.humidity < 30) elements.humidityLevel.textContent = 'Dry Air';
  else elements.humidityLevel.textContent = 'Comfortable';

  // Wind
  elements.windValue.textContent = formatWindSpeed(wind.speed);
  elements.windDirection.textContent = `Direction: ${getWindDirection(wind.deg)}`;

  // Pressure
  elements.pressureValue.textContent = `${main.pressure} hPa`;

  // Visibility
  if (visibility !== undefined) {
    const km = (visibility / 1000).toFixed(1);
    elements.visibilityValue.textContent = state.unit === 'F' ? `${(km * 0.621371).toFixed(1)} mi` : `${km} km`;
    elements.visibilityDesc.textContent = visibility >= 8000 ? 'Clear & Good' : 'Moderate / Low';
  } else {
    elements.visibilityValue.textContent = '--';
  }

  // Sunrise and Sunset
  if (sys && sys.sunrise && sys.sunset) {
    elements.sunriseTime.textContent = formatLocalTime(sys.sunrise, timezone);
    elements.sunsetTime.textContent = formatLocalTime(sys.sunset, timezone);
  }

  // Update dynamic atmospheric background theme
  applyWeatherTheme(currentWeather.id || 800, currentWeather.icon || '01d');
}

/**
 * Renders the next 24-hour timeline in 3-hour increments
 */
function renderHourlyForecast() {
  const forecast = state.forecastData;
  elements.hourlyContainer.innerHTML = '';

  if (!forecast || !forecast.list || forecast.list.length === 0) {
    elements.hourlyContainer.innerHTML = '<p class="header-note">Hourly forecast unavailable</p>';
    return;
  }

  const next24Hours = forecast.list.slice(0, 8);
  const timezone = forecast.city?.timezone || 0;

  next24Hours.forEach((hourData, index) => {
    const card = document.createElement('div');
    card.className = `hourly-card ${index === 0 ? 'active-hour' : ''}`;

    const date = new Date((hourData.dt + timezone) * 1000);
    const hourString = index === 0 ? 'Now' : date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'UTC' });
    const weather = hourData.weather[0] || {};
    const iconUrl = `https://openweathermap.org/img/wn/${weather.icon || '01d'}@2x.png`;
    const pop = Math.round((hourData.pop || 0) * 100);

    card.innerHTML = `
      <span class="hourly-time">${hourString}</span>
      <img src="${iconUrl}" alt="${weather.description || 'weather'}" class="hourly-icon">
      <span class="hourly-temp">${formatTemperature(hourData.main.temp)}°</span>
      <span class="hourly-pop">
        <i class="fa-solid fa-droplet"></i> ${pop}%
      </span>
    `;

    elements.hourlyContainer.appendChild(card);
  });
}

/**
 * Renders the 5-day extended forecast
 */
function renderDailyForecast() {
  const forecast = state.forecastData;
  elements.forecastContainer.innerHTML = '';

  if (!forecast) {
    elements.forecastContainer.innerHTML = '<p class="header-note">Extended forecast unavailable</p>';
    return;
  }

  const timezone = forecast.city?.timezone || 0;

  // Option A: If dailyList is provided directly by WeatherAPI
  if (forecast.dailyList && forecast.dailyList.length > 0) {
    forecast.dailyList.slice(0, 5).forEach((dayData, index) => {
      const sampleDate = new Date((dayData.dt + timezone) * 1000);
      const dayName = index === 0 ? 'Today' : sampleDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const formattedDate = sampleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      const weather = dayData.weather[0] || {};
      const conditionText = capitalizeWords(weather.description || 'Clear');
      const iconUrl = `https://openweathermap.org/img/wn/${weather.icon || '01d'}@2x.png`;
      const pop = Math.round((dayData.pop || 0) * 100);

      const card = document.createElement('div');
      card.className = 'forecast-card';
      card.innerHTML = `
        <span class="forecast-day">${dayName}</span>
        <span class="forecast-date">${formattedDate}</span>
        <img src="${iconUrl}" alt="${conditionText}" class="forecast-icon">
        <span class="forecast-condition">${conditionText}</span>
        <div class="forecast-temps">
          <span class="forecast-max">${formatTemperature(dayData.main.temp_max)}°</span>
          <span class="forecast-min">${formatTemperature(dayData.main.temp_min)}°</span>
        </div>
        <div class="forecast-extra">
          <i class="fa-solid fa-umbrella"></i> ${pop}%
        </div>
      `;
      elements.forecastContainer.appendChild(card);
    });
    return;
  }

  // Option B: Group 3-hourly forecast records into daily aggregates (OpenWeather format)
  if (forecast.list && forecast.list.length > 0) {
    const daysMap = new Map();
    forecast.list.forEach(item => {
      const itemDate = new Date((item.dt + timezone) * 1000);
      const dateKey = itemDate.toISOString().split('T')[0];
      if (!daysMap.has(dateKey)) daysMap.set(dateKey, []);
      daysMap.get(dateKey).push(item);
    });

    const dailyEntries = Array.from(daysMap.entries()).slice(0, 5);
    dailyEntries.forEach(([dateKey, readings], index) => {
      let minTemp = Infinity;
      let maxTemp = -Infinity;
      readings.forEach(r => {
        if (r.main.temp_min < minTemp) minTemp = r.main.temp_min;
        if (r.main.temp_max > maxTemp) maxTemp = r.main.temp_max;
      });

      const representative = readings[Math.floor(readings.length / 2)] || readings[0];
      const weather = representative.weather[0] || {};
      const iconUrl = `https://openweathermap.org/img/wn/${weather.icon || '01d'}@2x.png`;
      const conditionText = capitalizeWords(weather.description || 'Clear');
      const sampleDate = new Date((representative.dt + timezone) * 1000);
      const dayName = index === 0 ? 'Today' : sampleDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const formattedDate = sampleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      const avgPop = Math.round((representative.pop || 0) * 100);

      const card = document.createElement('div');
      card.className = 'forecast-card';
      card.innerHTML = `
        <span class="forecast-day">${dayName}</span>
        <span class="forecast-date">${formattedDate}</span>
        <img src="${iconUrl}" alt="${conditionText}" class="forecast-icon">
        <span class="forecast-condition">${conditionText}</span>
        <div class="forecast-temps">
          <span class="forecast-max">${formatTemperature(maxTemp)}°</span>
          <span class="forecast-min">${formatTemperature(minTemp)}°</span>
        </div>
        <div class="forecast-extra">
          <i class="fa-solid fa-umbrella"></i> ${avgPop}%
        </div>
      `;
      elements.forecastContainer.appendChild(card);
    });
  }
}

/**
 * Re-renders all weather elements when unit changes or fresh data arrives
 */
function refreshWeatherDisplay() {
  renderCurrentWeather();
  renderHourlyForecast();
  renderDailyForecast();
}

// ==========================================================================
// 6. REAL-TIME API FETCHING (Supports WeatherAPI, Local Server & OpenWeather)
// ==========================================================================

/**
 * Fetches current weather and 5-day forecast by city name
 * @param {string} city - Name of city to search
 * @param {{x: number, y: number} | null} origin - Coordinates of trigger origin for spiderweb wave
 */
async function fetchWeatherDataByCity(city, origin = null) {
  if (!city || !city.trim()) {
    showBanner('Please enter a valid city name.', 'warning');
    return;
  }

  const queryCity = city.trim();
  hideBanner();
  const waveOrigin = origin || getElementCenter(elements.searchForm);
  toggleLoading(true, `Measuring atmospheric wind currents for "${queryCity}"...`, queryCity, waveOrigin);

  try {
    let result = null;

    // Route based on selected API provider
    if (state.provider === 'local') {
      // Custom Local API Server
      const baseUrl = state.localServerUrl.replace(/\/$/, '');
      const [wRes, fRes] = await Promise.all([
        fetch(`${baseUrl}/weather?city=${encodeURIComponent(queryCity)}`),
        fetch(`${baseUrl}/forecast?city=${encodeURIComponent(queryCity)}`)
      ]);

      if (!wRes.ok || !fRes.ok) {
        throw new Error(`Local Weather Server responded with error (${wRes.status || fRes.status}). Ensure server.js or server.py is running.`);
      }

      const current = await wRes.json();
      const forecast = await fRes.json();
      result = { current, forecast, provider: 'Local Weather API Server' };

    } else if (state.provider === 'openweather') {
      // OpenWeatherMap API
      if (!state.apiKey) {
        throw new Error('Please enter your OpenWeather API key in Settings (Gear icon).');
      }
      result = await WeatherAPI.fetchOpenWeather(queryCity, state.apiKey);

    } else {
      // Default: Live Real-Time SkyPulse Weather API (Zero registration needed!)
      result = await WeatherAPI.getWeatherByCity(queryCity);
    }

    state.currentWeatherData = result.current;
    state.forecastData = result.forecast;
    localStorage.setItem(STORAGE_KEY_LAST_CITY, result.current.name);
    updateApiStatusBadge(result.provider);

    refreshWeatherDisplay();

  } catch (error) {
    console.error('Weather fetch error:', error);
    showBanner(error.message || `City "${queryCity}" not found. Please verify spelling.`, 'danger');
  } finally {
    toggleLoading(false);
  }
}

/**
 * Fetches current weather and 5-day forecast by coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {{x: number, y: number} | null} origin - Coordinates of trigger origin for spiderweb wave
 */
async function fetchWeatherDataByCoords(lat, lon, origin = null) {
  hideBanner();
  const waveOrigin = origin || getElementCenter(elements.locationBtn);
  toggleLoading(true, 'Sensing GPS atmospheric wind vectors...', `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`, waveOrigin);

  try {
    let result = null;

    if (state.provider === 'local') {
      const baseUrl = state.localServerUrl.replace(/\/$/, '');
      const [wRes, fRes] = await Promise.all([
        fetch(`${baseUrl}/weather?lat=${lat}&lon=${lon}`),
        fetch(`${baseUrl}/forecast?lat=${lat}&lon=${lon}`)
      ]);

      if (!wRes.ok || !fRes.ok) {
        throw new Error(`Local Weather Server responded with error. Ensure server.js or server.py is running.`);
      }

      result = { current: await wRes.json(), forecast: await fRes.json(), provider: 'Local Weather Server' };

    } else if (state.provider === 'openweather' && state.apiKey) {
      const wUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${state.apiKey}`;
      const fUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${state.apiKey}`;
      const [wRes, fRes] = await Promise.all([fetch(wUrl), fetch(fUrl)]);
      if (!wRes.ok) throw new Error('Failed to fetch from OpenWeatherMap.');
      result = { current: await wRes.json(), forecast: await fRes.json(), provider: 'OpenWeatherMap' };

    } else {
      // Built-in Live Weather API
      result = await WeatherAPI.getWeatherByCoords(lat, lon);
    }

    state.currentWeatherData = result.current;
    state.forecastData = result.forecast;
    localStorage.setItem(STORAGE_KEY_LAST_CITY, result.current.name);
    updateApiStatusBadge(result.provider);

    refreshWeatherDisplay();

  } catch (error) {
    console.error('Coords weather error:', error);
    showBanner(error.message || 'Unable to retrieve weather for current coordinates.', 'danger');
  } finally {
    toggleLoading(false);
  }
}

// ==========================================================================
// 7. GEOLOCATION HANDLER
// ==========================================================================
function getCurrentLocationWeather(origin = null) {
  if (!navigator.geolocation) {
    showBanner('Geolocation is not supported by your browser.', 'warning');
    return;
  }

  const waveOrigin = origin || getElementCenter(elements.locationBtn);
  toggleLoading(true, 'Flowing wind sensors acquiring GPS location...', 'CURRENT LOCATION', waveOrigin);

  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude } = position.coords;
      fetchWeatherDataByCoords(latitude, longitude, waveOrigin);
    },
    error => {
      toggleLoading(false);
      switch (error.code) {
        case error.PERMISSION_DENIED:
          showBanner('Location permission was denied. Please allow access or search manually.', 'warning');
          break;
        case error.POSITION_UNAVAILABLE:
          showBanner('GPS location unavailable. Please search for your city name.', 'danger');
          break;
        case error.TIMEOUT:
          showBanner('Location request timed out. Please try again.', 'warning');
          break;
        default:
          showBanner('An error occurred while detecting location.', 'danger');
      }
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

// ==========================================================================
// 8. API STATUS & MODAL MANAGEMENT
// ==========================================================================

/**
 * Updates the small indicator dot next to the settings gear
 */
function updateApiStatusBadge(providerName) {
  elements.apiStatusBadge.className = 'badge-dot badge-live';
  elements.apiStatusBadge.title = `Live Weather Connected (${providerName || 'SkyPulse API'})`;
}

/**
 * Synchronizes modal input visibility with selected provider
 */
function syncModalProviderFields() {
  const selected = elements.apiProviderSelect.value;
  if (selected === 'openweather') {
    elements.openweatherGroup.classList.remove('hidden');
    elements.localServerGroup.classList.add('hidden');
  } else if (selected === 'local') {
    elements.localServerGroup.classList.remove('hidden');
    elements.openweatherGroup.classList.add('hidden');
  } else {
    elements.openweatherGroup.classList.add('hidden');
    elements.localServerGroup.classList.add('hidden');
  }
}

// ==========================================================================
// 9. EVENT LISTENERS & USER INTERACTIONS
// ==========================================================================

// Search form submission
elements.searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = elements.searchInput.value.trim();
  if (query) {
    const origin = getElementCenter(elements.searchInput) || getElementCenter(elements.searchForm);
    fetchWeatherDataByCity(query, origin);
  }
});

// Current location button
elements.locationBtn.addEventListener('click', (e) => {
  const origin = (e.clientX && e.clientY) 
    ? { x: e.clientX, y: e.clientY } 
    : getElementCenter(elements.locationBtn);
  getCurrentLocationWeather(origin);
});

// Popular quick city chips
elements.cityChips.forEach(chip => {
  chip.addEventListener('click', (e) => {
    const city = chip.getAttribute('data-city');
    elements.searchInput.value = city;
    const origin = (e.clientX && e.clientY) 
      ? { x: e.clientX, y: e.clientY } 
      : getElementCenter(chip);
    fetchWeatherDataByCity(city, origin);
  });
});

// Celsius Unit Switcher
elements.unitCBtn.addEventListener('click', () => {
  if (state.unit !== 'C') {
    state.unit = 'C';
    localStorage.setItem(STORAGE_KEY_UNIT, 'C');
    elements.unitCBtn.classList.add('active');
    elements.unitFBtn.classList.remove('active');
    refreshWeatherDisplay();
  }
});

// Fahrenheit Unit Switcher
elements.unitFBtn.addEventListener('click', () => {
  if (state.unit !== 'F') {
    state.unit = 'F';
    localStorage.setItem(STORAGE_KEY_UNIT, 'F');
    elements.unitFBtn.classList.add('active');
    elements.unitCBtn.classList.remove('active');
    refreshWeatherDisplay();
  }
});

// Close notification banner
elements.closeBannerBtn.addEventListener('click', () => {
  hideBanner();
});

// Open Settings Modal
elements.apiSettingsBtn.addEventListener('click', () => {
  elements.apiProviderSelect.value = state.provider;
  elements.apiKeyInput.value = state.apiKey;
  elements.localServerInput.value = state.localServerUrl;
  syncModalProviderFields();
  elements.apiModal.classList.remove('hidden');
});

// Close Settings Modal
elements.closeModalBtn.addEventListener('click', () => {
  elements.apiModal.classList.add('hidden');
});

// Close Modal when clicking outside
elements.apiModal.addEventListener('click', (e) => {
  if (e.target === elements.apiModal) {
    elements.apiModal.classList.add('hidden');
  }
});

// Provider dropdown selection changed
elements.apiProviderSelect.addEventListener('change', () => {
  syncModalProviderFields();
});

// Save API Settings
elements.saveApiKeyBtn.addEventListener('click', () => {
  const chosenProvider = elements.apiProviderSelect.value;
  state.provider = chosenProvider;
  localStorage.setItem(STORAGE_KEY_PROVIDER, chosenProvider);

  if (chosenProvider === 'openweather') {
    state.apiKey = elements.apiKeyInput.value.trim();
    localStorage.setItem(STORAGE_KEY_API, state.apiKey);
  } else if (chosenProvider === 'local') {
    state.localServerUrl = elements.localServerInput.value.trim() || 'http://localhost:3000/api';
    localStorage.setItem(STORAGE_KEY_LOCAL_SERVER, state.localServerUrl);
  }

  elements.apiModal.classList.add('hidden');
  const cityToQuery = elements.cityName.textContent.split(',')[0].trim() || 'London';
  fetchWeatherDataByCity(cityToQuery);
});

// Reset to Default API
elements.resetApiBtn.addEventListener('click', () => {
  state.provider = 'builtin';
  localStorage.setItem(STORAGE_KEY_PROVIDER, 'builtin');
  elements.apiProviderSelect.value = 'builtin';
  syncModalProviderFields();
  elements.apiModal.classList.add('hidden');

  showBanner('Reset to SkyPulse Live Weather API (Default).', 'info');
  const cityToQuery = elements.cityName.textContent.split(',')[0].trim() || 'London';
  fetchWeatherDataByCity(cityToQuery);
});

// ==========================================================================
// 10. INITIALIZATION
// ==========================================================================
function initApp() {
  // Ensure Light Mode with solid black borders is active
  document.documentElement.setAttribute('data-theme', 'light');

  // Sync Unit Switcher UI with stored preference
  if (state.unit === 'F') {
    elements.unitFBtn.classList.add('active');
    elements.unitCBtn.classList.remove('active');
  } else {
    elements.unitCBtn.classList.add('active');
    elements.unitFBtn.classList.remove('active');
  }

  // Initial city load
  const initialCity = localStorage.getItem(STORAGE_KEY_LAST_CITY) || 'London';
  fetchWeatherDataByCity(initialCity);
}

// Run when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
