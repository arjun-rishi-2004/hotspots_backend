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