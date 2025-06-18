// Script para desplegar el contrato VotingSystem a la blockchain
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Iniciando despliegue del contrato VotingSystem...");

  // Obtener la factory del contrato
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  
  // Desplegar el contrato
  console.log("Desplegando VotingSystem...");
  const votingSystem = await VotingSystem.deploy();

  // Esperar a que finalice el despliegue
  await votingSystem.deployed();
  
  console.log("Contrato VotingSystem desplegado en:", votingSystem.address);
  
  // Guardar la dirección del contrato en un archivo para fácil acceso
  const deploymentInfo = {
    contractAddress: votingSystem.address,
    contractName: "VotingSystem",
    deploymentTime: new Date().toISOString(),
    network: network.name,
    deployer: (await ethers.getSigners())[0].address,
    version: "1.0.0"
  };
  
  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir);
  }
  
  const deploymentPath = path.join(deploymentDir, `deployment-${deploymentInfo.network}-${Math.floor(Date.now() / 1000)}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Información de despliegue guardada en ${deploymentPath}`);
  
  // Actualizar el archivo .env con la dirección del contrato si existe
  try {
    const envPath = path.join(__dirname, "../.env");
    let envContent = "";
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
      // Reemplazar CONTRACT_ADDRESS si existe, de lo contrario añadirlo
      if (envContent.includes("CONTRACT_ADDRESS=")) {
        envContent = envContent.replace(
          /CONTRACT_ADDRESS=.*/,
          `CONTRACT_ADDRESS=${votingSystem.address}`
        );
      } else {
        envContent += `\nCONTRACT_ADDRESS=${votingSystem.address}`;
      }
    } else {
      envContent = `CONTRACT_ADDRESS=${votingSystem.address}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log("Archivo .env actualizado con la dirección del contrato");
  } catch (error) {
    console.error("Error al actualizar el archivo .env:", error);
  }
  
  // Verificar contrato en Etherscan (para redes públicas)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Esperando confirmaciones de bloque para verificación...");
    await votingSystem.deployTransaction.wait(5); // Esperar 5 confirmaciones
    
    console.log("Iniciando verificación en Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: votingSystem.address,
        constructorArguments: [],
      });
      console.log("Contrato verificado en Etherscan");
    } catch (error) {
      console.log("Error durante la verificación en Etherscan:", error.message);
    }
  }
  
  // Configurar contrato (opcional)
  if (process.env.SETUP_OPERATORS === "true") {
    console.log("Configurando operadores iniciales...");
    const operators = process.env.INITIAL_OPERATORS ? process.env.INITIAL_OPERATORS.split(",") : [];
    
    for (const operator of operators) {
      try {
        const tx = await votingSystem.addOperator(operator.trim());
        await tx.wait();
        console.log(`Operador ${operator} añadido exitosamente`);
      } catch (error) {
        console.error(`Error al añadir operador ${operator}:`, error.message);
      }
    }
  }
  
  console.log("¡Despliegue completado exitosamente!");
  return votingSystem;
}

// Ejecutar la función de despliegue
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error durante el despliegue:", error);
    process.exit(1);
  });
