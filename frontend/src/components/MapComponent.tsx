import React, { useEffect, useState, memo } from 'react';
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
  const [geocodingCache, setGeocodingCache] = useState<Map<string, [number, number]>>(new Map());

  // Helper function to add timeout to fetch requests
  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Geocode with retry logic
  const geocodeLocationWithRetry = async (location: string, maxRetries = 2): Promise<[number, number] | null> => {
    const cacheKey = location.toLowerCase().trim();
    
    // Check cache first
    if (geocodingCache.has(cacheKey)) {
      return geocodingCache.get(cacheKey)!;
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(
          `http://localhost:3001/api/geocode?location=${encodeURIComponent(location)}`,
          {},
          3000 // 3 second timeout per request
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          const coordinates: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          
          // Cache the result
          setGeocodingCache(prev => new Map(prev).set(cacheKey, coordinates));
          
          return coordinates;
        }
        
        // No data returned, break out of retry loop
        break;
        
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        
        if (error instanceof Error && error.name === 'AbortError') {
          if (!isLastAttempt) {
            console.log(`📍 Request aborted for ${location}, retrying... (${attempt + 1}/${maxRetries + 1})`);
            // Small delay before retry
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          } else {
            console.log(`📍 Request aborted for ${location}, no more retries`);
          }
        } else if (!isLastAttempt) {
          console.log(`📍 Geocoding error for ${location}: ${error instanceof Error ? error.message : 'Unknown error'}, retrying... (${attempt + 1}/${maxRetries + 1})`);
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        } else {
          console.log(`📍 Geocoding failed for ${location} after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return null;
  };

  // Get fallback coordinates for common locations
  const getFallbackCoordinates = (location: string): [number, number] => {
    const loc = location.toLowerCase().trim();
    
    // Major cities and regions
    const fallbackMap: Record<string, [number, number]> = {
      'burnaby': [49.2488, -122.9805],
      'vancouver': [49.2827, -123.1207],
      'san francisco': [37.7749, -122.4194],
      'san francisco, ca': [37.7749, -122.4194],
      'berkeley': [37.8715, -122.273],
      'berkeley, ca': [37.8715, -122.273],
      'los angeles': [34.0522, -118.2437],
      'los angeles, ca': [34.0522, -118.2437],
      'palo alto': [37.4419, -122.143],
      'palo alto, ca': [37.4419, -122.143],
      'oakland': [37.8044, -122.2712],
      'oakland, ca': [37.8044, -122.2712],
      'toronto': [43.6532, -79.3832],
      'montreal': [45.5017, -73.5673],
      'calgary': [51.0447, -114.0719],
      'ottawa': [45.4215, -75.6972],
      'new york': [40.7128, -74.0060],
      'chicago': [41.8781, -87.6298],
      'seattle': [47.6062, -122.3321],
      'california': [36.7783, -119.4179],
      'america': [39.8283, -98.5795],
      'canada': [56.1304, -106.3468],
    };

    // Try exact match first
    if (fallbackMap[loc]) {
      return fallbackMap[loc];
    }

    // Try partial matches
    for (const [key, coords] of Object.entries(fallbackMap)) {
      if (loc.includes(key) || key.includes(loc)) {
        return coords;
      }
    }

    // Default to San Francisco
    return [37.7749, -122.4194];
  };

  useEffect(() => {
    const geocodePosts = async () => {
      console.log('📍 Starting geocoding for posts:', posts.length);
      console.log('📍 Posts received:', posts.map(p => ({ id: p.id, location: p.location, format: p.format })));
      
      // Filter out only purely online posts since they don't need physical locations on the map
      // Include in-person and both formats since they have physical locations
      const locationBasedPosts = posts.filter(post => {
        const format = post.format.toLowerCase().trim();
        const shouldInclude = format !== 'online';
        console.log(`📍 Post ${post.id} (${post.location}): format="${post.format}" -> ${shouldInclude ? 'INCLUDE' : 'EXCLUDE'}`);
        return shouldInclude;
      });

      console.log('📍 Location-based posts to geocode:', locationBasedPosts.length);
      console.log('📍 Location-based posts:', locationBasedPosts.map(p => ({ id: p.id, location: p.location, format: p.format })));

      if (locationBasedPosts.length === 0) {
        console.log('📍 No location-based posts, skipping geocoding');
        setGeocodedPosts([]);
        setLoading(false);
        return;
      }

      const postsWithCoords = await Promise.all(
        locationBasedPosts.map(async (post, index) => {
          // Add delay between requests to respect API limits
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
          }

          if (post.coordinates) {
            console.log(`📍 Post ${post.id} already has coordinates`);
            return post;
          }
          
          let coordinates: [number, number] | null = null;
          
          try {
            console.log(`📍 Geocoding: ${post.location}`);
            coordinates = await geocodeLocationWithRetry(post.location);
            
            if (coordinates) {
              console.log(`📍 Successfully geocoded ${post.location}:`, coordinates);
            }
          } catch (error) {
            // Handle different types of errors specifically
            if (error instanceof Error) {
              if (error.name === 'AbortError') {
                console.log(`📍 Request aborted for ${post.location}, using fallback coordinates`);
              } else {
                console.log(`📍 Geocoding error for ${post.location}: ${error.message}, using fallback`);
              }
            } else {
              console.log(`📍 Unknown geocoding error for ${post.location}, using fallback`);
            }
          }
          
          // If we didn't get coordinates from API, use fallback
          if (!coordinates) {
            coordinates = getFallbackCoordinates(post.location);
            console.log(`📍 Using fallback coordinates for ${post.location}:`, coordinates);
            
            // Cache the fallback result too
            const cacheKey = post.location.toLowerCase().trim();
            setGeocodingCache(prev => new Map(prev).set(cacheKey, coordinates!));
          }
          
          return {
            ...post,
            coordinates,
          };
        })
      );
      
      console.log('📍 Geocoding completed, setting posts');
      console.log('📍 Final geocoded posts:', postsWithCoords.map(p => ({ 
        id: p.id, 
        location: p.location, 
        coordinates: p.coordinates,
        hasCoords: !!p.coordinates 
      })));
      setGeocodedPosts(postsWithCoords);
      setLoading(false);
    };

    if (posts.length > 0) {
      setLoading(true);
      
      // Safety timeout to prevent infinite loading
      const safetyTimeout = setTimeout(() => {
        console.log('📍 Geocoding taking too long, forcing completion');
        setLoading(false);
      }, 15000); // 15 second total timeout
      
      geocodePosts().catch(error => {
        console.error('📍 Geocoding failed:', error);
        // Even if geocoding fails completely, show posts with fallback coordinates
        const fallbackPosts = posts
          .filter(post => post.format.toLowerCase().trim() !== 'online')
          .map(post => ({
            ...post,
            coordinates: getFallbackCoordinates(post.location),
          }));
        setGeocodedPosts(fallbackPosts);
        setLoading(false);
      }).finally(() => {
        clearTimeout(safetyTimeout);
      });
    } else {
      console.log('📍 No posts provided, setting empty array');
      setGeocodedPosts([]);
      setLoading(false);
    }
  }, [posts]); // Only depend on posts, not geocodingCache to prevent infinite loops

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

export default memo(MapComponent, (prev, next) => {
  // Shallow compare posts array reference and selectedPost
  return prev.posts === next.posts && prev.selectedPost === next.selectedPost;
}); 