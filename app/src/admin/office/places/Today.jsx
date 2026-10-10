// THE TODAY PLACE: how the month is going and who needs you. Each section is its
// own file in today/, so one can be removed, moved or added by changing the list
// below and nothing else (ROADMAP 9.12a plan step 7).
import MoneyNow from "./today/MoneyNow.jsx";
import NeedsYou from "./today/NeedsYou.jsx";
import TwelveMonths from "./today/TwelveMonths.jsx";
import SignupPath from "./today/SignupPath.jsx";

const SECTIONS = [MoneyNow, NeedsYou, TwelveMonths, SignupPath];

export default function Today({ ctx }) {
  return (
    <div className="bo-today">
      {SECTIONS.map((S, i) => <S key={i} ctx={ctx} i={i} />)}
    </div>
  );
}
