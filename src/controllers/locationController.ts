import { Request, Response } from 'express';
import { getEVChargingStations } from '../helpers/evHelper';
import { getPlacesOfInterest} from '../helpers/amenitiesHelper';
import {calculateRatingBasedScore,rankAmenities,filterPlaces,filterEvStation,calculateDistanceUsingOla} from '../helpers/scoreHelper'
// import{exportPlacesToExcel} from '../helpers/exportexcel' 
import { fetchPolyLine,splitPolylineByDistance,getPlacesAlongRoute,getEvStationsAlongRoute } from '../helpers/polyLine';
import { fetchTrafficAlongRouteWithWaypoints } from '../helpers/trafficDataFetch';
import { FetchNearByPlacesInterface } from '../types';
//import { writeResponseToFile } from '../helpers/responseToJson';

export const fetchPlaces = async (req: Request, res: Response): Promise<void> => {
    try {
        const { latitude, longitude, radius, inputTypes } = req.query;
        if (!latitude || !longitude || !radius) {
            res.status(400).json({ error: "Missing required query parameters: latitude, longitude, radius" });
            return;
        }
        let types=[];
        if(inputTypes){
            const inputTypesArray = (inputTypes as string).split(',');
            types = inputTypesArray.map(type =>
                type.toLowerCase().trim().replace(/\s+/g, '_')
        );
        }
        

        const lat = parseFloat(latitude as string);
        const lon = parseFloat(longitude as string);
        const rad = parseFloat(radius as string);

        if (isNaN(lat) || isNaN(lon) || isNaN(rad)) {
            res.status(400).json({ error: "Invalid query parameter values" });
            return;
        }

        const [evStations, places] = await Promise.all([
            getEVChargingStations(lat, lon, rad),
            getPlacesOfInterest(lat, lon, rad, types)
        ]);

        const resAmenities = calculateRatingBasedScore(places);
        const result_ = rankAmenities(resAmenities, evStations);

        const suggestedHotspot = filterPlaces(await result_);
        const existingChargeStation = filterEvStation(evStations);

        res.status(200).json({
            suggestedStations: suggestedHotspot,
            evstations: existingChargeStation
        });

    } catch (error) {
        console.error("Error fetching places:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};




export const fetchNearByPlaces=async(req:Request, res:Response):Promise<void>=>{
    try{
        const { source,evChargers }: FetchNearByPlacesInterface = req.body;
    const { latitude: sourceLatitude, longitude: sourceLongitude ,locationName } = source;
        const result=await Promise.all(evChargers.map(async (ev)=>{
           const dist=await calculateDistanceUsingOla(sourceLatitude,sourceLongitude,ev.latitude,ev.longitude)
           return{
            id:`existing_${ev.id}`,
            locationName:ev.locationName,
            placeId:ev.id,
            latitude:ev.latitude,
            longitude:ev.longitude,
            distance:dist
           }
        }))
        res.status(200).json({source:{latitude:sourceLatitude,
            locationName :locationName ,
            longitude:sourceLongitude},destination:result})
    }catch (error) {
        console.error("Error fetching distance:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getRouteAmenities=async(req:Request,res:Response):Promise<void>=>{
    try{
        const{origin,destination}=req.body;
        const{latitude:orLatitude,longitude:orLongitude}=origin;
        const{latitude:desLatitude,longitude:desLongitude}=destination;
        const result=await fetchPolyLine(orLatitude,orLongitude,desLatitude,desLongitude);
        if (!result) {
            res.status(500).json({ error: "Failed to fetch route data" });
            return;
          }
      
        const { encodedPolyline,distance,decodedPoints } = result;
        const trafficData=await fetchTrafficAlongRouteWithWaypoints(origin,destination,decodedPoints)

        const {polylines}=splitPolylineByDistance(encodedPolyline,distance);
        const POI_TYPES=['hotel'];
        let allPlaces: any[] = [];

        for (const POI of POI_TYPES) {
          for (const line of polylines) {
            const resPlaces = await getPlacesAlongRoute(POI, line);
            if (resPlaces?.places) {
              allPlaces.push(...resPlaces.places);
            }
          }
        }
        const uniqueResPlaces = allPlaces.filter(
            (place, index, self) =>
              index === self.findIndex(p => p.id === place.id)
          );
        let EvStations:any[]=[];
        for(const line of polylines){
            const resEvStations=await getEvStationsAlongRoute("EV Charging Station",line);
            if(resEvStations?.places){
                EvStations.push(...resEvStations.places);
            }
            
        }

        // console.log(allPlaces.length)
        const resamenities=await calculateRatingBasedScore(uniqueResPlaces);
        const result_=await rankAmenities(resamenities, EvStations);
        const suggestedHotspot=filterPlaces(await result_);
        const existingChargeStation=filterEvStation(EvStations);
        const response={
            polyline:encodedPolyline,
            suggestedStations:suggestedHotspot,
            evstations:existingChargeStation,
            trafficData:trafficData
        }
       // writeResponseToFile(response)
        res.status(200).json(response)
    }catch (error) {
        console.error("Error fetching distance:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}