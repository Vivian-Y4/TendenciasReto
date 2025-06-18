import { setupWeb3Provider } from '../utils/web3Utils';

/**
 * Servicio para operaciones de administración
 */
export const adminService = {
  /**
   * Login de administrador con usuario y contraseña
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Resultado de la autenticación
   */
  login: async (username, password) => {
    try {
      const response = await fetch(
        `/api/admin/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ username, password }),
          mode: 'cors'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Error de autenticación' };
      }

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.message || 'Error de autenticación' };
      }

      // Guardar la sesión del administrador
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('admin_name', data.admin.name);
      localStorage.setItem('admin_username', data.admin.username);
      localStorage.setItem('admin_permissions', JSON.stringify(data.admin.permissions));

      return {
        success: true,
        admin: data.admin,
        token: data.token
      };
    } catch (error) {
      console.error('Error en login de administrador:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido durante la autenticación'
      };
    }
  },

  /**
   * Login de administrador con MetaMask
   * @returns {Promise<Object>} Resultado de la autenticación
   */
  loginWithMetaMask: async () => {
    try {
      // Configurar proveedor Web3
      const web3Setup = await setupWeb3Provider();
      if (!web3Setup) {
        return { success: false, error: 'No se pudo conectar a MetaMask' };
      }

      const { signer } = web3Setup;
      const address = await signer.getAddress();

      // Obtener nonce del servidor
      const nonceResponse = await fetch(
        `/api/admin/nonce`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const nonceData = await nonceResponse.json();
      if (!nonceData.success) {
        return { 
          success: false, 
          error: nonceData.message || 'Error al obtener nonce de autenticación' 
        };
      }

      // Firmar mensaje con nonce
      const signature = await signer.signMessage(nonceData.message);
      if (!signature) {
        return { success: false, error: 'Error al firmar el mensaje' };
      }

      // Verificar firma en el servidor
      const authResponse = await fetch(
        `/api/admin/verify-signature`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            address,
            signature,
            message: nonceData.message
          })
        }
      );

      const authData = await authResponse.json();
      if (!authData.success) {
        return { success: false, error: authData.message || 'Error de autenticación' };
      }

      // Guardar la sesión del administrador
      localStorage.setItem('adminToken', authData.token);
      localStorage.setItem('admin_name', authData.admin.name);
      localStorage.setItem('admin_username', authData.admin.username);
      localStorage.setItem('admin_permissions', JSON.stringify(authData.admin.permissions));
      localStorage.setItem('admin_wallet', address);

      return {
        success: true,
        admin: authData.admin,
        token: authData.token,
        address
      };
    } catch (error) {
      console.error('Error en login de administrador con MetaMask:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido durante la autenticación'
      };
    }
  },

  /**
   * Verificar si hay una sesión activa de administrador
   * @returns {boolean}
   */
  hasActiveSession: () => {
    return !!localStorage.getItem('adminToken');
  },

  /**
   * Obtener el token de autenticación del administrador
   * @returns {string|null}
   */
  getAuthToken: () => {
    return localStorage.getItem('adminToken');
  },

  /**
   * Obtener el perfil del administrador actual
   * @returns {Promise<Object>} Perfil del administrador
   */
  getProfile: async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        return { success: false, error: 'No hay sesión de administrador' };
      }

      const response = await fetch(
        `/api/admin/profile`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          }
        }
      );

      const data = await response.json();
      if (!data.success) {
        return { success: false, error: data.message || 'Error al obtener perfil' };
      }

      return {
        success: true,
        admin: data.admin
      };
    } catch (error) {
      console.error('Error al obtener perfil de administrador:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido al obtener perfil'
      };
    }
  },

  /**
   * Cerrar sesión de administrador
   */
  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_permissions');
    localStorage.removeItem('admin_wallet');
  }
};