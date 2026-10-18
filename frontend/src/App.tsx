import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import PhotoBackground from "./components/PhotoBackground";
import SiteHeader from "./components/site/SiteHeader";
import ModeSelector from "./pages/ModeSelector";
import { InputsProvider } from "./state/InputsProvider";

// Heavy routes are code-split so the landing page paints fast. AnalysisView
// pulls in Three.js / react-three-fiber (the 3D visualisation), which is by far
// the largest dependency — keeping it out of the initial bundle matters most.
const AnalysisView = lazy(() => import("./pages/AnalysisView"));
const DgmsGuidelines = lazy(() => import("./pages/DgmsGuidelines"));
const ModelValidation = lazy(() => import("./pages/ModelValidation"));
const About = lazy(() => import("./pages/About"));

/**
 * One background instance for the whole app: the graded hero photo on the
 * landing page, a blurred ambient backdrop everywhere else. Kept mounted
 * across navigation so the photo never reloads or flashes.
 */
function RoutedBackground() {
  const { pathname } = useLocation();
  return <PhotoBackground variant={pathname === "/" ? "hero" : "ambient"} />;
}

function RouteFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-tertiary">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-glass-border border-t-accent" aria-hidden />
        Loading…
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      {/* Inputs live above the router so they survive navigating back to the selector. */}
      <InputsProvider>
        <div className="relative flex h-full w-full flex-col overflow-hidden">
          <RoutedBackground />
          <SiteHeader />

          <main id="main" className="relative z-10 min-h-0 flex-1">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<ModeSelector />} />
                <Route path="/analysis/:mode" element={<AnalysisView />} />
                <Route path="/dgms" element={<DgmsGuidelines />} />
                <Route path="/validation" element={<ModelValidation />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<ModeSelector />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </InputsProvider>
    </BrowserRouter>
  );
}

export default App;
