const mongoose = require('mongoose');

//connectDB().catch(err => console.log(err));

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB Connected");
    } catch (error) {
        console.error("❌ DB connection error:", error);
        process.exit(1);
    }
}

module.exports = connectDB;