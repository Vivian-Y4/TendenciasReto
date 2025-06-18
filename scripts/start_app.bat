@echo off
:: Script para iniciar la aplicación

:: Verificar si MongoDB está corriendo
echo Verificando MongoDB...
net start MongoDB
if %errorLevel% neq 0 (
    echo ADVERTENCIA: MongoDB no está iniciado. Iniciando...
    net start MongoDB
)

echo.
echo Iniciando servidor...
start cmd /k "cd server && npm run dev"

:: Esperar unos segundos para que el servidor se inicie
timeout /t 5

echo.
echo Iniciando cliente...
start cmd /k "cd client && npm start"

echo.
echo ==================================================
echo Aplicación iniciada!
echo.
echo Servidor: http://localhost:5000
echo Cliente: http://localhost:3000
echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
exit /b 0
