import { Timestamp } from "firebase/firestore";

export type UserRole = "student" | "tpc";

export interface TaskItem {
  id?: string;
  title: string;
  category: string;
  done?: boolean;
}

export interface UserDoc {
  name: string;
  email: string;
  role: UserRole;
  branch?: string;
  cgpa?: number;
  skills?: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  placementScore?: number;
  riskScore?: number;
  lastActive?: Timestamp | Date | null;
  isAtRisk?: boolean;
  taskList?: TaskItem[];
  weeklyPlan?: string;
  resumeUrl?: string;
}

export interface CompanyDoc {
  id: string;
  name: string;
  jd?: string;
  ctc?: string;
  deadline?: Timestamp | Date | null;
  matchedStudents?: string[];
}

export interface ApplicationDoc {
  id: string;
  studentId: string;
  companyId: string;
  status: string;
  appliedAt?: Timestamp | Date | null;
}

export interface InterviewDoc {
  id: string;
  studentId: string;
  score: number;
  feedback?: string;
  timestamp?: Timestamp | Date | null;
}

export interface NotificationDoc {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt?: Timestamp | Date | null;
}
