import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Button,
  Box,
  Avatar,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Description as DescriptionIcon,
  Phone as PhoneIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

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

interface PostFormProps {
  onPostCreated: () => void;
  setLoginDialogOpen: (open: boolean) => void;
  setRegisterDialogOpen: (open: boolean) => void;
  setSnackbar: (snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }) => void;
}

const subjectOptions = ['Mathematics','Physics','Chemistry','Biology','English','History','Computer Science','Spanish','French','German'];
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


const PostForm: React.FC<PostFormProps> = ({ onPostCreated, setLoginDialogOpen, setRegisterDialogOpen, setSnackbar }) => {
  const { user } = useAuth();
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
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (event: any) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

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
        subject: formData.subjects.join(','),
      } as any;
      delete payload.subjects;
      await axios.post('http://localhost:3001/api/posts', payload);

      setSnackbar({
        open: true,
        message: 'Post created successfully!',
        severity: 'success',
      });

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

      onPostCreated();
    } catch (error: any) {
      console.error('Error creating post:', error);
      let errorMessage = 'Failed to create post. Please try again.';
      
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

  return (
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
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant={formData.post_type === 'seeking' ? 'contained' : 'outlined'}
                onClick={() => setFormData((prev) => ({ ...prev, post_type: 'seeking' }))}
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
                onClick={() => setFormData((prev) => ({ ...prev, post_type: 'offering' }))}
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
              <Autocomplete
                multiple
                freeSolo
                options={subjectOptions}
                value={formData.subjects}
                onChange={(e, newValue) => setFormData((prev) => ({ ...prev, subjects: newValue }))}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      deleteIcon={<CloseIcon />}
                      key={option}
                      sx={{ m: 0.5 }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Subjects"
                    placeholder="Type and press Enter"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <SchoolIcon sx={{ mr: 1, color: '#667eea' }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
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
                required={formData.format !== 'Online'}
                placeholder={formData.format === 'Online' ? 'Optional (City, State)' : 'City, State'}
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
              <TextField
                fullWidth
                label="Contact Email (optional)"
                name="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={handleInputChange}
                placeholder="Provide an email for this post"
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 1, color: '#667eea' }} />,
                }}
              />
              <TextField
                fullWidth
                label="Contact Phone (optional)"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
                placeholder="Digits only"
                InputProps={{
                  startAdornment: <PhoneIcon sx={{ mr: 1, color: '#667eea' }} />,
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
                onClick={handleSwitchToRegister}
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
  );
};

export default PostForm; 