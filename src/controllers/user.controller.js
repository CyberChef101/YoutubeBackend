import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";



const generateAccessAndRefreshToken = async( userId) => {
    try{
        const user =  User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return {refreshToken,accessToken}
    }catch (error){
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
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
        //usename or email
        if(!username || !email) {
            throw new ApiError(400,"username or email is required")
        }
        //find the user
        const user = await User,findOne({
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
        const {refreshToken,accessToken} = await generateAccessAndRefreshToken(user._id)

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
    awaitUser.findByIdAndUpdate(
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

export {
    registerUser,
    loginUser,
    logoutUser
}
