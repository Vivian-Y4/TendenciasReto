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
// import VotingSystemWithTokenABI from './abis/VotingSystem_WithToken.json'; // No longer primary
import VotingSystemABI from './abis/VotingSystem.json'; // ZK version, primary for ZK features
import VotingToken from './abis/VotingToken.json'; // Keep if token functionality is still used elsewhere, or remove if not

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
  const [contract, setContract] = useState(null); // This will be the ZK VotingSystem contract
  const [userProvince, setUserProvince] = useState(null);
  const [zkVoterIdentifier, setZkVoterIdentifier] = useState(null); // Use a distinct name for ZK ID
  const [tokenContract, setTokenContract] = useState(null); // Keep if other token interactions exist
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_address');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_province');
    localStorage.removeItem('zk_voter_identifier');
    setIsAuthenticated(false);
    setUserAddress(null);
    setUserName(null);
    setUserProvince(null);
    setZkVoterIdentifier(null);
    setIsAdmin(false);
    setContract(null);
    setTokenContract(null);
    setProvider(null);
    setSigner(null);
    toast.info('Sesión cerrada');
    navigate('/');
  }, [navigate]);

  // Efecto de autenticación y contratos al cargar la aplicación
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const storedAddress = localStorage.getItem('user_address');
      const storedName = localStorage.getItem('user_name');
      const storedProvince = localStorage.getItem('user_province');
      const storedZkId = localStorage.getItem('zk_voter_identifier');

      if (token && storedAddress) {
        setIsAuthenticated(true);
        setUserAddress(storedAddress);
        if (storedName) setUserName(storedName);
        if (storedProvince) setUserProvince(storedProvince);
        if (storedZkId) setZkVoterIdentifier(storedZkId);

        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          setProvider(provider);
          setSigner(signer);

          // Initialize ZK Contract
          const zkVotingSystemAddress = process.env.REACT_APP_ZK_VOTING_SYSTEM_ADDRESS;
          if (zkVotingSystemAddress && VotingSystemABI && VotingSystemABI.abi) {
            const zkContractInstance = new ethers.Contract(zkVotingSystemAddress, VotingSystemABI.abi, signer);
            setContract(zkContractInstance); // Set ZK contract
          } else {
            console.error("ZK Voting System address or ABI not configured!");
            toast.error("Error: ZK Voting System not configured for initial load.");
          }

          // Re-check admin status from token or a dedicated backend call if necessary
          // For now, assuming token might contain this or it's set during login.
          // If isAdmin status is in the token, decode it here.
          // For simplicity, we'll rely on it being set during handleLoginSuccess.
          // If not available, user might need to re-login for admin actions.
          const storedIsAdmin = localStorage.getItem('is_admin'); // Example, if stored
          if (storedIsAdmin === 'true') {
            setIsAdmin(true);
          }


        } catch (error) {
          console.error("Error initializing provider/signer or ZK contract on load:", error);
          toast.error("Error al reconectar. Por favor, inicie sesión de nuevo.");
          // Potentially logout if essential parts fail
          // logout();
        }
      }
      setLoading(false);
    };
    initializeApp();
  }, [logout]); // Added logout to dependency array if it's used inside

  const handleLoginSuccess = useCallback(async (address, web3Provider, web3Signer, cedula, provinceFromIdLogin) => {
    setLoading(true);
    setProvider(web3Provider);
    setSigner(web3Signer);
    setUserAddress(address);

    try {
      // 1. Fetch nonce
      const nonceResponse = await fetch('/api/auth/nonce?address=' + address); // Pass address as query param
      if (!nonceResponse.ok) {
        const errText = await nonceResponse.text();
        throw new Error(`Error fetching nonce: ${errText}`);
      }
      const nonceData = await nonceResponse.json();
      if (!nonceData.success || !nonceData.message) {
        throw new Error(nonceData.message || 'Failed to retrieve nonce.');
      }

      // 2. Sign nonce
      const signature = await web3Signer.signMessage(nonceData.message);

      // 3. Call verify signature
      const verifyResponse = await fetch('/api/auth/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          signature,
          message: nonceData.message,
          name: 'Usuario', // Or derive a name if available (e.g., from IdLogin)
          cedula,
          clientSelectedProvince: provinceFromIdLogin
        }),
      });

      if (!verifyResponse.ok) {
        const errText = await verifyResponse.text();
        throw new Error(`Error verifying signature: ${errText}`);
      }
      const authData = await verifyResponse.json();
      if (!authData.success || !authData.user) {
        throw new Error(authData.message || 'Authentication failed.');
      }

      // 4. Store auth data and set state
      localStorage.setItem('auth_token', authData.token);
      localStorage.setItem('user_address', authData.user.address);
      localStorage.setItem('user_name', authData.user.name);
      localStorage.setItem('user_province', authData.user.province);
      localStorage.setItem('zk_voter_identifier', authData.user.voterIdentifier);
      localStorage.setItem('is_admin', authData.user.isAdmin ? 'true' : 'false');


      setIsAuthenticated(true);
      setUserName(authData.user.name);
      setUserProvince(authData.user.province);
      setZkVoterIdentifier(authData.user.voterIdentifier);
      setIsAdmin(authData.user.isAdmin);

      // 5. Initialize ZK Contract
      const zkVotingSystemAddress = process.env.REACT_APP_ZK_VOTING_SYSTEM_ADDRESS;
      if (zkVotingSystemAddress && VotingSystemABI && VotingSystemABI.abi) {
        const zkContract = new ethers.Contract(zkVotingSystemAddress, VotingSystemABI.abi, web3Signer);
        setContract(zkContract); // This now sets the ZK contract
        console.log("ZK Voting System Contract initialized:", zkContract.address);
      } else {
        console.error("ZK Voting System address or ABI not configured!");
        toast.error("Error: ZK Voting System not configured.");
      }

      // Optional: Initialize token contract if still needed
      if (process.env.REACT_APP_TOKEN_ADDRESS && VotingToken && VotingToken.abi) {
        const tokenContractInstance = new ethers.Contract(
          process.env.REACT_APP_TOKEN_ADDRESS,
          VotingToken.abi,
          web3Signer
        );
        setTokenContract(tokenContractInstance);
      }


      toast.success('Sesión iniciada y wallet conectada');
      navigate('/');

    } catch (error) {
      toast.error(`Error en el proceso de login: ${error.message}`);
      console.error("Error in handleLoginSuccess:", error);
      // Potentially logout or clear partial state
      logout(); // Or a more granular cleanup
    } finally {
      setLoading(false);
    }
  }, [navigate, logout]); // Added logout to dependency array

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

  if (loading && !isAuthenticated) { // Show loading only if not yet authenticated (initial load)
    return <div className="app-loading">Cargando aplicación...</div>;
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      userAddress,
      userName,
      isAdmin,
      // login, // login function removed, handleLoginSuccess is the primary flow
      logout,
      provider,
      signer,
      contract, // This will now be the ZK contract instance
      tokenContract, // Optional token contract
      province: userProvince,
      voterIdentifier: zkVoterIdentifier // Provide the ZK ID
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