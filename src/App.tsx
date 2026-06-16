/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import PresenterDashboard from "./pages/PresenterDashboard";
import PresenterLive from "./pages/PresenterLive";
import AudienceView from "./pages/AudienceView";
import PresentationScreen from "./pages/PresentationScreen";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/present" element={<PresenterDashboard />} />
        <Route path="/present/:code" element={<PresenterLive />} />
        <Route path="/join" element={<AudienceView />} />
        <Route path="/join/:code" element={<AudienceView />} />
        <Route path="/screen/:code" element={<PresentationScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
