import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { TermsStandaloneContainer } from "./containers/TermsStandaloneContainer";

const mount = () => {
  createRoot(document.getElementById("app")!).render(
    <BrowserRouter>
      <TermsStandaloneContainer />
    </BrowserRouter>,
  );
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
