import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {startDemoBackend} from './demo-backend.mjs';
test('offline engine follows the real booking transport, price edits, refusals and duplicate presses', async function offlineTransportTest() {
  const seed=JSON.parse(readFileSync(new URL('./fixtures/sites/brightline.seed.json',import.meta.url)));
  const platform=process.env.SITE_ACCEPTANCE_PLATFORM || path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const {createBookingTransport,slotsForType}=await import(pathToFileURL(path.join(platform,'app/src/book/core.js')));
  // the server starts only once the platform has loaded: a missing platform used to leave it listening, so the test
  // file never exited and the whole suite hung (2026-11-05)
  const server=await startDemoBackend({port:0,seed,quiet:true});
  const api=createBookingTransport({supabaseUrl:server.url,anonKey:'demo-anon'}),slug='brightline';
  try {
    assert.equal((await api.profileByHost('brightline.example.test')).business.name,'Brightline Auto Care');
    server.db.tables.business_domains[0].verified_at=null;
    assert.equal(await api.profileByHost('brightline.example.test'),null);
    const selection={service_ids:[seed.tables.services[0].id],add_ons:[],vehicle_size:'small',service_type:'dropoff'};
    const response=await api.calculateBooking(slug,selection);
    assert.equal(response.quote.total,85);
    const range={duration_minutes:response.quote.total_duration,start_date:new Date(Date.now()+7*86400000).toISOString().slice(0,10),
      end_date:new Date(Date.now()+14*86400000).toISOString().slice(0,10)};
    const times=await api.availableSlots(slug,range),[date,day]=Object.entries(times.days).find(([,d])=>d.slots.length);
    assert.ok(slotsForType(day,'mobile').length);assert.ok(slotsForType(day,'dropoff').length);
    const bid=seed.tables.businesses[0].id,oneDay={booking_date:date,duration_minutes:60};
    const available=()=>api.availableSlots(slug,oneDay);
    server.db.tables.blockout_dates.push({business_id:'another-tenant',start_date:date,end_date:date,all_day:true});
    assert.ok((await available()).slots.length);server.db.tables.blockout_dates[0].business_id=bid;
    assert.deepEqual((await available()).slots,[]);server.db.tables.blockout_dates=[];
    server.db.tables.booking_hours_overrides.push({business_id:bid,date,open_time:null,close_time:null});
    assert.deepEqual((await available()).slots,[]);
    Object.assign(server.db.tables.booking_hours_overrides[0],{open_time:'13:00',close_time:'15:00'});
    assert.equal((await available()).slots[0],'13:00');server.db.tables.booking_hours_overrides=[];
    server.db.tables.businesses[0].closed_until=new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10);
    assert.deepEqual((await available()).slots,[]);server.db.tables.businesses[0].closed_until=null;
    server.db.tables.dropoff_only_periods.push({business_id:bid,start_date:date,end_date:null,mode:'dropoff'});
    const restricted=await available();assert.equal(slotsForType(restricted,'mobile').length,0);assert.ok(slotsForType(restricted,'dropoff').length);
    server.db.tables.dropoff_only_periods[0].mode='mobile';assert.equal(slotsForType(await available(),'dropoff').length,0);
    server.db.tables.dropoff_only_periods.push({business_id:bid,start_date:date,end_date:null,mode:'dropoff'});
    assert.deepEqual((await available()).slots,[]);server.db.tables.dropoff_only_periods=[];
    const payload={...selection,booking_date:date,start_time:day.slots[0],booking_ref:randomUUID(),shown_total:response.quote.total,
      customer_name:'Sample Customer',customer_email:'sample@example.test',customer_phone:'5555550123',sms_consent:true};
    const [first,retry]=await Promise.all([api.createBooking(slug,payload),api.createBooking(slug,payload)]);
    assert.equal(first.booking.id,retry.booking.id);assert.equal(first.booking.status,'pending');
    assert.equal(server.db.tables.bookings.length,1);
    assert.equal(server.db.tables.booking_services[0].name_at_booking,'Hand wash');
    assert.equal(first.booking.total_price,response.quote.total);
    server.db.tables.services[0].price=195;
    assert.equal((await api.calculateBooking(slug,selection)).quote.total,175);
    assert.equal((await api.createBooking(slug,payload)).booking.id,first.booking.id);
    await assert.rejects(api.createBooking(slug,{...payload,booking_ref:randomUUID()}),e=>e.status===409&&e.body.error==='price_changed');
    await assert.rejects(api.createBooking(slug,{...payload,booking_ref:randomUUID(),shown_total:175}),e=>e.status===409&&e.body.error==='slot_taken');
    await assert.rejects(api.availableSlots(slug,{...range,start_date:'2026-99-99'}),e=>e.status===400);
    const large={...selection,vehicle_size:'large'},largeQuote=await api.calculateBooking(slug,large);
    const largerTimes=await api.availableSlots(slug,{...range,duration_minutes:largeQuote.quote.total_duration});
    const [largeDate,largeDay]=Object.entries(largerTimes.days).find(([,d])=>slotsForType(d,'dropoff').length);
    const larger=await api.createBooking(slug,{...payload,...large,booking_ref:randomUUID(),shown_total:largeQuote.quote.total,
      booking_date:largeDate,start_time:slotsForType(largeDay,'dropoff')[0]});
    const snapshot=server.db.tables.booking_services.find(s=>s.booking_id===larger.booking.id);
    assert.equal(snapshot.price_at_booking,235);assert.equal(snapshot.duration_at_booking,90);
    const calls=await(await fetch(server.url+'/__demo/calls')).json();
    assert.ok(calls.some(c=>c.method==='POST'&&c.body.booking_ref===payload.booking_ref&&c.status===200));
    assert.ok(calls.some(c=>c.status===409&&c.path==='/functions/v1/create-booking'));
    server.db.tables.businesses[0].status='suspended';
    assert.equal(await api.profile(slug),null);
    await assert.rejects(api.calculateBooking(slug,selection),e=>e.status===404);
  } finally {await server.close();}
});
test('site-browser import from any current directory', function anyCwdTest() {
  const here=path.dirname(fileURLToPath(import.meta.url)),url=f=>pathToFileURL(path.join(here,f)).href;
  const run=(env)=>spawnSync(process.execPath,['--input-type=module','-e',
    `const b=await import(${JSON.stringify(url('site-browser.mjs'))});console.log(b.PLATFORM)`],
    {cwd:tmpdir(),env,encoding:'utf8',windowsHide:true});
  const withEnv=run(process.env);
  assert.equal(withEnv.status,0,withEnv.stderr);
  // Without the override, the default must be beside this file's folder, not the current directory.
  const {SITE_ACCEPTANCE_PLATFORM,...bare}=process.env,expected=path.resolve(here,'../..'),plain=run(bare);
  if(plain.status===0) assert.equal(plain.stdout.trim(),expected);
  else assert.ok(plain.stderr.includes(path.join(expected,'app','package.json')),plain.stderr);
});
