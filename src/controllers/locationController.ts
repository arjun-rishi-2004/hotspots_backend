import { Request, Response } from 'express';
import { getEVChargingStations } from '../helpers/evHelper';
import { getPlacesOfInterest} from '../helpers/amenitiesHelper';
import {calculateRatingBasedScore,rankAmenities,filterPlaces,filterEvStation} from '../helpers/scoreHelper'

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
        console.log(places);
        console.log("Evstation:",evStations);
        const resamenities=calculateRatingBasedScore(places);
        const result_=rankAmenities(resamenities, evStations);
        res.status(200).json({suggestedStations:filterPlaces(result_),
            evstations:filterEvStation(evStations)
        })

    } catch (error) {
        console.error("Error fetching places:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};