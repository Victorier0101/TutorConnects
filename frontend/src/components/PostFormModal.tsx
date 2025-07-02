import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  IconButton,
  Avatar,
  Paper,
  Divider,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  School as SchoolIcon,
  Description as DescriptionIcon,
  Phone as PhoneIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import LocationInput from './LocationInput';

interface LocationData {
  address: string;
  coordinates: [number, number];
  confidence: 'high' | 'medium' | 'low';
  source: 'nominatim' | 'photon' | 'mapbox';
  displayName: string;
  country: string;
  city?: string;
  state?: string;
}

interface FormData {
  post_type: 'seeking' | 'offering';
  subjects: string[];
  level: string;
  location: string;
  locationData?: LocationData;
  format: string;
  description: string;
  contact_email: string;
  contact_phone: string;
}

interface PostFormModalProps {
  open: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  setSnackbar: (snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }) => void;
}

const subjectOptions = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History',
  'Computer Science', 'Spanish', 'French', 'German', 'Art', 'Music',
  'Economics', 'Psychology', 'Philosophy', 'Geography', 'Political Science'
];

const PostFormModal: React.FC<PostFormModalProps> = ({ 
  open, 
  onClose, 
  onPostCreated, 
  setSnackbar 
}) => {
  const { user, token } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    post_type: 'seeking',
    subjects: [],
    level: '',
    location: '',
    locationData: undefined,
    format: '',
    description: '',
    contact_email: '',
    contact_phone: '',
  });
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isLocationValid, setIsLocationValid] = useState(false);

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

  const handleLocationChange = (value: string, locationData?: LocationData) => {
    setFormData((prev) => ({
      ...prev,
      location: value,
      locationData: locationData,
    }));
  };

  const handleLocationValidationChange = (isValid: boolean, locationData?: LocationData) => {
    setIsLocationValid(isValid);
    if (isValid && locationData) {
      setFormData((prev) => ({
        ...prev,
        locationData: locationData,
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitLoading(true);

    try {
      const payload = {
        ...formData,
        subject: formData.subjects.join(','),
        latitude: formData.locationData?.coordinates[0] || null,
        longitude: formData.locationData?.coordinates[1] || null,
        location_confidence: formData.locationData?.confidence || null,
        location_source: formData.locationData?.source || null,
      } as any;
      delete payload.subjects;
      delete payload.locationData;

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
        locationData: undefined,
        format: '',
        description: '',
        contact_email: '',
        contact_phone: '',
      });
      setIsLocationValid(false);

      onPostCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating post:', error);
      let errorMessage = 'Failed to create post. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 429) {
        errorMessage = 'You have reached your posting limit. Please try again later.';
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

  const handleClose = () => {
    if (!submitLoading) {
      onClose();
      // Reset form when closing
      setFormData({
        post_type: 'seeking',
        subjects: [],
        level: '',
        location: '',
        locationData: undefined,
        format: '',
        description: '',
        contact_email: '',
        contact_phone: '',
      });
      setIsLocationValid(false);
    }
  };

  const getPlaceholderText = () => {
    return formData.post_type === 'seeking' 
      ? `Describe what you need help with:
• What specific topics or skills do you need help with?
• What's your current level and learning goals?
• What's your preferred schedule and frequency?
• Do you have any specific teaching style preferences?
• Any budget considerations or other requirements?`
      : `Describe your tutoring services:
• What's your expertise and teaching experience?
• What's your teaching methodology and style?
• What's your availability and schedule flexibility?
• What makes you a great tutor?
• Any special qualifications or achievements?`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          minHeight: '70vh',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                width: 48,
                height: 48,
              }}
            >
              <SchoolIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Post an Opportunity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Share your tutoring needs or services with the community
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} disabled={submitLoading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 3 }}>
          {/* Post Type Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              What are you looking for?
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant={formData.post_type === 'seeking' ? 'contained' : 'outlined'}
                onClick={() => setFormData((prev) => ({ ...prev, post_type: 'seeking' }))}
                sx={{
                  flex: 1,
                  py: 2,
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  ...(formData.post_type === 'seeking' && {
                    background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                  }),
                }}
              >
                I Need a Tutor
              </Button>
              <Button
                variant={formData.post_type === 'offering' ? 'contained' : 'outlined'}
                onClick={() => setFormData((prev) => ({ ...prev, post_type: 'offering' }))}
                sx={{
                  flex: 1,
                  py: 2,
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  ...(formData.post_type === 'offering' && {
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  }),
                }}
              >
                I Offer Tutoring
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Form Fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Subjects */}
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
                    sx={{ 
                      m: 0.5,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      '& .MuiChip-deleteIcon': { color: 'white' }
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Subjects *"
                  placeholder="Type a subject and press Enter"
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

            {/* Level and Format */}
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

            {/* Location */}
            <LocationInput
              value={formData.location}
              onChange={handleLocationChange}
              onValidationChange={handleLocationValidationChange}
              required={formData.format !== 'Online'}
              placeholder={formData.format === 'Online' ? 'Optional (City, State)' : 'City, State or Zip Code'}
              label="Location"
            />

            {/* Description */}
            <TextField
              fullWidth
              label="Description *"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={8}
              required
              placeholder={getPlaceholderText()}
              InputProps={{
                startAdornment: <DescriptionIcon sx={{ mr: 1, color: '#667eea', alignSelf: 'flex-start', mt: 1 }} />,
              }}
              sx={{
                '& .MuiInputBase-root': {
                  alignItems: 'flex-start',
                },
                '& .MuiInputBase-input': {
                  fontSize: '16px',
                  lineHeight: 1.5,
                },
              }}
              helperText="Provide detailed information about what you're looking for or offering."
            />

            {/* Contact Information */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                fullWidth
                label="Contact Email (optional)"
                name="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={handleInputChange}
                placeholder="Different from your account email"
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
                placeholder="(555) 123-4567"
                InputProps={{
                  startAdornment: <PhoneIcon sx={{ mr: 1, color: '#667eea' }} />,
                }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClose}
            disabled={submitLoading}
            sx={{ borderRadius: '12px', px: 3 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              submitLoading || 
              !formData.subjects.length || 
              !formData.level || 
              !formData.format || 
              !formData.description
              // Temporarily disabled location validation for testing
              // || (formData.format !== 'Online' && (!formData.location || !isLocationValid))
            }
            startIcon={submitLoading ? null : <SendIcon />}
            sx={{
              borderRadius: '12px',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%)',
              },
              '&:disabled': {
                background: '#ccc',
              },
            }}
          >
            {submitLoading ? 'Posting...' : 'Post Opportunity'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PostFormModal; 