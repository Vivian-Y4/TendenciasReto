import React, { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';

const TokenBalance = ({ tokenContract }) => {
  const { account } = useWeb3React();
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (tokenContract && account) {
        try {
          const balance = await tokenContract.balanceOf(account);
          setBalance(ethers.utils.formatEther(balance));
        } catch (error) {
          console.error('Error fetching token balance:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchBalance();
  }, [tokenContract, account]);

  if (loading) return <div>Cargando saldo...</div>;

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Tus Tokens</h3>
      <p className="text-2xl font-bold">{balance} VOTE</p>
      <p className="text-sm text-gray-500">1 token = 1 voto</p>
    </div>
  );
};

export default TokenBalance;