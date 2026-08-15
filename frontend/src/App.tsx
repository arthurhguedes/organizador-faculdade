import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { PeriodProvider } from "./context/PeriodContext";
import { ToastProvider } from "./context/ToastContext";
import { PageTitleProvider } from "./context/PageTitleContext";
import { ThemeProvider } from "./context/ThemeContext";
import { GradeBuilderProvider } from "./context/GradeBuilderContext";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth } from "./components/auth/RequireAuth";
import { AppShell } from "./components/layout/AppShell";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Calendar } from "./pages/Calendar";
import { Subjects } from "./pages/Subjects";
import { SubjectDetail } from "./pages/SubjectDetail";
import { CurriculumMatrix } from "./pages/CurriculumMatrix";
import { Periods } from "./pages/Periods";
import { Professors } from "./pages/Professors";
import { ProfessorDetail } from "./pages/ProfessorDetail";
import { Evaluations } from "./pages/Evaluations";
import { Studies } from "./pages/Studies";
import { FacultyProfessors } from "./pages/FacultyProfessors";
import { Plans } from "./pages/Plans";
import { Profile } from "./pages/Profile";
import { Terms } from "./pages/Terms";
import { Settings } from "./pages/Settings";
import "./App.css";

function AuthenticatedShell() {
  return (
    <PeriodProvider>
      <GradeBuilderProvider>
        <PageTitleProvider>
          <Outlet />
        </PageTitleProvider>
      </GradeBuilderProvider>
    </PeriodProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/registrar" element={<Register />} />
              <Route element={<RequireAuth />}>
                <Route element={<AuthenticatedShell />}>
                  <Route element={<AppShell />}>
                    <Route index element={<Dashboard />} />
                    <Route path="calendario" element={<Calendar />} />
                    <Route path="materias" element={<Subjects />} />
                    <Route path="materias/:id" element={<SubjectDetail />} />
                    <Route path="matriz-curricular" element={<CurriculumMatrix />} />
                    <Route path="avaliacoes" element={<Evaluations />} />
                    <Route path="estudos" element={<Studies />} />
                    <Route path="periodos" element={<Periods />} />
                    <Route path="professores" element={<Professors />} />
                    <Route path="professores/:id" element={<ProfessorDetail />} />
                    <Route path="faculdade" element={<FacultyProfessors />} />
                    <Route path="planos" element={<Plans />} />
                    <Route path="perfil" element={<Profile />} />
                    <Route path="termos" element={<Terms />} />
                    <Route path="configuracoes" element={<Settings />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
