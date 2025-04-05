import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const API_KEY = process.env.GOOGLE_API_KEY!;
const BASE_URL = 'https://places.googleapis.com/v1/places:searchNearby';

// List of place types to fetch
const POI_TYPES = ["restaurant", "cafe", "shopping_mall", "movie_theater", "hotel"];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (angle) => (Math.PI / 180) * angle;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Function to check if a location is within the given radius
function isWithinRadius(centerLat, centerLon, checkLat, checkLon, radius) {
  return haversine(centerLat, centerLon, checkLat, checkLon) <= radius;
}

// Main function to get places of interest
export async function getPlacesOfInterest(lat, lon, radius) {
  const distance = radius * 0.6;
  const searchRadius = radius * 0.7;

  const samplePoints = [
    { lat, lon, color: "yellow" }, // Center
    { lat: lat + latOffset(distance), lon, color: "red" }, // North
    { lat, lon: lon + lonOffset(lat, distance), color: "green" }, // East
    { lat: lat - latOffset(distance), lon, color: "blue" }, // South
    { lat, lon: lon - lonOffset(lat, distance), color: "purple" } // West
  ];

  function latOffset(distanceInMeters) {
    return distanceInMeters / 111111;
  }

  function lonOffset(lat, distanceInMeters) {
    const metersPerDegree = 111111 * Math.cos(lat * Math.PI / 180);
    return distanceInMeters / metersPerDegree;
  }

  const fetchPOIs = async (latitude, longitude) => {
    try {
      const response = await axios.post(
        BASE_URL,
        {
          includedTypes: POI_TYPES,
          maxResultCount: 20,
          locationRestriction: {
            circle: { center: { latitude, longitude }, radius: searchRadius }
          }
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask":
         'places.id,places.name,places.types,places.displayName,places.formattedAddress,places.location,places.photos,places.goodForChildren,places.restroom,places.outdoorSeating,places.parkingOptions,places.goodForGroups,places.accessibilityOptions,places.rating,places.userRatingCount,places.googleMapsUri' 
        }
        }
      );

      return response.data.places || [];
    } catch (error) {
      console.error(`Error fetching POIs for lat: ${latitude}, lon: ${longitude}`, error.message);
      return [];
    }
  };

  const pointResults = await Promise.all(
    samplePoints.map((point) => fetchPOIs(point.lat, point.lon))
  );

  const seenIds = new Set();
  const uniquePlaces = [];

  pointResults.flat().forEach((place) => {
    if (!place.location) return;

    const { latitude, longitude } = place.location;
    if (!isWithinRadius(lat, lon, latitude, longitude, radius)) return; // Filter out places outside radius

    if (place.id && !seenIds.has(place.id)) {
      seenIds.add(place.id);
      uniquePlaces.push(place);
    } else if (!place.id && place.name) {
      const placeKey = `${place.name}-${latitude}-${longitude}`;
      if (!seenIds.has(placeKey)) {
        seenIds.add(placeKey);
        uniquePlaces.push(place);
      }
    }
  });

  return uniquePlaces;
}
 
export async function getPlacesOfInterest1(lat: number, lon: number, radius: number) {
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

  