// Script to deploy the VotingSystem contract to the blockchain
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment of VotingSystem contract...");

  // 1. Get contract factories
  const VotingSystem = await ethers.getContractFactory("contracts/VotingSystem.sol:VotingSystem");
  const Verifier = await ethers.getContractFactory("contracts/Verifier.sol:Verifier");

  // 2. Deploy VotingSystem
  console.log("Deploying VotingSystem...");
  const votingSystem = await VotingSystem.deploy(); // Constructor does not take arguments
  await votingSystem.deployed();
  console.log("VotingSystem contract deployed to:", votingSystem.address);

  // 3. Deploy Verifier
  console.log("Deploying Verifier contract...");
  const verifier = await Verifier.deploy(); // Assumes Verifier constructor is parameterless or handles VK internally
  await verifier.deployed();
  console.log("Verifier contract deployed to:", verifier.address);

  // 4. Save contract addresses to a file
  const deploymentInfo = {
    votingSystemAddress: votingSystem.address,
    verifierAddress: verifier.address, // Add verifier address
    deploymentTime: new Date().toISOString(),
    network: network.name,
    deployer: (await ethers.getSigners())[0].address
  };
  const deploymentPath = path.join(__dirname, "../deployment-info.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment information saved to ${deploymentPath}`);

  // 5. Update the .env file with contract addresses
  try {
    const envPath = path.join(__dirname, "../.env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    // Update REACT_APP_VOTING_ADDRESS
    if (envContent.includes("REACT_APP_VOTING_ADDRESS=")) {
      envContent = envContent.replace(/REACT_APP_VOTING_ADDRESS=.*/, `REACT_APP_VOTING_ADDRESS=${votingSystem.address}`);
    } else {
      envContent += `\nREACT_APP_VOTING_ADDRESS=${votingSystem.address}`;
    }

    // Update REACT_APP_VERIFIER_ADDRESS
    if (envContent.includes("REACT_APP_VERIFIER_ADDRESS=")) {
      envContent = envContent.replace(/REACT_APP_VERIFIER_ADDRESS=.*/, `REACT_APP_VERIFIER_ADDRESS=${verifier.address}`);
    } else {
      envContent += `\nREACT_APP_VERIFIER_ADDRESS=${verifier.address}`;
    }

    // Clean up potential duplicate newlines and trim
    envContent = envContent.split('\n').filter(line => line.trim() !== '').join('\n') + '\n';

    fs.writeFileSync(envPath, envContent.trim());
    console.log(".env file updated with VotingSystem and Verifier contract addresses");
  } catch (error) {
    console.error("Failed to update .env file:", error);
  }

  console.log("Deployment completed successfully!");
}


// Execute the deployment function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  });
