import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Stack, Button, Card, CardContent, Grid, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, Pagination } from '@mui/material';
import { useAuth, apiError } from '../context/AuthContext';
import PageFeedback from '../components/PageFeedback';
import StatusChip from '../components/StatusChip';
const initial = { title: '', description: '', foodType: 'other', quantity: '', location: '', urgency: 'medium' };
export default function Requests() {
  const { user, api } = useAuth();
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/requests', { params: { page } }); setRequests(data.requests); setTotalPages(data.totalPages); setError(''); }
    catch (err) { setError(apiError(err)); } finally { setLoading(false); }
  }, [api, page]);
  useEffect(() => { load(); }, [load]);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setFormError('');
    try { await api.post('/requests', form); setOpen(false); setForm(initial); await load(); }
    catch (err) { setFormError(apiError(err)); } finally { setBusy(false); }
  };
  const transition = async (request, status) => {
    setBusy(true); setError('');
    try {
      if (status === 'commit') await api.post(`/requests/${request._id}/commit`);
      else await api.patch(`/requests/${request._id}/status`, { status });
      await load();
    } catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  };
  return <Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" sx={{ mb: 3 }}><Box><Typography component="h1" variant="h2">Community food requests</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Tell local donors what your community needs, and coordinate a supply commitment.</Typography></Box>{['recipient', 'admin'].includes(user.role) && <Button variant="contained" onClick={() => { setFormError(''); setOpen(true); }}>Submit request</Button>}</Stack>
    <PageFeedback loading={loading} error={error} onRetry={load} empty={!requests.length && 'No community requests yet. New requests will appear here.'} />
    {!loading && <Grid container spacing={3} sx={{ mt: 1 }}>{requests.map(request => <Grid key={request._id} size={{ xs: 12, md: 6, lg: 4 }}><Card sx={{ height: '100%' }}><CardContent sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}><StatusChip status={request.status} /><Typography variant="caption" sx={{ color: request.urgency === 'high' ? '#b91c1c' : '#475569', py: 0.5 }}>{request.urgency} priority</Typography></Stack>
      <Typography component="h2" variant="h3">{request.title}</Typography><Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>{request.recipient?.profile?.organization || request.recipient?.profile?.firstName || 'Community member'}</Typography><Typography sx={{ my: 2 }}>{request.description}</Typography><Typography fontWeight={700}>{request.quantity}</Typography><Typography color="text.secondary">{request.location}</Typography>
      {[['Recipient', request.recipient], ['Donor', request.committedBy]].map(([label, member]) => member?.profile?.phone ? <Typography variant="body2" sx={{ mt: 1 }} key={label}>{label}: <a href={`tel:${member.profile.phone}`}>{member.profile.phone}</a></Typography> : null)}
      {request.committedBy && <Typography variant="body2" sx={{ mt: 2 }}>Supplies committed by {request.committedBy.profile?.organization || request.committedBy.profile?.firstName || 'a donor'}. Coordinate collection directly.</Typography>}
      {['donor', 'admin'].includes(user.role) && request.status === 'open' && request.recipient?._id !== user._id && <Button disabled={busy} variant="outlined" sx={{ mt: 2 }} onClick={() => transition(request, 'commit')}>Commit supplies</Button>}
      {request.recipient?._id === user._id && ['open', 'committed'].includes(request.status) && <Stack direction="row" spacing={1} sx={{ mt: 2 }}>{request.status === 'committed' && <Button disabled={busy} onClick={() => transition(request, 'filled')}>Confirm received</Button>}<Button color="error" disabled={busy} onClick={() => transition(request, 'cancelled')}>Cancel request</Button></Stack>}
    </CardContent></Card></Grid>)}</Grid>}
    {totalPages > 1 && <Pagination sx={{ mt: 3 }} page={page} count={totalPages} onChange={(event, value) => setPage(value)} />}
    <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="sm" aria-labelledby="request-title"><Box component="form" onSubmit={submit}><DialogTitle id="request-title">What does your community need?</DialogTitle><DialogContent>
      {formError && <Alert severity="error">{formError}</Alert>}
      {[
        ['title', 'Request title', 100, true], ['description', 'Requirements and dietary needs', 500, false], ['quantity', 'Quantity, including units', 80, true], ['location', 'Collection area', 200, true]
      ].map(([key, label, maxLength, required]) => <TextField key={key} label={label} value={form[key]} onChange={event => setForm(prev => ({ ...prev, [key]: event.target.value }))} required={required} inputProps={{ maxLength }} multiline={key === 'description'} rows={key === 'description' ? 3 : 1} margin="normal" fullWidth />)}
      <TextField select fullWidth margin="normal" label="Food category" value={form.foodType} onChange={event => setForm(prev => ({ ...prev, foodType: event.target.value }))}>{['prepared', 'fresh', 'canned', 'frozen', 'baked', 'dairy', 'produce', 'meat', 'pantry', 'other'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
      <TextField select fullWidth margin="normal" label="Priority" value={form.urgency} onChange={event => setForm(prev => ({ ...prev, urgency: event.target.value }))}>{['low', 'medium', 'high'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
    </DialogContent><DialogActions><Button disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Publishing…' : 'Publish request'}</Button></DialogActions></Box></Dialog>
  </Box>;
}
