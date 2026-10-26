import { BookOpen, GraduationCap, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import type { Role } from "../api/types";
import { Button } from "./Button";

interface AppShellProps {
  children: ReactNode;
}

const roleLabels: Record<Role, string> = { admin: "Administrador", teacher: "Docente", student: "Estudiante" };

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = user?.role_names[0] ?? "student";
  const links = [
    { to: "/dashboard", label: "Resumen", icon: <LayoutDashboard size={18} /> },
    { to: "/subjects", label: "Materias", icon: <BookOpen size={18} /> },
    ...(role === "student" ? [{ to: "/academic", label: "Mi avance", icon: <GraduationCap size={18} /> }] : []),
    ...(role === "teacher" ? [{ to: "/teaching", label: "Mi docencia", icon: <GraduationCap size={18} /> }] : []),
    ...(role === "admin" ? [{ to: "/administration", label: "Administración", icon: <Users size={18} /> }] : []),
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand brand-sidebar"><span className="brand-glyph">UD</span><span>Universidad<br /><b>Digital</b></span></div>
        <div className="sidebar-section-label">Espacio de trabajo</div>
        <nav aria-label="Navegación principal">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
              {link.icon}<span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-security"><ShieldCheck size={17} /><span>Sesión protegida</span></div>
          <Button variant="ghost" className="logout-button" onClick={() => void logout()}><LogOut size={17} />Cerrar sesión</Button>
        </div>
      </aside>
      <button className="mobile-menu" type="button" aria-label={menuOpen ? "Cerrar navegación" : "Abrir navegación"} onClick={() => setMenuOpen((open) => !open)}>
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      {menuOpen ? <button className="sidebar-overlay" aria-label="Cerrar navegación" type="button" onClick={() => setMenuOpen(false)} /> : null}
      <main className="main-area">
        <header className="topbar">
          <div><span className="topbar-kicker">Campus digital / {roleLabels[role]}</span><h1>Tu espacio académico</h1></div>
          <div className="user-chip"><span className="avatar">{user?.full_name.slice(0, 1).toUpperCase()}</span><span><b>{user?.full_name}</b><small>{roleLabels[role]}</small></span></div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}