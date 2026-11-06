import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@1.9.2";
import { createAdminClient } from "npm:@supabase/server@1.9.2/core";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:CORS});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
async function approvedPartner(admin:any,userId:string,type:string){
 const {data,error}=await admin.from("we4all_partners").select("id,partner_type,display_name,zone_id,vehicle_class,availability_rules").eq("owner_user_id",userId).eq("partner_type",type).eq("approval_status","approved").maybeSingle();
 if(error)throw new Error("PARTNER_LOOKUP_FAILED");return data;
}
Deno.serve(withSupabase({ auth: "user" }, async (req: Request, ctx) => {
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 if(req.method!=="POST")return json(405,{ok:false,error:"METHOD_NOT_ALLOWED"});
 const userId=ctx.jwtClaims?.sub||ctx.userClaims?.sub||ctx.userClaims?.id;
 const user=userId?{id:userId,app_metadata:ctx.jwtClaims?.app_metadata||{}}:null;
 if(!user?.id)return json(401,{ok:false,error:"AUTH_REQUIRED"});
 let body:Record<string,unknown>;
 try{const raw=await req.text();if(raw.length>32768)return json(413,{ok:false,error:"REQUEST_TOO_LARGE"});body=JSON.parse(raw);}catch{return json(400,{ok:false,error:"INVALID_JSON"});}
 const admin=createAdminClient({auth:{keyName:"we4allbackendrotation202611"}});
 const {data:roleRows,error:roleError}=await admin.from("we4all_user_roles").select("role,status").eq("user_id",user.id);
 if(roleError)return json(503,{ok:false,error:"ROLE_LOOKUP_FAILED"});
 const roles=new Set((roleRows||[]).filter((r:any)=>r.status==="approved").map((r:any)=>r.role));
 const has=(r:string)=>roles.has(r),founder=user.app_metadata?.we4all_role==="founder";
 const fail=(code:string,status=400)=>json(status,{ok:false,error:code});
 const uuid=(v:unknown)=>UUID.test(String(v||""));
 const idem=String(body.idempotencyKey||""),validIdem=idem.length>=8&&idem.length<=160;
 const rpc=async(name:string,args:Record<string,unknown>)=>{const {data,error}=await admin.rpc(name,args);if(error)throw new Error(error.message||"DATABASE_TRANSACTION_FAILED");return data;};
 try{
 switch(body.action){
 case "create_booking":{
  if(!has("customer"))return fail("APPROVED_CUSTOMER_REQUIRED",403);
  const partnerId=String(body.partnerId||""),type=String(body.bookingType||"");
  const partnerType=type==="service"?"service_provider":type;
  if(!uuid(partnerId)||!["service","decorator","function_hall"].includes(type)||!validIdem)return fail("INVALID_BOOKING_REQUEST");
  const start=Date.parse(String(body.requestedStartAt||"")),end=Date.parse(String(body.requestedEndAt||""));
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>48*3600000)return fail("INVALID_BOOKING_WINDOW");
  const partner=await approvedPartnerById(admin,partnerId,partnerType);
  if(!partner)return fail("APPROVED_BOOKING_PARTNER_REQUIRED",403);
  return json(200,await rpc("we4all_create_booking",{p_customer_user_id:user.id,p_partner_id:partnerId,p_booking_type:type,p_zone_id:partner.zone_id,p_start:new Date(start).toISOString(),p_end:new Date(end).toISOString(),p_note:String(body.note||"").slice(0,1000),p_metadata:obj(body.metadata),p_idempotency_key:idem}));
 }
 case "quote_booking":{
  const bookingId=String(body.bookingId||""),partnerId=String(body.partnerId||"");
  if(!uuid(bookingId)||!uuid(partnerId))return fail("INVALID_BOOKING_REVIEW");
  const {data:p,error}=await admin.from("we4all_partners").select("id,partner_type").eq("id",partnerId).eq("owner_user_id",user.id).eq("approval_status","approved").maybeSingle();
  if(error||!p)return fail("PARTNER_OWNERSHIP_REQUIRED",403);
  const role=p.partner_type,authorized=(role==="service_provider"&&has("service_provider"))||(role==="decorator"&&has("decorator"))||(role==="function_hall"&&(has("decorator")||founder));
  if(!authorized)return fail("APPROVED_PARTNER_REQUIRED",403);
  const total=Number(body.quotedTotalInr),advance=Number(body.advanceRequiredInr||0);
  if(!Number.isFinite(total)||total<=0||!Number.isFinite(advance)||advance<0||advance>total)return fail("INVALID_BOOKING_QUOTE");
  return json(200,await rpc("we4all_quote_booking",{p_booking_id:bookingId,p_partner_owner_user_id:user.id,p_quote_inr:total,p_advance_inr:advance,p_note:String(body.note||"").slice(0,500)}));
 }
 case "create_labour":{
  if(!has("customer"))return fail("APPROVED_CUSTOMER_REQUIRED",403);
  const partnerId=String(body.partnerId||"");if(!uuid(partnerId)||!validIdem)return fail("INVALID_LABOUR_REQUEST");
  const partner=await approvedPartnerById(admin,partnerId,"labour");if(!partner)return fail("APPROVED_LABOUR_PARTNER_REQUIRED",403);
  const start=Date.parse(String(body.requestedStartAt||""));if(!Number.isFinite(start))return fail("INVALID_WORK_DATE");
  return json(200,await rpc("we4all_create_labour_engagement",{p_customer_user_id:user.id,p_labour_partner_id:partnerId,p_zone_id:partner.zone_id,p_trade_key:String(body.tradeKey||"").slice(0,80),p_worker_count:Number(body.workerCount||1),p_start:new Date(start).toISOString(),p_duration:Number(body.durationHours||8),p_worksite:obj(body.worksiteAddress),p_idempotency_key:idem}));
 }
 case "quote_labour":{
  if(!has("labour"))return fail("APPROVED_LABOUR_REQUIRED",403);
  const partner=await approvedPartner(admin,user.id,"labour");if(!partner)return fail("APPROVED_LABOUR_PARTNER_REQUIRED",403);
  const id=String(body.engagementId||""),decision=String(body.decision||"");
  const total=decision==="accept"?Number(body.agreedTotalInr):null;
  if(!uuid(id)||!["accept","decline"].includes(decision)||(decision==="accept"&&(!Number.isFinite(total)||total<=0)))return fail("INVALID_LABOUR_DECISION");
  return json(200,await rpc("we4all_quote_labour_engagement",{p_engagement_id:id,p_partner_owner_user_id:user.id,p_agreed_total_inr:total,p_decision:decision}));
 }
 case "create_ride":{
  if(!has("customer"))return fail("APPROVED_CUSTOMER_REQUIRED",403);
  if(!validIdem)return fail("IDEMPOTENCY_KEY_REQUIRED");
  const pickup=obj(body.pickupLocation),dropoff=obj(body.dropoffLocation),start=Date.parse(String(body.requestedStartAt||""));
  if(!Object.keys(pickup).length||!Object.keys(dropoff).length||!Number.isFinite(start))return fail("INVALID_RIDE_REQUEST");
  return json(200,await rpc("we4all_create_ride_booking",{p_customer_user_id:user.id,p_zone_id:String(body.zoneId||"adilabad_master"),p_vehicle_class:String(body.vehicleClass||""),p_pickup:pickup,p_dropoff:dropoff,p_start:new Date(start).toISOString(),p_note:String(body.note||"").slice(0,500),p_idempotency_key:idem}));
 }
 case "set_availability":{
  const id=String(body.partnerId||"");if(!uuid(id))return fail("INVALID_PARTNER_ID");
  const {data:p,error}=await admin.from("we4all_partners").select("id,partner_type").eq("id",id).eq("owner_user_id",user.id).eq("approval_status","approved").maybeSingle();
  if(error||!p)return fail("PARTNER_OWNERSHIP_REQUIRED",403);
  const role=p.partner_type,authorized=(role==="service_provider"&&has("service_provider"))||(role==="decorator"&&has("decorator"))||(role==="function_hall"&&(has("decorator")||founder));
  if(!authorized)return fail("APPROVED_PARTNER_REQUIRED",403);
  const rules=obj(body.availabilityRules);if(JSON.stringify(rules).length>10000)return fail("AVAILABILITY_RULES_TOO_LARGE");
  const {error:updateError}=await admin.from("we4all_partners").update({availability_rules:rules,updated_at:new Date().toISOString()}).eq("id",id).eq("owner_user_id",user.id);
  if(updateError)return fail("AVAILABILITY_SAVE_FAILED",500);
  return json(200,{ok:true,partnerId:id,availabilityRules:rules});
 }
 case "create_dispatch":{
  const orderId=String(body.orderId||"");if(!uuid(orderId))return fail("INVALID_ORDER_ID");
  if(!founder){if(!has("merchant"))return fail("APPROVED_MERCHANT_REQUIRED",403);const partner=await approvedPartner(admin,user.id,"merchant");if(!partner)return fail("APPROVED_MERCHANT_PARTNER_REQUIRED",403);const {data:o}=await admin.from("we4all_orders").select("id,partner_id").eq("id",orderId).maybeSingle();if(!o||o.partner_id!==partner.id)return fail("ORDER_OWNERSHIP_REQUIRED",403);}
  return json(200,await rpc("we4all_create_dispatch_job",{p_order_id:orderId,p_actor_user_id:user.id}));
 }
 case "create_p2p_delivery":{
  if(!has("customer"))return fail("APPROVED_CUSTOMER_REQUIRED",403);
  if(!validIdem)return fail("IDEMPOTENCY_KEY_REQUIRED");
  const pickup=obj(body.pickupLocation),dropoff=obj(body.dropoffLocation),details=obj(body.parcelDetails),vehicle=String(body.vehicleClass||"");
  const weight=Number(details.weightKg||0);
  if(!["2W","3W","4W"].includes(vehicle)||!Object.keys(pickup).length||!Object.keys(dropoff).length||!Number.isFinite(weight)||weight<=0||weight>2000)return fail("INVALID_P2P_REQUEST");
  const {data:existing}=await admin.from("we4all_p2p_deliveries").select("id,status").eq("customer_user_id",user.id).eq("idempotency_key",idem).maybeSingle();
  if(existing)return json(200,{ok:true,duplicate:true,delivery_id:existing.id,status:existing.status});
  const {data,error}=await admin.from("we4all_p2p_deliveries").insert({customer_user_id:user.id,zone_id:String(body.zoneId||"adilabad_master"),vehicle_class:vehicle,pickup_location:pickup,dropoff_location:dropoff,parcel_details:details,idempotency_key:idem}).select("id,status,vehicle_class").single();
  if(error)return fail("P2P_DELIVERY_CREATE_FAILED",500);
  return json(200,{ok:true,delivery_id:data.id,status:data.status,vehicle_class:data.vehicle_class});
 }
 case "list_rider_jobs":{
  if(!has("rider"))return fail("APPROVED_RIDER_REQUIRED",403);
  const partner=await approvedPartner(admin,user.id,"rider");if(!partner||!partner.vehicle_class)return fail("FOUNDER_VERIFIED_VEHICLE_CLASS_REQUIRED",403);
  const [m2c,p2p,taxi]=await Promise.all([
   admin.from("we4all_dispatch_jobs").select("id,order_id,vehicle_class,status,pickup_location,dropoff_location,created_at,we4all_orders!inner(order_number,total_inr,delivery_address,zone_id,payment_status,status)").eq("vehicle_class",partner.vehicle_class).eq("we4all_orders.zone_id",partner.zone_id).in("status",["queued","offered"]).order("created_at",{ascending:true}).limit(50),
   admin.from("we4all_p2p_deliveries").select("id,customer_user_id,vehicle_class,pickup_location,dropoff_location,parcel_details,quoted_fee_inr,status,created_at").eq("zone_id",partner.zone_id).eq("vehicle_class",partner.vehicle_class).is("rider_partner_id",null).in("status",["queued","offered"]).order("created_at",{ascending:true}).limit(50),
   admin.from("we4all_ride_bookings").select("id,customer_user_id,vehicle_class,pickup_location,dropoff_location,quoted_total_inr,status,requested_start_at,created_at").eq("zone_id",partner.zone_id).eq("vehicle_class",partner.vehicle_class).is("rider_partner_id",null).in("status",["requested","quoted"]).order("created_at",{ascending:true}).limit(50)
  ]);
  if(m2c.error||p2p.error||taxi.error)return fail("RIDER_RADAR_LOOKUP_FAILED",500);
  const jobs=[
   ...(m2c.data||[]).map((j:any)=>({...j,service_type:"M2C",badge:"Merchant to Customer",serverDispatchVerified:true})),
   ...(p2p.data||[]).map((j:any)=>({...j,service_type:"P2P",badge:"Personal parcel delivery",serverDispatchVerified:true})),
   ...(taxi.data||[]).map((j:any)=>({...j,service_type:"TAXI",badge:"Passenger taxi ride",serverDispatchVerified:true}))
  ];
  return json(200,{ok:true,vehicleClass:partner.vehicle_class,zoneId:partner.zone_id,m2cJobs:m2c.data||[],p2pJobs:p2p.data||[],taxiRequests:taxi.data||[],jobs});
 }
 case "claim_dispatch":{
  if(!has("rider"))return fail("APPROVED_RIDER_REQUIRED",403);
  const partner=await approvedPartner(admin,user.id,"rider"),id=String(body.dispatchId||"");
  if(!partner?.vehicle_class||!uuid(id))return fail("VERIFIED_RIDER_PROFILE_REQUIRED",403);
  return json(200,await rpc("we4all_claim_dispatch_job",{p_dispatch_id:id,p_rider_user_id:user.id,p_vehicle_class:partner.vehicle_class}));
 }
 case "claim_p2p_delivery":{
  if(!has("rider"))return fail("APPROVED_RIDER_REQUIRED",403);
  const partner=await approvedPartner(admin,user.id,"rider"),id=String(body.deliveryId||"");
  if(!partner?.vehicle_class||!uuid(id))return fail("VERIFIED_RIDER_PROFILE_REQUIRED",403);
  return json(200,await rpc("we4all_claim_p2p_delivery",{p_delivery_id:id,p_rider_user_id:user.id,p_vehicle_class:partner.vehicle_class}));
 }
 case "claim_taxi_ride":{
  if(!has("rider"))return fail("APPROVED_RIDER_REQUIRED",403);
  const partner=await approvedPartner(admin,user.id,"rider"),id=String(body.rideBookingId||"");
  if(!partner?.vehicle_class||!uuid(id))return fail("VERIFIED_RIDER_PROFILE_REQUIRED",403);
  return json(200,await rpc("we4all_claim_taxi_ride",{p_ride_booking_id:id,p_rider_user_id:user.id,p_vehicle_class:partner.vehicle_class}));
 }

 case "issue_delivery_test_otp":{
  if(!has("customer"))return fail("APPROVED_CUSTOMER_REQUIRED",403);
  const type=String(body.deliveryType||""),id=String(body.deliveryId||"");
  if(!["M2C","P2P","TAXI"].includes(type)||!uuid(id))return fail("INVALID_DELIVERY_REFERENCE");
  let riderUserId="",customerUserId="";
  if(type==="P2P"||type==="TAXI"){
   const table=type==="P2P"?"we4all_p2p_deliveries":"we4all_ride_bookings";
   const {data:job,error}=await admin.from(table).select("id,customer_user_id,rider_partner_id,status").eq("id",id).maybeSingle();
   if(error||!job)return fail("DELIVERY_NOT_FOUND",404);
   if(job.customer_user_id!==user.id)return fail("DELIVERY_OWNERSHIP_REQUIRED",403);
   if(!job.rider_partner_id||!["assigned","picked_up","in_progress"].includes(job.status))return fail("DELIVERY_NOT_ASSIGNED",409);
   const {data:partner,error:partnerError}=await admin.from("we4all_partners").select("owner_user_id").eq("id",job.rider_partner_id).maybeSingle();
   if(partnerError||!partner?.owner_user_id)return fail("ASSIGNED_RIDER_NOT_FOUND",409);
   riderUserId=partner.owner_user_id;customerUserId=job.customer_user_id;
  } else {
   const {data:job,error}=await admin.from("we4all_dispatch_jobs").select("id,rider_user_id,order_id,status").eq("id",id).maybeSingle();
   if(error||!job)return fail("DELIVERY_NOT_FOUND",404);
   const {data:order,error:orderError}=await admin.from("we4all_orders").select("customer_user_id").eq("id",job.order_id).maybeSingle();
   if(orderError||!order)return fail("ORDER_NOT_FOUND",404);
   if(order.customer_user_id!==user.id)return fail("DELIVERY_OWNERSHIP_REQUIRED",403);
   if(!job.rider_user_id||!["accepted","at_pickup","picked_up","at_dropoff"].includes(job.status))return fail("DELIVERY_NOT_ASSIGNED",409);
   riderUserId=job.rider_user_id;customerUserId=order.customer_user_id;
  }
  await admin.from("we4all_delivery_test_otps").update({status:"expired"}).eq("delivery_type",type).eq("delivery_id",id).eq("status","issued");
  const limit=4294000000,range=4294967296;let value=range;
  while(value>=limit){const sample=new Uint32Array(1);crypto.getRandomValues(sample);value=sample[0];}
  const code=String(value%1000000).padStart(6,"0");
  const saltBytes=new Uint8Array(16);crypto.getRandomValues(saltBytes);
  const salt=Array.from(saltBytes).map((b)=>b.toString(16).padStart(2,"0")).join("");
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(salt+":"+code));
  const hash=Array.from(new Uint8Array(digest)).map((b)=>b.toString(16).padStart(2,"0")).join("");
  const expiresAt=new Date(Date.now()+10*60*1000).toISOString();
  const {error:insertError}=await admin.from("we4all_delivery_test_otps").insert({
   delivery_type:type,delivery_id:id,customer_user_id:customerUserId,rider_user_id:riderUserId,
   otp_hash:hash,otp_salt:salt,expires_at:expiresAt
  });
  if(insertError)return fail("TEST_OTP_CREATE_FAILED",500);
  return json(200,{ok:true,test_only:true,sms_sent:false,delivery_id:id,delivery_type:type,test_otp:code,expires_at:expiresAt,mandatory:false,warning:"TEST ONLY: share this code with the assigned rider in person. It is not an SMS OTP and does not complete the delivery or release payment."});
 }
 case "verify_delivery_test_otp":{
  if(!has("rider"))return fail("APPROVED_RIDER_REQUIRED",403);
  const type=String(body.deliveryType||""),id=String(body.deliveryId||""),code=String(body.code||"").trim();
  if(!["M2C","P2P","TAXI"].includes(type)||!uuid(id)||!/^\\d{6}$/.test(code))return fail("INVALID_TEST_OTP");
  const {data:partner}=await admin.from("we4all_partners").select("id").eq("owner_user_id",user.id).eq("partner_type","rider").eq("approval_status","approved").maybeSingle();
  if(!partner)return fail("APPROVED_RIDER_REQUIRED",403);
  if(type==="P2P"||type==="TAXI"){
   const table=type==="P2P"?"we4all_p2p_deliveries":"we4all_ride_bookings";
   const {data:job}=await admin.from(table).select("rider_partner_id").eq("id",id).maybeSingle();
   if(job?.rider_partner_id!==partner.id)return fail("DELIVERY_NOT_ASSIGNED_TO_RIDER",403);
  } else {
   const {data:job}=await admin.from("we4all_dispatch_jobs").select("rider_user_id").eq("id",id).maybeSingle();
   if(job?.rider_user_id!==user.id)return fail("DELIVERY_NOT_ASSIGNED_TO_RIDER",403);
  }
  const {data:challenge,error:challengeError}=await admin.from("we4all_delivery_test_otps").select("*").eq("delivery_type",type).eq("delivery_id",id).eq("rider_user_id",user.id).eq("status","issued").order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(challengeError||!challenge)return fail("TEST_OTP_NOT_FOUND",404);
  if(new Date(challenge.expires_at).getTime()<Date.now()){
   await admin.from("we4all_delivery_test_otps").update({status:"expired"}).eq("id",challenge.id);
   return fail("TEST_OTP_EXPIRED",410);
  }
  if(Number(challenge.attempt_count)>=5)return fail("TEST_OTP_LOCKED",429);
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(challenge.otp_salt)+":"+code));
  const candidate=Array.from(new Uint8Array(digest)).map((b)=>b.toString(16).padStart(2,"0")).join("");
  let diff=0;for(let i=0;i<candidate.length;i++)diff|=candidate.charCodeAt(i)^(challenge.otp_hash||"").charCodeAt(i);
  if(diff!==0){
   const attempts=Number(challenge.attempt_count)+1;
   await admin.from("we4all_delivery_test_otps").update({attempt_count:attempts,status:attempts>=5?"locked":"issued"}).eq("id",challenge.id);
   return fail(attempts>=5?"TEST_OTP_LOCKED":"TEST_OTP_INVALID",attempts>=5?429:400);
  }
  await admin.from("we4all_delivery_test_otps").update({status:"verified",verified_at:new Date().toISOString()}).eq("id",challenge.id).eq("status","issued");
  return json(200,{ok:true,test_only:true,verified:true,delivery_status_changed:false,payout_released:false,message:"Optional test code verified. No delivery completion or payout was triggered."});
 }
 case "rider_location_ping":{
  if(!has("rider"))return fail("APPROVED_RIDER_REQUIRED",403);
  const longitude=Number(body.longitude),latitude=Number(body.latitude);
  const accuracy=body.accuracyM==null?null:Number(body.accuracyM);
  const heading=body.headingDeg==null?null:Number(body.headingDeg);
  const speed=body.speedMps==null?null:Number(body.speedMps);
  if(!Number.isFinite(longitude)||!Number.isFinite(latitude)||longitude < -180||longitude > 180||latitude < -90||latitude > 90)return fail("INVALID_GPS_COORDINATES");
  if(accuracy!==null&&(!Number.isFinite(accuracy)||accuracy<0||accuracy>10000))return fail("INVALID_GPS_ACCURACY");
  if(heading!==null&&(!Number.isFinite(heading)||heading<0||heading>360))return fail("INVALID_GPS_HEADING");
  if(speed!==null&&(!Number.isFinite(speed)||speed<0||speed>150))return fail("INVALID_GPS_SPEED");
  const partner=await approvedPartner(admin,user.id,"rider");
  if(!partner?.vehicle_class)return fail("FOUNDER_VERIFIED_VEHICLE_CLASS_REQUIRED",403);
  return json(200,await rpc("we4all_upsert_rider_location_ping",{
   p_rider_user_id:user.id,p_longitude:longitude,p_latitude:latitude,
   p_accuracy_m:accuracy,p_heading_deg:heading,p_speed_mps:speed
  }));
 }
 case "list_my_operations":{
  const out:Record<string,unknown>={ok:true,bookings:[],labourEngagements:[],rides:[],dispatchJobs:[],p2pDeliveries:[],taxiRides:[]};
  if(has("customer")){
   const [b,l,r]=await Promise.all([admin.from("we4all_bookings").select("*").eq("customer_user_id",user.id).order("created_at",{ascending:false}).limit(100),admin.from("we4all_labour_engagements").select("*").eq("customer_user_id",user.id).order("created_at",{ascending:false}).limit(100),admin.from("we4all_ride_bookings").select("*").eq("customer_user_id",user.id).order("created_at",{ascending:false}).limit(100)]);
   if(b.error||l.error||r.error)return fail("CUSTOMER_OPERATIONS_LOAD_FAILED",500);out.bookings=b.data||[];out.labourEngagements=l.data||[];out.rides=r.data||[];
  }
  const partnerTypes:string[]=[];if(has("service_provider"))partnerTypes.push("service_provider");if(has("decorator"))partnerTypes.push("decorator","function_hall");
  if(partnerTypes.length){const {data:p,error}=await admin.from("we4all_partners").select("id").eq("owner_user_id",user.id).eq("approval_status","approved").in("partner_type",partnerTypes);if(error)return fail("PARTNER_LOOKUP_FAILED",500);const ids=(p||[]).map((v:any)=>v.id);if(ids.length){const {data,error:bError}=await admin.from("we4all_bookings").select("*").in("partner_id",ids).order("created_at",{ascending:false}).limit(100);if(bError)return fail("PARTNER_BOOKINGS_LOAD_FAILED",500);out.bookings=[...(out.bookings as unknown[]),...(data||[])];}}
  if(has("labour")){const p=await approvedPartner(admin,user.id,"labour");if(p){const {data,error}=await admin.from("we4all_labour_engagements").select("*").eq("labour_partner_id",p.id).order("created_at",{ascending:false}).limit(100);if(error)return fail("LABOUR_QUEUE_LOAD_FAILED",500);out.labourEngagements=[...(out.labourEngagements as unknown[]),...(data||[])];}}
  if(has("rider")){
   const rp=await approvedPartner(admin,user.id,"rider");
   if(rp){
    const [d,p,r]=await Promise.all([
     admin.from("we4all_dispatch_jobs").select("*").eq("rider_user_id",user.id).order("created_at",{ascending:false}).limit(100),
     admin.from("we4all_p2p_deliveries").select("*").eq("rider_partner_id",rp.id).order("created_at",{ascending:false}).limit(100),
     admin.from("we4all_ride_bookings").select("*").eq("rider_partner_id",rp.id).order("created_at",{ascending:false}).limit(100)
    ]);
    if(d.error||p.error||r.error)return fail("RIDER_ACTIVE_JOBS_LOAD_FAILED",500);
    out.dispatchJobs=d.data||[];out.p2pDeliveries=p.data||[];out.taxiRides=r.data||[];
   }
  }
  if(founder){const [b,l,r,d]=await Promise.all([admin.from("we4all_bookings").select("id,status,booking_type,created_at").order("created_at",{ascending:false}).limit(100),admin.from("we4all_labour_engagements").select("id,status,trade_key,created_at").order("created_at",{ascending:false}).limit(100),admin.from("we4all_ride_bookings").select("id,status,vehicle_class,created_at").order("created_at",{ascending:false}).limit(100),admin.from("we4all_dispatch_jobs").select("id,status,order_id,vehicle_class,created_at").order("created_at",{ascending:false}).limit(100)]);if(b.error||l.error||r.error||d.error)return fail("FOUNDER_OPERATIONS_LOAD_FAILED",500);out.bookings=b.data||[];out.labourEngagements=l.data||[];out.rides=r.data||[];out.dispatchJobs=d.data||[];}
  return json(200,out);
 }
 default:return fail("UNSUPPORTED_OPERATIONS_ACTION");
 }
 }catch(error){const message=error?.message||"OPERATIONS_REQUEST_FAILED";const conflict=/UNAVAILABLE|ALREADY_CLAIMED|NOT_QUOTABLE|ALREADY_REVIEWED|BLOCKED/.test(message);const forbidden=/REQUIRED|OWNERSHIP|MISMATCH|NOT_OWNED/.test(message);console.error("WE4ALL operations:",message.slice(0,180));return fail(message.replace(/[^A-Z0-9_]/g,"_").slice(0,100),conflict?409:forbidden?403:400);}
}));
async function approvedPartnerById(admin:any,id:string,type:string){const {data,error}=await admin.from("we4all_partners").select("id,partner_type,zone_id").eq("id",id).eq("partner_type",type).eq("approval_status","approved").maybeSingle();if(error)throw new Error("PARTNER_LOOKUP_FAILED");return data;}
