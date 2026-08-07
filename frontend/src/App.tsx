import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PeriodProvider } from "./context/PeriodContext";
import { ToastProvider } from "./context/ToastContext";
import { PageTitleProvider } from "./context/PageTitleContext";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { Subjects } from "./pages/Subjects";
import { SubjectDetail } from "./pages/SubjectDetail";
import { Periods } from "./pages/Periods";
import { Professors } from "./pages/Professors";
import { Profile } from "./pages/Profile";
import { Terms } from "./pages/Terms";
import { Settings } from "./pages/Settings";
import "./App.css";

export default function App() {
  return (
    <ToastProvider>
      <PeriodProvider>
        <PageTitleProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Dashboard />} />
                <Route path="materias" element={<Subjects />} />
                <Route path="materias/:id" element={<SubjectDetail />} />
                <Route path="periodos" element={<Periods />} />
                <Route path="professores" element={<Professors />} />
                <Route path="perfil" element={<Profile />} />
                <Route path="termos" element={<Terms />} />
                <Route path="configuracoes" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </PageTitleProvider>
      </PeriodProvider>
    </ToastProvider>
  );
}
