"""
==========================================================================
SkyPulse Weather API Server (Python 3)
==========================================================================
A lightweight, zero-dependency REST Weather API & Static Web Server in Python.

Endpoints:
- GET /api/weather?city=London        -> Current real-time weather
- GET /api/weather?lat=51.5&lon=-0.12  -> Current weather by coordinates
- GET /api/forecast?city=London       -> 5-Day forecast
- GET /api/forecast?lat=51.5&lon=-0.12 -> 5-Day forecast by coordinates
- GET /api/health                     -> Health check
- GET /*                              -> Static website files (index.html, etc.)

Usage:
  python server.py
==========================================================================
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
import math
from datetime import datetime

PORT = int(os.environ.get("PORT", 8000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def wmo_to_weather(code, is_day=1):
    d = 'd' if is_day else 'n'
    mapping = {
        0: {'main': 'Clear', 'description': 'Clear sky', 'icon': f'01{d}', 'id': 800},
        1: {'main': 'Clear', 'description': 'Mainly clear', 'icon': f'02{d}', 'id': 801},
        2: {'main': 'Clouds', 'description': 'Partly cloudy', 'icon': f'03{d}', 'id': 802},
        3: {'main': 'Clouds', 'description': 'Overcast', 'icon': f'04{d}', 'id': 804},
        45: {'main': 'Mist', 'description': 'Fog / Mist', 'icon': f'50{d}', 'id': 741},
        48: {'main': 'Mist', 'description': 'Fog / Mist', 'icon': f'50{d}', 'id': 741},
        51: {'main': 'Drizzle', 'description': 'Light drizzle', 'icon': f'09{d}', 'id': 300},
        53: {'main': 'Drizzle', 'description': 'Moderate drizzle', 'icon': f'09{d}', 'id': 301},
        55: {'main': 'Drizzle', 'description': 'Dense drizzle', 'icon': f'09{d}', 'id': 302},
        61: {'main': 'Rain', 'description': 'Slight rain', 'icon': f'10{d}', 'id': 500},
        63: {'main': 'Rain', 'description': 'Moderate rain', 'icon': f'10{d}', 'id': 501},
        65: {'main': 'Rain', 'description': 'Heavy rain', 'icon': f'10{d}', 'id': 502},
        71: {'main': 'Snow', 'description': 'Slight snowfall', 'icon': f'13{d}', 'id': 600},
        73: {'main': 'Snow', 'description': 'Moderate snowfall', 'icon': f'13{d}', 'id': 601},
        75: {'main': 'Snow', 'description': 'Heavy snowfall', 'icon': f'13{d}', 'id': 602},
        80: {'main': 'Rain', 'description': 'Showers', 'icon': f'09{d}', 'id': 521},
        95: {'main': 'Thunderstorm', 'description': 'Thunderstorm', 'icon': f'11{d}', 'id': 200},
    }
    return mapping.get(code, {'main': 'Clouds', 'description': 'Scattered clouds', 'icon': f'03{d}', 'id': 803})

def geocode(city_name):
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(city_name)}&count=1&language=en&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'SkyPulseWeather/1.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        if not data.get('results'):
            raise ValueError(f"City '{city_name}' not found")
        first = data['results'][0]
        return {
            'name': first.get('name'),
            'country': first.get('country_code', '').upper(),
            'lat': first.get('latitude'),
            'lon': first.get('longitude')
        }

class WeatherRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        # Enable CORS
        if path.startswith('/api/'):
            self.handle_api(path, params)
        else:
            super().do_GET()

    def handle_api(self, path, params):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()

        if path == '/api/health':
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
            return

        try:
            city = params.get('city', [None])[0]
            lat = params.get('lat', [None])[0]
            lon = params.get('lon', [None])[0]

            country = ''
            if city or (not lat and not lon):
                city_name = city or 'London'
                geo = geocode(city_name)
                lat = geo['lat']
                lon = geo['lon']
                city_name = geo['name']
                country = geo['country']
            else:
                lat = float(lat)
                lon = float(lon)
                city_name = f"Location ({lat:.2f}, {lon:.2f})"

            # Fetch meteorological data
            meteo_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto"
            req = urllib.request.Request(meteo_url, headers={'User-Agent': 'SkyPulseWeather/1.0'})
            with urllib.request.urlopen(req) as resp:
                raw = json.loads(resp.read().decode())

            current = raw.get('current', {})
            is_day = current.get('is_day', 1)
            weather_info = wmo_to_weather(current.get('weather_code', 0), is_day)
            now_unix = int(datetime.utcnow().timestamp())

            if path == '/api/weather':
                res_payload = {
                    'name': city_name,
                    'sys': {'country': country},
                    'main': {
                        'temp': current.get('temperature_2m'),
                        'feels_like': current.get('apparent_temperature'),
                        'temp_min': raw.get('daily', {}).get('temperature_2m_min', [current.get('temperature_2m')])[0],
                        'temp_max': raw.get('daily', {}).get('temperature_2m_max', [current.get('temperature_2m')])[0],
                        'humidity': current.get('relative_humidity_2m'),
                        'pressure': round(current.get('surface_pressure', 1013))
                    },
                    'wind': {
                        'speed': current.get('wind_speed_10m', 0) / 3.6,
                        'deg': current.get('wind_direction_10m', 0)
                    },
                    'visibility': 10000,
                    'weather': [weather_info],
                    'dt': now_unix,
                    'timezone': raw.get('utc_offset_seconds', 0)
                }
                self.wfile.write(json.dumps(res_payload).encode())
                return

            if path == '/api/forecast':
                hourly_list = []
                hourly = raw.get('hourly', {})
                times = hourly.get('time', [])
                for i in range(min(8, len(times) // 3)):
                    idx = i * 3
                    w_code = hourly.get('weather_code', [0])[idx]
                    hourly_list.append({
                        'dt': now_unix + (i * 3 * 3600),
                        'main': {'temp': hourly.get('temperature_2m', [0])[idx]},
                        'weather': [wmo_to_weather(w_code, 1)],
                        'pop': (hourly.get('precipitation_probability', [0])[idx] or 0) / 100
                    })

                daily_list = []
                daily = raw.get('daily', {})
                d_times = daily.get('time', [])
                for i in range(min(5, len(d_times))):
                    w_code = daily.get('weather_code', [0])[i]
                    daily_list.append({
                        'dt': now_unix + (i * 86400),
                        'main': {
                            'temp': (daily.get('temperature_2m_max', [0])[i] + daily.get('temperature_2m_min', [0])[i]) / 2,
                            'temp_min': daily.get('temperature_2m_min', [0])[i],
                            'temp_max': daily.get('temperature_2m_max', [0])[i]
                        },
                        'weather': [wmo_to_weather(w_code, 1)],
                        'pop': (daily.get('precipitation_probability_max', [0])[i] or 0) / 100
                    })

                self.wfile.write(json.dumps({
                    'city': {'name': city_name, 'country': country, 'timezone': raw.get('utc_offset_seconds', 0)},
                    'list': hourly_list,
                    'dailyList': daily_list
                }).encode())
                return

        except Exception as e:
            self.wfile.write(json.dumps({'error': str(e)}).encode())

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), WeatherRequestHandler) as httpd:
        print(f"\n🌤️ SkyPulse Weather API Server (Python) listening on http://localhost:{PORT}")
        httpd.serve_forever()
