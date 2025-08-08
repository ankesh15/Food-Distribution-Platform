import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  CircularProgress,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import {
  Restaurant as FoodIcon,
  LocationOn as LocationIcon,
  Schedule as TimeIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  CheckCircle as CompletedIcon,
  Pending as PendingIcon,
  Cancel as CancelledIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, getMyDonations, getDonations } = useAuth();
  const [myDonations, setMyDonations] = useState([]);
  const [recentDonations, setRecentDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDonations: 0,
    activeDonations: 0,
    completedDonations: 0,
    totalClaims: 0,
  });
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch user's donations
      const userDonations = await getMyDonations();
      setMyDonations(userDonations || []);

      // Fetch recent donations (for recipients to see available donations)
      const recent = await getDonations({ limit: 5, status: 'available' });
      setRecentDonations(recent?.donations || []);

      // Calculate statistics
      const userStats = calculateStats(userDonations || []);
      setStats(userStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [getMyDonations, getDonations]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const calculateStats = (donations) => {
    if (!donations || !Array.isArray(donations)) {
      return {
        totalDonations: 0,
        activeDonations: 0,
        completedDonations: 0,
        totalClaims: 0,
      };
    }
    
    const total = donations.length;
    const active = donations.filter(d => d.status === 'available').length;
    const completed = donations.filter(d => d.status === 'completed').length;
    const claimed = donations.filter(d => d.status === 'claimed' || d.status === 'picked-up').length;

    return {
      totalDonations: total,
      activeDonations: active,
      completedDonations: completed,
      totalClaims: claimed,
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'success';
      case 'claimed': return 'warning';
      case 'picked-up': return 'info';
      case 'completed': return 'success';
      case 'expired': return 'error';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <ViewIcon />;
      case 'claimed': return <PendingIcon />;
      case 'picked-up': return <TimeIcon />;
      case 'completed': return <CompletedIcon />;
      case 'expired': return <CancelledIcon />;
      case 'cancelled': return <CancelledIcon />;
      default: return <ViewIcon />;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 600, mb: 1 }}>
          Welcome back, {user?.profile?.firstName}!
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {user?.role === 'donor' ? 'Manage your food donations and track their impact.' : 'Browse available donations and help reduce food waste.'}
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {user?.role === 'donor' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/create-donation')}
              sx={{ minWidth: 200 }}
            >
              Create New Donation
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<ViewIcon />}
            onClick={() => navigate('/donations')}
            sx={{ minWidth: 200 }}
          >
            Browse Donations
          </Button>
        </Stack>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FoodIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  Total Donations
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {stats.totalDonations}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ViewIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  Active
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                {stats.activeDonations}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CompletedIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  Completed
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'info.main' }}>
                {stats.completedDonations}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PendingIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  Claimed
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {stats.totalClaims}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* My Donations Section */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                {user?.role === 'donor' ? 'My Donations' : 'My Claims'}
              </Typography>
              
              {!myDonations || myDonations.length === 0 ? (
                <Alert severity="info">
                  {user?.role === 'donor' 
                    ? 'You haven\'t created any donations yet. Start by creating your first donation!'
                    : 'You haven\'t claimed any donations yet. Browse available donations to get started!'
                  }
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {(myDonations || []).slice(0, 5).map((donation) => (
                    <Box key={donation._id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {donation.title}
                        </Typography>
                        <Chip
                          icon={getStatusIcon(donation.status)}
                          label={donation.status}
                          color={getStatusColor(donation.status)}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {donation.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <FoodIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {donation.foodType} • {donation.quantity.amount} {donation.quantity.unit}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {donation.location.address.city}, {donation.location.address.state}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TimeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {new Date(donation.pickupWindow.startTime).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity / Available Donations */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                {user?.role === 'donor' ? 'Recent Activity' : 'Available Donations'}
              </Typography>
              
              {!recentDonations || recentDonations.length === 0 ? (
                <Alert severity="info">
                  No recent activity to show.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {(recentDonations || []).slice(0, 3).map((donation) => (
                    <Box key={donation._id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        {donation.title}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {donation.foodType} • {donation.quantity.amount} {donation.quantity.unit}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {donation.location.address.city}
                        </Typography>
                      </Box>
                      
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/donations/${donation._id}`)}
                        sx={{ mt: 1 }}
                      >
                        View Details
                      </Button>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 