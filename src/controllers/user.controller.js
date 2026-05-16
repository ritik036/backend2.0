import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloundinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
// import { upload } from "../middlewares/multer.middleware.js";
import dotenv from "dotenv";
dotenv.config();

const generateAccessAndRefreshTokens = async function (userId) {
    try {
        console.log("user id is --->", userId);
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        console.log("hello tokens --> ", refreshToken, accessToken);
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.log("Token generation error:", error);
        throw new ApiError(500, "something went wrong while generating tokens");
    }
};

const registerUser = asyncHandler(async function (req, res) {
    // res.status(200).json({
    //     message: "ok",
    // });

    //  Get User Details from frontend or using some tool
    // Validate data sent from user - validation : for sure not empty and other types
    // check if user already exists by - username, email
    // check for images, check for avatar (required)
    // upload the images and etc to cloudinary
    // create object to upload on mongodb
    // creation call - create user entry in DB.
    // since user object is created in DB then the response as whole object is sent back, from which we need to remove password - even if it is encrypted, and also we need to remove refresh token from response.
    // Remove Password, Refresh Token from response.
    // Check for user creation.
    // return response.

    const { fullname, username, email, password } = req.body;
    console.log("request body", req.body);

    console.log("email", email);
    if (fullname === "") throw new ApiError(400, "fullname is absent");

    // or experienced method :-
    if (
        [fullname, email, username, password].some(
            (value) => value?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existedUser) {
        throw new ApiError(409, "User Already Exists");
    }

    console.log(req.files?.avatar[0]?.path);
    console.log("printing req.files", req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (
        req.files &&
        req.files.coverImage &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar local path is missing");
    }
    // cover image is not that important so it is not checked for its existence.

    // if avatar localfilepath is there then we will upload files on cloudinary
    const avatar = await uploadOnCloundinary(avatarLocalPath);
    const coverImage = await uploadOnCloundinary(coverImageLocalPath);

    console.log("avatar details", avatar);

    // Check whether the avatar file is uploaded or not.
    if (!avatar) {
        throw new ApiError(400, "Avatar is required");
    }

    if (!email.includes("@gmail.com")) {
        throw new ApiError(400, "enter proper email format");
    }

    const user = await User.create({
        fullname,
        avatar: avatar?.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password,
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    console.log(createdUser);

    if (!createdUser) {
        throw new ApiError(500, "could not register user, an error occured");
    }

    // res.end();

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "user registered successfully")
        );
});

const loginUser = asyncHandler(async function (req, res) {
    // req body -> get data
    // take username or email
    // check user exists or not
    // if user exists - password check,
    // if passoword is correct - give refresh and access token to user.
    // send these token in form of secure cookies.
    // send response of successfull login.
    const { email, username, password } = req.body;
    console.log(req.body);
    if (!(username || email)) {
        throw new ApiError(400, "username or email is required");
    }
    const user = await User.findOne({ $or: [{ email }, { username }] });
    if (!user) {
        throw new ApiError(
            400,
            "either login details are wrong or no matching account exists"
        );
    }
    console.log("user -->", user);
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect details entered");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
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
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "user logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async function (req, res) {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined },
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
        .json(new ApiResponse(200, {}, "user logged out"));
});

const refreshAccessToken = asyncHandler(async function (req, res) {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodedRefreshToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedRefreshToken._id);
        if (!user) {
            throw new ApiError(401, "invalid refresh token");
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used");
        }
        const { refreshToken: newRefreshToken, accessToken } =
            await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    201,
                    {
                        accessToken,
                        refreshToken: newRefreshToken,
                    },
                    "Access Token Refreshed Successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, error.message || "invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async function (req, res) {
    const { oldPassword, newPassword } = req.body;

    /*
    const {confPassword} = req.body;
    if(! (confPassword === newPassword)){
        throw new ApiError(400, "new and confirm password dont match")
    }
    */
    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "invalid password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "password changed successfully"));
});

const getCurrentUser = asyncHandler(async function (req, res) {
    return res
        .status(201)
        .json(
            new ApiResponse(200, req.user, "current user fetched successfully")
        );
});

const updateAccountDetails = asyncHandler(async function (req, res) {
    const { fullname, email } = req.body;
    if (!fullname || !email) {
        throw new ApiError(400, "new details are required");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: fullname,
                email: email,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account Details Updated Successfully")
        );
});

const updateUserAvatar = asyncHandler(async function (req, res) {
    try {
        const avatarLocalPath = req.file?.path;
        const avatar = await uploadOnCloundinary(avatarLocalPath);
        if (!avatar.url) {
            throw new ApiError(500, "Could not upload on cloudinary");
        }
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    avatar: avatar.url,
                },
            },
            {
                new: true,
            }
        ).select("-password");
    } catch (error) {
        throw new ApiError(400, "could not perform avatar update operations");
    }
    return res
        .status(200)
        .json(new ApiResponse(201, user, "avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async function (req, res) {
    try {
        const newCoverImageLocalPath = req.file?.path;
        if (!newCoverImageLocalPath) {
            throw new ApiError(
                400,
                "new cover image is required to update old"
            );
        }
        const coverImage = await uploadOnCloundinary(newCoverImageLocalPath);
        if (!coverImage.url) {
            throw new ApiError(
                500,
                "error occured while uploading file at cloudinary"
            );
        }
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    coverImage: coverImage.url,
                },
            },
            { new: true }
        );
    } catch (error) {
        throw new ApiError(
            400,
            "Something went wrong while updating cover image"
        );
    }
    return res
        .status(200)
        .json(new ApiResponse(201, user, "cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async function (req, res) {
    const { username } = req.params;
    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing");
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscribers",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                subscribedToCount: {
                    $size: "$subscribedTo",
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
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            },
        },
    ]);
    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                201,
                channel[0],
                "user channel fetched successfully"
            )
        );
});


// it is hard to understand, i still dont gets it. 
const getWatchHistory = asyncHandler(async function (req, res) {
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
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);
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
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
