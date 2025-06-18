// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

// Interface for the zk-SNARK Verifier contract
interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input // Assuming 3 public inputs: merkleRoot, nullifierHash, voteCommitment
    ) external view returns (bool r);
}

/**
 * @title VotingSystem
 * @dev Sistema de votación basado en blockchain con características mejoradas:
 * - Gestión de elecciones (crear, finalizar, obtener resultados)
 * - Gestión de candidatos (añadir, obtener información)
 * - Gestión de votantes (registrar, verificar estado)
 * - Emisión de votos seguros
 * - Eventos detallados para seguimiento
 *
 * @author Plataforma de Votación Blockchain
 * @notice Este contrato permite crear y gestionar elecciones de forma segura y transparente
 */
contract VotingSystem is Ownable {
    // ---- Estructuras ----
    
    /**
     * @dev Información del votante
     * @param isRegistered Indica si el votante está registrado (relevant for Merkle tree)
     */
    struct Voter {
        bool isRegistered;
        // hasVoted, voteTimestamp, candidateVote are removed as voting is anonymous
    }
    
    /**
     * @dev Información completa de una elección
     */
    struct Election {
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        mapping(uint256 => Candidate) candidates; // Candidate votes will not be tallied here directly for anonymous votes
        uint256 candidateCount;
        uint256 totalVotes; // Will count anonymous votes
        mapping(bytes32 => Voter) voters; // Voter registration status for Merkle tree
        uint256 registeredVoterCount;
        bool resultsFinalized;
        address creator;
        uint256 createdAt;
        uint256 updatedAt;

        // For ZK-SNARK based anonymous voting
        bytes32 merkleRoot; // Merkle root of registered voterIdentifiers
        mapping(bytes32 => bool) usedNullifiers; // To prevent double voting
        mapping(bytes32 => bool) voteCommitments; // To store vote commitments
        mapping(bytes32 => bool) revealedVoteCommitments; // To track if a commitment has been revealed
    }
    
    /**
     * @dev Información de un candidato
     */
    struct Candidate {
        string name;
        string description;
        uint256 voteCount;
        uint256 addedAt; // Timestamp de cuando se añadió el candidato
    }
    
    /**
     * @dev Resumen de elección para funciones de vista
     */
    struct ElectionSummary {
        uint256 id;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 candidateCount;
        uint256 totalVotes;
        bool resultsFinalized;
        address creator;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // ---- Variables de Estado ----
    
    /// @dev Mapeo de ID de elección a detalles de elección
    mapping(uint256 => Election) public elections;

    /// @dev Contador de elecciones (también sirve como próximo ID)
    uint256 public electionCount;
    
    /// @dev Mapeo de operadores autorizados
    mapping(address => bool) public authorizedOperators;

    /// @dev Address of the ZK-SNARK Verifier contract
    IVerifier public verifier;

    // ---- Constantes ----

    /// @dev Duración mínima de una elección en segundos (1 hora)
    uint256 public constant MIN_ELECTION_DURATION = 3600;

    /// @dev Duración máxima de una elección en segundos (30 días)
    uint256 public constant MAX_ELECTION_DURATION = 30 days;

    /// @dev Número máximo de candidatos por elección
    uint256 public constant MAX_CANDIDATES_PER_ELECTION = 100;

    // ---- Eventos ----

    /**
     * @dev Emitido cuando un voto es revelado para el conteo.
     */
    event VoteRevealed(uint256 indexed electionId, bytes32 indexed voteCommitment, uint256 candidateId);

    /**
     * @dev Emitido cuando se crea una nueva elección
     */
    event ElectionCreated(
        uint256 indexed electionId,
        string title,
        uint256 startTime,
        uint256 endTime,
        address indexed creator
    );
    
    /**
     * @dev Emitido cuando se actualiza una elección existente
     */
    event ElectionUpdated(
        uint256 indexed electionId,
        string title,
        string description,
        uint256 startTime,
        uint256 endTime,
        address indexed updatedBy
    );
    
    /**
     * @dev Emitido cuando se finaliza una elección
     */
    event ElectionEnded(
        uint256 indexed electionId,
        uint256 endTime,
        address indexed endedBy
    );
    
    /**
     * @dev Emitido cuando se añade un candidato a una elección
     */
    event CandidateAdded(
        uint256 indexed electionId,
        uint256 indexed candidateId,
        string name,
        address indexed addedBy
    );

    /**
     * @dev Emitido cuando se actualiza un candidato
     */
    event CandidateUpdated(
        uint256 indexed electionId,
        uint256 indexed candidateId,
        string name,
        address indexed updatedBy
    );

    /**
     * @dev Emitido cuando se registra un votante para una elección
     */
    event VoterRegistered(
        uint256 indexed electionId,
        bytes32 indexed voterIdentifier, // Changed from address to bytes32
        address indexed registeredBy
    );

    /**
     * @dev Emitido cuando se elimina un votante de una elección
     */
    event VoterRemoved(
        uint256 indexed electionId,
        bytes32 indexed voterIdentifier, // Changed from address to bytes32
        address indexed removedBy
    );

    // VoteCast event is removed as old castVote is removed. New event for anonymous voting.

    /**
     * @dev Emitido cuando se emite un voto anónimo
     */
    event AnonymousVoteCast(
        uint256 indexed electionId,
        bytes32 indexed nullifierHash,
        bytes32 voteCommitment
    );

    /**
     * @dev Emitido cuando se finalizan los resultados de una elección
     */
    event ElectionFinalized(
        uint256 indexed electionId,
        uint256 totalVotes,
        address indexed finalizedBy
    );

    /**
     * @dev Emitido cuando se añade un nuevo operador autorizado
     */
    event OperatorAdded(
        address indexed operator,
        address indexed addedBy
    );

    /**
     * @dev Emitido cuando se elimina un operador autorizado
     */
    event OperatorRemoved(
        address indexed operator,
        address indexed removedBy
    );

    /**
     * @dev Emitido cuando se establece la dirección del contrato Verifier
     */
    event VerifierSet(address verifierAddress);

    /**
     * @dev Emitido cuando se establece la Merkle root para una elección
     */
    event MerkleRootSet(uint256 indexed electionId, bytes32 merkleRoot);

    // ---- Modificadores ----

    /**
     * @dev Restringe la función solo al administrador
     */
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || authorizedOperators[msg.sender],
            "VotingSystem: requiere autorizacion"
        );
        _;
    }
    
    /**
     * @dev Verifica que la elección exista
     */
    modifier electionExists(uint256 _electionId) {
        require(_electionId < electionCount, "VotingSystem: la eleccion no existe");
        _;
    }
    
    /**
     * @dev Verifica que la elección esté activa
     */
    modifier electionActive(uint256 _electionId) {
        require(elections[_electionId].isActive, "VotingSystem: la eleccion no esta activa");
        require(
            block.timestamp >= elections[_electionId].startTime,
            "VotingSystem: la eleccion aun no ha comenzado"
        );
        require(
            block.timestamp <= elections[_electionId].endTime,
            "VotingSystem: la eleccion ha finalizado"
        );
        _;
    }
    
    /**
     * @dev Verifica que la elección no haya comenzado aún
     */
    modifier electionNotStarted(uint256 _electionId) {
        require(
            block.timestamp < elections[_electionId].startTime,
            "VotingSystem: la eleccion ya ha comenzado"
        );
        _;
    }

    /**
     * @dev Verifica que la elección haya finalizado
     */
    modifier electionEnded(uint256 _electionId) {
        require(
            !elections[_electionId].isActive || block.timestamp > elections[_electionId].endTime,
            "VotingSystem: la eleccion aun esta activa"
        );
        _;
    }

    /**
     * @dev Previene reentrancy attacks
     */
    uint256 private _reentrancyGuard;
    modifier nonReentrant() {
        require(_reentrancyGuard == 0, "VotingSystem: reentrada no permitida");
        _reentrancyGuard = 1;
        _;
        _reentrancyGuard = 0;
    }

    /**
     * @dev Constructor - establece el creador como administrador inicial
     */
    constructor() Ownable(msg.sender) {
        electionCount = 0;
        _reentrancyGuard = 0;
        // AdminAction event removed, Ownable's constructor emits OwnershipTransferred
    }
    
    // ---- Funciones de Gestión de Elecciones ----
    
    /**
     * @dev Crea una nueva elección
     * @param _title Título de la elección
     * @param _description Descripción de la elección
     * @param _startTime Timestamp de inicio (unix)
     * @param _endTime Timestamp de finalización (unix)
     * @return ID de la elección creada
     */
    function createElection(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) public onlyAuthorized nonReentrant returns (uint256) {
        require(bytes(_title).length > 0, "VotingSystem: el titulo no puede estar vacio");
        require(bytes(_description).length > 0, "VotingSystem: la descripcion no puede estar vacia");
        require(_startTime > block.timestamp, "VotingSystem: la hora de inicio debe ser en el futuro");
        require(_endTime > _startTime, "VotingSystem: la hora de fin debe ser posterior a la hora de inicio");
        require(
            _endTime - _startTime >= MIN_ELECTION_DURATION,
            "VotingSystem: duracion muy corta"
        );
        require(
            _endTime - _startTime <= MAX_ELECTION_DURATION,
            "VotingSystem: duracion muy larga"
        );
        
        uint256 electionId = electionCount;
        
        Election storage e = elections[electionId];
        e.title = _title;
        e.description = _description;
        e.startTime = _startTime;
        e.endTime = _endTime;
        e.isActive = true;
        e.candidateCount = 0;
        e.totalVotes = 0;
        e.registeredVoterCount = 0; // Initialize new counter
        e.resultsFinalized = false;
        e.creator = msg.sender;
        e.createdAt = block.timestamp;
        e.updatedAt = block.timestamp;
        e.merkleRoot = bytes32(0); // Initialize Merkle root
        
        electionCount++;
        
        emit ElectionCreated(electionId, _title, _startTime, _endTime, msg.sender);
        
        return electionId;
    }
    
    /**
     * @dev Actualiza una elección existente
     * @param _electionId ID de la elección a actualizar
     * @param _title Nuevo título (opcional)
     * @param _description Nueva descripción (opcional)
     */
    function updateElection(
        uint256 _electionId,
        string memory _title,
        string memory _description
    )
        public
        onlyAuthorized
        electionExists(_electionId)
        electionNotStarted(_electionId)
    {
        Election storage e = elections[_electionId];

        if (bytes(_title).length > 0) {
            e.title = _title;
        }

        if (bytes(_description).length > 0) {
            e.description = _description;
        }

        e.updatedAt = block.timestamp;

        emit ElectionUpdated(
            _electionId,
            e.title,
            e.description,
            e.startTime,
            e.endTime,
            msg.sender
        );
    }

    /**
     * @dev Añade un candidato a una elección
     * @param _electionId ID de la elección
     * @param _name Nombre del candidato
     * @param _description Descripción del candidato
     * @return ID del candidato añadido
     */
    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _description
    ) public onlyAuthorized electionExists(_electionId) electionNotStarted(_electionId) returns (uint256) {
        require(!elections[_electionId].resultsFinalized, "VotingSystem: resultados finalizados");
        require(bytes(_name).length > 0, "VotingSystem: el nombre no puede estar vacio");
        require(bytes(_description).length > 0, "VotingSystem: la descripcion no puede estar vacia");
        require(
            elections[_electionId].candidateCount < MAX_CANDIDATES_PER_ELECTION,
            "VotingSystem: limite de candidatos alcanzado"
        );
        
        uint256 candidateId = elections[_electionId].candidateCount;
        
        elections[_electionId].candidates[candidateId] = Candidate({
            name: _name,
            description: _description,
            voteCount: 0,
            addedAt: block.timestamp
        });
        
        elections[_electionId].candidateCount++;
        elections[_electionId].updatedAt = block.timestamp;

        emit CandidateAdded(_electionId, candidateId, _name, msg.sender);
        
        return candidateId;
    }
    /**
     * @dev Actualiza un candidato existente
     * @param _electionId ID de la elección
     * @param _candidateId ID del candidato
     * @param _name Nuevo nombre del candidato
     * @param _description Nueva descripción del candidato
     */
    function updateCandidate(
        uint256 _electionId,
        uint256 _candidateId,
        string memory _name,
        string memory _description
    )
        public
        onlyAuthorized
        electionExists(_electionId)
        electionNotStarted(_electionId)
    {
        require(!elections[_electionId].resultsFinalized, "VotingSystem: resultados finalizados");
        require(_candidateId < elections[_electionId].candidateCount, "VotingSystem: candidato invalido");

        if (bytes(_name).length > 0) {
            elections[_electionId].candidates[_candidateId].name = _name;
        }

        if (bytes(_description).length > 0) {
            elections[_electionId].candidates[_candidateId].description = _description;
        }

        elections[_electionId].updatedAt = block.timestamp;

        emit CandidateUpdated(_electionId, _candidateId, _name, msg.sender);
    }
    
    /**
     * @dev Finaliza una elección antes de tiempo
     * @param _electionId ID de la elección a finalizar
     */
    function endElection(uint256 _electionId)
        public
        onlyAuthorized
        electionExists(_electionId)
    {
        require(elections[_electionId].isActive, "VotingSystem: la eleccion ya esta inactiva");

        elections[_electionId].isActive = false;
        elections[_electionId].endTime = block.timestamp;
        elections[_electionId].updatedAt = block.timestamp;

        emit ElectionEnded(_electionId, block.timestamp, msg.sender);
    }
    
    /**
     * @dev Finaliza los resultados de una elección
     * @param _electionId ID de la elección
     */
    function finalizeResults(uint256 _electionId)
        public
        onlyAuthorized
        electionExists(_electionId)
        electionEnded(_electionId)
    {
        require(!elections[_electionId].resultsFinalized, "VotingSystem: resultados ya finalizados");
        
        elections[_electionId].resultsFinalized = true;
        elections[_electionId].updatedAt = block.timestamp;
        
        emit ElectionFinalized(_electionId, elections[_electionId].totalVotes, msg.sender);
    }
    
    // ---- Funciones de Gestión de Votantes ----
    
    /**
     * @dev Registra un votante para una elección usando su identificador.
     * @param _electionId ID de la elección.
     * @param _voterIdentifier Identificador único del votante (bytes32).
     */
    function registerVoter(uint256 _electionId, bytes32 _voterIdentifier)
        public
        onlyAuthorized
        electionExists(_electionId)
        nonReentrant
    {
        require(elections[_electionId].isActive, "VotingSystem: eleccion inactiva");
        require(_voterIdentifier != bytes32(0), "VotingSystem: voterIdentifier no puede ser cero");
        require(!elections[_electionId].voters[_voterIdentifier].isRegistered, "VotingSystem: votante ya registrado con este identificador");
        
        elections[_electionId].voters[_voterIdentifier] = Voter({
            isRegistered: true
            // Other fields removed
        });
        
        elections[_electionId].registeredVoterCount++;
        elections[_electionId].updatedAt = block.timestamp;

        emit VoterRegistered(_electionId, _voterIdentifier, msg.sender);
    }

    /**
     * @dev Registra múltiples votantes para una elección usando sus identificadores.
     * @param _electionId ID de la elección.
     * @param _voterIdentifiers Array de identificadores únicos de votantes (bytes32).
     */
    function batchRegisterVoters(
        uint256 _electionId,
        bytes32[] memory _voterIdentifiers
    )
        public
        onlyAuthorized
        electionExists(_electionId)
        nonReentrant
    {
        require(elections[_electionId].isActive, "VotingSystem: eleccion inactiva");
        require(_voterIdentifiers.length <= 100, "VotingSystem: demasiados votantes por lote"); // Keep batch limit reasonable

        for (uint256 i = 0; i < _voterIdentifiers.length; i++) {
            bytes32 voterIdentifier = _voterIdentifiers[i];

            require(voterIdentifier != bytes32(0), "VotingSystem: voterIdentifier no puede ser cero en lote");

            if (!elections[_electionId].voters[voterIdentifier].isRegistered) {
                elections[_electionId].voters[voterIdentifier] = Voter({
                    isRegistered: true
                    // Other fields removed
                });

                elections[_electionId].registeredVoterCount++;
                emit VoterRegistered(_electionId, voterIdentifier, msg.sender);
            }
        }

        elections[_electionId].updatedAt = block.timestamp;
    }

    /**
     * @dev Elimina un votante de una elección usando su identificador.
     * @param _electionId ID de la elección.
     * @param _voterIdentifier Identificador del votante a eliminar.
     */
    function removeVoter(uint256 _electionId, bytes32 _voterIdentifier)
        public
        onlyAuthorized
        electionExists(_electionId)
        electionNotStarted(_electionId)
    {
        require(_voterIdentifier != bytes32(0), "VotingSystem: voterIdentifier no puede ser cero");
        Voter storage voter = elections[_electionId].voters[_voterIdentifier];
        require(voter.isRegistered, "VotingSystem: votante no registrado con este identificador");
        // Cannot check hasVoted here as it's removed for anonymous voting.
        // The check that a voter can be removed should be based on election state (not started).

        voter.isRegistered = false;
        elections[_electionId].registeredVoterCount--;

        elections[_electionId].updatedAt = block.timestamp;

        emit VoterRemoved(_electionId, _voterIdentifier, msg.sender);
    }

    // ---- Funciones de Administración y ZK ----

    /**
     * @dev Establece la dirección del contrato Verifier para las pruebas ZK-SNARK.
     * @param _verifierAddress La dirección del contrato Verifier desplegado.
     */
    function setVerifier(address _verifierAddress) public onlyOwner {
        require(_verifierAddress != address(0), "VotingSystem: direccion invalida para verifier");
        verifier = IVerifier(_verifierAddress);
        emit VerifierSet(_verifierAddress);
    }

    /**
     * @dev Establece la Merkle root para una elección específica.
     * @param _electionId ID de la elección.
     * @param _merkleRoot La Merkle root calculada off-chain de todos los voterIdentifiers registrados.
     */
    function setMerkleRoot(uint256 _electionId, bytes32 _merkleRoot)
        public
        onlyAuthorized
        electionExists(_electionId)
    {
        Election storage e = elections[_electionId];
        require(e.merkleRoot == bytes32(0), "VotingSystem: Merkle root ya establecido");
        // Optional: Consider if this should only be allowed before election start
        // require(block.timestamp < e.startTime, "VotingSystem: la eleccion ya ha comenzado");
        require(_merkleRoot != bytes32(0), "VotingSystem: Merkle root no puede ser cero");

        e.merkleRoot = _merkleRoot;
        e.updatedAt = block.timestamp;

        emit MerkleRootSet(_electionId, _merkleRoot);
    }

    /**
     * @dev Emite un voto anónimo usando una prueba ZK-SNARK.
     * @param _electionId ID de la elección.
     * @param _pA Prueba ZK-SNARK parte A.
     * @param _pB Prueba ZK-SNARK parte B.
     * @param _pC Prueba ZK-SNARK parte C.
     * @param _merkleRoot Raíz del árbol de Merkle (public input).
     * @param _nullifierHash Hash del nulificador único (public input).
     * @param _voteCommitment Compromiso del voto (public input).
     */
    function anonymousVote(
        uint256 _electionId,
        uint256[2] memory _pA,
        uint256[2][2] memory _pB,
        uint256[2] memory _pC,
        bytes32 _merkleRoot,
        bytes32 _nullifierHash,
        bytes32 _voteCommitment
    ) public electionExists(_electionId) electionActive(_electionId) nonReentrant {
        require(address(verifier) != address(0), "VotingSystem: Verificador no configurado");

        Election storage e = elections[_electionId];
        require(e.merkleRoot != bytes32(0), "VotingSystem: Merkle root no establecido para la eleccion");
        require(e.merkleRoot == _merkleRoot, "VotingSystem: Merkle root invalido");
        require(!e.usedNullifiers[_nullifierHash], "VotingSystem: Voto ya emitido con este nulificador (doble voto)");

        // Prepare public inputs array for the verifier.
        // Order: merkleRoot, nullifierHash, voteCommitment (as per IVerifier interface)
        uint256[] memory publicInputs = new uint256[](3);
        publicInputs[0] = uint256(_merkleRoot);
        publicInputs[1] = uint256(_nullifierHash);
        publicInputs[2] = uint256(_voteCommitment);

        // Verify the proof
        bool proofVerified = verifier.verifyProof(_pA, _pB, _pC, publicInputs);
        require(proofVerified, "VotingSystem: Prueba ZK invalida");

        // Record nullifier and vote commitment
        e.usedNullifiers[_nullifierHash] = true;
        e.voteCommitments[_voteCommitment] = true; // Mark commitment as received
        e.totalVotes++; // Increment total (anonymous) votes
        e.updatedAt = block.timestamp;

        emit AnonymousVoteCast(_electionId, _nullifierHash, _voteCommitment);
    }

    /**
     * @dev Revela un voto previamente emitido de forma anónima para su conteo.
     * @param _electionId ID de la elección.
     * @param _candidateId ID del candidato por el cual se emitió el voto.
     * @param _voteCommitment El compromiso del voto que fue emitido.
     */
    function revealVote(
        uint256 _electionId,
        uint256 _candidateId,
        bytes32 _voteCommitment // Client provides the commitment they stored
    ) external electionExists(_electionId) nonReentrant {
        Election storage e = elections[_electionId];
        
        // Optional: uncomment if reveals are only allowed after voting ends.
        // require(block.timestamp > e.endTime, "VotingSystem: La eleccion aun no ha finalizado");
        require(!e.resultsFinalized, "VotingSystem: Los resultados ya estan finalizados");
        require(_candidateId < e.candidateCount, "VotingSystem: Candidato invalido");

        // Check if this commitment was genuinely cast (i.e., it's in the voteCommitments mapping)
        require(e.voteCommitments[_voteCommitment], "VotingSystem: Compromiso de voto invalido o no encontrado");
        // Check if this commitment has already been revealed
        require(!e.revealedVoteCommitments[_voteCommitment], "VotingSystem: Este compromiso de voto ya ha sido revelado");

        e.candidates[_candidateId].voteCount++;
        e.revealedVoteCommitments[_voteCommitment] = true;
        // Optional: Consider deleting from e.voteCommitments[_voteCommitment] if it saves gas
        // and the commitment is not needed further after reveal.
        // delete e.voteCommitments[_voteCommitment];

        e.updatedAt = block.timestamp;

        emit VoteRevealed(_electionId, _voteCommitment, _candidateId);
    }

    // ---- Funciones de Administración (Operadores) ----
    
    /**
     * @dev Añade un operador autorizado
     * @param _operator Dirección del operador a autorizar
     */
    function addOperator(address _operator) public onlyOwner {
        require(_operator != address(0), "VotingSystem: dirección inválida");
        require(!authorizedOperators[_operator], "VotingSystem: ya es operador");

        authorizedOperators[_operator] = true;
        
        emit OperatorAdded(_operator, msg.sender);
    }

    /**
     * @dev Elimina un operador autorizado
     * @param _operator Dirección del operador a eliminar
     */
    function removeOperator(address _operator) public onlyOwner {
        require(authorizedOperators[_operator], "VotingSystem: no es operador");
        
        authorizedOperators[_operator] = false;
        
        emit OperatorRemoved(_operator, msg.sender);
    }
    
    // ---- Funciones de Vista ----
    
    /**
     * @dev Obtiene un resumen de una elección
     * @param _electionId ID de la elección
     * @return Estructura ElectionSummary con los datos
     */
    function getElectionSummary(uint256 _electionId) 
        public
        view
        electionExists(_electionId)
        returns (ElectionSummary memory)
    {
        Election storage e = elections[_electionId];
        
        return ElectionSummary({
            id: _electionId,
            title: e.title,
            description: e.description,
            startTime: e.startTime,
            endTime: e.endTime,
            isActive: e.isActive,
            candidateCount: e.candidateCount,
            totalVotes: e.totalVotes,
            resultsFinalized: e.resultsFinalized,
            creator: e.creator,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt
        });
    }
    
    /**
     * @dev Obtiene información de un candidato
     * @param _electionId ID de la elección
     * @param _candidateId ID del candidato
     * @return Nombre, descripción y número de votos del candidato
     */
    function getCandidate(uint256 _electionId, uint256 _candidateId) 
        public
        view
        electionExists(_electionId)
        returns (string memory, string memory, uint256)
    {
        require(_candidateId < elections[_electionId].candidateCount, "VotingSystem: candidato invalido");
        
        Candidate storage c = elections[_electionId].candidates[_candidateId];
        
        return (c.name, c.description, c.voteCount);
    }
    
    /**
     * @dev Obtiene el estado de un votante usando su identificador.
     * @param _electionId ID de la elección.
     * @param _voterIdentifier Identificador del votante.
     * @return Si está registrado y si ha votado.
     */
    function getVoterStatus(uint256 _electionId, bytes32 _voterIdentifier)
        public
        view
        electionExists(_electionId)
        returns (bool isRegistered) // Only registration status can be public now
    {
        require(_voterIdentifier != bytes32(0), "VotingSystem: voterIdentifier no puede ser cero");
        Voter storage v = elections[_electionId].voters[_voterIdentifier];
        return v.isRegistered;
    }

    /**
     * @dev Obtiene información detallada de un votante (solo si está registrado).
     *      hasVoted and voteTimestamp are removed due to anonymous voting.
     * @param _electionId ID de la elección.
     * @param _voterIdentifier Identificador del votante.
     * @return Registrado.
     */
    function getVoterDetails(uint256 _electionId, bytes32 _voterIdentifier)
        public
        view
        electionExists(_electionId)
        returns (bool isRegistered)
    {
        require(_voterIdentifier != bytes32(0), "VotingSystem: voterIdentifier no puede ser cero");
        Voter storage v = elections[_electionId].voters[_voterIdentifier];
        return v.isRegistered;
    }
    
    /**
     * @dev Obtiene el conteo de votantes registrados para una elección.
     * @param _electionId ID de la elección.
     * @return Número de votantes registrados.
     */
    function getRegisteredVoterCount(uint256 _electionId)
        public
        view
        electionExists(_electionId)
        returns (uint256)
    {
        return elections[_electionId].registeredVoterCount;
    }
    
    /**
     * @dev Obtiene el conteo de votantes que han emitido su voto
     * @param _electionId ID de la elección
     * @return Número de votantes que han votado
     */
    function getVotedCount(uint256 _electionId) // This function is inefficient for large numbers of voters.
        public                          // Consider removing or using off-chain counting if truly needed.
        view
        electionExists(_electionId)
        returns (uint256)
    {
        // This is highly inefficient for on-chain query if the number of registered voters is large,
        // as it would require iterating through all possible voterIdentifiers or storing them in an array.
        // The `totalVotes` in the Election struct provides a direct count of cast votes.
        // If this function is meant to count unique voters who have voted (which totalVotes already does),
        // then totalVotes should be used.
        // For now, returning totalVotes as it's the most direct measure of "voted count".
        return elections[_electionId].totalVotes;
    }

    /**
     * @dev Obtiene los resultados de una elección
     * @param _electionId ID de la elección
     * @return Array con los votos de cada candidato
     */
    function getElectionResults(uint256 _electionId) 
        public
        view
        electionExists(_electionId)
        returns (uint256[] memory)
    {
        require(
            elections[_electionId].resultsFinalized || block.timestamp > elections[_electionId].endTime,
            "VotingSystem: resultados no disponibles"
        );
        
        uint256[] memory results = new uint256[](elections[_electionId].candidateCount);
        
        for (uint256 i = 0; i < elections[_electionId].candidateCount; i++) {
            results[i] = elections[_electionId].candidates[i].voteCount;
        }
        
        return results;
    }

    /**
     * @dev Verifica si un votante está registrado en una elección usando su identificador.
     * @param _electionId ID de la elección.
     * @param _voterIdentifier Identificador del votante.
     * @return True si el votante está registrado.
     */
    function isRegisteredVoter(uint256 _electionId, bytes32 _voterIdentifier)
        public
        view
        electionExists(_electionId)
        returns (bool)
    {
        require(_voterIdentifier != bytes32(0), "VotingSystem: voterIdentifier no puede ser cero");
        return elections[_electionId].voters[_voterIdentifier].isRegistered;
    }

    /**
     * @dev Verifica si un votante ya ha emitido su voto usando su identificador.
     * @param _electionId ID de la elección.
     * @param _voterIdentifier Identificador del votante.
     * @return True si el votante ya ha votado.
     */
    function hasVoted(uint256 _electionId, bytes32 _nullifierHash)
        public
        view
        electionExists(_electionId)
        returns (bool)
    {
        // This function now checks if a nullifier has been used, not a specific voter's status.
        // This is public information but doesn't link to a voterIdentifier directly.
        require(_nullifierHash != bytes32(0), "VotingSystem: nullifierHash no puede ser cero");
        return elections[_electionId].usedNullifiers[_nullifierHash];
    }
}
