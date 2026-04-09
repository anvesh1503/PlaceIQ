const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config();
const supabase = require("./supabaseClient");

const app = express();
const PORT = process.env.PORT || 5000;
const SALT_ROUNDS = 10;

app.use(cors());
app.use(express.json());

const isSupabaseNetworkError = (message = "") => {
  const normalized = message.toLowerCase();
  return normalized.includes("fetch failed") || normalized.includes("network");
};

const isSchemaMismatchError = (message = "") => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("column users.password_hash does not exist") ||
    normalized.includes("could not find the 'password_hash' column of 'users'")
  );
};

app.get("/", (req, res) => {
  res.send("API is running");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({
      message: "Validation failed",
      error: "Email and password are required",
    });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, password_hash")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      if (isSchemaMismatchError(error.message)) {
        return res.status(500).json({
          message: "Login failed",
          error: "Database schema mismatch: users.password_hash column is missing",
        });
      }

      if (isSupabaseNetworkError(error.message)) {
        return res.status(503).json({
          message: "Login failed",
          error: "Supabase connection error",
        });
      }

      return res.status(500).json({
        message: "Login failed",
        error: error.message,
      });
    }

    if (!data) {
      return res.status(401).json({
        message: "Login failed",
        error: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(normalizedPassword, data.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        message: "Login failed",
        error: "Invalid email or password",
      });
    }

    return res.json({
      message: "Login successful",
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
      },
    });
  } catch (err) {
    if (isSupabaseNetworkError(err?.message || "")) {
      return res.status(503).json({
        message: "Login failed",
        error: "Supabase connection error",
      });
    }

    return res.status(500).json({
      message: "Login failed",
      error: "Unexpected server error while checking credentials",
    });
  }
});

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body || {};
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    return res.status(400).json({
      message: "Validation failed",
      error: "Name, email, and password are required",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(normalizedPassword, SALT_ROUNDS);

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          name: normalizedName,
          email: normalizedEmail,
          password_hash: hashedPassword,
        },
      ])
      .select("id, name, email")
      .single();

    if (error) {
      const isDuplicateEmail =
        error.code === "23505" ||
        error.message?.toLowerCase().includes("unique");

      if (isDuplicateEmail) {
        return res.status(409).json({
          message: "Signup failed",
          error: "Email is already registered",
        });
      }

      if (isSupabaseNetworkError(error.message)) {
        return res.status(503).json({
          message: "Signup failed",
          error: "Supabase connection error",
        });
      }

      if (isSchemaMismatchError(error.message)) {
        return res.status(500).json({
          message: "Signup failed",
          error: "Database schema mismatch: users.password_hash column is missing",
        });
      }

      return res.status(500).json({
        message: "Signup failed",
        error: error.message,
      });
    }

    return res.status(201).json({
      message: "Signup successful",
      user: data,
    });
  } catch (err) {
    if (isSupabaseNetworkError(err?.message || "")) {
      return res.status(503).json({
        message: "Signup failed",
        error: "Supabase connection error",
      });
    }

    return res.status(500).json({
      message: "Signup failed",
      error: "Unexpected server error while creating user",
    });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      message: "Validation failed",
      error: "Malformed JSON in request body",
    });
  }

  return next(err);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});