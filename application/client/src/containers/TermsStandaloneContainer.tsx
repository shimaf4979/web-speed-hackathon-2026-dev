import { useEffect, useState } from "react";

import { TERMS_AUTH_MODAL_ID } from "../components/term/constants";
import { TermsStandaloneShell } from "../components/term/TermsStandaloneShell";
import { AuthModalContainer } from "./AuthModalContainer";
import { useDocumentTitle } from "../hooks/use_document_title";
import { fetchJSON } from "../utils/fetch_json";
import { sendJSON } from "../utils/send_json_gzip";

export const TermsStandaloneContainer = () => {
  useDocumentTitle("利用規約 - CaX");

  const [activeUser, setActiveUser] = useState<Models.User | null>(null);

  useEffect(() => {
    void fetchJSON<Models.User>("/api/v1/me")
      .then((user) => {
        setActiveUser(user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await sendJSON("/api/v1/signout", {});
    setActiveUser(null);
    window.location.assign("/");
  };

  return (
    <>
      <TermsStandaloneShell activeUser={activeUser} authModalId={TERMS_AUTH_MODAL_ID} onLogout={handleLogout} />
      <AuthModalContainer id={TERMS_AUTH_MODAL_ID} onUpdateActiveUser={setActiveUser} />
    </>
  );
};
