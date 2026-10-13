require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const dns = require("dns");

// Ensure MongoDB Atlas SRV records resolve properly on Windows
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const studentRoutes = require("./routes/studentRoutes");
const facultyRoutes = require("./routes/facultyRoutes");

const app = express();

// Body parser middleware before routes
app.use(express.json());

// Enable CORS for frontend requests
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

const path = require("path");

// Serve frontend static files from public directory
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// Root route: serves frontend to browsers, JSON health response to API clients
app.get("/", (req, res) => {
    if (req.accepts("html") && !req.accepts("json")) {
        return res.sendFile(path.join(__dirname, "public", "index.html"));
    }
    res.json({
        success: true,
        message: "Student Faculty API is running"
    });
});

// Mount API routes
app.use("/api/students", studentRoutes);
app.use("/api/faculty", facultyRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Centralized error handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

// Database connection
if (process.env.MONGODB_URI) {
    mongoose
        .connect(process.env.MONGODB_URI)
        .then(() => {
            console.log("MongoDB Atlas connected successfully!");
        })
        .catch((error) => {
            console.error("MongoDB connection failed:", error.message);
        });
} else {
    console.error("MongoDB connection failed: MONGODB_URI is not defined");
}

module.exports = app;
