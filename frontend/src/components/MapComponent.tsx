import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
import { Box, Typography, Chip, IconButton, Fade, Paper } from '@mui/material';
import { 
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Post {
  id: number;
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
}

interface MapComponentProps {
  posts: Post[];
  selectedPost?: Post | null;
  onPostSelect?: (post: Post) => void;
}

// Custom hook to geocode locations (convert address to coordinates)
const useGeocoding = (posts: Post[]) => {
  const [geocodedPosts, setGeocodedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const geocodePosts = async () => {
      // Filter out only purely online posts since they don't need physical locations on the map
      // Include in-person and both formats since they have physical locations
      const locationBasedPosts = posts.filter(post => 
        post.format.toLowerCase() !== 'online'
      );

      const postsWithCoords = await Promise.all(
        locationBasedPosts.map(async (post) => {
          if (post.coordinates) return post;
          
          try {
            // Using free Nominatim geocoding service (OpenStreetMap)
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(post.location)}&limit=1`
            );
            const data = await response.json();
            
            if (data && data.length > 0) {
              return {
                ...post,
                coordinates: [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number],
              };
            }
          } catch (error) {
            console.error('Geocoding error:', error);
          }
          
          // Default to San Francisco if geocoding fails
          return {
            ...post,
            coordinates: [37.7749, -122.4194] as [number, number],
          };
        })
      );
      
      setGeocodedPosts(postsWithCoords);
      setLoading(false);
    };

    if (posts.length > 0) {
      geocodePosts();
    } else {
      setLoading(false);
    }
  }, [posts]);

  return { geocodedPosts, loading };
};

// Custom markers for different post types
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

const MapComponent: React.FC<MapComponentProps> = ({ posts, selectedPost, onPostSelect }) => {
  const { geocodedPosts, loading } = useGeocoding(posts);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([37.7749, -122.4194]); // Default to San Francisco
  const [mapBounds, setMapBounds] = useState<[[number, number], [number, number]] | null>(null);

  // World boundaries to prevent dragging into gray space
  const worldBounds: [[number, number], [number, number]] = [
    [-90, -180], // Southwest corner of the world
    [90, 180]    // Northeast corner of the world
  ];

  useEffect(() => {
    if (geocodedPosts.length > 0) {
      // Calculate center point of all markers
      const avgLat = geocodedPosts.reduce((sum, post) => sum + (post.coordinates?.[0] || 0), 0) / geocodedPosts.length;
      const avgLng = geocodedPosts.reduce((sum, post) => sum + (post.coordinates?.[1] || 0), 0) / geocodedPosts.length;
      setMapCenter([avgLat, avgLng]);

      // Calculate bounds with padding around the posts
      const coordinates = geocodedPosts
        .map(post => post.coordinates)
        .filter((coord): coord is [number, number] => coord !== undefined);

      if (coordinates.length > 0) {
        const lats = coordinates.map(coord => coord[0]);
        const lngs = coordinates.map(coord => coord[1]);
        
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        // Add padding (roughly 20% on each side)
        const latPadding = (maxLat - minLat) * 0.3 || 0.1; // Minimum padding of 0.1 degrees
        const lngPadding = (maxLng - minLng) * 0.3 || 0.1;
        
        setMapBounds([
          [minLat - latPadding, minLng - lngPadding], // Southwest corner
          [maxLat + latPadding, maxLng + lngPadding]  // Northeast corner
        ]);
      }
    }
  }, [geocodedPosts]);

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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <LocationIcon sx={{ fontSize: 48, color: '#667eea' }} />
        </motion.div>
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
          zoom={geocodedPosts.length > 1 ? 10 : 13}
          style={{ height: '400px', width: '100%' }}
          scrollWheelZoom={true}
          maxBounds={worldBounds}
          maxBoundsViscosity={0.8}
          minZoom={1}
          maxZoom={18}
          bounceAtZoomLimits={true}
          worldCopyJump={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            noWrap={true}
          />
          
          {geocodedPosts.map((post) => (
            post.coordinates && (
              <Marker
                key={post.id}
                position={post.coordinates}
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
                      {post.subject} - {post.level}
                    </Typography>
                    
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
            )
          ))}
        </MapContainer>
      </Paper>
    </Fade>
  );
};

export default MapComponent; 