import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Restaurant as LogoIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearError();

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 70px)', overflow: 'hidden' }}>
      {/* Left Screen: SaaS Info banner (hidden on mobile) */}
      <Box
        sx={{
          flex: 1,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          p: 6,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <Box 
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
          <LogoIcon sx={{ fontSize: 28, color: '#10b981' }} />
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
            FoodShare Console
          </Typography>
        </Box>

        <Box sx={{ position: 'relative', my: 'auto', maxWidth: 460 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 3, letterSpacing: '-1px', lineHeight: 1.2 }}>
            Smarter Logistical Waste Management.
          </Typography>
          <Typography variant="body1" sx={{ color: '#94a3b8', mb: 4, lineHeight: 1.7 }}>
            Sign in to access your dashboard. Manage incoming donations, track claim pickups, monitor local distribution, and report ESG metrics in real-time.
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              'Reduce liability and food storage footprint',
              'Real-time status flow tracking for claims',
              'Detailed monthly sustainability logging'
            ].map((text, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircleIcon sx={{ color: '#10b981', fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 500 }}>{text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography variant="caption" sx={{ color: '#64748b', position: 'relative' }}>
          © {new Date().getFullYear()} FoodShare Inc. All rights reserved.
        </Typography>
      </Box>

      {/* Right Screen: Form Pane */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 6 },
          bgcolor: '#f8fafc',
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 420,
            border: '1px solid #e2e8f0',
            borderRadius: 3,
            boxShadow: '0 4px 30px rgba(15, 23, 42, 0.03)',
            bgcolor: 'white',
          }}
        >
          <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <LogoIcon sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.5px' }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Enter your credentials to access your workspace
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" onClose={clearError} sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                sx={{ mb: 2.5 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#94a3b8' }}>
                        {showPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  mb: 3,
                  position: 'relative',
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ color: 'white', position: 'absolute', left: 20 }} />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  New to FoodShare?{' '}
                  <MuiLink
                    component={Link}
                    to="/register"
                    sx={{ fontWeight: 700, textDecoration: 'none', color: '#10b981', '&:hover': { color: '#059669' } }}
                  >
                    Create a free account
                  </MuiLink>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Login;