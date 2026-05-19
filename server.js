const express = require("express");
const { ObjectId } = require("mongodb");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { connectDB, getDB } = require("./config/db");
const app = express();

// ================= CONFIG =================
const PORT = 3000;
const JWT_SECRET = "your_super_secure_secret_key_change_this";

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/assets", express.static(path.join(__dirname, "inc/assets")));
app.use(express.static(path.join(__dirname, "inc/html")));
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
// user page route
app.get("/users",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc", "html", "users.html"));
});
// charts page route 
app.get("/charts",(req,res)=>{
    res.sendFile(path.join(__dirname,"inc", "html", "charts.html"));
});
// charts routes 
app.get("/add-user",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc", "html", "add-user.html"));
});
// tables route 
app.get("/tables",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc", "html", "tables.html"));
});
app.get("/forms",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc", "html","forms.html" ));
});
app.get("/settings",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc","html","settings.html"));
});
app.get("/blank",(req,res)=>{
    res.sendFile(path.join(__dirname,"inc", "html", "blank.html"));
})
app.get("/category",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc" ,"html","category.html"));
});
app.get("/subcategory",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc","html", "subcategory.html"));
});
app.get("/product",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc", "html","product.html"));
});
app.get("/orders",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc", "html","orders.html"));
});
// ================= AUTH ROUTES =================

// REGISTER USER
app.post("/register", async (req, res) => {
    const db= getDB();
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
    const db = getDB();
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
    const db = getDB();
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
connectDB();
// ================= SERVER =================
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});