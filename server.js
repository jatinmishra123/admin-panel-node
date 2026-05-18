const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

// ================= CONFIG =================
const PORT = 3000;
const MONGO_URL = "mongodb://127.0.0.1:27017";
const DB_NAME = "cruddb";
const JWT_SECRET = "your_super_secure_secret_key_change_this";

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files from inc folder
// Example:
// inc/assets/css/style.css
// inc/html/profile.html
app.use("/assets", express.static(path.join(__dirname, "inc/assets")));
app.use(express.static(path.join(__dirname, "inc/html")));
// ================= MONGODB =================
const client = new MongoClient(MONGO_URL);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db(DB_NAME);
        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.log("MongoDB Connection Error:", error);
    }
}

connectDB();

// ================= JWT VERIFY MIDDLEWARE =================
function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        // Check token exists
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });
        }

        // Format: Bearer token_here
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Invalid token format."
            });
        }

        // Verify token
        const verified = jwt.verify(token, JWT_SECRET);

        // Save user data
        req.user = verified;

        next();

    } catch (error) {
        return res.status(403).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
}

// ================= PAGE ROUTES =================

// LOGIN PAGE
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "inc", "html", "login.html"));
});

// REGISTER PAGE
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "inc", "html", "register.html"));
});

// index PAGE
app.get("/index", (req, res) => {
    res.sendFile(path.join(__dirname, "inc", "html", "index.html"));
});

// PROFILE PAGE
app.get("/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "inc", "html", "profile.html"));
});

// HEADER INCLUDE FILE
app.get("/header", (req, res) => {
    res.sendFile(path.join(__dirname, "inc", "html", "header.html"));
});

// ================= AUTH ROUTES =================

// REGISTER USER
app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        // Existing user check
        const existingUser = await db.collection("auth_users").findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered."
            });
        }

        // Password hash
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user
        const result = await db.collection("auth_users").insertOne({
            name,
            email,
            password: hashedPassword,
            createdAt: new Date()
        });

        return res.status(201).json({
            success: true,
            message: "Registration successful.",
            userId: result.insertedId
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Registration failed.",
            error: error.message
        });
    }
});

// LOGIN USER
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        // Find user
        const user = await db.collection("auth_users").findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email."
            });
        }

        // Password compare
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password."
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                name: user.name
            },
            JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Login failed.",
            error: error.message
        });
    }
});

// ================= PROTECTED PROFILE API =================

// GET PROFILE
app.get("/api/profile", verifyToken, async (req, res) => {
    try {
        const user = await db.collection("auth_users").findOne(
            {
                _id: new ObjectId(req.user.userId)
            },
            {
                projection: {
                    password: 0
                }
            }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch profile.",
            error: error.message
        });
    }
});

// ================= SERVER =================
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});