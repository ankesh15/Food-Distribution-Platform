import React from 'react';
import { Box, Container, Typography, Link as MuiLink, Stack, Divider } from '@mui/material';
import { Restaurant as LogoIcon, Favorite as HeartIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <Box
      component="footer"
      id="contact"
      sx={{
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        py: 6,
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'rgba(255, 255, 255, 0.05)',
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          spacing={4}
        >
          {/* Brand */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LogoIcon sx={{ fontSize: 26, mr: 1, color: '#10b981' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
                FoodShare
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 300, fontSize: '0.85rem' }}>
              A modern, decentralized food sustainability catalog. We connect local restaurants and grocers with shelter groups to fight hunger and reduce food waste.
            </Typography>
          </Box>

          {/* Quick Links */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white', mb: 2, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.75rem' }}>
              Navigation
            </Typography>
            <Stack spacing={1}>
              <MuiLink component={Link} to="/" color="inherit" underline="none" sx={{ fontSize: '0.85rem', '&:hover': { color: '#10b981' } }}>
                Home
              </MuiLink>
              <MuiLink component={Link} to="/donations" color="inherit" underline="none" sx={{ fontSize: '0.85rem', '&:hover': { color: '#10b981' } }}>
                Browse Food
              </MuiLink>
              <MuiLink component={Link} to="/register" color="inherit" underline="none" sx={{ fontSize: '0.85rem', '&:hover': { color: '#10b981' } }}>
                Join Us
              </MuiLink>
            </Stack>
          </Box>

          {/* Resources */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white', mb: 2, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.75rem' }}>
              Portal Console
            </Typography>
            <Stack spacing={1}>
              <MuiLink component={Link} to="/dashboard" color="inherit" underline="none" sx={{ fontSize: '0.85rem', '&:hover': { color: '#10b981' } }}>
                Dashboard
              </MuiLink>
              <MuiLink component={Link} to="/create-donation" color="inherit" underline="none" sx={{ fontSize: '0.85rem', '&:hover': { color: '#10b981' } }}>
                Donate Food
              </MuiLink>
              <MuiLink component={Link} to="/profile" color="inherit" underline="none" sx={{ fontSize: '0.85rem', '&:hover': { color: '#10b981' } }}>
                My Settings
              </MuiLink>
            </Stack>
          </Box>
        </Stack>

        <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.06)' }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#64748b' }}>
            © {new Date().getFullYear()} FoodShare. All rights reserved.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center' }}>
            Built with <HeartIcon sx={{ fontSize: 13, mx: 0.5, color: '#ef4444' }} /> for social and environmental impact.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;
