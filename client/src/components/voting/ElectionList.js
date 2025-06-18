import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const ElectionList = ({ contract }) => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchElections = async () => {
      if (contract) {
        try {
          const count = await contract.getElectionsCount();
          const electionsArray = [];
          
          for (let i = 0; i < count; i++) {
            const election = await contract.elections(i);
            electionsArray.push({
              id: i,
              title: election.title,
              isActive: election.isActive,
              candidateCount: election.candidateCount.toNumber(),
              totalVotes: election.totalVotes.toNumber(),
            });
          }
          
          setElections(electionsArray);
        } catch (error) {
          console.error('Error fetching elections:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchElections();
  }, [contract]);

  if (loading) return <div>Cargando elecciones...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Elecciones Disponibles</h2>
      
      {elections.length === 0 ? (
        <p>No hay elecciones disponibles en este momento.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {elections.map((election) => (
            <div
              key={election.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold">{election.title}</h3>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>
                  {election.candidateCount} Candidatos
                </span>
                <span
                  className={`px-2 py-1 rounded ${
                    election.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {election.isActive ? 'Activa' : 'Finalizada'}
                </span>
              </div>
              <div className="mt-4">
                <span className="text-sm text-gray-500">
                  {election.totalVotes} votos emitidos
                </span>
              </div>
              <button
                onClick={() => {/* Navegar a la página de la elección */}}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Ver detalles
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ElectionList;