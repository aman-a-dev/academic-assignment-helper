const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth");
const uploadRoutes = require("./routes/upload");
const analysisRoutes = require("./routes/analysis");
const sourcesRoutes = require("./routes/sources");

const app = express();

// Security middleware
app.use(helmet());
app.use(
   cors({
      origin: "*",
      methods: ["GET", "POST", "DELETE","PUT"]
   })
);

// Rate limiting
const limiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutes
   max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth", authRoutes);
app.use("/upload", uploadRoutes);
app.use("/analysis", analysisRoutes);
app.use("/sources", sourcesRoutes);

// Health check
app.get("/health", (req, res) => {
   res.status(200).json({
      status: "OK",
      message: "Academic Assignment Helper API is running"
   });
});

// Error handling middleware
app.use((err, req, res, next) => {
   console.error(err.stack);
   res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use("*", (req, res) => {
   res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
});
