import express, { Router } from 'express';
import { fetchPlaces } from '../controllers/locationController';

const router: Router = express.Router();

// Define API endpoint
router.get('/places', fetchPlaces);

export default router;
