import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Donations from './pages/Donations';
import DonationDetail from './pages/DonationDetail';
import CreateDonation from './pages/CreateDonation';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import Requests from './pages/Requests';
import Volunteers from './pages/Volunteers';
import Analytics from './pages/Analytics';
import MapPage from './pages/MapPage';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { TrackingProvider } from './context/TrackingContext';

// Create a modern SaaS theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#10b981', // Emerald Green
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f59e0b', // Amber
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc', // Slate 50
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // Slate 900
      secondary: '#475569', // Slate 600
    },
    divider: '#e2e8f0', // Slate 200
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '2.5rem',
      letterSpacing: '-1px',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '-0.5px',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
      letterSpacing: '-0.5px',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      letterSpacing: '-0.3px',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
      letterSpacing: '-0.2px',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      letterSpacing: '-0.1px',
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.6,
      color: '#334155',
    },
    body2: {
      fontSize: '0.85rem',
      lineHeight: 1.6,
      color: '#475569',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 18px',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: 'none',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
          border: '1px solid #047857',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(180deg, #059669 0%, #047857 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

// A wrapper that handles conditional layout based on auth status
const LayoutWrapper = ({ children, isPublicOnly }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (user && isPublicOnly) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar />
      <Box sx={{ flex: 1 }} className="mesh-bg animate-fade-in">
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <TrackingProvider>
            <Router>
              <Routes>
                {/* Public Marketing Routes */}
                <Route path="/" element={<LayoutWrapper isPublicOnly><Home /></LayoutWrapper>} />
                <Route path="/login" element={<LayoutWrapper isPublicOnly><Login /></LayoutWrapper>} />
                <Route path="/register" element={<LayoutWrapper isPublicOnly><Register /></LayoutWrapper>} />

                {/* Hybrid Browse Routes */}
                <Route path="/donations" element={<LayoutWrapper><Donations /></LayoutWrapper>} />
                <Route path="/donations/:id" element={<LayoutWrapper><DonationDetail /></LayoutWrapper>} />

                {/* Protected Portal Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Dashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/requests"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Requests />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/volunteers"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Volunteers />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Analytics />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/map"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <MapPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/create-donation"
                  element={
                    <ProtectedRoute roles={['donor', 'admin']}>
                      <DashboardLayout>
                        <CreateDonation />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Profile />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={['admin']}>
                      <DashboardLayout>
                        <AdminPanel />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </TrackingProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
