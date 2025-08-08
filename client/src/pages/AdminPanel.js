import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon,
  Restaurant as FoodIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Block as BlockIcon,
  CheckCircle as ApproveIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';

const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with actual API calls
      setUsers([
        {
          _id: '1',
          email: 'john@example.com',
          profile: { firstName: 'John', lastName: 'Doe', organization: 'Local Bakery' },
          role: 'donor',
          isActive: true,
          createdAt: new Date('2024-01-01'),
        },
        {
          _id: '2',
          email: 'jane@example.com',
          profile: { firstName: 'Jane', lastName: 'Smith', organization: 'Food Bank' },
          role: 'recipient',
          isActive: true,
          createdAt: new Date('2024-01-15'),
        },
      ]);

      setDonations([
        {
          _id: '1',
          title: 'Fresh Bread',
          foodType: 'baked',
          status: 'available',
          quantity: { amount: 50, unit: 'items' },
          donor: { profile: { firstName: 'John', lastName: 'Doe' } },
          location: { address: { city: 'New York', state: 'NY' } },
          createdAt: new Date('2024-01-20'),
        },
      ]);

      setStats({
        totalUsers: 25,
        activeUsers: 23,
        totalDonations: 150,
        activeDonations: 12,
        monthlyDonations: 45,
        pendingActions: 3,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'available':
      case 'completed':
        return 'success';
      case 'pending':
      case 'claimed':
        return 'warning';
      case 'inactive':
      case 'expired':
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'donor':
        return 'primary';
      case 'recipient':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Container>
    );
  }

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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center' }}>
          <AdminIcon sx={{ mr: 2, color: 'primary.main' }} />
          Admin Panel
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Manage users, donations, and system settings.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  Total Users
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {stats.totalUsers || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats.activeUsers || 0} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FoodIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  Total Donations
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                {stats.totalDonations || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats.activeDonations || 0} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  This Month
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'info.main' }}>
                {stats.monthlyDonations || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New donations
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  Pending
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {stats.pendingActions || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Require attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PeopleIcon sx={{ mr: 1 }} />
                  Users
                  <Badge badgeContent={users.filter(u => !u.isActive).length} color="error" sx={{ ml: 1 }}>
                    <Box />
                  </Badge>
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FoodIcon sx={{ mr: 1 }} />
                  Donations
                  <Badge badgeContent={donations.filter(d => d.status === 'pending').length} color="warning" sx={{ ml: 1 }}>
                    <Box />
                  </Badge>
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AnalyticsIcon sx={{ mr: 1 }} />
                  Analytics
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SettingsIcon sx={{ mr: 1 }} />
                  Settings
                </Box>
              } 
            />
          </Tabs>
        </Box>

        <CardContent>
          {/* Users Tab */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h5" sx={{ mb: 3 }}>
                User Management
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Joined</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {user.profile?.firstName} {user.profile?.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.profile?.organization}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            color={getRoleColor(user.role)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.isActive ? 'Active' : 'Inactive'}
                            color={getStatusColor(user.isActive ? 'active' : 'inactive')}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" color={user.isActive ? 'warning' : 'success'}>
                              {user.isActive ? <BlockIcon /> : <ApproveIcon />}
                            </IconButton>
                            <IconButton size="small" color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Donations Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h5" sx={{ mb: 3 }}>
                Donation Management
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Donor</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {donations.map((donation) => (
                      <TableRow key={donation._id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {donation.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {donation.quantity.amount} {donation.quantity.unit}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {donation.donor?.profile?.firstName} {donation.donor?.profile?.lastName}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={donation.foodType}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={donation.status}
                            color={getStatusColor(donation.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {donation.location.address.city}, {donation.location.address.state}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {new Date(donation.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/donations/${donation._id}`)}
                            >
                              <ViewIcon />
                            </IconButton>
                            <IconButton size="small" color="success">
                              <ApproveIcon />
                            </IconButton>
                            <IconButton size="small" color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Analytics Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h5" sx={{ mb: 3 }}>
                Analytics & Reports
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        User Growth
                      </Typography>
                      <Typography variant="h4" color="primary">
                        +15%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        This month compared to last month
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Donation Success Rate
                      </Typography>
                      <Typography variant="h4" color="success">
                        87%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Donations successfully claimed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Recent Activity
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Analytics dashboard coming soon...
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Settings Tab */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h5" sx={{ mb: 3 }}>
                System Settings
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Email Settings
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Configure email notifications and templates
                      </Typography>
                      <Button variant="outlined">
                        Configure Email
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        SMS Settings
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Configure SMS notifications
                      </Typography>
                      <Button variant="outlined">
                        Configure SMS
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        System Maintenance
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Database cleanup, cache management, and system health
                      </Typography>
                      <Stack direction="row" spacing={2}>
                        <Button variant="outlined" color="warning">
                          Cleanup Database
                        </Button>
                        <Button variant="outlined" color="info">
                          Clear Cache
                        </Button>
                        <Button variant="outlined" color="success">
                          System Health Check
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default AdminPanel; 