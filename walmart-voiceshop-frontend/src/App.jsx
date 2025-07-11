import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
// Remove AppProvider import since it's already in index.jsx
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import MainApp from './components/MainApp';
import './styles/auth.css';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        {/* Remove AppProvider wrapper from here */}
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
