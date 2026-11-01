import React, { useState } from "react";
import { getGeoSlangConfig } from "./i18n/indianLanguages";

export const LABOUR_SKILL_CATEGORIES = [
  {
    id: "mason_mistri",
    name: "Mason / Gavandi (Brick & Plastering)",
    defaultFullDay: 900,
    defaultHalfDay: 500,
    contractUnit: "Rs.22 / Sq.Ft",
    toolsDefault: "Trowel (Thapi), Plumb Bob ( Gundu), Spirit Level, Pan"
  },
  {
    id: "daily_helper",
    name: "Daily Wage Helper / Kooli / Chithaal / Bigari",
    defaultFullDay: 550,
    defaultHalfDay: 300,
    contractUnit: "Rs.550 / Day",
    toolsDefault: "Spade (Phawda), Mortar Pan (Ghamela / Thatti)"
  },
  {
    id: "hamali_loading",
    name: "Hamali / Mathadi / Loadman (Loading & Shifting)",
    defaultFullDay: 700,
    defaultHalfDay: 400,
    contractUnit: "Rs.12 / Bag or Quintal",
    toolsDefault: "Back Pad, Hooks & Hand Trolley"
  },
  {
    id: "centring_barbender",
    name: "Centring, Shuttering & Sarya / Bar-Bending",
    defaultFullDay: 950,
    defaultHalfDay: 550,
    contractUnit: "Rs.18 / Sq.Ft Slab",
    toolsDefault: "Bar Bender Lever, Hammer, Pliers"
  },
  {
    id: "tiles_painter",
    name: "Tiles, Farsi, Granite & Rangula / Painting",
    defaultFullDay: 850,
    defaultHalfDay: 500,
    contractUnit: "Rs.16 / Sq.Ft",
    toolsDefault: "Tile Cutter Machine, Rollers & Brushes"
  },
  {
    id: "farm_harvest",
    name: "Agricultural / Cotton Picking & Farm Toli",
    defaultFullDay: 500,
    defaultHalfDay: 280,
    contractUnit: "Rs.10 / Kg Cotton or Acre Contract",
    toolsDefault: "Harvest Bags, Sickle & Sprayer"
  }
];

export const INITIAL_LABOUR_WORKERS = [
  {
    id: "LAB-101",
    workerName: "Mallesh & Team",
    phone: "9848066112",
    skillId: "mason_mistri",
    workerType: "MISTRI_TOLI",
    toliCount: 5,
    experienceYrs: 9,
    addaLocation: "Old Bus Stand Adda",
    fullDayWage: 900,
    halfDayWage: 500,
    helperDailyWage: 550,
    hasOwnTools: true,
    toolsList: "Trowel (Thapi), Spirit Level, Laser Plumb, 4 Pans",
    requiresAddaPickup: false,
    teaBhattaExpected: true,
    rating: 4.9,
    jobsCompleted: 142,
    isAvailableToday: true
  },
  {
    id: "LAB-102",
    workerName: "Bheemrao Gang (6 Loaders)",
    phone: "9848066223",
    skillId: "hamali_loading",
    workerType: "MISTRI_TOLI",
    toliCount: 6,
    experienceYrs: 7,
    addaLocation: "Market Yard / Gunj Stand",
    fullDayWage: 700,
    halfDayWage: 400,
    helperDailyWage: 650,
    hasOwnTools: true,
    toolsList: "Heavy Rope, Hooks, Sack Trolleys",
    requiresAddaPickup: true,
    teaBhattaExpected: true,
    rating: 4.8,
    jobsCompleted: 215,
    isAvailableToday: true
  },
  {
    id: "LAB-103",
    workerName: "Raju & Shankar",
    phone: "9848066334",
    skillId: "daily_helper",
    workerType: "INDIVIDUAL",
    toliCount: 2,
    experienceYrs: 4,
    addaLocation: "Collectorate Chowk Stand",
    fullDayWage: 550,
    halfDayWage: 300,
    helperDailyWage: 550,
    hasOwnTools: true,
    toolsList: "2 Spades (Phawda), 2 Pans (Ghamela), Crowbar",
    requiresAddaPickup: false,
    teaBhattaExpected: true,
    rating: 4.9,
    jobsCompleted: 98,
    isAvailableToday: true
  },
  {
    id: "LAB-104",
    workerName: "Laxmi Bai Harvest Group (10 Workers)",
    phone: "9848066445",
    skillId: "farm_harvest",
    workerType: "MISTRI_TOLI",
    toliCount: 10,
    experienceYrs: 8,
    addaLocation: "Bypass Cross Road Stand",
    fullDayWage: 500,
    halfDayWage: 280,
    helperDailyWage: 500,
    hasOwnTools: true,
    toolsList: "Harvesting Aprons & Sickles",
    requiresAddaPickup: true,
    teaBhattaExpected: true,
    rating: 5.0,
    jobsCompleted: 180,
    isAvailableToday: true
  }
];

export default function LabourWorksitePortal({
  footerTab,
  setFooterTab,
  currentUser,
  geoRegion = "TELANGANA",
  labourWorkers = [],
  setLabourWorkers = () => {},
  labourBookings = [],
  setLabourBookings = () => {},
  onSwitchToPersonalShop,
  onTriggerToast,
  renderAccountTab
}) {
  const geoSlang = getGeoSlangConfig(geoRegion);

  const [availableAtAdda, setAvailableAtAdda] = useState(true);
  const [mySkillId, setMySkillId] = useState("mason_mistri");
  const [myWorkerMode, setMyWorkerMode] = useState("MISTRI_TOLI");
  const [myToliSize, setMyToliSize] = useState(4);
  const [myFullDayRate, setMyFullDayRate] = useState(900);
  const [myHalfDayRate, setMyHalfDayRate] = useState(500);
  const [myHelperRate, setMyHelperRate] = useState(550);
  const [bringOwnTools, setBringOwnTools] = useState(true);
  const [myToolsDesc, setMyToolsDesc] = useState(
    "Trowel (Thapi), Plumb Bob, Spirit Level, Cutter & 4 Pans"
  );
  const [needTransportPickup, setNeedTransportPickup] = useState(false);
  const [otpInputs, setOtpInputs] = useState({});

  if (footerTab === "account") {
    return renderAccountTab();
  }

  const getLocalSkillTitle = (skillId) => {
    return (
      geoSlang?.labourRoles?.[skillId] ||
      LABOUR_SKILL_CATEGORIES.find((s) => s.id === skillId)?.name ||
      "Skilled Worker"
    );
  };

  const activeJobs = (labourBookings || []).filter(
    (b) => b.status !== "WAGE_SETTLED_COMPLETED"
  );
  const completedJobs = (labourBookings || []).filter(
    (b) => b.status === "WAGE_SETTLED_COMPLETED"
  );

  const handleSimulateWorksiteCall = () => {
    const localSkillName = getLocalSkillTitle(mySkillId);
    const startOtp = String(Math.floor(1000 + Math.random() * 9000));
    const releaseOtp = String(Math.floor(1000 + Math.random() * 9000));
    const totalWage =
      myWorkerMode === "MISTRI_TOLI"
        ? myFullDayRate + Math.max(0, myToliSize - 1) * myHelperRate
        : myFullDayRate;

    const simJob = {
      id: `WRK-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: "KVR Builders / Local Site Owner",
      siteAddress: "Plot 42, Subhash Nagar Site",
      skillNeeded: localSkillName,
      shiftType: "Full-Day Shift (09:00 AM - 05:30 PM)",
      hiringMode:
        myWorkerMode === "MISTRI_TOLI"
          ? `${geoSlang.groupSlang} (${myToliSize} Workers)`
          : "Individual Worker (1 Person)",
      workersCount: myWorkerMode === "MISTRI_TOLI" ? myToliSize : 1,
      toolsRequirement: bringOwnTools
        ? "Bring Own Hand Tools"
        : "Tools Provided at Site",
      transportNote: needTransportPickup
        ? `3W Auto Pickup from ${geoSlang.standSlang}`
        : "Direct Reach to Site",
      teaBhattaNote: `2x Site Tea (${geoSlang.bhattaSlang}) Included`,
      totalDailyWage: totalWage,
      startWorkOtp: startOtp,
      wageReleaseOtp: releaseOtp,
      status: "OPEN_SITE_CALL",
      createdAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    };
    setLabourBookings([simJob, ...labourBookings]);
    onTriggerToast(
      `New Site Call #${simJob.id} (${localSkillName} - Rs.${totalWage}) received!`
    );
  };

  return (
    <div className="space-y-3 text-xs text-white">
      {/* TOP GEO-LOCAL LABOUR STAND BANNER */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border-2 border-amber-400/60 space-y-2">
        <div className="flex flex-wrap justify-between items-start gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[9px]">
                {geoSlang.stateName.toUpperCase()}
              </span>
              <h3 className="font-black text-amber-300 text-sm">
                {geoSlang.standSlang} &amp; {geoSlang.groupSlang} Hub
              </h3>
            </div>
            <p className="text-[10px] text-slate-300 mt-0.5">
              Active Local Roles: {geoSlang.labourRoles.mason_mistri} |{" "}
              {geoSlang.labourRoles.daily_helper}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleSimulateWorksiteCall}
              className="bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer"
            >
              + Test Site Call
            </button>
            <button
              type="button"
              onClick={onSwitchToPersonalShop}
              className="bg-emerald-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer"
            >
              Mega Market
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-200">
            {availableAtAdda
              ? `LIVE AT ${geoSlang.standSlang.toUpperCase()} (READY FOR SITE WORK)`
              : "BOOKED ON SITE TODAY (PAUSED)"}
          </span>
          <button
            type="button"
            onClick={() => setAvailableAtAdda(!availableAtAdda)}
            className={`px-3 py-1 rounded-lg font-black text-[9px] cursor-pointer ${
              availableAtAdda
                ? "bg-emerald-400 text-slate-950"
                : "bg-rose-600 text-white"
            }`}
          >
            {availableAtAdda ? "Mark Booked" : "Go Available"}
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE SITE CALLS */}
      {footerTab === "home" && (
        <div className="space-y-2.5">
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <h4 className="font-black text-amber-400 text-xs">
              1. Live Work-Site Calls at {geoSlang.standSlang} ({activeJobs.length})
            </h4>
          </div>

          {activeJobs.length === 0 ? (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center space-y-2">
              <p className="font-bold text-slate-300">
                No active work-site calls right now.
              </p>
              <button
                type="button"
                onClick={handleSimulateWorksiteCall}
                className="bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-[10px] cursor-pointer"
              >
                + Simulate Work-Site Call ({getLocalSkillTitle(mySkillId)})
              </button>
            </div>
          ) : (
            activeJobs.map((job) => (
              <div
                key={job.id}
                className="bg-slate-900 p-3.5 rounded-2xl border-2 border-emerald-500/50 space-y-2"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded">
                      {job.shiftType} | {job.workersCount} WORKER(S)
                    </span>
                    <h5 className="font-black text-white text-xs mt-1">
                      #{job.id} | {job.skillNeeded}
                    </h5>
                    <p className="text-[10px] text-slate-300">
                      Booked By: <strong>{job.customerName}</strong>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-emerald-400 text-sm block">
                      Rs.{job.totalDailyWage}
                    </span>
                    <span className="text-[9px] text-amber-300 font-bold">
                      {job.status}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] space-y-1">
                  <p>
                    <strong className="text-amber-300">Site Location:</strong>{" "}
                    {job.siteAddress}
                  </p>
                  <p>
                    <strong className="text-teal-300">Group / Mode:</strong>{" "}
                    {job.hiringMode} | <strong>Tools:</strong>{" "}
                    {job.toolsRequirement}
                  </p>
                  <p>
                    <strong className="text-indigo-300">Site Perks:</strong>{" "}
                    {job.transportNote} | {job.teaBhattaNote}
                  </p>
                </div>

                {job.status === "OPEN_SITE_CALL" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLabourBookings(
                        labourBookings.map((b) =>
                          b.id === job.id
                            ? { ...b, status: "ACCEPTED_EN_ROUTE_TO_SITE" }
                            : b
                        )
                      );
                      setFooterTab("muster");
                      onTriggerToast(
                        `Accepted Site Call #${job.id}! Open Muster Roll to verify Morning OTP.`
                      );
                    }}
                    className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer shadow"
                  >
                    Accept Site Call (Rs.{job.totalDailyWage}) &amp; Open Muster Roll
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFooterTab("muster")}
                    className="w-full bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                  >
                    Open 3. Muster Roll &amp; Verify Site OTP
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: GEO-SLANG SKILL, TOLI SIZE & TOOLS */}
      {footerTab === "skills" && (
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-emerald-500/40 space-y-3">
          <h4 className="font-black text-emerald-400 text-xs">
            2. Local Role, {geoSlang.groupSlang} Size &amp; Daily Wage Card
          </h4>

          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1">
              Select Local Trade / Work Role ({geoSlang.stateName}):
            </label>
            <select
              value={mySkillId}
              onChange={(e) => {
                const nextId = e.target.value;
                setMySkillId(nextId);
                const found = LABOUR_SKILL_CATEGORIES.find(
                  (s) => s.id === nextId
                );
                if (found) {
                  setMyFullDayRate(found.defaultFullDay);
                  setMyHalfDayRate(found.defaultHalfDay);
                  setMyToolsDesc(found.toolsDefault);
                }
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
            >
              {LABOUR_SKILL_CATEGORIES.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {getLocalSkillTitle(sc.id)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMyWorkerMode("INDIVIDUAL");
                setMyToliSize(1);
              }}
              className={`p-2 rounded-xl border font-black cursor-pointer ${
                myWorkerMode === "INDIVIDUAL"
                  ? "bg-emerald-400 text-slate-950 border-white"
                  : "bg-slate-950 text-slate-300 border-slate-800"
              }`}
            >
              Single Worker (1 Person)
            </button>
            <button
              type="button"
              onClick={() => {
                setMyWorkerMode("MISTRI_TOLI");
                setMyToliSize(5);
              }}
              className={`p-2 rounded-xl border font-black cursor-pointer ${
                myWorkerMode === "MISTRI_TOLI"
                  ? "bg-amber-400 text-slate-950 border-white"
                  : "bg-slate-950 text-slate-300 border-slate-800"
              }`}
            >
              {geoSlang.groupSlang} (Group)
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] text-slate-400">
                Full-Day Wage (Rs.):
              </label>
              <input
                type="number"
                value={myFullDayRate}
                onChange={(e) =>
                  setMyFullDayRate(Number(e.target.value) || 500)
                }
                className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl p-2 text-emerald-300 font-black mt-0.5"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400">
                Half-Day Wage (Rs.):
              </label>
              <input
                type="number"
                value={myHalfDayRate}
                onChange={(e) =>
                  setMyHalfDayRate(Number(e.target.value) || 300)
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold mt-0.5"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400">
                Group Size:
              </label>
              <input
                type="number"
                min={1}
                max={25}
                value={myToliSize}
                onChange={(e) =>
                  setMyToliSize(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-full bg-slate-950 border border-amber-400/50 rounded-xl p-2 text-amber-300 font-black mt-0.5"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const localSkillName = getLocalSkillTitle(mySkillId);
              const newCard = {
                id: `LAB-${Date.now()}`,
                workerName: currentUser?.fullName || "Verified Mistri & Team",
                phone: currentUser?.phone || "9848011223",
                skillId: mySkillId,
                skillLabel: localSkillName,
                workerType: myWorkerMode,
                toliCount: myToliSize,
                experienceYrs: 6,
                addaLocation: geoSlang.standSlang,
                fullDayWage: myFullDayRate,
                halfDayWage: myHalfDayRate,
                helperDailyWage: myHelperRate,
                hasOwnTools: bringOwnTools,
                toolsList: myToolsDesc,
                requiresAddaPickup: needTransportPickup,
                teaBhattaExpected: true,
                rating: 5.0,
                jobsCompleted: 12,
                isAvailableToday: true
              };
              setLabourWorkers([newCard, ...labourWorkers]);
              onTriggerToast(
                `Published ${newCard.workerName} (${localSkillName}) live to ${geoSlang.standSlang}!`
              );
            }}
            className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
          >
            Publish My Rate Card Live to {geoSlang.standSlang}
          </button>
        </div>
      )}

      {/* TAB 3: MUSTER ROLL & SITE ATTENDANCE OTP */}
      {footerTab === "muster" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3 rounded-2xl border border-amber-500/40">
            <h4 className="font-black text-amber-400 text-xs">
              3. Site Muster Roll (Morning Reporting OTP &amp; Evening Wage OTP)
            </h4>
          </div>
          {activeJobs.map((job) => {
            const sOtp = job.startWorkOtp || "1122";
            const rOtp = job.wageReleaseOtp || "8899";
            return (
              <div
                key={job.id}
                className="bg-slate-900 p-3.5 rounded-2xl border border-teal-500/40 space-y-2.5"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-emerald-400">
                    #{job.id} | {job.skillNeeded}
                  </span>
                  <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black text-[9px]">
                    Wage: Rs.{job.totalDailyWage}
                  </span>
                </div>
                {job.status !== "WORK_IN_PROGRESS_ON_SITE" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLabourBookings(
                        labourBookings.map((b) =>
                          b.id === job.id
                            ? {
                                ...b,
                                status: "WORK_IN_PROGRESS_ON_SITE",
                                checkedInAt: new Date().toLocaleTimeString()
                              }
                            : b
                        )
                      );
                      onTriggerToast(
                        `Morning Attendance OTP (${sOtp}) Verified!`
                      );
                    }}
                    className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                  >
                    Verify Morning Start OTP ({sOtp}) &amp; Begin Work
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder={`OTP (${rOtp})`}
                      value={otpInputs[job.id] || ""}
                      onChange={(e) =>
                        setOtpInputs({
                          ...otpInputs,
                          [job.id]: e.target.value
                        })
                      }
                      className="w-28 bg-slate-950 border border-amber-400 rounded-xl p-2 text-center font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLabourBookings(
                          labourBookings.map((b) =>
                            b.id === job.id
                              ? {
                                  ...b,
                                  status: "WAGE_SETTLED_COMPLETED",
                                  completedAt: new Date().toLocaleTimeString()
                                }
                              : b
                          )
                        );
                        setFooterTab("orders");
                        onTriggerToast(
                          `Evening OTP (${rOtp}) Verified! Rs.${job.totalDailyWage} settled.`
                        );
                      }}
                      className="flex-1 bg-amber-400 text-slate-950 font-black rounded-xl text-[10px] cursor-pointer"
                    >
                      Verify Evening OTP ({rOtp}) &amp; Settle Wage
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: WAGE LEDGER */}
      {footerTab === "orders" && (
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-emerald-500/40 space-y-2">
          <h4 className="font-black text-emerald-400 text-xs">
            4. Daily Wage &amp; {geoSlang.groupSlang} Payout Ledger ({completedJobs.length})
          </h4>
          {completedJobs.map((cj) => (
            <div
              key={cj.id}
              className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-white">
                  #{cj.id} | {cj.skillNeeded}
                </p>
                <p className="text-[10px] text-slate-400">
                  {cj.siteAddress} | Settled at {cj.completedAt}
                </p>
              </div>
              <span className="font-black text-emerald-400 text-xs">
                +Rs.{cj.totalDailyWage}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}