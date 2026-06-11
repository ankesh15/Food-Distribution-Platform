import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Restaurant as FoodIcon,
  LocationOn as LocationIcon,
  Schedule as TimeIcon,
  Add as AddIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const CreateDonation = () => {
  const { createDonation, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    foodType: '',
    quantity: {
      amount: '',
      unit: 'servings'
    },
    allergens: [],
    preparationDate: new Date(),
    expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    pickupWindow: {
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
    location: {
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      },
      instructions: ''
    },
    isUrgent: false,
    specialInstructions: '',
    tags: []
  });

  const [newTag, setNewTag] = useState('');

  const foodTypes = [
    'fresh', 'canned', 'frozen', 'baked', 'dairy', 'produce', 'meat', 'pantry', 'other'
  ];

  const units = [
    'servings', 'items', 'kilograms', 'pounds', 'boxes', 'containers'
  ];

  const allergenOptions = [
    'nuts', 'dairy', 'gluten', 'soy', 'eggs', 'shellfish', 'wheat', 'fish', 'none'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (parent, child, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: value
      }
    }));
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        address: {
          ...prev.location.address,
          [field]: value
        }
      }
    }));
  };

  const handleAllergenChange = (allergen) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.description.trim()) return 'Description is required';
    if (!formData.foodType) return 'Food type is required';
    if (!formData.quantity.amount || formData.quantity.amount <= 0) return 'Valid quantity is required';
    if (!formData.location.address.street.trim()) return 'Street address is required';
    if (!formData.location.address.city.trim()) return 'City is required';
    if (!formData.location.address.state.trim()) return 'State is required';
    if (!formData.location.address.zipCode.trim()) return 'ZIP code is required';
    if (formData.pickupWindow.startTime >= formData.pickupWindow.endTime) {
      return 'Pickup end time must be after start time';
    }
    if (formData.expiryDate <= new Date()) {
      return 'Expiry date must be in the future';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        quantity: {
          amount: parseFloat(formData.quantity.amount),
          unit: formData.quantity.unit
        },
        preparationDate: new Date(formData.preparationDate).toISOString(),
        expiryDate: new Date(formData.expiryDate).toISOString(),
        pickupWindow: {
          startTime: new Date(formData.pickupWindow.startTime).toISOString(),
          endTime: new Date(formData.pickupWindow.endTime).toISOString(),
        }
      };

      const result = await createDonation(payload);
      if (result.success) {
        setSuccess('Donation created successfully!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to create donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'donor' && user.role !== 'admin')) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" variant="outlined" sx={{ borderRadius: 2.5 }}>
          Only validated donors can create donations. Please contact admin support for credential checks.
        </Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        {/* Navigation Action */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ 
              fontWeight: 700, 
              color: 'text.secondary',
              '&:hover': { color: 'primary.main', bgcolor: 'rgba(16,185,129,0.05)' } 
            }}
          >
            Dashboard
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, letterSpacing: '-0.5px' }}>
            List Surplus Donation
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
            Provide accurate metrics and pickup timelines to ensure smooth distribution.
          </Typography>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" variant="outlined" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
            {success}
          </Alert>
        )}

        <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3.5}>
                
                {/* 1. Food Details */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FoodIcon sx={{ fontSize: 18, color: '#10b981' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.3px' }}>
                      Food Information
                    </Typography>
                  </Box>
                  <Divider sx={{ mt: 1.5 }} />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Donation Title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Fresh Artisan Bread & Loaves"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Provide condition details, preparation notes, refrigeration guidelines, etc."
                    multiline
                    rows={3}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="food-type-label">Food Category</InputLabel>
                    <Select
                      labelId="food-type-label"
                      value={formData.foodType}
                      onChange={(e) => handleInputChange('foodType', e.target.value)}
                      label="Food Category"
                      sx={{ borderRadius: 2 }}
                    >
                      {foodTypes.map(type => (
                        <MenuItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.isUrgent}
                        onChange={(e) => handleInputChange('isUrgent', e.target.checked)}
                        sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#ef4444' } }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: formData.isUrgent ? '#ef4444' : '#475569' }}>
                          Mark as Urgent
                        </Typography>
                        <WarningIcon sx={{ fontSize: 16, color: '#ef4444', display: formData.isUrgent ? 'inline-block' : 'none' }} />
                      </Box>
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Quantity Metrics"
                    type="number"
                    value={formData.quantity.amount}
                    onChange={(e) => handleNestedChange('quantity', 'amount', e.target.value)}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <FormControl sx={{ minWidth: 110 }} size="small">
                            <Select
                              value={formData.quantity.unit}
                              onChange={(e) => handleNestedChange('quantity', 'unit', e.target.value)}
                              sx={{ border: 'none', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                            >
                              {units.map(unit => (
                                <MenuItem key={unit} value={unit}>
                                  {unit}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} />

                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Preparation Time"
                    value={formData.preparationDate}
                    onChange={(newValue) => handleInputChange('preparationDate', newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Expiry Time Limit"
                    value={formData.expiryDate}
                    onChange={(newValue) => handleInputChange('expiryDate', newValue)}
                    minDateTime={new Date()}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>

                {/* Allergens selection */}
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, color: '#475569' }}>
                    Allergen Warnings
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {allergenOptions.map(allergen => {
                      const selected = formData.allergens.includes(allergen);
                      return (
                        <Chip
                          key={allergen}
                          label={allergen.toUpperCase()}
                          onClick={() => handleAllergenChange(allergen)}
                          color={selected ? 'primary' : 'default'}
                          variant={selected ? 'filled' : 'outlined'}
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: '0.75rem', 
                            height: 28,
                            borderColor: selected ? 'primary.main' : '#cbd5e1',
                            bgcolor: selected ? 'primary.main' : 'transparent',
                            color: selected ? 'white' : '#64748b'
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Grid>

                {/* 2. Logistics & Pickup Window */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TimeIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.3px' }}>
                      Logistic Pickup Windows
                    </Typography>
                  </Box>
                  <Divider sx={{ mt: 1.5 }} />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Pickup Window Start"
                    value={formData.pickupWindow.startTime}
                    onChange={(newValue) => handleNestedChange('pickupWindow', 'startTime', newValue)}
                    minDateTime={new Date()}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Pickup Window End"
                    value={formData.pickupWindow.endTime}
                    onChange={(newValue) => handleNestedChange('pickupWindow', 'endTime', newValue)}
                    minDateTime={formData.pickupWindow.startTime}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>

                {/* 3. Address & Coordinates */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LocationIcon sx={{ fontSize: 18, color: '#10b981' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.3px' }}>
                      Location Coordinates
                    </Typography>
                  </Box>
                  <Divider sx={{ mt: 1.5 }} />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    value={formData.location.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    placeholder="e.g., 100 Main St Suite 4B"
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="City"
                    value={formData.location.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="State"
                    value={formData.location.address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="ZIP Code"
                    value={formData.location.address.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Additional Coordination Notes"
                    value={formData.location.instructions}
                    onChange={(e) => handleNestedChange('location', 'instructions', e.target.value)}
                    placeholder="e.g., Back door loading dock, ring intercom 23..."
                    multiline
                    rows={2}
                  />
                </Grid>

                {/* 4. Tags & Extra Metadata */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.3px' }}>
                    Metadata Tags
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Extra Instructions"
                    value={formData.specialInstructions}
                    onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                    placeholder="Special requests or handling rules..."
                    multiline
                    rows={2}
                    sx={{ mb: 3 }}
                  />

                  <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, alignItems: 'center' }}>
                    <TextField
                      label="Add Keyword Tag"
                      placeholder="e.g., refrigerated, organic"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      size="small"
                      sx={{ minWidth: 200 }}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleAddTag}
                      startIcon={<AddIcon />}
                      sx={{ py: 1 }}
                    >
                      Add Tag
                    </Button>
                  </Box>
                  
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {formData.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        onDelete={() => handleRemoveTag(tag)}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    ))}
                  </Stack>
                </Grid>

                {/* Submissions Control */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/dashboard')}
                      disabled={loading}
                      sx={{ color: '#475569', borderColor: '#cbd5e1' }}
                    >
                      Cancel Listing
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SaveIcon />}
                      disabled={loading}
                      sx={{ px: 4 }}
                    >
                      {loading ? 'Creating...' : 'Submit Donation'}
                    </Button>
                  </Box>
                </Grid>

              </Grid>
            </form>
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default CreateDonation;