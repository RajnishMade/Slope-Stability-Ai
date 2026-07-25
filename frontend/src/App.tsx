import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import PhotoBackground from "./components/PhotoBackground";
import AnalysisView from "./pages/AnalysisView";
import ModeSelector from "./pages/ModeSelector";
import { InputsProvider } from "./state/InputsProvider";

/**
 * One background instance for the whole app, switching treatment by route:
 * full-colour and rotating on the selector, blurred-back and still on the
 * analysis view. Kept mounted across navigation so the photo never reloads or
 * flashes — only the grade and scrims change.
 */
function RoutedBackground() {
  const { pathname } = useLocation();
  return <PhotoBackground variant={pathname.startsWith("/analysis") ? "ambient" : "hero"} />;
}

function App() {
  return (
    <BrowserRouter>
      {/* Inputs live above the router so they survive navigating back to the selector. */}
      <InputsProvider>
        <div className="relative h-full w-full overflow-hidden">
          <RoutedBackground />

          <Routes>
            <Route path="/" element={<ModeSelector />} />
            <Route path="/analysis/:mode" element={<AnalysisView />} />
            <Route path="*" element={<ModeSelector />} />
          </Routes>
        </div>
      </InputsProvider>
    </BrowserRouter>
  );
}

export default App;
