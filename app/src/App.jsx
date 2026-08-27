import { useState } from "react";
import { CalendarDays, CircleDollarSign, Settings, Sun, Users } from "lucide-react";
import { useBusiness } from "./context/BusinessContext.jsx";
import Login from "./screens/Login.jsx";
import Today from "./screens/Today.jsx";
import Calendar from "./screens/Calendar.jsx";
import Money from "./screens/Money.jsx";
import Clients from "./screens/Clients.jsx";
import More from "./screens/More.jsx";

const TABS = [
  { key: "today", label: "Today", Icon: Sun, el: Today },
  { key: "calendar", label: "Calendar", Icon: CalendarDays, el: Calendar },
  { key: "money", label: "Money", Icon: CircleDollarSign, el: Money },
  { key: "clients", label: "Clients", Icon: Users, el: Clients },
  { key: "more", label: "More", Icon: Settings, el: More },
];

export default function App() {
  const { session, business, role, loading, signOut } = useBusiness();
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

  // Staff never see Money. This mirrors the database policies (which are
  // the real enforcement) so the UI doesn't offer what the session can't read.
  const visibleTabs = role === "owner" ? TABS : TABS.filter((t) => t.key !== "money");
  const activeTab = visibleTabs.find((t) => t.key === tab) ?? visibleTabs[0];
  const Active = activeTab.el;

  return (
    <div className="app-shell">
      <header className="topbar">
        {/* The business's own name from the database — never a hardcoded brand. */}
        <div className="brand">{business.name}</div>
        <span className="muted">{activeTab.label}</span>
      </header>
      <main className="app-main">
        <Active />
      </main>
      <nav className="tabbar">
        {visibleTabs.map((t) => (
          <button key={t.key} className={activeTab.key === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            <t.Icon size={21} strokeWidth={1.75} />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
