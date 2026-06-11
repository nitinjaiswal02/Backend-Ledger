const mongoose = require("mongoose");
require("dotenv").config();



function connectDB() {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("server is connected to db"))
        .catch((err) => {
            console.error("MongoDB connection error:", err);
            process.exit(1); // terminate the application server if db connection fails as without db connection server is of no use and also consumes resources
        });
}
module.exports = connectDB;