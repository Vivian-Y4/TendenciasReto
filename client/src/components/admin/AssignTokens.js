// client/src/components/admin/AssignTokens.js
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { PROVINCES } from '../../constants/provinces';

const AssignTokens = ({ tokenAddress, onTokensAssigned }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [groupAmount, setGroupAmount] = useState('');
  const [groupStatus, setGroupStatus] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);
  const [hasVoters, setHasVoters] = useState(true);

  const handleAssign = async () => {
    setStatus('');
    setLoading(true);

    if (!tokenAddress) {
      setStatus("Error: La dirección del contrato de token no está configurada.");
      setLoading(false);
      return;
    }

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
      if (onTokensAssigned) onTokensAssigned();
    } catch (err) {
      if (err.reason && err.reason.includes("No autorizado para transferir")) {
        setStatus("Error: La dirección actual de MetaMask no está autorizada para transferir tokens.");
      } else {
        setStatus('Error: ' + (err.reason || err.message));
      }
    }

    setLoading(false);
  };

  const handleGroupAssign = async () => {
    setGroupStatus('');
    setGroupLoading(true);

    if (!tokenAddress) {
      setGroupStatus("Error: La dirección del contrato de token no está configurada.");
      setGroupLoading(false);
      return;
    }

    if (!selectedProvince || !groupAmount) {
      setGroupStatus("Error: Por favor, seleccione una provincia y especifique una cantidad.");
      setGroupLoading(false);
      return;
    }

    try {
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        setGroupStatus("Error: Token de administrador no encontrado. Por favor, inicie sesión de nuevo.");
        setGroupLoading(false);
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/voters/by-province/${selectedProvince}`, {
        headers: { "x-auth-token": adminToken }
      });

      if (!response.ok) {
        // Get the error message from the response
        const errorText = await response.text();
        const errorMessage = errorText.includes('No se encontraron votantes') 
          ? `No hay votantes registrados para la provincia ${selectedProvince}.` 
          : `Error al obtener votantes: ${response.statusText}`;
        setGroupStatus(errorMessage);
        setHasVoters(false);
        setGroupLoading(false);
        return;
      }

      const data = await response.json();
      if (!data.success || !data.voters || data.voters.length === 0) {
        setGroupStatus(`No hay votantes registrados para la provincia ${selectedProvince}.`);
        setHasVoters(false);
        setGroupLoading(false);
        return;
      }

      const votersToProcess = data.voters;
      setGroupStatus(`Votantes encontrados: ${votersToProcess.length}. Iniciando asignación...`);
      setHasVoters(true);

      if (!window.ethereum) {
        setGroupStatus("Error: Metamask no detectado.");
        setGroupLoading(false);
        return;
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const tokenAbi = ["function transfer(address to, uint256 amount) public returns (bool)"];
      const contract = new ethers.Contract(tokenAddress, tokenAbi, signer);

      let successCount = 0;
      let failCount = 0;
      const failedAssignments = [];
      const parsedGroupAmount = ethers.utils.parseUnits(groupAmount, 18);

      for (const voter of votersToProcess) {
        if (!voter.walletAddress) {
          failedAssignments.push({ voter: voter.firstName, error: "Dirección de wallet no encontrada." });
          failCount++;
          continue;
        }

        try {
          const tx = await contract.transfer(voter.walletAddress, parsedGroupAmount);
          await tx.wait();
          successCount++;
        } catch (err) {
          failCount++;
          const specificError = (err.reason && err.reason.includes("No autorizado para transferir"))
            ? "No autorizado para transferir desde esta cuenta."
            : (err.reason || err.message);
          failedAssignments.push({ voter: `${voter.firstName} ${voter.lastName} (${voter.walletAddress})`, error: specificError });

          if (err.reason && err.reason.includes("No autorizado para transferir")) {
            setGroupStatus(`Error de autorización: ${specificError}. Se detuvo la asignación masiva.`);
            break;
          }
        }
      }

      let summaryMessage = `Asignación para ${selectedProvince} completada. Éxitos: ${successCount}, Fallos: ${failCount}.`;
      if (failedAssignments.length > 0) {
        summaryMessage += " Detalles de fallos: " + failedAssignments.map(f => `${f.voter}: ${f.error}`).join("; ");
        console.error("Fallos en asignación grupal:", failedAssignments);
      }
      setGroupStatus(summaryMessage);
      // Clear fields on success or partial success
      // setSelectedProvince('');
      // setGroupAmount('');

    } catch (error) {
      console.error('Error en handleGroupAssign:', error);
      setGroupStatus('Error durante la asignación grupal: ' + error.message);
    } finally {
      setGroupLoading(false);
    }
  };

  return (
    <>
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

      <hr />

      <div className="mb-3">
        <h5>Asignar tokens por Provincia</h5>
        <div className="d-flex mb-2">
          <select
            className="form-select me-2"
            value={selectedProvince}
            onChange={e => setSelectedProvince(e.target.value)}
          >
            <option value="">Seleccione provincia...</option>
            {PROVINCES.map(province => (
              <option key={province} value={province}>{province}</option>
            ))}
          </select>
          <input
            type="number"
            className="form-control me-2"
            placeholder="Cantidad por votante"
            value={groupAmount}
            onChange={e => setGroupAmount(e.target.value)}
          />
          <button
            className="btn btn-secondary"
            onClick={handleGroupAssign}
            disabled={groupLoading || !selectedProvince || !groupAmount || !hasVoters}
            title={!hasVoters ? 'No hay votantes registrados para esta provincia' : undefined}
          >
            {groupLoading ? "Asignando..." : "Asignar a Provincia"}
          </button>
        </div>
        {groupStatus && <div className="text-info">{groupStatus}</div>}
      </div>
    </>
  );
};

export default AssignTokens;
