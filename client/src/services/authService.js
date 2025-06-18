import { setupWeb3Provider } from '../utils/web3Utils';

/**
 * Servicio de autenticación para manejar la conexión con MetaMask y firma de mensajes
 */
export const authService = {
  /**
   * Conecta con MetaMask y autentica al usuario
   * @param {string} userName - Nombre del usuario (opcional)
   * @param {string} cedula - Cédula de identidad dominicana
   * @returns {Promise<{success: boolean, address: string, token: string, name: string}|{success: boolean, error: string}>}
   */
  connectWallet: async (userName = '', cedula = '') => {
    try {
      console.log('Iniciando conectWallet con:', { userName, cedula });
      
      // Validación más estricta para la cédula
      if (!cedula) {
        console.error('Cédula completamente vacía');
        return { success: false, error: 'Cédula no proporcionada' };
      }
      
      if (typeof cedula !== 'string' && typeof cedula !== 'number') {
        console.error('Tipo de cédula incorrecto:', typeof cedula);
        return { success: false, error: `Cédula con formato incorrecto (${typeof cedula})` };
      }
      
      // Limpiar y verificar la cédula - asegurarse de convertirla a string
      const cedulaStr = String(cedula);
      const cleanCedula = cedulaStr.replace(/[-\s]/g, '');
      console.log('Cédula original:', cedula);
      console.log('Cédula como string:', cedulaStr);
      console.log('Cédula limpia para validación:', cleanCedula, 'Longitud:', cleanCedula.length);
      
      // Verificar que solo contiene números
      if (!/^\d+$/.test(cleanCedula)) {
        console.error('La cédula contiene caracteres no numéricos:', cleanCedula);
        return { success: false, error: 'La cédula solo debe contener números' };
      }
      
      // Verificar formato de cédula dominicana
      const cedulaRegex = /^(012|402)\d{8}$/;
      if (!cedulaRegex.test(cleanCedula)) {
        console.error('Formato de cédula inválido:', cleanCedula);
        return { success: false, error: 'Formato de cédula inválido. Debe comenzar con 012 o 402 y tener 11 dígitos.' };
      }
      
      // Configurar proveedor Web3
      const web3Setup = await setupWeb3Provider();
      if (!web3Setup) {
        console.error('No se pudo configurar Web3');
        return { success: false, error: 'No se pudo conectar a MetaMask' };
      }
      
      const { signer } = web3Setup; // Solo necesitamos el signer para la autenticación
      const address = await signer.getAddress();
      
      if (!address) {
        console.error('No se pudo obtener dirección de billetera');
        return { success: false, error: 'No se pudo obtener la dirección de la billetera' };
      }
      
      console.log('Dirección obtenida:', address);
      
      // Obtener nonce del servidor usando la ruta relativa con el proxy
      console.log('Solicitando nonce al servidor...');
      let nonceData = null;
      
      try {
        console.log('Conectando a /api/auth/nonce mediante proxy');
        
        const nonceResponse = await fetch('/api/auth/nonce', {
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        });
        
        if (!nonceResponse.ok) {
          const errorText = await nonceResponse.text();
          throw new Error(`Error en respuesta del servidor: ${nonceResponse.status} ${errorText}`);
        }
        
        nonceData = await nonceResponse.json();
        console.log('Respuesta del servidor (nonce):', nonceData);
        
        if (!nonceData.success) {
          console.error('Error al obtener nonce:', nonceData);
          return { success: false, error: nonceData.message || 'Error al obtener nonce de autenticación' };
        }
      } catch (error) {
        console.error('Error al solicitar nonce:', error);
        return { 
          success: false, 
          error: `No se pudo conectar al servidor. ${error.message || 'Verifique que el servidor esté en ejecución.'}` 
        };
      }
      
      // Firmar mensaje con nonce
      console.log('Firmando mensaje con nonce:', nonceData.message);
      let signature;
      try {
        signature = await signer.signMessage(nonceData.message);
        console.log('Firma generada:', signature);
        
        if (!signature) {
          console.error('No se generó firma');
          return { success: false, error: 'Error al firmar el mensaje' };
        }
      } catch (signError) {
        console.error('Error al firmar mensaje:', signError);
        return { success: false, error: 'Error al firmar el mensaje: ' + signError.message };
      }
      
      // Verificar firma en el servidor (también usando la ruta relativa)
      console.log('Enviando datos para verificación:', {
        address,
        signature: signature ? 'presente' : 'ausente',
        message: nonceData.message,
        name: userName,
        cedula: cleanCedula
      });
      
      let authData;
      try {
        console.log('Enviando verificación de firma a /api/auth/verify-signature');
        
        const authResponse = await fetch('/api/auth/verify-signature', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            address,
            signature,
            message: nonceData.message,
            name: userName || 'Usuario', // Asegurar que siempre haya un nombre
            cedula: cleanCedula
          })
        });
        
        if (!authResponse.ok) {
          const errorText = await authResponse.text();
          throw new Error(`Error en respuesta del servidor: ${authResponse.status} ${errorText}`);
        }
        
        authData = await authResponse.json();
        console.log('Respuesta de verificación:', authData);
        
        if (!authData.success) {
          console.error('Error en verificación:', authData);
          return { success: false, error: authData.message || 'Error de autenticación' };
        }
      } catch (authError) {
        console.error('Error al enviar verificación:', authError);
        return { success: false, error: 'Error de conexión al verificar firma: ' + authError.message };
      }
      
      // Autenticación exitosa
      return {
        success: true,
        address,
        token: authData.token,
        name: authData.name || 'Usuario'
      };
    } catch (error) {
      console.error('Error en autenticación:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido durante la autenticación'
      };
    }
  },
  
  /**
   * Verifica si hay una sesiu00f3n activa guardada
   * @returns {boolean}
   */
  hasActiveSession: () => {
    const token = localStorage.getItem('auth_token');
    const address = localStorage.getItem('user_address');
    return !!(token && address);
  },
  
  /**
   * Obtiene el token de autenticaciu00f3n actual
   * @returns {string|null}
   */
  getAuthToken: () => {
    return localStorage.getItem('auth_token');
  },
  
  /**
   * Obtiene la direcciu00f3n de billetera guardada
   * @returns {string|null}
   */
  getSavedAddress: () => {
    return localStorage.getItem('user_address');
  },
  
  /**
   * Obtiene el nombre del usuario guardado
   * @returns {string|null}
   */
  getSavedName: () => {
    return localStorage.getItem('user_name');
  },
  
  /**
   * Guarda la informaciu00f3n de sesiu00f3n
   * @param {string} address - Direcciu00f3n de la billetera
   * @param {string} token - Token JWT
   * @param {string} name - Nombre del usuario
   */
  saveSession: (address, token, name) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_address', address);
    localStorage.setItem('user_name', name);
  },
  
  /**
   * Cierra la sesiu00f3n
   */
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_address');
    localStorage.removeItem('user_name');
  },
  
  /**
   * Verifica si la direcciu00f3n proporcionada es un administrador
   * @param {string} address - Direcciu00f3n a verificar
   * @returns {boolean}
   */
  isAdmin: (address) => {
    const adminAddress = process.env.REACT_APP_ADMIN_ADDRESS;
    if (!adminAddress || !address) return false;
    return address.toLowerCase() === adminAddress.toLowerCase();
  }
};
