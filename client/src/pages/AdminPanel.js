import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
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
  Stack,
  Tabs,
  Tab,
  Badge,
  Skeleton,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon,
  Restaurant as FoodIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Block as BlockIcon,
  CheckCircle as ApproveIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';

const AdminPanel = () => {
  const {
    user,
    getAdminStats,
    getAdminUsers,
    getAdminDonations,
    toggleUserStatus,
    adminDeleteDonation,
  } = useAuth();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, usersData, donationsData] = await Promise.all([
        getAdminStats(),
        getAdminUsers({ limit: 100 }),
        getAdminDonations({ limit: 100 }),
      ]);

      if (statsData) {
        setStats({
          totalUsers: statsData.overview?.totalUsers || 0,
          activeUsers: statsData.overview?.totalDonors + statsData.overview?.totalRecipients || 0,
          totalDonations: statsData.overview?.totalDonations || 0,
          activeDonations: statsData.overview?.activeDonations || 0,
          monthlyDonations: statsData.overview?.completedDonations || 0,
          pendingActions: 0,
        });
      }

      if (usersData && usersData.users) {
        setUsers(usersData.users);
      }

      if (donationsData && donationsData.donations) {
        setDonations(donationsData.donations);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentActive) => {
    setError('');
    try {
      const result = await toggleUserStatus(userId, !currentActive);
      if (result.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isActive: !currentActive } : u))
        );
        const statsData = await getAdminStats();
        if (statsData) {
          setStats({
            totalUsers: statsData.overview?.totalUsers || 0,
            activeUsers: statsData.overview?.totalDonors + statsData.overview?.totalRecipients || 0,
            totalDonations: statsData.overview?.totalDonations || 0,
            activeDonations: statsData.overview?.activeDonations || 0,
            monthlyDonations: statsData.overview?.completedDonations || 0,
            pendingActions: 0,
          });
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to toggle user status');
    }
  };

  const handleDeleteDonation = async (donationId) => {
    if (window.confirm('Are you sure you want to delete this donation?')) {
      setError('');
      try {
        const result = await adminDeleteDonation(donationId);
        if (result.success) {
          setDonations((prev) => prev.filter((d) => d._id !== donationId));
          const statsData = await getAdminStats();
          if (statsData) {
            setStats({
              totalUsers: statsData.overview?.totalUsers || 0,
              activeUsers: statsData.overview?.totalDonors + statsData.overview?.totalRecipients || 0,
              totalDonations: statsData.overview?.totalDonations || 0,
              activeDonations: statsData.overview?.activeDonations || 0,
              monthlyDonations: statsData.overview?.completedDonations || 0,
              pendingActions: 0,
            });
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to delete donation');
      }
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
      case 'admin': return 'error';
      case 'donor': return 'primary';
      case 'recipient': return 'secondary';
      default: return 'default';
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <Box sx={{ width: '100%' }}>
        <Alert severity="error" variant="outlined" sx={{ borderRadius: 2.5 }}>
          Access Denied. Elevated administrator credentials required.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <Skeleton variant="text" width="30%" height={48} sx={{ mb: 1, borderRadius: 2 }} />
        <Skeleton variant="text" width="50%" height={24} sx={{ mb: 4, borderRadius: 1 }} />
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent>
                  <Skeleton variant="circular" width={32} height={32} sx={{ mb: 2 }} />
                  <Skeleton variant="text" width="50%" height={32} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" width="100%" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Title Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AdminIcon sx={{ fontSize: 28, color: '#10b981' }} />
          Admin Panel
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Overview system growth statistics, configure SMS notification triggers, and moderate users.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { title: 'Total Members', value: stats.totalUsers, icon: <PeopleIcon sx={{ color: '#10b981' }} />, iconBg: 'rgba(16,185,129,0.1)', desc: `${stats.activeUsers || 0} active logs` },
          { title: 'Total Donations', value: stats.totalDonations, icon: <FoodIcon sx={{ color: '#3b82f6' }} />, iconBg: 'rgba(59,130,246,0.1)', desc: `${stats.activeDonations || 0} available feed` },
          { title: 'Completed Logistics', value: stats.monthlyDonations, icon: <TrendingIcon sx={{ color: '#10b981' }} />, iconBg: 'rgba(16,185,129,0.1)', desc: 'Successful drop-offs' },
          { title: 'Pending Flags', value: stats.pendingActions, icon: <WarningIcon sx={{ color: '#f59e0b' }} />, iconBg: 'rgba(245,158,11,0.1)', desc: 'Requires intervention' }
        ].map((item, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: item.iconBg }}>
                    {item.icon}
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5, letterSpacing: '-1px' }}>
                  {item.value || 0}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {item.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs Container */}
      <Card sx={{ border: '1px solid #e2e8f0', bgcolor: 'white', borderRadius: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: '#f1f5f9', px: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ '& .MuiTab-root': { fontWeight: 700 } }}>
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PeopleIcon sx={{ fontSize: 18 }} />
                  Users
                  <Badge badgeContent={users.filter(u => !u.isActive).length} color="error" sx={{ ml: 0.5 }} />
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FoodIcon sx={{ fontSize: 18 }} />
                  Donations
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AnalyticsIcon sx={{ fontSize: 18 }} />
                  Analytics
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon sx={{ fontSize: 18 }} />
                  Settings
                </Box>
              } 
            />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {/* Tab 0: User list table */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, letterSpacing: '-0.3px' }}>
                User Moderation Console
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderColor: '#f1f5f9', borderRadius: 2.5 }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Joined</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((userItem) => (
                      <TableRow key={userItem._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {userItem.profile?.firstName} {userItem.profile?.lastName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                              {userItem.profile?.organization || 'Individual'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{userItem.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={userItem.role.toUpperCase()}
                            color={getRoleColor(userItem.role)}
                            size="small"
                            sx={{ fontWeight: 800, fontSize: '0.6rem', height: 20 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={userItem.isActive ? 'ACTIVE' : 'BLOCKED'}
                            color={getStatusColor(userItem.isActive ? 'active' : 'inactive')}
                            size="small"
                            sx={{ fontWeight: 800, fontSize: '0.6rem', height: 20 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                          {new Date(userItem.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <IconButton 
                              size="small" 
                              color={userItem.isActive ? 'warning' : 'success'}
                              onClick={() => handleToggleUserStatus(userItem._id, userItem.isActive)}
                              sx={{ border: '1px solid #f1f5f9' }}
                            >
                              {userItem.isActive ? <BlockIcon sx={{ fontSize: 16 }} /> : <ApproveIcon sx={{ fontSize: 16 }} />}
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

          {/* Tab 1: Donations list table */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, letterSpacing: '-0.3px' }}>
                Donation Audits Feed
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderColor: '#f1f5f9', borderRadius: 2.5 }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Listing Title</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Donor</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>City</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {donations.map((donation) => (
                      <TableRow key={donation._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {donation.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                              {donation.quantity.amount} {donation.quantity.unit}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {donation.donor?.profile?.firstName} {donation.donor?.profile?.lastName}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={donation.foodType.toUpperCase()}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.6rem', height: 20 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={donation.status.toUpperCase()}
                            color={getStatusColor(donation.status)}
                            size="small"
                            sx={{ fontWeight: 800, fontSize: '0.6rem', height: 20 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
                            {donation.location?.address?.city || 'NYC'}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                          {new Date(donation.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/donations/${donation._id}`)}
                              sx={{ border: '1px solid #f1f5f9' }}
                            >
                              <ViewIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeleteDonation(donation._id)}
                              sx={{ border: '1px solid #fef2f2' }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
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

          {/* Tab 2: Analytics graphs placeholder */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, letterSpacing: '-0.3px' }}>
                Growth Reporting Insights
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: '#f1f5f9' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                        USER GROWTH INDEX
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                        +18.4%
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Platform signups vs historical quarterly average
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: '#f1f5f9' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                        LOGISTIC SATISFACTION RATE
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: '#10b981' }}>
                        92.5%
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Successful picks reported without coordinates dispute flags
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: '#f1f5f9', p: 3 }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                        Carbon Emission Mitigation
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                        Decentralized commercial food sustainability cataloging directly mitigates landfill methane production. Detailed ESG reporting modules will map carbon equivalent offsets in next platform version.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Tab 3: System configuration settings */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, letterSpacing: '-0.3px' }}>
                Global System Configuration
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: '#f1f5f9' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                        Email Notification API Gateway
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.85rem' }}>
                        Toggle SMTP connection strings and template alerts triggers.
                      </Typography>
                      <Button variant="outlined" size="small">
                        SMTP Gateways Config
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: '#f1f5f9' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                        Twilio SMS Webhooks
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.85rem' }}>
                        Define Twilio accounts, phone tokens and verification callbacks.
                      </Typography>
                      <Button variant="outlined" size="small">
                        Twilio Integrations
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: '#f1f5f9', p: 3 }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                        Platform Cron Jobs & Diagnostics
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3.5, fontSize: '0.85rem' }}>
                        Purge expired/unclaimed listings, refresh cache vectors, or verify active cluster states.
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button variant="outlined" color="warning" size="small">
                          Purge Old Lists
                        </Button>
                        <Button variant="outlined" color="info" size="small">
                          Flush Redis Cache
                        </Button>
                        <Button variant="outlined" color="success" size="small">
                          System Cluster Check
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
    </Box>
  );
};

export default AdminPanel;