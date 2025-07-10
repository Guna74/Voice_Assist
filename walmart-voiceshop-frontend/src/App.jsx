import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import MainApp from './components/MainApp';
import './styles/auth.css';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <Routes>
            {/* Public: Sign In / Sign Up */}
            <Route path="/auth" element={<AuthPage />} />

            {/* Protected: main application */}
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <MainApp />
                </ProtectedRoute>
              }
            />

            {/* Redirect base and invalid URLs to /auth */}
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}
