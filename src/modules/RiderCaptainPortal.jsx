import React, { useEffect, useState } from "react";
import { invokeWe4AllOperations } from "../supabaseClient";
import LiveRouteMap from "./LiveRouteMap";
import RiderRadarMap from "./RiderRadarMap";

export const VEHICLE_CONSORT_RULES = {
  "2W": {
    code: "2W",
    label: "2W Bike Captain (Up to 45 kg)",
    shortLabel: "2W Bike",
    maxWeightKg: 45,
    baseFare2Km: 25,
    perKmRate: 6,
    heavyBonus: 15
  },
  "3W": {
    code: "3W",
    label: "3W Auto Captain (Up to 300 kg)",
    shortLabel: "3W Auto",
    maxWeightKg: 300,
    baseFare2Km: 60,
    perKmRate: 15,
    heavyBonus: 40
  },
  "4W_HEAVY": {
    code: "4W_HEAVY",
    label: "4W Mini Truck / Heavy (Over 300 kg)",
    shortLabel: "4W Heavy",
    maxWeightKg: 2000,
    baseFare2Km: 300,
    perKmRate: 25,
    heavyBonus: 100
  }
};

export default function RiderCaptainPortal({
  footerTab,
  setFooterTab,
  currentUser,
  setCurrentUser,
  orders = [],
  setOrders = () => {},
  captainRadarJobs = [],
  setCaptainRadarJobs = () => {},
  pendingRiders = [],
  onSwitchToPersonalShop,
  onTriggerToast,
  onReportError = () => {},
  renderAccountTab
}) {
  const myVehicleCode = currentUser?.vehicleCode || "UNVERIFIED";
  const myVehicleRule = VEHICLE_CONSORT_RULES[myVehicleCode] || VEHICLE_CONSORT_RULES["2W"];

  const [isOnlineForDriving, setIsOnlineForDriving] = useState(false);
  const [locationConsent, setLocationConsent] = useState(false);
  const autoOnline9AmEnabled = false;
  const [showLockedOtherVehicleJobs, setShowLockedOtherVehicleJobs] =
    useState(true);
  const [dropOtpInputs, setDropOtpInputs] = useState({});
  const [otpVerifiedBanner, setOtpVerifiedBanner] = useState(null);
  const [earningsPeriod, setEarningsPeriod] = useState("ALL");
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [claimingDispatchId, setClaimingDispatchId] = useState("");
  const [dispatchError, setDispatchError] = useState("");
  const [radarServiceFilter, setRadarServiceFilter] = useState("ALL");
  const [selectedRadarJob, setSelectedRadarJob] = useState(null);
  const [assignedServiceJobs, setAssignedServiceJobs] = useState([]);
  const [routeGpsEnabled, setRouteGpsEnabled] = useState(false);

  const myPendingCaptain = (pendingRiders || []).find(
    (r) =>
      r.phone === currentUser?.phone ||
      r.captainName === currentUser?.fullName
  );
  const isPublishedLive = Boolean(
    currentUser?.authUserId &&
    currentUser?.role === "rider" &&
    currentUser?.status === "Approved" &&
    VEHICLE_CONSORT_RULES[myVehicleCode] &&
    (!myPendingCaptain || myPendingCaptain.status === "Approved")
  );

  const refreshRiderDispatch = async () => {
    if (!isPublishedLive) return;
    setDispatchLoading(true);
    setDispatchError("");
    try {
      const [result, assigned] = await Promise.all([
        invokeWe4AllOperations("list_rider_jobs"),
        invokeWe4AllOperations("list_my_operations")
      ]);
      const assignedJobs = [
        ...(assigned.dispatchJobs || []).map((job) => ({ ...job, serviceType: "M2C", id: job.id, orderId: job.order_id, pickupPin: job.pickup_location?.address || "Merchant pickup", dropPin: job.dropoff_location?.address || "Customer delivery", status: ["accepted","at_pickup"].includes(job.status) ? "ACCEPTED_BY_CAPTAIN" : "PICKED_UP_EN_ROUTE", requiredVehicleCode: job.vehicle_class === "4W" ? "4W_HEAVY" : job.vehicle_class, serverDispatchVerified: true })),
        ...(assigned.p2pDeliveries || []).map((job) => ({ ...job, serviceType: "P2P", id: job.id, pickupPin: job.pickup_location?.address || "Personal pickup", dropPin: job.dropoff_location?.address || "Personal delivery", status: job.status === "assigned" ? "ACCEPTED_BY_CAPTAIN" : "PICKED_UP_EN_ROUTE", requiredVehicleCode: job.vehicle_class === "4W" ? "4W_HEAVY" : job.vehicle_class, serverDispatchVerified: true })),
        ...(assigned.taxiRides || []).map((job) => ({ ...job, serviceType: "TAXI", id: job.id, pickupPin: job.pickup_location?.address || "Passenger pickup", dropPin: job.dropoff_location?.address || "Passenger destination", status: job.status === "assigned" ? "ACCEPTED_BY_CAPTAIN" : "PICKED_UP_EN_ROUTE", requiredVehicleCode: job.vehicle_class === "4W" ? "4W_HEAVY" : job.vehicle_class, serverDispatchVerified: true }))
      ];
      setAssignedServiceJobs(assignedJobs);
      const jobs = (result.jobs || []).map((job) => {
        const serviceType = job.service_type || "M2C";
        const pickup = job.pickup_location || {};
        const dropoff = job.dropoff_location || {};
        return {
          ...job, id: job.id, orderId: job.order_id, serviceType,
          requiredVehicleCode: job.vehicle_class === "4W" ? "4W_HEAVY" : job.vehicle_class,
          vehicleLabel: job.vehicle_class === "4W" ? "4W Cab / Utility" : job.vehicle_class,
          weightKg: Number(job.parcel_details?.weightKg || job.we4all_orders?.total_weight_kg || 0),
          badge: serviceType === "TAXI" ? "Rapido passenger ride" : serviceType === "P2P" ? "Personal parcel delivery" : "Merchant to Customer delivery",
          bookedBy: serviceType === "TAXI" ? "Passenger pickup" : serviceType === "P2P" ? (job.parcel_details?.type || "Personal parcel") : `Order ${job.we4all_orders?.order_number || job.order_id}`,
          pickupPin: pickup.address || pickup.full_address || pickup.name || "Pickup address",
          dropPin: dropoff.address || dropoff.full_address || dropoff.name || "Destination address",
          distanceKm: null,
          captainPayout: serviceType === "M2C" ? Number(job.we4all_orders?.delivery_fee_inr || 0) : null,
          quotedFare: serviceType === "TAXI" ? Number(job.quoted_total_inr || 0) : Number(job.quoted_fee_inr || 0),
          serverDispatchVerified: true, status: "OPEN_ON_RADAR"
        };
      });
      setCaptainRadarJobs(jobs);
    } catch (error) {
      setDispatchError(error?.message || "Could not load verified dispatch jobs.");
      onReportError?.("Dispatch queue unavailable", error?.message || "Could not load server dispatch jobs.", "Check that the Rider role and vehicle class have been Founder-approved.");
    } finally {
      setDispatchLoading(false);
    }
  };

  useEffect(() => {
    if (!isPublishedLive) return undefined;
    refreshRiderDispatch();
    return undefined;
  }, [isPublishedLive, currentUser?.authUserId, currentUser?.partnerId, myVehicleCode]);

  // Merge store orders from Merchant Portal into Radar if not already in captainRadarJobs
  const radarJobIds = new Set((captainRadarJobs || []).map((j) => j.id));
  const storeOrdersForRadar = (orders || [])
    .filter(
      (o) =>
        o.serverDispatchVerified === true &&
        ["VERIFIED", "PAID"].includes(o.paymentStatus) &&
        !radarJobIds.has(o.id) &&
        (o.status === "READY_FOR_PICKUP_AGENT_ALERTED" ||
          o.status === "PAID_PACKING_STARTED" ||
          o.status === "CAPTAIN_EN_ROUTE_TO_DROP" ||
          o.status === "OUT_FOR_DELIVERY_LIVE_MAP")
    )
    .map((o) => ({
      id: o.id,
      requiredVehicleCode: o.requiredVehicleCode || "2W",
      vehicleLabel: o.vehicle || "2W Bike Captain (Up to 45 kg)",
      weightKg:
        o.weightKg ||
        Math.max(1, Math.ceil((o.totalWeightGrams || 2000) / 1000)),
      badge: `Merchant Store Order (${o.shopName || "Local Store"})`,
      bookedBy: `Customer: ${o.customerName} | Store: ${
        o.shopName || "Supermart"
      }`,
      pickupPin: o.shopName || "Sri Laxmi Supermart, Adilabad",
      dropPin: o.address || "Subhash Nagar, Adilabad",
      distFromCaptainKm: 0.5,
      distanceKm: o.distanceKm || 2.2,
      captainPayout: o.deliveryFee || 45,
      secretOtp: "",
      status:
        o.status === "CAPTAIN_EN_ROUTE_TO_DROP" ||
        o.status === "OUT_FOR_DELIVERY_LIVE_MAP"
          ? "ACCEPTED_BY_CAPTAIN"
          : "OPEN_ON_RADAR",
      paymentReqStatus: o.paymentReqStatus || "PENDING_TRIP_COMPLETION",
      isFromOrdersList: true
    }));

  const combinedRadarList = [...captainRadarJobs, ...storeOrdersForRadar];

  // STRICT ISOLATION: A Captain can ONLY operate orders allocated to their exact vehicleCode
  const myEligibleRadarJobs = combinedRadarList.filter(
    (j) =>
      j.serverDispatchVerified === true &&
      (j.requiredVehicleCode || "2W") === myVehicleCode &&
      j.status !== "COMPLETED_DELIVERED" &&
      j.status !== "DELIVERED_COMPLETED" &&
      j.status !== "DELIVERED_REVIEW_POPUP"
  );
  const lockedOtherVehicleJobs = combinedRadarList.filter(
    (j) => j.serverDispatchVerified === true && (j.requiredVehicleCode || "2W") !== myVehicleCode
  );

  // Deduplicated Active Accepted Trips for Tab 2 (Route Map & OTP Verification)
  const activeMap = new Map();
  myEligibleRadarJobs
    .filter(
      (j) =>
        j.status === "ACCEPTED_BY_CAPTAIN" ||
        j.status === "PICKED_UP_EN_ROUTE"
    )
    .forEach((j) => activeMap.set(j.id, j));

  (orders || [])
    .filter(
      (o) =>
        o.serverDispatchVerified === true &&
        (o.requiredVehicleCode || "2W") === myVehicleCode &&
        (o.status === "READY_FOR_PICKUP_AGENT_ALERTED" ||
          o.status === "CAPTAIN_EN_ROUTE_TO_DROP" ||
          o.status === "OUT_FOR_DELIVERY_LIVE_MAP")
    )
    .forEach((o) => {
      if (!activeMap.has(o.id)) {
        activeMap.set(o.id, {
          ...o,
          pickupPin: o.shopName || "Sri Laxmi Supermart",
          dropPin: o.address || "Subhash Nagar, Adilabad",
          captainPayout: o.deliveryFee || 45,
          secretOtp: ""
        });
      }
    });

  assignedServiceJobs.forEach((job) => {
    if (job.status === "ACCEPTED_BY_CAPTAIN" || job.status === "PICKED_UP_EN_ROUTE") activeMap.set(job.id, job);
  });
  const activeAcceptedTrips = Array.from(activeMap.values());

  // Deduplicated Completed / Active Bookings for Tab 3 (Km Rate) & Tab 4 (Earnings)
  const bookingsMap = new Map();
  combinedRadarList
    .filter(
      (j) =>
        j.serverDispatchVerified === true &&
        (j.requiredVehicleCode || "2W") === myVehicleCode &&
        j.status !== "OPEN_ON_RADAR"
    )
    .forEach((j) => bookingsMap.set(j.id, j));

  (orders || [])
    .filter((o) => o.serverSettlementStatus === "VERIFIED" && (o.requiredVehicleCode || "2W") === myVehicleCode)
    .forEach((o) => {
      if (!bookingsMap.has(o.id)) {
        bookingsMap.set(o.id, o);
      }
    });

  assignedServiceJobs.forEach((job) => bookingsMap.set(job.id, job));
  const allMyVehicleBookings = Array.from(bookingsMap.values());

  // COMPLETE OTP VERIFICATION HANDLER (Updates BOTH captainRadarJobs AND orders)
  const handleVerifyTripOtpAndComplete = () => {
    onReportError(
      "Delivery verification unavailable",
      "The backend has not issued a customer-bound, expiring delivery OTP. No delivery status or payout was changed.",
      "Complete the secure OTP endpoint and provider-side verification before enabling delivery completion."
    );
  };

  const handleDownloadCaptainStatementPdf = () => {
    const win = window.open("", "_blank", "width=720,height=800");
    if (!win) {
      onReportError(
        "Popup Window Blocked",
        "Your browser blocked the PDF statement print window.",
        "Allow popups for this site and tap PDF Ledger again."
      );
      return;
    }
    const rowsHtml = allMyVehicleBookings
      .map(
        (bk, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>#${bk.id}</td>
        <td>${bk.requiredVehicleCode || myVehicleCode} (${bk.weightKg || 5} kg)</td>
        <td>${bk.pickupPin || bk.shopName} &rarr; ${bk.dropPin || bk.address}</td>
        <td>${bk.distanceKm || 2.4} km</td>
        <td>${bk.status}</td>
        <td style="text-align:right;">Rs.${bk.captainPayout || bk.deliveryFee || 45}</td>
      </tr>`
      )
      .join("");
    const totalEarned = allMyVehicleBookings.reduce(
      (s, b) => s + Number(b.captainPayout || b.deliveryFee || 45),
      0
    );
    win.document.write(`
      <html>
      <head><title>Captain_Statement_${myVehicleCode}</title></head>
      <body style="font-family:Arial;padding:20px;">
        <h2>WE4ALL DELIVERY CAPTAIN LEDGER (${myVehicleRule.label})</h2>
        <p><strong>Captain:</strong> ${currentUser?.fullName} | <strong>Vehicle:</strong> ${currentUser?.vehicleModel || "Verified"} (${currentUser?.rcPlate || "Not verified"}) | <strong>DL:</strong> ${currentUser?.dlNumber || "Verified"}</p>
        <table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr><th>#</th><th>Order ID</th><th>Allocated Vehicle</th><th>Route</th><th>Dist</th><th>Status</th><th>Payout</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <h3>Total (${myVehicleCode}) Earnings: Rs.${totalEarned}</h3>
        <script>window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  if (footerTab === "account") {
    return renderAccountTab();
  }

  return (
    <div className="space-y-3 text-xs text-white">
      {/* CAPTAIN VEHICLE IDENTITY & STRICT LOCK HEADER */}
      <div className="bg-slate-900 p-3 rounded-2xl border border-teal-500/40 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-black text-teal-300 text-xs">
                {currentUser?.fullName || "Rider"}
              </h3>
              <span className="bg-teal-500/20 border border-teal-400 text-teal-200 text-[8px] font-black px-2 py-0.5 rounded">
                LOCKED VEHICLE: {myVehicleRule.shortLabel} (MAX {myVehicleRule.maxWeightKg} KG)
              </span>
              {isPublishedLive ? (
                <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[8px] font-black px-1.5 py-0.5 rounded">
                  LIVE
                </span>
              ) : (
                <span className="bg-amber-500/20 border border-amber-400 text-amber-300 text-[8px] font-black px-1.5 py-0.5 rounded">
                  PENDING ADMIN
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Model: <strong>{currentUser?.vehicleModel || "Vehicle details pending verification"}</strong> | Plate:{" "}
              <strong>{currentUser?.rcPlate || "Not verified"}</strong> | DL:{" "}
              <strong>{currentUser?.dlNumber || "Not verified"}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToPersonalShop}
            className="bg-teal-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer shrink-0"
          >
            Personal Shop
          </button>
        </div>

        {/* Vehicle Consort Lock Switcher */}
        <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 space-y-1">
          <p className="text-[9px] text-amber-300 font-bold px-1">
            Strict Vehicle Consort Lock (2W cannot access 3W/4W, 3W cannot access 2W/4W):
          </p>
          <div className="grid grid-cols-3 gap-1 text-[9px]">
            {Object.values(VEHICLE_CONSORT_RULES).map((vr) => (
              <button
                key={vr.code}
                type="button"
                disabled={vr.code !== myVehicleCode || !isPublishedLive}
                onClick={() => {
                  onTriggerToast("Vehicle class is read-only and comes from the Founder-approved rider profile. Submit a vehicle change request for verification.");
                }}
                className={`py-1.5 rounded-lg font-black cursor-pointer ${
                  myVehicleCode === vr.code
                    ? "bg-teal-400 text-slate-950"
                    : "bg-slate-900 text-slate-400 border border-slate-800"
                }`}
              >
                {vr.shortLabel} {vr.code === myVehicleCode ? "Approved profile" : "Locked"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-200">
            {isOnlineForDriving
              ? `MANUALLY ONLINE FOR ${myVehicleRule.shortLabel.toUpperCase()} ORDERS`
              : "OFF-DUTY (RADAR PAUSED)"}
          </span>
          <button
            type="button"
            onClick={() => {
              if (isOnlineForDriving) {
                setIsOnlineForDriving(false);
                setLocationConsent(false);
                onTriggerToast?.("Rider marked offline on this device. Server duty status is not yet available.");
                return;
              }
              onTriggerToast?.("Live duty is temporarily unavailable: WE4ALL must first save your availability and location heartbeat on the server. Dispatch job refresh and acceptance remain available.");
            }}
            className={`px-2.5 py-1 rounded-lg font-black text-[9px] cursor-pointer ${
              isOnlineForDriving
                ? "bg-emerald-400 text-slate-950"
                : "bg-rose-600 text-white"
            }`}
          >
            {isOnlineForDriving ? "Go Offline" : "Server duty unavailable"}
          </button>
        </div>
      </div>

      <div className="bg-amber-950/50 border border-amber-500/30 p-3 rounded-xl text-[10px] text-amber-200">
        Delivery completion and earnings are credited only after the customer-bound server OTP and settlement service confirm them. No offline/manual OTP can complete a delivery.
      </div>

      {/* TAB 1: VEHICLE-LOCKED RADAR ("home") */}
      {footerTab === "home" && (
        <div className="space-y-2.5">
          <div className="bg-slate-900 p-3 rounded-2xl border border-amber-500/40 space-y-1.5">
            <h4 className="text-amber-300 font-black text-[11px]">Rider setup & live-service checklist</h4>
            <p className="text-[10px] text-slate-300">Vehicle class: {myVehicleCode === "UNVERIFIED" ? "Pending Founder verification" : myVehicleRule.shortLabel}</p>
            <p className="text-[10px] text-slate-300">Driving licence / RC: {currentUser?.dlNumber && currentUser?.rcPlate ? "Details recorded — Founder verification required" : "Not yet recorded"}</p>
            <p className="text-[10px] text-slate-300">Server duty heartbeat / GPS tracking: Not connected — live mode is disabled.</p>
            <p className="text-[10px] text-slate-300">Dispatch queue / accept: Connected to authenticated server operations.</p>
            <p className="text-[10px] text-slate-300">Customer delivery OTP / completion: Paused until secure server verification is available.</p>
            <p className="text-[10px] text-slate-300">Rider settlement / payout: Paused; no payment has been initiated.</p>
          </div>
          <RiderRadarMap jobs={myEligibleRadarJobs} selectedJob={selectedRadarJob} onSelectJob={setSelectedRadarJob} />
          <div className="grid grid-cols-4 gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            {[
              ["ALL","All"],["TAXI","Bike / Auto / Cab"],["P2P","P2P Parcel"],["M2C","M2C Delivery"]
            ].map(([value,label]) => (
              <button key={value} type="button" onClick={() => setRadarServiceFilter(value)}
                className={`rounded-lg py-2 px-1 text-[8px] font-black ${radarServiceFilter === value ? "bg-cyan-400 text-slate-950" : "text-slate-300 bg-slate-900"}`}>{label}</button>
            ))}
          </div>
          <div className="bg-slate-900 p-3 rounded-2xl border border-teal-500/40 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-slate-300">{dispatchLoading ? "Refreshing dispatch queue…" : `${(myEligibleRadarJobs || []).length} eligible server jobs`}</p>
              <button type="button" onClick={refreshRiderDispatch} disabled={dispatchLoading || !isPublishedLive}
                className="bg-teal-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-300 font-bold px-2 py-1 rounded-lg text-[9px]">Refresh jobs</button>
            </div>
            {dispatchError && <p className="text-[10px] text-rose-300">{dispatchError}</p>}
            <h4 className="font-black text-teal-300 text-xs">
                  1. {myVehicleRule.shortLabel} Radar ({(myEligibleRadarJobs || []).length} Eligible Orders)
                </h4>
                <p className="text-[10px] text-slate-400">
                  Showing orders allocated strictly to {myVehicleRule.label}
                </p>
              </div>
              <p className="text-[10px] text-amber-200">Live dispatch jobs will appear here when the authenticated dispatch service allocates an order to this vehicle class.</p>
            </div>
          </div>

          {myEligibleRadarJobs.map((job) => (
            <div
              key={job.id}
              className="bg-slate-900 p-3 rounded-2xl border-2 border-emerald-500/50 space-y-2"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded">
                    {job.serviceType || "M2C"} &bull; {job.requiredVehicleCode || "2W"} {job.weightKg ? `· ${job.weightKg} KG` : ""}
                  </span>
                  <h5 className="font-black text-white text-xs mt-1">
                    #{job.id} &bull; {job.badge}
                  </h5>
                  <p className="text-[10px] text-slate-300">{job.bookedBy}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-emerald-400 text-sm block">
                    {job.captainPayout ? `₹${job.captainPayout}` : job.quotedFare ? `Fare ₹${job.quotedFare}` : "Fare pending"}
                  </span>
                  <span className="text-[9px] text-amber-300 font-bold">
                    {job.distFromCaptainKm} km away
                  </span>
                </div>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-[10px] space-y-0.5">
                <p className="text-emerald-300 font-bold">
                  Pickup: <span className="text-white">{job.pickupPin}</span>
                </p>
                <p className="text-amber-300 font-bold">
                  Drop: <span className="text-white">{job.dropPin}</span> ({job.distanceKm} km) | OTP:{" "}
                  <strong className="text-white">"Awaiting server verification"</strong>
                </p>
              </div>
              {job.status === "OPEN_ON_RADAR" ? (
                <button
                  type="button"
                  disabled={claimingDispatchId === job.id || !isPublishedLive}
                  onClick={async () => {
                    setClaimingDispatchId(job.id);
                    try {
                      const claimAction = job.serviceType === "TAXI" ? "claim_taxi_ride" : job.serviceType === "P2P" ? "claim_p2p_delivery" : "claim_dispatch";
                      const claimPayload = job.serviceType === "TAXI" ? { rideBookingId: job.id } : job.serviceType === "P2P" ? { deliveryId: job.id } : { dispatchId: job.id };
                      await invokeWe4AllOperations(claimAction, claimPayload);
                      await refreshRiderDispatch();
                      setSelectedRadarJob(null);
                      onTriggerToast?.(`${job.serviceType === "TAXI" ? "Passenger ride" : job.serviceType === "P2P" ? "P2P parcel" : "Merchant delivery"} accepted by WE4ALL. Open the route tab for navigation.`);
                    } catch (error) {
                      onTriggerToast?.(error?.message || "Dispatch claim failed. No local assignment was created.");
                    } finally {
                      setClaimingDispatchId("");
                    }
                  }}
                  className="w-full bg-emerald-500 disabled:bg-slate-700 text-slate-950 disabled:text-slate-300 font-black py-2 rounded-xl"
                >
                  {claimingDispatchId === job.id ? "Accepting…" : "Accept delivery"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFooterTab("batch")}
                  className="w-full bg-teal-500/20 border border-teal-400 text-teal-200 font-black py-1.5 rounded-xl cursor-pointer"
                >
                  Assignment status must be confirmed by dispatch server
                </button>
              )}
            </div>
          ))}

          {/* OTHER VEHICLE ORDERS - STRICTLY LOCKED */}
          <div className="bg-slate-900 p-3 rounded-2xl border border-rose-500/40 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-black text-rose-300 text-[11px]">
                 Other Vehicle Orders ({(lockedOtherVehicleJobs || []).length} Locked - Zero Interference)
              </span>
              <button
                type="button"
                onClick={() =>
                  setShowLockedOtherVehicleJobs(!showLockedOtherVehicleJobs)
                }
                className="text-[9px] text-slate-400 underline cursor-pointer"
              >
                {showLockedOtherVehicleJobs ? "Hide" : "Show"}
              </button>
            </div>
            {showLockedOtherVehicleJobs &&
              lockedOtherVehicleJobs.map((lj) => (
                <div
                  key={lj.id}
                  className="bg-slate-950/70 p-2.5 rounded-xl border border-rose-500/30 opacity-75 flex justify-between items-center gap-2"
                >
                  <div>
                    <span className="bg-rose-500/20 text-rose-300 text-[8px] font-black px-1.5 py-0.5 rounded">
                      ALLOCATED TO {lj.requiredVehicleCode} ONLY ({lj.weightKg || 120} KG)
                    </span>
                    <p className="font-bold text-slate-300 text-[10px] mt-0.5">
                      #{lj.id} &bull; {lj.badge} (Rs.{lj.captainPayout})
                    </p>
                  </div>
                  <span className="bg-slate-800 text-rose-300 font-black px-2 py-1 rounded-lg text-[8px] shrink-0">
                     {myVehicleCode} BLOCKED
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 2: ROUTE MAP & FIXED OTP VERIFICATION ("batch") */}
      {footerTab === "batch" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3 rounded-2xl border border-teal-500/40">
            <h4 className="font-black text-teal-300 text-xs">
              2. Active {myVehicleRule.shortLabel} Route Map &amp; OTP Verification ({(activeAcceptedTrips || []).length})
            </h4>
            <p className="text-[10px] text-slate-400">
              Live GPS route for {currentUser?.vehicleModel || myVehicleRule.shortLabel} ({currentUser?.rcPlate || "Not verified"})
            </p>
          </div>
          <button type="button" onClick={() => setRouteGpsEnabled((value) => !value)}
            className="rounded-xl px-3 py-2 text-[10px] font-black ${routeGpsEnabled ? "bg-emerald-500 text-slate-950" : "bg-cyan-500 text-slate-950"}">
            {routeGpsEnabled ? "Stop route GPS" : "Enable route GPS"}
          </button>
          {(activeAcceptedTrips || []).length === 0 ? (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center space-y-2">
              <p className="font-bold text-slate-300">
                No pending {myVehicleRule.shortLabel} route deliveries right now.
              </p>
              <div className="flex gap-2 justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setFooterTab("home")}
                  className="bg-teal-400 text-slate-950 font-black px-3 py-2 rounded-xl text-[10px] cursor-pointer"
                >
                  1. Open Radar &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => setFooterTab("rates")}
                  className="bg-amber-400 text-slate-950 font-black px-3 py-2 rounded-xl text-[10px] cursor-pointer"
                >
                  3. Km Rate &amp; Payouts &rarr;
                </button>
              </div>
            </div>
          ) : (
            activeAcceptedTrips.map((trip) => {
              const otpCode = "";
              return (
                <div
                  key={trip.id}
                  className="bg-slate-900 p-3 rounded-2xl border border-teal-500/40 space-y-2.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-emerald-400 text-xs">
                      #{trip.id} ({trip.requiredVehicleCode || myVehicleCode})
                    </span>
                    <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black">
                      Payout: Rs.{trip.captainPayout || trip.deliveryFee || 45}
                    </span>
                  </div>
                  <LiveRouteMap
                    pickupLabel={trip.pickupPin || trip.shopName}
                    dropLabel={trip.dropPin || trip.address}
                    riderName={currentUser?.fullName || "Rider"}
                    vehicle={`${myVehicleRule.shortLabel} (${currentUser?.rcPlate || "Vehicle pending"})`}
                    distanceKm={trip.distanceKm || null}
                    trackingEnabled={routeGpsEnabled}
                  />
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between items-center text-[10px]">
                    <span className="text-slate-300">
                      Customer / Merchant OTP:{" "}
                      <strong className="text-amber-300 font-mono text-xs">{otpCode}</strong>
                    </span>
                    <span className="text-[10px] text-amber-200">Server-issued delivery OTP required. Completion remains locked.</span>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Server-issued delivery OTP (not configured)"
                      value={dropOtpInputs[trip.id] ?? ""}
                      onChange={(e) =>
                        setDropOtpInputs({
                          ...dropOtpInputs,
                          [trip.id]: e.target.value
                        })
                      }
                      className="w-28 bg-slate-950 border border-amber-400 rounded-xl p-2 text-center font-mono text-white"
                    />
                    <button
                      type="button"
                      disabled
                      onClick={() => handleVerifyTripOtpAndComplete(trip)}
                      className="flex-1 bg-slate-700 text-slate-300 font-black rounded-xl text-[10px] cursor-not-allowed shadow"
                    >
                      Server verification required
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: KM RATE & PAYMENT REQUEST DESK ("rates") */}
      {footerTab === "rates" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-teal-500/40 space-y-2">
            <h4 className="font-black text-teal-300 text-xs">
              3. Locked {myVehicleRule.label} Km Rate Consort Card
            </h4>
            <div className="grid grid-cols-3 gap-1.5 text-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div>
                <p className="text-[9px] text-slate-400">Base Fare (2 km)</p>
                <p className="font-black text-emerald-400 text-sm">
                  Rs.{myVehicleRule.baseFare2Km}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400">Per-Km Slab</p>
                <p className="font-black text-teal-300 text-sm">
                  Rs.{myVehicleRule.perKmRate}/km
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400">Max Payload</p>
                <p className="font-black text-amber-300 text-sm">
                  {myVehicleRule.maxWeightKg} kg
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-2xl border border-amber-500/40 space-y-2.5">
            <h4 className="font-black text-amber-400 text-xs">
              My {myVehicleRule.shortLabel} Bookings &amp; Payment Request Desk ({(allMyVehicleBookings || []).length})
            </h4>
            {allMyVehicleBookings.map((bk) => {
              const fare = Number(bk.captainPayout || bk.deliveryFee || 45);
              const isPaid = bk.serverSettlementStatus === "VERIFIED";
              return (
                <div
                  key={bk.id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-black text-teal-300 text-[11px]">
                        #{bk.id} &bull; {bk.badge || "Order Delivery"} ({bk.requiredVehicleCode || myVehicleCode})
                      </span>
                      <p className="text-[10px] text-slate-300">
                        {bk.pickupPin || bk.shopName} &rarr; {bk.dropPin || bk.address}
                      </p>
                      <p className="text-[9px] text-emerald-400 font-bold">
                        Status: {bk.status}
                      </p>
                    </div>
                    <span className="font-black text-emerald-400 text-xs">
                      Rs.{fare}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                    <span className="text-[9px] text-slate-400">
                      UPI ({currentUser?.upiId || "captain@ybl"}):
                    </span>
                    {isPaid ? (
                      <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg text-[9px] font-black">
                        Settlement verification required 
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled
                        onClick={() => {
                          onTriggerToast(
                            "Payout request cannot be submitted yet. WE4ALL needs an authenticated captain settlement API and payment-provider confirmation. No payout status was changed."
                          );
                        }}
                        className="bg-slate-700 text-slate-300 font-black px-3 py-1 rounded-lg text-[9px] cursor-not-allowed"
                      >
                        Payout integration required
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: EARNINGS & 9 AM AUTO-DUTY ("orders") */}
      {footerTab === "orders" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-emerald-500/40 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-black text-emerald-400 text-xs">
                  4. {myVehicleRule.shortLabel} Earnings &amp; 09:00 AM Default Online Duty
                </h4>
                <p className="text-[10px] text-slate-400">
                  Auto-duty is paused. Server-side availability and location heartbeat are not yet connected; no automatic duty starts.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadCaptainStatementPdf}
                className="bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer"
              >
                PDF Ledger
              </button>
            </div>
            <select
              value={earningsPeriod}
              onChange={(e) => setEarningsPeriod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white font-bold text-[10px]"
            >
              <option value="ALL">
                All {myVehicleRule.shortLabel} Trips ({(allMyVehicleBookings || []).length})
              </option>
              <option value="TODAY">Today (Since 09:00 AM Duty)</option>
            </select>
            {allMyVehicleBookings.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-white text-[11px]">
                    #{item.id} &bull; {item.badge || "Merchant Order Delivery"}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Vehicle: {item.requiredVehicleCode || myVehicleCode} | Status: {item.status}
                  </p>
                </div>
                <span className="font-black text-emerald-400 text-xs">
                  +Rs.{item.captainPayout || item.deliveryFee || 45}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}