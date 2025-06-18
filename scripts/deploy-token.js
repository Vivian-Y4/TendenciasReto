const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function main() {
  console.log("Starting deployment of VotingToken and VotingSystem contracts...");

  // Obtener el signer (cuenta de despliegue)
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 1. Desplegar el contrato de token
  console.log("Deploying VotingToken...");
  const VotingToken = await ethers.getContractFactory("VotingToken");
  const votingToken = await VotingToken.deploy();
  await votingToken.deployed();
  console.log("VotingToken deployed to:", votingToken.address);

  // 2. Desplegar el contrato de votación con la dirección del token
  console.log("Deploying VotingSystem...");
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  const votingSystem = await VotingSystem.deploy(votingToken.address);
  await votingSystem.deployed();
  console.log("VotingSystem deployed to:", votingSystem.address);

  // 3. Autorizar el contrato de votación para gastar tokens
  console.log("Authorizing VotingSystem to spend tokens...");
  const tx = await votingToken.authorizeSpender(votingSystem.address, true);
  await tx.wait();
  console.log("VotingSystem authorized to spend tokens");

  // 4. Transferir tokens al administrador para distribución
  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  const tokensToMint = ethers.utils.parseEther("10000");
  console.log(`Transferring ${ethers.utils.formatEther(tokensToMint)} tokens to admin (${adminAddress})...`);
  const mintTx = await votingToken.transfer(adminAddress, tokensToMint);
  await mintTx.wait();
  console.log("Tokens transferred to admin");

  // 5. Guardar la información del despliegue
  const deploymentInfo = {
    tokenAddress: votingToken.address,
    votingSystemAddress: votingSystem.address,
    adminAddress: adminAddress,
    deployerAddress: deployer.address,
    deploymentTime: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
  };

  const deploymentPath = path.join(__dirname, "../deployment-info.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment information saved to ${deploymentPath}`);

  // 6. Actualizar el archivo .env si existe
  updateEnvFile(votingToken.address, votingSystem.address, adminAddress);
}

function updateEnvFile(tokenAddress, votingSystemAddress, adminAddress) {
  const envPath = path.join(__dirname, "../.env");
  let envContent = "";

  // Leer el archivo .env si existe
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Actualizar o agregar las variables de entorno
  const envVars = {
    "TOKEN_ADDRESS": tokenAddress,
    "CONTRACT_ADDRESS": votingSystemAddress,
    "ADMIN_ADDRESS": adminAddress,
  };

  for (const [key, value] of Object.entries(envVars)) {
    const regex = new RegExp(`^${key}=.*`, "m");
    const newLine = `${key}=${value}`;

    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `\n${newLine}`;
    }
  }

  // Escribir el archivo .env actualizado
  fs.writeFileSync(envPath, envContent.trim());
  console.log("Updated .env file with contract addresses");
}

// Ejecutar el script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });