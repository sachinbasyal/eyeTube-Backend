//require('dotenv').config() // common JS  style
import dotenv from "dotenv" // module JS
import connectDB from './db/index.js'
import {app} from './app.js'


dotenv.config({path:"./.env"})

connectDB()
.then(()=>{
  app.listen(process.env.PORT || 3000, ()=>{
    console.log(`Server is listening at port: ${process.env.port}`);
  })
})
.catch((error)=>{
  console.log('MongoDB FAILED!!! ', error);
}); //connnect to MongoDB 


/* 1st Method to connect DB

import mongoose from "mongoose";
import { DB_NAME } from "./constants";
import express from "express";
const app = express();

Best practice: Always use Async / Await() and wrap with Try-Catch() /Promises while connecting to DB. [DB is always supposed to be on another continent..]

IIFE ()();
;(async()=>{
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    app.on("Error", (error)=>{
      console.log("Error:", error)
      throw error
    })

    app.listen(process.env.PORT, ()=>{
      console.log(`/n App is listening at port ${process.env.PORT} `);
    })

  } catch (error) {
    console.log("Error: ",error)
    throw error
  }
})();
*/
