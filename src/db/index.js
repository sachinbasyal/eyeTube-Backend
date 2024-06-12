import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"
import {app} from "../app.js"

const connectDB = async()=>{
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    console.log(`MongoDB CONNECTED! DB HOST: ${connectionInstance.connection.host}`);
    app.on(Error, (err)=>{
        console.log("Got an Error:", err)
        throw err
    })
    
  } catch (error) {
    console.log("MongoDB connection FAILED!! ", error);
    process.exit(1)
  }
}

export default connectDB