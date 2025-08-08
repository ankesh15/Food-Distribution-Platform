import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Paper,
  Stack,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  Favorite as HeartIcon,
  LocationOn as LocationIcon,
  Notifications as NotificationIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <RestaurantIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Food Donations',
      description: 'Share surplus food with local organizations and reduce waste.',
    },
    {
      icon: <HeartIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Community Impact',
      description: 'Help those in need while promoting sustainability.',
    },
    {
      icon: <LocationIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Local Connections',
      description: 'Connect with nearby donors and recipients easily.',
    },
    {
      icon: <NotificationIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Real-time Updates',
      description: 'Get instant notifications about new donations.',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Safe & Secure',
      description: 'Verified users and secure transactions.',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Quick & Easy',
      description: 'Simple process to donate or claim food.',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
          color: 'white',
          py: 12,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                }}
              >
                Share Food,
                <br />
                <Box component="span" sx={{ color: 'secondary.main' }}>
                  Save Lives
                </Box>
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  mb: 4,
                  opacity: 0.9,
                  fontWeight: 400,
                }}
              >
                Connect food donors with local organizations to reduce waste and support communities in need.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  color="secondary"
                  onClick={() => navigate('/register')}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  Get Started
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/donations')}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  Browse Donations
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 400,
                }}
              >
                <RestaurantIcon
                  sx={{
                    fontSize: 200,
                    opacity: 0.3,
                    color: 'white',
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h2"
          align="center"
          sx={{ mb: 6, fontWeight: 600 }}
        >
          Why Choose FoodShare?
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography
                    variant="h5"
                    sx={{ mb: 2, fontWeight: 600 }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6 }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Stats Section */}
      <Box sx={{ backgroundColor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} md={3}>
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'primary.main',
                  color: 'white',
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  500+
                </Typography>
                <Typography variant="h6">Active Donors</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'secondary.main',
                  color: 'white',
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  1000+
                </Typography>
                <Typography variant="h6">Donations Made</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'primary.dark',
                  color: 'white',
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  50+
                </Typography>
                <Typography variant="h6">Partner Organizations</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'secondary.dark',
                  color: 'white',
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  95%
                </Typography>
                <Typography variant="h6">Success Rate</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ mb: 3, fontWeight: 600 }}>
          Ready to Make a Difference?
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
        >
          Join our community of donors and recipients. Every donation counts towards reducing food waste and helping those in need.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button
            variant="contained"
            size="large"
            color="primary"
            onClick={() => navigate('/register')}
            sx={{ py: 2, px: 4, fontSize: '1.1rem', fontWeight: 600 }}
          >
            Join Now
          </Button>
          <Button
            variant="outlined"
            size="large"
            color="primary"
            onClick={() => navigate('/donations')}
            sx={{ py: 2, px: 4, fontSize: '1.1rem', fontWeight: 600 }}
          >
            Browse Donations
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};

export default Home; 