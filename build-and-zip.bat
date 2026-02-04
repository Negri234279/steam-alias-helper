@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Steam Alias Helper - Build y ZIP
echo ========================================
echo.

REM Leer la version del manifest.json
echo [1/4] Leyendo version del manifest...
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content public\manifest.json | ConvertFrom-Json).version"') do set VERSION=%%i

if "%VERSION%"=="" (
    echo ERROR: No se pudo leer la version del manifest.json
    pause
    exit /b 1
)

echo Version detectada: %VERSION%
echo.

REM Ejecutar el build
echo [2/4] Ejecutando build...
call npm run build

if errorlevel 1 (
    echo ERROR: El build fallo
    pause
    exit /b 1
)

echo Build completado exitosamente
echo.

REM Crear el archivo ZIP
echo [3/4] Creando archivo ZIP...
set ZIPNAME=steam-alias-helper-%VERSION%.zip

REM Eliminar ZIP anterior si existe
if exist "%ZIPNAME%" (
    echo Eliminando ZIP anterior...
    del "%ZIPNAME%"
)

REM Crear ZIP usando PowerShell
powershell -Command "Compress-Archive -Path 'dist\*' -DestinationPath '%ZIPNAME%' -Force"

if errorlevel 1 (
    echo ERROR: Fallo al crear el ZIP
    pause
    exit /b 1
)

echo.
echo [4/4] Verificando resultado...
powershell -Command "if (Test-Path '%ZIPNAME%') { $size = (Get-Item '%ZIPNAME%').Length / 1KB; Write-Host ('Archivo creado: %ZIPNAME% (' + [math]::Round($size, 2) + ' KB)') -ForegroundColor Green } else { Write-Host 'ERROR: El archivo ZIP no se creo' -ForegroundColor Red }"

echo.
echo ========================================
echo  Proceso completado
echo ========================================
echo.
echo ZIP listo para publicar: %ZIPNAME%
echo.

pause
