import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Stack, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useAuth, apiError } from '../context/AuthContext';
import PageFeedback from '../components/PageFeedback';
import StatusChip from '../components/StatusChip';

export default function Dashboard() {
  const { user, api } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const path = user.role === 'recipient' ? '/users/claimed-donations' : user.role === 'admin' ? '/admin/donations' : '/users/donations';
      const [summary, listings] = await Promise.all([api.get('/users/summary'), api.get(path, { params: { page, limit: 10 } })]);
      setData({ ...summary.data, ...listings.data });
    } catch (err) { setError(apiError(err)); }
    finally { setLoading(false); }
  }, [api, user.role, page]);
  useEffect(() => { load(); }, [load]);
  const states = data?.states || {};
  const total = Object.values(states).reduce((sum, n) => sum + n, 0);
  return <Box>
    <Box sx={{ p: { xs: 3, md: 5 }, mb: 4, borderRadius: 4, bgcolor: '#0f172a', color: 'white' }}>
      <Typography variant="overline" sx={{ color: '#6ee7b7', letterSpacing: 2 }}>Your community, connected</Typography>
      <Typography component="h1" variant="h2" sx={{ my: 1 }}>Welcome back, {user.profile?.firstName}.</Typography>
      <Typography sx={{ color: '#cbd5e1', maxWidth: 600 }}>Make good food go further. Manage listings, arrange collection, and follow every donation from reservation to completion.</Typography>
      <Stack direction="row" spacing={2} sx={{ mt: 3 }} useFlexGap flexWrap="wrap">
        {user.role !== 'recipient' && <Button variant="contained" component={Link} to="/create-donation">Share surplus food</Button>}
        <Button variant="outlined" component={Link} to="/donations" sx={{ color: 'white', borderColor: '#64748b' }}>Find available food</Button>
        <Button component={Link} to="/volunteers" sx={{ color: '#6ee7b7' }}>Manage pickups →</Button>
      </Stack>
    </Box>
    <PageFeedback loading={loading} error={error} onRetry={load} />
    {!loading && !error && data && <>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          ['All donations', total, 'Across your full history'],
          [user.role === 'recipient' ? 'Awaiting pickup' : 'Available', user.role === 'recipient' ? states.claimed || 0 : states.available || 0, user.role === 'recipient' ? 'Ready for collection' : 'Ready to be claimed'],
          ['In progress', (states.claimed || 0) + (states['picked-up'] || 0), 'Reserved or collected'],
          ['Completed', states.completed || 0, 'Successfully redistributed']
        ].map(([label, value, caption]) => <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={label}><Card><CardContent>
          <Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h2" sx={{ my: 1 }}>{value}</Typography><Typography variant="caption" color="text.secondary">{caption}</Typography>
        </CardContent></Card></Grid>)}
      </Grid>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}><Typography variant="h3" component="h2">{user.role === 'recipient' ? 'Your claimed donations' : user.role === 'admin' ? 'Platform donations' : 'Your donations'}</Typography><Button onClick={load}>Refresh</Button></Stack>
      {!data.donations.length ? <PageFeedback empty="No donations yet. Browse the food feed or share your first listing to get started." /> : <Card><TableContainer><Table>
        <TableHead><TableRow><TableCell>Donation</TableCell><TableCell>Status</TableCell><TableCell>Pickup window</TableCell><TableCell align="right">Manage</TableCell></TableRow></TableHead>
        <TableBody>{data.donations.map(d => <TableRow key={d._id} hover><TableCell><Typography fontWeight={700}>{d.title}</Typography><Typography variant="caption">{d.quantity.amount} {d.quantity.unit} · {d.location.address.city}</Typography></TableCell><TableCell><StatusChip status={d.status} /></TableCell><TableCell>{new Date(d.pickupWindow.startTime).toLocaleString()}<Typography variant="caption" display="block">until {new Date(d.pickupWindow.endTime).toLocaleString()}</Typography></TableCell><TableCell align="right"><Button component={Link} to={`/donations/${d._id}`}>View</Button>{user._id === (d.donor?._id || d.donor) && d.status === 'available' && <Button component={Link} to={`/donations/${d._id}/edit`}>Edit</Button>}</TableCell></TableRow>)}</TableBody>
      </Table></TableContainer></Card>}
      <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 3 }}><Button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Typography sx={{ py: 1 }}>Page {page} of {Math.max(data.totalPages, 1)}</Typography><Button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></Stack>
    </>}
  </Box>;
}
