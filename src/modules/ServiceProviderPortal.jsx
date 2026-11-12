import React, { useState } from "react";
import { uploadFileToSupabaseStorage, setServerPartnerAvailability } from "../supabaseClient";

const MASTER_ONE_HOUR_SLOTS = [
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
  "07:00 PM - 08:00 PM"
];

export default function ServiceProviderPortal({
  footerTab,
  setFooterTab,
  currentUser,
  serviceCategories,
  serviceProviders,
  setServiceProviders,
  pendingServiceProviders,
  serviceBookings,
  setServiceBookings,
  onSwitchToPersonalShop,
  onTriggerToast,
  renderAccountTab
}) {
  // Tab 1: Visits & Geo Happy Code + Spare Parts Bill Builder State
  const [providerInsideGeoFence] = useState(false);
  const [happyCodeInputs, setHappyCodeInputs] = useState({});
  const [partsFormMap, setPartsFormMap] = useState({});

  // Tab 2: 1-Hr Slots Matrix State
  const [selectedSlotDate, setSelectedSlotDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Tab 3: Rate Card & Service Offering Builder State
  const activeProProfile =
    (serviceProviders || []).find(
      (sp) =>
        (sp.userId && sp.userId === currentUser?.id) ||
        (sp.phone && sp.phone === currentUser?.phone)
    ) || {
      id: null,
      serviceCategoryId: "srv_plumbing",
      providerName: currentUser?.fullName || "Service Provider",
      specialization: "",
      visitingFee: 99,
      hourlyRate: 150,
      emergencyFee: 199,
      availableSlots: [],
      rateCardItems: [],
      image: ""
    };


  const [rateCardConfig, setRateCardConfig] = useState({
    serviceCategoryId: activeProProfile.serviceCategoryId || "srv_plumbing",
    specialization: activeProProfile.specialization || "Certified Doorstep Technician",
    visitingFee: activeProProfile.visitingFee || 99,
    hourlyRate: activeProProfile.hourlyRate || 150,
    emergencyFee: activeProProfile.emergencyFee || 199,
    workImage: activeProProfile.image || "",
    consortRulesAccepted: true
  });

  const [newTaskItem, setNewTaskItem] = useState({
    title: "",
    price: "",
    unit: "Fixed Job"
  });

  // Tab 4: Escrow Bills Filter State
  const [billPeriodFilter, setBillPeriodFilter] = useState("ALL");
  const [billStatusFilter, setBillStatusFilter] = useState("ALL");

  // Check if current Service Provider is pending admin approval or published live
  const myPendingPro = (pendingServiceProviders || []).find(
    (p) => (p.userId && p.userId === currentUser?.id) || (p.phone && p.phone === currentUser?.phone)
  );
  const isPublishedLive = Boolean(
    currentUser?.authUserId &&
    currentUser?.role === "service_provider" &&
    currentUser?.status === "Approved" &&
    activeProProfile.id &&
    activeProProfile.status === "Approved"
  );
  const providerBookings = (serviceBookings || []).filter((booking) =>
    (booking.providerId && booking.providerId === activeProProfile.id) ||
    (booking.providerUserId && booking.providerUserId === currentUser?.id)
  );

  const handleToggleSlotAvailability = (slotLabel) => {
    if (!isPublishedLive || !activeProProfile.id) {
      onTriggerToast("Slot management is locked until your own service-provider account is approved.");
      return;
    }
    const currentSlots = activeProProfile.availableSlots || [];
    const exists = currentSlots.includes(slotLabel);
    const updatedSlots = exists
      ? currentSlots.filter((s) => s !== slotLabel)
      : [...currentSlots, slotLabel];

    try {
      const availabilityRules = {
        ...(activeProProfile.availabilityRules || {}),
        availableSlots: updatedSlots,
        oneHourSlots: MASTER_ONE_HOUR_SLOTS,
        oneHourSlotDate: selectedSlotDate
      };
      await setServerPartnerAvailability({ partnerId: activeProProfile.id, availabilityRules });
      setServiceProviders((serviceProviders || []).map((sp) =>
        sp.id === activeProProfile.id ? { ...sp, availableSlots: updatedSlots, availabilityRules } : sp
      ));
      onTriggerToast(`${slotLabel} saved on the WE4ALL server and marked ${exists ? "OFF-DUTY" : "AVAILABLE"}.`);
    } catch (error) {
      onTriggerToast(error?.message || "Server did not save this slot. No local success was recorded.");
    }
  };

  const handleWorkPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isPublishedLive || !activeProProfile.id) {
      onTriggerToast("Portfolio upload is locked until your own service-provider account is approved.");
      return;
    }
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      onTriggerToast("Choose an image up to 5 MB.");
      return;
    }
    onTriggerToast(`Uploading ${file.name} to we4all-media/portfolio...`);
    const cloudUrl = await uploadFileToSupabaseStorage(file, "portfolio");
    if (cloudUrl && cloudUrl.startsWith("http")) {
      setRateCardConfig({ ...rateCardConfig, workImage: cloudUrl });
      setServiceProviders(
        serviceProviders.map((sp) =>
          sp.id === activeProProfile.id ? { ...sp, image: cloudUrl } : sp
        )
      );
      onTriggerToast(`Saved in we4all-media/portfolio!`);
    }
  };

  const handleSaveMasterRateCard = () => {
    if (!isPublishedLive || !activeProProfile.id) {
      onTriggerToast("Rate-card updates are locked until your own service-provider account is approved.");
      return;
    }
    if (!rateCardConfig.consortRulesAccepted) {
      alert("Please accept the WE4ALL Service Provider Consort Rules & SLA checkbox.");
      return;
    }
    const catObj =
      (serviceCategories || []).find((c) => c.id === rateCardConfig.serviceCategoryId) || {};
    const updatedList = serviceProviders.map((sp) =>
      sp.id === activeProProfile.id
        ? {
            ...sp,
            serviceCategoryId: rateCardConfig.serviceCategoryId,
            serviceCategory: catObj.name || sp.serviceCategory,
            specialization: rateCardConfig.specialization,
            visitingFee: Number(rateCardConfig.visitingFee) || 99,
            hourlyRate: Number(rateCardConfig.hourlyRate) || 150,
            emergencyFee: Number(rateCardConfig.emergencyFee) || 199,
            image: rateCardConfig.workImage || sp.image
          }
        : sp
    );
    const nextProfile = updatedList.find((sp) => sp.id === activeProProfile.id) || {};
    const availabilityRules = {
      ...(activeProProfile.availabilityRules || {}),
      availableSlots: activeProProfile.availableSlots || [],
      serviceRateCard: {
        serviceCategoryId: rateCardConfig.serviceCategoryId,
        serviceCategory: catObj.name || activeProProfile.serviceCategory || "",
        specialization: rateCardConfig.specialization,
        visitingFeeInr: Number(rateCardConfig.visitingFee) || 99,
        hourlyRateInr: Number(rateCardConfig.hourlyRate) || 150,
        emergencyFeeInr: Number(rateCardConfig.emergencyFee) || 199,
        rateCardItems: activeProProfile.rateCardItems || []
      }
    };
    try {
      await setServerPartnerAvailability({ partnerId: activeProProfile.id, availabilityRules });
      setServiceProviders((serviceProviders || []).map((sp) => sp.id === activeProProfile.id
        ? { ...nextProfile, availabilityRules } : sp));
      onTriggerToast("Master rate card saved to the WE4ALL server. Service requests remain unpaid.");
    } catch (error) {
      onTriggerToast(error?.message || "Rate card was not saved to the server.");
    }
  };

  const handleAddRateCardTask = () => {
    if (!isPublishedLive || !activeProProfile.id) {
      onTriggerToast("Rate-card editing is locked until your own service-provider account is approved.");
      return;
    }
    if (!newTaskItem.title.trim()) {
      alert("Enter a service task name (e.g. AC Gas Refill, Tap Replacement).");
      return;
    }
    const itemObj = {
      id: `rc_${Date.now()}`,
      title: newTaskItem.title.trim(),
      price: Number(newTaskItem.price) || 199,
      unit: newTaskItem.unit
    };
    const nextItems = [...(activeProProfile.rateCardItems || []), itemObj];
    setServiceProviders(
      serviceProviders.map((sp) =>
        sp.id === activeProProfile.id ? { ...sp, rateCardItems: nextItems } : sp
      )
    );
    setNewTaskItem({ title: "", price: "", unit: "Fixed Job" });
    onTriggerToast(`"${itemObj.title}" added to your local rate-card draft. Customer visibility is pending server sync and approval.`);
  };

  // Printable / Downloadable PDF Escrow & Final Tax Invoice
  const handleDownloadEscrowInvoicePdf = (sb) => {
    const win = window.open("", "_blank", "width=720,height=800");
    if (!win) {
      onTriggerToast("Allow popups to download Service Escrow PDF Invoice.");
      return;
    }
    const visitEscrow = Number(sb.escrowVisitingAmount || sb.visitingFee || 99);
    const extraHrsCost = Number(sb.extraHours || 0) * Number(sb.hourlyRate || 150);
    const partsCost = Number(sb.sparePartsCost || 0);
    const laborCost = Number(sb.repairLaborFee || 0);
    const subTotal = visitEscrow + extraHrsCost + partsCost + laborCost;
    const gst = Number((subTotal * 0.05).toFixed(2));
    const total = Number((subTotal + gst).toFixed(2));

    win.document.write(`
      <html>
        <head>
          <title>Service_Escrow_Invoice_${sb.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            .card { border: 2px solid #4f46e5; border-radius: 12px; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
            th, td { padding: 8px; border: 1px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="margin:0;color:#4f46e5;">WE4ALL SERVICE PROVIDER ESCROW & TAX INVOICE</h2>
            <p style="margin:4px 0;font-size:12px;">
              <strong>Provider:</strong> ${sb.providerName || activeProProfile.providerName} (${activeProProfile.maskedId}) |
              <strong>UPI ID:</strong> ${currentUser?.upiId || "provider@ybl"}
            </p>
            <p style="margin:4px 0;font-size:12px;">
              <strong>Booking ID:</strong> #${sb.id} |
              <strong>Slot:</strong> ${sb.bookedDate || "2026-10-29"} (${sb.bookedSlot}) |
              <strong>Customer:</strong> ${sb.customerName} (${sb.address})
            </p>
            <table>
              <thead>
                <tr style="background:#eef2ff;">
                  <th style="text-align:left;">Service Component</th>
                  <th>Details</th>
                  <th style="text-align:right;">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1. Doorstep Visiting Fee (Escrow Locked)</td>
                  <td>Customer code protected · ${sb.escrowStatus}</td>
                  <td style="text-align:right;">Rs.${visitEscrow}</td>
                </tr>
                <tr>
                  <td>2. Extra Hourly Duration</td>
                  <td>${sb.extraHours || 0} Extra Hr(s) @ Rs.${sb.hourlyRate || 150}/hr</td>
                  <td style="text-align:right;">Rs.${extraHrsCost}</td>
                </tr>
                <tr>
                  <td>3. On-Site Spare Parts Used</td>
                  <td>${sb.sparePartsDesc || "No extra spare parts"}</td>
                  <td style="text-align:right;">Rs.${partsCost}</td>
                </tr>
                <tr>
                  <td>4. Additional Repair / Fitting Labor</td>
                  <td>On-Site Workmanship</td>
                  <td style="text-align:right;">Rs.${laborCost}</td>
                </tr>
              </tbody>
            </table>
            <div style="margin-top:14px;text-align:right;font-size:13px;">
              <p style="margin:3px 0;">Service Subtotal: <strong>Rs.${subTotal}</strong></p>
              <p style="margin:3px 0;">5% Service GST: <strong>Rs.${gst}</strong></p>
              <h3 style="margin:6px 0;color:#4f46e5;">Grand Total Bill: Rs.${total} (${sb.status})</h3>
            </div>
          </div>
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
      {/* TOP PROVIDER STATUS BAR */}
      <div className="bg-slate-900 p-3 rounded-2xl border border-indigo-500/40 flex justify-between items-center gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-black text-indigo-300 text-xs">
              {activeProProfile.providerName}
            </h3>
            {isPublishedLive ? (
              <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[8px] font-black px-1.5 py-0.5 rounded">
                LIVE IN MARKET
              </span>
            ) : (
              <span className="bg-amber-500/20 border border-amber-400 text-amber-300 text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">
                PENDING ADMIN APPROVAL
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400">
            {isPublishedLive
              ? `Visit Escrow: Rs.${activeProProfile.visitingFee} | Hourly: Rs.${activeProProfile.hourlyRate}/hr`
              : "Private to You & Admin until Admin verifies your KYC & T&C Checklist"}
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToPersonalShop}
          className="bg-indigo-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer shrink-0"
        >
          Personal Shop
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: VISITS & GEO HAPPY CODE + SPARE PARTS BILL BUILDER ("home")   */}
      {/* ==================================================================== */}
      {footerTab === "home" && (
        <div className="space-y-2.5">
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-black text-indigo-300 text-xs">
                  1. Scheduled Doorstep Visits ({providerBookings.length})
                </h4>
                <p className="text-[10px] text-slate-400">
                  Verify Geo-Fenced Happy Code to unlock Visiting Fee Escrow & bill spare parts
                </p>
              </div>
              <p className="text-[10px] text-amber-200">New customer visits appear here only after the customer booking service confirms the booking. Test data is not inserted into this live queue.</p>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-300 font-bold">
                Device GPS status (server verification not configured):
              </span>
              <button
                type="button"
                disabled
                className={`px-2.5 py-1 rounded-lg font-black text-[9px] cursor-pointer ${
                  providerInsideGeoFence
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-rose-600 text-white"
                }`}
              >
                {providerInsideGeoFence
                  ? " INSIDE GEO-FENCE (READY)"
                  : " OUTSIDE GEO-FENCE"}
              </button>
            </div>
          </div>

          {providerBookings.length === 0 ? (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center space-y-2">
              <p className="font-bold text-slate-300">No active customer visits in your queue.</p>
              <p className="text-[10px] text-slate-400">
                Tap &ldquo;+ Test Visit&rdquo; above or book a 1-Hr slot from the Customer App Services tab to test live visits!
              </p>
            </div>
          ) : (
            providerBookings.map((sb) => {
              const pForm = partsFormMap[sb.id] || {
                extraHours: sb.extraHours || 0,
                sparePartsDesc: sb.sparePartsDesc || "",
                sparePartsCost: sb.sparePartsCost || 0,
                repairLaborFee: sb.repairLaborFee || 0
              };

              return (
                <div
                  key={sb.id}
                  className="bg-slate-900 p-3 rounded-2xl border border-indigo-500/40 space-y-2.5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-black text-indigo-300">
                        #{sb.id} &bull; {sb.bookedDate || "2026-10-29"} ({sb.bookedSlot})
                      </span>
                      <p className="text-[11px] font-bold text-white mt-0.5">
                        Customer: {sb.customerName} ({sb.address})
                      </p>
                    </div>
                    <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded text-[9px] font-black">
                      Escrow: Rs.{sb.escrowVisitingAmount || sb.visitingFee || 99}
                    </span>
                  </div>

                  {/* Step 1: Geo-Fenced Happy Code Verification */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Escrow Status:</span>
                      <span
                        className={
                          sb.escrowStatus === "RELEASED_TO_PROVIDER_WALLET"
                            ? "text-emerald-400 font-black"
                            : "text-amber-300 font-bold"
                        }
                      >
                        {sb.escrowStatus}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="Server-issued Happy Code (pending integration)"
                        value={happyCodeInputs[sb.id] ?? ""}
                        onChange={(e) =>
                          setHappyCodeInputs({ ...happyCodeInputs, [sb.id]: e.target.value })
                        }
                        className="w-36 bg-slate-900 border border-indigo-400 rounded-xl p-1.5 text-center font-mono text-white"
                      />
                      <button
                        type="button"
                        onClick={() => onTriggerToast("Happy Code verification requires a server-issued, order-bound code and backend confirmation. No escrow state was changed.")}
                        disabled className="flex-1 bg-slate-700 text-slate-300 font-black rounded-xl text-[10px] cursor-not-allowed"
                      >
                        Server verification required
                      </button>
                    </div>
                  </div>

                  {/* Step 2: On-Site Spare Parts & Extra Hours Final Bill Generator */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-indigo-500/30 space-y-2">
                    <p className="text-[10px] font-black text-amber-300">
                      On-Site Spare Parts, Extra Hours & Final Repair Bill Builder:
                    </p>
                    <input
                      type="text"
                      value={pForm.sparePartsDesc}
                      onChange={(e) =>
                        setPartsFormMap({
                          ...partsFormMap,
                          [sb.id]: { ...pForm, sparePartsDesc: e.target.value }
                        })
                      }
                      placeholder="Spare Parts Replaced (e.g. Capacitor, Copper Pipe, MCB)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-[10px]"
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="block text-[9px] text-slate-400">Extra Hours:</label>
                        <input
                          type="number"
                          value={pForm.extraHours}
                          onChange={(e) =>
                            setPartsFormMap({
                              ...partsFormMap,
                              [sb.id]: { ...pForm, extraHours: Number(e.target.value) || 0 }
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-400">Parts Cost (Rs.):</label>
                        <input
                          type="number"
                          value={pForm.sparePartsCost}
                          onChange={(e) =>
                            setPartsFormMap({
                              ...partsFormMap,
                              [sb.id]: { ...pForm, sparePartsCost: Number(e.target.value) || 0 }
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-400">Repair Labor (Rs.):</label>
                        <input
                          type="number"
                          value={pForm.repairLaborFee}
                          onChange={(e) =>
                            setPartsFormMap({
                              ...partsFormMap,
                              [sb.id]: { ...pForm, repairLaborFee: Number(e.target.value) || 0 }
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const baseVisit = Number(sb.escrowVisitingAmount || sb.visitingFee || 99);
                        const extraHrTotal =
                          Number(pForm.extraHours || 0) * Number(sb.hourlyRate || 150);
                        const totalBill =
                          baseVisit +
                          extraHrTotal +
                          Number(pForm.sparePartsCost || 0) +
                          Number(pForm.repairLaborFee || 0);

                        setServiceBookings(
                          serviceBookings.map((b) =>
                            b.id === sb.id
                              ? {
                                  ...b,
                                  extraHours: pForm.extraHours,
                                  sparePartsDesc: pForm.sparePartsDesc || "Standard Consumables",
                                  sparePartsCost: pForm.sparePartsCost,
                                  repairLaborFee: pForm.repairLaborFee,
                                  finalServiceBill: totalBill,
                                  status: "FINAL_BILL_PENDING_CUSTOMER_REVIEW"
                                }
                              : b
                          )
                        );
                        onTriggerToast(
                          `Final estimate ₹${totalBill} saved for customer review in local app state. No payment or escrow was initiated.`
                        );
                      }}
                      className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-black py-2 rounded-xl text-[10px] cursor-pointer"
                    >
                      Save Final Estimate for Customer Review
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: 1-HR SLOTS AVAILABILITY & BOOKING MATRIX ("slots")            */}
      {/* ==================================================================== */}
      {footerTab === "slots" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3 rounded-2xl border border-indigo-500/40 space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-black text-indigo-300 text-xs">
                  2. 1-Hour Slot Availability & Customer Booking Matrix
                </h4>
                <p className="text-[10px] text-slate-400">
                  Tap any slot to toggle Available / Off-Duty. Customer bookings lock the slot automatically.
                </p>
              </div>
              <input
                type="date"
                value={selectedSlotDate}
                onChange={(e) => setSelectedSlotDate(e.target.value)}
                className="bg-slate-950 border border-indigo-400 rounded-xl p-1.5 text-white text-[10px] font-bold"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="bg-emerald-950/50 border border-emerald-500/40 p-2 rounded-xl">
                <p className="text-slate-400 text-[9px]">Available Slots</p>
                <p className="font-black text-emerald-400 text-sm">
                  {(activeProProfile.availableSlots || []).length}
                </p>
              </div>
              <div className="bg-amber-950/50 border border-amber-500/40 p-2 rounded-xl">
                <p className="text-slate-400 text-[9px]">Booked Today</p>
                <p className="font-black text-amber-300 text-sm">
                  {providerBookings.filter((b) => !b.bookedDate || b.bookedDate === selectedSlotDate).length}
                </p>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl">
                <p className="text-slate-400 text-[9px]">Off-Duty Slots</p>
                <p className="font-black text-rose-400 text-sm">
                  {(MASTER_ONE_HOUR_SLOTS || []).length - (activeProProfile.availableSlots || []).length}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!isPublishedLive || !activeProProfile.id}
                onClick={() => {
                  if (!isPublishedLive || !activeProProfile.id) return;
                  setServiceProviders(
                    serviceProviders.map((sp) =>
                      sp.id === activeProProfile.id
                        ? { ...sp, availableSlots: [...MASTER_ONE_HOUR_SLOTS] }
                        : sp
                    )
                  );
                  onTriggerToast("All 11 one-hour slots updated in the device's saved state. Server availability sync is not confirmed.");
                }}
                className="flex-1 bg-emerald-400 text-slate-950 font-black py-1.5 rounded-xl text-[10px] cursor-pointer"
              >
                Enable All 1-Hr Slots
              </button>
              <button
                type="button"
                disabled={!isPublishedLive || !activeProProfile.id}
                onClick={() => {
                  if (!isPublishedLive || !activeProProfile.id) return;
                  setServiceProviders(
                    serviceProviders.map((sp) =>
                      sp.id === activeProProfile.id ? { ...sp, availableSlots: [] } : sp
                    )
                  );
                  onTriggerToast("All slots blocked in the device's saved state. Server availability sync is not confirmed.");
                }}
                className="bg-slate-800 text-rose-300 font-bold px-3 py-1.5 rounded-xl text-[10px] cursor-pointer"
              >
                Mark Off-Duty
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {MASTER_ONE_HOUR_SLOTS.map((slotLabel) => {
              const isEnabled = (activeProProfile.availableSlots || []).includes(slotLabel);
              const bookingForSlot = providerBookings.find(
                (b) =>
                  b.bookedSlot === slotLabel &&
                  (!b.bookedDate || b.bookedDate === selectedSlotDate)
              );

              return (
                <div
                  key={slotLabel}
                  onClick={() => {
                    if (bookingForSlot) {
                      setFooterTab("home");
                      onTriggerToast(`Opened Visit #${bookingForSlot.id} for ${slotLabel}`);
                      return;
                    }
                    handleToggleSlotAvailability(slotLabel);
                  }}
                  className={`p-2.5 rounded-2xl border flex justify-between items-center cursor-pointer transition ${
                    bookingForSlot
                      ? "bg-amber-950/40 border-amber-400"
                      : isEnabled
                      ? "bg-slate-900 border-emerald-500/40 hover:border-emerald-400"
                      : "bg-slate-950 border-slate-800 opacity-65"
                  }`}
                >
                  <div>
                    <p className="font-black text-white text-[11px]">
                       {slotLabel}
                    </p>
                    {bookingForSlot ? (
                      <p className="text-[10px] text-amber-300 font-bold">
                        BOOKED: {bookingForSlot.customerName} ({bookingForSlot.address}) &bull; Tap to View Visit
                      </p>
                    ) : (
                      <p className="text-[9px] text-slate-400">
                        {isEnabled
                          ? `Open for Customer Booking (Visit Fee: Rs.${activeProProfile.visitingFee})`
                          : "Off-Duty / Slot Blocked by Provider"}
                      </p>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl font-black text-[9px] shrink-0 ${
                      bookingForSlot
                        ? "bg-amber-400 text-slate-950"
                        : isEnabled
                        ? "bg-emerald-400 text-slate-950"
                        : "bg-slate-800 text-rose-300"
                    }`}
                  >
                    {bookingForSlot
                      ? "BOOKED "
                      : isEnabled
                      ? "AVAILABLE"
                      : "OFF-DUTY"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: RATE CARD & SERVICE CATALOG BUILDER ("add_service")           */}
      {/* ==================================================================== */}
      {footerTab === "add_service" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-indigo-500/40 space-y-2.5">
            <h4 className="font-black text-indigo-300 text-xs">
              3. Service Provider Master Rate Card & Consort Rules
            </h4>

            <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <img
                src={
                  rateCardConfig.workImage ||
                  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=80"
                }
                alt="Work Portfolio"
                className="w-14 h-14 rounded-xl object-cover border border-indigo-400 shrink-0"
              />
              <div className="flex-1">
                <p className="font-bold text-white text-[11px]">Service Work Portfolio Photo</p>
                <p className="text-[9px] text-slate-400">
                  Shown to customers when booking your 1-hour slots
                </p>
                <label className="inline-block mt-1 bg-indigo-500 text-white font-black px-2.5 py-1 rounded-lg text-[9px] cursor-pointer">
                  Upload Work Image (.jpg/.png)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWorkPhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <select
              value={rateCardConfig.serviceCategoryId}
              onChange={(e) =>
                setRateCardConfig({ ...rateCardConfig, serviceCategoryId: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
            >
              {(serviceCategories || []).map((sc) => (
                <option key={sc.id} value={sc.id}>
                  Category: {sc.icon} {sc.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={rateCardConfig.specialization}
              onChange={(e) =>
                setRateCardConfig({ ...rateCardConfig, specialization: e.target.value })
              }
              placeholder="Specialization (e.g. Split AC Repair, House Wiring, Motor Fix)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />

            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="block text-[9px] text-slate-400">Visiting Fee (Escrow):</label>
                <input
                  type="number"
                  value={rateCardConfig.visitingFee}
                  onChange={(e) =>
                    setRateCardConfig({ ...rateCardConfig, visitingFee: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl p-2 text-emerald-300 font-black mt-0.5"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400">Hourly Rate (Rs./hr):</label>
                <input
                  type="number"
                  value={rateCardConfig.hourlyRate}
                  onChange={(e) =>
                    setRateCardConfig({ ...rateCardConfig, hourlyRate: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-indigo-400/50 rounded-xl p-2 text-indigo-300 font-black mt-0.5"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400">Emergency Visit:</label>
                <input
                  type="number"
                  value={rateCardConfig.emergencyFee}
                  onChange={(e) =>
                    setRateCardConfig({ ...rateCardConfig, emergencyFee: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-amber-400/50 rounded-xl p-2 text-amber-300 font-black mt-0.5"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={rateCardConfig.consortRulesAccepted}
                onChange={(e) =>
                  setRateCardConfig({
                    ...rateCardConfig,
                    consortRulesAccepted: e.target.checked
                  })
                }
                className="mt-0.5"
              />
              <span className="text-[10px] text-slate-300">
                I agree to WE4ALL Service Consort Rules: Visiting Fee is held in Escrow until Geo-Fenced Happy Code verification, and spare parts are billed transparently.
              </span>
            </label>

            <button
              type="button"
              onClick={handleSaveMasterRateCard}
              className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer shadow"
            >
              Save Master Visiting & Hourly Rates
            </button>
          </div>

          {/* Itemized Task Rate Card Builder */}
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
            <h4 className="font-black text-amber-400 text-xs">
              Itemized Task Rate Card ({(activeProProfile.rateCardItems || []).length} Tasks)
            </h4>
            <div className="grid grid-cols-3 gap-1.5">
              <input
                type="text"
                value={newTaskItem.title}
                onChange={(e) => setNewTaskItem({ ...newTaskItem, title: e.target.value })}
                placeholder="Task (e.g. Fan Regulator Fix)"
                className="col-span-2 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <input
                type="number"
                value={newTaskItem.price}
                onChange={(e) => setNewTaskItem({ ...newTaskItem, price: e.target.value })}
                placeholder="Rate (Rs.)"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleAddRateCardTask}
              className="w-full bg-indigo-500 text-white font-black py-2 rounded-xl cursor-pointer"
            >
              + Add Task to Public Rate Card
            </button>

            <div className="space-y-1.5 pt-1">
              {(activeProProfile.rateCardItems || []).map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-white text-[11px]">{item.title}</p>
                    <p className="text-[9px] text-slate-400">{item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-400">Rs.{item.price}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = (activeProProfile.rateCardItems || []).filter(
                          (x) => x.id !== item.id
                        );
                        setServiceProviders(
                          serviceProviders.map((sp) =>
                            sp.id === activeProProfile.id
                              ? { ...sp, rateCardItems: filtered }
                              : sp
                          )
                        );
                      }}
                      className="bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded text-[9px] cursor-pointer"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: ESCROW BILLS & TAX INVOICE LEDGER ("orders")                  */}
      {/* ==================================================================== */}
      {footerTab === "orders" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3 rounded-2xl border border-indigo-500/40 space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-black text-indigo-300 text-xs">
                  4. Service Provider Escrow Bills & PDF Tax Ledger
                </h4>
                <p className="text-[10px] text-slate-400">
                  Tracks Visiting Escrow, Spare Parts Bills, 5% GST & PDF Statements
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (providerBookings.length === 0) {
                    alert("No service bookings yet. Tap '+ Test Visit' in the Visits tab first!");
                    return;
                  }
                  handleDownloadEscrowInvoicePdf(providerBookings[0]);
                }}
                className="bg-emerald-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer"
              >
                Export PDF Statement
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={billPeriodFilter}
                onChange={(e) => setBillPeriodFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white font-bold text-[10px]"
              >
                <option value="ALL">Period: All Bookings</option>
                <option value="TODAY">Period: Today</option>
                <option value="WEEK">Period: This Week</option>
                <option value="MONTH">Period: This Month</option>
              </select>
              <select
                value={billStatusFilter}
                onChange={(e) => setBillStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white font-bold text-[10px]"
              >
                <option value="ALL">Status: All Escrow Bills</option>
                <option value="RELEASED">Status: Escrow Released / Paid</option>
                <option value="HELD">Status: Held in Escrow</option>
              </select>
            </div>

            {(() => {
              const filtered = providerBookings.filter((b) => {
                if (billPeriodFilter !== "ALL" && b.periodTag && b.periodTag !== billPeriodFilter) {
                  return false;
                }
                if (
                  billStatusFilter === "RELEASED" &&
                  b.escrowStatus !== "RELEASED_TO_PROVIDER_WALLET" &&
                  b.status !== "SERVICE_PAID_COMPLETED"
                ) {
                  return false;
                }
                if (
                  billStatusFilter === "HELD" &&
                  b.escrowStatus === "RELEASED_TO_PROVIDER_WALLET"
                ) {
                  return false;
                }
                return true;
              });

              const totalGross = filtered.reduce(
                (s, b) =>
                  s + Number(b.finalServiceBill || b.escrowVisitingAmount || b.visitingFee || 99),
                0
              );
              const gstTotal = Number((totalGross * 0.05).toFixed(2));
              const netProvider = Number((totalGross - gstTotal).toFixed(2));

              return (
                <>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-400">Gross Service Bills</p>
                      <p className="font-black text-emerald-400 text-xs">
                        Rs.{totalGross.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-400">5% GST Ledger</p>
                      <p className="font-black text-amber-300 text-xs">
                        Rs.{gstTotal.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-400">Net Provider Payout</p>
                      <p className="font-black text-indigo-300 text-xs">
                        Rs.{netProvider.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {(filtered || []).length === 0 ? (
                      <p className="text-center text-slate-400 py-4 text-[11px]">
                        No escrow bills found for this filter. Tap &ldquo;+ Test Visit&rdquo; in Tab 1 to generate a live booking!
                      </p>
                    ) : (
                      filtered.map((sb) => {
                        const billAmt =
                          sb.finalServiceBill || sb.escrowVisitingAmount || sb.visitingFee || 99;
                        return (
                          <div
                            key={sb.id}
                            className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center gap-2"
                          >
                            <div>
                              <p className="font-bold text-white text-[11px]">
                                #{sb.id} &bull; {sb.customerName} ({sb.bookedSlot})
                              </p>
                              <p className="text-[9px] text-slate-400">
                                Escrow: {sb.escrowStatus} | Parts: Rs.{sb.sparePartsCost || 0} | Total:{" "}
                                <strong className="text-emerald-400">Rs.{billAmt}</strong>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownloadEscrowInvoicePdf(sb)}
                              className="bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-lg text-[9px] cursor-pointer shrink-0"
                            >
                              PDF Invoice
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}