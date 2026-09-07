import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("authUser");

    setToken(storedToken || null);
    setUser(storedUser ? JSON.parse(storedUser) : null);
    setAuthLoading(false);
  }, []);

  const isAuthenticated = Boolean(token);

  const login = (newToken, newUser = null) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);

    if (newUser) {
      localStorage.setItem("authUser", JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authUser");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        user,
        login,
        logout,
        authLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
