import React, { useState, useEffect } from 'react';
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
  Switch,
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Notifications as NotificationIcon,
  Security as SecurityIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    profile: {
      firstName: '',
      lastName: '',
      phone: '',
      organization: '',
      address: '',
    },
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      maxDistance: 50,
    },
    password: {
      current: '',
      new: '',
      confirm: '',
    },
  });

  useEffect(() => {
    if (user) {
      setFormData({
        profile: {
          firstName: user.profile?.firstName || '',
          lastName: user.profile?.lastName || '',
          phone: user.profile?.phone || '',
          organization: user.profile?.organization || '',
          address: user.profile?.address || '',
        },
        preferences: {
          emailNotifications: user.preferences?.emailNotifications ?? true,
          smsNotifications: user.preferences?.smsNotifications ?? false,
          maxDistance: user.preferences?.maxDistance || 50,
        },
        password: {
          current: '',
          new: '',
          confirm: '',
        },
      });
    }
  }, [user]);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate password change if attempting to change password
      if (formData.password.new || formData.password.current) {
        if (!formData.password.current) {
          setError('Current password is required to change password');
          setLoading(false);
          return;
        }
        if (formData.password.new !== formData.password.confirm) {
          setError('New passwords do not match');
          setLoading(false);
          return;
        }
        if (formData.password.new.length < 6) {
          setError('New password must be at least 6 characters long');
          setLoading(false);
          return;
        }
      }

      const updateData = {
        profile: formData.profile,
        preferences: formData.preferences,
      };

      // Only include password if user is changing it
      if (formData.password.new) {
        updateData.password = {
          current: formData.password.current,
          new: formData.password.new,
        };
      }

      const result = await updateProfile(updateData);
      
      if (result.success) {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          password: { current: '', new: '', confirm: '' }
        }));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    // Reset form data to original user data
    if (user) {
      setFormData({
        profile: {
          firstName: user.profile?.firstName || '',
          lastName: user.profile?.lastName || '',
          phone: user.profile?.phone || '',
          organization: user.profile?.organization || '',
          address: user.profile?.address || '',
        },
        preferences: {
          emailNotifications: user.preferences?.emailNotifications ?? true,
          smsNotifications: user.preferences?.smsNotifications ?? false,
          maxDistance: user.preferences?.maxDistance || 50,
        },
        password: {
          current: '',
          new: '',
          confirm: '',
        },
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">Please log in to view your profile.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 600, mb: 1 }}>
          Profile Settings
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Manage your account information and preferences.
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

      <Grid container spacing={4}>
        {/* Profile Information */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  Personal Information
                </Typography>
                {!isEditing ? (
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                    variant="outlined"
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Button
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    variant="outlined"
                    color="error"
                  >
                    Cancel
                  </Button>
                )}
              </Box>

              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={formData.profile.firstName}
                      onChange={(e) => handleInputChange('profile', 'firstName', e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={formData.profile.lastName}
                      onChange={(e) => handleInputChange('profile', 'lastName', e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={user.email}
                      disabled
                      InputProps={{
                        startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                      helperText="Email cannot be changed"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={formData.profile.phone}
                      onChange={(e) => handleInputChange('profile', 'phone', e.target.value)}
                      disabled={!isEditing}
                      InputProps={{
                        startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Organization"
                      value={formData.profile.organization}
                      onChange={(e) => handleInputChange('profile', 'organization', e.target.value)}
                      disabled={!isEditing}
                      InputProps={{
                        startAdornment: <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={formData.profile.address}
                      onChange={(e) => handleInputChange('profile', 'address', e.target.value)}
                      disabled={!isEditing}
                      multiline
                      rows={2}
                      InputProps={{
                        startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={user.role}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        Account Type
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>

          {/* Password Change Section */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center' }}>
                <SecurityIcon sx={{ mr: 1 }} />
                Change Password
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password.current}
                    onChange={(e) => handleInputChange('password', 'current', e.target.value)}
                    disabled={!isEditing}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password.new}
                    onChange={(e) => handleInputChange('password', 'new', e.target.value)}
                    disabled={!isEditing}
                    helperText="Minimum 6 characters"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password.confirm}
                    onChange={(e) => handleInputChange('password', 'confirm', e.target.value)}
                    disabled={!isEditing}
                    error={formData.password.new !== formData.password.confirm && formData.password.confirm !== ''}
                    helperText={formData.password.new !== formData.password.confirm && formData.password.confirm !== '' ? 'Passwords do not match' : ''}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Preferences and Account Info */}
        <Grid item xs={12} lg={4}>
          {/* Preferences */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center' }}>
                <NotificationIcon sx={{ mr: 1 }} />
                Preferences
              </Typography>

              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.preferences.emailNotifications}
                      onChange={(e) => handleInputChange('preferences', 'emailNotifications', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label="Email Notifications"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.preferences.smsNotifications}
                      onChange={(e) => handleInputChange('preferences', 'smsNotifications', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label="SMS Notifications"
                />

                <FormControl fullWidth>
                  <InputLabel>Max Distance (miles)</InputLabel>
                  <Select
                    value={formData.preferences.maxDistance}
                    onChange={(e) => handleInputChange('preferences', 'maxDistance', e.target.value)}
                    label="Max Distance (miles)"
                    disabled={!isEditing}
                  >
                    <MenuItem value={10}>10 miles</MenuItem>
                    <MenuItem value={25}>25 miles</MenuItem>
                    <MenuItem value={50}>50 miles</MenuItem>
                    <MenuItem value={100}>100 miles</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Account Information
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Member Since
                  </Typography>
                  <Typography variant="body1">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Last Login
                  </Typography>
                  <Typography variant="body1">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Account Status
                  </Typography>
                  <Chip
                    label={user.isActive ? 'Active' : 'Inactive'}
                    color={user.isActive ? 'success' : 'error'}
                    size="small"
                  />
                </Box>

                <Divider />

                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleLogout}
                  fullWidth
                >
                  Logout
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      {isEditing && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSubmit}
            disabled={loading}
            size="large"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default Profile; 