// Shared coordinate utilities for consistent handling across map components

export interface CoordinateData {
  latitude?: string | number;
  longitude?: string | number;
}

export const parseCoordinates = (data: CoordinateData): [number, number] | null => {
  if (!data.latitude || !data.longitude) {
    return null;
  }

  const lat = parseFloat(data.latitude as string);
  const lng = parseFloat(data.longitude as string);

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

export const getDefaultCoordinates = (): [number, number] => {
  // Default to Vancouver, BC (more relevant for the tutoring app)
  return [49.2827, -123.1207];
}; 