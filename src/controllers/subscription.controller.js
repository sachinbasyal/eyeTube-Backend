import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Toggle subscription
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId))
    throw new ApiError(400, "Invalid Channel ID");

  if (req.user?._id.toString() === channelId)
    throw new ApiError(400, "You cannot subscribe your own channel");

  try {
    const isSubscribed = await Subscription.findOne({
      subscriber: req.user?._id,
      channel: channelId,
    });
    if (isSubscribed) {
      await Subscription.findByIdAndDelete(isSubscribed?._id);
      return res
        .status(200)
        .json(
          new ApiResponse(200, { Subscribed: false }, "Channel unsubscribed")
        );
    }
    await Subscription.create({
      subscriber: req.user?._id,
      channel: channelId,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, { Subscribed: true }, "Channel subscribed"));
  } catch (error) {
    console.log("toggleSubscription error ::", error);
    throw new ApiError(
      500,
      error?.message || "Internal server error in toggle subscription "
    );
  }
});

// controller to return subscriber-list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId))
    throw new ApiError(400, "Invalid Channel ID");

  try {
    const subscribers = await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriber",
        },
      },
      {
        $unwind: "$subscriber",
      },
      {
        $project: {
          _id: 0,
          subscriber: {
            _id: 1,
            fullname: 1,
            username: 1,
            avatar: 1,
          },
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribers,
          "Channel subscribers list fetched successfully"
        )
      );
  } catch (error) {
    console.log("getUserChannelSubscribers error ::", error);
    throw new ApiError(
      500,
      error?.message ||
        "Internal server error in fetching channel subscriber list"
    );
  }
});

// controller to return channel-list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid Subscriber ID");
  }
  if (req.user?._id.toString() !== subscriberId)
    throw new ApiError(401, "Unauthorized request");

  try {
    const subscribedChannels = await Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(subscriberId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "channel",
          foreignField: "_id",
          as: "subscribedChannel",
          pipeline: [
            {
              $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos",
              },
            },
            {
              $addFields: {
                latestVideo: {
                  $last: "$videos",
                },
              },
            },
          ],
        },
      },
      {
        $unwind: "$subscribedChannel",
      },
      {
        $project: {
          _id: 0,
          subscribedChannel: {
            _id: 1,
            username: 1,
            fullname: 1,
            avatar: 1,
            latestVideo: {
              _id: 1,
              videoFile: 1,
              thumbnail: 1,
              owner: 1,
              title: 1,
              description:1,
              duration: 1,
              createdAt: 1,
              views: 1,
            },
          },
        },
      },
    ]);

    if (!subscribedChannels.length) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { subscribedChannels: 0 },
            "No subscribed channels"
          )
        );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribedChannels,
          "Channels Subscribed By user fetched successfully"
        )
      );
  } catch (error) {
    console.log("getSubscribedChannels error ::", error);
    throw new ApiError(
      500,
      error?.message || "Internal server error in getting subscribed channels"
    );
  }
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
