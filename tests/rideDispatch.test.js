import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/20261110051815_ride_dispatch_trial.sql', import.meta.url), 'utf8');
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,phone_confirmed_at timestamptz,banned_until timestamptz);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.session',true))$$;
grant usage on schema auth, public to authenticated, anon;
create table public.we4all_user_roles(user_id uuid,role text,status text,primary key(user_id,role));
create table public.we4all_partners(owner_user_id uuid,partner_type text,approval_status text,display_name text);
create table public.we4all_partner_applications(user_id uuid,requested_role text,status text,application_payload jsonb,reviewed_at timestamptz,created_at timestamptz default now());
`);
await db.exec(migration);
for (let n=1;n<=8;n++) {
  await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[id(n)]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[id(n+100),id(n)]);
  await db.query("insert into public.we4all_user_roles values($1,'customer','approved')",[id(n)]);
}
for (const [n,vehicle,status] of [[2,'2W · Bike','approved'],[3,'2W · Bike','approved'],[4,'3W · Auto / cargo auto','approved'],[5,'2W · Bike','pending']]) {
  await db.query("insert into public.we4all_user_roles values($1,'rider',$2)",[id(n),status]);
  await db.query("insert into public.we4all_partners values($1,'rider',$2,'Test Rider')",[id(n),status]);
  await db.query("insert into public.we4all_partner_applications(user_id,requested_role,status,application_payload,reviewed_at) values($1,'rider',$2,$3,now())",[id(n),status,{partner_details:{vehicleClass:vehicle,vehicleRegistration:'TEST-123'}}]);
}
const asUser = async n => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.session',$2,false)",[n ? id(n) : '', n ? id(n+100) : '']);
  await db.exec('set role authenticated');
};
const admin = async sql => { await db.exec('reset role'); return db.exec(sql); };
const call = async (n, action, payload={}) => { await asUser(n); return (await db.query('select public.we4all_ride_command($1,$2) result',[action,payload])).rows[0].result; };
const location = {lat:17.4,lng:78.4,accuracy:10};
const tripPayload = (n=200, extra={}) => ({key:id(n),pickup:'Pickup shop',drop:'Drop landmark',service:'passenger',vehicle:'2W',...location,...extra});
let trip;
test('ride dispatch database invariants', async t => {
  await t.test('disabled by default; unauthenticated and anonymous callers cannot access rides', async () => {
    await assert.rejects(call(null,'snapshot'),/AUTHENTICATION_REQUIRED/);
    assert.equal((await call(1,'snapshot')).enabled,false);
    await assert.rejects(call(1,'request',tripPayload()),/RIDES_DISABLED/);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query("select public.we4all_ride_command('snapshot','{}')"),/permission denied/);
    await admin('update we4all_rides_private.settings set enabled=true');
  });
  await t.test('clients cannot read raw trips or alter approval/settings', async () => {
    await asUser(1);
    await assert.rejects(db.query('select * from we4all_rides_private.trips'),/permission denied/);
    await assert.rejects(db.query('update we4all_rides_private.settings set enabled=true'),/permission denied/);
    await assert.rejects(db.query("update public.we4all_user_roles set status='approved'"),/permission denied/);
  });
  await t.test('pending rider and invalid GPS cannot go online', async () => {
    await assert.rejects(call(5,'availability',{online:true,...location}),/RIDER_NOT_APPROVED/);
    await assert.rejects(call(2,'availability',{online:true,...location,lat:91}),/LOCATION_REQUIRED/);
    await assert.rejects(call(2,'availability',{online:true,...location,accuracy:250}),/LOCATION_REQUIRED/);
    await assert.rejects(call(2,'availability',{online:true,...location,lng:'NaN'}),/LOCATION_REQUIRED/);
  });
  await t.test('request retries return the same trip; changed payload and second active trip fail', async () => {
    trip=await call(1,'request',tripPayload());
    assert.deepEqual(await call(1,'request',tripPayload()),trip);
    await assert.rejects(call(1,'request',tripPayload(200,{drop:'Changed destination'})),/IDEMPOTENCY_CONFLICT/);
    await assert.rejects(call(1,'request',tripPayload(201)),/ACTIVE_TRIP_EXISTS/);
    assert.equal((await call(6,'snapshot')).trips.length,0);
  });
  await t.test('nearby approved matching vehicle sees no addresses or customer identity before acceptance', async () => {
    await call(2,'availability',{online:true,...location});
    await call(3,'availability',{online:true,...location,lat:18.4});
    await call(4,'availability',{online:true,...location});
    const offers=(await call(2,'snapshot',{mode:'rider'})).offers;
    assert.equal(offers.length,1);
    assert.deepEqual(Object.keys(offers[0]).sort(),['id','service','vehicle','version','distance_km'].sort());
    assert.equal((await call(3,'snapshot',{mode:'rider'})).offers.length,0);
    assert.equal((await call(4,'snapshot',{mode:'rider'})).offers.length,0);
    await assert.rejects(call(3,'accept',{id:trip.id,version:1}),/TRIP_UNAVAILABLE/);
    await assert.rejects(call(4,'accept',{id:trip.id,version:1}),/TRIP_UNAVAILABLE/);
  });
  await t.test('acceptance requires fresh availability; row lock and version reject second claimant', async () => {
    await admin(`update we4all_rides_private.presence set updated_at=now()-interval '3 minutes' where rider_id='${id(2)}'`);
    await assert.rejects(call(2,'accept',{id:trip.id,version:1}),/LOCATION_STALE/);
    await call(2,'availability',{online:true,...location});
    assert.equal((await call(2,'accept',{id:trip.id,version:1})).status,'accepted');
    await call(3,'availability',{online:true,...location});
    await assert.rejects(call(3,'accept',{id:trip.id,version:1}),/TRIP_UNAVAILABLE/);
    const customer=(await call(1,'snapshot')).trips[0];
    assert.equal(customer.rider_location.lat,location.lat);
    assert.equal(customer.rider_name,'Test Rider');
    assert.equal((await call(3,'snapshot',{mode:'rider'})).trips.length,0);
    await assert.rejects(call(6,'cancel',{id:trip.id,version:2}),/TRIP_UNAVAILABLE/);
    await assert.rejects(call(2,'request',tripPayload(210)),/ACTIVE_TRIP_EXISTS/);
  });
  await t.test('only assigned rider may arrive; only owner may start; cannot skip steps', async () => {
    await assert.rejects(call(2,'finish',{id:trip.id,version:2}),/INVALID_TRANSITION/);
    await assert.rejects(call(1,'arrive',{id:trip.id,version:2}),/RIDER_NOT_APPROVED/);
    await assert.rejects(call(2,'arrive',{id:trip.id,version:1}),/TRIP_CHANGED/);
    assert.equal((await call(2,'arrive',{id:trip.id,version:2})).status,'at_pickup');
    await assert.rejects(call(2,'start',{id:trip.id,version:3}),/INVALID_TRANSITION/);
    assert.equal((await call(1,'start',{id:trip.id,version:3})).status,'in_progress');
    await assert.rejects(call(1,'cancel',{id:trip.id,version:4}),/INVALID_TRANSITION/);
  });
  await t.test('completion needs customer confirmation; duplicates cannot create extra events', async () => {
    assert.equal((await call(2,'finish',{id:trip.id,version:4})).status,'awaiting_confirmation');
    await assert.rejects(call(2,'complete',{id:trip.id,version:5}),/INVALID_TRANSITION/);
    assert.equal((await call(1,'complete',{id:trip.id,version:5})).status,'completed');
    await assert.rejects(call(1,'complete',{id:trip.id,version:5}),/INVALID_TRANSITION/);
    const ended=(await call(1,'snapshot')).trips[0];
    assert.equal(ended.rider_location,null);
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int n from we4all_rides_private.events where trip_id=$1',[trip.id])).rows[0].n,6);
  });
  await t.test('one active rider trip and cancellation release the slot; parcel supported', async () => {
    const parcel=await call(6,'request',tripPayload(202,{service:'parcel'}));
    const another=await call(7,'request',tripPayload(203));
    await call(2,'accept',{id:parcel.id,version:1});
    await assert.rejects(call(2,'accept',{id:another.id,version:1}),/ACTIVE_TRIP_EXISTS/);
    await call(6,'cancel',{id:parcel.id,version:2});
    assert.equal((await call(2,'accept',{id:another.id,version:1})).status,'accepted');
    await call(2,'cancel',{id:another.id,version:2});
  });
  await t.test('expired requests disappear, offline clears GPS, revoked approval blocks rider', async () => {
    const old=await call(1,'request',tripPayload(204));
    await admin(`update we4all_rides_private.trips set created_at=now()-interval '11 minutes' where id='${old.id}'`);
    assert.equal((await call(1,'snapshot')).trips.find(t=>t.id===old.id).status,'expired');
    await admin('update we4all_rides_private.settings set enabled=false');
    await call(2,'availability',{online:false});
    await assert.rejects(call(1,'request',tripPayload(211)),/RIDES_DISABLED/);
    await admin('update we4all_rides_private.settings set enabled=true');
    assert.equal((await call(2,'snapshot',{mode:'rider'})).offers.length,0);
    await db.exec('reset role');
    assert.equal((await db.query('select lat from we4all_rides_private.presence where rider_id=$1',[id(2)])).rows[0].lat,null);
    await admin(`update public.we4all_user_roles set status='suspended' where user_id='${id(2)}' and role='rider'`);
    await assert.rejects(call(2,'availability',{online:true,...location}),/RIDER_NOT_APPROVED/);
  });
  await t.test('unverified or revoked sessions do not authorize requests', async () => {
    await admin(`update auth.users set email_confirmed_at=null where id='${id(8)}'`);
    await assert.rejects(call(8,'snapshot'),/AUTHENTICATION_REQUIRED/);
    await admin(`delete from auth.sessions where user_id='${id(3)}'`);
    await assert.rejects(call(3,'snapshot',{mode:'rider'}),/AUTHENTICATION_REQUIRED/);
  });
  await t.test('rate limit caps repeated cancellations; null/malformed requests fail', async () => {
    await assert.rejects(call(1,'request',tripPayload(205,{vehicle:null})),/INVALID_REQUEST/);
    await assert.rejects(call(1,'request',tripPayload(205,{pickup:'  '})),/INVALID_REQUEST/);
    for(let n=300;n<309;n++) { const row=await call(7,'request',tripPayload(n)); await call(7,'cancel',{id:row.id,version:1}); }
    await assert.rejects(call(7,'request',tripPayload(310)),/RATE_LIMITED/);
  });
});
test.after(async()=>db.close());
