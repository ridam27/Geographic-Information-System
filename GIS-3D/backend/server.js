const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const dns = require("dns");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

const app = express();

const allowedOrigins = [
  "https://geo-3d-frontend.onrender.com",
  "https://geo-survey-backend-2fy8.onrender.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:5500",
];

function isAllowedOrigin(origin) {
  return !origin || allowedOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json());

// =========================
// MongoDB Connection
// =========================

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/survey";
mongoose.connect(MONGODB_URI, {
  retryWrites: true,
  w: "majority",
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})

.then(() => {

  console.log("✅ MongoDB Connected");
  console.log("✅ MongoDB Host:", mongoose.connection.host);
  console.log("✅ MongoDB Database:", mongoose.connection.name);

})

.catch((err) => {

  console.error("❌ Mongo Error:", err);
  console.error("📝 Make sure:");
  console.error("  1. MongoDB Atlas cluster is running (not paused)");
  console.error("  2. Your IP is whitelisted in MongoDB Atlas");
  console.error("  3. Connection string is correct in .env file");
  console.error("  4. DNS is not blocking SRV lookups for mongodb+srv:// URIs");

});

// ============================
// Banner Schema
// ============================

const bannerSchema = new mongoose.Schema({

  house_id: {
    type: String,
    required: true
  },

  title: String,

  type: String,

  date: String,

  createdAt: {
    type: Date,
    default: Date.now
  }

});

const Banner =
  mongoose.model(
    "Banner",
    bannerSchema
  );

// =========================
// Create HTTP Server
// =========================

const server = http.createServer(app);

// =========================
// Socket Setup
// =========================

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  }
});

require("./socket")(io);

const poleRoutes = require("./routes/poleRoutes");
const sewageRoutes = require("./routes/sewageRoutes");
const flyoverRoutes = require("./routes/flyoverRoutes");
const manholeRoutes = require("./routes/manholeRoutes");
const atmRoutes = require("./routes/atmRoutes");
const polygonQueryRoutes = require("./routes/polygonQueryRoutes");
const propertyFormRoutes = require("./routes/propertyFormRoutes");

// =========================
// Save Banner API
// =========================

app.post("/api/add-banner", async (req, res) => {

  try {

    console.log("Banner API called");
     console.log("Incoming body:", req.body);
    const banner =
      new Banner(req.body);

    await banner.save();

    console.log(
      "Banner saved to Mongo:",
      banner
    );

    res.json({
      message: "Banner saved successfully"
    });

  }
  catch(error) {

    console.error(error);

    res.status(500).json({
      message: "Error saving banner"
    });

  }

});

// =========================
// Get Banners API
// =========================

app.get("/api/banners/:houseId", async (req, res) => {

  try {

    const houseId =
      req.params.houseId;

    const banners =
      await Banner.find({
        house_id: houseId
      });

    res.json(banners);

  }
  catch(error) {

    console.error(error);

    res.status(500).json({
      message: "Error fetching banners"
    });

  }

});

// =========================
// Save Poles API
// =========================

app.use("/api/poles", poleRoutes);
app.use("/api/sewage", sewageRoutes);
app.use("/api/flyovers", flyoverRoutes);
app.use("/api/manholes", manholeRoutes);
app.use("/api/atms", atmRoutes);
app.use("/api/polygon-query", polygonQueryRoutes);
app.use("/api/property-forms", propertyFormRoutes);

// =========================
// Serve Static Files
// =========================

app.use(express.static(
  path.join(__dirname)
));

// =========================
// Start Server
// =========================

server.listen(4001, () => {

  console.log(
    "Server running at http://localhost:4001"
  );

});