const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Ledger entry must be associated with an account"],
        index: true, // Add an index to the account field for faster queries
        immutable: true, // Make the account field immutable to prevent changes after the ledger entry is created
    },
    amount: {
        type: Number,
        required: [true, "Amount is required for creating a ledger entry"],
        immutable: true, // Make the amount field immutable to prevent changes after the ledger entry is created
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required: [true, "Ledger entry must be associated with a transaction"],
        index: true, // Add an index to the transaction field for faster queries
        immutable: true, // Make the transaction field immutable to prevent changes after the ledger entry is created
    },
    type: {
        type: String,
        enum: ["DEBIT", "CREDIT"],
        Message: "Type must be either DEBIT or CREDIT",
        required: [true, "Type is required for creating a ledger entry"],
        immutable: true, // Make the type field immutable to prevent changes after the ledger entry is created
     }
    })

    function preventLedgerModification(){
        throw new Error("Ledger entries cannot be modified after creation to ensure data integrity and accurate financial records");    
    }

    ledgerSchema.pre('findOneAndUpdate', preventLedgerModification); // Prevent updates to ledger entries using findOneAndUpdate
    ledgerSchema.pre('updateOne', preventLedgerModification); // Prevent updates to ledger entries using updateOne
    ledgerSchema.pre('updateMany', preventLedgerModification); // Prevent updates to ledger entries using updateMany
    ledgerSchema.pre('deleteOne', preventLedgerModification);
    ledgerSchema.pre('deleteMany', preventLedgerModification);
    ledgerSchema.pre('findOneAndDelete', preventLedgerModification);
    ledgerSchema.pre('findOneAndReplace', preventLedgerModification);
    ledgerSchema.pre('remove', preventLedgerModification);

    const ledgerModel = mongoose.model("ledger", ledgerSchema);

    module.exports = ledgerModel;