import { TermPage } from "./TermPage";
import { TermsNavigation } from "./TermsNavigation";

interface ActiveUser {
  username: string;
}

interface Props {
  authModalId: string;
  activeUser?: ActiveUser | null;
  onLogout?: () => void;
}

export const TermsStandaloneShell = ({ activeUser = null, authModalId, onLogout }: Props) => {
  return (
    <div className="relative z-0 flex justify-center font-sans">
      <div className="bg-cax-surface text-cax-text flex min-h-screen max-w-full">
        <aside className="relative z-10">
          <TermsNavigation activeUser={activeUser} authModalId={authModalId} onLogout={onLogout} />
        </aside>
        <main className="relative z-0 w-screen max-w-screen-sm min-w-0 shrink pb-12 lg:pb-0 min-h-screen">
          <TermPage />
        </main>
      </div>
    </div>
  );
};
