import test from 'node:test';
import assert from 'node:assert/strict';
import {createRideClient,validateTrip,rideError,isActiveTrip} from '../src/modules/rides/rideClient.js';
const form={pickup:'Shop',drop:'Station',vehicle:'2W',service:'passenger'};
const location={lat:17.4,lng:78.4,accuracy:10,at:Date.now()};
test('ride input rejects stale, inaccurate, invalid and identical pickup/drop',()=>{
  assert.equal(validateTrip(form,location),'');
  for(const change of [{lat:91},{lng:Infinity},{accuracy:201},{at:Date.now()-91000}]) assert.ok(validateTrip(form,{...location,...change}));
  assert.ok(validateTrip({...form,drop:' SHOP '},location));
  assert.ok(validateTrip({...form,service:'merchant'},location));
});
test('API client propagates authoritative errors and does not invent successful trips',async()=>{
  let seen;
  const api=createRideClient({rpc:async(name,args)=>{seen={name,args};return {data:{id:'server-id'},error:null};}});
  assert.deepEqual(await api('request',{key:'key'}),{id:'server-id'});
  assert.deepEqual(seen,{name:'we4all_ride_command',args:{p_action:'request',p_payload:{key:'key'}}});
  await assert.rejects(createRideClient({rpc:async()=>({error:{message:'TRIP_CHANGED'}})})('accept'),/changed on another device/);
  await assert.rejects(createRideClient({rpc:async()=>({data:null})})('accept'),/No trip confirmation/);
});
test('unavailable migrations give useful message; terminal trips cannot stay active',()=>{
  assert.match(rideError({code:'PGRST202'}),/not open for testing/);
  for(const status of ['completed','cancelled','expired']) assert.equal(isActiveTrip({status}),false);
  assert.equal(isActiveTrip({status:'in_progress'}),true);
});
