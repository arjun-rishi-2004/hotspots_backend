export interface Amenity {
    name: string;
    id: string;
    types: string[];
    formattedAddress: string;
    location: Location;
    rating: number;
    googleMapsUri: string;
    userRatingCount: number;
    evChargeOptions?:EVChargeOptions;
    chargerBasedScore?: number;
    quadrantScore?: number;
    ratingBasedScore?:number;
    totalScore?:number;
}
interface Location {
    latitude: number;
    longitude: number;
}
export interface Result{
    latitude:number;
    longitude:number;
    totalWeight:number;
}


interface EVConnectorAggregation {
    type?: string;
    maxChargeRateKw?: number;
    availableCount?:number;
    outOfServiceCount?:number
    count?: number;
    availabilityLastUpdateTime?:string;
}

interface EVChargeOptions {
    connectorCount: number;
    connectorAggregation: EVConnectorAggregation[];
}



