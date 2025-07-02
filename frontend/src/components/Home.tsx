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
  Autocomplete,
  Fab,
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
  Close as CloseIcon,
  Message as MessageIcon,
  Add as AddIcon,
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
import useDebounce from '../hooks/useDebounce';
import PostFormModal from './PostFormModal';
import LevelDisplay, { LevelData } from './shared/LevelDisplay';
import FormatBadge from './shared/FormatBadge';

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
  contact_email?: string;
  contact_phone?: string;
  image_urls?: string[];
  levelData?: LevelData;
}

interface FormData {
  post_type: 'seeking' | 'offering';
  subjects: string[];
  level: string;
  location: string;
  format: string;
  description: string;
  contact_email: string;
  contact_phone: string;
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
    subjects: [],
    level: '',
    location: '',
    format: '',
    description: '',
    contact_email: '',
    contact_phone: '',
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

  // Post form modal state
  const [postFormModalOpen, setPostFormModalOpen] = useState(false);

  // Contact menu state
  const [contactMenus, setContactMenus] = useState<{ [key: number]: HTMLElement | null }>({});
  const [contactSnackbar, setContactSnackbar] = useState({
    open: false,
    message: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [levelFilter, setLevelFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');

  const subjectOptions = ['Mathematics','Physics','Chemistry','Biology','English','History','Computer Science','Spanish','French','German'];

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
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
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
  }, [posts, filter, levelFilter, formatFilter, debouncedSearchQuery]);

  useEffect(() => {
    filterPosts();
  }, [filterPosts]);

  const fetchPosts = async () => {
    // console.log('🔄 Fetching posts...');
    setLoading(true);
    try {
      // console.log('📡 Making API call to: http://localhost:3001/api/posts');
      const response = await axios.get('http://localhost:3001/api/posts');
      // console.log('✅ API Response received:', response.data);
      // console.log('📊 Number of posts:', response.data.length);
      setPosts(response.data);
      // console.log('🔄 Posts set in state');
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
      // console.log('🏁 Fetch posts completed');
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
      const payload = {
        ...formData,
        subject: formData.subjects.join(',')
      } as any;
      delete payload.subjects;
      await axios.post('http://localhost:3001/api/posts', payload);
      
      setSnackbar({
        open: true,
        message: 'Post created successfully!',
        severity: 'success',
      });

      // Reset form
      setFormData({
        post_type: 'seeking',
        subjects: [],
        level: '',
        location: '',
        format: '',
        description: '',
        contact_email: '',
        contact_phone: '',
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

  // Contact menu handlers
  const handleContactClick = (event: React.MouseEvent<HTMLElement>, postId: number) => {
    event.stopPropagation();
    setContactMenus(prev => ({ ...prev, [postId]: event.currentTarget }));
  };

  const handleContactClose = (postId: number) => {
    setContactMenus(prev => ({ ...prev, [postId]: null }));
  };

  const handleEmailContact = (post: Post) => {
    if (!post.contact_email) {
      setContactSnackbar({ open: true, message: 'Email not provided for this post.', });
      return;
    }
    const mailtoLink = `mailto:${post.contact_email}?subject=${encodeURIComponent(`Re: ${post.subject} Tutoring`)}&body=${encodeURIComponent(`Hi ${post.name},\n\nI'm interested in your ${post.subject} tutoring post. Let's discuss!\n\nBest regards`)}`;
    window.location.href = mailtoLink;
    handleContactClose(post.id);
  };

  const handleSmsContact = (post: Post) => {
    if (!post.contact_phone) {
      setContactSnackbar({ open: true, message: 'Phone number not provided for this post.' });
      return;
    }
    const smsText = `Hi ${post.name}, I'm interested in your ${post.subject} tutoring post. Let's discuss!`;
    const smsLink = `sms:${post.contact_phone}?body=${encodeURIComponent(smsText)}`;
    window.location.href = smsLink;
    handleContactClose(post.id);
  };

  const handleCopyEmail = async (post: Post) => {
    try {
      await navigator.clipboard.writeText(post.contact_email || '');
      setContactSnackbar({
        open: true,
        message: 'Email address copied to clipboard!',
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = post.contact_email || '';
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

  const { token } = useAuth();

  const handleSiteMessage = async (post: Post) => {
    if (!user) { setLoginDialogOpen(true); return; }
    try {
      const res = await axios.post('http://localhost:3001/api/conversations', {
        participant_id: post.user_id,
        post_id: post.id,
      });
      navigate('/messages');
    } catch (err) {
      console.error('start conversation error', err);
      setSnackbar({ open:true, message:'Could not start conversation', severity:'error' });
    }
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

  // Debounce filtered posts for heavy children like MapComponent
  const debouncedFilteredPosts = useDebounce(filteredPosts, 300);

  // Initial load: fetch posts once on mount
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {/* Posts Section - Now Full Width */}
          <Box sx={{ width: '100%' }} id="posts-section">
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
                                      {post.subject}
                                    </Typography>
                                    <LevelDisplay 
                                      levelData={post.levelData} 
                                      legacyLevel={post.level} 
                                      size="small" 
                                      variant="text" 
                                    />
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
                                        {post.contact_email && (
                                        <MenuItem onClick={() => handleEmailContact(post)} sx={{ py: 1 }}>
                                          <ListItemIcon>
                                            <EmailIcon sx={{ color: '#667eea', fontSize: 18 }} />
                                          </ListItemIcon>
                                          <ListItemText 
                                            primary="Send Email" 
                                            primaryTypographyProps={{ fontSize: '0.8rem' }}
                                          />
                                        </MenuItem>
                                        )}

                                        {post.contact_phone && (
                                        <MenuItem onClick={() => handleSmsContact(post)} sx={{ py: 1 }}>
                                          <ListItemIcon>
                                            <SmsIcon sx={{ color: '#10b981', fontSize: 18 }} />
                                          </ListItemIcon>
                                          <ListItemText 
                                            primary="Text Message" 
                                            primaryTypographyProps={{ fontSize: '0.8rem' }}
                                          />
                                        </MenuItem>
                                        )}

                                        {post.contact_email && (
                                        <MenuItem onClick={() => handleCopyEmail(post)} sx={{ py: 1 }}>
                                          <ListItemIcon>
                                            <ContentCopyIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                                          </ListItemIcon>
                                          <ListItemText 
                                            primary="Copy Email" 
                                            primaryTypographyProps={{ fontSize: '0.8rem' }}
                                          />
                                        </MenuItem>
                                        )}

                                        <MenuItem onClick={() => handleSiteMessage(post)} sx={{ py: 1 }}>
                                          <ListItemIcon>
                                            <MessageIcon sx={{ color: '#764ba2', fontSize: 18 }} />
                                          </ListItemIcon>
                                          <ListItemText primary="Message on TutorConnect" primaryTypographyProps={{fontSize:'0.8rem'}} />
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
                          posts={debouncedFilteredPosts} 
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
                                <CardContent sx={{ p: 3, pb: 1, position: 'relative' }}>
                                  {/* Format Badge - Top Right */}
                                  <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                                    <FormatBadge format={post.format} size="small" />
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, pr: 8 }}>
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
                                        {post.subject}
                                      </Typography>
                                    </Box>
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <LevelDisplay 
                                      levelData={post.levelData} 
                                      legacyLevel={post.level} 
                                      size="small" 
                                      variant="chip" 
                                    />
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <PersonIcon sx={{ fontSize: 16, color: '#667eea' }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {post.name}
                                    </Typography>
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <LocationIcon sx={{ fontSize: 16, color: '#667eea' }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {post.location}
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

                                  {/* Post Images */}
                                  {post.image_urls && post.image_urls.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {post.image_urls.slice(0, 3).map((imageUrl, imageIndex) => (
                                          <Box
                                            key={imageIndex}
                                            sx={{
                                              width: 60,
                                              height: 60,
                                              borderRadius: '8px',
                                              overflow: 'hidden',
                                              position: 'relative',
                                              border: '1px solid rgba(0,0,0,0.1)',
                                            }}
                                          >
                                            <img
                                              src={imageUrl}
                                              alt={`Post image ${imageIndex + 1}`}
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
                                        {post.image_urls.length > 3 && (
                                          <Box
                                            sx={{
                                              width: 60,
                                              height: 60,
                                              borderRadius: '8px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              bgcolor: 'rgba(102, 126, 234, 0.1)',
                                              border: '1px solid rgba(102, 126, 234, 0.2)',
                                            }}
                                          >
                                            <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                                              +{post.image_urls.length - 3}
                                            </Typography>
                                          </Box>
                                        )}
                                      </Box>
                                    </Box>
                                  )}

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
                                      {post.contact_email && (
                                      <MenuItem onClick={() => handleEmailContact(post)} sx={{ py: 1 }}>
                                        <ListItemIcon>
                                          <EmailIcon sx={{ color: '#667eea', fontSize: 18 }} />
                                        </ListItemIcon>
                                        <ListItemText 
                                          primary="Send Email" 
                                          primaryTypographyProps={{ fontSize: '0.8rem' }}
                                        />
                                      </MenuItem>
                                      )}

                                      {post.contact_phone && (
                                      <MenuItem onClick={() => handleSmsContact(post)} sx={{ py: 1 }}>
                                        <ListItemIcon>
                                          <SmsIcon sx={{ color: '#10b981', fontSize: 18 }} />
                                        </ListItemIcon>
                                        <ListItemText 
                                          primary="Text Message" 
                                          primaryTypographyProps={{ fontSize: '0.8rem' }}
                                        />
                                      </MenuItem>
                                      )}

                                      {post.contact_email && (
                                      <MenuItem onClick={() => handleCopyEmail(post)} sx={{ py: 1 }}>
                                        <ListItemIcon>
                                          <ContentCopyIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                                        </ListItemIcon>
                                        <ListItemText 
                                          primary="Copy Email" 
                                          primaryTypographyProps={{ fontSize: '0.8rem' }}
                                        />
                                      </MenuItem>
                                      )}

                                      <MenuItem onClick={() => handleSiteMessage(post)} sx={{ py: 1 }}>
                                        <ListItemIcon>
                                          <MessageIcon sx={{ color: '#764ba2', fontSize: 18 }} />
                                        </ListItemIcon>
                                        <ListItemText primary="Message on TutorConnect" primaryTypographyProps={{fontSize:'0.8rem'}} />
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

        {/* Floating Action Button for Creating Posts */}
        <Fab
          color="primary"
          aria-label="add post"
          onClick={() => {
            if (!user) {
              setLoginDialogOpen(true);
              return;
            }
            setPostFormModalOpen(true);
          }}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.3s ease',
            zIndex: 1000,
            width: 64,
            height: 64,
          }}
        >
          <AddIcon sx={{ fontSize: 28 }} />
        </Fab>

        {/* Post Form Modal */}
        <PostFormModal
          open={postFormModalOpen}
          onClose={() => setPostFormModalOpen(false)}
          onPostCreated={fetchPosts}
          setSnackbar={setSnackbar}
        />

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
    </Container>
  );
};

export default Home; 