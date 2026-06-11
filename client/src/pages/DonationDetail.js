import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Stack,
  Alert,
  Skeleton,
  Divider,
  Paper,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  LocationOn as LocationIcon,
  Schedule as TimeIcon,
  Person as PersonIcon,
  Warning as UrgentIcon,
  CheckCircle as CompletedIcon,
  LocalShipping as PickupIcon,
  Assignment as ClaimIcon,
} from '@mui/icons-material';

const DonationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getDonationById, claimDonation, pickupDonation, completeDonation, user } = useAuth();
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDonation();
    // eslint-disable-next-line
  }, [id]);

  const fetchDonation = async () => {
    setLoading(true);
    const data = await getDonationById(id);
    if (data && data.donation) {
      setDonation(data.donation);
    } else {
      setError('Donation not found');
    }
    setLoading(false);
  };

  const handleAction = async (action, actionFn) => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    const result = await actionFn(id);
    if (result.success) {
      setSuccess(`Donation ${action} successfully!`);
      fetchDonation();
    } else {
      setError(result.error);
    }
    setActionLoading(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'success',
      claimed: 'warning',
      'picked-up': 'info',
      completed: 'success',
      expired: 'error',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <Skeleton variant="text" width="20%" height={32} sx={{ mb: 3 }} />
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" width="100%" height={350} sx={{ borderRadius: 3 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 3, mb: 3 }} />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 3 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (!donation) {
    return (
      <Box sx={{ width: '100%' }}>
        <Alert severity="error" variant="outlined" sx={{ mb: 3, borderRadius: 2.5 }}>
          Donation not found. It may have been deleted by the administrator or expired.
        </Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/donations')}>
          Back to Live Feed
        </Button>
      </Box>
    );
  }

  const isRecipient = user && user.role === 'recipient';
  const isClaimedByMe = donation.claimedBy?.recipient?._id === user?._id;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Back to feed navigation */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/donations')}
          sx={{ 
            fontWeight: 700, 
            color: 'text.secondary',
            '&:hover': { color: 'primary.main', bgcolor: 'rgba(16,185,129,0.05)' } 
          }}
        >
          Back to Live Feed
        </Button>
      </Box>

      {error && <Alert severity="error" variant="outlined" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

      <Grid container spacing={4}>
        {/* Main Details Panel */}
        <Grid item xs={12} md={8}>
          <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5, letterSpacing: '-0.5px', lineHeight: 1.3 }}>
                    {donation.title}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                      label={donation.status.toUpperCase()}
                      color={getStatusColor(donation.status)}
                      size="small"
                      sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }}
                    />
                    <Chip label={donation.foodType.toUpperCase()} variant="outlined" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }} />
                    {donation.isUrgent && (
                      <Chip icon={<UrgentIcon sx={{ fontSize: '12px !important' }} />} label="URGENT" color="error" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 22 }} />
                    )}
                  </Stack>
                </Box>
              </Box>

              <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.8, fontSize: '0.95rem', color: 'text.primary' }}>
                {donation.description}
              </Typography>

              <Divider sx={{ my: 4 }} />

              {/* Specific Food details */}
              <Grid container spacing={3.5}>
                <Grid item xs={6} sm={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Available Quantity
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                    {donation.quantity?.amount} {donation.quantity?.unit}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Preparation Time
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
                    {new Date(donation.preparationDate).toLocaleDateString()}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Expiry Limit
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 700, 
                      mt: 0.5, 
                      color: new Date(donation.expiryDate) < new Date() ? '#ef4444' : 'text.primary' 
                    }}
                  >
                    {new Date(donation.expiryDate).toLocaleDateString()}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Food Class
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
                    {donation.foodType?.charAt(0).toUpperCase() + donation.foodType?.slice(1)}
                  </Typography>
                </Grid>

                {donation.allergens && donation.allergens.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 1 }}>
                      Allergen Warnings
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {donation.allergens.map(allergen => (
                        <Chip key={allergen} label={allergen.toUpperCase()} size="small" color="warning" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                      ))}
                    </Stack>
                  </Grid>
                )}

                {donation.specialInstructions && (
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 0.5 }}>
                      Handling Instructions
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.secondary' }}>
                      {donation.specialInstructions}
                    </Typography>
                  </Grid>
                )}

                {donation.tags && donation.tags.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 1 }}>
                      Keywords
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {donation.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      ))}
                    </Stack>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar Logistics */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            
            {/* 1. Pickup Window */}
            <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TimeIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.3px' }}>
                    Pickup Schedule
                  </Typography>
                </Box>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Start</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.2 }}>
                    {new Date(donation.pickupWindow?.startTime).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>End</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.2 }}>
                    {new Date(donation.pickupWindow?.endTime).toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* 2. Coordinates Location */}
            <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocationIcon sx={{ color: '#10b981', fontSize: 20 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.3px' }}>
                    Location Coordinates
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {donation.location?.address?.street}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.2 }}>
                  {donation.location?.address?.city}, {donation.location?.address?.state} {donation.location?.address?.zipCode}
                </Typography>
                {donation.location?.instructions && (
                  <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderColor: '#f1f5f9' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5, textTransform: 'uppercase' }}>
                      Instructions
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', lineHeight: 1.5 }}>
                      {donation.location.instructions}
                    </Typography>
                  </Paper>
                )}
              </CardContent>
            </Card>

            {/* 3. Donor details */}
            {donation.donor && (
              <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PersonIcon sx={{ color: '#64748b', fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.3px' }}>
                      Vetted Donor
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {donation.donor.profile?.firstName} {donation.donor.profile?.lastName}
                  </Typography>
                  {donation.donor.profile?.organization && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.2 }}>
                      {donation.donor.profile.organization}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 4. Claim logs details */}
            {donation.claimedBy?.recipient && (
              <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ClaimIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.3px' }}>
                      Claim Logistics
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {donation.claimedBy.recipient.profile?.firstName} {donation.claimedBy.recipient.profile?.lastName}
                  </Typography>
                  {donation.claimedBy.recipient.profile?.organization && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.2 }}>
                      {donation.claimedBy.recipient.profile.organization}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 1.5 }}>
                    Claimed: {new Date(donation.claimedBy.claimedAt).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* 5. Control buttons actions */}
            {user && (
              <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, letterSpacing: '-0.3px' }}>
                    Logs Actions
                  </Typography>
                  <Stack spacing={1.5}>
                    {isRecipient && donation.status === 'available' && (
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        startIcon={<ClaimIcon />}
                        onClick={() => handleAction('claimed', claimDonation)}
                        disabled={actionLoading}
                        sx={{ py: 1.2, fontWeight: 700 }}
                      >
                        {actionLoading ? 'Processing...' : 'Claim Listing'}
                      </Button>
                    )}
                    {isRecipient && isClaimedByMe && donation.status === 'claimed' && (
                      <Button
                        variant="contained"
                        color="info"
                        fullWidth
                        startIcon={<PickupIcon />}
                        onClick={() => handleAction('picked up', pickupDonation)}
                        disabled={actionLoading}
                        sx={{ py: 1.2, fontWeight: 700 }}
                      >
                        {actionLoading ? 'Processing...' : 'Mark Picked Up'}
                      </Button>
                    )}
                    {isRecipient && isClaimedByMe && donation.status === 'picked-up' && (
                      <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        startIcon={<CompletedIcon />}
                        onClick={() => handleAction('completed', completeDonation)}
                        disabled={actionLoading}
                        sx={{ py: 1.2, fontWeight: 700 }}
                      >
                        {actionLoading ? 'Processing...' : 'Mark Completed'}
                      </Button>
                    )}
                    {!user && donation.status === 'available' && (
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => navigate('/login')}
                        sx={{ py: 1.2, fontWeight: 700 }}
                      >
                        Login to Claim
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DonationDetail;
