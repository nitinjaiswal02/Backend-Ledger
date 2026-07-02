const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const accountController = require("../controllers/account.controller");


const router = express.Router();

/**
 * - POST /api/accounts/
 * - Create a new account for the authenticated user. The request body should contain the account details such as name, type, and balance. The controller will validate the input data, create a new account in the database associated with the authenticated user, and return the created account details in the response. If there are any validation errors or issues during account creation, appropriate error responses will be sent back to the client.
 * - protected route, requires authentication
 */
router.post("/", authMiddleware.authMiddleware, accountController.createAccountController);


module.exports = router;