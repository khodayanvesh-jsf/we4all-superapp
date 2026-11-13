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
    assert.equal(app.includes(`<${component}`), true);
  }
  for (const state of ["decorBids", "captainRadarJobs", "pendingServiceProviders", "pendingDecorators", "pendingRiders", "labourBookings"]) {
    assert.equal(app.includes(state), true);
  }
  assert.equal(app.includes("canOpenPartnerPortal"), true);
});

test("Merchant portal filters own orders and blocks packing before verified payment", () => {
  assert.equal(merchant.includes("isMerchantOrderOwned"), true);
  assert.equal(merchant.includes("canMarkOrderPacked"), true);
  assert.equal(merchant.includes("PENDING_ADMIN_APPROVAL"), true);
  assert.equal(merchant.includes("PACKED_PENDING_SERVER_DISPATCH"), true);
});

test("Service provider portal does not create simulated bookings or release escrow locally", () => {
  assert.equal(service.includes("simBooking"), false);
  assert.equal(service.includes("Math.random"), false);
  assert.equal(service.includes("providerBookings"), true);
  assert.equal(service.includes("Happy Code verification requires a server-issued"), true);
  assert.equal(service.includes('disabled className="flex-1 bg-slate-700'), true);
});

test("Decorator portal scopes its halls, requires approval and stores bids as records", () => {
  assert.equal(decorator.includes("ownerUserId"), true);
  assert.equal(decorator.includes("PENDING_ADMIN_APPROVAL"), true);
  assert.equal(decorator.includes('recordType: "DECOR_BID"'), true);
  assert.equal(app.includes("calculateDecoratorAdvance"), true);
  assert.equal(decorator.includes("ENV-8841") || decorator.includes("Rajesh Verma"), false);
});

test("Rider portal has no fallback OTP, synthetic jobs or client payout success", () => {
  assert.equal(rider.includes("4499"), false);
  assert.equal(rider.includes("Math.random"), false);
  assert.equal(rider.includes("PAYMENT_RELEASED_TO_UPI"), false);
  assert.equal(rider.includes("trackingEnabled={routeGpsEnabled}"), true);
  assert.equal(rider.includes("Server-issued delivery OTP"), true);
  assert.equal(rider.includes('mode="rider"'), true);
  assert.equal(rider.includes("RideWorkspace"), true);
});

test("Labour portal supports both legacy/new prop contracts and locks local OTP/wage transitions", () => {
  assert.equal(labour.includes("workers,"), true);
  assert.equal(labour.includes("setWorkers,"), true);
  assert.equal(labour.includes("bookings,"), true);
  assert.equal(labour.includes("setBookings,"), true);
  assert.equal(labour.includes("REQUESTED_PENDING_WORKER_CONFIRMATION"), true);
  assert.equal(labour.includes("lb.morningStartOtp"), false);
  assert.equal(labour.includes("lb.eveningReleaseOtp"), false);
  assert.equal(labour.includes('status: "WAGE_RELEASED_COMPLETED"'), false);
});

test("Live route map uses opt-in device geolocation instead of fake timer progress", () => {
  assert.equal(liveMap.includes("navigator.geolocation.watchPosition"), true);
  assert.equal(liveMap.includes("clearWatch"), true);
  assert.equal(liveMap.includes("setInterval"), false);
  assert.equal(liveMap.includes("19.6641") || liveMap.includes("78.5320"), false);
});
