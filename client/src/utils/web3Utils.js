import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import Web3 from "web3";

/**
 * Detecta y configura el proveedor de web3 (MetaMask)
 * @returns {Promise<{provider: ethers.providers.Web3Provider, signer: ethers.Signer}|null>}
 */
export const setupWeb3Provider = async () => {
  try {
    // Verificar si MetaMask está instalado
    if (!window.ethereum) {
      console.error('MetaMask no está instalado');
      toast.error('MetaMask no está instalado. Por favor instala MetaMask para usar esta aplicación.');
      return null;
    }

    try {
      // Solicitar conexión a MetaMask
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    } catch (requestError) {
      console.error('Error al solicitar cuentas:', requestError);
      if (requestError.code === 4001) {
        toast.error('Conexión a MetaMask rechazada. Por favor conecta tu billetera para usar esta aplicación.');
      } else {
        toast.error('Error al conectar con MetaMask: ' + (requestError.message || 'Error desconocido'));
      }
      return null;
    }
    
    // Crear provider y signer
    const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();
    
    // Verificar que podemos obtener la dirección para confirmar la conexión
    try {
      const address = await signer.getAddress();
      console.log('Conectado a la dirección:', address);
    } catch (addressError) {
      console.error('Error al obtener dirección:', addressError);
      toast.error('Error al obtener la dirección de la billetera. Por favor intenta de nuevo.');
      return null;
    }
    
    // Configurar listeners para cambios de cuenta y red
    setupEthereumListeners();
    
    return { provider, signer };
  } catch (error) {
    console.error('Error al configurar el proveedor web3:', error);
    toast.error('Error al conectar con MetaMask: ' + (error.message || 'Error desconocido'));
    return null;
  }
};

/**
 * Configura listeners para eventos de MetaMask
 */
export const setupEthereumListeners = () => {
  if (!window.ethereum) return;
  
  // Remover listeners existentes para evitar duplicados
  window.ethereum.removeAllListeners('accountsChanged');
  window.ethereum.removeAllListeners('chainChanged');
  window.ethereum.removeAllListeners('disconnect');
  
  // Evento: cambio de cuenta
  window.ethereum.on('accountsChanged', (accounts) => {
    console.log('Cambio de cuenta detectado:', accounts);
    if (accounts.length === 0) {
      toast.info('Billetera desconectada. Por favor conecta tu billetera para continuar.');
    } else {
      toast.info('Cuenta de billetera cambiada. Refrescando aplicación...');
    }
    // Recargar la aplicación para actualizar el estado
    setTimeout(() => window.location.reload(), 1500);
  });
  
  // Evento: cambio de red
  window.ethereum.on('chainChanged', (chainId) => {
    console.log('Cambio de red detectado:', chainId);
    toast.info('Red blockchain cambiada. Refrescando aplicación...');
    setTimeout(() => window.location.reload(), 1500);
  });
  
  // Evento: desconexión
  window.ethereum.on('disconnect', (error) => {
    console.log('Desconexión detectada:', error);
    toast.warning('Billetera desconectada del sitio.');
  });
};

/**
 * Solicita a MetaMask que cambie a la red especificada
 * @param {string} chainId - ID de la cadena en formato hexadecimal (ej. '0x1' para Ethereum Mainnet)
 * @param {object} networkParams - Parámetros de la red si necesita ser añadida
 */
export const switchNetwork = async (chainId, networkParams = null) => {
  try {
    if (!window.ethereum) throw new Error('MetaMask no está instalado');
    
    // Intentar cambiar a la red
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
    
    return true;
  } catch (error) {
    // Si la red no está configurada en MetaMask (error 4902), intentar añadirla
    if (error.code === 4902 && networkParams) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [networkParams],
        });
        return true;
      } catch (addError) {
        console.error('Error al añadir la red:', addError);
        toast.error('No se pudo añadir la red a MetaMask');
        return false;
      }
    }
    
    console.error('Error al cambiar de red:', error);
    toast.error('No se pudo cambiar de red');
    return false;
  }
};

/**
 * Firma un mensaje con la billetera del usuario
 * @param {string} message - Mensaje a firmar
 * @returns {Promise<string|null>} - Firma o null si ocurre un error
 */
export const signMessage = async (message) => {
  try {
    if (!message) {
      console.error('Mensaje vacío para firmar');
      toast.error('No hay mensaje para firmar');
      return null;
    }
    
    const setup = await setupWeb3Provider();
    if (!setup || !setup.signer) {
      console.error('No se pudo obtener el firmante');
      return null;
    }
    
    const { signer } = setup;
    console.log('Intentando firmar mensaje:', message);
    
    // Asegurarse de que el mensaje sea una cadena
    const messageString = String(message);
    
    const signature = await signer.signMessage(messageString);
    console.log('Firma generada correctamente:', signature);
    return signature;
  } catch (error) {
    console.error('Error al firmar mensaje:', error);
    if (error.code === 4001) {
      toast.error('Firma rechazada por el usuario');
    } else {
      toast.error('Error al firmar el mensaje: ' + (error.message || 'Error desconocido'));
    }
    return null;
  }
};

/**
 * Obtiene la dirección de la billetera conectada
 * @returns {Promise<string|null>} - Dirección de la billetera o null
 */
export const getConnectedAddress = async () => {
  try {
    if (!window.ethereum) {
      console.error('MetaMask no está disponible');
      return null;
    }
    
    // Intentar obtener las cuentas sin solicitar permiso
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    
    if (accounts && accounts.length > 0) {
      console.log('Dirección conectada encontrada:', accounts[0]);
      return accounts[0];
    }
    
    console.log('No se encontró ninguna cuenta conectada');
    return null;
  } catch (error) {
    console.error('Error al obtener dirección conectada:', error);
    return null;
  }
};

/**
 * Verifica si la billetera está conectada
 * @returns {Promise<boolean>}
 */
export const isWalletConnected = async () => {
  const address = await getConnectedAddress();
  return !!address;
};

/**
 * Formatea una dirección de billetera para mostrarla
 * @param {string} address - Dirección completa
 * @param {number} startLength - Longitud de caracteres al inicio
 * @param {number} endLength - Longitud de caracteres al final
 * @returns {string} - Dirección formateada
 */
export const formatAddress = (address, startLength = 6, endLength = 4) => {
  if (!address) return '';
  return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
};


/**
 * Devuelve una instancia de Web3 conectada a la wallet del usuario (MetaMask)
 */
export const getWeb3 = () => {
  if (window.ethereum) {
    return new Web3(window.ethereum);
  } else if (window.web3) {
    return new Web3(window.web3.currentProvider);
  } else {
    throw new Error("No se detectó una wallet compatible con Ethereum");
  }
};