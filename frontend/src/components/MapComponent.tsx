import React, { useEffect, useState, memo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
import { Box, Typography, Chip, IconButton, Fade, Paper, CircularProgress, Button, Alert } from '@mui/material';
import { 
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import TileLayerComponent from './shared/TileLayerComponent';
import { parseCoordinates, getDefaultCoordinates } from './shared/coordinateUtils';
import LevelDisplay, { LevelData } from './shared/LevelDisplay';
import FormatBadge from './shared/FormatBadge';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Post {
  id: number;
  user_id?: number;
  post_type: 'seeking' | 'offering';
  name: string;
  email: string;
  subject: string;
  level: string;
  location: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  format: string;
  description: string;
  created_at: string;
  avatar_url?: string;
  rating?: number;
  total_reviews?: number;
  contact_email?: string;
  contact_phone?: string;
  image_urls?: string[];
  levelData?: LevelData;
}

interface MapComponentProps {
  posts: Post[];
  selectedPost?: Post | null;
  onPostSelect?: (post: Post) => void;
}

// Type for posts that have been validated to have numeric coordinates
type ValidatedPost = Post & {
  latitude: number;
  longitude: number;
};

// Custom icon creation function
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

// Helper function to convert Post coordinates to CoordinateData format
const getPostCoordinates = (post: Post): [number, number] | null => {
  if (!post.latitude || !post.longitude) {
    return null;
  }

  const lat = parseFloat(post.latitude as string);
  const lng = parseFloat(post.longitude as string);

  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }

  // Validate coordinate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.warn(`Invalid coordinates: lat=${lat}, lng=${lng}`);
    return null;
  }

  return [lat, lng];
};

const MapComponent: React.FC<MapComponentProps> = ({ posts, selectedPost, onPostSelect }) => {
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([43.6532, -79.3832]); // Default to Toronto
  const [validPosts, setValidPosts] = useState<ValidatedPost[]>([]);
  const [mapZoom, setMapZoom] = useState(10);

  // World boundaries to prevent dragging into gray space
  const worldBounds: [[number, number], [number, number]] = [
    [-90, -180], // Southwest corner of the world
    [90, 180]    // Northeast corner of the world
  ];

  useEffect(() => {
    console.log('📍 Processing posts for map:', posts.length);
    
    // Filter posts that have valid coordinates and are location-based
    const postsWithCoordinates: ValidatedPost[] = posts.filter(post => {
      // Convert string coordinates to numbers using our helper
      const coords = getPostCoordinates(post);
      const isLocationBased = post.format.toLowerCase() !== 'online';
      
      const isValid = coords !== null && isLocationBased;
      
      if (coords) {
        console.log(`📍 Post ${post.id}: lat=${coords[0]}, lng=${coords[1]}, isLocationBased=${isLocationBased}, valid=${isValid}`);
      } else {
        console.log(`📍 Post ${post.id}: no valid coordinates, isLocationBased=${isLocationBased}, valid=${isValid}`);
      }
      
      return isValid;
    }).map(post => {
      const coords = getPostCoordinates(post)!; // We know it's valid from the filter above
      return {
        ...post,
        // Ensure coordinates are numbers
        latitude: coords[0],
        longitude: coords[1]
      } as ValidatedPost;
    });

    console.log(`📍 Valid posts for map: ${postsWithCoordinates.length}/${posts.length}`);
    
    setValidPosts(postsWithCoordinates);

    if (postsWithCoordinates.length > 0) {
      // Calculate center point of all markers
      const avgLat = postsWithCoordinates.reduce((sum, post) => 
        sum + (post.latitude || 0), 0) / postsWithCoordinates.length;
      const avgLng = postsWithCoordinates.reduce((sum, post) => 
        sum + (post.longitude || 0), 0) / postsWithCoordinates.length;
      
      // Ensure center coordinates are valid numbers
      if (!isNaN(avgLat) && !isNaN(avgLng)) {
      setMapCenter([avgLat, avgLng]);
        console.log(`📍 Map center set to: [${avgLat}, ${avgLng}]`);
        
        // Set zoom level based on number of posts and their spread
        if (postsWithCoordinates.length === 1) {
          setMapZoom(13);
        } else if (postsWithCoordinates.length <= 3) {
          setMapZoom(11);
        } else {
          setMapZoom(9);
        }
      } else {
        console.log('📍 Invalid center coordinates, using default');
        setMapCenter(getDefaultCoordinates());
        setMapZoom(10);
      }
    } else {
      console.log('📍 No valid posts with coordinates, using default center');
      setMapCenter(getDefaultCoordinates());
      setMapZoom(10);
    }

    // Quick loading simulation to show the loading state briefly
    setTimeout(() => setLoading(false), 300);
  }, [posts]);

  if (loading) {
    return (
      <Box
        sx={{
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #f0f4ff 0%, #e6f3ff 100%)',
        }}
      >
        <CircularProgress sx={{ color: '#667eea' }} />
        <Typography sx={{ ml: 2, color: '#667eea', fontWeight: 600 }}>
          Loading map...
        </Typography>
      </Box>
    );
  }

  return (
    <Fade in={!loading}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '400px', width: '100%' }}
          scrollWheelZoom={true}
          maxBounds={worldBounds}
          maxBoundsViscosity={0.8}
          minZoom={2}
          maxZoom={18}
          bounceAtZoomLimits={true}
          worldCopyJump={false}
        >
          {/* Using CartoDB Positron tiles - reliable and fast */}
          <TileLayerComponent />
          
          {validPosts.map((post) => {
            const lat = post.latitude!; // Non-null assertion since we validated in filter
            const lng = post.longitude!; // Non-null assertion since we validated in filter
            
            // Since we already validated coordinates in the filter, we can use them directly
            return (
              <Marker
                key={post.id}
                position={[lat, lng]}
                icon={createCustomIcon(post.post_type)}
                eventHandlers={{
                  click: () => onPostSelect?.(post),
                }}
              >
                <Popup>
                  <Box sx={{ p: 1, minWidth: 250 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip
                        size="small"
                        label={post.post_type === 'seeking' ? 'Looking for Tutor' : 'Offering Services'}
                        color={post.post_type === 'seeking' ? 'warning' : 'success'}
                        sx={{ fontWeight: 600 }}
                      />
                      {post.format.toLowerCase() === 'both' && (
                        <Chip
                          size="small"
                          label="Also Online"
                          variant="outlined"
                          sx={{ 
                            fontWeight: 500, 
                            fontSize: '0.7rem',
                            color: '#10b981',
                            borderColor: '#10b981'
                          }}
                        />
                      )}
                    </Box>
                    
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {post.subject}
                    </Typography>
                    
                    <LevelDisplay 
                      levelData={post.levelData} 
                      legacyLevel={post.level} 
                      size="small" 
                      variant="chip" 
                    />
                    
                    <Box sx={{ mt: 1, mb: 0.5 }}>
                      <FormatBadge format={post.format} size="small" />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 16, color: '#667eea' }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {post.name}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <LocationIcon sx={{ fontSize: 16, color: '#667eea' }} />
                      <Typography variant="body2" color="text.secondary">
                        {post.location}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.4 }}>
                      {post.description.length > 100 
                        ? `${post.description.substring(0, 100)}...` 
                        : post.description
                      }
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        href={`mailto:${post.email}`}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%)',
                          },
                        }}
                      >
                        <EmailIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Popup>
              </Marker>
            );
          }).filter(Boolean)}
        </MapContainer>
      </Paper>
    </Fade>
  );
};

export default memo(MapComponent, (prev, next) => {
  // Shallow compare posts array reference and selectedPost
  return prev.posts === next.posts && prev.selectedPost === next.selectedPost;
}); 