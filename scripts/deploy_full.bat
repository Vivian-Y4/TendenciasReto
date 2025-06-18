@echo off
:: Script de despliegue completo para Windows
:: Ejecutar como administrador

:: Verificar si se ejecuta como administrador
echo Verificando privilegios de administrador...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Este script debe ejecutarse como administrador.
    echo Presione cualquier tecla para cerrar...
    pause >nul
    exit /b 1
)

echo ==================================================
echo Iniciando despliegue completo de Blockchain Voting Platform
echo ==================================================

echo.

echo 1. Instalando dependencias...
cd /d "%~dp0.."

:: Instalar dependencias del backend
echo Instalando dependencias del servidor...
cd server
npm install
if %errorLevel% neq 0 (
    echo ERROR: Fallo al instalar dependencias del servidor
    pause
    exit /b 1
)

:: Instalar dependencias del frontend
echo Instalando dependencias del cliente...
cd ../client
npm install
if %errorLevel% neq 0 (
    echo ERROR: Fallo al instalar dependencias del cliente
    pause
    exit /b 1
)

:: Instalar dependencias de contratos
echo Instalando dependencias de contratos...
cd ../contracts
npm install
if %errorLevel% neq 0 (
    echo ERROR: Fallo al instalar dependencias de contratos
    pause
    exit /b 1
)

echo.
echo 2. Compilando contratos...
cd ../
npx hardhat compile
if %errorLevel% neq 0 (
    echo ERROR: Fallo al compilar contratos
    pause
    exit /b 1
)

echo.
echo 3. Desplegando contratos...
:: Ejecutar script de despliegue mejorado
node scripts/deploy_improved.js
if %errorLevel% neq 0 (
    echo ERROR: Fallo al desplegar contratos
    pause
    exit /b 1
)

echo.
echo 4. Configurando variables de entorno...
:: Crear archivos .env si no existen
if not exist server\.env (
    echo Creando archivo .env para el servidor...
    echo MONGO_URI=mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform > server\.env
    echo ETHEREUM_RPC_URL=http://localhost:8545 >> server\.env
    echo CONTRACT_ADDRESS=%CONTRACT_ADDRESS% >> server\.env
    echo ADMIN_PRIVATE_KEY=%ADMIN_PRIVATE_KEY% >> server\.env
)

if not exist client\.env (
    echo Creando archivo .env para el cliente...
    echo REACT_APP_API_URL=http://localhost:5000 > client\.env
    echo REACT_APP_CONTRACT_ADDRESS=%CONTRACT_ADDRESS% >> client\.env
)

echo.
echo 5. Iniciando servicios...
:: Iniciar MongoDB (asumiendo que está instalado)
echo Iniciando MongoDB...
net start MongoDB
if %errorLevel% neq 0 (
    echo ADVERTENCIA: MongoDB no pudo iniciarse. Asegúrate de tener MongoDB instalado.
)

echo.
echo 6. Iniciando servidor...
:: Iniciar servidor en modo de desarrollo
start cmd /k "cd server && npm run dev"

:: Iniciar cliente en modo de desarrollo
echo.
echo 7. Iniciando cliente...
start cmd /k "cd client && npm start"

echo.
echo ==================================================
echo Despliegue completado!
echo.
echo Servidor iniciado en http://localhost:5000
echo Cliente iniciado en http://localhost:3000
echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
exit /b 0
