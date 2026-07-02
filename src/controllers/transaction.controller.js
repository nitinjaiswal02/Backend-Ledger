
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");
const userModel = require("../models/user.model");

// This controller will handle the transaction creation process and return the created transaction details in the response

/**
 * - Create a new transaction
 * The 10-Step transfer flow:
    * 1. Validate request , in short check if fromAccount, toAccount, amount and idempotencyKey are present in the request body
    * 2. Validate idempotencyKey , in short check if a transaction with the same idempotencyKey already exists in the database, if yes then return the existing transaction details in the response
    * 3. Check account status , in short check if both fromAccount and toAccount are active, if not then return an error response
    * 4. Derive the sender's balance from the ledger , in short check if the sender has sufficient balance to proceed with the transaction, if not then return an error response
    * 5. Create transaction(PENDING) , in short create a new transaction with status PENDING and save it to the database, also start a MongoDB session and transaction to ensure atomicity of the operations
    * 6. Create DEBIT ledger entry , in short create a new ledger entry for the sender's account with type DEBIT and save it to the database within the same MongoDB session
    * 7.  Create CREDIT ledger entry , in short create a new ledger entry for the receiver's account with type CREDIT and save it to the database within the same MongoDB session
    * 8. mark transaction COMPLETED , in short update the transaction status to COMPLETED and save it to the database within the same MongoDB session
    * 9. Commit mongoDB session , in short commit the MongoDB session to persist the changes to the database, if any of the above steps fail then rollback the transaction and return an error response
    * 10. Send email notification , in short send an email notification to the sender and receiver about the transaction details, if email sending fails then log the error but do not rollback the transaction as the transaction is already completed and persisted in the database
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
     * 2. Validate idempotencykey to prevent duplicate transactions, in short check if a transaction with the same idempotencyKey already exists in the database, if yes then return the existing transaction details in the response
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
                message: "A transaction is still processing",
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
 const session = await mongoose.startSession();
    session.startTransaction(); // Start a MongoDB session and transaction to ensure atomicity of the operations , ye ensure karega ki step 5,6,7,8 ek atomic unit ke roop me execute ho jaye, agar inme se koi bhi step fail hota hai to pura transaction rollback ho jayega aur database me koi inconsistent state nahi aayegi.
    
    const transaction = await transactionModel.create([{
    fromAccount,
    toAccount,
    amount,
    idempotencyKey,
    status: "PENDING"
}], { session }); // we pass session as second parameter in create to ensure that atomicity 

    const debitLedgerEntry = await ledgerModel.create({
        account:fromAccount,
        amount:amount,
        transaction:transaction_id,
        type:"DEBIT"
    },{session})

    const creditLedgerEntry = await ledgerModel.create({
        account:toAccount,
        amount:amount,
        transaction:transaction_id,
        type:"CREDIT"
    },{session})

    transaction.status = "COMPLETED"
    await transaction.save({ session })

    await session.commitTransaction()
    session.endSession()

    /**
     * 10. Send email notification
     */
    await emailService.sendTransactionEmail(req.user.email,req.user.name,amount,toAccount)

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })

}

async function createInitialFundsTransaction(req, res) {
    const {toAccount, amount,idempotencyKey} = req.body;

    if(!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required for creating a transaction",
            status: "failed"
        });
    }
    const toUserAccount = await accountModel.findById(toAccount);

        if(!toUserAccount) {
            return res.status(404).json({
                message: "toAccount not found, please provide valid account ID",
                status: "failed"
            });
        }

        const systemUser = await userModel.findOne({
    systemUser: true,
});

if (!systemUser) {
    return res.status(404).json({
        message: "System user not found",
        status: "failed",
    });
}

        const fromUserAccount = await accountModel.findOne({
            user: req.user._id
        });

        if(!fromUserAccount) { // ho sakta hai koi database hi uda diya ho ya fir system user account delete ho gaya ho, isliye ye check karna zaruri hai ki system user account exist karta hai ya nahi
            return res.status(404).json({
                message: "System user account not found",
                status: "failed"
            });
        }

        const session = await mongoose.startSession();
        session.startTransaction();


        const existingTransaction = await transactionModel.findOne({
    idempotencyKey,
});

if (existingTransaction) {
    return res.status(409).json({
        message: "Transaction with this idempotency key already exists.",
        transaction: existingTransaction,
    });
}

        const transaction = await transactionModel.create({ 
            fromAccount:fromUserAccount._id,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        });


        const debitLedgerEntry = await ledgerModel.create([{
            account:fromUserAccount._id,
            amount:amount,
            transaction:transaction._id,
            type:"DEBIT"
        }], { session });

        const creditLedgerEntry = await ledgerModel.create([{
            account:toAccount,
            amount:amount,
            transaction:transaction._id,
            type:"CREDIT"
        }], { session });

        transaction.status = "COMPLETED"
        await transaction.save({ session })

        await session.commitTransaction()
        session.endSession()

        return res.status(201).json({
            message: "Initial funds transaction completed successfully",
            transaction: transaction
        })
    }


module.exports = {
    createTransaction,
    createInitialFundsTransaction,
};