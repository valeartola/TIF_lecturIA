import { useState, useEffect } from 'react';
import { getUser, getToken, clearAuth } from './api';
import Login from './views/Login';
import PanelDocente from './views/PanelDocente';
import Estudiante from './views/Estudiante';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar: rehydrar sesión guardada
  useEffect(() => {
    const savedUser = getUser();
    const savedToken = getToken();
    if (savedUser && savedToken) setUser(savedUser);
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => setUser(userData);

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  if (loading) return null;

  if (!user) return <Login onLoginSuccess={handleLoginSuccess} />;

  if (user.rol === 'docente') return <PanelDocente user={user} onLogout={logout} />;

  return <Estudiante user={user} onLogout={logout} />;
}