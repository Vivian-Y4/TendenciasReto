// client/src/components/admin/AssignTokens.js
import React, { useState } from 'react';
import { ethers } from 'ethers';

const AssignTokens = ({ tokenAddress, onTokensAssigned }) => {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
  
    const handleAssign = async () => {
      setStatus('');
      setLoading(true);
      try {
        if (!window.ethereum) throw new Error("Metamask no detectado");
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const tokenAbi = [
          "function transfer(address to, uint256 amount) public returns (bool)"
        ];
        const contract = new ethers.Contract(tokenAddress, tokenAbi, signer);
        const tx = await contract.transfer(recipient, ethers.utils.parseUnits(amount, 18));
        await tx.wait();
        setStatus('¡Tokens asignados correctamente!');
        setRecipient('');
        setAmount('');
        if (onTokensAssigned) onTokensAssigned(); // <-- llama al callback
      } catch (err) {
        setStatus('Error: ' + (err.reason || err.message));
      }
      setLoading(false);
    };
  
    return (
      <div className="mb-3">
        <h5>Asignar tokens a votante</h5>
        <div className="d-flex mb-2">
          <input
            type="text"
            className="form-control me-2"
            placeholder="Dirección del votante"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
          />
          <input
            type="number"
            className="form-control me-2"
            placeholder="Cantidad de tokens"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleAssign} disabled={loading || !recipient || !amount}>
            {loading ? "Asignando..." : "Asignar"}
          </button>
        </div>
        {status && <div className="text-info">{status}</div>}
      </div>
    );
  };
  

export default AssignTokens;