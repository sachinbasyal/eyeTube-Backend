import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  deleteAssetCloudinary,
  uploadOnCloudinary,
} from "../utils/fileHandling.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import fs from "fs";

const generateRefreshAndAccessTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating Refresh /Access Tokens"
    );
  }
};

// User registration
const registerUser = asyncHandler(async (req, res) => {
  /*  Steps:
  1. get user details from frontend (req)
  2. validation (!empty)
  3. check if user already exists: username / email
  4. check for userImages and avatar
  5. upload the images to cloudinary, check avatar
  6. create user object - create entry in db
  7. remove the password and refresh token fields from the response
  8. check for user creation
  9. return with response
*/
  const { username, fullname, password, email } = req.body;
  // console.log(username); // check in console if the raw data is retrieved..

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path; // ensure coverImage exists before trying to access its index
  /* alternative - classic style
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  } // coverImage is optional */

  // check if the fields are empty
  if (
    [username, fullname, password, email].some((field) => field?.trim() === "")
  ) {
    if(avatarLocalPath) {
      fs.unlinkSync(avatarLocalPath); // remove the temp. stored file from the local folder
    }
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);

    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  }); // findOne() will send the very first matched-data from the db table

  if (existedUser) {
    // remove the temp. stored file from the local folder
    if(avatarLocalPath) {
      fs.unlinkSync(avatarLocalPath); 
    }
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);

    throw new ApiError(409, "User with username or email already exists");
  }

  if (!avatarLocalPath) {
    if(coverImageLocalPath) fs.unlinkSync(coverImageLocalPath)
    throw new ApiError(400, "Avatar path is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  // console.log(avatar)

  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  const user = await User.create({
    fullname,
    // avatar: {
    //   url: avatar.secure_url,
    //   public_id: avatar.public_id
    // },
    avatar: avatar.secure_url,
    coverImage: coverImage?.secure_url || "",
    password,
    email,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); // check if the user is created and remove the password and refresh token fields for response

  if (!createdUser) {
    throw new ApiError(
      500,
      "Something went wrong with the server while registering a user"
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// User login
const loginUser = asyncHandler(async (req, res) => {
  /* Steps:
  1. get user details from req body
  2. check username &/or email
  3. find the user
  4. check for the valid password
  5. generate access and refresh tokens
  6. send the tokens via secured cookies
  7. return with response
 */

  const { username, password, email } = req.body;

  // if (!username && !email) {
  //   throw new ApiError(400, "username and email are required");
  // }
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!existedUser) {
    throw new ApiError(404, "User does not exists!");
  }

  const isPasswordValid = await existedUser.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials!");
  }

  const { accessToken, refreshToken } = await generateRefreshAndAccessTokens(
    existedUser._id
  );

  //const loggedInUser = existedUser.select("-password -refreshToken")

  const loggedInUser = await User.findById(existedUser._id).select(
    "-password -refreshToken"
  ); // if DB query is not too much of concern!

  const options = {
    httpOnly: true,
    secure: true,
  }; // here, cookie can't be modified in frontend and can only be modified by server

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

// user logout
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
      // Alt. if undefined doesn't work
      // $unset: {
      //   refreshToken: 1 // this removes field from document
      // }
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// handle Refresh Access Token endpoint
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken; // req.body: ~from mobile apps

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request!");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token!");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(
        401,
        "Refresh Token is either expired or already used!"
      );
    }

    const { accessToken, refreshToken } = await generateRefreshAndAccessTokens(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access Token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

// change password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!(newPassword === confirmPassword)) {
    throw new ApiError(
      401,
      "Please check if the new and confirm passwords are matched"
    );
  }

  if (oldPassword === newPassword) {
    throw new ApiError(401, "Current and New passwords should not be same!");
  }

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password is changed successfully!"));
});

// get current user
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// update account details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body; // get those fields that are relevant to update

  if (!(fullname || email)) {
    throw new ApiError(401, "Full Name and Email fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true } // returns new updated data
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// update user avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(401, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.secure_url)
    throw new ApiError(401, "Error while uploading avatar");

  const oldAvatarURL = req.user?.avatar;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      // $set: {
      //   avatar: {
      //     url: avatar.secure_url,
      //     public_id: avatar.public_id
      //   }
      // },
      $set: {
        avatar: avatar.secure_url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(500, "Error while updating cover image in DB server");
  }
  // delete old avatar image from Cloudinary
  if (user) {
    await deleteAssetCloudinary(oldAvatarURL);
  }

  return res
    .status(400)
    .json(new ApiResponse(200, user, "Avatar is updated successfully"));
});

// update coverImage
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(401, "Cover image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.secure_url)
    throw new ApiError(401, "Error while uploading cover image");

  const oldImageURL = req.user?.coverImage;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.secure_url,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(500, "Error while updating cover image in DB server");
  }

  //delete old cover image from the Cloudinary
  if (user) {
    await deleteAssetCloudinary(oldImageURL);
  }

  return res
    .status(400)
    .json(new ApiResponse(200, user, "Cover image is updated successfully"));
});

// get user channel profile
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(404, "username is missing");
  }

  // create aggregation pipelines in MongoDB -> returns an array!
  const channel = await User.aggregate([
    {
      $match: {
        username: username,
      },
    },
    {
      $lookup: {
        from: "subscriptions", // collection (subscriptions) to join with
        localField: "_id", // field from the current collection (users) to match
        foreignField: "channel", //  field from the 'subscriptions' collection to match
        as: "subscribers", // alias for the joined data
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          size: "$subscribers",
        },
        channelsSubscribedToCount: {
          size: "$subscribedTo",
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
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists!");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        channel[0],
        "User's channel profile fetched successfully"
      )
    );
});

// get watch history
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          // nested lookup for retrieving owners
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {  // overwrite owner field in 'videos' document with projected details
                $first: "$owner", // getting the first value of owner array field 
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
