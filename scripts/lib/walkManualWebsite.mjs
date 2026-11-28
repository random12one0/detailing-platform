import assert from "node:assert/strict";

// The calling fixture intercepts all backend traffic and opens an isolated browser profile.
export async function walk({page,ctx,base,form,btn}) {
  const shopName = "Fictional River Detail";
  const address = "https://river.example/";
  async function websiteSection() {
    const nav=form.locator(".sq-index details");
    if (!await nav.evaluate(el=>el.open)) await nav.locator("summary").click();
    await btn("Existing website",nav).click();
  }
  await form.getByLabel("Business name").fill(shopName);
  await websiteSection();
  await form.getByLabel("Website address").fill(address);
  await btn("Review setup",form).click();
  await btn("Save draft on this device",form).click();
  await form.getByText("Draft saved on this device.",{exact:true}).waitFor();
  const review=form.locator("details").filter({has:page.getByText("Shop answers your website can reuse",{exact:true})});
  await review.locator("summary").click();
  await review.getByText(shopName,{exact:true}).waitFor();
  await review.getByText(address,{exact:true}).waitFor();
  assert.equal(await form.locator(".draft-suggestions").count(),0);
  await btn("Website draft").click();
  const site=page.locator(".intake"), field=site.getByLabel("Your current website");
  await site.getByText("Website address from your saved shop setup.").waitFor();
  assert.equal(await field.inputValue(),address);

  const stale=await ctx.newPage();
  await stale.goto(base+"/app");
  await stale.locator(".shop-questions").getByLabel("Business name").waitFor();
  await btn("Website draft",stale).click();
  const staleSite=stale.locator(".intake");
  await staleSite.getByLabel("Your current website").fill("https://recover.example");
  await field.fill("https://website-only.example");
  await btn("Save website draft",site).click();
  await site.getByText("Draft saved on this device.",{exact:true}).waitFor();
  await btn("Save website draft",staleSite).click();
  await staleSite.getByText("Another tab saved a different website draft. Copy your edits before reopening it.").waitFor();
  assert.equal(await staleSite.getByLabel("Your current website").inputValue(),"https://recover.example");
  await stale.close();

  async function reopen() {
    await page.reload();
    await form.getByLabel("Business name").waitFor();
    await btn("Website draft").click();
    await field.waitFor();
  }
  await reopen();
  assert.equal(await field.inputValue(),"https://website-only.example");
  await field.fill("");
  await btn("Save website draft",site).click();
  await site.getByText("Draft saved on this device.",{exact:true}).waitFor();
  await reopen();
  assert.equal(await field.inputValue(),"");
  await btn("Shop setup").click();
  await websiteSection();
  assert.equal(await form.getByLabel("Website address").inputValue(),address);
}
