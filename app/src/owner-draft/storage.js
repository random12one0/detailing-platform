// localStorage gives the previous frontend a readable copy. Its values can lag
// behind in a different tab even after that tab acquires a Web Lock. IndexedDB
// serializes the revision check and the new answer in one read/write transaction.
function record(key, mode, visit) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("dp.ownerSetup.drafts", 1);
    let blocked = false;
    open.onblocked = () => { blocked = true; reject(Error("lock unavailable")); };
    open.onerror = () => reject(open.error);
    open.onupgradeneeded = () => open.result.createObjectStore("drafts");
    open.onsuccess = () => {
      const db = open.result;
      if (blocked) { db.close(); return; }
      const tx = db.transaction("drafts", mode);
      db.close();
      const store = tx.objectStore("drafts");
      const get = store.get(key);
      let result, failure;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error || Error("storage unavailable"));
      get.onsuccess = () => {
        try { result = visit(get.result, store); }
        catch (e) { failure = e; tx.abort(); }
      };
    };
  });
}

function copies(key, row) {
  return {
    legacy: localStorage.getItem(key),
    current: row?.text ?? localStorage.getItem(key + ".saved"),
    revision: row?.revision ?? 0,
  };
}

export async function draftCopies(key) {
  try { return await record(key, "readonly", row => copies(key, row)); }
  catch {
    // Manual answers remain available to read and copy if this browser denies
    // transactional storage. Only a verified starting revision can be saved.
    try { return { ...copies(key), revision: null }; }
    catch { return { legacy: null, current: null, revision: null }; }
  }
}

export function sameCopies(a, b) {
  return a.revision === b.revision && a.legacy === b.legacy && a.current === b.current;
}

export async function savedAnswers(key) {
  const { current, legacy } = await draftCopies(key);
  try { return JSON.parse(current ?? legacy ?? "{}"); }
  catch { return {}; }
}

export async function saveAnswers(key, expected, next) {
  if (!navigator.locks?.request || expected.revision === null) throw Error("lock unavailable");
  return navigator.locks.request(key, async () => {
    // Only the original key is needed by production rollback. Keep preexisting
    // .saved copies readable for upgrades from the earlier local pilot.
    let mirrored = false;
    try {
      return await record(key, "readwrite", (row, store) => {
        if (!sameCopies(expected, copies(key, row))) throw Error("changed");
        const revision = expected.revision + 1;
        store.put({ revision, text: next }, key);
        localStorage.setItem(key, next);
        mirrored = true;
        return { legacy: next, current: next, revision };
      });
    } catch (e) {
      if (mirrored && localStorage.getItem(key) === next) {
        if (expected.legacy === null) localStorage.removeItem(key);
        else localStorage.setItem(key, expected.legacy);
      }
      throw e;
    }
  });
}
