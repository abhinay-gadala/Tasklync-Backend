import mongoose from "mongoose";


async function connectDB(url: String){
    try{
        await mongoose.connect(url as string)
        console.log("MongoDB is connected")
    }
    catch(e){
        console.log("MongoDB is not connected")
        process.exit(1)
    }

}

export default connectDB;