const { MongoClient } = require("mongodb");

const MONGO_URL = "mongodb://127.0.0.1:27017";

const client = new MongoClient(MONGO_URL);

let db;

// CONNECT DATABASE
async function connectDB() {

    try {

        await client.connect();

        db = client.db("cruddb");

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