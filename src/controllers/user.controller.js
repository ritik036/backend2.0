import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloundinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// import { upload } from "../middlewares/multer.middleware.js";

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

    if(!email.includes("@gmail.com")) {
        throw new ApiError(400, "enter proper email format")
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

export { registerUser };
