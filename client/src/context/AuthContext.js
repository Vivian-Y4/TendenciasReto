import { createContext } from 'react';

// Create a context with default values
const AuthContext = createContext({
  isAuthenticated: false,
  userAddress: null,
  userName: null,
  isAdmin: false,
  userProvince: null, // provincia del votante
  login: () => {},
  logout: () => {},
  provider: null,
  signer: null,
  contract: null
});

export default AuthContext;