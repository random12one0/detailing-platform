// THE LIST OF PLACES, IN ONE SPOT. To add, remove or reorder a place, change this
// array and nothing else: the side rail, the phone dock, the number keys and
// Ctrl K all read it. A place is a component that takes `{ ctx }`, so it can be
// built, replaced or deleted without touching another one. (ROADMAP 9.12a.)
//
// `badge(ctx)` is the little red number beside the name; return 0 for none.
// Slice 1 has Detailers only. Today, Money and System each land as one line here
// plus one file in places/.
import { Users } from "lucide-react";
import Detailers from "./places/Detailers.jsx";
import { issueOf } from "../../lib/officeDetailers.js";

export const PLACES = [
  {
    key: "detailers",
    label: "Detailers",
    Icon: Users,
    Place: Detailers,
    badge: (ctx) => ctx.rows.filter((r) => issueOf(r)?.needsYou).length,
  },
];

export const placeOf = (key) => PLACES.find((p) => p.key === key) ?? PLACES[0];
