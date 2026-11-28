import assert from "node:assert/strict";
import { join } from "node:path";

// Both built versions share the same browser origin, owner, and shop.
export async function walk({ ctx, page, base, owner, business, shots, previous, candidate }) {
  const key = "dp.ownerSetup.v1." + owner + "." + business;
  const form = tab => tab.locator(".shop-questions");
  const field = tab => form(tab).getByLabel("Business name");
  const save = tab => form(tab).getByRole("button", { name: "Save draft on this device", exact: true });
  const done = tab => form(tab).getByText("Draft saved on this device.", { exact: true });
  const conflict = tab => form(tab).getByRole("alert").filter({ hasText: "Copy any answers" });
  const copies = () => page.evaluate(k => new Promise((resolve, reject) => {
    const open = indexedDB.open("dp.ownerSetup.drafts", 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, read = db.transaction("drafts").objectStore("drafts").get(k);
      read.onsuccess = () => resolve([JSON.parse(localStorage.getItem(k)), JSON.parse(read.result?.text ?? null)]);
      read.onerror = () => reject(read.error);
      db.close();
    };
  }), key);
  const editAndSave = async (tab, text) => {
    await field(tab).fill(text);
    await save(tab).click();
    await done(tab).waitFor();
  };
  const open = async init => {
    const tab = await ctx.newPage();
    if (init) await tab.addInitScript(init);
    await tab.goto(base + "/app");
    await field(tab).waitFor();
    return tab;
  };

  await editAndSave(page, "Original fictional shop");
  const oldTab = await open();
  await field(oldTab).fill("Old version still running");
  candidate();
  await page.reload();
  assert.equal(await field(page).inputValue(), "Original fictional shop");
  assert.deepEqual(await copies(), [{name:"Original fictional shop"}, null]);
  await editAndSave(page, "New fictional shop");
  await save(oldTab).click();
  await done(oldTab).waitFor();
  await oldTab.close();
  await page.reload();
  await page.getByRole("heading", {name:"Choose a draft to continue"}).waitFor();
  await page.getByText("Previous app’s answers", {exact:true}).click();
  await page.locator("pre").filter({hasText:"Old version still running"}).waitFor();
  await page.screenshot({path:join(shots,"manual-versions-390.png")});
  await page.getByRole("button", {name:"Use this app’s answers"}).click();
  assert.equal(await field(page).inputValue(), "New fictional shop");
  assert.deepEqual(await copies(), [{name:"Old version still running"}, {name:"New fictional shop"}]);
  await save(page).click();
  await done(page).waitFor();

  const stale = await open();
  await field(stale).fill("Unsaved text for copying");
  await editAndSave(page, "Fictional winner");
  await conflict(stale).waitFor();
  assert.ok(await save(stale).isDisabled());
  const popup = ctx.waitForEvent("page");
  await stale.getByRole("link", {name:"Open saved draft in a new tab"}).click();
  const reopened = await popup;
  assert.equal(await field(reopened).inputValue(), "Fictional winner");
  assert.equal(await field(stale).inputValue(), "Unsaved text for copying");
  for (const [width,height] of [[390,844],[768,1024],[1440,900]]) {
    await stale.setViewportSize({width,height});
    await conflict(stale).scrollIntoViewIfNeeded();
    assert.equal(await stale.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await stale.screenshot({path:join(shots,"manual-conflict-"+width+".png")});
  }
  await stale.close();
  await reopened.close();

  // The live manual UI resets an answer by clearing it and saving. Admit both
  // ordinary Save actions from the same baseline, with notifications suppressed.
  const suppressEvents = () => window.addEventListener("storage", e => e.stopImmediatePropagation(), true);
  for (const resetWins of [false, true]) {
    const editor = await open(suppressEvents), resetter = await open(suppressEvents);
    assert.equal(await field(editor).inputValue(), await field(resetter).inputValue());
    await field(editor).fill("Concurrent fictional edit");
    await field(resetter).fill("");
    const first = resetWins ? resetter : editor;
    const second = resetWins ? editor : resetter;
    // Reproduce the older localStorage snapshot observed between Chrome tabs,
    // even after the losing writer acquires its Web Lock. Keep its real IDB.
    await second.evaluate(k => {
      const get = Storage.prototype.getItem;
      const previous = new Map([k,k+".saved"].map(id => [id,localStorage.getItem(id)]));
      Storage.prototype.getItem = function(id) {
        return this === localStorage && previous.has(id) ? previous.get(id) : get.call(this,id);
      };
    }, key);
    await page.evaluate(k => new Promise(ready => {
      navigator.locks.request(k, () => new Promise(release => { window.releaseFixtureLock=release; ready(); }));
    }), key);
    try {
      for (const [i,tab] of [first,second].entries()) {
        await save(tab).click();
        await page.waitForFunction(async ([k,n]) => (await navigator.locks.query()).pending.filter(r => r.name===k).length===n, [key,i+1]);
      }
    } finally { await page.evaluate(() => window.releaseFixtureLock()); }
    await done(first).waitFor();
    await conflict(second).waitFor();
    assert.ok(await save(second).isDisabled());
    assert.equal(await field(second).inputValue(), resetWins ? "Concurrent fictional edit" : "");
    const third = await open();
    const expected = resetWins ? {} : {name:"Concurrent fictional edit"};
    assert.deepEqual(await copies(), [expected,expected]);
    assert.equal(await field(third).inputValue(), expected.name || "");
    await Promise.all([editor.close(),resetter.close(),third.close()]);
  }

  await page.reload();
  await editAndSave(page, "Keep through rollback");
  const noLocks = await open(() => Object.defineProperty(navigator, "locks", {value:undefined}));
  for (const input of ["Unsupported edit",""]) {
    await field(noLocks).fill(input);
    await save(noLocks).click();
    await form(noLocks).getByText("This browser cannot safely save the draft. Copy your answers before closing this tab.").waitFor();
    assert.equal(await field(noLocks).inputValue(), input);
    assert.equal((await copies())[0].name, "Keep through rollback");
  }
  await noLocks.close();
  const noDb = await open(() => Object.defineProperty(window, "indexedDB", {value:undefined}));
  assert.equal(await field(noDb).inputValue(), "Keep through rollback");
  await field(noDb).fill("Recover these unsaved words");
  await save(noDb).click();
  await form(noDb).getByText("This browser cannot safely save the draft. Copy your answers before closing this tab.").waitFor();
  assert.equal(await field(noDb).inputValue(), "Recover these unsaved words");
  await noDb.close();
  const full = await open();
  await full.evaluate(k => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function(id,value) {
      if (id === k) throw new DOMException("Fixture quota","QuotaExceededError");
      return set.call(this,id,value);
    };
  }, key);
  await field(full).fill("Uncommitted text");
  await save(full).click();
  await form(full).getByText("Could not save this draft. Check your access and browser storage.").waitFor();
  assert.equal(await field(full).inputValue(), "Uncommitted text");
  assert.deepEqual(await copies(), [{name:"Keep through rollback"},{name:"Keep through rollback"}]);
  await full.close();
  previous();
  await page.reload();
  assert.equal(await field(page).inputValue(), "Keep through rollback");
  await editAndSave(page,"Edited during rollback");
  candidate();
  await page.reload();
  await page.getByRole("heading", {name:"Choose a draft to continue"}).waitFor();
  await page.getByRole("button", {name:"Use previous app’s answers"}).click();
  assert.equal(await field(page).inputValue(), "Edited during rollback");
  assert.deepEqual(await copies(), [{name:"Edited during rollback"},{name:"Keep through rollback"}]);
  await save(page).click();
  await done(page).waitFor();
  await page.reload();
  assert.equal(await field(page).inputValue(), "Edited during rollback");
  assert.deepEqual(await copies(), [{name:"Edited during rollback"},{name:"Edited during rollback"}]);
  const nav = form(page).locator(".sq-index details");
  if (!await nav.evaluate(el => el.open)) await nav.locator("summary").click();
  await nav.getByRole("button", {name:"Existing website",exact:true}).click();
  await form(page).getByLabel("Website address").fill("https://fictional.example");
  await save(page).click();
  await done(page).waitFor();
  await page.getByRole("button",{name:"Website draft",exact:true}).click();
  const website = page.getByRole("textbox",{name:"Your current website"});
  assert.equal(await website.inputValue(), "https://fictional.example/");
  await website.fill("https://edited.example");
  await page.getByRole("button",{name:"Save website draft",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Draft saved on this device."}).first().waitFor();
  await page.getByRole("button",{name:"Shop setup",exact:true}).click();
  await page.getByRole("button",{name:"Website draft",exact:true}).click();
  assert.equal(await website.inputValue(),"https://edited.example");
  console.log("PASS: old draft upgraded, old writer isolated, conflict text copied across tabs, save/reset race in both orders, unsafe edit/reset blocked, previous and current builds reopen the successful save.");
}
