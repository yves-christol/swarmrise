import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./components/App/index.tsx";
import { OrgaStoreProvider } from "./tools/orgaStore/index.tsx";
import { RawDataPage } from "./pages/RawData/index.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <OrgaStoreProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/rawdata" element={<RawDataPage />} />
            </Routes>
          </BrowserRouter>
        </OrgaStoreProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>,
);
