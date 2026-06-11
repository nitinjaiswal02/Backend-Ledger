const userModel = require("../models/user.model"); 
const jwt = require("jsonwebtoken");
require("dotenv").config();


// This middleware will be used to protect routes that require authentication. It will check for the presence of a valid JWT token in the request headers or cookies, verify the token, and then attach the authenticated user's information to the request object for use in subsequent middleware or route handlers. If the token is missing or invalid, it will return an appropriate error response.
async function authMiddleware(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]; // Get the token from cookies or Authorization header

    if (!token) {
        return res.status(401).json({ message: "Authentication token is missing, please log in to access this resource" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token using the secret key
        const user = await userModel.findById(decoded.userId); // Find the user associated with the token

        if (!user) {
            return res.status(401).json({ message: "Invalid authentication token, user not found" });
        }

        req.user = user; // Attach the user object to the request for use in subsequent middleware or route handlers
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        return res.status(401).json({ message: "Invalid authentication token, please login again" });
    }
}

module.exports = authMiddleware;