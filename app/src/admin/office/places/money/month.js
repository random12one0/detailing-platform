// One month's `platform_net` answer, read through the shared cache, and its name.
// `useThisMonth` is the current month; Bills passes the one its switch is on.
import { useMemo } from "react";
import { lastMonths } from "../../../../lib/officeToday.js";
import { keptOf } from "../../../../lib/officeMoney.js";
import { useNet } from "../../useNet.js";

export function useMonth(month) {
  const got = useNet([month]);
  const net = got[month];
  const name = new Date(`${month}T00:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return { month, name, net, k: net ? keptOf(net) : null };
}

export function useThisMonth() {
  const [month] = useMemo(() => lastMonths(1), []);
  return useMonth(month);
}

// The twelve months Today's chart draws, oldest first; Bills' switch stays inside them.
export const BILL_MONTHS = lastMonths(12);

export const BILL_COLOR = { hosting: "#5FB4E2", database: "#F29A8B", email: "#F2B84B", domain: "#9FB8C6", other: "#E6E4DC" };
