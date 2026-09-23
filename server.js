require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { ObjectId } = require("mongodb");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { connectDB, getDB } = require("./config/db");
const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secure_secret_key_change_this";
// Separate secret for storefront customer accounts, so a customer token can never be used
// to authenticate against admin-only routes (and vice versa), even by accident.
const CUSTOMER_JWT_SECRET = process.env.CUSTOMER_JWT_SECRET || "your_super_secure_customer_secret_key_change_this";

// ================= IMAGE UPLOAD (CATEGORY / SUBCATEGORY / PRODUCT / BANNERS / TESTIMONIALS) =================
// Uses Cloudinary when CLOUDINARY_* env vars are set (persists across redeploys).
// Falls back to local disk storage for local development (files are lost on redeploy on most hosts).
const USE_CLOUDINARY = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

let uploadStorage;

if (USE_CLOUDINARY) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    uploadStorage = new CloudinaryStorage({
        cloudinary,
        params: { folder: "admin-panel-uploads" }
    });

    console.log("Image uploads: Cloudinary (persistent)");
} else {
    const UPLOAD_DIR = path.join(__dirname, "inc/assets/uploads");
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    uploadStorage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOAD_DIR),
        filename: (req, file, cb) => {
            const safeExt = path.extname(file.originalname).toLowerCase();
            cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + safeExt);
        }
    });

    console.log("Image uploads: local disk (set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET for persistent storage)");
}

const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
        cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
    }
});

// Returns the URL to store in the DB for an uploaded file, regardless of storage backend.
function uploadedImageUrl(req) {
    if (req.file) {
        return USE_CLOUDINARY ? req.file.path : "/assets/uploads/" + req.file.filename;
    }
    // Fall back to a plain image URL if one was provided instead of an uploaded file.
    if (req.body && req.body.imageUrl) {
        return req.body.imageUrl;
    }
    return null;
}

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/assets", express.static(path.join(__dirname, "inc/assets")));
app.use(express.static(path.join(__dirname, "inc/html"), { index: false, extensions: ["html"] }));
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

// ================= CUSTOMER JWT VERIFY MIDDLEWARE (storefront accounts) =================
function verifyCustomerToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ success: false, message: "Access denied. No token provided." });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "Invalid token format." });
        }

        req.customer = jwt.verify(token, CUSTOMER_JWT_SECRET);
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: "Invalid or expired token." });
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
app.get("/faq",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc", "html","faq.html"));
});
app.get("/coupons",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc", "html","coupons.html"));
});
app.get("/banners",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc", "html","banners.html"));
});
app.get("/testimonials",(req,res)=>{
    res.sendFile(path.join(__dirname, "inc", "html","testimonials.html"));
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

// ================= CUSTOMER ACCOUNTS (storefront login, separate from admin accounts) =================

// CUSTOMER REGISTER
app.post("/api/customer/register", async (req, res) => {
    const db = getDB();
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        const existing = await db.collection("customers").findOne({ email });
        if (existing) {
            return res.status(409).json({ success: false, message: "Email already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.collection("customers").insertOne({
            name, email, password: hashedPassword,
            mobile: "", gender: "",
            createdAt: new Date()
        });

        return res.status(201).json({ success: true, message: "Registration successful.", customerId: result.insertedId });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Registration failed.", error: error.message });
    }
});

// CUSTOMER LOGIN
app.post("/api/customer/login", async (req, res) => {
    const db = getDB();
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const customer = await db.collection("customers").findOne({ email });
        if (!customer) {
            return res.status(401).json({ success: false, message: "Invalid email." });
        }

        const isValid = await bcrypt.compare(password, customer.password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: "Invalid password." });
        }

        const token = jwt.sign(
            { customerId: customer._id, email: customer.email, name: customer.name },
            CUSTOMER_JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({ success: true, message: "Login successful.", token });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Login failed.", error: error.message });
    }
});

// GET OWN CUSTOMER PROFILE
app.get("/api/customer/profile", verifyCustomerToken, async (req, res) => {
    const db = getDB();
    try {
        const customer = await db.collection("customers").findOne(
            { _id: new ObjectId(req.customer.customerId) },
            { projection: { password: 0 } }
        );

        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found." });
        }

        return res.status(200).json({ success: true, data: customer });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch profile.", error: error.message });
    }
});

// UPDATE OWN CUSTOMER PROFILE
app.put("/api/customer/profile", verifyCustomerToken, async (req, res) => {
    const db = getDB();
    try {
        const { name, mobile, gender } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }

        await db.collection("customers").updateOne(
            { _id: new ObjectId(req.customer.customerId) },
            { $set: { name, mobile: mobile || "", gender: gender || "" } }
        );

        return res.status(200).json({ success: true, message: "Profile updated." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update profile.", error: error.message });
    }
});

// CHANGE OWN CUSTOMER PASSWORD
app.put("/api/customer/password", verifyCustomerToken, async (req, res) => {
    const db = getDB();
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current and new password are required." });
        }

        const customer = await db.collection("customers").findOne({ _id: new ObjectId(req.customer.customerId) });
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found." });
        }

        const isValid = await bcrypt.compare(currentPassword, customer.password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: "Current password is incorrect." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.collection("customers").updateOne(
            { _id: new ObjectId(req.customer.customerId) },
            { $set: { password: hashedPassword } }
        );

        return res.status(200).json({ success: true, message: "Password updated." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update password.", error: error.message });
    }
});

// GET OWN ORDERS (matched by the customer's email)
app.get("/api/customer/orders", verifyCustomerToken, async (req, res) => {
    const db = getDB();
    try {
        const orders = await db.collection("orders")
            .find({ customerEmail: req.customer.email })
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({ success: true, data: orders });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch orders.", error: error.message });
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

// UPDATE OWN PROFILE
app.put("/api/profile", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const { name, bio } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }

        await db.collection("auth_users").updateOne(
            { _id: new ObjectId(req.user.userId) },
            { $set: { name, bio: bio || "" } }
        );

        return res.status(200).json({ success: true, message: "Profile updated." });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update profile.", error: error.message });
    }
});

// ================= USERS (list) =================

app.get("/api/users", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const users = await db.collection("auth_users")
            .find({}, { projection: { password: 0 } })
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({ success: true, data: users });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch users.", error: error.message });
    }
});

app.put("/api/users/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: "Name and email are required." });
        }

        const emailTaken = await db.collection("auth_users").findOne({ email, _id: { $ne: new ObjectId(req.params.id) } });
        if (emailTaken) {
            return res.status(409).json({ success: false, message: "Email already in use by another account." });
        }

        await db.collection("auth_users").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { name, email } }
        );

        return res.status(200).json({ success: true, message: "User updated." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update user.", error: error.message });
    }
});

app.delete("/api/users/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        await db.collection("auth_users").deleteOne({ _id: new ObjectId(req.params.id) });
        return res.status(200).json({ success: true, message: "User deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete user.", error: error.message });
    }
});

// ================= CATEGORIES =================

app.post("/api/categories", verifyToken, upload.single("image"), async (req, res) => {
    const db = getDB();
    try {
        const { name, text, type, notes } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Category name is required." });
        }

        const image = uploadedImageUrl(req);

        const result = await db.collection("categories").insertOne({
            name, text: text || "", type: type || "", notes: notes || "", image,
            createdAt: new Date()
        });

        return res.status(201).json({ success: true, message: "Category created.", id: result.insertedId });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create category.", error: error.message });
    }
});

// Public: storefront needs to browse categories without logging in.
app.get("/api/categories", async (req, res) => {
    const db = getDB();
    try {
        const categories = await db.collection("categories").find({}).sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ success: true, data: categories });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch categories.", error: error.message });
    }
});

app.put("/api/categories/:id", verifyToken, upload.single("image"), async (req, res) => {
    const db = getDB();
    try {
        const { name, text, type, notes } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Category name is required." });
        }

        const update = { name, text: text || "", type: type || "", notes: notes || "" };
        if (req.file) {
            update.image = uploadedImageUrl(req);
        }

        await db.collection("categories").updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });

        return res.status(200).json({ success: true, message: "Category updated." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update category.", error: error.message });
    }
});

app.delete("/api/categories/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        await db.collection("categories").deleteOne({ _id: new ObjectId(req.params.id) });
        return res.status(200).json({ success: true, message: "Category deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete category.", error: error.message });
    }
});

// ================= SUBCATEGORIES =================

app.post("/api/subcategories", verifyToken, upload.single("image"), async (req, res) => {
    const db = getDB();
    try {
        const { categoryName, name, text, type, notes } = req.body;

        if (!categoryName || !name) {
            return res.status(400).json({ success: false, message: "Category and subcategory name are required." });
        }

        const image = uploadedImageUrl(req);

        const result = await db.collection("subcategories").insertOne({
            categoryName, name, text: text || "", type: type || "", notes: notes || "", image,
            createdAt: new Date()
        });

        return res.status(201).json({ success: true, message: "Subcategory created.", id: result.insertedId });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create subcategory.", error: error.message });
    }
});

// Public: storefront needs to browse subcategories without logging in.
app.get("/api/subcategories", async (req, res) => {
    const db = getDB();
    try {
        const subcategories = await db.collection("subcategories").find({}).sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ success: true, data: subcategories });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch subcategories.", error: error.message });
    }
});

app.put("/api/subcategories/:id", verifyToken, upload.single("image"), async (req, res) => {
    const db = getDB();
    try {
        const { categoryName, name, text, type, notes } = req.body;

        if (!categoryName || !name) {
            return res.status(400).json({ success: false, message: "Category and subcategory name are required." });
        }

        const update = { categoryName, name, text: text || "", type: type || "", notes: notes || "" };
        if (req.file) {
            update.image = uploadedImageUrl(req);
        }

        await db.collection("subcategories").updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });

        return res.status(200).json({ success: true, message: "Subcategory updated." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update subcategory.", error: error.message });
    }
});

app.delete("/api/subcategories/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        await db.collection("subcategories").deleteOne({ _id: new ObjectId(req.params.id) });
        return res.status(200).json({ success: true, message: "Subcategory deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete subcategory.", error: error.message });
    }
});

// ================= PRODUCTS =================

app.post("/api/products", verifyToken, upload.single("image"), async (req, res) => {
    const db = getDB();
    try {
        const { categoryName, subcategoryName, name, text, type, notes, price } = req.body;

        if (!categoryName || !subcategoryName || !name) {
            return res.status(400).json({ success: false, message: "Category, subcategory and product name are required." });
        }

        const image = uploadedImageUrl(req);

        const result = await db.collection("products").insertOne({
            categoryName, subcategoryName, name, text: text || "", type: type || "", notes: notes || "",
            price: Number(price) || 0, image,
            createdAt: new Date()
        });

        return res.status(201).json({ success: true, message: "Product created.", id: result.insertedId });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create product.", error: error.message });
    }
});

// Public: anyone (storefront) can browse products, no login required.
app.get("/api/products", async (req, res) => {
    const db = getDB();
    try {
        const products = await db.collection("products").find({}).sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ success: true, data: products });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch products.", error: error.message });
    }
});

app.put("/api/products/:id", verifyToken, upload.single("image"), async (req, res) => {
    const db = getDB();
    try {
        const { categoryName, subcategoryName, name, text, type, notes, price } = req.body;

        if (!categoryName || !subcategoryName || !name) {
            return res.status(400).json({ success: false, message: "Category, subcategory and product name are required." });
        }

        const update = { categoryName, subcategoryName, name, text: text || "", type: type || "", notes: notes || "", price: Number(price) || 0 };
        if (req.file) {
            update.image = uploadedImageUrl(req);
        }

        await db.collection("products").updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });

        return res.status(200).json({ success: true, message: "Product updated." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update product.", error: error.message });
    }
});

app.delete("/api/products/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        await db.collection("products").deleteOne({ _id: new ObjectId(req.params.id) });
        return res.status(200).json({ success: true, message: "Product deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete product.", error: error.message });
    }
});

// ================= ORDERS =================

// Public: customers place orders without an admin login (this is checkout).
app.post("/api/orders", async (req, res) => {
    const db = getDB();
    try {
        const { customerName, customerEmail, amount, status, items } = req.body;

        if (!customerName || amount === undefined) {
            return res.status(400).json({ success: false, message: "Customer name and amount are required." });
        }

        const result = await db.collection("orders").insertOne({
            customerName, customerEmail: customerEmail || "",
            amount: Number(amount) || 0,
            status: status || "pending",
            items: Array.isArray(items) ? items.map((item) => ({
                productId: item.productId || null,
                name: item.name || "",
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 1
            })) : [],
            createdAt: new Date()
        });

        return res.status(201).json({ success: true, message: "Order created.", id: result.insertedId });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create order.", error: error.message });
    }
});

app.get("/api/orders", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const orders = await db.collection("orders").find({}).sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ success: true, data: orders });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch orders.", error: error.message });
    }
});

app.put("/api/orders/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const { customerName, customerEmail, amount, status } = req.body;

        if (!customerName || amount === undefined) {
            return res.status(400).json({ success: false, message: "Customer name and amount are required." });
        }

        await db.collection("orders").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { customerName, customerEmail: customerEmail || "", amount: Number(amount) || 0, status: status || "pending" } }
        );

        return res.status(200).json({ success: true, message: "Order updated." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update order.", error: error.message });
    }
});

app.delete("/api/orders/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        await db.collection("orders").deleteOne({ _id: new ObjectId(req.params.id) });
        return res.status(200).json({ success: true, message: "Order deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete order.", error: error.message });
    }
});

// ================= FAQS =================

app.post("/api/faqs", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const { question, answer } = req.body;

        if (!question || !answer) {
            return res.status(400).json({ success: false, message: "Question and answer are required." });
        }

        const result = await db.collection("faqs").insertOne({ question, answer, createdAt: new Date() });
        return res.status(201).json({ success: true, message: "FAQ created.", id: result.insertedId });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create FAQ.", error: error.message });
    }
});

// Public: storefront FAQ page.
app.get("/api/faqs", async (req, res) => {
    const db = getDB();
    try {
        const faqs = await db.collection("faqs").find({}).sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ success: true, data: faqs });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch FAQs.", error: error.message });
    }
});

app.put("/api/faqs/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const { question, answer } = req.body;

        if (!question || !answer) {
            return res.status(400).json({ success: false, message: "Question and answer are required." });
        }

        await db.collection("faqs").updateOne({ _id: new ObjectId(req.params.id) }, { $set: { question, answer } });
        return res.status(200).json({ success: true, message: "FAQ updated." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update FAQ.", error: error.message });
    }
});

app.delete("/api/faqs/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        await db.collection("faqs").deleteOne({ _id: new ObjectId(req.params.id) });
        return res.status(200).json({ success: true, message: "FAQ deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete FAQ.", error: error.message });
    }
});

// ================= COUPONS =================

app.post("/api/coupons", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const { code, discountPercent, expiryDate, active } = req.body;

        if (!code || discountPercent === undefined) {
            return res.status(400).json({ success: false, message: "Coupon code and discount are required." });
        }

        const existing = await db.collection("coupons").findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(409).json({ success: false, message: "Coupon code already exists." });
        }

        const result = await db.collection("coupons").insertOne({
            code: code.toUpperCase(),
            discountPercent: Number(discountPercent) || 0,
            expiryDate: expiryDate || null,
            active: active !== false,
            createdAt: new Date()
        });

        return res.status(201).json({ success: true, message: "Coupon created.", id: result.insertedId });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create coupon.", error: error.message });
    }
});

app.get("/api/coupons", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const coupons = await db.collection("coupons").find({}).sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ success: true, data: coupons });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch coupons.", error: error.message });
    }
});

app.put("/api/coupons/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const { code, discountPercent, expiryDate, active } = req.body;

        if (!code || discountPercent === undefined) {
            return res.status(400).json({ success: false, message: "Coupon code and discount are required." });
        }

        await db.collection("coupons").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { code: code.toUpperCase(), discountPercent: Number(discountPercent) || 0, expiryDate: expiryDate || null, active: active !== false } }
        );

        return res.status(200).json({ success: true, message: "Coupon updated." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update coupon.", error: error.message });
    }
});

app.delete("/api/coupons/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        await db.collection("coupons").deleteOne({ _id: new ObjectId(req.params.id) });
        return res.status(200).json({ success: true, message: "Coupon deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete coupon.", error: error.message });
    }
});

// ================= BANNERS =================

app.post("/api/banners", verifyToken, upload.single("image"), async (req, res) => {
    const db = getDB();
    try {
        const { title, link } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: "Banner title is required." });
        }

        const image = uploadedImageUrl(req);

        const result = await db.collection("banners").insertOne({
            title, link: link || "", image, createdAt: new Date()
        });

        return res.status(201).json({ success: true, message: "Banner created.", id: result.insertedId });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create banner.", error: error.message });
    }
});

// Public: storefront homepage banners.
app.get("/api/banners", async (req, res) => {
    const db = getDB();
    try {
        const banners = await db.collection("banners").find({}).sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ success: true, data: banners });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch banners.", error: error.message });
    }
});

app.put("/api/banners/:id", verifyToken, upload.single("image"), async (req, res) => {
    const db = getDB();
    try {
        const { title, link } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: "Banner title is required." });
        }

        const update = { title, link: link || "" };
        if (req.file) {
            update.image = uploadedImageUrl(req);
        }

        await db.collection("banners").updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
        return res.status(200).json({ success: true, message: "Banner updated." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update banner.", error: error.message });
    }
});

app.delete("/api/banners/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        await db.collection("banners").deleteOne({ _id: new ObjectId(req.params.id) });
        return res.status(200).json({ success: true, message: "Banner deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete banner.", error: error.message });
    }
});

// ================= TESTIMONIALS =================

app.post("/api/testimonials", verifyToken, upload.single("image"), async (req, res) => {
    const db = getDB();
    try {
        const { customerName, rating, reviewText } = req.body;

        if (!customerName || !reviewText) {
            return res.status(400).json({ success: false, message: "Customer name and review text are required." });
        }

        const image = uploadedImageUrl(req);

        const result = await db.collection("testimonials").insertOne({
            customerName, rating: Number(rating) || 5, reviewText, image, createdAt: new Date()
        });

        return res.status(201).json({ success: true, message: "Testimonial created.", id: result.insertedId });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create testimonial.", error: error.message });
    }
});

app.get("/api/testimonials", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const testimonials = await db.collection("testimonials").find({}).sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ success: true, data: testimonials });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch testimonials.", error: error.message });
    }
});

app.put("/api/testimonials/:id", verifyToken, upload.single("image"), async (req, res) => {
    const db = getDB();
    try {
        const { customerName, rating, reviewText } = req.body;

        if (!customerName || !reviewText) {
            return res.status(400).json({ success: false, message: "Customer name and review text are required." });
        }

        const update = { customerName, rating: Number(rating) || 5, reviewText };
        if (req.file) {
            update.image = uploadedImageUrl(req);
        }

        await db.collection("testimonials").updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
        return res.status(200).json({ success: true, message: "Testimonial updated." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update testimonial.", error: error.message });
    }
});

app.delete("/api/testimonials/:id", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        await db.collection("testimonials").deleteOne({ _id: new ObjectId(req.params.id) });
        return res.status(200).json({ success: true, message: "Testimonial deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete testimonial.", error: error.message });
    }
});

// ================= DASHBOARD SUMMARY =================

app.get("/api/dashboard/summary", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const [customersCount, productsCount, categoriesCount, ordersCount, orders, recentUsers, recentProducts] = await Promise.all([
            db.collection("auth_users").countDocuments(),
            db.collection("products").countDocuments(),
            db.collection("categories").countDocuments(),
            db.collection("orders").countDocuments(),
            db.collection("orders").find({}).toArray(),
            db.collection("auth_users").find({}, { projection: { password: 0 } }).sort({ createdAt: -1 }).limit(5).toArray(),
            db.collection("products").find({}).sort({ createdAt: -1 }).limit(5).toArray()
        ]);

        const revenue = orders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

        // Build last 6 months revenue buckets
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ label: d.toLocaleString("en-US", { month: "short" }), year: d.getFullYear(), month: d.getMonth(), total: 0 });
        }

        orders.forEach((order) => {
            const created = new Date(order.createdAt);
            const bucket = months.find((m) => m.year === created.getFullYear() && m.month === created.getMonth());
            if (bucket) {
                bucket.total += Number(order.amount) || 0;
            }
        });

        const maxTotal = Math.max(1, ...months.map((m) => m.total));
        const salesByMonth = months.map((m) => ({
            label: m.label,
            total: m.total,
            percent: Math.round((m.total / maxTotal) * 100)
        }));

        const recentActivity = recentUsers
            .map((u) => ({ title: `New user registered: ${u.name}`, date: u.createdAt }))
            .concat(recentProducts.map((p) => ({ title: `New product added: ${p.name}`, date: p.createdAt })))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        return res.status(200).json({
            success: true,
            data: {
                customersCount,
                productsCount,
                categoriesCount,
                ordersCount,
                revenue,
                salesByMonth,
                recentUsers,
                recentActivity
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to load dashboard summary.", error: error.message });
    }
});

connectDB();
// ================= SERVER =================
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});