export type EducationLevel =
  | "PRIMARY"
  | "LOWER_SECONDARY"
  | "UPPER_SECONDARY"
  | "HIGHER_EDUCATION"
  | "VOCATIONAL"
  | "OTHER";

export type CurriculumImportStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "APPLIED";

export type CurriculumImportLesson = {
  title: string;
  introduction: string;
  description: string;
  objectives: string[];
  durationMinutes: number;
};

export type CurriculumImportChapter = {
  title: string;
  introduction: string;
  description: string;
  lessons: CurriculumImportLesson[];
};

export type CurriculumImportPreview = {
  chapters: CurriculumImportChapter[];
  warnings: string[];
};

export type CurriculumImportJob = {
  id: string;
  status: CurriculumImportStatus;
  preview: CurriculumImportPreview | null;
  message: string | null;
};

export type CreateCurriculumImportPayload = {
  file: File;
  educationLevel: EducationLevel;
  subject: string;
  grade: string;
  curriculum: string;
  schoolYear: string;
};

export type ApplyCurriculumImportResponse = {
  chapterCount: number;
  lessonCount: number;
};

export type EducationPolicyReference = {
  code: string;
  title: string;
  url: string;
  kind: string;
};

export type EducationPolicyResponse = {
  references: EducationPolicyReference[];
  notes: string[];
  verifiedAt: string;
};
