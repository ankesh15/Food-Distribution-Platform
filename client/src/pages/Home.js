import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  Stack,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  Favorite as HeartIcon,
  LocationOn as LocationIcon,
  Notifications as NotificationIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { getPublicStats } = useAuth();
  const [stats, setStats] = useState({
    totalDonors: 0,
    totalRecipients: 0,
    totalDonations: 0,
    successRate: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getPublicStats();
        if (data) {
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, [getPublicStats]);

  const features = [
    {
      icon: <RestaurantIcon sx={{ fontSize: 24, color: '#10b981' }} />,
      iconBg: 'rgba(16, 185, 129, 0.1)',
      title: 'Food Donations',
      description: 'Share surplus food with local organizations and reduce environmental waste.',
    },
    {
      icon: <HeartIcon sx={{ fontSize: 24, color: '#f59e0b' }} />,
      iconBg: 'rgba(245, 158, 11, 0.1)',
      title: 'Community Impact',
      description: 'Provide fresh nutrients to shelter groups while promoting local sustainability.',
    },
    {
      icon: <LocationIcon sx={{ fontSize: 24, color: '#10b981' }} />,
      iconBg: 'rgba(16, 185, 129, 0.1)',
      title: 'Proximity Connections',
      description: 'Find local donations and claims easily using geolocation-based tracking.',
    },
    {
      icon: <NotificationIcon sx={{ fontSize: 24, color: '#f59e0b' }} />,
      iconBg: 'rgba(245, 158, 11, 0.1)',
      title: 'Instant Alerts',
      description: 'Receive real-time notifications about nearby donations matching your needs.',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 24, color: '#10b981' }} />,
      iconBg: 'rgba(16, 185, 129, 0.1)',
      title: 'Vetted Security',
      description: 'All organization partners are verified to maintain food handling safety.',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 24, color: '#f59e0b' }} />,
      iconBg: 'rgba(245, 158, 11, 0.1)',
      title: 'Streamlined Logistics',
      description: 'Claim and coordinate food pick-ups smoothly in a few simple clicks.',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          py: { xs: 10, md: 16 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid pattern background */}
        <Box 
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none'
          }}
        />

        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(16, 185, 129, 0.15)', px: 2, py: 0.8, borderRadius: 20, mb: 3 }}>
                <HeartIcon sx={{ color: '#10b981', fontSize: 16 }} />
                <Typography variant="body2" sx={{ color: '#34d399', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Empowering Sustainable Communities
                </Typography>
              </Box>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 900,
                  mb: 3,
                  fontSize: { xs: '2.8rem', md: '4rem' },
                  letterSpacing: '-1.5px',
                  lineHeight: 1.1,
                }}
              >
                Share Food,
                <br />
                <Box component="span" sx={{ color: '#10b981', display: 'inline-block', mt: 1 }}>
                  Save Precious Lives
                </Box>
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  mb: 5,
                  opacity: 0.85,
                  fontWeight: 500,
                  color: '#94a3b8',
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  lineHeight: 1.6,
                  maxWidth: 600
                }}
              >
                Connecting excess commercial food supplies directly with local charities, shelters, and NGOs to reduce waste and eliminate hunger.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  color="primary"
                  onClick={() => navigate('/register')}
                  endIcon={<ArrowIcon />}
                  sx={{
                    py: 1.8,
                    px: 4,
                    fontSize: '0.975rem',
                    fontWeight: 700,
                  }}
                >
                  Join the Network
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/donations')}
                  sx={{
                    py: 1.8,
                    px: 4,
                    fontSize: '0.975rem',
                    fontWeight: 700,
                    color: 'white',
                    borderColor: '#334155',
                    bgcolor: 'rgba(255,255,255,0.02)',
                    '&:hover': {
                      borderColor: '#475569',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  Browse Food Feed
                </Button>
              </Stack>
            </Grid>
            
            {/* Visual Panel Right Side */}
            <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {/* Visual Glassmorphic Widget Container */}
                <Paper
                  sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: 380,
                    background: 'rgba(30, 41, 59, 0.4)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 4,
                    color: 'white',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3.5 }}>
                    <Avatar sx={{ bgcolor: '#10b981', width: 44, height: 44 }}>
                      <RestaurantIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>Eco-Bakery NYC</Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>Donor • 2 mins ago</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, letterSpacing: '-0.3px' }}>
                    15kg Fresh Organic Bread
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                    Freshly baked whole wheat and baguette sourdoughs ready for immediate distribution.
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', pt: 2.5 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Status</Typography>
                      <Chip label="Claimable" size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700, height: 22, fontSize: '0.7rem' }} />
                    </Box>
                    <Button variant="contained" size="small" onClick={() => navigate('/donations')} sx={{ py: 0.8, px: 2, fontSize: '0.8rem' }}>
                      Claim Food
                    </Button>
                  </Box>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Container id="about" maxWidth="lg" sx={{ mt: -6, position: 'relative', zIndex: 2 }}>
        <Grid container spacing={3}>
          {[
            { value: stats.totalDonors, label: 'Active Donors', color: '#10b981', bg: '#ecfdf5' },
            { value: stats.totalDonations, label: 'Donations Completed', color: '#f59e0b', bg: '#fffbeb' },
            { value: stats.totalRecipients, label: 'Partner Recipients', color: '#10b981', bg: '#ecfdf5' },
            { value: `${stats.successRate}%`, label: 'Success Logistics Rate', color: '#ef4444', bg: '#fef2f2' }
          ].map((stat, idx) => (
            <Grid item xs={6} md={3} key={idx}>
              <Card sx={{ bgcolor: 'white', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: stat.color, mb: 1, letterSpacing: '-1px' }}>
                    {stat.value || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    {stat.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Features Section */}
      <Container id="features" maxWidth="lg" sx={{ py: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: '-0.5px' }}>
            Engineered for Modern Efficiency
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto' }}>
            Our streamlined portal minimizes steps between donor disposal lists and recipient food tables.
          </Typography>
        </Box>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card className="glass-card-hover" sx={{ height: '100%', bgcolor: 'white', borderRadius: 3 }}>
                <CardContent sx={{ p: 4 }}>
                  <Box 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      bgcolor: feature.iconBg,
                      mb: 3
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 700 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Container maxWidth="lg">
        <Paper
          sx={{
            py: 8,
            px: { xs: 4, md: 8 },
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            borderRadius: 4,
            textAlign: 'center',
            boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.3)'
          }}
        >
          <Typography variant="h3" sx={{ mb: 2, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Ready to Minimize Waste?
          </Typography>
          <Typography
            variant="h6"
            sx={{ mb: 4, opacity: 0.9, fontWeight: 500, maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}
          >
            Create an account in 60 seconds as a Donor or Recipient and immediately join our sustainability distribution network.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                py: 1.8,
                px: 4,
                fontSize: '0.975rem',
                fontWeight: 700,
                bgcolor: 'white',
                color: '#059669',
                border: 'none',
                '&:hover': {
                  bgcolor: '#f8fafc',
                }
              }}
            >
              Sign Up Now
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/donations')}
              sx={{
                py: 1.8,
                px: 4,
                fontSize: '0.975rem',
                fontWeight: 700,
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.4)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              Browse Claims Feed
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default Home;