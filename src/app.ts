import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import placeRouter from "./routes/placeRouter"
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

app.listen(port, () => {
  console.log(`Express is listening at http://localhost:${port}`);
});