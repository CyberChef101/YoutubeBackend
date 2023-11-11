import mongoose ,{schama} from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'


const userSchema = new schama(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            locercase:true,
            trim:true,
            index:true
        },
        email:{
            type:String,
            required:true,
            unique:true,
            locercase:true,
            trim:true,
            
        },
        fullName:{
            type:String,
            required:true,
            trim:true,
            
        },
        avatar:{
            type:String,//cloudinary 
            required:true,
        },
        coverimage:{
            type:String,
        },
        watchHistory: [
            {
                type:Schema.Type.ObjectId,
                ref:"video"
            }
        ],
        password:{
            type:String,
            required:[true,"Password is Required"]
        },
        refreshToken:{
            type:String,
        } 
    },
    {
        timestramps:true 
    }
)

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.gebe=generateAccessToken = function (){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiriesIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}


userSchema.methods.gebe=generateRefreshToken = function (){
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiriesIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}




export const User = mongoose.model("User",userSchema);