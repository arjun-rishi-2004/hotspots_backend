import { Amenity,Photo } from "../types";
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
export function rankAmenities(amenities: Amenity[], chargingStations: Amenity[]):Amenity[] {
    return amenities.map(amenity => {
        let score = 3; // Default highest priority
        let foundStation = false;

        for (const station of chargingStations) {
            if (isWithinRadius(amenity.location.latitude, amenity.location.longitude, station.location.latitude, station.location.longitude)) {
                foundStation = true;
                if (station.rating >= 4) score = Math.min(score, 1);
                else if (station.rating < 4) score = Math.min(score, 2);
            }
        }
        amenity={...amenity, chargerBasedScore: foundStation ? score : 3}
        return { ...amenity, totalScore:(amenity.chargerBasedScore?amenity.chargerBasedScore:0)+(amenity.ratingBasedScore?amenity.ratingBasedScore:0)};
    }).sort((a, b) => b.totalScore! - a.totalScore!); // Sort once at the end
}




export function calculateRatingBasedScore(amenities:Amenity[]):Amenity[] {
    return amenities.map(amenity => {
        const rating = amenity.rating || 0;
        const numReviews = amenity.userRatingCount || 0;
        const rawScore = (rating * 0.9) + (Math.log(1 + numReviews) * 0.8);

        const normalizedScore = 7 * (1 - Math.exp(-rawScore / 10));
        
        return { ...amenity, ratingBasedScore: normalizedScore };
    });
}

export function filterPlaces(places: Amenity[]) {
    let scores = places.map(place => place.totalScore ?? 1); // Ensure no zero values
    let minScore = Math.min(...scores);
    let maxScore = Math.max(...scores);
 
    return places.map(place => {
        let normalized = (Math.log(place.totalScore??0+ 1) - Math.log(minScore + 1)) / 
                         (Math.log(maxScore + 1) - Math.log(minScore + 1) || 1);
        let totalWeight = normalized * 9 + 1;  // Scale between 1 and 10
 
        return {
            name:place.name,
            id:place.id,
            locationName:place.displayName.text,
            address:place.formattedAddress,
            latitude: place.location.latitude,
            longitude: place.location.longitude,
            rating:place.rating,
            // goodForChildren:place.goodForChildren,
            // restroom:place.restroom,
            // goodForGroups:place.goodForGroups,
            // parkingOptions:place.parkingOptions,
            //outdoorSeating:place.outdoorSeating,
            photo:filterPhotourl(place.photos),
            totalWeight: parseFloat(totalWeight.toFixed(1)) // Keep 1 decimal place
        };
    });
}
const filterPhotourl = (photos?:Photo[]): string[] => {
    if (!photos || photos.length === 0) return [];

    return photos.map(ph => {
        console.log("Photo_Url :",ph.flagContentUri)
        const imgSrc = ph.flagContentUri.match(/image_key=.*?2s([A-Za-z0-9_-]+)/);
        if (imgSrc && imgSrc[1]) {
            return `https://lh3.googleusercontent.com/p/${imgSrc[1]}=w600-h400`;
        }
        return ''; // or you can choose to filter it out later
    }).filter(url => url !== '');
};


export const filterEvStation=(Evstations:Amenity[])=>{
    return Evstations.map(Evstation => {
        return {
            name:Evstation.name,
            id:Evstation.id,
            locationName:Evstation.displayName.text,
            address:Evstation.formattedAddress,
            latitude: Evstation.location.latitude,
            longitude: Evstation.location.longitude,
            rating:Evstation.rating,
            evChargeOptions:Evstation.evChargeOptions,
        };
    });
    
}