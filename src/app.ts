import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config(); 
const app = express();
const port = process.env.PORT;

app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World.');
});
app.get('/check', (req, res) => {
  res.send('API is working');
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});