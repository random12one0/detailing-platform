// A tab running the previous release can still write the original key.
export function draftCopies(key) {
  return { legacy: localStorage.getItem(key), current: localStorage.getItem(key + ".saved") };
}

export function sameCopies(a, b) {
  return a?.legacy === b.legacy && a?.current === b.current;
}

export function savedAnswers(key) {
  const { current, legacy } = draftCopies(key);
  return current ?? legacy;
}

export async function saveAnswers(key, expected, next) {
  if (!navigator.locks?.request) throw Error("lock unavailable");
  await navigator.locks.request(key, () => {
    if (!sameCopies(expected, draftCopies(key))) throw Error("changed");

    // Commit the original-format copy for rollback before acknowledging a save.
    localStorage.setItem(key, next);
    try {
      localStorage.setItem(key + ".saved", next);
    } catch (error) {
      if (expected.legacy === null) localStorage.removeItem(key);
      else localStorage.setItem(key, expected.legacy);
      throw error;
    }
  });
}
