const { GoogleGenerativeAI } = require("@google/generative-ai");

const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim();
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

const fallbackTasks = () => {
  return [
    {
      category: "DSA",
      title: "Solve 3 medium array/string problems",
      description:
        "Practice problem-solving speed and pattern recognition with time-bound solutions.",
    },
    {
      category: "Aptitude",
      title: "Complete 20 quantitative aptitude questions",
      description:
        "Focus on percentages, ratios, and time-distance to improve placement-test readiness.",
    },
    {
      category: "Communication",
      title: "Record a 2-minute self-introduction",
      description:
        "Practice clarity, confidence, and concise storytelling for interview communication.",
    },
  ];
};

const normalizeTasks = (tasks) => {
  const defaultByCategory = {
    DSA: fallbackTasks()[0],
    Aptitude: fallbackTasks()[1],
    Communication: fallbackTasks()[2],
  };

  const normalized = [];
  for (const category of ["DSA", "Aptitude", "Communication"]) {
    const matched = (tasks || []).find((task) => task.category === category);
    if (matched && matched.title && matched.description) {
      normalized.push({
        category,
        title: String(matched.title).trim(),
        description: String(matched.description).trim(),
      });
    } else {
      normalized.push(defaultByCategory[category]);
    }
  }

  return normalized;
};

async function generateTasksFromSkills(skills) {
  const normalizedSkills = Array.isArray(skills)
    ? skills.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];

  if (!normalizedSkills.length) {
    throw new Error("Skills must be a non-empty array of strings");
  }

  const prompt = `
You are an assistant that creates personalized student tasks.
Given these skills: ${normalizedSkills.join(", ")}

Return EXACTLY a JSON array with 3 objects for these categories only:
1) DSA
2) Aptitude
3) Communication

Each object must have:
- category
- title
- description

Keep each task practical and concise.
Return JSON only, no markdown.
`;

  try {
    if (!model) {
      return fallbackTasks();
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("Gemini response is not an array");
    }

    return normalizeTasks(parsed);
  } catch (error) {
    // Graceful fallback ensures your feature still works if AI response format fails.
    return fallbackTasks();
  }
}

module.exports = {
  generateTasksFromSkills,
};
