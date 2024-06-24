import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import {Like} from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  if (!req.user?._id) throw new ApiError(400, "Unauthorized request");
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "content is required");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!tweet) {
    throw new ApiError(
      500,
      "Something went wrong with the server while creating a tweet"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully."));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  if (!content) {
    throw new ApiError(400, "content is required for an update");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(401, "Tweet not found!");

  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "Unauthorized request!");
  }

  const updateTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!updateTweet) {
    throw new ApiError(
      500,
      "Something went wrong with the server while editing a tweet"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updateTweet, "Tweet is updated successfully."));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(401, "Tweet not found!");

  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "Unauthorized request!");
  }
  const deleteTweet = await Tweet.findByIdAndDelete(tweet?._id);

  if (!deleteTweet) {
    throw new ApiError(500, "Unable to delete a tweet in the server.");
  }
  // delete tweet likes
  await Like.deleteMany({
    tweet: tweetId,
  });

  return res.status(200).json(new ApiResponse(200, {}, "Tweet is deleted."));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId");
  }

  try {
    const tweets = await Tweet.aggregate([
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
          as: "ownerDetails",
          pipeline: [
            {
              $project: {
                username: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "tweet",
          as: "tweetLikes",
          pipeline: [
            {
              $project: {
                likedBy: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          likes: {
            $size: "$tweetLikes",
          },

          ownerDetails: {
            $first: "$ownerDetails",
          },

          isLiked: {
            $cond: {
              if: { $in: [userId, "$tweetLikes.likedBy"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $project: {
          content: 1,
          ownerDetails: 1,
          likes: 1,
          createdAt: 1,
          isLiked: 1,
        },
      },
    ]);

    if (!tweets) {
      throw new ApiError(404, "No any tweets found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, tweets, "Tweets fetched successfully."));
  } catch (error) {
    console.error("Error in getUserTweets ::", error);
    throw new ApiError(
      500,
      error?.message || "Something went wrong while getting user tweets"
    );
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
