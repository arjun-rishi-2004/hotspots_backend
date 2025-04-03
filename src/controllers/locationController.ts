import { Request, Response } from 'express';
import { getEVChargingStations } from '../helpers/evHelper';
import { getPlacesOfInterest } from '../helpers/amenitiesHelper';

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

        res.json({ evChargingStations: evStations, placesOfInterest: places });
    } catch (error) {
        console.error("Error fetching places:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};