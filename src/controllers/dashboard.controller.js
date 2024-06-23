import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get the channel stats like total video views, total subscribers, total videos, total likes etc.
const getChannelStats = asyncHandler(async (req, res) => {
  if (!req.user?._id) throw new ApiError(400, "Unauthorized request");
  const userId = req.user?._id;

  try {
    const channelStats = await Video.aggregate([
      {
        // Match all the videos owned by the current user
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        // Lookup subscriptions to the channel
        $lookup: {
          from: "subscriptions",
          localField: "owner",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        // Lookup subscriptions made by the channel owner
        $lookup: {
          from: "subscriptions",
          localField: "owner",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        // Lookup comments for the user's videos
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "video",
          as: "videoComments",
        },
      },
      {
        // Lookup likes for the user's videos
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "videoLikes",
        },
      },
      {
        // Lookup tweets by the user
        $lookup: {
          from: "tweets",
          localField: "owner",
          foreignField: "owner",
          as: "tweets",
        },
      },
      {
        // group to calculate stats
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: { $size: "$videoLikes" } }, // sum of video_ids
          totalComments: { $sum: { $size: "$videoComments" } }, // sum of video_ids
          subscribers: { $first: { $size: "$subscribers" } }, //size of channel subscribers
          subscribedTo: { $first: { $size: "$subscribedTo" } }, // size of subscribed channels
          totalTweets: { $first: { $size: "$tweets" } }, // size of tweets made by video owner
        },
      },
      {
        // Project the desired fields
        $project: {
          totalVideos: 1,
          totalViews: 1,
          subscribers: 1,
          subscribedTo: 1,
          totalLikes: 1,
          totalComments: 1,
          totalTweets: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          channelStats[0],
          "Channel stats fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error in getChannelStats::", error);
    throw new ApiError(
      500,
      error?.message || "Internal server error in getting channel stats"
    );
  }
});

// Get all the videos uploaded by the channel
const getChannelVideos = asyncHandler(async (req, res) => {
  if (!req.user?._id) throw new ApiError(400, "Unauthorized request");
  const userId = req.user?._id;
  try {
    const channelVideos = await Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "videoOwner",
          pipeline: [
            {
              $project: {
                username: 1,
                fullname: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$videoOwner",
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "videoLikes",
        },
      },
      {
        $addFields: {
          likes: {
            $size: "$videoLikes",
          },
          createdAt: {
            $dateToParts: { date: "$createdAt" },
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          //videoOwner: 1,
          videoFile: 1,
          thumbnail: 1,
          title: 1,
          description: 1,
          duration: 1,
          views: 1,
          likes: 1,
          isPublished: 1,
          createdAt: { year: 1, month: 1, day: 1 },
        },
      },
    ]);
    if (!channelVideos) throw new ApiError(404, "Videos not found");
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          channelVideos,
          "Channel Videos fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error in getChannelVideos::", error);
    throw new ApiError(
      500,
      error?.message || "Server error in fetching channel videos"
    );
  }
});

export { getChannelStats, getChannelVideos };
