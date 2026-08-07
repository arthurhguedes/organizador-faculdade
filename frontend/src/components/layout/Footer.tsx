import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="app-footer">
      <span className="app-footer__status">
        <span className="app-footer__dot" />
        Em desenvolvimento — novidades em breve
      </span>
      <nav className="app-footer__links">
        <Link to="/termos">Termos de uso</Link>
        <Link to="/perfil">Perfil</Link>
      </nav>
    </footer>
  );
}
