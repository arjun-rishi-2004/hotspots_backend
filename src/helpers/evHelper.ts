import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const API_KEY = process.env.GOOGLE_API_KEY;
const BASE_URL = 'https://places.googleapis.com/v1/places:searchNearby';


// Haversine formula to calculate distance between two latitude/longitude points

function haversineDistance(lat1, lon1, lat2, lon2) {

  const R = 6371000; // Earth's radius in meters

  const toRad = (angle) => (angle * Math.PI) / 180;

  

  const dLat = toRad(lat2 - lat1);

  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 +

            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *

            Math.sin(dLon / 2) ** 2;

  

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;

}



export async function getEVChargingStations(lat, lon, radius) {

  // Calculate a good distance for the outer points (60% of radius)

  const distance = radius * 0.6;

  

  // Calculate search radius for each point (70% of original)

  const searchRadius = radius * 0.7;

  

  // Define sampling points - center plus 4 points in cardinal directions

  const samplePoints = [

    { lat, lon, color: "yellow" },  // Center

    { lat: lat + latOffset(distance), lon, color: "red" },       // North

    { lat, lon: lon + lonOffset(lat, distance), color: "green" }, // East

    { lat: lat - latOffset(distance), lon, color: "blue" },      // South

    { lat, lon: lon - lonOffset(lat, distance), color: "purple" } // West

  ];

  

  // Helper functions for geographic calculations

  function latOffset(distanceInMeters) {

    return distanceInMeters / 111111;

  }

  

  function lonOffset(lat, distanceInMeters) {

    const metersPerDegree = 111111 * Math.cos(lat * Math.PI / 180);

    return distanceInMeters / metersPerDegree;

  }

  

  // Function to fetch POIs for a specific location

  const fetchPOIs = async (latitude, longitude) => {

    try {

      const response = await axios.post(BASE_URL, {

        includedTypes: ["electric_vehicle_charging_station"],

        maxResultCount: 20,

        locationRestriction: {

          circle: {

            center: { latitude, longitude },

            radius: searchRadius

          }

        }

      }, {

        headers: {

          'Content-Type': 'application/json',

          'X-Goog-Api-Key': API_KEY,

          'X-Goog-FieldMask':'places.id,places.name,places.types,places.displayName,places.formattedAddress,places.location,places.photos,places.goodForChildren,places.restroom,places.outdoorSeating,places.parkingOptions,places.goodForGroups,places.accessibilityOptions,places.rating,places.userRatingCount,places.googleMapsUri'

        }

      });



      return response.data.places || [];

    } catch (error) {

      console.error(`Error fetching POIs for lat: ${latitude}, lon: ${longitude}`, error.message);

      return [];

    }

  };

  

  const pointResults = await Promise.all(

    samplePoints.map(point => fetchPOIs(point.lat, point.lon))

  );



  // Remove duplicate places and filter locations outside the radius

  const seenIds = new Set();

  const uniquePlaces = [];



  pointResults.flat().forEach(place => {

    if (!place.location || !place.location.latitude || !place.location.longitude) return;



    const placeLat = place.location.latitude;

    const placeLon = place.location.longitude;

    const distanceFromCenter = haversineDistance(lat, lon, placeLat, placeLon);



    if (distanceFromCenter <= radius) { // Filter locations within the radius

      if (place.id && !seenIds.has(place.id)) {

        seenIds.add(place.id);

        uniquePlaces.push(place);

      } else if (!place.id && place.name) {

        const placeKey = `${place.name}-${placeLat}-${placeLon}`;

        if (!seenIds.has(placeKey)) {

          seenIds.add(placeKey);

          uniquePlaces.push(place);

        }

      }

    }

  });



  return uniquePlaces;

}

