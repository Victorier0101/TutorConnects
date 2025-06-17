import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Avatar,
  CardActions,
  IconButton,
  Fade,
  Menu,
  ListItemIcon,
  ListItemText,
  Grid,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Send as SendIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Description as DescriptionIcon,
  Map as MapIcon,
  ViewList as ListIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Public as PublicIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Sms as SmsIcon,
  ContentCopy as ContentCopyIcon,
  Phone as PhoneIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import MapComponent from './MapComponent';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import LoginDialog from './auth/LoginDialog';
import RegisterDialog from './auth/RegisterDialog';

interface Post {
  id: number;
  user_id?: number;
  post_type: 'seeking' | 'offering';
  name: string;
  email: string;
  subject: string;
  level: string;
  location: string;
  format: string;
  description: string;
  created_at: string;
  coordinates?: [number, number];
  avatar_url?: string;
  rating?: number;
  total_reviews?: number;
}

interface FormData {
  post_type: 'seeking' | 'offering';
  subject: string;
  level: string;
  location: string;
  format: string;
  description: string;
}

const Home = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState<FormData>({
    post_type: 'seeking',
    subject: '',
    level: '',
    location: '',
    format: '',
    description: '',
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Authentication dialogs
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  // Contact menu state
  const [contactMenus, setContactMenus] = useState<{ [key: number]: HTMLElement | null }>({});
  const [contactSnackbar, setContactSnackbar] = useState({
    open: false,
    message: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');

  const filterPosts = useCallback(() => {
    let filtered = posts;
    
    // Filter by post type
    if (filter !== 'all') {
      filtered = filtered.filter(post => post.post_type === filter);
    }
    
    // Filter by level
    if (levelFilter !== 'all') {
      filtered = filtered.filter(post => post.level === levelFilter);
    }
    
    // Filter by format
    if (formatFilter !== 'all') {
      filtered = filtered.filter(post => post.format.toLowerCase() === formatFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        post.subject.toLowerCase().includes(query) ||
        post.description.toLowerCase().includes(query) ||
        post.name.toLowerCase().includes(query) ||
        post.location.toLowerCase().includes(query) ||
        `grade ${post.level}`.includes(query) ||
        `${post.level} grade`.includes(query)
      );
    }
    
    setFilteredPosts(filtered);
  }, [posts, filter, levelFilter, formatFilter, searchQuery]);

  useEffect(() => {
    console.log('📝 Posts state updated:', posts);
    console.log('📝 Filtered posts:', filteredPosts);
  }, [posts, filteredPosts]);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [filterPosts]);

  const fetchPosts = async () => {
    console.log('🔄 Fetching posts...');
    setLoading(true);
    try {
      console.log('📡 Making API call to: http://localhost:3001/api/posts');
      const response = await axios.get('http://localhost:3001/api/posts');
      console.log('✅ API Response received:', response.data);
      console.log('📊 Number of posts:', response.data.length);
      setPosts(response.data);
      console.log('🔄 Posts set in state');
    } catch (error: any) {
      console.error('❌ Error fetching posts:', error);
      console.error('📍 Error details:', error.response?.data || error.message);
      setSnackbar({
        open: true,
        message: 'Failed to load posts. Please try again.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
      console.log('🏁 Fetch posts completed');
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (event: any) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Check if user is authenticated
    if (!user) {
      setSnackbar({
        open: true,
        message: 'Please log in to create a post.',
        severity: 'error',
      });
      setLoginDialogOpen(true);
      return;
    }

    setSubmitLoading(true);

    try {
      await axios.post('http://localhost:3001/api/posts', formData);
      
      setSnackbar({
        open: true,
        message: 'Post created successfully!',
        severity: 'success',
      });

      // Reset form
      setFormData({
        post_type: 'seeking',
        subject: '',
        level: '',
        location: '',
        format: '',
        description: '',
      });

      // Refresh posts
      fetchPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
      let errorMessage = 'Failed to create post. Please try again.';
      
      // Handle specific error messages from the server
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 429) {
        errorMessage = 'You have reached your posting limit. Please try again later.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Please log in to create a post.';
        setLoginDialogOpen(true);
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setSubmitLoading(false);
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

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getAvatarColor = (postType: string) => {
    return postType === 'seeking' 
      ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  // Fix for default markers in react-leaflet
  delete (Icon.Default.prototype as any)._getIconUrl;
  Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  // Custom hook to geocode locations (convert address to coordinates)
  const useGeocoding = (posts: Post[]) => {
    const [geocodedPosts, setGeocodedPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const geocodePosts = async () => {
        // Filter out online posts since they don't need physical locations
        const locationBasedPosts = posts.filter(post => 
          post.format.toLowerCase() !== 'online'
        );

        const postsWithCoords = await Promise.all(
          locationBasedPosts.map(async (post) => {
            if (post.coordinates) return post;
            
            try {
              // Using free Nominatim geocoding service (OpenStreetMap)
              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(post.location)}&limit=1`
              );
              const data = await response.json();
              
              if (data && data.length > 0) {
                return {
                  ...post,
                  coordinates: [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number],
                };
              }
            } catch (error) {
              console.error('Geocoding error:', error);
            }
            
            // Default to San Francisco if geocoding fails
            return {
              ...post,
              coordinates: [37.7749, -122.4194] as [number, number],
            };
          })
        );
        
        setGeocodedPosts(postsWithCoords);
        setLoading(false);
      };

      if (posts.length > 0) {
        geocodePosts();
      } else {
        setLoading(false);
      }
    }, [posts]);

    return { geocodedPosts, loading };
  };

  // Custom markers for different post types
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

  // Contact menu handlers
  const handleContactClick = (event: React.MouseEvent<HTMLElement>, postId: number) => {
    event.stopPropagation();
    setContactMenus(prev => ({ ...prev, [postId]: event.currentTarget }));
  };

  const handleContactClose = (postId: number) => {
    setContactMenus(prev => ({ ...prev, [postId]: null }));
  };

  const handleEmailContact = (post: Post) => {
    const mailtoLink = `mailto:${post.email}?subject=${encodeURIComponent(`Re: ${post.subject} Tutoring`)}&body=${encodeURIComponent(`Hi ${post.name},\n\nI'm interested in your ${post.subject} tutoring post. Let's discuss!\n\nBest regards`)}`;
    window.location.href = mailtoLink;
    handleContactClose(post.id);
  };

  const handleSmsContact = (post: Post) => {
    const smsText = `Hi ${post.name}, I'm interested in your ${post.subject} tutoring post. Let's discuss!`;
    const smsLink = `sms:?body=${encodeURIComponent(smsText)}`;
    window.location.href = smsLink;
    handleContactClose(post.id);
    setContactSnackbar({
      open: true,
      message: 'SMS template copied. Add recipient phone number.',
    });
  };

  const handleCopyEmail = async (post: Post) => {
    try {
      await navigator.clipboard.writeText(post.email);
      setContactSnackbar({
        open: true,
        message: 'Email address copied to clipboard!',
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = post.email;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setContactSnackbar({
        open: true,
        message: 'Email address copied to clipboard!',
      });
    }
    handleContactClose(post.id);
  };

  const handleCallContact = (post: Post) => {
    setContactSnackbar({
      open: true,
      message: 'Phone number not available. Try email instead.',
    });
    handleContactClose(post.id);
  };

  // Check if any menu is open
  const isAnyMenuOpen = Object.values(contactMenus).some(menu => menu !== null);

  // Handle card click with menu check
  const handleCardClick = (postId: number) => {
    // Don't navigate if any contact menu is open
    if (isAnyMenuOpen) {
      return;
    }
    navigate(`/post/${postId}`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '3rem', md: '4rem' },
                fontWeight: 800,
                mb: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Find Your Perfect Tutor
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: 4, fontWeight: 400 }}
            >
              Connect with amazing tutors or share your expertise with students worldwide
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
              <Chip
                icon={<TrendingUpIcon />}
                label={`${posts.length} Active Posts`}
                onClick={() => {
                  const postsSection = document.getElementById('posts-section');
                  if (postsSection) {
                    postsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  px: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)',
                  },
                  transition: 'all 0.3s ease',
                }}
              />
              <Chip
                icon={<StarIcon />}
                label="100% Free"
                sx={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontWeight: 600,
                  px: 2,
                }}
              />
            </Box>
          </Box>
        </motion.div>

        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Form Section */}
          <Box sx={{ width: { xs: '100%', lg: '33.33%' } }}>
            <motion.div variants={itemVariants}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  position: 'sticky',
                  top: 20,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      mr: 2,
                      width: 48,
                      height: 48,
                    }}
                  >
                    <SchoolIcon />
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {user ? 'Post an Opportunity' : 'Join TutorConnect'}
                  </Typography>
                </Box>

                {user ? (
                  // Authenticated user form
                  <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                      <Button
                        variant={formData.post_type === 'seeking' ? 'contained' : 'outlined'}
                        onClick={() => setFormData(prev => ({ ...prev, post_type: 'seeking' }))}
                        sx={{
                          flex: 1,
                          py: 1.5,
                          borderRadius: '12px',
                          ...(formData.post_type === 'seeking' && {
                            background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                          }),
                        }}
                      >
                        Need Tutor
                      </Button>
                      <Button
                        variant={formData.post_type === 'offering' ? 'contained' : 'outlined'}
                        onClick={() => setFormData(prev => ({ ...prev, post_type: 'offering' }))}
                        sx={{
                          flex: 1,
                          py: 1.5,
                          borderRadius: '12px',
                          ...(formData.post_type === 'offering' && {
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          }),
                        }}
                      >
                        Offer Services
                      </Button>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        fullWidth
                        label="Subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Mathematics, Physics"
                        InputProps={{
                          startAdornment: <SchoolIcon sx={{ mr: 1, color: '#667eea' }} />,
                        }}
                      />
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <FormControl fullWidth required>
                          <InputLabel>Level</InputLabel>
                          <Select
                            name="level"
                            value={formData.level}
                            onChange={handleSelectChange}
                            label="Level"
                          >
                            <MenuItem value="elementary">Elementary</MenuItem>
                            <MenuItem value="middle">Middle School</MenuItem>
                            <MenuItem value="high">High School</MenuItem>
                            <MenuItem value="college">College</MenuItem>
                            <MenuItem value="adult">Adult Education</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl fullWidth required>
                          <InputLabel>Format</InputLabel>
                          <Select
                            name="format"
                            value={formData.format}
                            onChange={handleSelectChange}
                            label="Format"
                          >
                            <MenuItem value="In-person">In-person</MenuItem>
                            <MenuItem value="Online">Online</MenuItem>
                            <MenuItem value="Both">Both</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      <TextField
                        fullWidth
                        label="Location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        required
                        placeholder="City, State or Online"
                        InputProps={{
                          startAdornment: <LocationIcon sx={{ mr: 1, color: '#667eea' }} />,
                        }}
                      />
                      <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        multiline
                        rows={3}
                        required
                        placeholder="Tell us more about what you're looking for or offering..."
                        InputProps={{
                          startAdornment: <DescriptionIcon sx={{ mr: 1, color: '#667eea', alignSelf: 'flex-start', mt: 1 }} />,
                        }}
                      />
                    </Box>

                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={submitLoading}
                      startIcon={submitLoading ? null : <SendIcon />}
                      sx={{
                        mt: 3,
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
                      {submitLoading ? 'Posting...' : 'Post Opportunity'}
                    </Button>
                  </form>
                ) : (
                  // Non-authenticated user prompt
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Sign in to post tutoring opportunities
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                      Join our community to find or offer tutoring services with spam protection and secure messaging.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
                      <Button
                        variant="contained"
                        startIcon={<LoginIcon />}
                        onClick={() => setLoginDialogOpen(true)}
                        sx={{
                          px: 4,
                          py: 1.5,
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%)',
                          },
                        }}
                      >
                        Sign In
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<PersonAddIcon />}
                        onClick={() => setRegisterDialogOpen(true)}
                        sx={{
                          px: 4,
                          py: 1.5,
                          borderRadius: '12px',
                          borderColor: '#667eea',
                          color: '#667eea',
                          '&:hover': {
                            borderColor: '#5a6fd8',
                            backgroundColor: 'rgba(102, 126, 234, 0.04)',
                          },
                        }}
                      >
                        Sign Up
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>
            </motion.div>
          </Box>

          {/* Posts Section */}
          <Box sx={{ width: { xs: '100%', lg: '66.67%' } }} id="posts-section">
            <motion.div
              id="posts-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Paper
                elevation={0}
                sx={{
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ p: 3, borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      Find Your Perfect Tutor
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant={view === 'list' ? 'contained' : 'outlined'}
                        startIcon={<ListIcon />}
                        onClick={() => setView('list')}
                        sx={{ borderRadius: '12px' }}
                      >
                        List
                      </Button>
                      <Button
                        variant={view === 'map' ? 'contained' : 'outlined'}
                        startIcon={<MapIcon />}
                        onClick={() => setView('map')}
                        sx={{ borderRadius: '12px' }}
                      >
                        Map
                      </Button>
                    </Box>
                  </Box>

                  {/* Enhanced Filter Section */}
                  <Box sx={{ mb: 3 }}>
                    {/* Search Bar */}
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        fullWidth
                        placeholder="Search for subjects, descriptions, tutors, or specific terms like 'Grade 9 Math'..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ color: '#667eea' }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '16px',
                            background: 'rgba(255, 255, 255, 0.8)',
                            '&:hover fieldset': {
                              borderColor: '#667eea',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#667eea',
                            },
                          },
                        }}
                      />
                    </Box>

                    {/* Filter Chips */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FilterIcon sx={{ color: '#667eea', fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea' }}>
                          Filters:
                        </Typography>
                      </Box>

                      {/* Education Level Filter */}
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Education Level</InputLabel>
                        <Select
                          value={levelFilter}
                          onChange={(e) => setLevelFilter(e.target.value)}
                          label="Education Level"
                          sx={{
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.9)',
                          }}
                        >
                          <MenuItem value="all">All Levels</MenuItem>
                          <MenuItem value="elementary">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SchoolIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                              Elementary School
                            </Box>
                          </MenuItem>
                          <MenuItem value="middle">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SchoolIcon sx={{ fontSize: 16, color: '#f97316' }} />
                              Middle School
                            </Box>
                          </MenuItem>
                          <MenuItem value="high">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SchoolIcon sx={{ fontSize: 16, color: '#667eea' }} />
                              High School
                            </Box>
                          </MenuItem>
                          <MenuItem value="college">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SchoolIcon sx={{ fontSize: 16, color: '#10b981' }} />
                              College
                            </Box>
                          </MenuItem>
                          <MenuItem value="adult">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SchoolIcon sx={{ fontSize: 16, color: '#764ba2' }} />
                              Adult Education
                            </Box>
                          </MenuItem>
                        </Select>
                      </FormControl>

                      {/* Format Filter */}
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Format</InputLabel>
                        <Select
                          value={formatFilter}
                          onChange={(e) => setFormatFilter(e.target.value)}
                          label="Format"
                          sx={{
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.9)',
                          }}
                        >
                          <MenuItem value="all">All Formats</MenuItem>
                          <MenuItem value="online">Online Only</MenuItem>
                          <MenuItem value="in-person">In-Person Only</MenuItem>
                          <MenuItem value="both">Both Options</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Clear Filters Button */}
                      {(searchQuery || levelFilter !== 'all' || formatFilter !== 'all') && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSearchQuery('');
                            setLevelFilter('all');
                            setFormatFilter('all');
                          }}
                          sx={{
                            borderRadius: '12px',
                            borderColor: '#f59e0b',
                            color: '#f59e0b',
                            '&:hover': {
                              borderColor: '#f97316',
                              background: 'rgba(249, 115, 22, 0.05)',
                            },
                          }}
                        >
                          Clear All
                        </Button>
                      )}
                    </Box>

                    {/* Active Filter Summary */}
                    {(searchQuery || levelFilter !== 'all' || formatFilter !== 'all') && (
                      <Box sx={{ mt: 2, p: 2, background: 'rgba(102, 126, 234, 0.05)', borderRadius: '12px' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea', mb: 1 }}>
                          Active Filters:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {searchQuery && (
                            <Chip
                              label={`Search: "${searchQuery}"`}
                              size="small"
                              onDelete={() => setSearchQuery('')}
                              sx={{ background: 'rgba(102, 126, 234, 0.1)' }}
                            />
                          )}
                          {levelFilter !== 'all' && (
                            <Chip
                              label={`Level: ${levelFilter === 'elementary' ? 'Elementary' : 
                                     levelFilter === 'middle' ? 'Middle School' : 
                                     levelFilter === 'high' ? 'High School' : 
                                     levelFilter === 'college' ? 'College' : 'Adult Education'}`}
                              size="small"
                              onDelete={() => setLevelFilter('all')}
                              sx={{ background: 'rgba(16, 185, 129, 0.1)' }}
                            />
                          )}
                          {formatFilter !== 'all' && (
                            <Chip
                              label={`Format: ${formatFilter === 'online' ? 'Online' : 
                                     formatFilter === 'in-person' ? 'In-Person' : 'Both Options'}`}
                              size="small"
                              onDelete={() => setFormatFilter('all')}
                              sx={{ background: 'rgba(245, 158, 11, 0.1)' }}
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                          Showing {filteredPosts.length} of {posts.length} posts
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Post Type Tabs */}
                  <Tabs
                    value={filter}
                    onChange={(_, value) => setFilter(value)}
                    sx={{
                      '& .MuiTab-root': {
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '12px',
                        mr: 1,
                      },
                    }}
                  >
                    <Tab label="All Posts" value="all" />
                    <Tab label="Seeking Tutors" value="seeking" />
                    <Tab label="Offering Services" value="offering" />
                  </Tabs>
                </Box>

                <Box sx={{ p: 3 }}>
                  {view === 'map' ? (
                    <Box>
                      {/* Online Tutoring Section */}
                      {filteredPosts.filter(post => 
                        post.format.toLowerCase() === 'online' || post.format.toLowerCase() === 'both'
                      ).length > 0 && (
                        <Box sx={{ mb: 4 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <PublicIcon sx={{ color: '#10b981', fontSize: 24 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#10b981' }}>
                              Online Tutoring
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            display: 'grid', 
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                            gap: 2,
                            mb: 3
                          }}>
                            {filteredPosts
                              .filter(post => 
                                post.format.toLowerCase() === 'online' || post.format.toLowerCase() === 'both'
                              )
                              .map((post) => (
                                <Card
                                  key={post.id}
                                  sx={{
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                      transform: 'translateY(-2px)',
                                      boxShadow: '0 8px 25px rgba(16, 185, 129, 0.15)',
                                    },
                                  }}
                                  onClick={() => handleCardClick(post.id)}
                                >
                                  <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                      <Chip
                                        size="small"
                                        label={post.post_type === 'seeking' ? 'Seeking' : 'Offering'}
                                        color={post.post_type === 'seeking' ? 'warning' : 'success'}
                                        sx={{ fontWeight: 600 }}
                                      />
                                      {post.format.toLowerCase() === 'both' && (
                                        <Chip
                                          size="small"
                                          label="Also In-Person"
                                          variant="outlined"
                                          sx={{ 
                                            fontWeight: 500, 
                                            fontSize: '0.7rem',
                                            color: '#667eea',
                                            borderColor: '#667eea'
                                          }}
                                        />
                                      )}
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', mb: 1 }}>
                                      {post.subject} - {post.level}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                      <PersonIcon sx={{ fontSize: 16, color: '#10b981' }} />
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {post.name}
                                      </Typography>
                                    </Box>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        lineHeight: 1.4,
                                        mb: 1,
                                      }}
                                    >
                                      {post.description}
                                    </Typography>
                                    <Box sx={{ position: 'relative', pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        endIcon={<KeyboardArrowDownIcon />}
                                        onClick={(e) => handleContactClick(e, post.id)}
                                        sx={{
                                          borderRadius: '8px',
                                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                          fontSize: '0.75rem',
                                          py: 0.5,
                                          px: 1,
                                        }}
                                      >
                                        Contact
                                      </Button>
                                      
                                      <Menu
                                        anchorEl={contactMenus[post.id]}
                                        open={Boolean(contactMenus[post.id])}
                                        onClose={() => handleContactClose(post.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        anchorOrigin={{
                                          vertical: 'bottom',
                                          horizontal: 'center',
                                        }}
                                        transformOrigin={{
                                          vertical: 'top',
                                          horizontal: 'center',
                                        }}
                                        disableScrollLock={true}
                                        sx={{
                                          '& .MuiPaper-root': {
                                            borderRadius: '12px',
                                            mt: 0.5,
                                            minWidth: 180,
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                          },
                                        }}
                                        slotProps={{
                                          root: {
                                            onContextMenu: (e: React.MouseEvent) => {
                                              e.preventDefault();
                                            },
                                          },
                                        }}
                                      >
                                        <MenuItem onClick={() => handleEmailContact(post)} sx={{ py: 1 }}>
                                          <ListItemIcon>
                                            <EmailIcon sx={{ color: '#667eea', fontSize: 18 }} />
                                          </ListItemIcon>
                                          <ListItemText 
                                            primary="Send Email" 
                                            primaryTypographyProps={{ fontSize: '0.8rem' }}
                                          />
                                        </MenuItem>

                                        <MenuItem onClick={() => handleSmsContact(post)} sx={{ py: 1 }}>
                                          <ListItemIcon>
                                            <SmsIcon sx={{ color: '#10b981', fontSize: 18 }} />
                                          </ListItemIcon>
                                          <ListItemText 
                                            primary="Text Message" 
                                            primaryTypographyProps={{ fontSize: '0.8rem' }}
                                          />
                                        </MenuItem>

                                        <MenuItem onClick={() => handleCopyEmail(post)} sx={{ py: 1 }}>
                                          <ListItemIcon>
                                            <ContentCopyIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                                          </ListItemIcon>
                                          <ListItemText 
                                            primary="Copy Email" 
                                            primaryTypographyProps={{ fontSize: '0.8rem' }}
                                          />
                                        </MenuItem>
                                      </Menu>
                                    </Box>
                                  </CardContent>
                                </Card>
                              ))}
                          </Box>
                        </Box>
                      )}
                      
                      {/* Location-Based Posts on Map */}
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <MapIcon sx={{ color: '#667eea', fontSize: 24 }} />
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                            Location-Based Tutoring
                          </Typography>
                        </Box>
                        <MapComponent 
                          posts={filteredPosts} 
                          selectedPost={selectedPost}
                          onPostSelect={setSelectedPost}
                        />
                      </Box>
                    </Box>
                  ) : (
                    <AnimatePresence>
                      {loading ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <SchoolIcon sx={{ fontSize: 48, color: '#667eea' }} />
                          </motion.div>
                          <Typography sx={{ mt: 2, color: '#667eea', fontWeight: 600 }}>
                            Loading opportunities...
                          </Typography>
                        </Box>
                      ) : filteredPosts.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                          <SchoolIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                          <Typography variant="h6" color="text.secondary">
                            No posts found
                          </Typography>
                          <Typography color="text.secondary">
                            Be the first to post an opportunity!
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 3 
                        }}>
                          {filteredPosts.map((post, index) => (
                            <motion.div
                              key={post.id}
                              initial={{ opacity: 0, y: 50 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              whileHover={contactMenus[post.id] ? {} : { 
                                y: -8,
                                transition: { duration: 0.2, ease: "easeOut" }
                              }}
                              style={{ pointerEvents: contactMenus[post.id] ? 'none' : 'auto' }}
                            >
                              <Card
                                sx={{
                                  borderRadius: '20px',
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                                  backdropFilter: 'blur(10px)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                  cursor: 'pointer',
                                  pointerEvents: contactMenus[post.id] ? 'none' : 'auto',
                                }}
                                onClick={() => handleCardClick(post.id)}
                              >
                                <CardContent sx={{ p: 3, pb: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Avatar
                                      sx={{
                                        background: getAvatarColor(post.post_type),
                                        width: 40,
                                        height: 40,
                                      }}
                                    >
                                      {post.post_type === 'seeking' ? '🔍' : '🎓'}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                      <Chip
                                        size="small"
                                        label={post.post_type === 'seeking' ? 'Looking for Tutor' : 'Offering Services'}
                                        color={post.post_type === 'seeking' ? 'warning' : 'success'}
                                        sx={{ fontWeight: 600, mb: 0.5 }}
                                      />
                                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '1.1rem' }}>
                                        {post.subject} - {post.level}
                                      </Typography>
                                    </Box>
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <PersonIcon sx={{ fontSize: 16, color: '#667eea' }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {post.name}
                                    </Typography>
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <LocationIcon sx={{ fontSize: 16, color: '#667eea' }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {post.location}
                                    </Typography>
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <ScheduleIcon sx={{ fontSize: 16, color: '#667eea' }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {post.format === 'online' ? 'Online' : 
                                        post.format === 'in-person' ? 'In-Person' : 'Both Online & In-Person'}
                                    </Typography>
                                  </Box>

                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      lineHeight: 1.4,
                                      mb: 1,
                                    }}
                                  >
                                    {post.description}
                                  </Typography>

                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    Posted {new Date(post.created_at).toLocaleDateString()}
                                  </Typography>
                                </CardContent>

                                <CardActions sx={{ px: 3, pb: 2, pt: 0, justifyContent: 'space-between' }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderRadius: '8px',
                                      fontSize: '0.8rem',
                                      py: 0.5,
                                      px: 2,
                                    }}
                                  >
                                    View Details
                                  </Button>
                                  <Box sx={{ position: 'relative', pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      endIcon={<KeyboardArrowDownIcon />}
                                      onClick={(e) => handleContactClick(e, post.id)}
                                      sx={{
                                        borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        fontSize: '0.8rem',
                                        py: 0.5,
                                        px: 1,
                                      }}
                                    >
                                      Contact
                                    </Button>
                                    
                                    <Menu
                                      anchorEl={contactMenus[post.id]}
                                      open={Boolean(contactMenus[post.id])}
                                      onClose={() => handleContactClose(post.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      anchorOrigin={{
                                        vertical: 'bottom',
                                        horizontal: 'center',
                                      }}
                                      transformOrigin={{
                                        vertical: 'top',
                                        horizontal: 'center',
                                      }}
                                      disableScrollLock={true}
                                      sx={{
                                        '& .MuiPaper-root': {
                                          borderRadius: '12px',
                                          mt: 0.5,
                                          minWidth: 180,
                                          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                        },
                                      }}
                                      slotProps={{
                                        root: {
                                          onContextMenu: (e: React.MouseEvent) => {
                                            e.preventDefault();
                                          },
                                        },
                                      }}
                                    >
                                      <MenuItem onClick={() => handleEmailContact(post)} sx={{ py: 1 }}>
                                        <ListItemIcon>
                                          <EmailIcon sx={{ color: '#667eea', fontSize: 18 }} />
                                        </ListItemIcon>
                                        <ListItemText 
                                          primary="Send Email" 
                                          primaryTypographyProps={{ fontSize: '0.8rem' }}
                                        />
                                      </MenuItem>

                                      <MenuItem onClick={() => handleSmsContact(post)} sx={{ py: 1 }}>
                                        <ListItemIcon>
                                          <SmsIcon sx={{ color: '#10b981', fontSize: 18 }} />
                                        </ListItemIcon>
                                        <ListItemText 
                                          primary="Text Message" 
                                          primaryTypographyProps={{ fontSize: '0.8rem' }}
                                        />
                                      </MenuItem>

                                      <MenuItem onClick={() => handleCopyEmail(post)} sx={{ py: 1 }}>
                                        <ListItemIcon>
                                          <ContentCopyIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                                        </ListItemIcon>
                                        <ListItemText 
                                          primary="Copy Email" 
                                          primaryTypographyProps={{ fontSize: '0.8rem' }}
                                        />
                                      </MenuItem>
                                    </Menu>
                                  </Box>
                                </CardActions>
                              </Card>
                            </motion.div>
                          ))}
                        </Box>
                      )}
                    </AnimatePresence>
                  )}
                </Box>
              </Paper>
            </motion.div>
          </Box>
        </Box>
      </motion.div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ 
            width: '100%',
            borderRadius: '12px',
            fontWeight: 600,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Contact action notifications */}
      <Snackbar
        open={contactSnackbar.open}
        autoHideDuration={3000}
        onClose={() => setContactSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setContactSnackbar(prev => ({ ...prev, open: false }))} 
          severity="success" 
          sx={{ borderRadius: '12px' }}
        >
          {contactSnackbar.message}
        </Alert>
      </Snackbar>

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
    </Container>
  );
};

export default Home; 