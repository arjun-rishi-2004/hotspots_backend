import { Amenity,NearbyChargingStations,Photo } from "../types";
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
export function rankAmenities(amenities: Amenity[], chargingStations: Amenity[]): Amenity[] {
    console.log("charging station: ", chargingStations[0]);
    console.log("amenities: ", amenities[1]);

    return amenities.map(amenity => {
        let score = 3; // Default highest priority
        let foundStation = false;
        let nearbyChargingStations: NearbyChargingStations[] = [];

        for (const station of chargingStations) {
          

            if (isWithinRadius(amenity.location.latitude, amenity.location.longitude, 
                               station.location.latitude, station.location.longitude)) {
                const distance = calculateDistance(
                                    amenity.location.latitude, amenity.location.longitude,
                                    station.location.latitude, station.location.longitude
                                );
                foundStation = true;
                nearbyChargingStations.push(
                    {
                        location: {
                            latitude: station.location.latitude,
                            longitude: station.location.longitude
                        },
                        markerID: `existing_${station.id}`,
                        displayName: station.displayName.text,

                        distance:parseFloat(distance.toFixed(2))*1000
                    }); // Store all nearby stations with distance

                // Determine the lowest score based on rating
                score = station.rating >= 4 ? Math.min(score, 1) : Math.min(score, 2);
            }

    
        }

        return {
            ...amenity,
            chargerBasedScore: foundStation ? score : 3,
            totalScore: (foundStation ? score : 3) + (amenity.ratingBasedScore ?? 0),
            isExistingChargeStationFound: foundStation,
            nearestChargeStationDetail: foundStation ? nearbyChargingStations : null,
             // Array of all stations inside the radius with distances
        };
    }).sort((a, b) => b.totalScore! - a.totalScore!);
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




export function calculateRatingBasedScore(amenities:Amenity[]):Amenity[] {
    return amenities.map(amenity => {
        const rating = amenity.rating || 0;
        const numReviews = amenity.userRatingCount || 0;
        let rawScore = (rating * 0.7) + (Math.log(1 + numReviews) * 0.6);
        if (amenity?.parkingOptions?.freeParkingLot) {
          rawScore += 0.4;
      } else if (amenity?.parkingOptions?.paidParkingLot) {
          rawScore += 0.3;
      }
        const normalizedScore = 7 * (1 - Math.exp(-rawScore / 10));
        
        return { ...amenity, ratingBasedScore: normalizedScore };
    });
}

export function filterPlaces(places: Amenity[]) {
    let scores = places.map(place => place.totalScore ?? 1); // Ensure no zero values
    let minScore = Math.min(...scores);
    let maxScore = Math.max(...scores);
 
    return places.map(place => {
        let normalized = (Math.log((place.totalScore??0)+ 1) - Math.log(minScore + 1)) / 
                         (Math.log(maxScore + 1) - Math.log(minScore + 1) || 1);
        let totalWeight = normalized * 9 + 1;  // Scale between 1 and 10
 
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
            totalWeight: parseFloat(totalWeight.toFixed(1)) ,// Keep 1 decimal place
            isExistingChargeStationFound:place.isExistingChargeStationFound,
            nearestChargeStationDetail:place.nearestChargeStationDetail,
            distanceOfNearestChargeStation:place.distanceOfNearestChargeStation,
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
// const filterPhotourl1 = (photos?:Photo[]): any => {
//     if (!photos || photos.length === 0) return [];

//     return photos.map(ph => {
//         // console.log("Photo_Url :",ph.flagContentUri)
//         return getImageSrc(ph.flagContentUri); // or you can choose to filter it out later
//     });
// };

// async function getImageSrc(url):Promise<any> {
//     try {
//         // Fetch the HTML content of the page
//         let response = await fetch(url, {
//             headers: { "User-Agent": "Mozilla/5.0" }
//         });
 
//         if (!response.ok) {
//             throw new Error(`Failed to fetch page, status: ${response.status}`);
//         }
 
//         let html = await response.text();
 
//         // Parse the HTML
//         let parser = new DOMParser();
//         let doc = parser.parseFromString(html, "text/html");
 
//         // Find the image element with id "preview-image"
//         let imgTag = doc.querySelector("#preview-image");
 
//         if (imgTag) {
//             return imgTag.src;
//         } else {
//             throw new Error("Image with id 'preview-image' not found.");
//         }
 
//     } catch (error) {
//         console.error(error);
//         return null;
//     }
// }
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