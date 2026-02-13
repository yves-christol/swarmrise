import "./index.css";
import "./i18n"; // Initialize i18n
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./components/App/index.tsx";
import { OrgaStoreProvider } from "./tools/orgaStore/index.tsx";
import { ChatStoreProvider } from "./tools/chatStore/index.tsx";
import { ChatPanel } from "./components/Chat/ChatPanel/index.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { RawDataPage } from "./pages/RawData/index.tsx";
import { PrinciplesPage } from "./pages/Principles/index.tsx";
import { GlossaryPage } from "./pages/Glossary/index.tsx";
import { TermsPage } from "./pages/Terms/index.tsx";
import { PrivacyPage } from "./pages/Privacy/index.tsx";
import { OrgaRoute } from "./routes/OrgaRoute.tsx";
import { OrgaIndexRoute } from "./routes/OrgaIndexRoute.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <OrgaStoreProvider>
            <ChatStoreProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<App />} />
                {/* Static pages */}
                <Route path="/rawdata" element={<RawDataPage />} />
                <Route path="/principles" element={<PrinciplesPage />} />
                <Route path="/glossary" element={<GlossaryPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                {/* Organization routes */}
                <Route path="/o/:orgaId" element={<OrgaRoute />}>
                  <Route index element={<OrgaIndexRoute />} />
                  <Route path="manage" element={<App />} />
                  <Route path="teams/:teamId" element={<App />} />
                  <Route path="teams/:teamId/manage" element={<App />} />
                  <Route path="teams/:teamId/roles/:roleId" element={<App />} />
                  <Route path="teams/:teamId/roles/:roleId/manage" element={<App />} />
                  <Route path="members/:memberId" element={<App />} />
                  <Route path="members/:memberId/manage" element={<App />} />
                </Route>
              </Routes>
              <ChatPanel />
            </BrowserRouter>
            </ChatStoreProvider>
          </OrgaStoreProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ThemeProvider>
  </StrictMode>,
);
