const { MongoClient } = require("mongodb");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "cruddb";

const client = new MongoClient(MONGO_URL);

let db;

// CONNECT DATABASE
async function connectDB() {

    try {

        await client.connect();

        db = client.db(DB_NAME);

        console.log("MongoDB Connected Successfully");

    } catch (error) {

        console.log("MongoDB Connection Error:", error);

    }
}

// GET DATABASE
function getDB() {
    return db;
}

module.exports = {
    connectDB,
    getDB
};