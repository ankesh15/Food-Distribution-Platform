import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Box, Typography, Button, IconButton, Badge, Menu, MenuItem, Divider, TextField, InputAdornment } from '@mui/material';
import { Menu as MenuIcon, Bell, Search, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobile, setMobile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const links = user ? [['Dashboard', '/dashboard'], ['Food feed', '/donations'], ['Requests', '/requests'], ['Pickups', '/volunteers'], ['Analytics', '/analytics'], ['Map', '/map']] : [['Home', '/'], ['Browse food', '/donations'], ['How it works', '/#features']];
  const signOut = async () => { setProfile(null); setMobile(null); await logout(); navigate('/'); };
  return <AppBar component="nav" position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,.96)', borderBottom: '1px solid #e2e8f0', backdropFilter: 'blur(12px)' }}>
    <Toolbar sx={{ width: '100%', maxWidth: 1440, mx: 'auto', gap: { xs: 1, lg: 2 } }}>
      <Box component={Link} to={user ? '/dashboard' : '/'} aria-label="FoodShare home" sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: '#0f172a', flexShrink: 0 }}><Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: '#047857', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 900 }}>F</Box><Typography fontSize={19} fontWeight={800}>Food<span style={{ color: '#047857' }}>Share</span></Typography></Box>
      <Box sx={{ display: { xs: 'none', lg: 'flex' }, flex: 1, gap: 0.25 }}>{links.map(([label, path]) => <Button key={path} component={Link} to={path} aria-current={location.pathname === path ? 'page' : undefined} sx={{ color: location.pathname === path ? '#047857' : '#475569', bgcolor: location.pathname === path ? '#ecfdf5' : undefined, px: 1.25 }}>{label}</Button>)}</Box>
      <Box component="form" onSubmit={event => { event.preventDefault(); navigate(`/donations?search=${encodeURIComponent(query.trim())}`); }} sx={{ display: { xs: 'none', xl: 'block' }, maxWidth: 180 }}><TextField size="small" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find food…" inputProps={{ 'aria-label': 'Search donations', maxLength: 100 }} InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }} /></Box>
      <Box sx={{ flex: { xs: 1, lg: 0 } }} />
      {user ? <><IconButton component={Link} to="/notifications" aria-label={`Notifications, ${unreadCount} unread`}><Badge badgeContent={unreadCount} color="error" max={99}><Bell size={21} /></Badge></IconButton><IconButton aria-label="Account menu" aria-controls={profile ? 'account-menu' : undefined} aria-expanded={Boolean(profile)} onClick={event => setProfile(event.currentTarget)}><UserRound size={21} /></IconButton></> : <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}><Button component={Link} to="/login">Sign in</Button><Button component={Link} to="/register" variant="contained">Join the community</Button></Box>}
      <IconButton sx={{ display: { lg: 'none' } }} aria-label="Navigation menu" aria-expanded={Boolean(mobile)} aria-controls={mobile ? 'navigation-menu' : undefined} onClick={event => setMobile(event.currentTarget)}><MenuIcon size={22} /></IconButton>
      <Menu id="account-menu" anchorEl={profile} open={Boolean(profile)} onClose={() => setProfile(null)}><MenuItem component={Link} to="/profile" onClick={() => setProfile(null)}>Profile & preferences</MenuItem>{user?.role === 'admin' && <MenuItem component={Link} to="/admin" onClick={() => setProfile(null)}>Administration</MenuItem>}<Divider /><MenuItem onClick={signOut}>Sign out</MenuItem></Menu>
      <Menu id="navigation-menu" anchorEl={mobile} open={Boolean(mobile)} onClose={() => setMobile(null)}>{links.map(([label, path]) => <MenuItem key={path} component={Link} to={path} onClick={() => setMobile(null)}>{label}</MenuItem>)}<Divider />{!user ? [<MenuItem key="login" component={Link} to="/login" onClick={() => setMobile(null)}>Sign in</MenuItem>, <MenuItem key="register" component={Link} to="/register" onClick={() => setMobile(null)}>Create account</MenuItem>] : <MenuItem onClick={signOut}>Sign out</MenuItem>}</Menu>
    </Toolbar>
  </AppBar>;
}
