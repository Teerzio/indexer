const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {

    if (mongoose.connections[0].readyState){
        return;
    }

    mongoose
    .connect(process.env.MONGODB_URI)
    .then((res) => {
        console.log("connected to mongodb.");
    })
    .catch((err) => {
        throw err;
    })
}

module.exports= { connectDB }