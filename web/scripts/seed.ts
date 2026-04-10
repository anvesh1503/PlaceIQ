/**
 * Seeds demo student accounts into Firebase Auth + Firestore.
 *
 * Prerequisites:
 * - Service account: set FIREBASE_SERVICE_ACCOUNT_JSON to the full JSON string, OR
 *   set GOOGLE_APPLICATION_CREDENTIALS to a service account file path.
 * - Firebase project must match NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local
 *
 * Run: npm run seed
 */
import { config } from "dotenv";
import { resolve } from "path";
import * as admin from "firebase-admin";

config({ path: resolve(process.cwd(), ".env.local") });

const serviceJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!admin.apps.length) {
  if (serviceJson) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceJson) as admin.ServiceAccount),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

const db = admin.firestore();
const authAdmin = admin.auth();

const eightDaysAgo = admin.firestore.Timestamp.fromDate(
  new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
);

const DEMO = [
  {
    email: "arjun@demo.com",
    password: "demo1234",
    doc: {
      name: "Arjun Sharma",
      email: "arjun@demo.com",
      role: "student" as const,
      branch: "CSE",
      cgpa: 6.8,
      skills: ["Python", "SQL"],
      linkedinUrl: "https://linkedin.com/in/demo-arjun",
      githubUrl: "https://github.com/demo-arjun",
      placementScore: 34,
      riskScore: 72,
      lastActive: eightDaysAgo,
      isAtRisk: true,
      taskList: [
        { title: "Revise OOP and collections in Python", category: "DSA", done: false },
        { title: "Record a 90-second self-introduction", category: "Communication", done: false },
        { title: "Add one quantified bullet to resume", category: "Resume", done: false },
      ],
      weeklyPlan: "Daily: 1 SQL problem + 1 communication drill until mock score ≥ 6.",
      resumeUrl: null as string | null,
    },
  },
  {
    email: "priya@demo.com",
    password: "demo1234",
    doc: {
      name: "Priya Mehta",
      email: "priya@demo.com",
      role: "student" as const,
      branch: "IT",
      cgpa: 8.6,
      skills: ["React", "Node.js", "DSA", "System Design"],
      linkedinUrl: "https://linkedin.com/in/demo-priya",
      githubUrl: "https://github.com/demo-priya",
      placementScore: 82,
      riskScore: 18,
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
      isAtRisk: false,
      taskList: [
        { title: "One system design case (URL shortener)", category: "System Design", done: false },
        { title: "Mock HR round with peer", category: "Communication", done: false },
      ],
      weeklyPlan: "Maintain streak: 2 LeetCode mediums + 1 design sketch per week.",
      resumeUrl: null as string | null,
    },
  },
];

async function upsertUser(
  email: string,
  password: string,
  userDoc: Record<string, unknown>
) {
  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await authAdmin.getUserByEmail(email);
    await authAdmin.updateUser(userRecord.uid, { password });
  } catch {
    userRecord = await authAdmin.createUser({
      email,
      password,
      emailVerified: true,
      displayName: String(userDoc.name || ""),
    });
  }

  await db
    .collection("users")
    .doc(userRecord.uid)
    .set(
      {
        ...userDoc,
        email,
      },
      { merge: true }
    );

  console.log("Seeded:", email, "→", userRecord.uid);
}

async function main() {
  if (!serviceJson && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      "Missing credentials: set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS"
    );
    process.exit(1);
  }

  for (const row of DEMO) {
    await upsertUser(row.email, row.password, row.doc as unknown as Record<string, unknown>);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
