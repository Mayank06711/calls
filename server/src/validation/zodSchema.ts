import { z } from "zod";

const UserSchema = z.object({
  fullName: z.string().min(1,"Full name is required"),
  username: z.string().min(1 , "Username is required"),
  email: z.string().email("Invalid email address").min(11 , "Email is required"),
  phoneNumber: z.string().min(1 , "Phone number is required"),
  password: z.string().min(1  , "Password is required"),
  gender: z.enum(["Male", "Female", "Other"], {
    required_error: "Gender is required",
  }),
  age: z.number().int().min(0, "Age must be a positive number").nonnegative("Age is required"),
  city: z.string().min(1 , "City is required"),
  country: z.string().default("India"),
  refreshToken: z.string().optional(),
  photo: z
    .object({
      key: z.string(),
      url: z.string().url("Invalid URL format"),
    })
    .optional(),
  referral: z.string().optional(),  // Reference ID as a string
});

export { UserSchema };
