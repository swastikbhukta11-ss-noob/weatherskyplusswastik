@echo off
title Push SkyPulse Weather to GitHub
color 0b
echo ==============================================================================
echo                      SkyPulse Weather Forecast
echo                Pushing project to GitHub Repository:
echo       https://github.com/swastikbhukta11-ss-noob/weatherskyplusswastik
echo ==============================================================================
echo.

git push -u origin main

echo.
if %errorlevel% equ 0 (
    color 0a
    echo [SUCCESS] Your code has been pushed to GitHub successfully!
    echo Visit: https://github.com/swastikbhukta11-ss-noob/weatherskyplusswastik
) else (
    color 0c
    echo [NOTE] If you were prompted for credentials, please sign in via browser or enter your GitHub Personal Access Token.
)

echo.
echo Press any key to exit...
pause >nul
