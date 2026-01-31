@echo off
echo Hatch Platform - Environment Switcher
echo ====================================

if "%1"=="" (
    echo Usage: switch_env.bat [local^|production]
    echo.
    echo local      - Switch to localhost:5000 (development)
    echo production - Switch back to Azure production URL
    exit /b 1
)

if "%1"=="local" (
    echo Switching to LOCAL development environment...
    python update_api_urls.py local
) else if "%1"=="production" (
    echo Switching to PRODUCTION environment...
    python update_api_urls.py production
) else (
    echo Error: Invalid environment. Use 'local' or 'production'
    exit /b 1
)

echo.
echo Environment switch completed!
pause