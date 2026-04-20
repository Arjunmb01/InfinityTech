
import express from "express";
import path from "path";
import session from "express-session";
import dotenv from "dotenv";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import flash from "connect-flash";
import { fileURLToPath } from "url";

import { connectDb, closeDb } from "./config/db.js";
import userRouter from "./routes/userRouter.js";
import adminRouter from "./routes/adminRouter.js";
import passport from "./config/passport.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { handleMulterError } from "./config/multer.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

/* ---------------- FIX __dirname (Important in ESM) ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------------- Start Server AFTER DB Connection ---------------- */

const startServer = async () => {
  try {
    await connectDb();

    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

/* ---------------- Middleware Setup ---------------- */

app.use(morgan("dev"));
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "views"),
  path.join(__dirname, "views/admin"),
  path.join(__dirname, "views/user"),
]);

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || "default-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
  res.locals.user = req.session.user || req.user || null;
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

app.get("/api/auth/me", (req, res) => {
  res.json({
    loggedIn: !!req.session.user || !!req.user,
    user: req.session.user || req.user || null,
  });
});

app.use(handleMulterError);

app.use("/", userRouter);
app.use("/admin", adminRouter);

app.use((req, res) => {
  if (req.xhr || req.headers.accept?.includes("json")) {
    res.status(404).json({ success: false, message: "API route not found" });
  } else {
    res.status(404).render("404", { title: "Page Not Found" });
  }
});

app.use(errorHandler);

/* ---------------- Graceful Shutdown ---------------- */

process.on("SIGINT", async () => {
  console.log("🛑 Shutting down server...");
  await closeDb();
  process.exit(0);
});

export default app;