// THE MONEY PLACE: what came in, what the platform cost, what was kept, and what
// is coming. Each section is its own file in money/, so one can be removed, moved
// or added by changing the list below and nothing else (ROADMAP 9.12a step 7).
import Kept from "./money/Kept.jsx";
import Steps from "./money/Steps.jsx";
import ByPlan from "./money/ByPlan.jsx";
import ComingIn from "./money/ComingIn.jsx";
import Bills from "./money/Bills.jsx";

const SECTIONS = [Kept, Steps, ByPlan, ComingIn, Bills];

export default function Money({ ctx }) {
  return (
    <div className="bo-today bo-money">
      {SECTIONS.map((S, i) => <S key={i} ctx={ctx} i={i} />)}
    </div>
  );
}
