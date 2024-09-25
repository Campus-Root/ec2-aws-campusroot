import mongoose from "mongoose";
import validator from "validator";


const userSchema = mongoose.Schema({
  firstName: { type: String, trim: true, },
  lastName: { type: String, trim: true, },
  displayPicSrc: { type: String, default: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" },
  email: { type: String, required: [true, "Please provide email"], validate: { validator: validator.isEmail, message: "please provide valid email", }, trim: true, },
  about: { type: String },
  password: { type: String, trim: true },
  socialAuth: { google: { id: { type: String } } },
  communities: [{ type: mongoose.Types.ObjectId, ref: "community", }],
  otp: { type: String },
  logs: [{ action: { type: String }, time: { type: Date, default: new Date() }, details: { type: String } }],
  failedLoginAttempts: { type: Number },
  nextLoginTime: { type: Date },
  lastActive: { type: Date },
  docData: {
    folder: { type: String },
    name: { type: String },
    parent: { type: String },
    download_url: { type: String },
    modified_by_zuid: { type: String }
  }
},
  { discriminatorKey: 'userType' },
  { timestamps: true }
);


const userModel = mongoose.model("user", userSchema);
export default userModel

