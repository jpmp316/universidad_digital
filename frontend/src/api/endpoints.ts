import { apiClient } from "./client";
import type {
  AcademicPeriod,
  Enrollment,
  Grade,
  PeriodInput,
  StudentReport,
  Subject,
  SubjectInput,
  SubjectUpdateInput,
  User,
  UserCreateInput,
  UserUpdateInput,
} from "./types";

export const authApi = {
  register: (input: { email: string; full_name: string; password: string }) => apiClient.post<User>("/auth/register", input),
  login: (input: { email: string; password: string }) => apiClient.post<User>("/auth/login", input),
  logout: () => apiClient.post<void>("/auth/logout"),
  me: () => apiClient.get<User>("/auth/me"),
};

export const usersApi = {
  list: (offset = 0, limit = 50, search?: string, roleName?: string, activeOnly = false) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    if (search?.trim()) params.set("search", search.trim());
    if (roleName) params.set("role_name", roleName);
    if (activeOnly) params.set("active_only", "true");
    return apiClient.get<User[]>(`/users/?${params.toString()}`);
  },
  create: (input: UserCreateInput) => apiClient.post<User>("/users/", input),
  update: (id: string, input: UserUpdateInput) => apiClient.put<User>(`/users/${id}`, input),
  deactivate: (id: string) => apiClient.delete<User>(`/users/${id}`),
};

export const subjectsApi = {
  list: (offset = 0, limit = 50) => apiClient.get<Subject[]>(`/subjects/?offset=${offset}&limit=${limit}`),
  create: (input: SubjectInput) => apiClient.post<Subject>("/subjects/", input),
  update: (id: string, input: SubjectUpdateInput) => apiClient.put<Subject>(`/subjects/${id}`, input),
  deactivate: (id: string) => apiClient.delete<Subject>(`/subjects/${id}`),
};

export const periodsApi = {
  list: (offset = 0, limit = 50) => apiClient.get<AcademicPeriod[]>(`/periods/?offset=${offset}&limit=${limit}`),
  create: (input: PeriodInput) => apiClient.post<AcademicPeriod>("/periods/", input),
  update: (id: string, input: Partial<PeriodInput> & { is_active?: boolean }) => apiClient.put<AcademicPeriod>(`/periods/${id}`, input),
  deactivate: (id: string) => apiClient.delete<AcademicPeriod>(`/periods/${id}`),
};

export const enrollmentsApi = {
  list: (
    offset = 0,
    limit = 50,
    filters: { student_search?: string; subject_id?: string; period_id?: string; exclude_cancelled?: boolean } = {},
  ) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    if (filters.student_search?.trim()) params.set("student_search", filters.student_search.trim());
    if (filters.subject_id) params.set("subject_id", filters.subject_id);
    if (filters.period_id) params.set("period_id", filters.period_id);
    if (filters.exclude_cancelled) params.set("exclude_cancelled", "true");
    return apiClient.get<Enrollment[]>(`/enrollments/?${params.toString()}`);
  },
  create: (input: { student_id: string; subject_id: string; period_id: string }) => apiClient.post<Enrollment>("/enrollments/", input),
  update: (id: string, status: Enrollment["status"]) => apiClient.put<Enrollment>(`/enrollments/${id}`, { status }),
  cancel: (id: string) => apiClient.delete<Enrollment>(`/enrollments/${id}`),
};

export const gradesApi = {
  list: (enrollmentId: string) => apiClient.get<Grade[]>(`/grades/enrollment/${enrollmentId}`),
  create: (input: { enrollment_id: string; assessment_name: string; value: number }) => apiClient.post<Grade>("/grades/", input),
  update: (id: string, value: number) => apiClient.put<Grade>(`/grades/${id}`, { value }),
  deactivate: (id: string) => apiClient.delete<Grade>(`/grades/${id}`),
};

export const reportsApi = {
  student: (studentId: string) => apiClient.get<StudentReport>(`/reports/students/${studentId}`),
};
