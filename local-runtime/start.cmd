@echo off
setlocal
cd /d "%~dp0.."

set "NODE=C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%NODE%" (
  echo [ERROR] Node not found: %NODE%
  echo Please edit local-runtime\start.cmd and set NODE to a valid path.
  pause
  exit /b 1
)

if not exist "dist\output\index.html" (
  echo [INFO] dist\output missing, running vite build first...
  set "VITE_API_BASE=/api"
  "%NODE%" "node_modules\vite\bin\vite.js" build
  if errorlevel 1 (
    echo [ERROR] build failed
    pause
    exit /b 1
  )
)

echo [INFO] starting local preview on http://127.0.0.1:5180
start "" http://127.0.0.1:5180
"%NODE%" "local-runtime\server.mjs"

echo.
echo [INFO] server stopped
pause
