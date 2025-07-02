import React, { useState, useEffect, useRef } from 'react';
import {
  TextField,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Alert,
  Paper,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { debounce } from 'lodash';

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

interface LocationInputProps {
  value: string;
  onChange: (value: string, locationData?: LocationData) => void;
  onValidationChange: (isValid: boolean, locationData?: LocationData) => void;
  required?: boolean;
  placeholder?: string;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  onValidationChange,
  required = false,
  placeholder = "Enter city, address, or postal code",
  label = "Location",
  error = false,
  helperText,
  disabled = false,
}) => {
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Debounced validation function
  const debouncedValidation = useRef(
    debounce(async (address: string) => {
      if (!address.trim()) {
        setValidationState('idle');
        setLocationData(null);
        setSuggestions([]);
        onValidationChange(false);
        return;
      }

      setValidationState('validating');

      try {
        const response = await fetch(
          `http://localhost:3001/api/validate-location?location=${encodeURIComponent(address)}`
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data.valid) {
          setValidationState('valid');
          setLocationData(data.location);
          onValidationChange(true, data.location);
        } else {
          setValidationState('invalid');
          setLocationData(null);
          setSuggestions(data.suggestions || []);
          onValidationChange(false);
        }
      } catch (error) {
        console.error('Location validation error:', error);
        setValidationState('invalid');
        setLocationData(null);
        onValidationChange(false);
      }
    }, 800)
  );

  useEffect(() => {
    debouncedValidation.current(value);
    
    return () => {
      debouncedValidation.current.cancel();
    };
  }, [value]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue, locationData || undefined);
  };

  const getValidationIcon = () => {
    switch (validationState) {
      case 'validating':
        return <CircularProgress size={20} sx={{ color: '#667eea' }} />;
      case 'valid':
        return <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />;
      case 'invalid':
        return <ErrorIcon sx={{ color: '#ef4444', fontSize: 20 }} />;
      default:
        return <LocationIcon sx={{ color: '#667eea', fontSize: 20 }} />;
    }
  };

  const getValidationColor = () => {
    switch (validationState) {
      case 'valid':
        return '#10b981';
      case 'invalid':
        return '#ef4444';
      case 'validating':
        return '#667eea';
      default:
        return undefined;
    }
  };

  const getHelperText = () => {
    if (helperText) return helperText;
    
    switch (validationState) {
      case 'validating':
        return 'Checking location...';
      case 'valid':
        return `✓ Found: ${locationData?.displayName}`;
      case 'invalid':
        return 'Location not found. Please try a different address.';
      default:
        return 'Enter a valid address, city, or postal code';
    }
  };

  return (
    <Box>
      <TextField
        fullWidth
        label={label}
        value={value}
        onChange={handleInputChange}
        required={required}
        placeholder={placeholder}
        error={error || validationState === 'invalid'}
        disabled={disabled}
        helperText={getHelperText()}
        InputProps={{
          startAdornment: (
            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
              {getValidationIcon()}
            </Box>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: getValidationColor(),
            },
          },
          '& .MuiFormHelperText-root': {
            color: getValidationColor(),
          },
        }}
      />

      {/* Confidence indicator */}
      {validationState === 'valid' && locationData && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            size="small"
            label={`${locationData.confidence.toUpperCase()} CONFIDENCE`}
            color={
              locationData.confidence === 'high' ? 'success' :
              locationData.confidence === 'medium' ? 'warning' : 'error'
            }
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
          <Typography variant="caption" color="text.secondary">
            Source: {locationData.source}
          </Typography>
        </Box>
      )}

      {/* Location details */}
      {validationState === 'valid' && locationData && (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
              Location Verified
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {locationData.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Will show 2km radius around this location on the map
          </Typography>
        </Paper>
      )}

      {/* Error suggestions */}
      {validationState === 'invalid' && suggestions.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Location not found
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Try:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </Box>
        </Alert>
      )}
    </Box>
  );
};

export default LocationInput; 