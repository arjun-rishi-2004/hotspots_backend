import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import placeRouter from "./routes/placeRouter"
import axios from 'axios';
dotenv.config();
const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World.');
});
app.get('/check', (req, res) => {
  res.send('API is working');
});

app.use('/api', placeRouter);
app.get('/api/place-autocomplete', async (req, res) => {
  const { input } = req.query;
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params: {
        input,
        key: process.env.GOOGLE_API_KEY,
        components: 'country:IN',
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch data from Google API' });
  }
});
app.get('/api/place-details', async (req, res) => {
  const { placeid } = req.query;
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        placeid,
        key: process.env.GOOGLE_API_KEY,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching place details:', error);
    res.status(500).send({ message: 'Failed to fetch place details' });
  }
});
app.listen(port, () => {
  console.log(`Express is listening at http://localhost:${port}`);
});