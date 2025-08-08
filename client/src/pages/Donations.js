import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  Stack,
} from '@mui/material';
import { Search as SearchIcon, Fastfood as FoodIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Donations = () => {
  const { getDonations, user, claimDonation } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDonations();
    // eslint-disable-next-line
  }, []);

  const fetchDonations = async () => {
    setLoading(true);
    setError(null);
    const data = await getDonations(search ? { q: search } : {});
    setDonations(data.donations || []);
    setLoading(false);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleClaim = async (id) => {
    setError(null);
    const result = await claimDonation(id);
    if (result.success) {
      fetchDonations();
    } else {
      setError(result.error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" sx={{ mb: 4, fontWeight: 600 }}>
        Browse Donations
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <TextField
          placeholder="Search by food type, location, etc."
          value={search}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 400 } }}
        />
        <Button variant="contained" color="primary" onClick={fetchDonations}>
          Search
        </Button>
      </Stack>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : donations.length === 0 ? (
        <Typography>No donations found.</Typography>
      ) : (
        <Grid container spacing={4}>
          {donations.map((donation) => (
            <Grid item xs={12} sm={6} md={4} key={donation._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <FoodIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {donation.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {donation.description}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip label={donation.foodType} color="primary" size="small" />
                    <Chip label={donation.quantity} color="secondary" size="small" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Location: {donation.location?.address || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expiry: {donation.expiryDate ? new Date(donation.expiryDate).toLocaleDateString() : 'N/A'}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => navigate(`/donations/${donation._id}`)}>
                    View Details
                  </Button>
                  {user && user.role === 'recipient' && donation.status === 'available' && (
                    <Button size="small" color="primary" variant="contained" onClick={() => handleClaim(donation._id)}>
                      Claim
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Donations; 