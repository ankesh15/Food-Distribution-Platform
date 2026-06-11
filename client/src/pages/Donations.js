import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  TextField,
  InputAdornment,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Fastfood as FoodIcon,
  LocationOn as LocationIcon,
  Schedule as TimeIcon,
  Warning as UrgentIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Donations = () => {
  const { getDonations, user, claimDonation } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [claimingId, setClaimingId] = useState(null);
  const navigate = useNavigate();

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filters = { page, limit: 9 };
    if (search.trim()) filters.search = search.trim();
    if (foodTypeFilter) filters.foodType = foodTypeFilter;
    if (statusFilter) filters.status = statusFilter;

    const data = await getDonations(filters);
    setDonations(data.donations || []);
    setTotalPages(data.totalPages || 1);
    setTotal(data.total || 0);
    setLoading(false);
  }, [getDonations, page, search, foodTypeFilter, statusFilter]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDonations();
  };

  const handleClaim = async (id) => {
    setError(null);
    setClaimingId(id);
    const result = await claimDonation(id);
    if (result.success) {
      fetchDonations();
    } else {
      setError(result.error);
    }
    setClaimingId(null);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const foodTypes = ['fresh', 'canned', 'frozen', 'baked', 'dairy', 'produce', 'meat', 'pantry', 'other'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'success';
      case 'claimed': return 'warning';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Title Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.5px' }}>
          Browse Live Food Feed
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          {total} donation listing{total !== 1 ? 's' : ''} currently active
        </Typography>
      </Box>

      {/* Modern Filter Card */}
      <Card sx={{ mb: 4, p: 2.5, border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ flex: 1, display: 'flex', gap: 1.5, width: '100%' }}>
            <TextField
              placeholder="Search keyword, city, bakery name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              }}
              size="small"
              fullWidth
            />
            <Button type="submit" variant="contained" size="medium" sx={{ px: 3 }}>
              Search
            </Button>
          </Box>
          <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <FormControl size="small" sx={{ minWidth: 150, flexGrow: 1 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={foodTypeFilter}
                onChange={(e) => { setFoodTypeFilter(e.target.value); setPage(1); }}
                label="Category"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Categories</MenuItem>
                {foodTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130, flexGrow: 1 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                label="Status"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Listings</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="claimed">Claimed</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Card>

      {/* Error display */}
      {error && (
        <Alert severity="error" variant="outlined" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Content Feed */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card sx={{ border: '1px solid #e2e8f0', p: 1 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Skeleton variant="text" width="80%" height={28} sx={{ mb: 1.5 }} />
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="60%" height={20} sx={{ mb: 3 }} />
                  <Stack direction="row" spacing={1} sx={{ mb: 3.5 }}>
                    <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rectangular" width={80} height={20} sx={{ borderRadius: 1 }} />
                  </Stack>
                  <Skeleton variant="text" width="40%" height={16} />
                  <Skeleton variant="text" width="50%" height={16} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : donations.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
          <FoodIcon sx={{ fontSize: 56, color: '#94a3b8', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.3px' }}>
            No Donations Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {search || foodTypeFilter || statusFilter
              ? 'Try widening your filters or resetting the keyword search query.'
              : 'Our food donors have completed all logs. Check back in a few minutes!'}
          </Typography>
        </Card>
      ) : (
        <>
          <Grid container spacing={3}>
            {donations.map((donation) => (
              <Grid item xs={12} sm={6} md={4} key={donation._id}>
                <Card 
                  className="glass-card-hover"
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    bgcolor: 'white',
                    borderRadius: 3,
                    border: donation.isUrgent ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                    position: 'relative'
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.3px', flex: 1, lineHeight: 1.4 }}>
                        {donation.title}
                      </Typography>
                      {donation.isUrgent && (
                        <Chip
                          icon={<UrgentIcon sx={{ fontSize: '12px !important' }} />}
                          label="URGENT"
                          color="error"
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                        />
                      )}
                    </Box>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, fontSize: '0.85rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {donation.description}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }} useFlexGap>
                      <Chip label={donation.foodType.toUpperCase()} color="primary" size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }} />
                      <Chip
                        label={`${donation.quantity?.amount || 0} ${donation.quantity?.unit || 'items'}`}
                        color="secondary"
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }}
                      />
                      <Chip
                        label={donation.status.toUpperCase()}
                        color={getStatusColor(donation.status)}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }}
                      />
                    </Stack>

                    <Stack spacing={1} sx={{ borderTop: '1px solid #f1f5f9', pt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <LocationIcon sx={{ fontSize: 15, color: '#64748b' }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', fontWeight: 500 }}>
                          {donation.location?.address?.city || 'NYC'}, {donation.location?.address?.state || 'NY'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <TimeIcon sx={{ fontSize: 15, color: '#64748b' }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', fontWeight: 500 }}>
                          Expires: {donation.expiryDate ? new Date(donation.expiryDate).toLocaleDateString() : 'Today'}
                        </Typography>
                      </Box>
                      {donation.donor && (
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
                          By: {donation.donor.profile?.firstName} {donation.donor.profile?.lastName}
                          {donation.donor.profile?.organization && ` (${donation.donor.profile.organization})`}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ px: 3, pb: 3, pt: 0, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => navigate(`/donations/${donation._id}`)}
                      endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                      sx={{ fontWeight: 700 }}
                    >
                      View Details
                    </Button>
                    {user && user.role === 'recipient' && donation.status === 'available' && (
                      <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={() => handleClaim(donation._id)}
                        disabled={claimingId === donation._id}
                        sx={{ py: 0.8, px: 2, fontSize: '0.8rem' }}
                      >
                        {claimingId === donation._id ? 'Claiming...' : 'Claim'}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination control */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontWeight: 700,
                  }
                }}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default Donations;