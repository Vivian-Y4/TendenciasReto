import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';

// Import components
import Navbar from './components/layout/Navbar';
import Home from './components/pages/Home';
import About from './components/pages/About';
import Help from './components/pages/Help';
import ElectionList from './components/elections/ElectionList';
import ElectionDetails from './components/elections/ElectionDetails';
import CreateElection from './components/admin/CreateElection';
import EditElection from './components/admin/EditElection';
import ElectionDetailAdmin from './components/admin/ElectionDetailAdmin';
import AdminDashboard from './components/admin/AdminDashboard';
import ManageVoters from './components/admin/ManageVoters';
import ElectionStatistics from './components/admin/ElectionStatistics';
import Login from './components/auth/Login';
import IdLogin from './components/auth/IdLogin';
import ConnectWallet from './components/auth/ConnectWallet';
import AdminLogin from './components/admin/AdminLogin';
import AdminRoute from './components/routing/AdminRoute';
import VotingInterface from './components/voting/VotingInterface';
import ElectionResults from './components/elections/ElectionResults';
import Footer from './components/layout/Footer';
import ManageCandidates from './components/admin/ManageCandidates';
import Configuration from './components/admin/Configuration';
import Activity from './components/admin/Activity';

// Import context
import AuthContext from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';

// Import contracts ABI
import VotingSystemWithTokenABI from './abis/VotingSystem_WithToken.json'; // Use this for the main contract
// import VotingSystemABI from './abis/VotingSystem.json'; // ZK version, not the primary for general app use
import VotingToken from './abis/VotingToken.json'; // Keep if token functionality is still used elsewhere

// Import styles
import './App.css';

// Utilidades
const getContractInstance = (address, abi, signer) => {
  return new ethers.Contract(address, abi, signer);
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [userName, setUserName] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null); // This will be the main VotingSystem contract
  const [voterIdentifier, setVoterIdentifier] = useState(null); // Added for voterIdentifier
  const [tokenContract, setTokenContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_address');
    localStorage.removeItem('user_name');
    setIsAuthenticated(false);
    setUserAddress(null);
    setUserName(null);
    setIsAdmin(false);
    setContract(null);
    setTokenContract(null);
    setProvider(null);
    setSigner(null);
    setVoterIdentifier(null); // Clear voterIdentifier on logout
    toast.info('Sesión cerrada');
    navigate('/');
  }, [navigate]);

  // Mock function to get voterIdentifier (replace with backend call)
  const getMockVoterIdentifierForUser = async (address) => {
    if (!address) return null;
    console.log(`[AuthMock] Attempting to fetch voterIdentifier for address: ${address}`);
    // This would be a call to a backend endpoint like:
    // const response = await fetch('/api/users/me/voter-identifier');
    // const data = await response.json(); return data.voterIdentifier;
    const mockMapping = {
      "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // For Hardhat account 0
      "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234", // For Hardhat account 1
      // Add more mappings as needed for testing
    };
    const identifier = mockMapping[address.toLowerCase()];
    if (identifier) {
      console.log(`[AuthMock] Found mock voterIdentifier: ${identifier} for address: ${address}`);
      return identifier;
    }
    console.warn(`[AuthMock] No mock voterIdentifier found for address: ${address}. Voting may not be possible.`);
    return null;
  };

  // Login manual (si usas login por JWT además de wallet)
  const login = useCallback((address, token, name) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_address', address);
    localStorage.setItem('user_name', name || 'Usuario');
    setIsAuthenticated(true);
    setUserAddress(address);
    setUserName(name || 'Usuario');
    // Verifica admin
    const adminAddress = process.env.REACT_APP_ADMIN_ADDRESS;
    if (adminAddress && address.toLowerCase() === adminAddress.toLowerCase()) {
      setIsAdmin(true);
    }
  }, []);

  // Efecto de autenticación y contratos
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const storedAddress = localStorage.getItem('user_address');
    const storedName = localStorage.getItem('user_name');

    if (token && storedAddress) {
      setIsAuthenticated(true);
      setUserAddress(storedAddress);
      setUserName(storedName || 'Usuario');
      const adminAddress = process.env.REACT_APP_ADMIN_ADDRESS;
      if (adminAddress && storedAddress.toLowerCase() === adminAddress.toLowerCase()) {
        setIsAdmin(true);
      }
    }
  }, []);
  const handleLoginSuccess = useCallback(async (address, provider, signer, cedula, province) => {
    if (!provider || !signer) {
      toast.error("Error: El proveedor de Web3 o el firmante no están disponibles.");
      return;
    }
    setLoading(true);

    try {
      // Verificar la red de MetaMask
      const network = await provider.getNetwork();
      // El ID de la red para la red de pruebas Sepolia es 11155111.
      const expectedNetworkId = 11155111;

      if (network.chainId !== expectedNetworkId) {
        toast.error(`Por favor, conecta tu MetaMask a la red correcta. Se esperaba la red ${expectedNetworkId} pero estás en la ${network.chainId}.`);
        setLoading(false);
        return;
      }

      setProvider(provider);
      setSigner(signer);
      setUserAddress(address);
      setUserName(address.substring(0, 6) + '...' + address.substring(address.length - 4));

      // Instanciar contratos
      const votingContract = new ethers.Contract(
        process.env.REACT_APP_VOTING_ADDRESS,
        VotingSystemWithTokenABI.abi,
        signer
      );
      setContract(votingContract);

      if (address) {
        setVoterIdentifier(address);
        console.log("Voter Identifier set in context (using user address):", address);
      } else {
        toast.warn("No se pudo obtener la dirección del usuario para el identificador de votante.");
        setVoterIdentifier(null);
      }

      if (process.env.REACT_APP_TOKEN_ADDRESS && VotingToken && VotingToken.abi) {
        const tokenContractInstance = new ethers.Contract(
          process.env.REACT_APP_TOKEN_ADDRESS,
          VotingToken.abi,
          signer
        );
        setTokenContract(tokenContractInstance);
      } else {
        console.warn("Token contract address or ABI not fully configured if it's optional.");
      }

      const contractAdmin = await votingContract.admin();
      setIsAdmin(address.toLowerCase() === contractAdmin.toLowerCase());
      setIsAuthenticated(true);
      toast.success('Sesión iniciada y wallet conectada');
      navigate('/');

    } catch (error) {
      toast.error(`Error cargando contratos o datos iniciales: ${error.message}`);
      console.error("Error in handleLoginSuccess:", error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const connectWalletForAdmin = useCallback(async (expectedAdminAddress) => {
    if (!expectedAdminAddress) {
      toast.error("No se ha proporcionado una dirección de administrador para la verificación.");
      return null;
    }
    setLoading(true);
    try {
      if (!window.ethereum) {
        toast.error("MetaMask no está instalado.");
        setLoading(false);
        return null;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const connectedAddress = accounts[0];

      // Verificación: la cuenta conectada debe ser la del administrador
      if (expectedAdminAddress && connectedAddress.toLowerCase() !== expectedAdminAddress.toLowerCase()) {
        toast.error(`La billetera conectada (${connectedAddress.substring(0, 6)}...) no es la billetera del administrador. Por favor, seleccione la cuenta correcta en MetaMask.`);
        setLoading(false);
        return null;
      }

      const signer = provider.getSigner();
      
      const network = await provider.getNetwork();
      const SEPOLIA_CHAIN_ID = 11155111;

      if (network.chainId !== SEPOLIA_CHAIN_ID) {
        toast.error("Por favor, conéctate a la red de Sepolia en MetaMask.");
        setLoading(false);
        return null;
      }
      
      const votingSystemContract = new ethers.Contract(
        process.env.REACT_APP_VOTING_ADDRESS,
        VotingSystemWithTokenABI.abi,
        signer
      );
      
      setContract(votingSystemContract);
      setSigner(signer);
      setProvider(provider);
      setIsAuthenticated(true); 
      setUserAddress(connectedAddress);
      
      toast.success("Billetera de administrador conectada exitosamente.");
      return votingSystemContract; // Devolver la instancia del contrato
    } catch (error) {
      console.error("Error conectando la billetera para el admin:", error);
      toast.error("Error al conectar la billetera.");
      return null; // Devolver null en caso de error
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Rutas protegidas
  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!isAuthenticated) {
      return <Navigate to="/id-login" />;
    }
    if (adminOnly && !isAdmin) {
      return <Navigate to="/" />;
    }
    return children;
  };

  if (loading) {
    return <div className="app-loading">Cargando conexión blockchain...</div>;
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      userAddress,
      userName,
      isAdmin,
      login,
      logout,
      connectWalletForAdmin,
      provider,
      signer,
      contract, // Main VotingSystem contract
      tokenContract,
      voterIdentifier // Expose voterIdentifier in context
    }}>
      <AdminProvider>
        <div className="app">
          <Navbar />
          <main className="container my-4">
            <Routes>
              {/* Rutas públicas */}
              <Route path="/" element={<Home />} />
              <Route path="/id-login" element={<IdLogin onLoginSuccess={handleLoginSuccess} />} />
              <Route path="/connect-wallet" element={<ConnectWallet />} />
              <Route path="/login" element={<Login />} />
              <Route path="/elections" element={<ElectionList />} />
              <Route path="/elections/:id" element={<ElectionDetails />} />
              <Route path="/elections/:id/results" element={<ElectionResults />} />
              <Route path="/about" element={<About />} />
              <Route path="/help" element={<Help />} />
              {/* Ruta protegida para votantes */}
              <Route path="/elections/:id/vote" element={
                <ProtectedRoute>
                  <VotingInterface />
                </ProtectedRoute>
              } />
              {/* Rutas de administrador */}
              <Route path="/admin/voters" element={<AdminRoute element={<ManageVoters />} />} />
              <Route path="/admin/candidates" element={<AdminRoute element={<ManageCandidates />} />} />
              <Route path="/admin/create-election" element={<AdminRoute element={<CreateElection />} />} />
              <Route path="/admin/edit-election/:electionId" element={<AdminRoute element={<EditElection />} />} />
              <Route path="/admin/elections/:electionId" element={<AdminRoute element={<ElectionDetailAdmin />} />} />
              <Route path="/admin/election/:electionId/voters" element={<AdminRoute element={<ManageVoters />} />} />
              <Route path="/admin/election/:electionId/statistics" element={<AdminRoute element={<ElectionStatistics />} />} />
              <Route path="/admin/configuration" element={<AdminRoute element={<Configuration />} />} />
              <Route path="/admin/activity" element={<AdminRoute element={<Activity />} />} />
              <Route path="/admin" element={<AdminRoute element={<AdminDashboard />} />} />
              <Route path="/admin/dashboard" element={<AdminRoute element={<AdminDashboard />} />} />
              <Route path="/admin-login" element={<AdminLogin />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AdminProvider>
    </AuthContext.Provider>
  );
}

export default App;