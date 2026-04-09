const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config();
const supabase = require("./supabaseClient");
const { generateTasksFromSkills } = require("./geminiClient");

const app = express();
const PORT = process.env.PORT || 5000;
const SALT_ROUNDS = 10;
const INACTIVITY_DAYS = 5;
const INACTIVITY_JOB_INTERVAL_MS = Number(
  process.env.INACTIVITY_JOB_INTERVAL_MS || 60 * 60 * 1000
);
let isInactivityJobRunning = false;

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

const isValidUuid = (value = "") => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
};

const buildDefaultTasks = () => {
  return [
    { category: "DSA", title: "DSA Task" },
    { category: "Aptitude", title: "Aptitude Task" },
    { category: "Communication", title: "Communication Task" },
  ];
};

const normalizeSkillsInput = (skills) => {
  if (Array.isArray(skills)) {
    return skills
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim());
  }

  if (typeof skills === "string" && skills.trim()) {
    return skills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const createSignupTasksAsync = async (userId, context) => {
  try {
    const contextSkills = normalizeSkillsInput(context.skills);
    if (context.branch) {
      contextSkills.push(`Branch: ${context.branch}`);
    }
    if (context.cgpa !== undefined && context.cgpa !== null && String(context.cgpa).trim()) {
      contextSkills.push(`CGPA: ${String(context.cgpa).trim()}`);
    }

    let generatedTasks = [];
    try {
      generatedTasks = await generateTasksFromSkills(contextSkills);
    } catch (error) {
      generatedTasks = [];
    }

    const taskTemplates =
      Array.isArray(generatedTasks) && generatedTasks.length === 3
        ? generatedTasks
        : buildDefaultTasks();

    const tasksPayload = taskTemplates.slice(0, 3).map((task, index) => {
      const fallback = buildDefaultTasks()[index];
      return {
        student_id: userId,
        title: (task?.title || fallback.title).trim(),
        category: (task?.category || fallback.category).trim(),
      };
    });

    let { error: insertError } = await supabase.from("tasks").insert(tasksPayload);
    if (insertError) {
      // Final fallback attempt with guaranteed static categories/titles.
      const fallbackPayload = buildDefaultTasks().map((task) => ({
        student_id: userId,
        title: task.title,
        category: task.category,
      }));
      const retry = await supabase.from("tasks").insert(fallbackPayload);
      insertError = retry.error;
    }

    if (insertError) {
      console.error("[signup-tasks] Failed to insert tasks:", insertError.message);
    }
  } catch (error) {
    console.error("[signup-tasks] Unexpected error:", error.message);
  }
};

const generateMatchPercentage = () => {
  // Placeholder logic for now; can be replaced with real scoring later.
  return Math.floor(Math.random() * 101);
};

const generateCompanyMatchesForStudents = async (company) => {
  const { data: students, error: studentsError } = await supabase
    .from("users")
    .select("id, name, email");

  if (studentsError) {
    throw new Error(`Failed to fetch students: ${studentsError.message}`);
  }

  if (!students || !students.length) {
    return { totalMatches: 0, alertedStudents: 0 };
  }

  const matches = students.map((student) => ({
    company_id: company.id,
    student_id: student.id,
    match_percentage: generateMatchPercentage(),
  }));

  const { error: matchesError } = await supabase.from("company_matches").insert(matches);
  if (matchesError) {
    throw new Error(`Failed to insert company matches: ${matchesError.message}`);
  }

  const topMatches = matches.filter((match) => match.match_percentage > 70);
  if (topMatches.length) {
    const alerts = topMatches.map((match) => ({
      student_id: match.student_id,
      type: "high_company_match",
      message: `You have a ${match.match_percentage}% match with ${company.name}`,
    }));

    const { error: alertsError } = await supabase.from("alerts").insert(alerts);
    if (alertsError) {
      throw new Error(`Failed to insert company match alerts: ${alertsError.message}`);
    }
  }

  return { totalMatches: matches.length, alertedStudents: topMatches.length };
};

const runInactivityMonitor = async () => {
  if (isInactivityJobRunning) {
    return;
  }
  isInactivityJobRunning = true;

  try {
    const cutoffDate = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();

    const { data: profiles, error: profilesError } = await supabase
      .from("student_profiles")
      .select("id, user_id, last_active_at, is_at_risk")
      .or(`last_active_at.is.null,last_active_at.lt.${cutoffIso}`);

    if (profilesError) {
      console.error(
        "[inactivity-monitor] Failed to fetch student profiles:",
        profilesError.message
      );
      return;
    }

    const targetProfiles = (profiles || []).filter(
      (profile) => profile.user_id && !profile.is_at_risk
    );
    if (!targetProfiles.length) {
      return;
    }

    const targetProfileIds = targetProfiles.map((profile) => profile.id);
    const alertsPayload = targetProfiles.map((profile) => ({
      student_id: profile.user_id,
      type: "inactivity",
      message: `Student inactive for ${INACTIVITY_DAYS}+ days`,
    }));

    const { error: alertsError } = await supabase.from("alerts").insert(alertsPayload);
    if (alertsError) {
      console.error("[inactivity-monitor] Failed to create alerts:", alertsError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("student_profiles")
      .update({ is_at_risk: true })
      .in("id", targetProfileIds);

    if (updateError) {
      console.error(
        "[inactivity-monitor] Failed to mark student profiles at risk:",
        updateError.message
      );
      return;
    }

  } catch (error) {
    console.error("[inactivity-monitor] Unexpected error:", error.message);
  } finally {
    isInactivityJobRunning = false;
  }
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
  const { name, email, password, branch, skills, cgpa } = req.body || {};
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

    // Fire-and-forget to keep signup response fast.
    void createSignupTasksAsync(data.id, { branch, skills, cgpa });

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

app.post("/companies", async (req, res) => {
  const { name } = req.body || {};
  const normalizedName = typeof name === "string" ? name.trim() : "";

  if (!normalizedName) {
    return res.status(400).json({
      message: "Validation failed",
      error: "Company name is required",
    });
  }

  try {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert([{ name: normalizedName }])
      .select("id, name")
      .single();

    if (companyError) {
      if (isSupabaseNetworkError(companyError.message)) {
        return res.status(503).json({
          message: "Create company failed",
          error: "Supabase connection error",
        });
      }

      return res.status(500).json({
        message: "Create company failed",
        error: companyError.message,
      });
    }

    const result = await generateCompanyMatchesForStudents(company);

    return res.status(201).json({
      message: "Company created and matches generated successfully",
      company,
      match_summary: result,
    });
  } catch (err) {
    if (isSupabaseNetworkError(err?.message || "")) {
      return res.status(503).json({
        message: "Create company failed",
        error: "Supabase connection error",
      });
    }

    return res.status(500).json({
      message: "Create company failed",
      error: err.message || "Unexpected server error while creating company",
    });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.post("/debug/gemini-tasks", async (req, res) => {
    const { skills, branch, cgpa } = req.body || {};
    const parsedSkills = normalizeSkillsInput(skills);

    if (branch && typeof branch === "string" && branch.trim()) {
      parsedSkills.push(`Branch: ${branch.trim()}`);
    }
    if (cgpa !== undefined && cgpa !== null && String(cgpa).trim()) {
      parsedSkills.push(`CGPA: ${String(cgpa).trim()}`);
    }

    if (!parsedSkills.length) {
      return res.status(400).json({
        message: "Validation failed",
        error: "Provide skills (array/string) or branch/cgpa",
      });
    }

    try {
      const tasks = await generateTasksFromSkills(parsedSkills);
      return res.json({
        message: "Gemini task preview generated",
        tasks: (tasks || []).slice(0, 3),
      });
    } catch (error) {
      const fallback = buildDefaultTasks();
      return res.json({
        message: "Gemini unavailable, using fallback tasks",
        tasks: fallback,
      });
    }
  });
}

app.get("/students/:id/tasks", async (req, res) => {
  const studentId = (req.params.id || "").trim();

  if (!studentId) {
    return res.status(400).json({
      message: "Validation failed",
      error: "Student ID is required",
    });
  }

  if (!isValidUuid(studentId)) {
    return res.status(400).json({
      message: "Validation failed",
      error: "Student ID must be a valid UUID",
    });
  }

  try {
    let { data, error } = await supabase
      .from("tasks")
      .select("id, student_id, title, category, status")
      .eq("student_id", studentId)
      .order("created_at", { ascending: true });

    const missingStatusColumn =
      error && error.message?.toLowerCase().includes("column tasks.status does not exist");
    if (missingStatusColumn) {
      const fallback = await supabase
        .from("tasks")
        .select("id, student_id, title, category")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true });

      data = (fallback.data || []).map((task) => ({ ...task, status: null }));
      error = fallback.error;
    }

    if (error) {
      if (isSupabaseNetworkError(error.message)) {
        return res.status(503).json({
          message: "Fetch tasks failed",
          error: "Supabase connection error",
        });
      }

      return res.status(500).json({
        message: "Fetch tasks failed",
        error: error.message,
      });
    }

    return res.json({
      message: "Tasks fetched successfully",
      tasks: data || [],
    });
  } catch (err) {
    if (isSupabaseNetworkError(err?.message || "")) {
      return res.status(503).json({
        message: "Fetch tasks failed",
        error: "Supabase connection error",
      });
    }

    return res.status(500).json({
      message: "Fetch tasks failed",
      error: "Unexpected server error while fetching tasks",
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
  runInactivityMonitor();
  setInterval(runInactivityMonitor, INACTIVITY_JOB_INTERVAL_MS);
});