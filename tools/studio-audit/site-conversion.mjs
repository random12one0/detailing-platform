export async function conversion(page) {
  const failures = await page.evaluate(() => {
    const out = [], fail = (selector,detail) => out.push({selector,detail});
    const visible = e => { const r=e.getBoundingClientRect(),s=getComputedStyle(e); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&Number(s.opacity)>0; };
    const links = [...document.querySelectorAll('a,button')].filter(visible);
    const books = links.filter(e => e.matches('[data-book]') || /\bbook\b/i.test(e.textContent));
    if (innerWidth <= 390 && !books.some(e => {
      const r=e.getBoundingClientRect(); return r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('a,button')===e;
    })) fail('[data-book]','Book must be visible above the phone fold');
    for (const protocol of ['tel:','sms:']) if (!links.some(e => e.getAttribute('href')?.startsWith(protocol))) fail(`a[href^="${protocol}"]`,'Missing visible contact link');
    if (!/[$£€]\s*\d|\d\s*(USD|GBP|EUR)/.test(document.body.innerText)) fail('[data-price]','Missing visible prices');
    for (const [selector,attribute] of [['title',null],['meta[name="description"]','content'],['link[rel="canonical"]','href'],
      ['meta[property="og:title"]','content'],['meta[property="og:description"]','content'],['meta[property="og:image"]','content']]) {
      const el=document.querySelector(selector),value=attribute?el?.getAttribute(attribute):el?.textContent;
      if (!value?.trim() || (selector.includes('canonical') && !/^https?:\/\//.test(value))) fail(selector,'Missing or invalid metadata');
    }
    let businesses=[];
    for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
      try { const v=JSON.parse(el.textContent); businesses.push(...(Array.isArray(v)?v:v['@graph']||[v])); }
      catch { fail('script[type="application/ld+json"]','Malformed structured data'); }
    }
    if (!businesses.some(b => [b['@type']].flat().includes('LocalBusiness') && b.name && b.areaServed)) fail('script[type="application/ld+json"]','LocalBusiness with areaServed required');
    for (const img of document.images) if (!img.hasAttribute('alt') ||
      !(Number(img.getAttribute('width'))>0&&Number(img.getAttribute('height'))>0)) fail('img','Images require alt and explicit dimensions');
    return out;
  });
  const book = page.locator('[data-book],a,button').filter({hasText:/\bbook\b/i}).first();
  let taps=0, reached=false;
  // Step one counts only if the tap brought it on screen: it was off screen (or absent) before and is in the
  // viewport now, or it was already on screen and the tap moved the page/hash/focus to it. A rendered form
  // further down with a dead Book link does not count.
  const where = () => page.evaluate(() => {
    const onScreen = [...document.querySelectorAll('[data-booking-step="1"]')].filter(e => { const r=e.getBoundingClientRect(),s=getComputedStyle(e);
      return r.width>0&&r.height>0&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.top<innerHeight&&r.bottom>0; });
    const target = location.hash.length>1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    return {path:location.pathname+location.search, inView:onScreen.length>0,
      moved:onScreen.some(e => (target&&(e.contains(target)||target.contains(e))) || e.contains(document.activeElement))};
  });
  const tap = async (control) => {
    const before = await where();
    await control.click({timeout:5000}); taps++;
    for (const deadline=Date.now()+2000; Date.now()<deadline; await page.waitForTimeout(100)) {
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      const now = await where().catch(() => null);
      if (now?.inView && (!before.inView || now.moved || now.path!==before.path)) return true;
    }
    return false;
  };
  if (await book.count()) {
    reached = await tap(book);
    if (!reached) {
      const next=page.getByRole('button',{name:/^(start|book|continue|next)/i}).first();
      if (await next.count()) reached = await tap(next);
    }
  }
  if (!reached) failures.push({selector:'[data-booking-step="1"]',detail:'Booking step one not reached within two taps'});
  return {pass:!failures.length, measures:{taps,reached,url:page.url()},failures};
}
