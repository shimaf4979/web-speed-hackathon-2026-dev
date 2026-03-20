import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { AppContainer } from "@web-speed-hackathon-2026/client/src/containers/AppContainer";

if (/^\/posts\/[^/?#]+/.test(window.location.pathname)) {
  void import("@web-speed-hackathon-2026/client/src/containers/PostContainer");
}

const mount = () => {
  createRoot(document.getElementById("app")!).render(
    <BrowserRouter>
      <AppContainer />
    </BrowserRouter>,
  );
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
