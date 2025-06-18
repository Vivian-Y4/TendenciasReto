import { ethers } from 'ethers';
import { useMemo } from 'react';
import VotingSystem_WithToken from '../contracts/VotingSystem_WithToken.json';
import VotingToken from '../contracts/VotingToken.json';

export const useContracts = (provider) => {
  return useMemo(() => {
    if (!provider) return {};
    
    const signer = provider.getSigner();
    
    return {
      votingContract: new ethers.Contract(
        process.env.REACT_APP_VOTING_ADDRESS,
        VotingSystem_WithToken.abi,
        signer
      ),
      tokenContract: new ethers.Contract(
        process.env.REACT_APP_TOKEN_ADDRESS,
        VotingToken.abi,
        signer
      )
    };
  }, [provider]);
};