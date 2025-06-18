import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';

const VoteForm = ({ electionId, candidates, contract, tokenContract }) => {
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const { account } = useWeb3React();

  const handleVote = async () => {
    if (!selectedCandidate) {
      toast.error('Por favor selecciona un candidato');
      return;
    }

    try {
      setIsVoting(true);
      
      // Primero aprobar el gasto de tokens
      setIsApproving(true);
      const txApprove = await tokenContract.approve(
        contract.address,
        ethers.utils.parseEther('1')
      );
      await txApprove.wait();
      setIsApproving(false);

      // Luego emitir el voto
      const txVote = await contract.castVote(
        electionId,
        selectedCandidate
      );
      await txVote.wait();
      
      toast.success('¡Voto registrado exitosamente!');
    } catch (error) {
      console.error('Error al votar:', error);
      toast.error('Error al registrar el voto');
    } finally {
      setIsVoting(false);
      setIsApproving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Emitir Voto</h2>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Selecciona un candidato:</label>
        <select
          className="w-full p-2 border rounded"
          value={selectedCandidate}
          onChange={(e) => setSelectedCandidate(e.target.value)}
        >
          <option value="">-- Selecciona --</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleVote}
        disabled={isApproving || isVoting}
        className={`w-full py-2 px-4 rounded text-white font-bold ${
          isApproving || isVoting
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isApproving
          ? 'Aprobando tokens...'
          : isVoting
          ? 'Registrando voto...'
          : 'Votar'}
      </button>
    </div>
  );
};

export default VoteForm;