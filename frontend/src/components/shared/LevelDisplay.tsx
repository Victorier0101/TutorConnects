import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';

export interface LevelData {
  type: 'single' | 'range' | 'multiple';
  single?: string;
  min?: string;
  max?: string;
  multiple?: string[];
}

interface LevelDisplayProps {
  levelData?: LevelData;
  legacyLevel?: string;
  size?: 'small' | 'medium';
  variant?: 'chip' | 'text';
}

const levelLabels: { [key: string]: string } = {
  'grade-k': 'Kindergarten',
  'grade-1': 'Grade 1',
  'grade-2': 'Grade 2',
  'grade-3': 'Grade 3',
  'grade-4': 'Grade 4',
  'grade-5': 'Grade 5',
  'grade-6': 'Grade 6',
  'grade-7': 'Grade 7',
  'grade-8': 'Grade 8',
  'grade-9': 'Grade 9',
  'grade-10': 'Grade 10',
  'grade-11': 'Grade 11',
  'grade-12': 'Grade 12',
  'elementary': 'Elementary',
  'middle': 'Middle School',
  'high': 'High School',
  'college': 'College',
  'adult': 'Adult Education'
};

const formatLevel = (level: string): string => {
  return levelLabels[level] || level;
};

const LevelDisplay: React.FC<LevelDisplayProps> = ({ 
  levelData, 
  legacyLevel, 
  size = 'medium',
  variant = 'chip'
}) => {
  const getLevelText = (): string => {
    // Use new flexible level data if available
    if (levelData) {
      switch (levelData.type) {
        case 'single':
          return formatLevel(levelData.single || '');
        case 'range':
          const minLabel = formatLevel(levelData.min || '');
          const maxLabel = formatLevel(levelData.max || '');
          return `${minLabel} - ${maxLabel}`;
        case 'multiple':
          // Handle case where backend sent single comma-separated string
          const items = Array.isArray(levelData.multiple)
            ? levelData.multiple
            : (levelData.multiple ? (levelData.multiple as unknown as string).split(',') : []);
          return items
            .map(item => String(item).trim())
            .filter(Boolean)
            .map(formatLevel)
            .join(', ');
        default:
          return formatLevel(legacyLevel || '');
      }
    }
    
    // Fallback to legacy level
    return formatLevel(legacyLevel || '');
  };

  const levelText = getLevelText();

  if (variant === 'text') {
    return (
      <Typography 
        variant={size === 'small' ? 'body2' : 'body1'} 
        color="text.secondary"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
      >
        <SchoolIcon sx={{ fontSize: size === 'small' ? 16 : 18 }} />
        {levelText}
      </Typography>
    );
  }

  return (
    <Chip
      icon={<SchoolIcon />}
      label={levelText}
      size={size}
      variant="outlined"
      sx={{
        bgcolor: 'background.paper',
        borderColor: 'primary.main',
        color: 'primary.main',
        '& .MuiChip-icon': {
          color: 'primary.main'
        }
      }}
    />
  );
};

export default LevelDisplay; 