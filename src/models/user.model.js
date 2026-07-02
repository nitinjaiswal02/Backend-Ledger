const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Email is required for creating a user account "],
        trim: true,
        unique: [true, "Email already exists, please use a different email address"],
        lowercase: true,
        match: [/\S+@\S+\.\S+/, "Please provide a valid email address"],
    },
    password: {
        type: String,
        required: [true, "Password is required for creating a user account"],
        minlength: [6, "Password must be at least 6 characters long"],
        select: false, // Exclude password from query results(query user data) by default for security reasons 
    },
    name: {
        type: String,
        required: [true, "Name is required for creating a user account"],

    },
    systemUser: {   
        type: Boolean,
        default: false, // Default value is false, indicating that the user is not a system user unless explicitly set to true
        immutable: true, // Make the systemUser field immutable programatically, only database administrator can set this field to true, it cannot be changed by the user or any other means after the user account is created
    }
}   , {
    timestamps: true, // Automatically add createdAt and updatedAt fields to the schema

});

userSchema.pre("save", async function () { // Pre-save middleware to hash the password before saving the user document
    if (!this.isModified("password")) { // we cannot use next() in async functions, so we will simply return from the function if the password is not modified to avoid unnecessary hashing and save time during user updates that do not involve password changes
         return ;
    }
    
    const hash = await bcrypt.hash(this.password,10); // Reverse is not possible as hashing is one way function, so we will use bcrypt's compare function to compare the provided password with the hashed password stored in the database when user tries to login
    this.password = hash;
});

userSchema.methods.comparePassword = async function (candidatePassword) { // Method to compare the provided password with the hashed password stored in the database
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
