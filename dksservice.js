require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const compression = require("compression");
const cors = require("cors");

const voice = require("./router/dks.router");

const app = express();
const hostname = "0.0.0.0";
const port = process.env.PORT || 8430;


app.use(compression());
app.use(cors());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ limit: "1000mb", extended: true }));

// parse requests of content-type - application/json
app.use(bodyParser.json({ limit: "1000mb", extended: true }));

app.use("/dks", voice);
app.use("/dks/check", (req, res) => {
  res.status(200).json({
    message: "Hi i am Node DKS Services. I am Healthy ",
  });
});

const server = app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

server.timeout = 300000;
