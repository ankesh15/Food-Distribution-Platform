import React from 'react';
import { Box, Typography, Button, Stack, Card, CardContent } from '@mui/material';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import PageFeedback from '../components/PageFeedback';
export default function Notifications() {
  const { notifications, unreadCount, loading, error, refresh, markAllAsRead, markAsRead, deleteNotification } = useNotifications();
  return <Box><Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: 3 }}><Box><Typography variant="h2" component="h1">Your inbox</Typography><Typography color="text.secondary">{unreadCount} unread · Latest 100 messages · Retained for 90 days</Typography></Box><Button onClick={markAllAsRead}>Mark all read</Button></Stack><PageFeedback loading={loading} error={error} onRetry={refresh} empty={!notifications.length && 'You’re all caught up. Updates about your donations and requests will appear here.'} /><Stack spacing={2} sx={{ mt: 2 }}>{notifications.map(n => <Card key={n.id} sx={{ borderLeft: n.read ? undefined : '4px solid #047857' }}><CardContent><Typography variant="h3" component="h2">{n.title}</Typography><Typography sx={{ my: 1 }}>{n.message}</Typography><Typography variant="caption" color="text.secondary">{new Date(n.timestamp).toLocaleString()}</Typography><Stack direction="row" spacing={1} sx={{ mt: 1 }}>{n.donationId && <Button component={Link} to={`/donations/${n.donationId}`}>View donation</Button>}{!n.read && <Button onClick={() => markAsRead(n.id)}>Mark read</Button>}<Button color="error" onClick={() => deleteNotification(n.id)}>Delete</Button></Stack></CardContent></Card>)}</Stack></Box>;
}
