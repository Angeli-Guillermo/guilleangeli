@echo off
setlocal
echo === Instalador Premiere Pro MCP (antipaster) ===
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Falta Node.js 18 o mas nuevo. Instalalo desde https://nodejs.org y volve a correr este archivo.
  pause
  exit /b 1
)
where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Falta Git. Instalalo desde https://git-scm.com y volve a correr este archivo.
  pause
  exit /b 1
)

REM Copias de seguridad de las configs de Claude
set STAMP=%DATE:/=-%_%TIME::=-%
set STAMP=%STAMP: =0%
if exist "%APPDATA%\Claude\claude_desktop_config.json" copy "%APPDATA%\Claude\claude_desktop_config.json" "%APPDATA%\Claude\claude_desktop_config.json.bak_%STAMP%" >nul && echo [OK] Backup de claude_desktop_config.json
if exist "%USERPROFILE%\.claude.json" copy "%USERPROFILE%\.claude.json" "%USERPROFILE%\.claude.json.bak_%STAMP%" >nul && echo [OK] Backup de .claude.json

REM Descargar el repo en tu carpeta de usuario
set TARGET=%USERPROFILE%\Adobe-Premiere-Pro-MCP
if exist "%TARGET%" (
  echo [INFO] Ya existe %TARGET%, actualizando...
  git -C "%TARGET%" pull
) else (
  git clone https://github.com/antipaster/Adobe-Premiere-Pro-MCP.git "%TARGET%"
  if errorlevel 1 (
    echo [ERROR] No se pudo clonar el repo.
    pause
    exit /b 1
  )
)

cd /d "%TARGET%"
call install.bat

echo.
echo Listo. Ahora: reinicia Premiere Pro, abri Window ^> Extensions ^> MCP Bridge y reinicia Claude.
pause
