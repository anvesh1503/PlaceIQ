import type { ApplicationDoc, InterviewDoc, UserDoc } from "@/lib/types";

export type PipelineStage =
  | "Unregistered"
  | "Preparing"
  | "Applied"
  | "Interview"
  | "Offer";

export function pipelineStageForStudent(
  uid: string,
  user: UserDoc,
  applications: ApplicationDoc[],
  interviews: InterviewDoc[]
): PipelineStage {
  const hasOffer = applications.some(
    (a) => a.studentId === uid && /offer|placed|accepted/i.test(a.status || "")
  );
  if (hasOffer) return "Offer";

  const hasInterview = interviews.some((i) => i.studentId === uid);
  if (hasInterview) return "Interview";

  const hasApp = applications.some((a) => a.studentId === uid);
  if (hasApp) return "Applied";

  const incomplete = !user.branch || user.cgpa == null || user.cgpa === undefined;
  if (incomplete) return "Unregistered";

  return "Preparing";
}
