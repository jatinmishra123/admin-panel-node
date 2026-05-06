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
app.use(express.static("inc"));

// ================= MONGODB =================
const client = new MongoClient(MONGO_URL);
let db;

async function connectDB() {
    try {
        await client.connect();
        console.log("MongoDB Connected Successfully");
        db = client.db(DB_NAME);
    } catch (error) {
        console.log("MongoDB Connection Error:", error);
    }
}
connectDB();

// ================= JWT VERIFY MIDDLEWARE =================
function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Invalid token format."
            });
        }

        const verified = jwt.verify(token, JWT_SECRET);

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
app.get("/products", (req, res) => res.sendFile(path.join(__dirname, "inc", "products.html")));
app.get("/category", (req, res) => res.sendFile(path.join(__dirname, "inc", "category.html")));
app.get("/orders", (req, res) => res.sendFile(path.join(__dirname, "inc", "orders.html")));
app.get("/customers", (req, res) => res.sendFile(path.join(__dirname, "inc", "customers.html")));
app.get("/inventory", (req, res) => res.sendFile(path.join(__dirname, "inc", "inventory.html")));
app.get("/coupons", (req, res) => res.sendFile(path.join(__dirname, "inc", "coupons.html")));
app.get("/reviews", (req, res) => res.sendFile(path.join(__dirname, "inc", "reviews.html")));
app.get("/reports", (req, res) => res.sendFile(path.join(__dirname, "inc", "reports.html")));
app.get("/settings", (req, res) => res.sendFile(path.join(__dirname, "inc", "settings.html")));
app.get("/profile", (req, res) => res.sendFile(path.join(__dirname, "inc", "profile.html")));
// Login Page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "inc", "login.html"));
});

// Register Page
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "inc", "register.html"));
});

// Dashboard Page
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "inc", "dashboard.html"));
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

        // Check existing user
        const existingUser = await db.collection("auth_users").findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered."
            });
        }

        // Hash password
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

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password."
            });
        }

        // Generate token
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

// ================= PROTECTED ROUTE =================

// Get Profile
app.get("/api/profile", verifyToken, async (req, res) => {
    try {
        const user = await db.collection("auth_users").findOne(
            { _id: new ObjectId(req.user.userId) },
            { projection: { password: 0 } }
        );

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