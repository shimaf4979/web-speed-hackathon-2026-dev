import { FontAwesomeIcon } from "../foundation/FontAwesomeIcon";
import { CrokLogo } from "../foundation/CrokLogo";

interface ActiveUser {
  username: string;
}

interface Props {
  authModalId: string;
  activeUser?: ActiveUser | null;
  onLogout?: () => void;
}

const itemClassName =
  "flex w-12 h-12 flex-col items-center justify-center rounded-full hover:bg-cax-brand-soft sm:h-auto sm:w-24 sm:rounded-sm sm:px-2 lg:h-auto lg:w-auto lg:flex-row lg:justify-start lg:rounded-full lg:px-4 lg:py-2";

const labelClassName = "hidden sm:inline sm:text-sm lg:text-xl lg:font-bold";

export const TermsNavigation = ({ activeUser = null, authModalId, onLogout }: Props) => {
  return (
    <nav className="border-cax-border bg-cax-surface fixed right-0 bottom-0 left-0 z-10 h-12 border-t lg:relative lg:h-full lg:w-48 lg:border-t-0 lg:border-r">
      <div className="relative grid grid-flow-col items-center justify-evenly lg:fixed lg:flex lg:h-full lg:w-48 lg:flex-col lg:justify-between lg:p-2">
        <ul className="grid grid-flow-col items-center justify-evenly lg:grid-flow-row lg:auto-rows-min lg:justify-start lg:gap-2">
          <li>
            <a className={itemClassName} href="/">
              <span className="relative text-xl lg:pr-2 lg:text-3xl">
                <FontAwesomeIcon iconType="home" styleType="solid" />
              </span>
              <span className={labelClassName}>ホーム</span>
            </a>
          </li>
          <li>
            <a className={itemClassName} href="/search">
              <span className="relative text-xl lg:pr-2 lg:text-3xl">
                <FontAwesomeIcon iconType="search" styleType="solid" />
              </span>
              <span className={labelClassName}>検索</span>
            </a>
          </li>
          {activeUser !== null ? (
            <li>
              <a className={itemClassName} href="/dm">
                <span className="relative text-xl lg:pr-2 lg:text-3xl">
                  <FontAwesomeIcon iconType="envelope" styleType="solid" />
                </span>
                <span className={labelClassName}>DM</span>
              </a>
            </li>
          ) : null}
          {activeUser !== null ? (
            <li>
              <a className={itemClassName} href={`/users/${activeUser.username}`}>
                <span className="relative text-xl lg:pr-2 lg:text-3xl">
                  <FontAwesomeIcon iconType="user" styleType="solid" />
                </span>
                <span className={labelClassName}>マイページ</span>
              </a>
            </li>
          ) : null}
          {activeUser !== null ? (
            <li>
              <a className={itemClassName} href="/crok">
                <span className="relative text-xl lg:pr-2 lg:text-3xl">
                  <CrokLogo className="h-[30px] w-[30px]" />
                </span>
                <span className={labelClassName}>Crok</span>
              </a>
            </li>
          ) : null}
          {activeUser === null ? (
            <li>
              <button
                className={itemClassName}
                type="button"
                command="show-modal"
                commandfor={authModalId}
              >
                <span className="relative text-xl lg:pr-2 lg:text-3xl">
                  <FontAwesomeIcon iconType="sign-in-alt" styleType="solid" />
                </span>
                <span className={labelClassName}>サインイン</span>
              </button>
            </li>
          ) : null}
          <li>
            <a className={`${itemClassName} text-cax-brand`} href="/terms">
              <span className="relative text-xl lg:pr-2 lg:text-3xl">
                <FontAwesomeIcon iconType="balance-scale" styleType="solid" />
              </span>
              <span className={labelClassName}>利用規約</span>
            </a>
          </li>
          {activeUser !== null ? (
            <li>
              <button className={itemClassName} onClick={onLogout} type="button">
                <span className="relative text-xl lg:pr-2 lg:text-3xl">
                  <FontAwesomeIcon iconType="sign-in-alt" styleType="solid" />
                </span>
                <span className={labelClassName}>ログアウト</span>
              </button>
            </li>
          ) : null}
        </ul>
      </div>
    </nav>
  );
};
