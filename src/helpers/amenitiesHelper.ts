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
                    'X-Goog-FieldMask': 'places.id,places.name,places.types,places.displayName,places.formattedAddress,places.location,places.photos,places.goodForChildren,places.restroom,places.outdoorSeating,places.parkingOptions,places.goodForGroups,places.accessibilityOptions,places.rating,places.userRatingCount,places.googleMapsUri'
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


export async function getPlacesOfInterestByQuadrants(lat: number, lon: number, radius: number) {
    // Define the four quadrants (NE, NW, SE, SW)
    const quadrants = [
      { name: 'NE', latOffset: radius * 0.0007, lonOffset: radius * 0.0007 },
      { name: 'NW', latOffset: radius * 0.0007, lonOffset: -radius * 0.0007 },
      { name: 'SE', latOffset: -radius * 0.0007, lonOffset: radius * 0.0007 },
      { name: 'SW', latOffset: -radius * 0.0007, lonOffset: -radius * 0.0007 }
    ];
   
    // Use half the radius for each quadrant search to maintain coverage
    const quadrantRadius = radius * 0.7;
   
    const fetchPOIsInQuadrant = async (quadrant: { name: string, latOffset: number, lonOffset: number }) => {
      // Calculate the center point for this quadrant
      const quadrantLat = lat + quadrant.latOffset;
      const quadrantLon = lon + quadrant.lonOffset;
      try {
        console.log(`Fetching ${quadrant.name} quadrant at: ${quadrantLat}, ${quadrantLon} with radius: ${quadrantRadius}m`);
        const response = await axios.post(BASE_URL, {
          includedTypes: POI_TYPES,
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: { latitude: quadrantLat, longitude: quadrantLon },
              radius: quadrantRadius
            }
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': 'places.id,places.name,places.types,places.displayName,places.formattedAddress,places.location,places.photos,places.goodForChildren,places.restroom,places.outdoorSeating,places.parkingOptions,places.goodForGroups,places.accessibilityOptions,places.rating,places.userRatingCount,places.googleMapsUri'
          }
        });
        const results = response.data.places || [];
        console.log(`Found ${results.length} POIs in ${quadrant.name} quadrant`);
        return results;
      } catch (error) {
        console.error(`Error fetching POIs for ${quadrant.name} quadrant`, error.message);
        return [];
      }
    };
   
    // Fetch all quadrants in parallel
    const results = await Promise.all(quadrants.map(q => fetchPOIsInQuadrant(q)));
    // Merge results and remove duplicates by place ID
    const allResults = results.flat();
    const uniqueResults = Array.from(
      new Map(allResults.map(place => [place.id, place])).values()
    );
    console.log(`Found ${uniqueResults.length} unique POIs across all quadrants`);
    return uniqueResults;
  }