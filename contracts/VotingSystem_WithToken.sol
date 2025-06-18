// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./VotingToken.sol";

/**
 * @title VotingSystem con soporte para tokens
 * @dev Sistema de votación mejorado que requiere tokens para votar
 */
contract VotingSystem_WithToken is ReentrancyGuard {
    // Referencia al contrato de token
    VotingToken public votingToken;
    
    // Costo en tokens para votar (1 token por voto)
    uint256 public constant TOKENS_REQUIRED_TO_VOTE = 1 * 10**18; // 1 token (considerando 18 decimales)
    
    // Dirección del administrador
    address public admin;
    
    // Mapeo para controlar operadores autorizados
    mapping(address => bool) public authorizedOperators;
    
    // Eventos
    event VoterRegistered(address indexed voter, uint256 indexed electionId);
    event VoteCast(address indexed voter, uint256 indexed electionId, uint256 candidateId);
    event ElectionCreated(uint256 indexed electionId, string title);
    event CandidateAdded(uint256 indexed electionId, uint256 candidateId, string name);
    event ElectionStatusChanged(uint256 indexed electionId, bool isActive);
    event ResultsFinalized(uint256 indexed electionId);
    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);
    event TokensSpent(address indexed voter, uint256 amount);
    
    // Modificador para verificar si el llamante es el administrador
    modifier onlyAdmin() {
        require(msg.sender == admin, "Solo el administrador puede realizar esta accion");
        _;
    }
    
    // Modificador para verificar si el llamante es un operador autorizado
    modifier onlyAuthorized() {
        require(
            msg.sender == admin || authorizedOperators[msg.sender],
            "No autorizado"
        );
        _;
    }
    
    // Estructuras de datos
    struct Candidate {
        string name;
        string description;
        uint256 voteCount;
    }
    
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint256 voteTimestamp;
        uint256 vote;
        bytes32 voterHash;
    }
    
    struct Election {
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        mapping(uint256 => Candidate) candidates;
        uint256 candidateCount;
        uint256 totalVotes;
        mapping(address => Voter) voters;
        address[] voterAddresses;
        bool resultsFinalized;
        address creator;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    // Mapeo de elecciones
    mapping(uint256 => Election) public elections;
    uint256 public electionCount;
    
    // Constructor que recibe la dirección del contrato de token
    constructor(address _votingTokenAddress) {
        require(_votingTokenAddress != address(0), "Direccion de token invalida");
        votingToken = VotingToken(_votingTokenAddress);
        admin = msg.sender;
        authorizedOperators[msg.sender] = true;
    }
    
    // Función para crear una nueva elección (solo administrador)
    function createElection(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) public onlyAuthorized returns (uint256) {
        require(bytes(_title).length > 0, "El titulo no puede estar vacio");
        require(bytes(_description).length > 0, "La descripcion no puede estar vacia");
        require(_startTime > block.timestamp, "La hora de inicio debe ser en el futuro");
        require(_endTime > _startTime, "La hora de fin debe ser posterior a la hora de inicio");
        
        uint256 electionId = electionCount++;
        
        Election storage newElection = elections[electionId];
        newElection.title = _title;
        newElection.description = _description;
        newElection.startTime = _startTime;
        newElection.endTime = _endTime;
        newElection.isActive = true;
        newElection.candidateCount = 0;
        newElection.totalVotes = 0;
        newElection.creator = msg.sender;
        newElection.createdAt = block.timestamp;
        newElection.updatedAt = block.timestamp;
        
        emit ElectionCreated(electionId, _title);
        return electionId;
    }
    
    // Función para agregar un candidato a una elección
    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _description
    ) public onlyAuthorized {
        require(_electionId < electionCount, "Eleccion no encontrada");
        require(!elections[_electionId].resultsFinalized, "Resultados ya finalizados");
        require(bytes(_name).length > 0, "El nombre no puede estar vacio");
        
        Election storage election = elections[_electionId];
        
        uint256 candidateId = election.candidateCount++;
        election.candidates[candidateId] = Candidate({
            name: _name,
            description: _description,
            voteCount: 0
        });
        
        emit CandidateAdded(_electionId, candidateId, _name);
    }
    
    // Función para registrar un votante (solo operadores autorizados)
    function registerVoter(uint256 _electionId, address _voter) public onlyAuthorized {
        require(_electionId < electionCount, "Eleccion no encontrada");
        require(!elections[_electionId].voters[_voter].isRegistered, "Votante ya registrado");
        
        elections[_electionId].voters[_voter] = Voter({
            isRegistered: true,
            hasVoted: false,
            voteTimestamp: 0,
            vote: 0,
            voterHash: keccak256(abi.encodePacked(_voter, block.timestamp))
        });
        
        elections[_electionId].voterAddresses.push(_voter);
        
        emit VoterRegistered(_voter, _electionId);
    }
    
    // Función para emitir un voto (paga con tokens)
    function castVote(uint256 _electionId, uint256 _candidateId) public nonReentrant {
        require(_electionId < electionCount, "Eleccion no encontrada");
        require(elections[_electionId].isActive, "Eleccion no activa");
        require(block.timestamp >= elections[_electionId].startTime, "Eleccion no iniciada");
        require(block.timestamp <= elections[_electionId].endTime, "Eleccion finalizada");
        require(elections[_electionId].voters[msg.sender].isRegistered, "Votante no registrado");
        require(!elections[_electionId].voters[msg.sender].hasVoted, "Ya votaste en esta eleccion");
        require(_candidateId < elections[_electionId].candidateCount, "Candidato invalido");
        
        // Verificar que el votante tiene suficientes tokens
        require(
            votingToken.balanceOf(msg.sender) >= TOKENS_REQUIRED_TO_VOTE,
            "Tokens insuficientes para votar"
        );
        
        // Transferir tokens al contrato (quemarlos)
        require(
            votingToken.transferFrom(msg.sender, address(this), TOKENS_REQUIRED_TO_VOTE),
            "Error al transferir tokens"
        );
        
        // Registrar el voto
        elections[_electionId].voters[msg.sender].hasVoted = true;
        elections[_electionId].voters[msg.sender].voteTimestamp = block.timestamp;
        elections[_electionId].voters[msg.sender].vote = _candidateId;
        
        // Actualizar contador de votos
        elections[_electionId].candidates[_candidateId].voteCount++;
        elections[_electionId].totalVotes++;
        elections[_electionId].updatedAt = block.timestamp;
        
        emit VoteCast(msg.sender, _electionId, _candidateId);
        emit TokensSpent(msg.sender, TOKENS_REQUIRED_TO_VOTE);
    }
    
    // Función para finalizar una elección (solo administrador)
    function finalizeElection(uint256 _electionId) public onlyAdmin {
        require(_electionId < electionCount, "Eleccion no encontrada");
        require(!elections[_electionId].resultsFinalized, "Resultados ya finalizados");
        
        elections[_electionId].isActive = false;
        elections[_electionId].resultsFinalized = true;
        elections[_electionId].updatedAt = block.timestamp;
        
        emit ResultsFinalized(_electionId);
    }
    
    // Función para agregar un operador autorizado (solo administrador)
    function addAuthorizedOperator(address _operator) public onlyAdmin {
        require(_operator != address(0), "Direccion invalida");
        require(!authorizedOperators[_operator], "Operador ya autorizado");
        
        authorizedOperators[_operator] = true;
        emit OperatorAdded(_operator);
    }
    
    // Función para eliminar un operador autorizado (solo administrador)
    function removeAuthorizedOperator(address _operator) public onlyAdmin {
        require(authorizedOperators[_operator], "Operador no autorizado");
        
        delete authorizedOperators[_operator];
        emit OperatorRemoved(_operator);
    }
    
    // Función para verificar si una dirección es un operador autorizado
    function isAuthorizedOperator(address _operator) public view returns (bool) {
        return authorizedOperators[_operator];
    }
    
    // Función para obtener información de un votante en una elección
    function getVoterInfo(uint256 _electionId, address _voter) 
        public 
        view 
        returns (bool isRegistered, bool hasVoted, uint256 voteTimestamp, uint256 vote, bytes32 voterHash) 
    {
        require(_electionId < electionCount, "Eleccion no encontrada");
        
        Voter storage voter = elections[_electionId].voters[_voter];
        return (
            voter.isRegistered,
            voter.hasVoted,
            voter.voteTimestamp,
            voter.vote,
            voter.voterHash
        );
    }
    
    // Función para obtener información de un candidato
    function getCandidateInfo(uint256 _electionId, uint256 _candidateId)
        public
        view
        returns (string memory name, string memory description, uint256 voteCount)
    {
        require(_electionId < electionCount, "Eleccion no encontrada");
        require(_candidateId < elections[_electionId].candidateCount, "Candidato no encontrado");
        
        Candidate storage candidate = elections[_electionId].candidates[_candidateId];
        return (candidate.name, candidate.description, candidate.voteCount);
    }
    
    // Función para obtener información básica de una elección
    function getElectionInfo(uint256 _electionId)
        public
        view
        returns (
            string memory title,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            bool isActive,
            uint256 candidateCount,
            uint256 totalVotes,
            bool resultsFinalized,
            address creator,
            uint256 createdAt
        )
    {
        require(_electionId < electionCount, "Eleccion no encontrada");
        
        Election storage election = elections[_electionId];
        return (
            election.title,
            election.description,
            election.startTime,
            election.endTime,
            election.isActive,
            election.candidateCount,
            election.totalVotes,
            election.resultsFinalized,
            election.creator,
            election.createdAt
        );
    }
    
    // Función para obtener la lista de direcciones de votantes de una elección
    function getVoterAddresses(uint256 _electionId) public view returns (address[] memory) {
        require(_electionId < electionCount, "Eleccion no encontrada");
        return elections[_electionId].voterAddresses;
    }
    
    // Función para verificar si una dirección puede votar (tiene tokens suficientes y está registrada)
    function canVote(uint256 _electionId, address _voter) public view returns (bool) {
        if (_electionId >= electionCount) return false;
        if (!elections[_electionId].isActive) return false;
        if (block.timestamp < elections[_electionId].startTime) return false;
        if (block.timestamp > elections[_electionId].endTime) return false;
        if (!elections[_electionId].voters[_voter].isRegistered) return false;
        if (elections[_electionId].voters[_voter].hasVoted) return false;
        if (votingToken.balanceOf(_voter) < TOKENS_REQUIRED_TO_VOTE) return false;
        
        return true;
    }
    
    // Función para retirar tokens del contrato (solo administrador)
    function withdrawTokens(address _to, uint256 _amount) public onlyAdmin {
        require(_to != address(0), "Direccion de destino invalida");
        require(_amount > 0, "El monto debe ser mayor a cero");
        
        require(
            votingToken.transfer(_to, _amount),
            "Error al transferir tokens"
        );
    }
}
