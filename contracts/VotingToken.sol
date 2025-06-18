// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VotingToken is ERC20, Ownable {
    // Dirección del contrato de votación que puede gastar tokens
    address public votingContract;

    // Mapeo para controlar si una dirección está autorizada a transferir tokens
    mapping(address => bool) private _authorizedSpenders;

    // Evento para cuando se autoriza un gastador
    event SpenderAuthorized(address indexed spender, bool isAuthorized);

    constructor() ERC20("Voting Token", "VOTE") {
        // El despliegue del contrato recibe todos los tokens iniciales
        _mint(msg.sender, 1000000 * 10 ** decimals());
        
        // El propietario inicial puede transferir tokens
        _authorizedSpenders[msg.sender] = true;
    }

    // Modificador para verificar si el llamante está autorizado
    modifier onlyAuthorized() {
        require(
            _authorizedSpenders[msg.sender],
            "VotingToken: No autorizado para transferir"
        );
        _;
    }

    // Función para autorizar/desautorizar direcciones a gastar tokens
    function authorizeSpender(address spender, bool isAuthorized) external onlyOwner {
        _authorizedSpenders[spender] = isAuthorized;
        emit SpenderAuthorized(spender, isAuthorized);
    }

    // Sobrescribir la función de transferencia para incluir la verificación de autorización
    function transfer(address to, uint256 amount) 
        public 
        override 
        onlyAuthorized 
        returns (bool) 
    {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }

    // Sobrescribir la función de transferencia desde
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override onlyAuthorized returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    // Función para verificar si una dirección está autorizada
    function isAuthorizedSpender(address spender) public view returns (bool) {
        return _authorizedSpenders[spender];
    }
}
