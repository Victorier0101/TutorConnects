import React from 'react';
import { Chip, Box } from '@mui/material';

interface FormatBadgeProps {
  format: string;
  size?: 'small' | 'medium';
  position?: 'inline' | 'absolute';
}

const FormatBadge: React.FC<FormatBadgeProps> = ({ 
  format, 
  size = 'medium',
  position = 'inline' 
}) => {
  const getFormatData = (format: string) => {
    const formatLower = format.toLowerCase();
    
    switch (formatLower) {
      case 'online':
        return {
          label: 'Online',
          color: '#3b82f6' as const,
          bgColor: '#dbeafe' as const,
        };
      case 'in-person':
        return {
          label: 'In-Person',
          color: '#10b981' as const,
          bgColor: '#d1fae5' as const,
        };
      case 'both':
        return {
          label: 'Online & In-Person',
          color: '#8b5cf6' as const,
          bgColor: '#ede9fe' as const,
        };
      default:
        return {
          label: format,
          color: '#6b7280' as const,
          bgColor: '#f3f4f6' as const,
        };
    }
  };

  const formatData = getFormatData(format);

  const chipSx = {
    fontWeight: 600,
    fontSize: size === 'small' ? '0.7rem' : '0.85rem',
    px: size === 'small' ? 1 : 1.5,
    height: size === 'small' ? 22 : 26,
    color: formatData.color,
    backgroundColor: formatData.bgColor,
    border: `1px solid ${formatData.color}`,
  };

  return (
    <Box sx={{ display: 'inline-flex' }}>
      <Chip
        label={formatData.label}
        variant="filled"
        size={size}
        sx={chipSx}
      />
    </Box>
  );
};

export default FormatBadge; 