/**
 * ==========================================================================
 * SkyPulse Weather API Server (Node.js)
 * ==========================================================================
 * A lightweight, zero-dependency REST Weather API & Static Web Server.
 * 
 * Endpoints:
 * - GET /api/weather?city=London        -> Current real-time weather
 * - GET /api/weather?lat=51.5&lon=-0.12  -> Current weather by coordinates
 * - GET /api/forecast?city=London       -> 5-Day forecast
 * - GET /api/forecast?lat=51.5&lon=-0.12 -> 5-Day forecast by coordinates
 * - GET /api/health                     -> Health check
 * - GET /*                              -> Static website files (index.html, etc.)
 * 
 * Usage:
 *   node server.js
 * ==========================================================================
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

/**
 * Helper to make HTTPS requests and return parsed JSON
 */
function httpsGetJson(requestUrl) {
  return new Promise((resolve, reject) => {
    https.get(requestUrl, { headers: { 'User-Agent': 'SkyPulseWeatherServer/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (err) {
          reject(new Error(`Failed to parse JSON response: ${err.message}`));
        }
      });
    }).on('error', err => reject(err));
  });
}

/**
 * Translates WMO weather codes to condition names and icon codes
 */
function wmoToWeather(code, isDay = 1) {
  const d = isDay ? 'd' : 'n';
  switch (code) {
    case 0: return { main: 'Clear', description: 'Clear sky', icon: `01${d}`, id: 800 };
    case 1: return { main: 'Clear', description: 'Mainly clear', icon: `02${d}`, id: 801 };
    case 2: return { main: 'Clouds', description: 'Partly cloudy', icon: `03${d}`, id: 802 };
    case 3: return { main: 'Clouds', description: 'Overcast', icon: `04${d}`, id: 804 };
    case 45:
    case 48: return { main: 'Mist', description: 'Fog / Mist', icon: `50${d}`, id: 741 };
    case 51:
    case 53:
    case 55: return { main: 'Drizzle', description: 'Drizzle', icon: `09${d}`, id: 300 };
    case 61:
    case 63: return { main: 'Rain', description: 'Rain', icon: `10${d}`, id: 500 };
    case 65: return { main: 'Rain', description: 'Heavy Rain', icon: `10${d}`, id: 502 };
    case 71:
    case 73:
    case 75: return { main: 'Snow', description: 'Snow', icon: `13${d}`, id: 600 };
    case 80:
    case 81:
    case 82: return { main: 'Rain', description: 'Showers', icon: `09${d}`, id: 521 };
    case 95:
    case 96:
    case 99: return { main: 'Thunderstorm', description: 'Thunderstorm', icon: `11${d}`, id: 200 };
    default: return { main: 'Clouds', description: 'Scattered clouds', icon: `03${d}`, id: 803 };
  }
}

/**
 * Geocodes city to coordinates
 */
async function geocode(cityName) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
  const res = await httpsGetJson(geoUrl);
  if (!res.data.results || res.data.results.length === 0) {
    throw new Error(`City "${cityName}" not found`);
  }
  const first = res.data.results[0];
  return {
    name: first.name,
    country: first.country_code ? first.country_code.toUpperCase() : (first.country || ''),
    lat: first.latitude,
    lon: first.longitude
  };
}

/**
 * Weather API controller
 */
async function handleWeatherApi(req, res, parsedUrl) {
  const query = parsedUrl.query;
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    let lat = parseFloat(query.lat);
    let lon = parseFloat(query.lon);
    let cityName = query.city || 'London';
    let country = '';

    if (query.city || (!lat && !lon)) {
      const geo = await geocode(cityName);
      lat = geo.lat;
      lon = geo.lon;
      cityName = geo.name;
      country = geo.country;
    } else {
      cityName = `Coordinates (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    }

    // Call meteorological backend
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto`;
    const meteoRes = await httpsGetJson(meteoUrl);
    const raw = meteoRes.data;

    const current = raw.current;
    const isDay = current.is_day !== undefined ? current.is_day : 1;
    const weatherInfo = wmoToWeather(current.weather_code, isDay);
    const nowUnix = Math.floor(new Date(current.time).getTime() / 1000);

    const sunrise = raw.daily?.sunrise?.[0] ? Math.floor(new Date(raw.daily.sunrise[0]).getTime() / 1000) : nowUnix - 18000;
    const sunset = raw.daily?.sunset?.[0] ? Math.floor(new Date(raw.daily.sunset[0]).getTime() / 1000) : nowUnix + 25200;

    if (pathname === '/api/weather') {
      const currentWeatherPayload = {
        name: cityName,
        sys: { country, sunrise, sunset },
        main: {
          temp: current.temperature_2m,
          feels_like: current.apparent_temperature,
          temp_min: raw.daily?.temperature_2m_min?.[0] ?? current.temperature_2m - 2,
          temp_max: raw.daily?.temperature_2m_max?.[0] ?? current.temperature_2m + 2,
          humidity: current.relative_humidity_2m,
          pressure: Math.round(current.surface_pressure || 1013)
        },
        wind: {
          speed: current.wind_speed_10m / 3.6,
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

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(currentWeatherPayload));
      return;
    }

    if (pathname === '/api/forecast') {
      const formattedHourly = [];
      if (raw.hourly && raw.hourly.time) {
        const currentTimeIndex = raw.hourly.time.findIndex(t => new Date(t).getTime() >= new Date(current.time).getTime());
        const start = currentTimeIndex >= 0 ? currentTimeIndex : 0;
        for (let i = 0; i < 8; i++) {
          const idx = start + (i * 3);
          if (idx < raw.hourly.time.length) {
            const itemTime = Math.floor(new Date(raw.hourly.time[idx]).getTime() / 1000);
            const wCode = raw.hourly.weather_code[idx];
            const hour = new Date(raw.hourly.time[idx]).getHours();
            const hourIsDay = (hour >= 6 && hour < 19) ? 1 : 0;
            const w = wmoToWeather(wCode, hourIsDay);

            formattedHourly.push({
              dt: itemTime,
              main: { temp: raw.hourly.temperature_2m[idx] },
              weather: [{ id: w.id, main: w.main, description: w.description, icon: w.icon }],
              pop: (raw.hourly.precipitation_probability?.[idx] || 0) / 100
            });
          }
        }
      }

      const formattedDaily = [];
      if (raw.daily && raw.daily.time) {
        const count = Math.min(5, raw.daily.time.length);
        for (let i = 0; i < count; i++) {
          const dayUnix = Math.floor(new Date(raw.daily.time[i] + 'T12:00:00').getTime() / 1000);
          const w = wmoToWeather(raw.daily.weather_code[i], 1);
          formattedDaily.push({
            dt: dayUnix,
            main: {
              temp: (raw.daily.temperature_2m_max[i] + raw.daily.temperature_2m_min[i]) / 2,
              temp_min: raw.daily.temperature_2m_min[i],
              temp_max: raw.daily.temperature_2m_max[i]
            },
            weather: [{ id: w.id, main: w.main, description: w.description, icon: w.icon }],
            pop: (raw.daily.precipitation_probability_max?.[i] || 0) / 100
          });
        }
      }

      const forecastPayload = {
        city: { name: cityName, country, timezone: raw.utc_offset_seconds || 0 },
        list: formattedHourly,
        dailyList: formattedDaily
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(forecastPayload));
      return;
    }

  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message || 'Weather lookup failed' }));
  }
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle API Endpoints
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
      return;
    }
    return handleWeatherApi(req, res, parsedUrl);
  }

  // Handle Static Website Files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🌤️ SkyPulse Weather API Server running!`);
  console.log(`👉 Web Interface:  http://localhost:${PORT}`);
  console.log(`👉 Weather API:    http://localhost:${PORT}/api/weather?city=London`);
  console.log(`👉 Forecast API:   http://localhost:${PORT}/api/forecast?city=London`);
  console.log(`==================================================\n`);
});
