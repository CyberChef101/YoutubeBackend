import mongoose from "mongoose";


// ;(async()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}`)
//         app.on("error",()=>{
//             console.log(error);
//             throw error;
//         })

//         app.listen(procees.env.PORT,()=>{
//             console.log(`App is listening on port ${PORT}`)
//         })
//     } catch (error) {
//         console.error("ERRIOR",error)
//     }
// })


const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}`);
        console.log(`\n MOngoDb Connected hosted `)
    } catch (error) {
        console.error("mongiodb connection error",error);
        process.exit(1);
    }
}

export default connectDB