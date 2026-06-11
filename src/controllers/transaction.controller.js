
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");

// This controller will handle the transaction creation process and return the created transaction details in the response

/**
 * - Create a new transaction
 * The 10-Step transfer flow:
    * 1. Validate the request body to ensure that all required fields (fromAccount, toAccount, amount, idempotencyKey) are present and valid.
    * 2. Validate the idempotencyKey to ensure that it is unique and has not been used for a previous transaction. If a transaction with the same idempotencyKey already exists, return an appropriate response based on the status of the existing transaction (e.g., if it's still pending, if it has completed, or if it has failed).
    * 3. Check the status of both the fromAccount and toAccount to ensure that they are active and eligible for transactions. If either account is inactive or has any restrictions, return an appropriate error response indicating the issue with the accounts.
    * 4. Derive the sender's balance from the ledger and validate that the sender has sufficient balance to proceed with the transaction.
    * 5. Create a new transaction record in the database with a status of "PENDING" and associate it with the fromAccount and toAccount.
    * 6. Create DEBIT ledger entry
    * 7.  Create CREDIT ledger entry
    * 8. mark transaction COMPLETED
    * 9. Commit mongoDB session
    * 10. Send email notification
 */

async function createTransaction(req, res) {
    const {fromAccount, toAccount, amount,idempotencyKey} = req.body;

    if(!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required for creating a transaction",
            status: "failed"
        });

    }

    const fromUserAccount = await accountModel.findById(fromAccount);
    const toUserAccount = await accountModel.findById(toAccount);

    if(!fromUserAccount || !toUserAccount) {
        return res.status(404).json({
            message: "fromAccount or toAccount not found, please provide valid account IDs",
            status: "failed"
        });
    }


    /**
     * 2. Validate idempotencykey
     */
    const isTransactionAlreadyExists = await transactionModel.findOne({ idempotencyKey:idempotencyKey });


    if (isTransactionAlreadyExists) {
        if(isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(409).json({
                message: "A transaction is already proceeded",
                status: "failed"
            });
        }

        if(isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "A transaction is astill processing",
                status: "failed"
            });
        }
        if(isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({message:"Transaction processing failed previously, please try again",
                 status:"failed"
                });
    }

    if(isTransactionAlreadyExists.status === "REVERSED") {
        return res.status(500).json({
            message: "A transaction is already reversed, please try.",
            status: "failed"
        });
    }





} 

/**
 * 3. check account status
 */

if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
    return res.status(400).json({
        message: "Both fromAccount and toAccount must be active to proceed with the transaction",
        status: "failed"
    });
}

/**
 * 4. Derive sender balance from ledger and validate sender has sufficient balance to proceed with the transaction
 */

const balance = await fromUserAccount.getBalance();

if(balance < amount) {
    return res.status(400).json({
        message: 'Insufficient balance. Current balance is ' + balance + ', Requested amount is ' + amount,
        status: "failed"
    });
}

/**
 * 5. Create transaction(PENDING)
 */


}