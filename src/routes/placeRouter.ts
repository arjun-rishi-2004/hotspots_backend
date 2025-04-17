import express, { Router } from 'express';
import { fetchPlaces,fetchNearByPlaces,getRouteAmenities} from '../controllers/locationController';

const router: Router = express.Router();

// Define API endpoint
router.get('/places', fetchPlaces);
router.post('/nearByChargers',fetchNearByPlaces);
router.post('/route',getRouteAmenities);

export default router;
