const mongoose = require("mongoose");
const ledgerModrl = require("./ledger.model");

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, "Account must be associated with a user account"],
        index: true, // Add an index to the user field for faster queries
    },
    status: {
        type: String,
        enum: ["ACTIVE", "FROZEN", "CLOSED"],
        Message: "Status must be either ACTIVE, FROZEN, or CLOSED",
        default: "ACTIVE",
     },
     currency: {
        type: String,
        required: [true, "Currency is required for creating an account"],
        default: "INR",
        }
}, {
    timestamps: true, // Automatically add createdAt and updatedAt fields to the schema
});

accountSchema.index({ user: 1 , status: 1}); // Create an compound index on the user and status fields for faster queries



accountSchema.methods.getBalance = async function () { // This method calculates the current balance of the account by aggregating the ledger entries associated with the account. It sums up all the CREDIT entries and subtracts all the DEBIT entries to derive the current balance. The method uses MongoDB's aggregation framework to perform this calculation efficiently.
    const ledgerData = await ledgerModrl.aggregate([ // use aggregate to run custom queries on database 
        { $match: { account: this._id } }, // Match ledger entries for the current account
        {
            $group: {
                _id: null, // Group by the type of ledger entry (DEBIT or CREDIT)
                totalDebit: { $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0 ] } }, // Calculate the total amount for each type
                totalCredit: { $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0 ] } } // Calculate the total amount for each type
            },
        },{
            $project: {
                _id: 0, // Exclude the _id field from the result
                balance: { $subtract: ["$totalCredit", "$totalDebit"] }, // Calculate the balance by subtracting total debit from total credit
            },
        }
    ]);

    if(balanceData.length === 0){
        return 0; // If there are no ledger entries for the account(new user), return a balance of 0
    }

    return balanceData[0].balance; // Return the calculated balance from the aggregation result
} // Method to calculate the current balance of the account by aggregating the ledger entries associated with the account



const Account = mongoose.model("Account", accountSchema);

module.exports = Account; 