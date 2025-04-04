import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const API_KEY = process.env.GOOGLE_API_KEY;
const BASE_URL = 'https://places.googleapis.com/v1/places:searchNearby';

export async function getEVChargingStations(lat, lon, radius) {
    const halfRadius = radius / 2;
    const quadrants = [
        { lat: lat + 0.1, lon: lon + 0.1 },
        { lat: lat + 0.1, lon: lon - 0.1 },
        { lat: lat - 0.1, lon: lon + 0.1 },
        { lat: lat - 0.1, lon: lon - 0.1 }
    ];

    const fetchEVStations = async (latitude, longitude) => {
        try {
            const response = await axios.post(BASE_URL, {
                includedTypes: ["electric_vehicle_charging_station"],
                maxResultCount: 20,
                locationRestriction: {
                    circle: {
                        center: { latitude, longitude },
                        radius: halfRadius
                    }
                }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': API_KEY,
                    'X-Goog-FieldMask': 'places.id,places.name,places.types,places.displayName,places.formattedAddress,places.location,places.rating,places.photos,places.userRatingCount,places.googleMapsUri,places.evChargeOptions'
                }
            });

            return response.data.places || [];
        } catch (error) {
            console.error(`Error fetching EV stations for lat: ${latitude}, lon: ${longitude}`, error);
            return [];
        }
    };

    const results = await Promise.all(quadrants.map(q => fetchEVStations(q.lat, q.lon)));
    const allStations = results.flat();
    
    // Filter to only include stations with evChargeOptions
    return allStations.filter(station => 'evChargeOptions' in station);
}


export async function getEVChargingStationsByQuadrant(lat, lon, radius) {
    // Define the four quadrants with properly scaled offsets
    const quadrants = [
      { name: 'NE', lat: lat + radius * 0.0007, lon: lon + radius * 0.0007 },
      { name: 'NW', lat: lat + radius * 0.0007, lon: lon - radius * 0.0007 },
      { name: 'SE', lat: lat - radius * 0.0007, lon: lon + radius * 0.0007 },
      { name: 'SW', lat: lat - radius * 0.0007, lon: lon - radius * 0.0007 }
    ];
  
    // Use 70% of the radius for each quadrant search to ensure proper coverage
    const quadrantRadius = radius * 0.7;
  
    const fetchEVStations = async (quadrantData) => {
      try {
        console.log(`Searching ${quadrantData.name} quadrant at: ${quadrantData.lat}, ${quadrantData.lon} with radius: ${quadrantRadius}m`);
        
        const response = await axios.post(BASE_URL, {
          includedTypes: ["electric_vehicle_charging_station"],
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: { latitude: quadrantData.lat, longitude: quadrantData.lon },
              radius: quadrantRadius
            }
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': 'places.id,places.name,places.types,places.displayName,places.formattedAddress,places.location,places.rating,places.photos,places.userRatingCount,places.googleMapsUri,places.evChargeOptions'
          }
        });
        
        const stations = response.data.places || [];
        console.log(`Found ${stations.length} EV stations in ${quadrantData.name} quadrant`);
        return stations;
      } catch (error) {
        console.error(`Error fetching EV stations for ${quadrantData.name} quadrant:`, error.message);
        return [];
      }
    };
  
    // Fetch stations from all quadrants in parallel
    const results = await Promise.all(quadrants.map(q => fetchEVStations(q)));
    
    // Combine all results
    const allStations = results.flat();
    
    // Remove duplicates by station ID
    const uniqueStations = Array.from(
      new Map(allStations.map(station => [station.id, station])).values()
    );
    
    // Filter to only include stations with evChargeOptions
    const filteredStations = uniqueStations.filter(station => 'evChargeOptions' in station);
    
    console.log(`Found ${filteredStations.length} unique EV charging stations across all quadrants`);
    return filteredStations;
  }