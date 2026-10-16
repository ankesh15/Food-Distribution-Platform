import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Grid, Typography, Stack } from '@mui/material';
import { useAuth, apiError } from '../context/AuthContext';
import PageFeedback from '../components/PageFeedback';
export default function Analytics() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await api.get('/users/summary'); setData(response.data); setError(''); }
    catch (err) { setError(apiError(err)); } finally { setLoading(false); }
  }, [api]);
  useEffect(() => { load(); }, [load]);
  const total = Object.values(data?.states || {}).reduce((sum, value) => sum + value, 0);
  const months = Array.from({ length: 6 }, (_, i) => {
    const now = new Date(); const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
    const id = date.toISOString().slice(0, 7);
    return { _id: id, label: date.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' }), count: 0, completed: 0, ...data?.monthly.find(row => row._id === id) };
  });
  const max = Math.max(1, ...months.map(month => month.count));
  return <Box>
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}><Box><Typography component="h1" variant="h2">Impact you can measure</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Donation history for {data?.scope || 'your account'}, calculated from stored records.</Typography></Box><Button onClick={load}>Refresh</Button></Stack>
    <PageFeedback loading={loading} error={error} onRetry={load} />
    {data && !error && !loading && <>
      <Grid container spacing={2} sx={{ mb: 3 }}>{[['Total donations', total], ['Completed', data.states.completed || 0], ['Completion rate', `${total ? Math.round((data.states.completed || 0) / total * 100) : 0}%`]].map(([title, value]) => <Grid key={title} size={{ xs: 12, sm: 4 }}><Card><CardContent><Typography color="text.secondary">{title}</Typography><Typography variant="h2" sx={{ mt: 1 }}>{value}</Typography></CardContent></Card></Grid>)}</Grid>
      <Card sx={{ mb: 3 }}><CardContent sx={{ p: 3 }}><Typography component="h2" variant="h3" sx={{ mb: 1 }}>Six months of sharing</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Listings created each month (UTC). Completed counts refer to those listings.</Typography>
        {months.map(month => <Box key={month._id} sx={{ mb: 2 }}><Stack direction="row" justifyContent="space-between"><Typography variant="body2">{month.label}</Typography><Typography variant="body2">{month.count} listed · {month.completed} completed</Typography></Stack><Box role="img" aria-label={`${month.label}: ${month.count} listings, ${month.completed} completed`} sx={{ mt: 1, height: 12, borderRadius: 2, bgcolor: '#f1f5f9' }}><Box sx={{ height: '100%', borderRadius: 2, width: `${month.count / max * 100}%`, bgcolor: '#047857' }} /></Box></Box>)}
      </CardContent></Card>
      <Card><CardContent sx={{ p: 3 }}><Typography component="h2" variant="h3" sx={{ mb: 2 }}>Food successfully redistributed</Typography>{data.quantities.length ? <Stack direction="row" useFlexGap flexWrap="wrap" spacing={3}>{data.quantities.map(q => <Box key={q._id}><Typography variant="h2">{Number(q.amount.toFixed(2)).toLocaleString()}</Typography><Typography color="text.secondary">{q._id}</Typography></Box>)}</Stack> : <Typography color="text.secondary">Completed donations will appear here.</Typography>}<Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>Quantities remain in their original units. Environmental savings and meal equivalents require measured weights and are not inferred from listing counts.</Typography></CardContent></Card>
    </>}
  </Box>;
}
