import React from 'react';
import { Chip } from '@mui/material';
export default function StatusChip({ status }) {
  const color = { available: 'success', claimed: 'warning', 'picked-up': 'info', completed: 'success', cancelled: 'default', expired: 'error', open: 'info', committed: 'warning', filled: 'success' }[status] || 'default';
  return <Chip size="small" color={color} label={(status || 'unknown').replace('-', ' ')} sx={{ textTransform: 'capitalize', fontWeight: 700 }} />;
}
