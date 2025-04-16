import axios from 'axios';
import polyline from 'polyline';
import dotenv from 'dotenv';
import { RouteData,SplitPolylineResult } from '../types';
dotenv.config();
const API_KEY = process.env.GOOGLE_API_KEY1;
const Google_API_KEY = process.env.GOOGLE_API_KEY;




export const fetchPolyLine=async(orLatitude,orLongitude,desLatitude,desLongitude): Promise<RouteData | null>=>{
  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline',
  };

  const data = {
    origin: {
      location: {
        latLng: {
          latitude: orLatitude,
          longitude: orLongitude
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: desLatitude,
          longitude: desLongitude
        },
      },
    },
    
  };

  try {
    const response = await axios.post(url, data, { headers });
    const encodedPolyline = response.data.routes[0].polyline.encodedPolyline;
    const distance=response.data.routes[0].distanceMeters;
    const decodedPoints = polyline.decode(encodedPolyline) as [number, number][];
    // console.log(decodedPoints)
    return { encodedPolyline,distance,decodedPoints};
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}


export const splitPolylineByDistance= (
  encodedPolyline: string,
  distance: number
): SplitPolylineResult => {
  const decoded = polyline.decode(encodedPolyline) as [number, number][];
  const totalPoints = decoded.length;

  let segments = 1;
  if (distance >= 100000 && distance < 200000) {
    segments = 2;
  } else if (distance >= 200000 && distance < 300000) {
    segments = 3;
  } else if (distance >= 300000) {
    segments = 4;
  }

  const chunkSize = Math.ceil(totalPoints / segments);
  const polylines: string[] = [];


  for (let i = 0; i < totalPoints; i += chunkSize) {
    const chunk = decoded.slice(i, i + chunkSize);
    polylines.push(polyline.encode(chunk));
  }
  // console.log("splited_PoliLines",polylines)
  // console.log("datapoints_as_wayPoints",dataPoints)
  return { polylines };
};


export const getPlacesAlongRoute=async(textQuery: string, encodedPolyline: string)=> {
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': Google_API_KEY,
    'X-Goog-FieldMask': [
      'places.id',
      'places.name',
      'places.types',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.photos',
      'places.goodForChildren',
      'places.restroom',
      'places.outdoorSeating',
      'places.parkingOptions',
      'places.goodForGroups',
      'places.accessibilityOptions',
      'places.rating',
      'places.userRatingCount',
      'places.googleMapsUri',
      'places.evChargeOptions'
    ].join(',')
  };

  const payload = {
    textQuery,
    searchAlongRouteParameters: {
      polyline: {
        encodedPolyline
      }
    }
  };

  try {
    const response = await axios.post(url, payload, { headers });
    return response.data;
  } catch (error) {
    console.error('Google Places API error:', error.response?.data || error.message);
    throw error;
  }
}

export async function getEvStationsAlongRoute(textQuery: string, encodedPolyline: string): Promise<any> {
  try {
    const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
    const response = await axios.post(
      ENDPOINT,
      {
        textQuery,
        searchAlongRouteParameters: {
          polyline: {
            encodedPolyline,
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": Google_API_KEY,
          "X-Goog-FieldMask": "places.id,places.name,places.types,places.displayName,places.formattedAddress,places.location,places.rating,places.photos,places.userRatingCount,places.googleMapsUri,places.evChargeOptions",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Error fetching places:", error.response?.data || error.message);
    throw error;
  }
}