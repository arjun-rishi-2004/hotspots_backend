import { Request, Response } from 'express';
import { getEVChargingStations } from '../helpers/evHelper';
import { getPlacesOfInterest} from '../helpers/amenitiesHelper';
import {calculateRatingBasedScore,rankAmenities,filterPlaces,filterEvStation,calculateDistanceUsingOla} from '../helpers/scoreHelper'
import{exportPlacesToExcel} from '../helpers/exportexcel' 
import { FetchNearByPlacesInterface } from '../types';

export const fetchPlaces = async (req: Request, res: Response): Promise<void> => {

    try {
        const { latitude, longitude, radius } = req.query;

        // Ensure parameters are provided and convert to numbers
        if (!latitude || !longitude || !radius) {
            res.status(400).json({ error: "Missing required query parameters: latitude, longitude, radius" });
            return;
        }

        const lat = parseFloat(latitude as string);
        const lon = parseFloat(longitude as string);
        const rad = parseFloat(radius as string);

        if (isNaN(lat) || isNaN(lon) || isNaN(rad)) {
            res.status(400).json({ error: "Invalid query parameter values" });
            return;
        }

        // Fetch EV Charging Stations & Places of Interest concurrently
        const [evStations, places] = await Promise.all([
            getEVChargingStations(lat, lon, rad),
            getPlacesOfInterest(lat, lon, rad)
        ]);
        //console.log(places);
        //console.log("Evstation:",evStations);
        const resamenities=calculateRatingBasedScore(places);
        const result_=rankAmenities(resamenities, evStations);

        const suggestedHotspot=filterPlaces(await result_);
        const existingChargeStation=filterEvStation(evStations);
        exportPlacesToExcel(suggestedHotspot)
        res.status(200).json({suggestedStations:suggestedHotspot,
            evstations:existingChargeStation

        })

    } catch (error) {
        console.error("Error fetching places:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};



export const fetchNearByPlaces=async(req:Request, res:Response):Promise<void>=>{
    try{
        const { source, evChargers }: FetchNearByPlacesInterface = req.body;
    const { latitude: sourceLatitude, longitude: sourceLongitude } = source;
        const result=await Promise.all(evChargers.map(async (ev)=>{
           const dist=await calculateDistanceUsingOla(sourceLatitude,sourceLongitude,ev.latitude,ev.longitude)
           return{
            id:`existing_${ev.id}`,
            placeId:ev.id,
            latitude:ev.latitude,
            longitude:ev.longitude,
            distance:dist
           }
        }))
        res.status(200).json({source:{latitude:sourceLatitude,
            longitude:sourceLongitude},destination:result})
    }catch (error) {
        console.error("Error fetching distance:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}