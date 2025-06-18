@echo off
rem Script para programar backups automáticos en Windows
rem Este archivo debe ejecutarse con privilegios de administrador

echo ======================================================
echo     Configuración de Backup Automático de Base de Datos
echo ======================================================
echo.

rem Obtener la ruta actual del script
set SCRIPT_DIR=%~dp0
set BACKUP_SCRIPT=%SCRIPT_DIR%db-backup.js

rem Comprobar si el script de backup existe
if not exist "%BACKUP_SCRIPT%" (
    echo Error: No se encontró el script de backup en %BACKUP_SCRIPT%
    echo Por favor, verifique la instalación.
    exit /b 1
)

echo Script de backup encontrado: %BACKUP_SCRIPT%
echo.

rem Configurar la tarea programada
echo Configurando tarea programada para ejecutar backups diarios...

rem Crear la tarea en Windows Task Scheduler
echo.
schtasks /create /tn "BlockchainVotingDB_Backup" /tr "node "%BACKUP_SCRIPT%"" /sc daily /st 03:00 /ru SYSTEM /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ¡Tarea programada creada exitosamente!
    echo Los backups se ejecutarán diariamente a las 3:00 AM.
    echo.
    echo Para modificar la configuración, use el Programador de tareas de Windows.
) else (
    echo.
    echo Error al crear la tarea programada. Código de error: %ERRORLEVEL%
    echo Por favor, ejecute este script como administrador e inténtelo de nuevo.
)

echo.
echo Presione cualquier tecla para salir...
pause > nul
