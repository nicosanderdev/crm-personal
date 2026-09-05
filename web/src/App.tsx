import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./auth.tsx";
import { Layout } from "./components/Layout.tsx";
import { DatesPage } from "./pages/DatesPage.tsx";
import { ImportPage } from "./pages/ImportPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { PeoplePage } from "./pages/PeoplePage.tsx";
import { PersonDetailPage } from "./pages/PersonDetailPage.tsx";
import { PersonFormPage } from "./pages/PersonFormPage.tsx";
import { QueuePage } from "./pages/QueuePage.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<QueuePage />} />
            <Route path="/dates" element={<DatesPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/people/new" element={<PersonFormPage />} />
            <Route path="/people/:id" element={<PersonDetailPage />} />
            <Route path="/people/:id/edit" element={<PersonFormPage />} />
            <Route path="/import" element={<ImportPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
