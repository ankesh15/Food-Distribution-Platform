import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Stack, Button, Card, CardContent, Grid, Tabs, Tab, Table, TableContainer, TableHead, TableBody, TableRow, TableCell, TextField, Pagination } from '@mui/material';
import { useAuth, apiError } from '../context/AuthContext';
import PageFeedback from '../components/PageFeedback';
import StatusChip from '../components/StatusChip';
export default function AdminPanel() {
  const { api } = useAuth();
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, list] = await Promise.all([api.get('/admin/stats'), api.get(tab === 0 ? '/admin/users' : '/admin/donations', { params: { page, limit: 20, ...(tab === 0 && search ? { search } : {}) } })]);
      setData({ stats: stats.data.overview, ...list.data }); setError('');
    } catch (err) { setError(apiError(err)); } finally { setLoading(false); }
  }, [api, tab, page, search]);
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  const mutate = async (method, path, payload) => {
    setBusy(true);
    try { await api[method](path, payload); await load(); }
    catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  };
  return <Box>
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}><Box><Typography component="h1" variant="h2">Platform administration</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Manage accounts and listings with server-enforced administrator permissions.</Typography></Box><Button onClick={load}>Refresh</Button></Stack>
    {data && <Grid container spacing={2} sx={{ mb: 3 }}>{[['Members', data.stats.totalUsers], ['Active accounts', data.stats.activeUsers], ['Donations', data.stats.totalDonations], ['Completed', data.stats.completedDonations]].map(([label, value]) => <Grid key={label} size={{ xs: 6, md: 3 }}><Card><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h2">{value}</Typography></CardContent></Card></Grid>)}</Grid>}
    <Tabs value={tab} onChange={(event, value) => { setTab(value); setPage(1); }} sx={{ mb: 2 }} aria-label="Administration sections"><Tab label="User accounts" /><Tab label="Donation listings" /></Tabs>
    {tab === 0 && <TextField fullWidth size="small" label="Search members by name, email or organization" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} inputProps={{ maxLength: 100 }} sx={{ mb: 2 }} />}
    <PageFeedback loading={loading} error={error} onRetry={load} />
    {!loading && data && <Card><TableContainer><Table><TableHead><TableRow>{(tab === 0 ? ['Member', 'Role', 'Account', 'Actions'] : ['Donation', 'Status', 'Donor', 'Actions']).map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>
      {tab === 0 ? data.users?.map(member => <TableRow key={member._id}><TableCell><Typography fontWeight={700}>{member.profile.firstName} {member.profile.lastName}</Typography><Typography variant="caption">{member.email}</Typography></TableCell><TableCell>{member.role}</TableCell><TableCell>{member.isActive ? 'Active' : 'Deactivated'}</TableCell><TableCell><Button color={member.isActive ? 'error' : 'primary'} disabled={busy || member.role === 'admin'} onClick={() => { if (window.confirm(`${member.isActive ? 'Deactivate' : 'Activate'} this account? Its existing sessions will be revoked.`)) mutate('patch', `/admin/users/${member._id}/status`, { isActive: !member.isActive }); }}>{member.isActive ? 'Deactivate' : 'Activate'}</Button></TableCell></TableRow>) : data.donations?.map(d => <TableRow key={d._id}><TableCell>{d.title}<Typography variant="caption" display="block">{d.location.address.city}</Typography></TableCell><TableCell><StatusChip status={d.status} /></TableCell><TableCell>{d.donor?.profile?.organization || d.donor?.profile?.firstName || 'Account unavailable'}</TableCell><TableCell><Button component={Link} to={`/donations/${d._id}`}>View</Button><Button color="error" disabled={busy} onClick={() => { if (window.confirm('Remove this listing as an administrator? Participants will be notified.')) mutate('delete', `/admin/donations/${d._id}`); }}>Remove</Button></TableCell></TableRow>)}
    </TableBody></Table></TableContainer>{!(tab === 0 ? data.users?.length : data.donations?.length) && <Box sx={{ p: 4, textAlign: 'center' }}>No matching records.</Box>}</Card>}
    {data?.totalPages > 1 && <Pagination sx={{ mt: 3 }} page={page} count={data.totalPages} onChange={(event, value) => setPage(value)} />}
  </Box>;
}
