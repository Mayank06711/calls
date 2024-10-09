import express, { CookieOptions } from "express";
import { UserModel } from "../models/userModel";
class User {
  private static options: CookieOptions = {
    httpOnly: true, // Prevents JavaScript access to the cookie
    secure: true, // Ensures the cookie is sent only over HTTPS
    sameSite: "strict", // Prevents the browser from sending this cookie along with cross-site requests
  };

  static signUp(req: express.Request, res: express.Response) {
    try {
      console.log(req.body);
      res
        .status(200)
        .cookie("accessToken", 123)
        .cookie("refreshToken", 1243)
        .json({
          message: "User signed up successfully",
          userId: "user",
          token: "token",
          localToken: "localToken",
          username: "username",
        });
    } catch (error) {
      console.log(error);
    }
  }

  static login(req: express.Request, res: express.Response) {
    try {
      console.log(req.body);
      res
        .status(200)
        .cookie("accessToken", 1234, User.options)
        .cookie("refreshToken", 2321, User.options)
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
      res.status(200).clearCookie("accessToken", User.options).clearCookie("refreshToken", User.options).json({ message: "User logged out successfully" });
    } catch (error) {
      console.log(error);
    }
  }

  static refreshToken(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res
       .status(200)
       .cookie("accessToken", 12345, User.options)
       .cookie("refreshToken", 23215, User.options)
       .json({ message: "Refreshed successfully", userId: "user", localToken: "localToken", username: "username" });
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
  static changeAvatar(req: express.Request, res: express.Response){
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
  
  static verifyPhone(req: express.Request, res: express.Response){
    try {
      // check validation here only
      res.json({ message: "Phone Number Verified Successfully" });
    } catch (error) {
      console.log(error);
    }
  }

}

export default User;
