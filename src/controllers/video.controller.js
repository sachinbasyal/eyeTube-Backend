import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {Video} from "../models/video.model.js"
import { User } from "../models/user.model.js";
import {
  deleteAssetCloudinary,
  uploadOnCloudinary,
} from "../utils/fileHandling.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, {isValidObjectId} from "mongoose"

  // get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

})

  // get video, upload to cloudinary, publish video
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description} = req.body

})

// get video by id
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  
})

 // update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params
 
})

  // delete video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params

})

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params
})

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus
}