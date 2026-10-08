// React translation of `layout/header/HeaderLogo.svelte`. When `logoUrl` is set
// it renders the project logo image; otherwise the default Parrot mark is shown.
import { ParrotLogoIcon } from "./icons";

export default function HeaderLogo({
  href = "/",
  logoUrl,
}: {
  href?: string;
  logoUrl?: string | undefined;
}) {
  return (
    <a
      href={href}
      className={`grid place-content-center rounded ${logoUrl ? "pl-2 pr-2" : "p-2"}`}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="logo" className="h-7" />
      ) : (
        <ParrotLogoIcon />
      )}
    </a>
  );
}
