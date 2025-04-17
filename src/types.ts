export interface Amenity {
    name: string;
    id: string;
    types: string[];
    formattedAddress: string;
    location: Location;
    rating: number;
    googleMapsUri: string;
    displayName:DisplayName;
    userRatingCount: number;
    evChargeOptions?:EVChargeOptions;
    chargerBasedScore?: number;
    quadrantScore?: number;
    ratingBasedScore?:number;
    totalScore?:number;
    outdoorSeating?:boolean;
    restroom?:boolean;
    goodForChildren?:boolean;
    goodForGroups?:boolean;
    parkingOptions:{
        freeParkingLot:boolean,
        paidParkingLot:boolean,
        freeStreetParking:boolean,
    }
    ratingCountScore:number;
    parkingBasedScore?:number;
    photos:Photo[];
    isExistingChargeStationFound?:boolean;
    distanceOfNearestChargeStation?:number,
    nearestChargeStationDetail?:NearbyChargingStations[];
}
interface Location {
    latitude: number;
    longitude: number;
}
export interface Photo{
    name:string;
    widthPx:string;
    heightPx:string;
    authorAttributions:[];
    flagContentUri:string;
    googleMapsUri:string;

}
export interface Result{
    latitude:number;
    longitude:number;
    totalWeight:number;
}

interface DisplayName{
    text:string;
    languageCode:string;
}
interface EVConnectorAggregation {
    length: any;
    type?: string;
    maxChargeRateKw?: number;
    availableCount?:number;
    outOfServiceCount?:number
    count?: number;
    availabilityLastUpdateTime?:string;
    maxChargerRateKw?:number;
}

interface EVChargeOptions {
    connectorCount: number;
    connectorAggregation: EVConnectorAggregation;
}

export interface NearbyChargingStations{
    location:Location;
    markerID:string;
    distance:number;
    displayName:string

}


export interface FetchNearByPlacesInterface{
    
    source: {
        latitude: number;
        longitude: number;
        locationName:string;
      };
    evChargers:EvStationResponse[]
}

interface EvStationResponse {
    name?: string;
    id?: string;
    locationName?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    evChargeOptions: {
      connectorcount: number;
      maxchargerate: number | null;
      type: string | null;
      avaliablecount: number;
      outofserviveCount: number;
      count: number;
    };
  }
  

  export interface RouteData {
    encodedPolyline: string;
    distance:number;
    decodedPoints: [number, number][];
  }

  
export interface SplitPolylineResult {
    polylines: string[];
   
  };

 export interface Coordinate {
    latitude: number;
    longitude: number;
  }
  
 export  interface RouteRequestBody {
    origin: Coordinate;
    destination: Coordinate;
  }

export type LatLngTuple = [number, number];
export type Segment = { start: number; end: number; status: number };
export type TrafficSegment = {
  startCoord: Coordinate;
  endCoord: Coordinate;
  status: number;
};