// client/src/components/admin/AssignTokens.js
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { PROVINCES } from '../../../constants/provinces';

const AssignTokens = ({ tokenAddress, onTokensAssigned }) => {
    // State for single assignment
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    // State for group assignment
    const [selectedProvince, setSelectedProvince] = useState('');
    const [groupAmount, setGroupAmount] = useState('');
    const [groupStatus, setGroupStatus] = useState('');
    const [groupLoading, setGroupLoading] = useState(false);
  
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
        if (onTokensAssigned) onTokensAssigned(); // <-- llama al callback
      } catch (err) {
        if (err.reason && err.reason.includes("No autorizado para transferir")) {
          setStatus("Error: La dirección actual de MetaMask no está autorizada para transferir tokens. Por favor, contacte al propietario del contrato.");
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
          let errorMessage = `Error: Fallo al cargar votantes (${selectedProvince}). Estado: ${response.status} (${response.statusText}).`;
          try {
            const errorData = JSON.parse(errorText);
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (e) {
            if (errorText && errorText.length < 100 && !errorText.trim().startsWith('<')) {
              errorMessage += ` Respuesta: ${errorText}`;
            }
          }
          setGroupStatus(errorMessage);
          setGroupLoading(false);
          return;
        }

        const data = await response.json();
        if (!data.success || !data.voters || data.voters.length === 0) {
          setGroupStatus(data.message || `No se encontraron votantes con wallet para la provincia ${selectedProvince} o la respuesta no fue exitosa.`);
          setGroupLoading(false);
          return;
        }

        const votersToProcess = data.voters;
        setGroupStatus(`Votantes encontrados: ${votersToProcess.length}. Iniciando asignación...`);

        if (!window.ethereum) {
          setGroupStatus("Error: Metamask no detectado. No se pueden realizar transferencias.");
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
            // If one transfer fails due to auth, subsequent ones likely will too with current signer.
            // Consider breaking or warning user if it's an auth issue.
            if (err.reason && err.reason.includes("No autorizado para transferir")) {
                setGroupStatus(`Error de autorización: ${specificError} Se detuvo la asignación masiva.`);
                // Optionally break here if desired, or let it try others.
                // break;
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
        setGroupStatus(`Error en asignación grupal: ${error.message || 'Ocurrió un error inesperado.'}`);
      } finally {
        setGroupLoading(false);
      }
    };

    const handleAssignToAllVoters = async () => {
      setGroupStatus('');
      setGroupLoading(true);

      if (!tokenAddress) {
        setGroupStatus("Error: La dirección del contrato de token no está configurada.");
        setGroupLoading(false);
        return;
      }

      if (!groupAmount) {
        setGroupStatus("Error: Por favor, especifique una cantidad.");
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
        const response = await fetch(`${apiUrl}/api/admin/voters/all-wallets`, {
          headers: { "x-auth-token": adminToken }
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Error: Fallo al cargar todos los votantes. Estado: ${response.status} (${response.statusText}).`;
          try {
            const errorData = JSON.parse(errorText);
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (e) {
            if (errorText && errorText.length < 100 && !errorText.trim().startsWith('<')) {
              errorMessage += ` Respuesta: ${errorText}`;
            }
          }
          setGroupStatus(errorMessage);
          setGroupLoading(false);
          return;
        }

        const data = await response.json();
        if (!data.success || !data.voters || data.voters.length === 0) {
          setGroupStatus(data.message || 'No se encontraron votantes con wallet o la respuesta no fue exitosa.');
          setGroupLoading(false);
          return;
        }

        const votersToProcess = data.voters;
        setGroupStatus(`Votantes totales con wallet encontrados: ${votersToProcess.length}. Iniciando asignación...`);

        if (!window.ethereum) {
          setGroupStatus("Error: Metamask no detectado. No se pueden realizar transferencias.");
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
        const parsedTotalAmount = ethers.utils.parseUnits(groupAmount, 18); // Use groupAmount

        for (const voter of votersToProcess) {
          if (!voter.walletAddress) {
            failedAssignments.push({ voter: `${voter.firstName} ${voter.lastName}`, error: "Dirección de wallet no encontrada." });
            failCount++;
            continue;
          }
          try {
            const tx = await contract.transfer(voter.walletAddress, parsedTotalAmount);
            await tx.wait();
            successCount++;
          } catch (err) {
            failCount++;
            const specificError = (err.reason && err.reason.includes("No autorizado para transferir"))
              ? "No autorizado para transferir desde esta cuenta."
              : (err.reason || err.message);
            failedAssignments.push({ voter: `${voter.firstName} ${voter.lastName} (${voter.walletAddress})`, error: specificError });
            if (err.reason && err.reason.includes("No autorizado para transferir")) {
                setGroupStatus(`Error de autorización: ${specificError} Se detuvo la asignación masiva.`);
                // break; // Optionally break
            }
          }
        }

        let summaryMessage = `Asignación a todos los votantes con wallet completada. Éxitos: ${successCount}, Fallos: ${failCount}.`;
        if (failedAssignments.length > 0) {
          summaryMessage += " Detalles de fallos: " + failedAssignments.map(f => `${f.voter}: ${f.error}`).join("; ");
          console.error("Fallos en asignación a todos:", failedAssignments);
        }
        setGroupStatus(summaryMessage);
        // setGroupAmount(''); // Optionally clear amount

      } catch (error) {
        console.error('Error en handleAssignToAllVoters:', error);
        setGroupStatus(`Error en asignación a todos: ${error.message || 'Ocurrió un error inesperado.'}`);
      } finally {
        setGroupLoading(false);
      }
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

      <hr />

      <div className="mb-3">
        <h5>Asignar tokens a un Grupo de Votantes</h5>
        {/* Shared amount input and status display */}
        <div className="d-flex mb-2 align-items-end">
          <div className="flex-grow-1 me-2">
            <label htmlFor="groupAmountInput" className="form-label">Cantidad por Votante</label>
            <input
              id="groupAmountInput"
              type="number"
              className="form-control"
              placeholder="Cantidad de tokens"
              value={groupAmount}
              onChange={e => setGroupAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-2 mb-2">
          <h6 className="mb-2">Por Provincia Específica:</h6>
          <div className="d-flex align-items-center">
            <select
              className="form-select me-2"
              value={selectedProvince}
              onChange={e => setSelectedProvince(e.target.value)}
              style={{width: 'auto', flexGrow: 1}}
            >
              <option value="">Seleccione provincia...</option>
              {PROVINCES.map(province => (
                <option key={province} value={province}>{province}</option>
              ))}
            </select>
            <button
              className="btn btn-secondary"
              onClick={handleGroupAssign}
              disabled={groupLoading || !selectedProvince || !groupAmount}
              style={{whiteSpace: 'nowrap'}}
            >
              {groupLoading && selectedProvince ? "Asignando..." : "Asignar a Provincia"}
            </button>
          </div>
        </div>

        <hr className="my-3"/>

        <div className="mb-2">
          <h6 className="mb-2">A Todos los Votantes con Wallet Registrada:</h6>
          <div className="d-flex">
            <button
              className="btn btn-info"
              onClick={handleAssignToAllVoters}
              disabled={groupLoading || !groupAmount}
            >
              {groupLoading && !selectedProvince ? "Asignando..." : "Asignar a Todos con Wallet"}
            </button>
          </div>
        </div>

        {groupStatus && <div className="mt-2 text-info">{groupStatus}</div>}
      </div>
    );
  };
  

export default AssignTokens;