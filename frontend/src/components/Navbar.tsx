import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  Badge,
} from '@mui/material';
import { 
  School as SchoolIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  SportsEsports as GameIcon,
  SmartToy as BotIcon,
  Group as GroupIcon,
  KeyboardArrowDown as ArrowIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginDialog from './auth/LoginDialog';
import RegisterDialog from './auth/RegisterDialog';
import NotificationsPopover from './NotificationsPopover';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [gameMenuAnchor, setGameMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

  const handleFindTutors = () => {
    // Check if we're not on the home page
    if (window.location.pathname !== '/') {
      // Navigate to home page first, then scroll to posts section
      navigate('/');
      // Use a small delay to ensure the page has loaded before scrolling
      setTimeout(() => {
        const postsSection = document.getElementById('posts-section');
        if (postsSection) {
          postsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      // We're already on the home page, just scroll to the posts section
      const postsSection = document.getElementById('posts-section');
      if (postsSection) {
        postsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleGameMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setGameMenuAnchor(event.currentTarget);
  };

  const handleGameMenuClose = () => {
    setGameMenuAnchor(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleGameSelect = (path: string) => {
    navigate(path);
    handleGameMenuClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleUserMenuClose();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSwitchToRegister = () => {
    setLoginDialogOpen(false);
    setRegisterDialogOpen(true);
  };

  const handleSwitchToLogin = () => {
    setRegisterDialogOpen(false);
    setLoginDialogOpen(true);
  };

  return (
    <>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Toolbar sx={{ py: 1, justifyContent: 'space-between' }}>
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                }}
                onClick={() => navigate('/')}
              >
                <SchoolIcon sx={{ color: '#667eea', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography 
                  variant="h4" 
                  component="div" 
                  sx={{ 
                    fontWeight: 700,
                    fontSize: '1.8rem',
                    color: 'white',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/')}
                >
                  TutorConnect
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                >
                  Connect • Learn • Grow
                </Typography>
              </Box>
            </Box>
          </motion.div>

          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                startIcon={<GameIcon />}
                endIcon={<ArrowIcon />}
                onClick={handleGameMenuOpen}
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  borderRadius: '25px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Connect 4
              </Button>
              
              <Button
                startIcon={<LocationIcon />}
                onClick={handleFindTutors}
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  borderRadius: '25px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Find Tutors
              </Button>

              {user ? (
                // Authenticated user menu
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    sx={{
                      color: 'white',
                      background: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                    onClick={() => navigate('/messages')}
                  >
                    <Badge badgeContent={0} color="error">
                      <MessageIcon />
                    </Badge>
                  </IconButton>
                  
                  <IconButton
                    sx={{
                      color: 'white',
                      background: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                    onClick={(e) => setNotificationAnchor(e.currentTarget)}
                  >
                    <Badge badgeContent={0} color="error">
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>

                  <Button
                    onClick={handleUserMenuOpen}
                    sx={{
                      color: 'white',
                      fontWeight: 600,
                      px: 2,
                      py: 1,
                      borderRadius: '25px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.3s ease',
                      textTransform: 'none',
                    }}
                  >
                    <Avatar
                      src={user.avatar_url}
                      sx={{ 
                        width: 28, 
                        height: 28, 
                        mr: 1,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                    {user.name}
                    <ArrowIcon sx={{ ml: 1 }} />
                  </Button>
                </Box>
              ) : (
                // Guest user buttons
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    startIcon={<LoginIcon />}
                    onClick={() => setLoginDialogOpen(true)}
                    sx={{
                      color: 'white',
                      fontWeight: 600,
                      px: 3,
                      py: 1,
                      borderRadius: '25px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Sign In
                  </Button>
                  
                  <Button
                    startIcon={<PersonAddIcon />}
                    onClick={() => setRegisterDialogOpen(true)}
                    sx={{
                      color: '#667eea',
                      fontWeight: 600,
                      px: 3,
                      py: 1,
                      borderRadius: '25px',
                      background: 'white',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.9)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Sign Up
                  </Button>
                </Box>
              )}
            </Box>
          </motion.div>

          {/* Game Menu */}
          <Menu
            anchorEl={gameMenuAnchor}
            open={Boolean(gameMenuAnchor)}
            onClose={handleGameMenuClose}
            PaperProps={{
              sx: {
                borderRadius: '16px',
                mt: 1,
                minWidth: 200,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <MenuItem 
              onClick={() => handleGameSelect('/connect4')}
              sx={{ 
                borderRadius: '8px', 
                mx: 1, 
                mb: 1,
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                }
              }}
            >
              <ListItemIcon>
                <BotIcon sx={{ color: '#10b981' }} />
              </ListItemIcon>
              <ListItemText 
                primary="vs AI Bot" 
                secondary="Challenge the computer"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
            </MenuItem>
            <MenuItem 
              onClick={() => handleGameSelect('/connect4-2player')}
              sx={{ 
                borderRadius: '8px', 
                mx: 1,
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                }
              }}
            >
              <ListItemIcon>
                <GroupIcon sx={{ color: '#667eea' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Two Players" 
                secondary="Play with a friend"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
            </MenuItem>
          </Menu>

          {/* User Menu */}
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            PaperProps={{
              sx: {
                borderRadius: '16px',
                mt: 1,
                minWidth: 220,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                Signed in as
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem 
              onClick={handleUserMenuClose}
              sx={{ 
                borderRadius: '8px', 
                mx: 1, 
                mt: 1,
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                }
              }}
            >
              <ListItemIcon>
                <PersonIcon sx={{ color: '#667eea' }} />
              </ListItemIcon>
              <ListItemText primary="Profile" />
            </MenuItem>
            <MenuItem 
              onClick={() => { handleUserMenuClose(); navigate('/settings'); }}
              sx={{ 
                borderRadius: '8px', 
                mx: 1,
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                }
              }}
            >
              <ListItemIcon>
                <SettingsIcon sx={{ color: '#667eea' }} />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </MenuItem>
            <Divider sx={{ my: 1 }} />
            <MenuItem 
              onClick={handleLogout}
              sx={{ 
                borderRadius: '8px', 
                mx: 1, 
                mb: 1,
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                }
              }}
            >
              <ListItemIcon>
                <LogoutIcon sx={{ color: '#ef4444' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Sign Out" 
                primaryTypographyProps={{ color: '#ef4444' }}
              />
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Authentication Dialogs */}
      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onSwitchToRegister={handleSwitchToRegister}
      />
      
      <RegisterDialog
        open={registerDialogOpen}
        onClose={() => setRegisterDialogOpen(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />

      {/* Notifications Popover */}
      <NotificationsPopover
        anchorEl={notificationAnchor}
        onClose={() => setNotificationAnchor(null)}
      />
    </>
  );
};

export default Navbar; 