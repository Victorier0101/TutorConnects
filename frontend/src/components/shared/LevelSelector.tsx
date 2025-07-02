import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Button,
  Popover,
  Paper,
  Divider,
  TextField,
} from '@mui/material';
import {
  School as SchoolIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

export interface LevelData {
  type: 'single' | 'range' | 'multiple';
  single?: string;
  min?: string;
  max?: string;
  multiple?: string[];
}

interface LevelSelectorProps {
  value: LevelData;
  onChange: (value: LevelData) => void;
  label?: string;
  required?: boolean;
}

const gradeOptions = [
  { value: 'grade-k', label: 'Kindergarten', order: 0 },
  { value: 'grade-1', label: 'Grade 1', order: 1 },
  { value: 'grade-2', label: 'Grade 2', order: 2 },
  { value: 'grade-3', label: 'Grade 3', order: 3 },
  { value: 'grade-4', label: 'Grade 4', order: 4 },
  { value: 'grade-5', label: 'Grade 5', order: 5 },
  { value: 'grade-6', label: 'Grade 6', order: 6 },
  { value: 'grade-7', label: 'Grade 7', order: 7 },
  { value: 'grade-8', label: 'Grade 8', order: 8 },
  { value: 'grade-9', label: 'Grade 9', order: 9 },
  { value: 'grade-10', label: 'Grade 10', order: 10 },
  { value: 'grade-11', label: 'Grade 11', order: 11 },
  { value: 'grade-12', label: 'Grade 12', order: 12 },
  { value: 'college', label: 'College', order: 13 },
  { value: 'adult', label: 'Adult Education', order: 14 },
];

const levelCategories = [
  { value: 'elementary', label: 'Elementary (K-5)', order: 0 },
  { value: 'middle', label: 'Middle School (6-8)', order: 1 },
  { value: 'high', label: 'High School (9-12)', order: 2 },
  { value: 'college', label: 'College', order: 3 },
  { value: 'adult', label: 'Adult Education', order: 4 },
];

const LevelSelector: React.FC<LevelSelectorProps> = ({
  value,
  onChange,
  label = 'Education Level',
  required = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectionType, setSelectionType] = useState<'single' | 'range' | 'multiple'>(value.type || 'single');
  const [tempSelection, setTempSelection] = useState<LevelData>(value);

  const open = Boolean(anchorEl);

  useEffect(() => {
    setSelectionType(value.type || 'single');
    setTempSelection(value);
  }, [value]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleApply = () => {
    onChange(tempSelection);
    handleClose();
  };

  const handleCancel = () => {
    setTempSelection(value);
    setSelectionType(value.type || 'single');
    handleClose();
  };

  const handleTypeChange = (event: React.MouseEvent<HTMLElement>, newType: string | null) => {
    if (newType !== null) {
      setSelectionType(newType as 'single' | 'range' | 'multiple');
      setTempSelection({
        type: newType as 'single' | 'range' | 'multiple',
        single: newType === 'single' ? 'elementary' : undefined,
        min: newType === 'range' ? 'grade-1' : undefined,
        max: newType === 'range' ? 'grade-5' : undefined,
        multiple: newType === 'multiple' ? [] : undefined,
      });
    }
  };

  const formatDisplayValue = (levelData: LevelData): string => {
    if (!levelData.type) return 'Select level';
    
    switch (levelData.type) {
      case 'single':
        if (levelData.single) {
          const category = levelCategories.find(cat => cat.value === levelData.single);
          const grade = gradeOptions.find(grade => grade.value === levelData.single);
          return category?.label || grade?.label || levelData.single;
        }
        return 'Select level';
      
      case 'range':
        if (levelData.min && levelData.max) {
          const minGrade = gradeOptions.find(grade => grade.value === levelData.min);
          const maxGrade = gradeOptions.find(grade => grade.value === levelData.max);
          return `${minGrade?.label || levelData.min} - ${maxGrade?.label || levelData.max}`;
        }
        return 'Select range';
      
      case 'multiple':
        if (levelData.multiple && levelData.multiple.length > 0) {
          if (levelData.multiple.length === 1) {
            const category = levelCategories.find(cat => cat.value === levelData.multiple![0]);
            const grade = gradeOptions.find(grade => grade.value === levelData.multiple![0]);
            return category?.label || grade?.label || levelData.multiple[0];
          }
          return `${levelData.multiple.length} levels selected`;
        }
        return 'Select levels';
      
      default:
        return 'Select level';
    }
  };

  const isValidSelection = (selection: LevelData): boolean => {
    switch (selection.type) {
      case 'single':
        return !!selection.single;
      case 'range':
        return !!selection.min && !!selection.max;
      case 'multiple':
        return !!(selection.multiple && selection.multiple.length > 0);
      default:
        return false;
    }
  };

  return (
    <>
      <TextField
        fullWidth
        required={required}
        label={label}
        value={isValidSelection(value) ? formatDisplayValue(value) : ''}
        placeholder="Select level"
        onClick={handleClick}
        InputProps={{
          readOnly: true,
          endAdornment: <ExpandMoreIcon sx={{ color: 'text.secondary' }} />,
          style: { cursor: 'pointer' },
        }}
        InputLabelProps={{ shrink: true }}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: { minWidth: 400, maxWidth: 500, p: 3 },
        }}
      >
        <Paper elevation={0}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Choose Education Level
          </Typography>

          {/* Selection Type Toggle */}
          <ToggleButtonGroup
            value={selectionType}
            exclusive
            onChange={handleTypeChange}
            size="small"
            sx={{ mb: 3 }}
          >
            <ToggleButton value="single">Single Level</ToggleButton>
            <ToggleButton value="range">Grade Range</ToggleButton>
            <ToggleButton value="multiple">Multiple Levels</ToggleButton>
          </ToggleButtonGroup>

          <Divider sx={{ mb: 2 }} />

          {/* Single Level Selection */}
          {selectionType === 'single' && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Select one level:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {levelCategories.map((category) => (
                  <Button
                    key={category.value}
                    variant={tempSelection.single === category.value ? 'contained' : 'outlined'}
                    onClick={() =>
                      setTempSelection({ ...tempSelection, single: category.value })
                    }
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    <SchoolIcon sx={{ mr: 1, fontSize: 16 }} />
                    {category.label}
                  </Button>
                ))}
              </Box>
            </Box>
          )}

          {/* Range Selection */}
          {selectionType === 'range' && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Select grade range:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>From</InputLabel>
                  <Select
                    value={tempSelection.min || ''}
                    onChange={(e) =>
                      setTempSelection({ ...tempSelection, min: e.target.value })
                    }
                    label="From"
                  >
                    {gradeOptions.map((grade) => (
                      <MenuItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>To</InputLabel>
                  <Select
                    value={tempSelection.max || ''}
                    onChange={(e) =>
                      setTempSelection({ ...tempSelection, max: e.target.value })
                    }
                    label="To"
                  >
                    {gradeOptions.map((grade) => (
                      <MenuItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          )}

          {/* Multiple Selection */}
          {selectionType === 'multiple' && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Select multiple levels:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {[...levelCategories, ...gradeOptions].map((option) => {
                  const isSelected = tempSelection.multiple?.includes(option.value);
                  return (
                    <Chip
                      key={option.value}
                      label={option.label}
                      clickable
                      color={isSelected ? 'primary' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      onClick={() => {
                        const currentMultiple = tempSelection.multiple || [];
                        const newMultiple = isSelected
                          ? currentMultiple.filter((item) => item !== option.value)
                          : [...currentMultiple, option.value];
                        setTempSelection({ ...tempSelection, multiple: newMultiple });
                      }}
                      sx={{ fontSize: '0.8rem' }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
            <Button variant="outlined" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleApply}
              disabled={!isValidSelection(tempSelection)}
            >
              Apply
            </Button>
          </Box>
        </Paper>
      </Popover>
    </>
  );
};

export default LevelSelector; 