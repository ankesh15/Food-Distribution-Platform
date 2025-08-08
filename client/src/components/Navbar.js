import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Container,
  Chip,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleClose();
    navigate('/');
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleDashboard = () => {
    handleClose();
    navigate('/dashboard');
  };

  return (
    <AppBar position="static" elevation={0} sx={{ backgroundColor: 'white', color: 'text.primary' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
            <RestaurantIcon sx={{ fontSize: 32, color: 'primary.main', mr: 1 }} />
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{
                textDecoration: 'none',
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '1.5rem',
              }}
            >
              FoodShare
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
            <Button
              component={Link}
              to="/"
              sx={{ color: 'text.primary', fontWeight: 500 }}
            >
              Home
            </Button>
            <Button
              component={Link}
              to="/donations"
              sx={{ color: 'text.primary', fontWeight: 500 }}
            >
              Donations
            </Button>
            {user && (
              <Button
                component={Link}
                to="/create-donation"
                sx={{ color: 'text.primary', fontWeight: 500 }}
              >
                Create Donation
              </Button>
            )}
          </Box>

          {/* Auth Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user ? (
              <>
                {/* User Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={user.role === 'donor' ? 'Donor' : 'Recipient'}
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {user.profile?.firstName} {user.profile?.lastName}
                  </Typography>
                </Box>

                {/* User Menu */}
                <IconButton
                  onClick={handleMenu}
                  sx={{ color: 'primary.main' }}
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 200,
                      borderRadius: 2,
                    },
                  }}
                >
                  <MenuItem onClick={handleDashboard}>
                    <DashboardIcon sx={{ mr: 2 }} />
                    Dashboard
                  </MenuItem>
                  <MenuItem onClick={handleProfile}>
                    <AccountIcon sx={{ mr: 2 }} />
                    Profile
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 2 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  component={Link}
                  to="/login"
                  variant="outlined"
                  color="primary"
                  sx={{ fontWeight: 600 }}
                >
                  Login
                </Button>
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  color="primary"
                  sx={{ fontWeight: 600 }}
                >
                  Register
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar; 