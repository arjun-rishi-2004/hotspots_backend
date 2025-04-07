import axios from 'axios';
import dotenv from 'dotenv';
import fs from "fs"
dotenv.config();
const API_KEY = process.env.GOOGLE_API_KEY!;
const BASE_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const OLA_API_KEY = "vNw2opgPsevmRvTcyd5zD9q96Dhyhzo1Nd7ilDU3"
// List of place types to fetch
const POI_TYPES = ["restaurant", "cafe", "shopping_mall", "movie_theater", "hotel"];
function generateRequestId() {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `req-${timestamp}-${randomStr}`;
}
// Function to check if a location is within the given radius using the Distance Matrix API
// Function to check multiple locations against a center point using a single Distance Matrix API call
async function checkLocationsWithinRadius(centerLat, centerLon, locations, radius) {
  try {
    // No locations to check
    if (locations.length === 0) return [];
    
    // Format the destinations string for the API call
    const destinations = locations
      .map(loc => `${loc.latitude},${loc.longitude}`)
      .join('|');
    
    // Make a single API call for all destinations
    const response = await axios.get(
      `https://api.olamaps.io/routing/v1/distanceMatrix/basic`,
      {
        params: {
          origins: `${centerLat},${centerLon}`,
          destinations: destinations,
          api_key: OLA_API_KEY
        },
        headers: {
          "X-Request-Id": generateRequestId()
        }
      }
    );
    
    // Process the results and return locations within radius
    const withinRadiusResults = [];
    
    if (response.data && 
        response.data.rows && 
        response.data.rows[0] && 
        response.data.rows[0].elements) {
      
      const elements = response.data.rows[0].elements;
      
      // For each location, check if it's within the radius
      for (let i = 0; i < locations.length; i++) {
        if (elements[i] && elements[i].status === "OK") {
          const distance = elements[i].distance;
          if (distance <= radius) {
            withinRadiusResults.push({
              ...locations[i],
              distance // Add the actual distance to the result
            });
          }
        }
      }
    }
    
    return withinRadiusResults;
  } catch (error) {
    console.error("Error checking distances with API:", error);
    // Fallback to Haversine if API fails
    console.log("Falling back to Haversine formula");
    return locations.filter(loc => 
      haversine(centerLat, centerLon, loc.latitude, loc.longitude) <= radius
    );
  }
}

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
         'places.id,places.name,places.types,places.displayName,places.formattedAddress,places.location,places.photos,places.goodForChildren,places.restroom,places.outdoorSeating,places.parkingOptions,places.goodForGroups,places.accessibilityOptions,places.rating,places.userRatingCount,places.googleMapsUri,places.evChargeOptions' 
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
  // console.log(pointResults.flat())
  let flattenedResults = pointResults.flat();
  // fs.writeFileSync("suggestedPlaces.json", JSON.stringify(flattenedResults, null, 2));
  const locationsToCheck = [];
  const placesMap = new Map(); // Map to relate location indices to places
  
  flattenedResults.forEach((place, index) => {
    if (!place || !place.location) return;
    
    const { latitude, longitude } = place.location;
    if (!latitude || !longitude) return;
    
    // Add to locations array
    locationsToCheck.push({
      latitude,
      longitude,
      index // Keep track of original index
    });
    
    // Map this location to the original place
    placesMap.set(locationsToCheck.length - 1, place);
  });
  
  // Batch check all locations against the center point
  const locationsWithinRadius = await checkLocationsWithinRadius(
    lat, lon, locationsToCheck, radius
  );
  
  const seenIds = new Set();
  const uniquePlaces = [];

  locationsWithinRadius.forEach(loc => {
    const place = placesMap.get(loc.index);
    if (!place) return;
    
    // Add distance from API to the place object
    place.distance = loc.distance;
    
    // Deduplicate based on place ID or name+location
    if (place.id && !seenIds.has(place.id)) {
      seenIds.add(place.id);
      uniquePlaces.push(place);
    } else if (!place.id && place.name) {
      const placeKey = `${place.name}-${loc.latitude}-${loc.longitude}`;
      if (!seenIds.has(placeKey)) {
        seenIds.add(placeKey);
        uniquePlaces.push(place);
      }
    }
  });
  
  // Sort by distance (optional)
  uniquePlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  
  return uniquePlaces;
}