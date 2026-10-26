import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { AccessDeniedPage } from "../pages/AccessDeniedPage";
import { AdminPage } from "../pages/AdminPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { SubjectsPage } from "../pages/SubjectsPage";
import { StudentPage } from "../pages/StudentPage";
import { TeacherPage } from "../pages/TeacherPage";
import { ProtectedRoute, RoleRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/denied" element={<AccessDeniedPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell><Outlet /></AppShell>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route element={<RoleRoute roles={["student"]} />}>
            <Route path="/academic" element={<StudentPage />} />
          </Route>
          <Route element={<RoleRoute roles={["teacher"]} />}>
            <Route path="/teaching" element={<TeacherPage />} />
          </Route>
          <Route element={<RoleRoute roles={["admin"]} />}>
            <Route path="/administration" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
