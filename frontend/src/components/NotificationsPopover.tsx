import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Divider, CircularProgress, Popover, Badge } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: number;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ anchorEl, onClose }) => {
  const open = Boolean(anchorEl);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/notifications`);
      setNotifications(res.data);
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{
        sx: {
          mt: 1,
          width: 320,
          maxHeight: 400,
          overflowY: 'auto',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          p: 1,
        },
      }}
    >
      <Typography variant="h6" sx={{ px: 1.5, py: 1 }}>
        Notifications
      </Typography>
      <Divider />
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, color: 'text.secondary' }}>
          <Badge color="secondary" badgeContent={0}>
            <Typography>No notifications</Typography>
          </Badge>
        </Box>
      ) : (
        <List disablePadding>
          {notifications.map((n) => (
            <React.Fragment key={n.id}>
              <ListItem alignItems="flex-start" sx={{ bgcolor: n.is_read ? 'transparent' : 'rgba(102,126,234,0.08)' }}>
                <ListItemText
                  primary={n.content}
                  secondary={new Date(n.created_at).toLocaleString()}
                  primaryTypographyProps={{ fontWeight: n.is_read ? 400 : 600 }}
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
    </Popover>
  );
};

export default NotificationsPopover; 