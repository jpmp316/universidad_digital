export type Role = "admin" | "teacher" | "student";

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role_names: Role[];
}

export interface UserCreateInput {
  email: string;
  full_name: string;
  password: string;
  role_names: Role[];
}

export interface UserUpdateInput {
  email?: string;
  full_name?: string;
  password?: string;
  is_active?: boolean;
  role_names?: Role[];
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  credits: number;
  is_active: boolean;
  teacher_ids: string[];
}

export interface SubjectInput {
  code: string;
  name: string;
  description?: string;
  credits: number;
  teacher_ids?: string[];
}

export interface SubjectUpdateInput {
  code?: string;
  name?: string;
  description?: string;
  credits?: number;
  is_active?: boolean;
  teacher_ids?: string[];
}

export interface AcademicPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface PeriodInput {
  name: string;
  start_date: string;
  end_date: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  student_name: string;
  subject_id: string;
  period_id: string;
  status: "active" | "cancelled" | "completed";
  enrolled_at: string;
}

export interface Grade {
  id: string;
  enrollment_id: string;
  assessment_name: string;
  value: number | string;
  is_active: boolean;
  graded_at: string;
}

export interface StudentReport {
  student_id: string;
  student_name: string;
  total_enrollments: number;
  active_enrollments: number;
  total_grades: number;
  average_grade: number | string | null;
}

export interface ApiError {
  detail?: string | Array<{ msg?: string }>;
}
