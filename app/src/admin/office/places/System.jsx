// THE SYSTEM PLACE: quiet when everything works; only what is broken or never
// proven stands out, each with when it was last checked. Each section is its own
// file in system/, so one can be removed, moved or added by changing the list
// below and nothing else (ROADMAP 9.12a step 7). The checks are officeSystem.js.
import { useMemo } from "react";
import { checksOf } from "../../../lib/officeSystem.js";
import Pulse from "./system/Pulse.jsx";
import Loud from "./system/Loud.jsx";
import Every from "./system/Every.jsx";
import Gauges from "./system/Gauges.jsx";

const SECTIONS = [Pulse, Loud, Every, Gauges];

export default function System({ ctx }) {
  const now = useMemo(() => Date.now(), [ctx.state]);
  const checks = useMemo(() => checksOf(ctx.state, now), [ctx.state, now]);
  return (
    <div className="bo-today bo-system">
      {SECTIONS.map((S, i) => <S key={i} checks={checks} now={now} i={i} />)}
    </div>
  );
}
