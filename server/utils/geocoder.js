const NodeGeocoder = require('node-geocoder');

// Initialize geocoder
const geocoder = NodeGeocoder({
  provider: 'google',
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
  formatter: null
});

// Geocode address to coordinates
const geocodeAddress = async (address) => {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured, using fallback coordinates');
      return {
        latitude: 40.7128,
        longitude: -74.0060,
        formattedAddress: address
      };
    }

    const results = await geocoder.geocode(address);
    
    if (results && results.length > 0) {
      const result = results[0];
      return {
        latitude: result.latitude,
        longitude: result.longitude,
        formattedAddress: result.formattedAddress
      };
    }

    throw new Error('No geocoding results found');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode address');
  }
};

// Reverse geocode coordinates to address
const reverseGeocode = async (latitude, longitude) => {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return {
        formattedAddress: 'Address not available',
        street: '',
        city: '',
        state: '',
        zipCode: ''
      };
    }

    const results = await geocoder.reverse({ lat: latitude, lon: longitude });
    
    if (results && results.length > 0) {
      const result = results[0];
      return {
        formattedAddress: result.formattedAddress,
        street: result.streetNumber + ' ' + result.streetName,
        city: result.city,
        state: result.state,
        zipCode: result.zipcode
      };
    }

    throw new Error('No reverse geocoding results found');
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw new Error('Failed to reverse geocode coordinates');
  }
};

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in miles
  return distance;
};

// Format address object to string
const formatAddress = (address) => {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode
  ].filter(Boolean);
  
  return parts.join(', ');
};

// Parse address string to object
const parseAddress = (addressString) => {
  const parts = addressString.split(',').map(part => part.trim());
  
  if (parts.length >= 4) {
    return {
      street: parts[0],
      city: parts[1],
      state: parts[2],
      zipCode: parts[3]
    };
  }
  
  return {
    street: parts[0] || '',
    city: parts[1] || '',
    state: parts[2] || '',
    zipCode: parts[3] || ''
  };
};

module.exports = {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  formatAddress,
  parseAddress
}; 