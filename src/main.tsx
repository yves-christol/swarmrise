import "./index.css";
import "./i18n"; // Initialize i18n
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router";
import { OrgaStoreProvider } from "./tools/orgaStore/index.tsx";
import { ChatStoreProvider } from "./tools/chatStore/index.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { OrgCustomisationProvider } from "./contexts/OrgCustomisationProvider.tsx";

// Lazy-loaded route components
const App = lazy(() => import("./components/App/index.tsx"));
const ChatPanel = lazy(() => import("./components/Chat/ChatPanel/index.tsx").then(m => ({ default: m.ChatPanel })));
const PrinciplesPage = lazy(() => import("./pages/Principles/index.tsx").then(m => ({ default: m.PrinciplesPage })));
const GlossaryPage = lazy(() => import("./pages/Glossary/index.tsx").then(m => ({ default: m.GlossaryPage })));
const TermsPage = lazy(() => import("./pages/Terms/index.tsx").then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import("./pages/Privacy/index.tsx").then(m => ({ default: m.PrivacyPage })));
const WelcomePage = lazy(() => import("./pages/Welcome/index.tsx").then(m => ({ default: m.WelcomePage })));
const BugReportPage = lazy(() => import("./pages/BugReport/index.tsx").then(m => ({ default: m.BugReportPage })));
const OrgaRoute = lazy(() => import("./routes/OrgaRoute.tsx").then(m => ({ default: m.OrgaRoute })));
const OrgaIndexRoute = lazy(() => import("./routes/OrgaIndexRoute.tsx").then(m => ({ default: m.OrgaIndexRoute })));

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <OrgaStoreProvider>
          <OrgCustomisationProvider>
            <ChatStoreProvider>
            <BrowserRouter>
              <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<App />} />
                {/* Static pages */}
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/principles" element={<PrinciplesPage />} />
                <Route path="/glossary" element={<GlossaryPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/report" element={<BugReportPage />} />
                {/* Organization routes */}
                <Route path="/o/:orgaId" element={<OrgaRoute />}>
                  <Route index element={<OrgaIndexRoute />} />
                  <Route path="manage" element={<App />} />
                  <Route path="teams/:teamId" element={<App />} />
                  <Route path="teams/:teamId/manage" element={<App />} />
                  <Route path="teams/:teamId/kanban" element={<App />} />
                  <Route path="teams/:teamId/roles/:roleId" element={<App />} />
                  <Route path="teams/:teamId/roles/:roleId/manage" element={<App />} />
                  <Route path="members/:memberId" element={<App />} />
                  <Route path="members/:memberId/manage" element={<App />} />
                  <Route path="members/:memberId/kanban" element={<App />} />
                </Route>
              </Routes>
              <ChatPanel />
              </Suspense>
            </BrowserRouter>
            </ChatStoreProvider>
          </OrgCustomisationProvider>
          </OrgaStoreProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ThemeProvider>
  </StrictMode>,
);
