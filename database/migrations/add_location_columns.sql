-- Add enhanced location columns to posts table
-- Run this migration to add coordinate storage and validation tracking

ALTER TABLE posts 
ADD COLUMN latitude DECIMAL(10, 8) NULL COMMENT 'Latitude coordinate for precise location',
ADD COLUMN longitude DECIMAL(11, 8) NULL COMMENT 'Longitude coordinate for precise location',
ADD COLUMN location_confidence ENUM('high', 'medium', 'low') NULL COMMENT 'Confidence level of geocoded location',
ADD COLUMN location_source VARCHAR(50) NULL COMMENT 'Source of geocoding (nominatim, photon, mapbox)';

-- Add spatial index for geographic queries
ALTER TABLE posts 
ADD SPATIAL INDEX spatial_location (latitude, longitude);

-- Optional: Add index on location_confidence for filtering
ALTER TABLE posts 
ADD INDEX idx_location_confidence (location_confidence); 