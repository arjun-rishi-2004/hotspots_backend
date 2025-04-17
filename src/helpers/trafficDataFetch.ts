import axios from 'axios';
import polyline from 'polyline';

import { Coordinate, LatLngTuple,Segment,TrafficSegment } from '../types';

export const fetchTrafficAlongRouteWithWaypoints = async (
  origin: Coordinate,
  destination: Coordinate,
  waypoints: LatLngTuple[]
): Promise<any> => {
  const originStr = `${origin.latitude},${origin.longitude}`;
  const destinationStr = `${destination.latitude},${destination.longitude}`;

  
  // Sample up to 25 waypoints evenly
  const maxWaypoints = 25;
  const total = waypoints.length;

  let sampledWaypoints: LatLngTuple[] = [];
  if (total <= maxWaypoints) {
    sampledWaypoints = waypoints;
  } else {
    const step = Math.floor(total / maxWaypoints);
    for (let i = 0; i < total && sampledWaypoints.length < maxWaypoints; i += step) {
      sampledWaypoints.push(waypoints[i]);
    }
  }

  const waypointsStr = sampledWaypoints.map(([lat, lng]) => `${lat},${lng}`).join('|');
//   console.log(waypointsStr);

  const url = 'https://api.olamaps.io/routing/v1/directions';

  try {
    const response = await axios.post(
      url,
      null,
      {
        headers: {
          accept: 'application/json',
        },
        params: {
          origin: originStr,
          destination: destinationStr,
          waypoints: waypointsStr,
          mode: 'driving',
          alternatives: 'false',
          steps: 'true',
          overview: 'full',
          language: 'en',
          traffic_metadata: 'true',
          api_key: 'vNw2opgPsevmRvTcyd5zD9q96Dhyhzo1Nd7ilDU3',
        },
      }
    );
    const result=createTrafficMap(response.data.routes[0].overview_polyline,response.data.routes[0].travel_advisory)

    return result;
  } catch (error: any) {
    console.error('Axios error fetching Ola Maps route:', error.message);
    throw error;
  }
};


function parseTravelAdvisory(advisory: string): Segment[] {
    return advisory.split('|').map(entry => {
        const [start, end, status] = entry.split(',').map(Number);
        return { start, end, status };
    });
}

export const createTrafficMap = (encodedPolyline: string, travel_advisory: string): TrafficSegment[] => {
    const decoded = polyline.decode(encodedPolyline) as [number, number][];
    const segments = parseTravelAdvisory(travel_advisory);

    const trafficData: TrafficSegment[] = segments.map((segment) => ({
        startCoord: {
          latitude:decoded[segment.start][0],
          longitude:decoded[segment.start][1]
        },
        endCoord: {
          latitude:decoded[segment.end][0],
          longitude:decoded[segment.end][1]
        },
        status: segment.status
    }));
    return trafficData;
};