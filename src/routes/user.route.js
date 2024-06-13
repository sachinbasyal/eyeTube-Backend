import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([    // add middleware just before executing registerUser method
    {
      name:"avatar",
      maxCount:1
    },
    {
     name:"coverImage",
     maxCount:1 
    }

  ]),
  registerUser)

router.route("/login").post(loginUser)

// secured routes
router.route("/logout").post(verifyJWT, logoutUser)  // inject verifyJWT middleware just before executing logoutUser
router.route("/refresh-token").post(refreshAccessToken)


export default router