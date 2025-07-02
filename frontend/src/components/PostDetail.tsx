import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  Avatar,
  Divider,
  IconButton,
  Fade,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Description as DescriptionIcon,
  CalendarMonth as CalendarIcon,
  Public as PublicIcon,
  Map as MapIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Sms as SmsIcon,
  ContentCopy as ContentCopyIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Post {
  id: number;
  post_type: 'seeking' | 'offering';
  name: string;
  email: string;
  contact_email?: string;
  contact_phone?: string;
  subject: string;
  level: string;
  location: string;
  format: string;
  description: string;
  image_urls?: string[];
  created_at: string;
  coordinates?: [number, number];
}

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  
  // Contact menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const contactMenuOpen = Boolean(anchorEl);

  console.log('PostDetail component loaded with ID:', id);

  useEffect(() => {
    fetchPost();
  }, [id]);

  useEffect(() => {
    if (post && post.format.toLowerCase() !== 'online') {
      geocodeLocation(post.location);
    }
  }, [post]);

  const fetchPost = async () => {
    if (!id) {
      console.error('No ID provided');
      setError(true);
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching post with ID:', id);
      const response = await axios.get(`http://localhost:3001/api/posts/${id}`);
      console.log('Post data received:', response.data);
      setPost(response.data);
    } catch (error) {
      console.error('Error fetching post:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error details:', error.response?.data);
        console.error('Error status:', error.response?.status);
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const geocodeLocation = async (location: string) => {
    console.log(`📍 PostDetail: Geocoding location: ${location}`);
    setMapLoading(true);
    
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`📍 PostDetail: Geocoding timeout for ${location}`);
        controller.abort();
      }, 5000);

      const response = await fetch(
        `http://localhost:3001/api/geocode?location=${encodeURIComponent(location)}`,
        {
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`📍 PostDetail: Geocoding response for ${location}:`, data);
      
      if (data && data.length > 0) {
        const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        console.log(`📍 PostDetail: Successfully geocoded ${location}:`, coords);
        setCoordinates(coords);
      } else {
        console.log(`📍 PostDetail: No results found for ${location}`);
        // Set a default coordinate so map still shows something
        setCoordinates([37.7749, -122.4194]); // San Francisco default
      }
    } catch (error) {
      console.error(`📍 PostDetail: Geocoding error for ${location}:`, error);
      // Set a default coordinate so map still shows something
      setCoordinates([37.7749, -122.4194]); // San Francisco default
    } finally {
      setMapLoading(false);
    }
  };

  const getLocationRadius = (location: string) => {
    // Determine radius based on location type
    const locationLower = location.toLowerCase();
    
    // Large cities get bigger circles
    if (locationLower.includes('new york') || locationLower.includes('nyc') || 
        locationLower.includes('los angeles') || locationLower.includes('chicago') ||
        locationLower.includes('houston') || locationLower.includes('phoenix') ||
        locationLower.includes('philadelphia') || locationLower.includes('san antonio')) {
      return 15000; // 15km radius for major cities
    }
    
    // Medium cities
    if (locationLower.includes('city') || locationLower.includes('francisco') ||
        locationLower.includes('boston') || locationLower.includes('seattle') ||
        locationLower.includes('denver') || locationLower.includes('miami')) {
      return 8000; // 8km radius for medium cities
    }
    
    // State or region mentions
    if (locationLower.includes('county') || locationLower.includes('state') ||
        locationLower.includes('region') || locationLower.includes('area')) {
      return 25000; // 25km radius for regions
    }
    
    // Default for towns/specific areas
    return 5000; // 5km radius for towns
  };

  const createCustomIcon = (postType: 'seeking' | 'offering') => {
    const color = postType === 'seeking' ? '#f59e0b' : '#10b981';
    const svgIcon = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/>
        <circle cx="20" cy="20" r="8" fill="white"/>
      </svg>
    `;
    
    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });
  };

  const getAvatarColor = (postType: string) => {
    return postType === 'seeking' 
      ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  };

  const formatLevel = (level: string) => {
    const levelMap: { [key: string]: string } = {
      'elementary': 'Elementary',
      'middle': 'Middle School',
      'high': 'High School',
      'college': 'College',
      'adult': 'Adult Education'
    };
    return levelMap[level] || level;
  };

  const formatFormat = (format: string) => {
    const formatMap: { [key: string]: string } = {
      'online': 'Online',
      'in-person': 'In-Person',
      'both': 'Both Online & In-Person'
    };
    return formatMap[format] || format;
  };

  const handleContactClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleContactClose = () => {
    setAnchorEl(null);
  };

  const handleEmailContact = () => {
    if (!post) return;
    if (!post.contact_email) {
      setSnackbarMessage('Email not provided for this post.');
      setSnackbarOpen(true);
      return;
    }
    const p = post!;
    const mailtoLink = `mailto:${p.contact_email}?subject=${encodeURIComponent(`Re: ${p.subject} Tutoring`)}&body=${encodeURIComponent(`Hi ${p.name},\n\nI'm interested in your ${p.subject} tutoring post. Let's discuss!\n\nBest regards`)}`;
    window.location.href = mailtoLink;
    handleContactClose();
  };

  const handleSmsContact = () => {
    if (!post) return;
    if (!post.contact_phone) {
      setSnackbarMessage('Phone number not provided for this post.');
      setSnackbarOpen(true);
      return;
    }
    const p = post!;
    const smsText = `Hi ${p.name}, I'm interested in your ${p.subject} tutoring post. Let's discuss!`;
    const smsLink = `sms:${p.contact_phone}?body=${encodeURIComponent(smsText)}`;
    window.location.href = smsLink;
    handleContactClose();
    setSnackbarMessage('SMS template copied. Add recipient phone number.');
    setSnackbarOpen(true);
  };

  const handleCopyEmail = async () => {
    if (!post) return;
    try {
      const p = post!;
      await navigator.clipboard.writeText(p.contact_email || '');
      setSnackbarMessage('Email address copied to clipboard!');
      setSnackbarOpen(true);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      const p = post!;
      textArea.value = p.contact_email || '';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setSnackbarMessage('Email address copied to clipboard!');
      setSnackbarOpen(true);
    }
    handleContactClose();
  };

  const handleCallContact = () => {
    if (!post) return;
    // Note: This requires phone number, but we only have email
    // This is a placeholder
    setSnackbarMessage('Phone number not available. Try email instead.');
    setSnackbarOpen(true);
    handleContactClose();
  };

  const handleSiteMessage = async () => {
    if (!post) return;
    // TODO require auth check on site; assume user must login elsewhere
    try {
      await axios.post('http://localhost:3001/api/conversations', {
        participant_id: post.id,
        post_id: post.id,
      });
      navigate('/messages');
    } catch(err){console.error(err);} 
    handleContactClose();
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <SchoolIcon sx={{ fontSize: 48, color: '#667eea' }} />
          </motion.div>
          <Typography sx={{ mt: 2, color: '#667eea', fontWeight: 600 }}>
            Loading post details...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error || !post) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Post not found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            The post you're looking for doesn't exist or has been removed.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            startIcon={<ArrowBackIcon />}
          >
            Back to Home
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
            sx={{ borderRadius: '12px' }}
          >
            Back to Posts
          </Button>
        </Box>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: coordinates ? { xs: '1fr', lg: '2fr 1fr' } : '1fr',
          gap: 4,
        }}>
          {/* Main Post Details */}
          <Box>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              {/* Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
                <Avatar
                  sx={{
                    background: getAvatarColor(post.post_type),
                    width: 80,
                    height: 80,
                    fontSize: '2rem',
                  }}
                >
                  {post.post_type === 'seeking' ? '🔍' : '🎓'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Chip
                      label={post.post_type === 'seeking' ? 'Looking for Tutor' : 'Offering Services'}
                      color={post.post_type === 'seeking' ? 'warning' : 'success'}
                      sx={{ fontWeight: 600, fontSize: '0.9rem', px: 2, py: 1 }}
                    />
                    {post.format.toLowerCase() === 'both' && (
                      <Chip
                        label="Flexible Format"
                        variant="outlined"
                        sx={{ 
                          fontWeight: 500,
                          color: '#667eea',
                          borderColor: '#667eea'
                        }}
                      />
                    )}
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    {post.subject} Tutoring
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    {formatLevel(post.level)} Level
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Details Grid */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                gap: 3, 
                mb: 4 
              }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <PersonIcon sx={{ color: '#667eea', fontSize: 24 }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Contact Person
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {post.name}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <LocationIcon sx={{ color: '#667eea', fontSize: 24 }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Location
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {post.location}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <ScheduleIcon sx={{ color: '#667eea', fontSize: 24 }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Format
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {formatFormat(post.format)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <CalendarIcon sx={{ color: '#667eea', fontSize: 24 }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Posted On
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {new Date(post.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Description */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <DescriptionIcon sx={{ color: '#667eea', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Details
                  </Typography>
                </Box>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    background: 'rgba(102, 126, 234, 0.05)',
                    p: 3,
                    borderRadius: '12px',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                  }}
                >
                  {post.description}
                </Typography>

                {/* Post Images */}
                {post.image_urls && post.image_urls.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#667eea' }}>
                      Images
                    </Typography>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                      gap: 2 
                    }}>
                      {post.image_urls.map((imageUrl, index) => (
                        <Box
                          key={index}
                          sx={{
                            borderRadius: '12px',
                            overflow: 'hidden',
                            aspectRatio: '16/9',
                            position: 'relative',
                            border: '1px solid rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.02)',
                            },
                          }}
                          onClick={() => window.open(imageUrl, '_blank')}
                        >
                          <img
                            src={imageUrl}
                            alt={`Post image ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              // Hide image if it fails to load
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Contact Button */}
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<KeyboardArrowDownIcon />}
                  onClick={handleContactClick}
                  sx={{
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Contact {post?.name || 'User'}
                </Button>

                <Menu
                  anchorEl={anchorEl}
                  open={contactMenuOpen}
                  onClose={handleContactClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                  }}
                  sx={{
                    '& .MuiPaper-root': {
                      borderRadius: '16px',
                      mt: 1,
                      minWidth: 200,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    },
                  }}
                >
                  {post.contact_email && (
                    <MenuItem onClick={handleEmailContact} sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <EmailIcon sx={{ color: '#667eea' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Send Email" 
                        secondary="Open mail app"
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </MenuItem>
                  )}

                  {post.contact_phone && (
                    <MenuItem onClick={handleSmsContact} sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <SmsIcon sx={{ color: '#10b981' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Text Message" 
                        secondary="Open SMS app"
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </MenuItem>
                  )}

                  {post.contact_email && (
                    <MenuItem onClick={handleCopyEmail} sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <ContentCopyIcon sx={{ color: '#f59e0b' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Copy Email" 
                        secondary={post.contact_email || ''}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </MenuItem>
                  )}

                  <MenuItem onClick={handleCallContact} sx={{ py: 1.5 }}>
                    <ListItemIcon>
                      <PhoneIcon sx={{ color: '#ef4444' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Call" 
                      secondary="Phone number needed"
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </MenuItem>

                  {post && (
                    <MenuItem onClick={handleSiteMessage} sx={{ py:1.5 }}>
                      <ListItemIcon>
                        <MessageIcon sx={{ color:'#764ba2' }} />
                      </ListItemIcon>
                      <ListItemText primary="Message on TutorConnect" secondary="Open chat" secondaryTypographyProps={{variant:'caption'}} />
                    </MenuItem>
                  )}
                </Menu>
              </Box>
            </Paper>
          </Box>

          {/* Location Map */}
          {post.format.toLowerCase() !== 'online' && (
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  height: 'fit-content',
                  position: 'sticky',
                  top: 20,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <MapIcon sx={{ color: '#667eea', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Location
                  </Typography>
                </Box>

                {mapLoading ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <LocationIcon sx={{ fontSize: 32, color: '#667eea' }} />
                    </motion.div>
                    <Typography sx={{ mt: 1, color: '#667eea', fontSize: '0.9rem' }}>
                      Loading map...
                    </Typography>
                  </Box>
                ) : coordinates ? (
                  <Box sx={{ borderRadius: '16px', overflow: 'hidden', height: 400 }}>
                    <MapContainer
                      center={coordinates}
                      zoom={12}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                      maxBounds={[[-90, -180], [90, 180]]}
                      maxBoundsViscosity={0.8}
                      minZoom={1}
                      maxZoom={18}
                      worldCopyJump={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      
                      {/* Location Circle */}
                      <Circle
                        center={coordinates}
                        radius={getLocationRadius(post.location)}
                        pathOptions={{
                          color: post.post_type === 'seeking' ? '#f59e0b' : '#10b981',
                          fillColor: post.post_type === 'seeking' ? '#f59e0b' : '#10b981',
                          fillOpacity: 0.2,
                          weight: 2,
                        }}
                      />
                      
                      {/* Center Marker */}
                      <Marker
                        position={coordinates}
                        icon={createCustomIcon(post.post_type)}
                      >
                        <Popup>
                          <Box sx={{ p: 1, minWidth: 200 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                              {post.subject} Tutoring
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>{post.name}</strong>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {post.location}
                            </Typography>
                          </Box>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <LocationIcon sx={{ fontSize: 32, color: '#ccc', mb: 1 }} />
                    <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                      Location not found
                    </Typography>
                  </Box>
                )}

                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ mt: 2, textAlign: 'center', fontSize: '0.8rem' }}
                >
                  {coordinates ? 
                    `Showing ${post.location} area` : 
                    'Unable to locate on map'
                  }
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>
      </motion.div>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success" 
          sx={{ borderRadius: '12px' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PostDetail; 