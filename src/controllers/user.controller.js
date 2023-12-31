import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Jwt } from "jsonwebtoken";
import mongoose from "mongoose";
import { json } from "express";



const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}




const registerUser = asyncHandler( async (req,res) => {
    

    //get data for register email & pass from frontend
    const  {fullName ,email ,username ,password} = req.body
    //verify data (validation ->empty value,valid email,empty pass field)
    if( 
        [fullName,email,username,password].some((field) => {//check some method in JS(advance code)
            field?.trim() === ""
        })
    ) {
        throw new ApiError (400,"All Feilds Are Required")
    }
    //check user already exist or not  ::username and email
    const existedUser = await  User.findOne({
        $or:[{ username },{ email },]
    })
    
    if(existedUser) {
        throw new ApiError(409,"username and email already exist")
    }

    //check for images ,check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[o]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }

    //upload them to cloudinary,avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(409,"username and email already exist")
    }

    //create user object -create entry in DB
    const user = await User.create( {
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase(),
    })
    //remove password ad refresh token feild from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
        //check for user creation
    if(!createdUser) {
        throw new ApiError(500,"Something went Wrong while registering user")
    }

    //return res
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registred Successfully")
    )


})

const loginUser = asyncHandler ( async (req,res) => {
        //REQ BODY -> DATA
        const {email,password,username} = req.body;
        console.log(email);
        //usename or email
        if(!username && !email) {
            throw new ApiError(400,"username or email is required")
        }
           // Here is an alternative of above code based on logic discussed in video:
            // if (!(username || email)) {
                //     throw new ApiError(400, "username or email is required")
        
          // }




        //find the user
        const user = await User.findOne({
            $or : [{username},{email}]
        })

        if(!user){
            throw new ApiError(404,"user does not exist")
        }
        //password check
        const isPasswordisValid = await user.isPasswordCorrect(password)

        if(!isPasswordisValid){
            throw new ApiError(401,"Invalid user Credientials")
        }
        //access and  refresh token 
        const {refreshToken,accessToken} = await generateAccessAndRefereshTokens(user._id)

        const loggedUser = await User.findById(user._id).select("-password -refreshToken")
        //send cookie 
        //response
        const options = {
            httpOnly :true,
            secure :true
        }

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refresToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                user:loggedUser,accessToken,refreshToken
            },
            "User Logged In Successfully"
            )
        )
})

const logoutUser = asyncHandler ( async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken :undefined
            }
        },{
            new:true
        }
    )

    const options = {
        httpOnly :true,
        secure :true
    }

    return res
    .status(200)
    .clearCookie('accessToken',options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged Out Successfully"))

})

const refreshAccessToken = asyncHandler ( async (req,res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incommingRefreshToken) {
        throw new ApiError (401,"Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        ) 
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(401,"Invalid Refresh Token")
        }
    
        if(incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError (401,"refresh token expired")
        }
    
        const options ={
            httpOnly : true,
            secure: true
        }
    
        const {accessToken,newrefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(200,
                {
                    accessToken,refreshToken:newrefreshToken
                },"Access token refreshed")
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
        
    }
})


const changeCurrentPassword = asyncHandler( async (req,res) => {

    const {oldPassword,newPassword} = req.body;

    const user = User.findById(req.user?._id)
    const isPasswordcorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordcorrect) {
        throw new ApiError (400,"Invalid PAssword");
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json( new ApiResponse (200,{},"Password chaned Successfully"))
})

const getCurrentUser = asyncHandler (async (req,res) =>{
    return res
    .status(200)
    .json(200,req.user,"current user fetched successfully")
})

const updateAccountDetails = asyncHandler (async (req,res) =>{
    const {fullName,email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400,"All feilds are Required")
    }

    await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName : fullName,
                email :email
            }
        },
        {new:true}).select("-password")

        res.status(200)
        .json(new ApiResponse (200, User, "Account Details Updatred Successfully"))

})

const updateUserAvatar = asyncHandler (async(req,res)=>{
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is Missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200,user,"avatarImage updated successfully")
    )
})


const updateUserCoverImage = asyncHandler (async(req,res)=>{
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath) {
        throw new ApiError(400,"coverimage  file is Missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url) {
        throw new ApiError(400,"Error while uploading on coverimage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200,user,"coverimage updated successfully")
    )
})

const getUserChannelProfile = asyncHandler ( async (req,res) =>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
            username:username?.toLowerCase()
        }
    },
    {
        $lookup: {
            from:"subcription",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },
    {
        $lookup: {
            from:"subcription",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
        }
    },
    {
        $addFields: {
            subscribersCount : {
                $size :"$subscribers"
            },
            channelSubscribedCount : {
                $size:"$subscribedTo"
            },
            isSubscribed : {
                $cond: {
                    if: {$in: [req.user?._id,"$subscribers.subscriber"]},
                    then:true,
                    else:false 
                }
            }
        }
    },
    {
        $project: {
            fullName : 1,
            username : 1,
            subscribersCount : 1,
            channelSubscribedCount : 1,
            isSubscribed : 1,
            avatar: 1,
            coverImage : 1,
            email: 1
        }
    }
    ])

    if( !channel?.length() ) {
        throw new ApiError(404,"channel does not exist")
    }

    return res.status(200)
    .json(
        new ApiResponse(200,channel[0],"user channel data fetched successfully")
    )
})

const getWatchHistory = asyncHandler (async (req,res) =>{

    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner : {
                                $first: "$owner"
                            }
                        }
                    }
                ] 
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfully")
    )
})




export {
    registerUser,
    loginUser,
    logoutUser,
    generateAccessAndRefereshTokens,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}
