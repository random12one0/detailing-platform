import { useState } from "react";
import { useBusiness } from "./context/BusinessContext.jsx";
import Login from "./screens/Login.jsx";
import Today from "./screens/Today.jsx";
import Calendar from "./screens/Calendar.jsx";
import Money from "./screens/Money.jsx";
import Clients from "./screens/Clients.jsx";
import More from "./screens/More.jsx";

const TABS = [
  { key: "today", label: "Today", ico: "☀️", el: Today },
  { key: "calendar", label: "Calendar", ico: "📅", el: Calendar },
  { key: "money", label: "Money", ico: "💵", el: Money },
  { key: "clients", label: "Clients", ico: "👤", el: Clients },
  { key: "more", label: "More", ico: "⚙️", el: More },
];

export default function App() {
  const { session, business, loading, signOut } = useBusiness();
  const [tab, setTab] = useState("today");

  if (loading) {
    return (
      <div className="center">
        <div className="spinner" />
      </div>
    );
  }
  if (!session) return <Login />;
  if (!business) {
    return (
      <div className="center">
        <p>This login isn't linked to a business yet.</p>
        <p className="muted">Ask the platform to finish your account setup.</p>
        <button className="btn inline" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  const Active = TABS.find((t) => t.key === tab)?.el ?? Today;

  return (
    <div className="app-shell">
      <header className="topbar">
        {/* The business's own name from the database — never a hardcoded brand. */}
        <div className="brand">{business.name}</div>
        <span className="muted">{TABS.find((t) => t.key === tab)?.label}</span>
      </header>
      <main className="app-main">
        <Active />
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            <span className="ico">{t.ico}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
