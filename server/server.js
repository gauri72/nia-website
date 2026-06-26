require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const routes = require('./src/routes/index');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
