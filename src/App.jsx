import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProfileSettings from './pages/ProfileSettings';
import Editor from './components/Editor';
import { AuthGuard } from './components/ui/AuthGuard';
import { AdminGuard } from './components/ui/AdminGuard';
import './App.css';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/dashboard" element={
                <AuthGuard>
                  <Dashboard />
                </AuthGuard>
              } />

              <Route path="/admin" element={
                <AuthGuard>
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                </AuthGuard>
              } />

              <Route path="/profile" element={
                <AuthGuard>
                  <ProfileSettings />
                </AuthGuard>
              } />

              <Route path="/editor" element={
                <AuthGuard>
                  <Editor />
                </AuthGuard>
              } />

              <Route path="/guest" element={<Editor />} />
              <Route path="/guest/:flowId" element={<Editor />} />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
