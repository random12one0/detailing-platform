// Money in and out, one `platform_net` answer per month, read once per page load
// and shared by every place that draws money (Today now, Money next). A failed
// read is stored as { error } so it draws as "could not read", never as a month
// with nothing in it.
import { useEffect, useState } from "react";
import { call } from "./api.js";

const cache = new Map();           // month -> Promise of the answer
const read = (month) => {
  if (!cache.has(month)) {
    cache.set(month, call({ action: "platform_net", period: month }).catch((e) => ({ error: e.message })));
  }
  return cache.get(month);
};

// Forget one month and have every place showing it read it again (after a bill is
// typed in on Money, Today's chart must not keep the old answer).
const listeners = new Set();
export const reread = (month) => { cache.delete(month); listeners.forEach((f) => f()); };

// `months` is a list of `YYYY-MM-01`. Returns { month: answer } as answers arrive.
export function useNet(months) {
  const [got, setGot] = useState({});
  const [v, setV] = useState(0);
  useEffect(() => { const f = () => setV((x) => x + 1); listeners.add(f); return () => listeners.delete(f); }, []);
  const key = months.join(",");
  useEffect(() => {
    let live = true;
    months.forEach((m) => read(m).then((a) => { if (live) setGot((g) => ({ ...g, [m]: a })); }));
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, v]);
  return got;
}
