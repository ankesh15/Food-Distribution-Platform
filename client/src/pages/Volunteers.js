import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Grid, Stack, Alert, Pagination } from '@mui/material';
import { useTracking } from '../context/TrackingContext';
import PageFeedback from '../components/PageFeedback';
import StatusChip from '../components/StatusChip';
export default function Volunteers() {
  const { activeDeliveries, loading, error, refresh, page, setPage, totalPages } = useTracking();
  return <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 3 }}><Box><Typography variant="h2" component="h1">Pickup coordination</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Your reserved food and collections in progress.</Typography></Box><Button onClick={refresh}>Refresh</Button></Stack>
    <Alert severity="info" sx={{ mb: 3 }}>Recipients collect the donations they claim during the donor’s pickup window. Open a donation to confirm pickup or completion and see participant contact details.</Alert>
    <PageFeedback loading={loading} error={error} onRetry={refresh} empty={!activeDeliveries.length && 'No active pickups. Claim available food or wait for a recipient to reserve your donation.'} />
    {!loading && !error && <Grid container spacing={3}>{activeDeliveries.map(d => <Grid key={d._id} size={{ xs: 12, md: 6 }}><Card><CardContent sx={{ p: 3 }}><Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}><Typography component="h2" variant="h3">{d.title}</Typography><StatusChip status={d.status} /></Stack><Typography color="text.secondary">{d.location.address.street}, {d.location.address.city}</Typography><Typography sx={{ mt: 2 }}>{new Date(d.pickupWindow.startTime).toLocaleString()} – {new Date(d.pickupWindow.endTime).toLocaleString()}</Typography><Typography variant="body2" sx={{ mt: 1 }}>Donor: {d.donor?.profile?.organization || d.donor?.profile?.firstName || 'Account unavailable'}</Typography><Typography variant="body2">Recipient: {d.claimedBy?.recipient?.profile?.organization || d.claimedBy?.recipient?.profile?.firstName || 'Account unavailable'}</Typography><Button component={Link} to={`/donations/${d._id}`} variant="contained" sx={{ mt: 3 }}>Manage collection</Button></CardContent></Card></Grid>)}</Grid>}
    {totalPages > 1 && <Pagination sx={{ mt: 3 }} count={totalPages} page={page} onChange={(event, value) => setPage(value)} />}
  </Box>;
}
