import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
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
  const { user, updateProfile, changePassword, logout } = useAuth();
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

        const passwordResult = await changePassword(formData.password.current, formData.password.new);
        if (!passwordResult.success) {
          setError(passwordResult.error);
          setLoading(false);
          return;
        }
      }

      const updateData = {
        profile: formData.profile,
        preferences: formData.preferences,
      };

      const result = await updateProfile(updateData);
      
      if (result.success) {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
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
      <Box sx={{ width: '100%' }}>
        <Alert severity="error" variant="outlined" sx={{ borderRadius: 2.5 }}>
          Please log in to view your profile settings.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Title Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.5px' }}>
          Profile Settings
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Manage your personal information, security, and notification triggers.
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

      <Grid container spacing={4}>
        {/* Profile Details (Left Side) */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3, mb: 4 }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PersonIcon sx={{ fontSize: 18, color: '#10b981' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.3px' }}>
                    Personal Information
                  </Typography>
                </Box>
                {!isEditing ? (
                  <Button
                    startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                    onClick={() => setIsEditing(true)}
                    variant="outlined"
                    size="small"
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Button
                    startIcon={<CancelIcon sx={{ fontSize: 16 }} />}
                    onClick={handleCancel}
                    variant="outlined"
                    color="error"
                    size="small"
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
                      label="Email Address"
                      value={user.email}
                      disabled
                      InputProps={{
                        startAdornment: <EmailIcon sx={{ mr: 1, color: '#94a3b8', fontSize: 20 }} />,
                      }}
                      helperText="System email cannot be modified"
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
                        startAdornment: <PhoneIcon sx={{ mr: 1, color: '#94a3b8', fontSize: 20 }} />,
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
                        startAdornment: <BusinessIcon sx={{ mr: 1, color: '#94a3b8', fontSize: 20 }} />,
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
                        startAdornment: <LocationIcon sx={{ mr: 1, color: '#94a3b8', fontSize: 20 }} />,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                      <Chip
                        label={user.role.toUpperCase()}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 800, fontSize: '0.65rem', height: 22 }}
                      />
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        Vetted account role access
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Panel */}
          <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SecurityIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.3px' }}>
                  Update Security Credentials
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password.current}
                    onChange={(e) => handleInputChange('password', 'current', e.target.value)}
                    disabled={!isEditing}
                    placeholder="••••••••"
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: '#94a3b8' }}
                        >
                          {showPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}
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
                    placeholder="Min 6 characters"
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
                    placeholder="Retype password"
                    error={formData.password.new !== formData.password.confirm && formData.password.confirm !== ''}
                    helperText={formData.password.new !== formData.password.confirm && formData.password.confirm !== '' ? 'Passwords do not match' : ''}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Preferences & Info (Right Side) */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <NotificationIcon sx={{ fontSize: 18, color: '#10b981' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.3px' }}>
                  Notification Triggers
                </Typography>
              </Box>

              <Stack spacing={2.5}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.preferences.emailNotifications}
                      onChange={(e) => handleInputChange('preferences', 'emailNotifications', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Email Notification Alerts
                    </Typography>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.preferences.smsNotifications}
                      onChange={(e) => handleInputChange('preferences', 'smsNotifications', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      SMS Text Messages
                    </Typography>
                  }
                />

                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Max Radius Range</InputLabel>
                  <Select
                    value={formData.preferences.maxDistance}
                    onChange={(e) => handleInputChange('preferences', 'maxDistance', e.target.value)}
                    label="Max Radius Range"
                    disabled={!isEditing}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value={10}>10 miles radius</MenuItem>
                    <MenuItem value={25}>25 miles radius</MenuItem>
                    <MenuItem value={50}>50 miles radius</MenuItem>
                    <MenuItem value={100}>100 miles radius</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>

          {/* System Info & Logs */}
          <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, letterSpacing: '-0.3px' }}>
                Account Meta
              </Typography>

              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                    MEMBER SINCE
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.2 }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                    LAST SYSTEM ACCESS
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.2 }}>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Today'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    STATUS KEY
                  </Typography>
                  <Chip
                    label={user.isActive ? 'ACTIVE WORKSPACE' : 'INACTIVE'}
                    color={user.isActive ? 'success' : 'error'}
                    size="small"
                    sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                  />
                </Box>

                <Divider sx={{ my: 1 }} />

                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleLogout}
                  fullWidth
                  sx={{ py: 1 }}
                >
                  Logout Session
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button (Action Bar) */}
      {isEditing && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SaveIcon />}
            onClick={handleSubmit}
            disabled={loading}
            size="large"
            sx={{ px: 4 }}
          >
            {loading ? 'Saving Changes...' : 'Save Settings'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Profile;