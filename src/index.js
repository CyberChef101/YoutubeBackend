// require('dotenv').config({path:'./env'}) another way to add dotenv..

import dotenv from "dotenv"
import connectDB from "./db/database.js";

dotenv.config({
    path:'./env'
})



connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`server is running at port ${process.env.PORT}`);
    })
    app.throw(("error",(error)=>{
        console.log("error -> ",error);
        throw error
    }))
})
.catch((error)=>{
    console.log("MongoDB connection failed",error)
})

