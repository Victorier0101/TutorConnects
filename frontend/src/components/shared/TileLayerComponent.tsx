import React from 'react';
import { TileLayer } from 'react-leaflet';

interface TileLayerComponentProps {
  componentName?: string;
}

const TileLayerComponent: React.FC<TileLayerComponentProps> = ({ componentName = 'Map' }) => {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      maxZoom={19}
      tileSize={256}
      zoomOffset={0}
      subdomains={['a', 'b', 'c', 'd']}
      eventHandlers={{
        tileerror: (e) => {
          console.warn(`CartoDB tile loading error in ${componentName}:`, e);
        },
        tileload: () => {
          console.log(`CartoDB tile loaded successfully in ${componentName}`);
        }
      }}
    />
  );
};

export default TileLayerComponent; 