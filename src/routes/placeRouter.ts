import express, { Router } from 'express';
import { fetchPlaces,fetchNearByPlaces } from '../controllers/locationController';

const router: Router = express.Router();

// Define API endpoint
router.get('/places', fetchPlaces);
router.post('/nearByChargers',fetchNearByPlaces);

export default router;
