-- Migration to add flexible education level support
-- This adds new columns for flexible level ranges while maintaining backward compatibility

USE tutorconnect;

-- Add new columns for flexible level ranges
ALTER TABLE posts 
ADD COLUMN level_type ENUM('single', 'range', 'multiple') DEFAULT 'single' COMMENT 'Type of level selection',
ADD COLUMN level_min VARCHAR(50) NULL COMMENT 'Minimum level for ranges (e.g., "grade-1", "elementary")',
ADD COLUMN level_max VARCHAR(50) NULL COMMENT 'Maximum level for ranges (e.g., "grade-5", "middle")',
ADD COLUMN level_list JSON NULL COMMENT 'List of specific levels for multiple selection';

-- Update existing posts to use the new format
UPDATE posts SET 
    level_type = 'single',
    level_min = level,
    level_max = level
WHERE level_type IS NULL;

-- Create indexes for the new level columns
CREATE INDEX idx_level_type ON posts(level_type);
CREATE INDEX idx_level_min ON posts(level_min);
CREATE INDEX idx_level_max ON posts(level_max); 