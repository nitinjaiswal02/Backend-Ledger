const {Router} = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const transactionController = require("../controllers/transaction.controller");


const transcationRoutes = Router();

/**
 * - post /api/transactions
 * - Create a new transaction
 */
transcationRoutes.post("/", authMiddleware, transactionController.createTransaction);


module.exports = transcationRoutes;