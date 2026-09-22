const express = require("express");
const { ObjectId } = require("mongodb");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { connectDB, getDB } = require("./config/db");
const app = express();

// ================= CONFIG =================
const PORT = 3000;
const JWT_SECRET = "your_super_secure_secret_key_change_this";

// ================= IMAGE UPLOAD (CATEGORY / SUBCATEGORY / PRODUCT) =================
const UPLOAD_DIR = path.join(__dirname, "inc/assets/uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOAD_DIR),
        filename: (req, file, cb) => {
            const safeExt = path.extname(file.originalname).toLowerCase();
            cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + safeExt);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
        cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
    }
});

// ================= MIDDLEWARE =================
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

        const image = req.file ? "/assets/uploads/" + req.file.filename : null;

        const result = await db.collection("categories").insertOne({
            name, text: text || "", type: type || "", notes: notes || "", image,
            createdAt: new Date()
        });

        return res.status(201).json({ success: true, message: "Category created.", id: result.insertedId });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create category.", error: error.message });
    }
});

app.get("/api/categories", verifyToken, async (req, res) => {
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
            update.image = "/assets/uploads/" + req.file.filename;
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

        const image = req.file ? "/assets/uploads/" + req.file.filename : null;

        const result = await db.collection("subcategories").insertOne({
            categoryName, name, text: text || "", type: type || "", notes: notes || "", image,
            createdAt: new Date()
        });

        return res.status(201).json({ success: true, message: "Subcategory created.", id: result.insertedId });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create subcategory.", error: error.message });
    }
});

app.get("/api/subcategories", verifyToken, async (req, res) => {
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
            update.image = "/assets/uploads/" + req.file.filename;
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
        const { categoryName, subcategoryName, name, text, type, notes } = req.body;

        if (!categoryName || !subcategoryName || !name) {
            return res.status(400).json({ success: false, message: "Category, subcategory and product name are required." });
        }

        const image = req.file ? "/assets/uploads/" + req.file.filename : null;

        const result = await db.collection("products").insertOne({
            categoryName, subcategoryName, name, text: text || "", type: type || "", notes: notes || "", image,
            createdAt: new Date()
        });

        return res.status(201).json({ success: true, message: "Product created.", id: result.insertedId });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create product.", error: error.message });
    }
});

app.get("/api/products", verifyToken, async (req, res) => {
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
        const { categoryName, subcategoryName, name, text, type, notes } = req.body;

        if (!categoryName || !subcategoryName || !name) {
            return res.status(400).json({ success: false, message: "Category, subcategory and product name are required." });
        }

        const update = { categoryName, subcategoryName, name, text: text || "", type: type || "", notes: notes || "" };
        if (req.file) {
            update.image = "/assets/uploads/" + req.file.filename;
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

app.post("/api/orders", verifyToken, async (req, res) => {
    const db = getDB();
    try {
        const { customerName, customerEmail, amount, status } = req.body;

        if (!customerName || amount === undefined) {
            return res.status(400).json({ success: false, message: "Customer name and amount are required." });
        }

        const result = await db.collection("orders").insertOne({
            customerName, customerEmail: customerEmail || "",
            amount: Number(amount) || 0,
            status: status || "pending",
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