import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const API_KEY = process.env.GOOGLE_API_KEY!;
const BASE_URL = 'https://places.googleapis.com/v1/places:searchNearby';

// List of place types to fetch
const POI_TYPES = ["restaurant", "cafe", "shopping_mall", "movie_theater", "hotel"];

export async function getPlacesOfInterest(lat: number, lon: number, radius: number) {
    const halfRadius = radius / 2;
    const quadrants = [
        { lat: lat + 0.1, lon: lon + 0.1 },
        { lat: lat + 0.1, lon: lon - 0.1 },
        { lat: lat - 0.1, lon: lon + 0.1 },
        { lat: lat - 0.1, lon: lon - 0.1 }
    ];

    const fetchPOIs = async (latitude: number, longitude: number) => {
        try {
            const response = await axios.post(BASE_URL, {
                includedTypes: POI_TYPES,
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
                    'X-Goog-FieldMask': 'places.id,places.name,places.types,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri'
                }
            });

            return response.data.places || [];
        } catch (error) {
            console.error(`Error fetching POIs for lat: ${latitude}, lon: ${longitude}`, error.message);
            return [];
        }
    };

    const results = await Promise.all(quadrants.map(q => fetchPOIs(q.lat, q.lon)));
    return results.flat();
}