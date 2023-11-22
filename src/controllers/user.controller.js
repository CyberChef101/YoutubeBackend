import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "./utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { response } from "express";
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req,res) => {
    //get data for register email & pass from frontend
    //verify data (validation ->empty value,valid email,empty pass field)
    //check user already exist or not  ::username and email
    //check for images ,check for avatar
    //upload them to cloudinary,avatar
    //create user object -create entry in DB
    //remove password ad refresh token feild from response
    //check for user creation
    //return res

    const  {fullName ,email ,username ,password} = req.body

    if( 
        [fullName,email,username,password].some((field) => {//check some method in JS(advance code)
            field?.trim() === ""
        })
    ) {
        throw new ApiError (400,"All Feilds Are Required")
    }
    
    const existedUser = User.findOne({
        $or:[{ username },{ email },]
    })

    if(existedUser) {
        throw new ApiError(409,"username and email already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[o]?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(409,"username and email already exist")
    }

    const user = await User.create( {
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowercase(),
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500,"Something went Wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registred Successfully")
    )


})



export {registerUser}
