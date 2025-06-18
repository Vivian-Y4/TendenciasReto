// Script para ejecutar análisis de seguridad

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Función para ejecutar comandos de forma asíncrona
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error ejecutando comando: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`Error de salida: ${stderr}`);
      }
      resolve(stdout);
    });
  });
}

// Función principal
async function runSecurityAnalysis() {
  try {
    console.log('Iniciando análisis de seguridad de contratos inteligentes...');
    
    // Comprobar si el contrato existe
    const contractPath = path.join(process.cwd(), 'contracts', 'VotingSystem_Complete.sol');
    if (!fs.existsSync(contractPath)) {
      throw new Error(`El contrato no existe en la ruta: ${contractPath}`);
    }
    
    console.log('Generando reporte de vulnerabilidades con Slither (requiere instalación previa)...');
    
    // Instrucciones para instalar Slither si no está instalado
    console.log('Si Slither no está instalado, use estos comandos:');
    console.log('pip install slither-analyzer');
    console.log('npm install -g solc-select && solc-select install 0.8.17 && solc-select use 0.8.17');
    
    // Crear directorio para reportes si no existe
    const reportsDir = path.join(process.cwd(), 'security_reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }
    
    // Rutas para los reportes
    const slitherJsonPath = path.join(reportsDir, 'slither_report.json');
    const slitherTxtPath = path.join(reportsDir, 'slither_report.txt');
    
    // Ejecutar Slither
    console.log('Ejecutando Slither...');
    try {
      await execCommand(`slither ${contractPath} --json ${slitherJsonPath}`);
      console.log(`Reporte JSON generado en: ${slitherJsonPath}`);
      
      await execCommand(`slither ${contractPath} > ${slitherTxtPath}`);
      console.log(`Reporte de texto generado en: ${slitherTxtPath}`);
    } catch (error) {
      console.error('Error ejecutando Slither. Asegúrese de que está instalado correctamente.');
      console.error('Continuando con otros análisis...');
    }
    
    // Realizar análisis manual de patrones de seguridad
    console.log('\nRealizando análisis manual de patrones de seguridad...');
    analyzeSecurityPatterns(contractPath);
    
    console.log('\nAnálisis de seguridad completado.');
    console.log('Para una revisión completa, considere revisar los reportes generados y utilizar herramientas adicionales como MythX o Manticore.');
  } catch (error) {
    console.error(`Error en el análisis de seguridad: ${error.message}`);
  }
}

// Función para analizar patrones de seguridad comunes
function analyzeSecurityPatterns(contractPath) {
  console.log('Verificando patrones de seguridad en el contrato...');
  
  const content = fs.readFileSync(contractPath, 'utf8');
  
  // Lista de patrones a verificar
  const patterns = [
    { name: 'Reentrancy Protection', regex: /nonReentrant\s*\(\)/g, good: true },
    { name: 'require() with error message', regex: /require\s*\([^;]*,\s*"[^"]+"\s*\)/g, good: true },
    { name: 'SafeMath o operaciones matemáticas seguras', regex: /(\+|\-|\*|\/)/g, warning: 'Operaciones matemáticas detectadas. Verificar overflow/underflow protection.' },
    { name: 'Uso de block.timestamp', regex: /block\.timestamp/g, warning: 'Uso de block.timestamp detectado. Verificar manipulación de timestamp por mineros.' },
    { name: 'Control de acceso', regex: /(onlyAdmin|onlyAuthorized)/g, good: true },
    { name: 'Check-Effects-Interactions Pattern', regex: /\s*external\s+call.*after.*state\s+change/i, warning: 'Posible violación del patrón Check-Effects-Interactions.' },
    { name: 'Uso de transfer() o send()', regex: /\.(transfer|send)\s*\(/g, warning: 'Uso de transfer() o send() detectado. Considerar usar call() con control de gas.' },
  ];
  
  // Analizar cada patrón
  patterns.forEach(pattern => {
    const matches = content.match(pattern.regex) || [];
    
    if (pattern.good && matches.length > 0) {
      console.log(`✅ ${pattern.name}: Implementado correctamente (${matches.length} ocurrencias).`);
    } else if (pattern.warning && matches.length > 0) {
      console.log(`⚠️ ${pattern.name}: ${pattern.warning} (${matches.length} ocurrencias).`);
    } else if (pattern.good && matches.length === 0) {
      console.log(`❌ ${pattern.name}: No implementado.`);
    }
  });
  
  // Generar reporte detallado
  const reportPath = path.join(process.cwd(), 'security_reports', 'manual_security_review.md');
  let report = '# Análisis Manual de Seguridad\n\n';
  report += `Contrato: ${path.basename(contractPath)}\n\n`;
  report += 'Fecha: ' + new Date().toISOString() + '\n\n';
  report += '## Patrones de Seguridad Evaluados\n\n';
  
  patterns.forEach(pattern => {
    const matches = content.match(pattern.regex) || [];
    
    if (pattern.good && matches.length > 0) {
      report += `### ✅ ${pattern.name}\n\n`;
      report += `Implementado correctamente (${matches.length} ocurrencias).\n\n`;
    } else if (pattern.warning && matches.length > 0) {
      report += `### ⚠️ ${pattern.name}\n\n`;
      report += `${pattern.warning} (${matches.length} ocurrencias).\n\n`;
    } else if (pattern.good && matches.length === 0) {
      report += `### ❌ ${pattern.name}\n\n`;
      report += `No implementado. Considere añadir esta protección.\n\n`;
    }
  });
  
  // Añadir recomendaciones generales
  report += '## Recomendaciones Generales\n\n';
  report += '1. **Auditoría Externa**: Considere contratar una auditoría profesional de seguridad.\n';
  report += '2. **Tests Exhaustivos**: Asegúrese de tener una cobertura de pruebas cercana al 100%.\n';
  report += '3. **Actualizar Solidity**: Manténgase al día con las últimas versiones estables de Solidity.\n';
  report += '4. **Gas Optimization**: Optimice el contrato para reducir costos de gas sin sacrificar seguridad.\n';
  
  fs.writeFileSync(reportPath, report);
  console.log(`Reporte de análisis manual generado en: ${reportPath}`);
}

// Ejecutar el análisis
runSecurityAnalysis();
