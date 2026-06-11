const accountModel = require("../models/account.model");

// This controller will handle the account creation process and return the created account detailsin the response

    async function createAccountController(req, res) {
    const user = req.user; // Get the authenticated user from the request object (set by auth middleware)

    const account = await accountModel.create({
        ...req.body, // Spread the account details from the request body
        user: user._id, // Associate the account with the authenticated user's ID
    });

    res.status(201).json({
        account, // Return the created account details in the response
    });

}

module.exports = {
    createAccountController,
};