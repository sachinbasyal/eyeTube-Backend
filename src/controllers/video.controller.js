import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import {
  deleteAssetCloudinary,
  uploadOnCloudinary,
} from "../utils/fileHandling.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";

// get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
});

// get video, upload to cloudinary, publish video
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Both title and description fields are required");
  }

  const videoLocalPath = req.files?.videoFile[0].path;
  const thumbnailLocalPath = req.files?.thumbnail[0].path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file's local path is missing");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail's local path is missing");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Video file not found");
  }

  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail not found");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.secure_url,
    thumbnail: thumbnail.secure_url,
    duration: videoFile.duration,
    owner: req.user?._id,
  });

  const uploadedVideo = await Video.findById(video._id); // Double-check if the video is finally created in MongoDB
  if (!uploadedVideo) {
    throw new ApiError(
      500,
      "Something went wrong with the server while uploading a video"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video is published successfully"));
});

// get video by id
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              fullname: 1,
              username: 1,
              avatar: 1,
              subscribersCount: 1,
              isSubscribed: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
        likesCount: {
          size: "$likes",
        },
        commentsCount: {
          size: "$comments",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        likesCount: 1,
        commentsCount: 1,
        owner: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!video) {
    throw new ApiError(404, "Video file not found");
  }
  // increment views if video is fetched successfully
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });
  // add this video to user's watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video details fetched successfully"));
});

// update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  if (!(title && description)) {
    throw new ApiError(
      400,
      "Title and description fields are required for the updates"
    );
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(401, "Video file is missing!");

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
        400,
        "Video editing is restricted"
    );
}

  const thumbnailLocalPath = req.file?.path || "";
  const currentThumbnailURL = video.thumbnail;

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId, 
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail?.secure_url || currentThumbnailURL, //thumbnail update is optional
      }
    },
    { new:true }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Error while updating a video file in the DB server");
  }
  //deleteing the old thumbnail from the Cloudinary if update is available
  if (thumbnailLocalPath !== "") {
    await deleteAssetCloudinary(currentThumbnailURL);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video file is updated successfully")
    );
});

// delete video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
