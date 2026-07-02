const {Router} = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const transactionController = require("../controllers/transaction.controller");


const transcationRoutes = Router();

/**
 * - post /api/transactions
 * - Create a new transaction
 */
transcationRoutes.post("/", authMiddleware.authMiddleware, transactionController.createTransaction);

/**
 * - POST /api/transactions/system/initial-funds
 * - Create initial funds transaction for system user 
 */
transcationRoutes.post("/system/initial-funds", authMiddleware.authSystemuserMiddleware, transactionController.createInitialFundsTransaction);


module.exports = transcationRoutes;