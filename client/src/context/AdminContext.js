import React, { createContext, useState, useEffect } from 'react';
import { adminService } from '../services/adminService';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminWalletAddress, setAdminWalletAddress] = useState('');
  const [adminPermissions, setAdminPermissions] = useState({});
  const [adminLoading, setAdminLoading] = useState(true);

  // Verificar si hay una sesión activa al cargar
  useEffect(() => {
    // Detect token changes (even in this tab)
    const token = localStorage.getItem('adminToken');
    console.log('useEffect - Admin token:', token);
    const checkAdminSession = async () => {
      try {
        setAdminLoading(true);
  
        const hasSession = adminService.hasActiveSession();
        console.log('checkAdminSession - Has session:', hasSession);
        if (!hasSession) {
          setIsAdminAuthenticated(false);
          setAdminDetails('', '', '', {});
          return;
        }
  
        const result = await adminService.getProfile();
        console.log('checkAdminSession - Profile result:', result);
        if (!result.success) {
          console.error('Error al verificar sesión de administrador:', result.error);
          setIsAdminAuthenticated(false);
          setAdminDetails('', '', '', {});
          adminService.logout(); // Limpia el localStorage
          return;
        }
  
        // Ensure canCreateElection permission is set correctly
        const permissions = result.admin.permissions || {};
        if (!('canCreateElection' in permissions)) {
          permissions.canCreateElection = true; // Default to true if not set
        }
        if (!('canManageSettings' in permissions)) {
          permissions.canManageSettings = true; // Default to true if not set
        }
        if (!('canViewActivity' in permissions)) {
          permissions.canViewActivity = true; // Default to true if not set
        }
        setAdminDetails(
          result.admin.name,
          result.admin.username,
          result.admin.walletAddress || '',
          permissions
        );
        setIsAdminAuthenticated(true);
        console.log('checkAdminSession - Admin authenticated:', true);
      } catch (error) {
        console.error('Error al verificar sesión de administrador:', error);
        setIsAdminAuthenticated(false);
        setAdminDetails('', '', '', {});
        adminService.logout();
      } finally {
        setAdminLoading(false);
      }
    };
  
    checkAdminSession();
    // Listen for localStorage changes (cross-tab/session sync)
    const handleStorage = (e) => {
      if (e.key === 'adminToken') {
        checkAdminSession();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [localStorage.getItem('adminToken')]);

  // Iniciar sesión de administrador
  const adminLogin = async (username, password) => {
    try {
      const result = await adminService.login(username, password);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      localStorage.setItem('adminToken', result.token);
      setAdminDetails(
        result.admin.name,
        result.admin.username,
        result.admin.walletAddress || '',
        result.admin.permissions || {}
      );
      setIsAdminAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Error en login de administrador:', error);
      return { success: false, error: error.message || 'Error de autenticación' };
    }
  };

  // Cerrar sesión de administrador
  const adminLogout = () => {
    adminService.logout();
    setIsAdminAuthenticated(false);
    setAdminDetails('', '', '', {});
    localStorage.removeItem('adminToken');
  };

  // Función auxiliar para actualizar los detalles del administrador
  const setAdminDetails = (name, username, walletAddress, permissions) => {
    setAdminName(name);
    setAdminUsername(username);
    setAdminWalletAddress(walletAddress);
    setAdminPermissions(permissions);
  };

  return (
    <AdminContext.Provider
      value={{
        isAdminAuthenticated,
        adminName,
        adminUsername,
        adminWalletAddress,
        adminPermissions,
        adminLoading,
        adminLogin,
        adminLogout
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContext;
