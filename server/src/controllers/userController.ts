import express, { CookieOptions } from "express";
import { UserModel } from "../models/userModel";
import { UserSchema } from "../validation/zodSchema";
import { ApiError } from "../utils/apiError";
import { middleware } from "../middlewares/middlewares";
import { AuthServices } from "../utils/auth";

class User {
  private static options: CookieOptions = {
    httpOnly: true, // Prevents JavaScript access to the cookie
    secure: true, // Ensures the cookie is sent only over HTTPS
    sameSite: "strict", // Prevents the browser from sending this cookie along with cross-site requests
  };


  static async create(req: express.Request, res: express.Response) {
    try {

      const { username, fullName, password, email } = req.body ;
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

      const id = user._id;
      // Check if the user is created
      if (user) {
        console.log("User created successfully:", user);
        console.log(req.body);
        const accessToken = await AuthServices.genJWT_Token(
          { id, username, email },
          process.env.ACCESS_TOKEN_SECRET!,
          process.env.ACCESS_TOKEN_EXPIRY!
        ); // + sign to convert into number
        const refreshToken = await AuthServices.genJWT_Token(
          { id, username },
          process.env.REFRESH_TOKEN_SECRET!,
          process.env.REFRESH_TOKEN_EXPIRY!
        ); // + sign to convert into number
    
        const tokens = {
          accessToken , refreshToken
        }
        if (tokens === null) {
          await UserModel.findByIdAndDelete(user._id);
          throw new ApiError(500, "Something went wrong");
        }
        // Set HTTP-only cookie for refresh token (secure it for production)
        
        res
          .status(200)
          .cookie("refreshToken", tokens.refreshToken, this.options) // Store refresh token in an HttpOnly cookie
          .cookie("accessToken", tokens.accessToken, this.options) // Store refresh token in an HttpOnly cookie
          .json({
            message: "User signed up successfully, Please fill other fields",
            userId: user._id, // Optional: You can remove this if using only cookies
            localToken: tokens.accessToken, // Send access token to frontend
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

  static async signUp(req: express.Request, res: express.Response) {
    try {

      console.log(req.body);
      const result = UserSchema.safeParse(req.body);

      if (!result.success) {
        throw new ApiError(400, "Invalid user details");
      }
      console.log(result.data);
      const user = await UserModel.findOne({
        username: result.data.username,
      });
      if (user) {
        throw new ApiError(400, "User already exists");
      }
      const avatar = req.files; // user photo if he want to
      if (!avatar) {
        console.log(avatar, "Avatar already  not given");
      }
      const uploadedResult = await middleware.UploadFilesToCloudinary([avatar]); // upload avatar to cloudinary if exists
      if (!uploadedResult) {
        throw new ApiError(500, "Photo Upload failed please try again later");
      }
      const photo = {
        key: uploadedResult[0].public_id,
        url: uploadedResult[0].url,
      };
      const newUser = await UserModel.create({
        ...result.data,
        photo,
      });

      if (!newUser) {
        throw new ApiError(500, "User creation failed please try again later");
      }

      const formattedResults = {
        userId: newUser._id,
        username: newUser.username,
        photo: newUser.photo,
        email: newUser.email,
        fullName: newUser.fullName,
        phoneNumber: newUser.phoneNumber,
        age: newUser.age,
        gender: newUser.gender,
        city: newUser.city,
        country: newUser.country,
      };
      res
        .status(200)
        .cookie("accessToken", 123)
        .cookie("refreshToken", 1243)
        .json(formattedResults);
    } catch (error) {
      console.log(error);
    }
  }

  static async login(req: express.Request, res: express.Response) {
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
    const { username, email, password } = req.body;
    if (!username && !email) {
      throw new ApiError(401, "Please enter a username or email");
    }

    const user = await UserModel.findOne({
      $or: [{ username: username }, { email: email }],
    });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (!(await AuthServices.isKeyCorrect(password, user.password))) {
      throw new ApiError(401, "Invalid password");
    }

    const {
      _id,
      fullName,
      isMFAEnabled,
      photo: { url } = {},
    } = { ...user };

    console.log(typeof +process.env.ACCESS_TOKEN_EXPIRY!);
    const accessToken = await AuthServices.genJWT_Token(
      { _id, username, email },
      process.env.ACCESS_TOKEN_SECRET!,
      process.env.ACCESS_TOKEN_EXPIRY!
    ); // + sign to convert into number
    const refreshToken = await AuthServices.genJWT_Token(
      { _id, username },
      process.env.REFRESH_TOKEN_SECRET!,
      process.env.REFRESH_TOKEN_EXPIRY!
    ); // + sign to convert into number

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    };

    if (isMFAEnabled) {
      const { MFAKey } = req.body;
      if (!MFAKey) {
        throw new ApiError(
          401,
          "Please enter MFA key, or if forgot you MKAKey meet your department head to get your MFAkey"
        );
      }
      // implement MFA verification logic
      if (!(await AuthServices.isKeyCorrect(MFAKey, user.MFASecretKey!))) {
        throw new ApiError(
          401,
          "Invalid MFA key try again or if forgot you MKAKey meet your department head to get your MFAkey"
        );
      }
      res
        .status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", refreshToken)
        .json({
          _id,
          fullName,
          isMFAEnabled,
          url,
        });
    } else {
      res
        .status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", refreshToken)
        .json({
          _id,
          fullName,
          isMFAEnabled,
          url,
        });
    }
  }
  static logout(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res
        .status(200)
        .clearCookie("accessToken", User.options)
        .clearCookie("refreshToken", User.options)
        .json({ message: "User logged out successfully" });
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
        .json({
          message: "Refreshed successfully",
          userId: "user",
          localToken: "localToken",
          username: "username",
        });
    } catch (error) {
      console.log(error);
    }
  }

  static async  changePassword(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      const {oldPassword, newPassword} = req.body;

      const user = await UserModel.findOne({ _id: req.user?.id });
      if (!user) {
        throw new ApiError(404, "User not found");
      }
      if (!(await AuthServices.isKeyCorrect(oldPassword, user.password))) {
        throw new ApiError(401, "Invalid password");
      }
      const newUser = await UserModel.updateOne(
        { _id: req.user?.id },
        { $set: { password: await AuthServices.hashPassword(newPassword) } }
      );
      if(!newUser){
        throw new ApiError(500, "Failed to update password");
      }
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
  static async  verifyEmail(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      const userId =  req.user?.id;

      const user = await UserModel.findOne({ _id: userId });
      if (!user) {
        throw new ApiError(404, "User not found");
      }
      if(user.isEmailVerified){
        throw new ApiError(400, "Email already verified");
      }
     const done = await  AuthServices.generateAndSendOtp(user?.id); // if email successfully added to send  then true or false
    if(done === false){
      throw new ApiError(500, "Failed to send opt");
    }

     res.status(200).json({ message: "Email sent succseesfully" });
    } catch (error) {
      console.log(error);
    }
  }

  static async  verifyOtp(req: express.Request, res: express.Response) {
      // check validation here only
      const userId =  req.user?.id;
      const otp = req.body.otp;
      const user = await UserModel.findOne({ _id: userId });
      if (!user) {
        throw new ApiError(404, "User not found");
      }
      if(user.isEmailVerified){
        throw new ApiError(400, "Email already verified");
      }
      const isOtpCorrect = await AuthServices.verifyOTP(otp, user?.id);
      if(isOtpCorrect){
        const updatedUser = await UserModel.updateOne(
          { _id: userId },
          { $set: { isEmailVerified: true } }
        );
        if(!updatedUser){
          throw new ApiError(500, "Failed to update email verification status");
        }
        res.status(200).json({ message: "Email verified successfully" });
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


  static async getProfile(req: express.Request, res: express.Response) {
    try {
      if(!req.user){
        throw new ApiError(401, "User not found");
      }
      const { username} = req.user;
      const user = await UserModel.findOne({ username });
      if(!user ){
        throw new ApiError(404, "User not found");
      }
      const formattedUser = {
          fullName :user.fullName,
          username :user.username,
          email:user.email,
          phoneNumber:user.phoneNumber,
          gender:user.gender,
          age:user.age,
          country:user.country,
          isEmailVerified:user.isEmailVerified,
          isPhoneVerified:user.isPhoneVerified,
          photo: {
              url: user.photo?.url,
          },
          isSubscribed:user.isSubscribed,
          subscriptionDetail: user.subscriptionDetail,
          isMFAEnabled:user.isMFAEnabled,
      };
      
      res.status(200).json({ formattedUser , message: "User Profile" });
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

  static verifyPhone(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res.json({ message: "Phone Number Verified Successfully" });
    } catch (error) {
      console.log(error);
    }
  }


  

}



export default User;


