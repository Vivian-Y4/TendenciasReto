// client/src/components/admin/AssignTokens.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { PROVINCES } from '../../constants/provinces';

// Fallback para la dirección del contrato en caso de que el padre no la envíe
const getDefaultTokenAddress = () =>
  process.env.REACT_APP_TOKEN_ADDRESS ||
  process.env.REACT_APP_TOKEN_CONTRACT_ADDRESS || '';

const AssignTokens = ({ tokenAddress = getDefaultTokenAddress(), onTokensAssigned }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [groupAmount, setGroupAmount] = useState('');
  const [groupStatus, setGroupStatus] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);
  const [hasVoters, setHasVoters] = useState(true);

  // Estados para la lista de votantes
  const [voters, setVoters] = useState([]);
  const [votersLoading, setVotersLoading] = useState(false);
  const [votersError, setVotersError] = useState('');

  // Obtener votantes al cargar el componente o cambiar la provincia
  useEffect(() => {
    const fetchVoters = async () => {
      try {
        setVotersLoading(true);
        setVotersError('');

        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
          setVotersError('Token de administrador no encontrado.');
          return;
        }

        const apiUrl = process.env.REACT_APP_API_URL || '';
        const endpoint = selectedProvince
          ? `/api/admin/voters/by-province/${selectedProvince}`
          : '/api/admin/voters/all-wallets';

        const res = await fetch(`${apiUrl}${endpoint}`, {
          headers: { 'x-auth-token': adminToken }
        });

        // Si el backend responde 404 significa que no hay votantes que cumplan el filtro
        if (res.status === 404) {
          setVoters([]);
          setHasVoters(false);
          return;
        }

        if (!res.ok) {
          throw new Error(`Error al obtener votantes (${res.status})`);
        }

        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Error inesperado');

        setVoters(data.voters || []);
        setHasVoters((data.voters || []).length > 0);
      } catch (err) {
        console.error('Error fetchVoters:', err);
        setVotersError(err.message);
        setVoters([]);
        setHasVoters(false);
      } finally {
        setVotersLoading(false);
      }
    };

    fetchVoters();
  }, [selectedProvince]);

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
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function decimals() view returns (uint8)"
      ];

      const contract = new ethers.Contract(tokenAddress, tokenAbi, signer);
      // Detectar los decimales del token para calcular la cantidad correcta
      let decimals = 18;
      try {
        if (typeof contract.decimals === 'function') {
          decimals = await contract.decimals();
        }
      } catch {}
      const parsedAmount = ethers.utils.parseUnits(amount, decimals);
      const tx = await contract.transfer(recipient, parsedAmount);
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
        const errorText = await response.text();
        let errorMessage;
        if (response.status === 404 || errorText.includes('No se encontraron votantes')) {
          errorMessage = `No hay votantes registrados para la provincia ${selectedProvince}.`;
        } else {
          errorMessage = `Error al obtener votantes: ${response.statusText}`;
        }

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
        setGroupStatus("Error: MetaMask no está instalado o no está activo en esta página.");
        setGroupLoading(false);
        return;
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const tokenAbi = [
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function decimals() view returns (uint8)"
      ];
      const contract = new ethers.Contract(tokenAddress, tokenAbi, signer);

      let decimals = 18;
      try { if (typeof contract.decimals === 'function') { decimals = await contract.decimals(); } } catch {}
      const parsedGroupAmount = ethers.utils.parseUnits(groupAmount, decimals);

      let successCount = 0;
      let failCount = 0;
      const failedAssignments = [];

      // Obtiene el nonce inicial para esta cuenta (incluyendo tx pendientes)
      let currentNonce = await provider.getTransactionCount(await signer.getAddress(), 'pending');

      for (const voter of votersToProcess) {
        try {
          const tx = await contract.transfer(
            voter.walletAddress,
            parsedGroupAmount,
            { nonce: currentNonce++ } // usa nonce único e incrementa
          );
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
            setGroupLoading(false);
            return;
          }
        }
      }

      let summaryMessage = `Asignación para ${selectedProvince} completada. Éxitos: ${successCount}, Fallos: ${failCount}.`;
      if (failedAssignments.length > 0) {
        summaryMessage += " Detalles de fallos: " + failedAssignments.map(f => `${f.voter}: ${f.error}`).join("; ");
        console.error("Fallos en asignación grupal:", failedAssignments);
      }

      setGroupStatus(summaryMessage);
    } catch (error) {
      console.error('Error en handleGroupAssign:', error);
      setGroupStatus('Error durante la asignación grupal: ' + error.message);
    } finally {
      setGroupLoading(false);
    }
  };

  // Asignar tokens a todos los votantes actualmente listados
  const handleAssignAll = async () => {
    setGroupStatus('');

    if (!tokenAddress) {
      setGroupStatus('Error: La dirección del contrato de token no está configurada.');
      return;
    }

    if (voters.length === 0) {
      setGroupStatus('No hay votantes para asignar.');
      return;
    }

    try {
      setGroupLoading(true);

      if (!window.ethereum) throw new Error('MetaMask no detectado');
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const tokenAbi = [
        'function transfer(address to, uint256 amount) public returns (bool)',
        "function decimals() view returns (uint8)"
      ];
      const contract = new ethers.Contract(tokenAddress, tokenAbi, signer);

      let decimals = 18;
      try { if (typeof contract.decimals === 'function') { decimals = await contract.decimals(); } } catch {}
      const parsedAmount = ethers.utils.parseUnits(groupAmount, decimals);

      let success = 0;
      let fail = 0;

      // Obtiene el nonce inicial para esta cuenta (incluyendo tx pendientes)
      let currentNonce = await provider.getTransactionCount(await signer.getAddress(), 'pending');

      for (const voter of voters) {
        try {
          const tx = await contract.transfer(
            voter.walletAddress,
            parsedAmount,
            { nonce: currentNonce++ }
          );
          await tx.wait();
          success++;
        } catch (err) {
          console.error('Error asignando a', voter.walletAddress, err);
          fail++;
        }
      }

      setGroupStatus(`Asignación completada. Éxitos: ${success}, Fallos: ${fail}.`);
    } catch (err) {
      console.error('Error handleAssignAll:', err);
      setGroupStatus('Error durante la asignación global: ' + err.message);
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

      {/* Lista de votantes */}
      <hr />
      <h6>Votantes encontrados: {voters.length}</h6>
      {votersLoading && <div>Cargando votantes...</div>}
      {votersError && <div className="text-danger">{votersError}</div>}
      {!votersLoading && !votersError && voters.length > 0 && (
        <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table className="table table-sm table-striped">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Wallet</th>
                <th>Provincia</th>
              </tr>
            </thead>
            <tbody>
              {voters.map((v, idx) => (
                <tr key={v.walletAddress}>
                  <td>{idx + 1}</td>
                  <td>{`${v.firstName || ''} ${v.lastName || ''}`}</td>
                  <td style={{ fontSize: '0.75rem' }}>{v.walletAddress}</td>
                  <td>{v.province || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Botón para asignar a todos los listados */}
      <div className="mt-2 d-flex">
        <input
          type="number"
          className="form-control me-2"
          placeholder="Cantidad por votante"
          value={groupAmount}
          onChange={e => setGroupAmount(e.target.value)}
        />
        <button
          className="btn btn-danger"
          onClick={handleAssignAll}
          disabled={groupLoading || voters.length === 0 || !groupAmount}
        >
          {groupLoading ? 'Asignando...' : 'Asignar a Todos'}
        </button>
      </div>
    </>
  );
};

export default AssignTokens;
