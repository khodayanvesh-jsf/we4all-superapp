import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [app, merchant, service, decorator, rider, labour, liveMap] = await Promise.all([
  read("../src/App.jsx"),
  read("../src/modules/MerchantPortal.jsx"),
  read("../src/modules/ServiceProviderPortal.jsx"),
  read("../src/modules/DecoratorPortal.jsx"),
  read("../src/modules/RiderCaptainPortal.jsx"),
  read("../src/modules/LabourWorksitePortal.jsx"),
  read("../src/modules/LiveRouteMap.jsx")
]);

test("App routes authenticated roles to dedicated modules and owns shared portal state", () => {
  for (const component of ["MerchantPortal", "ServiceProviderPortal", "DecoratorPortal", "RiderCaptainPortal", "LabourWorksitePortal"]) {
    assert.match(app, new RegExp(`<${component}\\b`));
  }
  for (const state of ["decorBids", "captainRadarJobs", "pendingServiceProviders", "pendingDecorators", "pendingRiders", "labourBookings"]) {
    assert.match(app, new RegExp(state));
  }
  assert.match(app, /canOpenPartnerPortal/);
});

test("Merchant portal filters own orders and blocks packing before verified payment", () => {
  assert.match(merchant, /isMerchantOrderOwned/);
  assert.match(merchant, /canMarkOrderPacked/);
  assert.match(merchant, /PENDING_ADMIN_APPROVAL/);
  assert.match(merchant, /PACKED_PENDING_SERVER_DISPATCH/);
});

test("Service provider portal does not create simulated bookings or release escrow locally", () => {
  assert.doesNotMatch(service, /simBooking/);
  assert.doesNotMatch(service, /Math\\.random/);
  assert.match(service, /providerBookings/);
  assert.match(service, /Happy Code verification requires a server-issued/);
  assert.match(service, /disabled className="flex-1 bg-slate-700/);
});

test("Decorator portal scopes its halls, requires approval and stores bids as records", () => {
  assert.match(decorator, /ownerUserId/);
  assert.match(decorator, /PENDING_ADMIN_APPROVAL/);
  assert.match(decorator, /recordType: "DECOR_BID"/);
  assert.match(decorator, /calculateDecoratorAdvance|advance/);
  assert.doesNotMatch(decorator, /ENV-8841|Rajesh Verma/);
});

test("Rider portal has no fallback OTP, synthetic jobs or client payout success", () => {
  assert.doesNotMatch(rider, /4499/);
  assert.doesNotMatch(rider, /Math\\.random/);
  assert.doesNotMatch(rider, /PAYMENT_RELEASED_TO_UPI/);
  assert.match(rider, /trackingEnabled=\{isOnlineForDriving && locationConsent\}/);
  assert.match(rider, /server-issued delivery OTP/);
});

test("Labour portal supports both legacy/new prop contracts and locks local OTP/wage transitions", () => {
  assert.match(labour, /workers,/);
  assert.match(labour, /setWorkers,/);
  assert.match(labour, /bookings,/);
  assert.match(labour, /setBookings,/);
  assert.match(labour, /REQUESTED_PENDING_WORKER_CONFIRMATION/);
  assert.doesNotMatch(labour, /lb\\.morningStartOtp/);
  assert.doesNotMatch(labour, /lb\\.eveningReleaseOtp/);
  assert.doesNotMatch(labour, /WAGE_RELEASED_COMPLETED/);
});

test("Live route map uses opt-in device geolocation instead of fake timer progress", () => {
  assert.match(liveMap, /navigator\\.geolocation\\.watchPosition/);
  assert.equal(liveMap.includes("clearWatch"), true);
  assert.doesNotMatch(liveMap, /setInterval/);
  assert.doesNotMatch(liveMap, /19\\.6641|78\\.5320/);
});
