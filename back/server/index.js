// importing the dependencies
const dotenv = require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("../app/models");
const { subscribeEvents } = require("./events");

// importing routes
const drawRoutes = require("./../app/routes/draw");

// defining the Express app
const app = express();

// parse JSON bodies into JS objects
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// enabling CORS from our frontend
var corsOptions = {
    origin: process.env.CORS_ORIGIN || "http://localhost:9000" /* Change http to https if frontend is using https */,
};
app.use(cors(corsOptions));

db.sequelize.sync({ alter: true }).then(() => {
    console.log(`\nDb is synced with models.\n`);
});

// Routing
app.get("/api", (req, res) => {
    res.json({ message: `\nWelcome !\n` });
});

app.use("/api/draw", drawRoutes);

// starting the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`\nServer is running on port ${PORT}.\n`);
});

subscribeEvents();