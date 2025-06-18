const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingSystem Contract - Pruebas Exhaustivas", function () {
  let VotingSystem;
  let votingSystem;
  let owner;
  let operator;
  let voter1;
  let voter2;
  let voter3;
  let nonAuthorized;
  
  // Datos de prueba
  const electionTitle = "Elección de Prueba";
  const electionDescription = "Esta es una elección de prueba para el sistema de votación basado en blockchain";
  let startTime;
  let endTime;
  
  // Helper para avanzar el tiempo del blockchain
  async function increaseTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  }
  
  // Helper para generar hash del votante
  function generateVoterHash(address, salt = "test-salt", electionId = 0) {
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'string'],
        [address, electionId, salt]
      )
    );
  }
  
  // Prepara el entorno de prueba antes de cada test
  beforeEach(async function () {
    // Obtener firmantes (cuentas)
    [owner, operator, voter1, voter2, voter3, nonAuthorized] = await ethers.getSigners();
    
    // Obtener la factory del contrato
    VotingSystem = await ethers.getContractFactory("VotingSystem");
    
    // Desplegar el contrato
    votingSystem = await VotingSystem.deploy();
    await votingSystem.deployed();
    
    // Configurar tiempos (start: now + 1 hour, end: now + 1 day)
    const now = Math.floor(Date.now() / 1000);
    startTime = now + 3600; // +1 hora
    endTime = now + 86400; // +1 día
    
    // Añadir operador
    await votingSystem.addOperator(operator.address);
  });
  
  describe("1. Despliegue y Configuración", function () {
    it("1.1 Debe establecer el propietario correcto", async function () {
      expect(await votingSystem.owner()).to.equal(owner.address);
    });
    
    it("1.2 Debe inicializar con cero elecciones", async function () {
      expect(await votingSystem.electionCount()).to.equal(0);
    });
    
    it("1.3 Debe permitir añadir operadores autorizados", async function () {
      // Comprobar que operator ya es operador
      expect(await votingSystem.authorizedOperators(operator.address)).to.be.true;
      
      // Añadir otro operador
      await votingSystem.addOperator(voter1.address);
      expect(await votingSystem.authorizedOperators(voter1.address)).to.be.true;
    });
    
    it("1.4 Debe emitir evento al añadir operadores", async function () {
      await expect(votingSystem.addOperator(voter2.address))
        .to.emit(votingSystem, "OperatorAdded")
        .withArgs(voter2.address, owner.address);
    });
    
    it("1.5 Debe permitir eliminar operadores", async function () {
      // Eliminar operador
      await votingSystem.removeOperator(operator.address);
      expect(await votingSystem.authorizedOperators(operator.address)).to.be.false;
    });
    
    it("1.6 Debe emitir evento al eliminar operadores", async function () {
      await expect(votingSystem.removeOperator(operator.address))
        .to.emit(votingSystem, "OperatorRemoved")
        .withArgs(operator.address, owner.address);
    });
    
    it("1.7 No debe permitir a no-admin añadir o eliminar operadores", async function () {
      await expect(votingSystem.connect(voter1).addOperator(voter2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(votingSystem.connect(voter1).removeOperator(operator.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("1.8 Debe permitir transferir la propiedad del contrato", async function () {
      await votingSystem.transferOwnership(voter1.address);
      expect(await votingSystem.owner()).to.equal(voter1.address);
    });
    
    it("1.9 Debe emitir evento al transferir propiedad", async function () {
      await expect(votingSystem.transferOwnership(voter1.address))
        .to.emit(votingSystem, "OwnershipTransferred").withArgs(owner.address, voter1.address);
    });
  });
  
  describe("2. Gestión de Elecciones", function () {
    it("2.1 Debe crear una nueva elección correctamente", async function () {
      // Crear una elección
      const tx = await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      // Esperar a que la transacción sea minada
      const receipt = await tx.wait();
      
      // Comprobar que el evento fue emitido
      expect(receipt.events[0].event).to.equal("ElectionCreated");
      
      // Comprobar que el contador de elecciones aumentó
      expect(await votingSystem.electionCount()).to.equal(1);
      
      // Obtener los detalles de la elección
      const election = await votingSystem.getElectionSummary(0);
      
      // Verificar detalles de la elección
      expect(election.title).to.equal(electionTitle);
      expect(election.description).to.equal(electionDescription);
      expect(election.startTime).to.equal(startTime);
      expect(election.endTime).to.equal(endTime);
      expect(election.isActive).to.be.true;
      expect(election.candidateCount).to.equal(0);
      expect(election.totalVotes).to.equal(0);
      expect(election.resultsFinalized).to.be.false;
      expect(election.creator).to.equal(owner.address);
    });
    
    it("2.2 Debe permitir a operadores crear elecciones", async function () {
      // Crear elección como operador
      await votingSystem.connect(operator).createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      // Verificar que se creó
      expect(await votingSystem.electionCount()).to.equal(1);
      
      const election = await votingSystem.getElectionSummary(0);
      expect(election.creator).to.equal(operator.address);
    });
    
    it("2.3 No debe permitir crear elecciones con fechas inválidas", async function () {
      // Fecha de inicio en el pasado
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // -1 hora
      
      await expect(
        votingSystem.createElection(
          electionTitle,
          electionDescription,
          pastTime,
          endTime
        )
      ).to.be.revertedWith("VotingSystem: la hora de inicio debe ser en el futuro");
      
      // Fecha de fin antes de la fecha de inicio
      await expect(
        votingSystem.createElection(
          electionTitle,
          electionDescription,
          startTime,
          startTime - 1 // 1 segundo antes de inicio
        )
      ).to.be.revertedWith("VotingSystem: la hora de fin debe ser posterior a la hora de inicio");
      
      // Duración demasiado corta
      await expect(
        votingSystem.createElection(
          electionTitle,
          electionDescription,
          startTime,
          startTime + 60 // Solo 60 segundos
        )
      ).to.be.revertedWith("VotingSystem: duracion muy corta");
    });
    
    it("2.4 Debe permitir actualizar detalles de una elección", async function () {
      // Crear elección
      await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      // Actualizar elección
      const newTitle = "Título Actualizado";
      const newDesc = "Descripción Actualizada";
      
      await votingSystem.updateElection(0, newTitle, newDesc);
      
      // Verificar cambios
      const election = await votingSystem.getElectionSummary(0);
      expect(election.title).to.equal(newTitle);
      expect(election.description).to.equal(newDesc);
    });
    
    it("2.5 No debe permitir actualizar elecciones que ya han comenzado", async function () {
      // Crear elección
      await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      // Avanzar tiempo para que comience la elección
      await increaseTime(3601); // +1 hora y 1 segundo
      
      // Intentar actualizar
      await expect(
        votingSystem.updateElection(0, "Nuevo Título", "Nueva Descripción")
      ).to.be.revertedWith("VotingSystem: la eleccion ya ha comenzado");
    });
    
    it("2.6 Debe permitir finalizar una elección antes de tiempo", async function () {
      // Crear elección
      await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      // Finalizar elección
      await votingSystem.endElection(0);
      
      // Verificar que está inactiva
      const election = await votingSystem.getElectionSummary(0);
      expect(election.isActive).to.be.false;
    });
  });
  
  describe("3. Gestión de Candidatos", function () {
    beforeEach(async function () {
      // Crear una elección para las pruebas de candidatos
      await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
    });
    
    it("3.1 Debe añadir candidatos correctamente", async function () {
      // Añadir candidatos
      await votingSystem.addCandidate(0, "Candidato 1", "Descripción 1");
      await votingSystem.addCandidate(0, "Candidato 2", "Descripción 2");
      
      // Comprobar contador de candidatos
      const election = await votingSystem.getElectionSummary(0);
      expect(election.candidateCount).to.equal(2);
      
      // Comprobar detalles de candidatos
      const candidato1 = await votingSystem.getCandidate(0, 0);
      expect(candidato1[0]).to.equal("Candidato 1");
      expect(candidato1[1]).to.equal("Descripción 1");
      expect(candidato1[2]).to.equal(0); // voteCount
      
      const candidato2 = await votingSystem.getCandidate(0, 1);
      expect(candidato2[0]).to.equal("Candidato 2");
      expect(candidato2[1]).to.equal("Descripción 2");
      expect(candidato2[2]).to.equal(0); // voteCount
    });
    
    it("3.2 Debe emitir evento al añadir candidato", async function () {
      await expect(votingSystem.addCandidate(0, "Candidato Test", "Descripción Test"))
        .to.emit(votingSystem, "CandidateAdded")
        .withArgs(0, 0, "Candidato Test", owner.address);
    });
    
    it("3.3 Debe actualizar datos de candidatos correctamente", async function () {
      // Añadir candidato
      await votingSystem.addCandidate(0, "Candidato Original", "Descripción Original");
      
      // Actualizar candidato
      await votingSystem.updateCandidate(0, 0, "Candidato Actualizado", "Descripción Actualizada");
      
      // Verificar cambios
      const candidato = await votingSystem.getCandidate(0, 0);
      expect(candidato[0]).to.equal("Candidato Actualizado");
      expect(candidato[1]).to.equal("Descripción Actualizada");
    });
    
    it("3.4 No debe permitir añadir candidatos después de que comience la elección", async function () {
      // Avanzar tiempo para que comience la elección
      await increaseTime(3601); // +1 hora y 1 segundo
      
      // Intentar añadir candidato
      await expect(
        votingSystem.addCandidate(0, "Candidato Tardío", "Descripción")
      ).to.be.revertedWith("VotingSystem: la eleccion ya ha comenzado");
    });
    
    it("3.5 No debe permitir actualizar candidatos después de que comience la elección", async function () {
      // Añadir candidato
      await votingSystem.addCandidate(0, "Candidato Original", "Descripción");
      
      // Avanzar tiempo para que comience la elección
      await increaseTime(3601); // +1 hora y 1 segundo
      
      // Intentar actualizar candidato
      await expect(
        votingSystem.updateCandidate(0, 0, "Candidato Actualizado", "Descripción")
      ).to.be.revertedWith("VotingSystem: la eleccion ya ha comenzado");
    });
  });
  
  describe("4. Gestión de Votantes y Votación", function () {
    beforeEach(async function () {
      // Crear una elección y añadir candidatos
      await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      await votingSystem.addCandidate(0, "Candidato 1", "Descripción 1");
      await votingSystem.addCandidate(0, "Candidato 2", "Descripción 2");
    });
    
    it("4.1 Debe registrar votantes correctamente", async function () {
      const voter1Hash = generateVoterHash(voter1.address);
      const voter2Hash = generateVoterHash(voter2.address);
      // Registrar votantes
      await votingSystem.registerVoter(0, voter1Hash);
      await votingSystem.registerVoter(0, voter2Hash);
      
      // Verificar registro
      expect(await votingSystem.isRegisteredVoter(0, voter1Hash)).to.be.true;
      expect(await votingSystem.isRegisteredVoter(0, voter2Hash)).to.be.true;
      expect(await votingSystem.getRegisteredVoterCount(0)).to.equal(2);
      
      // Verificar estado
      const status1 = await votingSystem.getVoterStatus(0, voter1Hash);
      expect(status1[0]).to.be.true; // isRegistered
      expect(status1[1]).to.be.false; // hasVoted
    });
    
    it("4.2 Debe registrar votantes en lote correctamente", async function () {
      // Preparar arrays para registro en lote
      const hashes = [
        generateVoterHash(voter1.address, "salt1"),
        generateVoterHash(voter2.address, "salt2"),
        generateVoterHash(voter3.address, "salt3")
      ];
      
      // Registrar en lote
      await votingSystem.batchRegisterVoters(0, hashes);
      
      // Verificar todos registrados
      expect(await votingSystem.getRegisteredVoterCount(0)).to.equal(3);
      expect(await votingSystem.isRegisteredVoter(0, hashes[0])).to.be.true;
      expect(await votingSystem.isRegisteredVoter(0, hashes[1])).to.be.true;
      expect(await votingSystem.isRegisteredVoter(0, hashes[2])).to.be.true;
    });
    
    it("4.3 Debe emitir evento al registrar votantes", async function () {
      const voter1Hash = generateVoterHash(voter1.address);
      await expect(votingSystem.registerVoter(0, voter1Hash))
        .to.emit(votingSystem, "VoterRegistered")
        .withArgs(0, voter1Hash, owner.address);
    });
    
    it("4.4 Debe permitir eliminar votantes antes de que comience la elección", async function () {
      const voter1Hash = generateVoterHash(voter1.address);
      // Registrar votante
      await votingSystem.registerVoter(0, voter1Hash);
      
      // Eliminar votante
      await votingSystem.removeVoter(0, voter1Hash);
      
      // Verificar eliminación
      expect(await votingSystem.isRegisteredVoter(0, voter1Hash)).to.be.false;
    });
    
    it("4.5 No debe permitir eliminar votantes que ya han votado", async function () {
      const voter1Hash = generateVoterHash(voter1.address);
      // Registrar votante
      await votingSystem.registerVoter(0, voter1Hash);
      
      // Avanzar tiempo para que comience la elección
      await increaseTime(3601); // +1 hora y 1 segundo
      
      // Emitir voto
      await votingSystem.connect(voter1).castVote(0, 0, voter1Hash);
      
      // Intentar eliminar votante que ya votó
      await expect(
        votingSystem.removeVoter(0, voter1Hash)
      ).to.be.revertedWith("VotingSystem: el votante ya ha votado");
    });
    
    it("4.6 Debe permitir votar a votantes registrados cuando la elección está activa", async function () {
      const voter1Hash = generateVoterHash(voter1.address);
      const voter2Hash = generateVoterHash(voter2.address);
      // Registrar votantes
      await votingSystem.registerVoter(0, voter1Hash);
      await votingSystem.registerVoter(0, voter2Hash);
      
      // Avanzar tiempo para que comience la elección
      await increaseTime(3601); // +1 hora y 1 segundo
      
      // Emitir votos
      await votingSystem.connect(voter1).castVote(0, 0, voter1Hash); // Vota por candidato 1
      await votingSystem.connect(voter2).castVote(0, 1, voter2Hash); // Vota por candidato 2
      
      // Verificar estado de votantes
      expect(await votingSystem.hasVoted(0, voter1Hash)).to.be.true;
      expect(await votingSystem.hasVoted(0, voter2Hash)).to.be.true;
      
      // Verificar conteo de votos
      const election = await votingSystem.getElectionSummary(0);
      expect(election.totalVotes).to.equal(2);
      
      // Verificar votos por candidato
      const candidato1 = await votingSystem.getCandidate(0, 0);
      const candidato2 = await votingSystem.getCandidate(0, 1);
      expect(candidato1[2]).to.equal(1); // voteCount
      expect(candidato2[2]).to.equal(1); // voteCount
    });
    
    it("4.7 No debe permitir votar dos veces", async function () {
      const voter1Hash = generateVoterHash(voter1.address);
      // Registrar votante
      await votingSystem.registerVoter(0, voter1Hash);
      
      // Avanzar tiempo para que comience la elección
      await increaseTime(3601); // +1 hora y 1 segundo
      
      // Emitir voto
      await votingSystem.connect(voter1).castVote(0, 0, voter1Hash);
      
      // Intentar votar nuevamente
      await expect(
        votingSystem.connect(voter1).castVote(0, 1, voter1Hash)
      ).to.be.revertedWith("VotingSystem: ya ha votado con este identificador");
    });
    
    it("4.8 No debe permitir votar a no registrados", async function () {
      const nonAuthorizedHash = generateVoterHash(nonAuthorized.address);
      // Avanzar tiempo para que comience la elección
      await increaseTime(3601); // +1 hora y 1 segundo
      
      // Intentar votar sin estar registrado
      await expect(
        votingSystem.connect(nonAuthorized).castVote(0, 0, nonAuthorizedHash)
      ).to.be.revertedWith("VotingSystem: votante no registrado con este identificador");
    });
    
    it("4.9 No debe permitir votar antes de que comience la elección", async function () {
      const voter1Hash = generateVoterHash(voter1.address);
      // Registrar votante
      await votingSystem.registerVoter(0, voter1Hash);
      
      // Intentar votar antes de que comience
      await expect(
        votingSystem.connect(voter1).castVote(0, 0, voter1Hash)
      ).to.be.revertedWith("VotingSystem: la eleccion aun no ha comenzado");
    });
    
    it("4.10 No debe permitir votar después de que termine la elección", async function () {
      const voter1Hash = generateVoterHash(voter1.address);
      // Registrar votante
      await votingSystem.registerVoter(0, voter1Hash);
      
      // Avanzar tiempo para que la elección comience y termine
      await increaseTime(90000); // 25 horas
      
      // Intentar votar después de que termine
      await expect(
        votingSystem.connect(voter1).castVote(0, 0, voter1Hash)
      ).to.be.revertedWith("VotingSystem: la eleccion ha finalizado");
    });
  });
  
  describe("5. Resultados y Finalización", function () {
    let voter1Hash, voter2Hash, voter3Hash;
    beforeEach(async function () {
      // Crear una elección y añadir candidatos
      await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      await votingSystem.addCandidate(0, "Candidato 1", "Descripción 1");
      await votingSystem.addCandidate(0, "Candidato 2", "Descripción 2");
      
      voter1Hash = generateVoterHash(voter1.address);
      voter2Hash = generateVoterHash(voter2.address);
      voter3Hash = generateVoterHash(voter3.address);

      // Registrar votantes
      await votingSystem.registerVoter(0, voter1Hash);
      await votingSystem.registerVoter(0, voter2Hash);
      await votingSystem.registerVoter(0, voter3Hash);
      
      // Avanzar tiempo para que comience la elección
      await increaseTime(3601); // +1 hora y 1 segundo
      
      // Emitir votos
      await votingSystem.connect(voter1).castVote(0, 0, voter1Hash); // Candidato 1
      await votingSystem.connect(voter2).castVote(0, 1, voter2Hash); // Candidato 2
      await votingSystem.connect(voter3).castVote(0, 0, voter3Hash); // Candidato 1
    });
    
    it("5.1 No debe permitir ver resultados antes de que termine la elección", async function () {
      await expect(
        votingSystem.getElectionResults(0)
      ).to.be.revertedWith("VotingSystem: resultados no disponibles");
    });
    
    it("5.2 Debe mostrar resultados correctos después de que termine la elección", async function () {
      // Avanzar tiempo para que la elección termine
      await increaseTime(86400); // +24 horas
      
      // Obtener resultados
      const results = await votingSystem.getElectionResults(0);
      
      // Verificar resultados
      expect(results[0]).to.equal(2); // Candidato 1: 2 votos
      expect(results[1]).to.equal(1); // Candidato 2: 1 voto
    });
    
    it("5.3 Debe finalizar resultados correctamente", async function () {
      // Avanzar tiempo para que la elección termine
      await increaseTime(86400); // +24 horas
      
      // Finalizar elección
      await votingSystem.endElection(0);
      
      // Finalizar resultados
      const tx = await votingSystem.finalizeResults(0);
      const receipt = await tx.wait();
      
      // Verificar evento
      expect(receipt.events[0].event).to.equal("ElectionFinalized");
      
      // Verificar que se marcó como finalizada
      const election = await votingSystem.getElectionSummary(0);
      expect(election.resultsFinalized).to.be.true;
    });
    
    it("5.4 No debe permitir finalizar resultados si la elección no ha terminado", async function () {
      await expect(
        votingSystem.finalizeResults(0)
      ).to.be.revertedWith("VotingSystem: la eleccion aun esta activa");
    });
    
    it("5.5 No debe permitir finalizar resultados dos veces", async function () {
      // Avanzar tiempo para que la elección termine
      await increaseTime(86400); // +24 horas
      
      // Finalizar elección
      await votingSystem.endElection(0);
      
      // Finalizar resultados
      await votingSystem.finalizeResults(0);
      
      // Intentar finalizar nuevamente
      await expect(
        votingSystem.finalizeResults(0)
      ).to.be.revertedWith("VotingSystem: resultados ya finalizados");
    });
    
    it("5.6 Debe proporcionar estadísticas correctas sobre votantes", async function () {
      // Verificar conteos
      expect(await votingSystem.getRegisteredVoterCount(0)).to.equal(3);
      // getVotedCount() returns totalVotes from the election struct, which is updated on each vote.
      expect(await votingSystem.getVotedCount(0)).to.equal(3);
      
      // Verificar detalles de votante
      const details = await votingSystem.getVoterDetails(0, voter1Hash);
      expect(details[0]).to.be.true; // isRegistered
      expect(details[1]).to.be.true; // hasVoted
      expect(details[2]).to.be.gt(0); // voteTimestamp > 0
    });
  });
});
