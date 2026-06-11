const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const emailService = require("../services/email.service");

// this will help to understand for what purpose we are creating this controller and how it will be used in our application, so we will create a user registration controller function that will handle the user registration process. This function will receive the user data from the request body, validate it, and then create a new user in the database using the user model. We will also handle any errors that may occur during the registration process and send appropriate responses back to the client.

/**
 * - Controller function to handle user registration.
 * - POST /api/auth/register
 */
async function userRegisterController(req, res) {
    const { email, password, name } = req.body;

    // Validate the input data
    if (!email || !password || !name) {
        return res.status(400).json({ 
            message: "Email, password, and name are required for creating a user account",
            status:"failed"
        });
    }
    const isExists = await userModel.findOne({ email: email });

    if (isExists) {
        return res.status(400).json({ 
            message: "Email already exists, please use a different email address",
            status:"failed"
        });
    }
    const user = await userModel.create({
        email,
        password,
        name,
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

        res.cookie("token", token); // Set the token in an HTTP-only cookie for secure storage on the client side
        res.status(201).json({ 
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
        }, 
        token
    });

    await emailService.sendRegistrationEmail(user.email, user.name); // Send a registration email to the user after successful registration

}


/**
 * 
    * - Controller function to handle user login.
    * - POST /api/auth/login
 */
async function userLoginController(req, res) {
    const { email, password } = req.body;

    // Validate the input data
    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required for login",
            status: "failed"
        });
    }

    const user = await userModel.findOne({ email }).select("+password"); // Select the password field explicitly since it is excluded by default in the user model

    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password",
            status: "failed"
        });
    }

    const isPasswordValid = await user.comparePassword(password); // Use the comparePassword method defined in the user model to compare the provided password with the hashed password stored in the database

    if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid email or password",
            status: "failed"
        });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

    res.cookie("token", token); // Set the token in an HTTP-only cookie for secure storage on the client side
    res.status(200).json({
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
        },
        token
    });
}

module.exports = {
    userRegisterController,
    userLoginController,
};