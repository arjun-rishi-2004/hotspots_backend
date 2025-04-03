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
                    'X-Goog-FieldMask': 'places.id,places.name,places.types,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.evChargeOptions'
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
