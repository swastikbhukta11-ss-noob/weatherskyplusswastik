# 🌤️ SkyPulse - Modern Weather Forecast Website & API

A modern, responsive Weather Forecast website and dedicated REST Weather API built with **HTML5**, **CSS3**, and **JavaScript**. 

SkyPulse features its own built-in **Live Weather API** that delivers real-time global weather and 5-day forecasts with zero setup or API keys required, while also providing standalone **Node.js** and **Python** backend API servers and optional **OpenWeatherMap** support.

---

## ✨ Features

- **💨 Flowing Wind Atmospheric Animation (Middle Dashboard Section)**: High-performance 60 FPS HTML5 Canvas engine that streams dynamic flowing wind currents and atmospheric breeze streamlines strictly within the **middle weather dashboard** whenever you search for any city or detect your GPS location:
  - **Contained in Middle Part**: The header, search bar, location button, city chips, and footer stay completely visible and unobstructed while the flowing wind sweeps across the middle dashboard.
  - **Aerodynamic Streamlines**: Fluid undulating wind ribbon curves with tapered heads and trailing air currents.
  - **Curling Wind Vortices & Swirls**: Atmospheric wind spirals and vortex eddies drifting naturally with air pressure.
  - **Drifting Wind Particles & Speed Flecks**: High-speed air flecks and dust particles racing along wind vectors.
  - **Sensing Gust Origin**: Localized wind bursts originate from the search bar or GPS location button.
  - **Light Mode Black Silk Aesthetic**: Sharp, solid 2px black border HUD with pure black flowing wind streamlines and a fluttering wind icon.
- **⚡ Live Weather API (Default)**: Instant real-time meteorological data worldwide with geocoding, 24-hr timeline, and 5-day forecast. No API key or signup needed!
- **🔍 City Search & Popular Suggestions**: Fast city lookup with quick-select chips (New York, London, Tokyo, Paris, Sydney, Mumbai).
- **📍 GPS Current Location**: HTML5 Geolocation API detects coordinates and triggers the flowing wind animation to fetch hyper-local weather.
- **🖤 Bold Black Borders on All Divs**: Every card, input, chip, and container features a distinct **solid 2px black border (`#000000`)**.
- **🎨 High-Contrast Bold Black Typography**: All text, numbers, badges, and labels render in **Bold Pure Black (`#000000`)** against clean daylight glassmorphism cards.
- **🌡️ Celsius / Fahrenheit Toggle**: Instant temperature, wind speed (`km/h` vs `mph`), and visibility (`km` vs `mi`) conversion without reloading.
- **📊 Detailed Meteorological Metrics**:
  - Feels-like temperature & High/Low extremes
  - Humidity percentage with descriptive comfort rating
  - Wind speed & 16-point cardinal compass direction (e.g. N, NE, SSW)
  - Atmospheric surface pressure (hPa)
  - Visibility range
  - Local sunrise & sunset times
- **🕒 Next 24-Hour Timeline**: 3-hour interval progression with precipitation probabilities.
- **📅 5-Day Extended Forecast**: Daily forecast cards showing day, date, conditions, high/low range, and rain chance.
- **🖼️ Dynamic Day & Night Weather Backgrounds**: The background picture automatically changes according to real-time weather conditions (Clear, Clouds, Rain, Snow, Thunderstorm, Mist) and seamlessly switches to stunning nighttime photography at night.
- **📱 Fully Responsive**: Fluid CSS Grid and Flexbox layouts optimized for mobile phones, tablets, and widescreen desktop monitors.
- **🛠️ Custom API Server Included**: Run your own REST Weather API using `node server.js` or `python server.py`.

---

## 📁 File Structure

```text
├── index.html       # Clean, accessible semantic HTML5 structure & UI controls
├── style.css        # Glassmorphic CSS styling, dynamic weather themes, 2px black borders & animations
├── script.js        # Main UI application script, event handlers & state management
├── wind-flow.js     # 60 FPS HTML5 Canvas Flowing Wind atmospheric animation engine
├── weather-api.js   # Unified Weather API client (geocoding + real-time data engine)
├── server.js        # Standalone Node.js REST Weather API server & static host
├── server.py        # Standalone Python 3 REST Weather API server & static host
└── README.md        # Comprehensive documentation & API reference
```

---

## 🔌 Weather API Options

SkyPulse gives you 3 flexible ways to get weather data (configurable via the ⚙️ Settings icon in the UI):

### 1. SkyPulse Live Weather API (Default)
- **Status**: Enabled by default out of the box.
- **Requirements**: None! No API key, registration, or credit card required.
- **Capabilities**: Real-time temperature, humidity, wind, pressure, sunrise/sunset, 24-hr hourly, and 5-day forecasts for any city or coordinate worldwide.

### 2. Standalone Local REST Weather API Server
Run your own backend API server locally:
```bash
# Using Node.js
node server.js

# OR using Python 3
python server.py
```
**API Endpoints:**
- `GET /api/weather?city=London` &mdash; Returns current weather for a city
- `GET /api/weather?lat=51.5&lon=-0.12` &mdash; Returns current weather for coordinates
- `GET /api/forecast?city=London` &mdash; Returns 5-day & 24-hr forecast
- `GET /api/health` &mdash; Health check

### 3. OpenWeatherMap API (Optional)
If you already have a 32-character key from [OpenWeatherMap](https://openweathermap.org/api):
1. Click the **Gear (⚙️)** settings icon in the top right.
2. Select **"OpenWeatherMap API"** from the dropdown.
3. Paste your API key and click **"Apply & Save"**.

---

## 🚀 How to Run the Website

### Option 1: Direct in Browser
Double-click [`index.html`](file:///c:/Users/SWASTIK%20BHUKTA/Desktop/New%20folder%20%282%29/index.html) to open it in Chrome, Edge, Firefox, or Safari. It works immediately!

### Option 2: Using the Included Local API Server
Start the server in your terminal:
```bash
# Node.js (Port 3000)
node server.js

# OR Python (Port 8000)
python server.py
```
Open `http://localhost:3000` (or `http://localhost:8000`) in your browser.

---

## 🛠️ Technologies Used

- **HTML5**: Semantic tags, accessible forms, meta viewports.
- **CSS3**: Custom Properties (CSS variables), Flexbox, CSS Grid, Glassmorphism `backdrop-filter`, Keyframe animations, Media queries.
- **JavaScript (ES6+)**: `fetch` API, Promises, `async/await`, Geolocation API, `localStorage`, DOM manipulation.
- **FontAwesome & Google Fonts**: Icons and typography (`Inter` & `Poppins`).
