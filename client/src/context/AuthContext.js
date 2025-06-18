import { createContext } from 'react';

// Create a context with default values
const AuthContext = createContext({
  isAuthenticated: false,
  userAddress: null,
  userName: null,
  province: null,
  voterIdentifier: null,
  isAdmin: false,
  login: () => {},
  logout: () => {},
  provider: null,
  signer: null,
  contract: null
});

export default AuthContext;
