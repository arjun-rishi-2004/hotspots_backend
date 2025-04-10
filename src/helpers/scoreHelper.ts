import { Amenity,NearbyChargingStations,Photo } from "../types";
const OLA_API_KEY="vNw2opgPsevmRvTcyd5zD9q96Dhyhzo1Nd7ilDU3";
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

// Optimized Haversine function (early exit for efficiency)
function isWithinRadius(lat1: number, lon1: number, lat2: number, lon2: number, radiusKm: number = 1): boolean {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) ** 2;
              
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return distance <= radiusKm; // Directly return boolean
}
// Define types for Amenities and Charging Stations

// 🏆 Optimized function to rank amenities
export async function rankAmenities(amenities: Amenity[], chargingStations: Amenity[]): Promise<Amenity[]> {
    // console.log("charging station: ", chargingStations[0]);
    // console.log("amenities: ", amenities[1]);


    
    // Process each amenity - map to promises
    const amenityPromises = amenities.map(async (amenity) => {
      let score = 3; // Default highest priority
      let foundStation = false;
      let nearbyChargingStations: NearbyChargingStations[] = [];
      let ratingSum=0
      // Process each charging station for this amenity
      // Make this inner function async too
      const stationPromises = chargingStations.map(async (station) => {
        if (isWithinRadius(
          amenity.location.latitude, amenity.location.longitude,
          station.location.latitude, station.location.longitude
        )) {
          // Await the distance calculation since it's a Promise
          const distanceKm = await calculateDistanceUsingOla(
            amenity.location.latitude, amenity.location.longitude,
            station.location.latitude, station.location.longitude
          );
          ratingSum+=station.rating??0
          foundStation = true;
          nearbyChargingStations.push({
            location: {
              latitude: station.location.latitude,
              longitude: station.location.longitude
            },
            markerID: `existing_${station.id}`,
            displayName: station.displayName.text,
            distance: parseFloat(distanceKm.toFixed(2)) * 1000  // Convert km to meters
          })
          
          // Determine the lowest score based on rating
         
        }

      });

      if(foundStation){
        score=(ratingSum/nearbyChargingStations.length)*0.4
      }
      
      
      // Wait for all station checks to complete
      await Promise.all(stationPromises);
      
      // Return the enriched amenity
      return {
        ...amenity,
        chargerBasedScore: foundStation ? score : 3,
        totalScore: (foundStation ? score : 3) + (amenity.ratingBasedScore ?? 0),
        isExistingChargeStationFound: foundStation,
        nearestChargeStationDetail: foundStation ? nearbyChargingStations : null,
      };
    });
    
    // Wait for all amenity processing to complete
    const results = await Promise.all(amenityPromises);
    
    // Sort by total score and return
    return results.sort((a, b) => b.totalScore! - a.totalScore!);
  }


function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

export async function calculateDistanceUsingOla(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number, 
  ): Promise<number> {
    try {
      // Format coordinates for API
      const origins = `${lat1}%2C${lon1}`;
      const destinations = `${lat2}%2C${lon2}`;
      
      // Create request URL
      const url = `https://api.olamaps.io/routing/v1/distanceMatrix/basic?origins=${origins}&destinations=${destinations}&api_key=${OLA_API_KEY}`;
      
      // Generate a unique request ID
      const requestId = `req-${Date.now()}`;
      
      // Make the API request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Request-Id': requestId
        }
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if API returned success status
      if (data.status !== 'SUCCESS') {
        throw new Error(`API returned error status: ${data.status}`);
      }
      
      // Extract distance in meters from response
      const distanceInMeters = data.rows[0].elements[0].distance;
      
      // Convert to kilometers and return
      return distanceInMeters / 1000;
    } catch (error) {
      console.error('Error calculating distance:', error);
      throw error;
    }
  }


export function calculateRatingBasedScore(amenities:Amenity[]):Amenity[] {
    let MaxCountArray = amenities.map(amenities => amenities.userRatingCount ?? 1);
    const MaxCount=Math.max(...MaxCountArray)
    // const MaxParts=MaxCount*5/3.5;
    return amenities.map(amenity => {
        const rating = amenity.rating || 0;
        const numReviews = amenity.userRatingCount || 0;
        const boostingConstant=10000;
        let parkingScore=0;
        let rawScore = (rating * 0.42) + ((numReviews/(numReviews+boostingConstant)) * 3.5);
        // let rawScore=(rating*numReviews)/MaxParts
        // console.log("rawScore",rawScore);
        let countBasedScore=(numReviews/(numReviews+boostingConstant)) * 3.5
        //console.log("score",countBasedScore);
        if (amenity?.parkingOptions?.freeParkingLot) {
          rawScore += 1.4
          parkingScore=1.4
        } 
        else if(amenity?.parkingOptions?.paidParkingLot){
            rawScore+=0.84
            parkingScore=0.84;

        }
        else if(amenity?.parkingOptions?.freeStreetParking){
          rawScore+=0.28;
          parkingScore=0.28
        }
        
        return { ...amenity, ratingCountScore:countBasedScore,ratingBasedScore: rawScore,parkingBasedScore:parkingScore };
    });
}

export function filterPlaces(places: Amenity[]) {
    // let scores = places.map(place => place.totalScore ?? 1); // Ensure no zero values
    // let minScore = Math.min(...scores);
    // let maxScore = Math.max(...scores);
 
    return places.map(place => {
        // let normalized = (Math.log((place.totalScore??0)+ 1) - Math.log(minScore + 1)) / 
        //                  (Math.log(maxScore + 1) - Math.log(minScore + 1) || 1);
        // let totalWeight = normalized * 9 + 1;  // Scale between 1 and 10
 //console.log(place.ratingCountScore)
        return {
            name:place.name,
            id:place.id,
            locationName:place.displayName.text,
            types:createType(place),
            address:place.formattedAddress,
            googleMapsUri:place.googleMapsUri,
            latitude: place.location.latitude,
            longitude: place.location.longitude,
            rating:place.rating,
            userRatingCount:place.userRatingCount,
            photo:filterPhotourl(place.photos),
            totalWeight: parseFloat(place.totalScore.toFixed(1)) ,// Keep 1 decimal place
            ratingBasedScore: place.ratingBasedScore ?? 0,
            chargerBasedScore:place.chargerBasedScore,
            ratingCountScore:place.ratingCountScore,
            parkingBasedScore:place.parkingBasedScore,
            isExistingChargeStationFound:place.isExistingChargeStationFound,
            nearestChargeStationDetail:place.nearestChargeStationDetail,
            evChargeOptions:place.evChargeOptions

        };
    }); 
}
const filterPhotourl = (photos?:Photo[]): string[] => {
    if (!photos || photos.length === 0) return [];

    return photos.map(ph => {
        //console.log("Photo_Url :",ph.flagContentUri)
        const imgSrc = ph.flagContentUri.match(/image_key=.*?2s([A-Za-z0-9_-]+)/);
        if (imgSrc && imgSrc[1]) {
            return `https://lh3.googleusercontent.com/p/${imgSrc[1]}=w600-h400-k-no`;
        }
        return ''; // or you can choose to filter it out later
    }).filter(url => url !== '');
};

export const createType=(place:Amenity):string[]=>{
    let types=[...place.types]
    if(place?.outdoorSeating) types.push("Outdoor seating");
    if(place?.goodForChildren) types.push("Good for Children");
    if(place?.restroom) types.push("Restroom");
    if(place?.goodForGroups) types.push("Good for groups");
    if(place?.parkingOptions?.freeParkingLot) types.push("Free Parking");
    if(place?.parkingOptions?.paidParkingLot) types.push("Paid Parking");
    if(place?.parkingOptions?.freeStreetParking) types.push("Free street Parking");
    return types;

}
export const filterEvStation=(Evstations:Amenity[])=>{
    return Evstations?.map(Evstation => {
        return {
            name: Evstation?.name,
            id: Evstation?.id,
            locationName: Evstation?.displayName?.text,
            address: Evstation?.formattedAddress,
            latitude: Evstation?.location?.latitude,
            longitude: Evstation?.location?.longitude,
            rating: Evstation?.rating,
            userRatingCount: Evstation?.userRatingCount,
            googleMapsUri: Evstation?.googleMapsUri,
            photo:filterPhotourl(Evstation.photos), 
            evChargeOptions: Evstation?.evChargeOptions && Object.keys(Evstation.evChargeOptions).length > 0 ? {
                connectorcount: Evstation.evChargeOptions.connectorCount ?? 0,
                maxchargerate: Evstation.evChargeOptions.connectorAggregation?.length
                    ? Evstation.evChargeOptions.connectorAggregation[0]?.maxChargeRateKw ?? null
                    : null,
                type: Evstation.evChargeOptions.connectorAggregation?.length
                    ? Evstation.evChargeOptions.connectorAggregation[0]?.type ?? null
                    : null,
                avaliablecount: Evstation.evChargeOptions.connectorAggregation?.length
                    ? Evstation.evChargeOptions.connectorAggregation[0]?.availableCount ?? 0
                    : 0,
                outofserviveCount: Evstation.evChargeOptions.connectorAggregation?.length
                    ? Evstation.evChargeOptions.connectorAggregation[0]?.outOfServiceCount ?? 0
                    : 0,
                count: Evstation.evChargeOptions.connectorAggregation?.length
                    ? Evstation.evChargeOptions.connectorAggregation[0]?.count ?? 0
                    : 0
            } : {
                connectorcount: 0,
                maxchargerate: null,
                type: null,
                avaliablecount: 0,
                outofserviveCount: 0,
                count: 0
            }
           
        };
        
    });
    
}