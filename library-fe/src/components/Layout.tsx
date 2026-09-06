import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/books", label: "Books" },
  { to: "/members", label: "Members" },
  { to: "/borrowings", label: "Borrowings" },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-title">📚 Library Management</span>
          <nav className="app-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => "nav-link" + (isActive ? " nav-link-active" : "")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
