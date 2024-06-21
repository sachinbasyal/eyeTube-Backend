import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

//app.use(cors())  // .use: middleware (basic)

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


// routes import
import userRouter from "./routes/user.route.js"
import videoRouter from "./routes/video.route.js"
import healthcheckRouter from "./routes/healthcheck.route.js"
import subscriptionRouter from "./routes/subscription.route.js"

//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter) // => http://localhost:3000/api/v1/users/route:
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)


export {app} 