-- Test data for Universidad Digital.
-- Prerequisite: run `python -m alembic upgrade head` first.
-- Execute from backend with:
-- psql -U postgres -d universidad_digital -f seed_test_data.sql
-- All test accounts use the password: StrongPassword123

-- Clear a failed transaction left open by a previous pgAdmin execution.
ROLLBACK;
BEGIN;

-- Compatibility repair for databases created before grades.is_active existed.
-- The backend requires this column for logical deletion and active-grade queries.
ALTER TABLE grades
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Fixed role vocabulary. Existing role IDs are preserved when names already exist.
INSERT INTO roles (id, name, description)
VALUES
    ('10000000-0000-4000-8000-000000000001', 'admin', 'Administración del sistema'),
    ('10000000-0000-4000-8000-000000000002', 'teacher', 'Gestión docente y calificaciones'),
    ('10000000-0000-4000-8000-000000000003', 'student', 'Acceso académico del estudiante')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;

-- Generated with Passlib bcrypt. Never use plaintext passwords in password_hash.
INSERT INTO users (id, email, full_name, password_hash, is_active)
VALUES
    ('20000000-0000-4000-8000-000000000001', 'admin@universidad.edu', 'Ada Administradora', '$2b$12$BUj72.PBcBT6HW36IgI2jer8FYQphXGTrH1CcWGYVfCALGMqmqO0y', true),
    ('20000000-0000-4000-8000-000000000002', 'docente1@universidad.edu', 'Bruno Docente', '$2b$12$BUj72.PBcBT6HW36IgI2jer8FYQphXGTrH1CcWGYVfCALGMqmqO0y', true),
    ('20000000-0000-4000-8000-000000000003', 'docente2@universidad.edu', 'Carla Docente', '$2b$12$BUj72.PBcBT6HW36IgI2jer8FYQphXGTrH1CcWGYVfCALGMqmqO0y', true),
    ('20000000-0000-4000-8000-000000000004', 'estudiante1@universidad.edu', 'Diego Estudiante', '$2b$12$BUj72.PBcBT6HW36IgI2jer8FYQphXGTrH1CcWGYVfCALGMqmqO0y', true),
    ('20000000-0000-4000-8000-000000000005', 'estudiante2@universidad.edu', 'Elena Estudiante', '$2b$12$BUj72.PBcBT6HW36IgI2jer8FYQphXGTrH1CcWGYVfCALGMqmqO0y', true)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    password_hash = EXCLUDED.password_hash,
    is_active = true;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM (VALUES
    ('admin@universidad.edu', 'admin'),
    ('docente1@universidad.edu', 'teacher'),
    ('docente2@universidad.edu', 'teacher'),
    ('estudiante1@universidad.edu', 'student'),
    ('estudiante2@universidad.edu', 'student')
) AS seed(email, role_name)
JOIN users u ON u.email = seed.email
JOIN roles r ON r.name = seed.role_name
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO subjects (id, code, name, description, credits, is_active)
VALUES
    ('30000000-0000-4000-8000-000000000001', 'MAT101', 'Matemáticas I', 'Fundamentos de cálculo y álgebra.', 4, true),
    ('30000000-0000-4000-8000-000000000002', 'CSE201', 'Arquitectura de Software', 'Diseño de sistemas mantenibles.', 4, true),
    ('30000000-0000-4000-8000-000000000003', 'PHY101', 'Física General', 'Principios de física aplicada.', 3, true),
    ('30000000-0000-4000-8000-000000000004', 'HIS110', 'Historia Contemporánea', 'Lectura crítica del mundo moderno.', 2, true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    credits = EXCLUDED.credits,
    is_active = true;

INSERT INTO academic_periods (id, name, start_date, end_date, is_active)
VALUES ('40000000-0000-4000-8000-000000000001', '2026-A', '2026-01-15', '2026-06-30', true)
ON CONFLICT (name) DO UPDATE
SET start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    is_active = true;

-- Teacher ownership used by the authorization rules.
INSERT INTO subject_teachers (subject_id, teacher_id)
SELECT s.id, u.id
FROM (VALUES
    ('MAT101', 'docente1@universidad.edu'),
    ('CSE201', 'docente1@universidad.edu'),
    ('PHY101', 'docente2@universidad.edu')
) AS seed(subject_code, teacher_email)
JOIN subjects s ON s.code = seed.subject_code
JOIN users u ON u.email = seed.teacher_email
ON CONFLICT (subject_id, teacher_id) DO NOTHING;

INSERT INTO enrollments (id, student_id, subject_id, period_id, status)
SELECT seed.enrollment_id, u.id, s.id, p.id, seed.status
FROM (VALUES
    ('50000000-0000-4000-8000-000000000001'::uuid, 'estudiante1@universidad.edu', 'MAT101', '2026-A', 'active'),
    ('50000000-0000-4000-8000-000000000002'::uuid, 'estudiante1@universidad.edu', 'CSE201', '2026-A', 'active'),
    ('50000000-0000-4000-8000-000000000003'::uuid, 'estudiante2@universidad.edu', 'PHY101', '2026-A', 'active')
) AS seed(enrollment_id, student_email, subject_code, period_name, status)
JOIN users u ON u.email = seed.student_email
JOIN subjects s ON s.code = seed.subject_code
JOIN academic_periods p ON p.name = seed.period_name
ON CONFLICT (student_id, subject_id, period_id) DO UPDATE
SET status = EXCLUDED.status;

INSERT INTO grades (id, enrollment_id, assessment_name, value, is_active)
SELECT seed.grade_id, e.id, seed.assessment_name, seed.value, true
FROM (VALUES
    ('60000000-0000-4000-8000-000000000001'::uuid, 'estudiante1@universidad.edu', 'MAT101', 'Parcial 1', 87.50::numeric),
    ('60000000-0000-4000-8000-000000000002'::uuid, 'estudiante1@universidad.edu', 'MAT101', 'Proyecto final', 94.00::numeric),
    ('60000000-0000-4000-8000-000000000003'::uuid, 'estudiante1@universidad.edu', 'CSE201', 'Entrega arquitectura', 91.25::numeric),
    ('60000000-0000-4000-8000-000000000004'::uuid, 'estudiante2@universidad.edu', 'PHY101', 'Laboratorio 1', 82.75::numeric)
) AS seed(grade_id, student_email, subject_code, assessment_name, value)
JOIN users u ON u.email = seed.student_email
JOIN subjects s ON s.code = seed.subject_code
JOIN academic_periods p ON p.name = '2026-A'
JOIN enrollments e ON e.student_id = u.id AND e.subject_id = s.id AND e.period_id = p.id
ON CONFLICT (enrollment_id, assessment_name) DO UPDATE
SET value = EXCLUDED.value,
    is_active = true;

COMMIT;

-- Test credentials:
-- admin@universidad.edu       / StrongPassword123
-- docente1@universidad.edu    / StrongPassword123
-- docente2@universidad.edu    / StrongPassword123
-- estudiante1@universidad.edu / StrongPassword123
-- estudiante2@universidad.edu / StrongPassword123