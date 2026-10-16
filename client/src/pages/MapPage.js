import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Box, Typography, Button, Stack, Alert, Switch, FormControlLabel } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth, apiError } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';
import PageFeedback from '../components/PageFeedback';
const point = d => {
  const [lng, lat] = d.location?.coordinates?.coordinates || [];
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90 && (lng !== 0 || lat !== 0) ? [lat, lng] : null;
};
export default function MapPage() {
  const { api } = useAuth();
  const { activeDeliveries } = useTracking();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/donations', { params: { status: 'available', limit: 100 } }); setDonations(data.donations); setError(''); }
    catch (err) { setError(apiError(err)); } finally { setLoading(false); }
  }, [api]);
  useEffect(() => { load(); }, [load]);
  const records = [...new Map([...(available ? donations : []), ...activeDeliveries].map(d => [d._id, d])).values()];
  const mapped = records.filter(point);
  return <Box>
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}><Box><Typography component="h1" variant="h2">Food near your community</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Available listings and your active pickup locations.</Typography></Box><Button onClick={load}>Refresh</Button></Stack>
    <Alert severity="info" sx={{ mb: 2 }}>Only stored, valid coordinates appear on the map. {records.length - mapped.length} of {records.length} loaded listings have no mapped location. Browse the food feed for their addresses. Up to 100 available listings are shown.</Alert>
    <FormControlLabel control={<Switch checked={available} onChange={event => setAvailable(event.target.checked)} />} label="Show available donations" />
    <PageFeedback loading={loading} error={error} onRetry={load} />
    {!loading && !error && (mapped.length ? <Box sx={{ height: { xs: 430, md: 580 }, overflow: 'hidden', borderRadius: 3, border: '1px solid #cbd5e1' }}>
      <MapContainer key={`${available}-${mapped[0]._id}`} center={point(mapped[0])} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {mapped.map(d => <CircleMarker key={d._id} center={point(d)} radius={10} pathOptions={{ color: d.status === 'available' ? '#047857' : '#b45309', fillOpacity: 0.8 }}><Popup><strong>{d.title}</strong><p>{d.location.address.street}, {d.location.address.city}</p><p>{d.quantity.amount} {d.quantity.unit} · {d.status}</p><Link to={`/donations/${d._id}`}>View donation</Link></Popup></CircleMarker>)}
      </MapContainer>
    </Box> : <PageFeedback empty="No listings with verified coordinates are available in this view yet. Addresses remain available on each donation." />)}
  </Box>;
}
