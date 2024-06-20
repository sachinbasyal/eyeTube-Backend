import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const toDate = new Date();

const healthcheck = asyncHandler(async (req, res) => {
    try {
      const dbStatus = mongoose.connection.readyState
        ? "DB connected"
        : "DB disconnected";
      const healthCheck = {
        dbStatus,
        uptime: process.uptime(),
        message: "OK",
        timestamp: toDate,
        hrtime: process.hrtime(),
        serverStatus: `Server is running on port ${process.env.PORT}`,
      };
      return res
        .status(200)
        .json(new ApiResponse(200, healthCheck, "Everything is O.K!"));
    } catch (error) {
      const healthCheck = {
        dbStatus,
        uptime: process.uptime(),
        message: "Error",
        timestamp: toDate,
        hrtime: process.hrtime(),
        error: error?.message,
      };
      console.error("Error in health check:", error);
      return res
        .status(500)
        .json(new ApiError(500, healthCheck, "Health check failed"));
    }
  });

export { healthcheck };
