import mongoose from "mongoose";

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