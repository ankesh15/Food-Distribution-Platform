import React from 'react';
import { Alert, Button, Box, CircularProgress, Typography } from '@mui/material';
export default function PageFeedback({ loading, error, empty, onRetry }) {
  if (loading) return <Box role="status" aria-label="Loading" sx={{ py: 6, textAlign: 'center' }}><CircularProgress /><Typography sx={{ mt: 2 }}>Loading your data…</Typography></Box>;
  if (error) return <Alert severity="error" action={onRetry && <Button color="inherit" onClick={onRetry}>Retry</Button>}>{error}</Alert>;
  return empty ? <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'white', border: '1px dashed #cbd5e1', borderRadius: 3 }}><Typography color="text.secondary">{empty}</Typography></Box> : null;
}
