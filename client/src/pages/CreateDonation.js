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
      unit: 'pounds'
    },
    allergens: [],
    preparationDate: new Date(),
    expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    pickupWindow: {
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      endTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
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
    'pounds', 'kilograms', 'servings', 'items', 'boxes', 'containers'
  ];

  const allergenOptions = [
    'nuts', 'dairy', 'gluten', 'soy', 'eggs', 'shellfish', 'wheat', 'fish', 'none'
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleNestedInputChange = (parent, child, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: value
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
      const result = await createDonation(formData);
      if (result.success) {
        setSuccess('Donation created successfully!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to create donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'donor') {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">
          Only donors can create donations. Please contact an administrator if you need to change your role.
        </Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          <Typography variant="h3" sx={{ fontWeight: 600, mb: 1 }}>
            Create New Donation
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Share surplus food with local organizations and reduce waste.
          </Typography>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <FoodIcon sx={{ mr: 1 }} />
                    Food Information
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Donation Title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Fresh Bread from Local Bakery"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the food items, condition, and any special notes"
                    multiline
                    rows={3}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Food Type</InputLabel>
                    <Select
                      value={formData.foodType}
                      onChange={(e) => handleInputChange('foodType', e.target.value)}
                      label="Food Type"
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
                      />
                    }
                    label="Urgent - Needs pickup soon"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={formData.quantity.amount}
                    onChange={(e) => handleNestedInputChange('quantity', 'amount', parseFloat(e.target.value))}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <FormControl sx={{ minWidth: 120 }}>
                            <Select
                              value={formData.quantity.unit}
                              onChange={(e) => handleNestedInputChange('quantity', 'unit', e.target.value)}
                              size="small"
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
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Preparation Date"
                    value={formData.preparationDate}
                    onChange={(newValue) => handleInputChange('preparationDate', newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Expiry Date"
                    value={formData.expiryDate}
                    onChange={(newValue) => handleInputChange('expiryDate', newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                    minDateTime={new Date()}
                  />
                </Grid>

                {/* Allergens */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Allergens (select all that apply)
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {allergenOptions.map(allergen => (
                      <Chip
                        key={allergen}
                        label={allergen}
                        onClick={() => handleAllergenChange(allergen)}
                        color={formData.allergens.includes(allergen) ? 'primary' : 'default'}
                        variant={formData.allergens.includes(allergen) ? 'filled' : 'outlined'}
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <TimeIcon sx={{ mr: 1 }} />
                    Pickup Details
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Pickup Start Time"
                    value={formData.pickupWindow.startTime}
                    onChange={(newValue) => handleNestedInputChange('pickupWindow', 'startTime', newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                    minDateTime={new Date()}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Pickup End Time"
                    value={formData.pickupWindow.endTime}
                    onChange={(newValue) => handleNestedInputChange('pickupWindow', 'endTime', newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                    minDateTime={formData.pickupWindow.startTime}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <LocationIcon sx={{ mr: 1 }} />
                    Location
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    value={formData.location.address.street}
                    onChange={(e) => handleNestedInputChange('location.address', 'street', e.target.value)}
                    placeholder="123 Main Street"
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="City"
                    value={formData.location.address.city}
                    onChange={(e) => handleNestedInputChange('location.address', 'city', e.target.value)}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="State"
                    value={formData.location.address.state}
                    onChange={(e) => handleNestedInputChange('location.address', 'state', e.target.value)}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="ZIP Code"
                    value={formData.location.address.zipCode}
                    onChange={(e) => handleNestedInputChange('location.address', 'zipCode', e.target.value)}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Pickup Instructions"
                    value={formData.location.instructions}
                    onChange={(e) => handleNestedInputChange('location', 'instructions', e.target.value)}
                    placeholder="e.g., Ring doorbell, call when arriving, etc."
                    multiline
                    rows={2}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                    Additional Information
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Special Instructions"
                    value={formData.specialInstructions}
                    onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                    placeholder="Any special handling requirements or additional notes"
                    multiline
                    rows={2}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Tags (optional)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      size="small"
                      placeholder="Add a tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleAddTag}
                      startIcon={<AddIcon />}
                    >
                      Add
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
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                </Grid>

                {/* Submit Button */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/dashboard')}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                      disabled={loading}
                      size="large"
                    >
                      {loading ? 'Creating...' : 'Create Donation'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateDonation; 