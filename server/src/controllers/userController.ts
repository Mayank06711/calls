import express, { CookieOptions } from "express";
import { UserModel } from "../models/userModel";
import { ApiError } from "../utils/apiError";
import AsyncHandler from "../utils/AsyncHandler";
import { ObjectId } from "mongoose";
import { AuthServices } from "../helper/auth";
class User {
  private static options: CookieOptions = {
    httpOnly: true, // Prevents JavaScript access to the cookie
    secure: process.env.NODE_ENV! === "prod", // Ensures the cookie is sent only over HTTPS
    sameSite: "strict", // Prevents the browser from sending this cookie along with cross-site requests
    maxAge: 24 * 60 * 60 * 1000, // 1 day (for access token) - 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
  };

  private static refreshOptions: CookieOptions = {
    httpOnly: true, // Prevents JavaScript access to the cookie
    secure: process.env.NODE_ENV! === "prod", // Ensures the cookie is sent only over HTTPS
    sameSite: "strict", // Prevents the browser from sending this cookie along with cross-site requests
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days (for refresh token) - 15 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
  };

  static async signUp(req: express.Request, res: express.Response) {
    try {
      const { username, fullName, password, email } = req.body;
      if ([username, password, email].some((f) => f == null || f === "")) {
        throw new ApiError(400, "All fields must be present");
      }
      const usernameExists = await UserModel.findOne({ username });
      const emailExists = await UserModel.findOne({ email });

      if (usernameExists && emailExists) {
        throw new ApiError(409, "Both username and email already exist");
      } else if (usernameExists) {
        throw new ApiError(409, "Username already exists");
      } else if (emailExists) {
        throw new ApiError(409, "Email already exists");
      }

      const user = await UserModel.create({
        username,
        fullName,
        password,
        email,
      });
      // Check if the user is created
      if (user) {
        console.log("User created successfully:", user);
        console.log(req.body);
        const tokens = await AuthServices.getAccAndRefToken(
          user._id as ObjectId
        );
        if (tokens === null) {
          await UserModel.findByIdAndDelete(user._id);
          throw new ApiError(500, "Something went wrong");
        }
        // Set HTTP-only cookie for refresh token (secure it for production)
        res
          .status(200)
          .cookie("refreshToken", tokens.refreshToken, this.options) // Store refresh token in an HttpOnly cookie
          .cookie("accessToken", tokens.accessToken, this.refreshOptions) // Store refresh token in an HttpOnly cookie
          .json({
            message: "User signed up successfully, Please fill other fields",
            userId: user._id, // Optional: You can remove this if using only cookies
            localToken: user._id, // Send access token to frontend
            username: user.username,
          });
      } else {
        throw new ApiError(500, "User creation failed without error");
      }
    } catch (error: any) {
      if (error.name === "ValidationError") {
        throw new ApiError(400, "Validation Error: " + error.message);
      } else {
        throw new ApiError(500, "Internal Server Error: Unable to create user");
      }
    }
  }

  static login(req: express.Request, res: express.Response) {
    try {
      console.log(req.body);
      res
        .status(200)
        .cookie("accessToken", 1234, User.options)
        .cookie("refreshToken", 2321, User.refreshOptions)
        .json({
          message: "User logged in successfully",
          userId: "user",
          localToken: "localToken",
          username: "username",
        });
    } catch (error) {
      console.log(error);
    }
  }

  static logout(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res
        .status(200)
        .clearCookie("accessToken", User.options)
        .clearCookie("refreshToken", User.refreshOptions)
        .json({ message: "User logged out successfully" });
    } catch (error) {
      console.log(error);
    }
  }

  static changePassword(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res.json({ message: "Changed successfully, Login With New Password" });
    } catch (error) {
      console.log(error);
    }
  }
  static forgotPassword(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res.json({ message: "Reset Password Link Sent Successfully" });
    } catch (error) {
      console.log(error);
    }
  }
  static verifyEmail(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res.json({ message: "Email Verified Successfully" });
    } catch (error) {
      console.log(error);
    }
  }
  static changeAvatar(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res.json({ message: "Avatar Changed Successfully" });
    } catch (error) {
      console.log(error);
    }
  }
  static getProfile(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res.json({ message: "User Profile" });
    } catch (error) {
      console.log(error);
    }
  }
  static updateProfile(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res.json({ message: "Profile Updated Successfully" });
    } catch (error) {
      console.log(error);
    }
  }
}

export default User;
