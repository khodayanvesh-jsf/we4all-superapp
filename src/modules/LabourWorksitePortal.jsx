import React, { useState } from "react";

export const LABOUR_SKILL_CATEGORIES = [
  {
    id: "mason_mistri",
    name: "Mason / Gavandi (Brick & Plastering)",
    defaultFullDay: 900,
    defaultHalfDay: 500,
    contractUnit: "Rs.22 / Sq.Ft",
    toolsDefault: "Trowel, Plumb Bob, Spirit Level, Pan"
  },
  {
    id: "daily_helper",
    name: "Daily Wage Helper / Coolie (Site & General)",
    defaultFullDay: 550,
    defaultHalfDay: 300,
    contractUnit: "Rs.550 / Day",
    toolsDefault: "Spade (Phawda), Mortar Pan (Ghamela)"
  },
  {
    id: "hamali_loading",
    name: "Hamali / Mandi Loading, Unloading & Shifting",
    defaultFullDay: 700,
    defaultHalfDay: 400,
    contractUnit: "Rs.12 / Bag or Quintal",
    toolsDefault: "Back Pad, Hooks & Hand Trolley"
  },
  {
    id: "centring_barbender",
    name: "Centring, Shuttering & Steel Bar-Bending",
    defaultFullDay: 950,
    defaultHalfDay: 550,
    contractUnit: "Rs.18 / Sq.Ft Slab",
    toolsDefault: "Bar Bender Lever, Hammer, Pliers"
  },
  {
    id: "tiles_painter",
    name: "Tiles, Granite Fitting, Putty & Painting",
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
    workerName: "Mallesh Gavandi & Team",
    phone: "9848066112",
    skillId: "mason_mistri",
    skillLabel: "Mason / Gavandi (Brick & Plastering)",
    workerType: "MISTRI_TOLI",
    toliCount: 5,
    experienceYrs: 9,
    addaLocation: "Old Bus Stand Labour Adda, Adilabad",
    fullDayWage: 900,
    halfDayWage: 500,
    helperDailyWage: 550,
    hasOwnTools: true,
    toolsList: "Trowel, Spirit Level, Laser Plumb, 4 Pans",
    requiresAddaPickup: false,
    teaBhattaExpected: true,
    rating: 4.9,
    jobsCompleted: 142,
    isAvailableToday: true
  },
  {
    id: "LAB-102",
    workerName: "Bheemrao Hamali Gang (6 Strong Loaders)",
    phone: "9848066223",
    skillId: "hamali_loading",
    skillLabel: "Hamali / Mandi Loading, Unloading & Shifting",
    workerType: "MISTRI_TOLI",
    toliCount: 6,
    experienceYrs: 7,
    addaLocation: "Cotton Market Yard / Gunj Adda, Adilabad",
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
    workerName: "Raju & Shankar (Daily Site Helpers)",
    phone: "9848066334",
    skillId: "daily_helper",
    skillLabel: "Daily Wage Helper / Coolie (Site & General)",
    workerType: "INDIVIDUAL",
    toliCount: 2,
    experienceYrs: 4,
    addaLocation: "Collectorate Chowk Adda, Adilabad",
    fullDayWage: 550,
    halfDayWage: 300,
    helperDailyWage: 550,
    hasOwnTools: true,
    toolsDefault: "Spade & Ghamela",
    toolsList: "2 Spades, 2 Pans, Crowbar",
    requiresAddaPickup: false,
    teaBhattaExpected: true,
    rating: 4.9,
    jobsCompleted: 98,
    isAvailableToday: true
  },
  {
    id: "LAB-104",
    workerName: "Laxmi Bai Farm Harvest Toli (10 Workers)",
    phone: "9848066445",
    skillId: "farm_harvest",
    skillLabel: "Agricultural / Cotton Picking & Farm Toli",
    workerType: "MISTRI_TOLI",
    toliCount: 10,
    experienceYrs: 8,
    addaLocation: "Dasnapur Cross Road Adda, Adilabad",
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
  labourWorkers = [],
  setLabourWorkers = () => {},
  labourBookings = [],
  setLabourBookings = () => {},
  onSwitchToPersonalShop,
  onTriggerToast,
  renderAccountTab
}) {
  const [availableAtAdda, setAvailableAtAdda] = useState(true);
  const [mySkillId, setMySkillId] = useState("mason_mistri");
  const [myWorkerMode, setMyWorkerMode] = useState("MISTRI_TOLI");
  const [myToliSize, setMyToliSize] = useState(4);
  const [myFullDayRate, setMyFullDayRate] = useState(900);
  const [myHalfDayRate, setMyHalfDayRate] = useState(500);
  const [myHelperRate, setMyHelperRate] = useState(550);
  const [bringOwnTools, setBringOwnTools] = useState(true);
  const [myToolsDesc, setMyToolsDesc] = useState(
    "Trowel, Plumb Bob, Spirit Level, Cutter & 4 Pans"
  );
  const [needTransportPickup, setNeedTransportPickup] = useState(false);
  const [addaStandName, setAddaStandName] = useState(
    "Old Bus Stand Labour Adda, Adilabad"
  );
  const [otpInputs, setOtpInputs] = useState({});

  if (footerTab === "account") {
    return renderAccountTab();
  }

  const activeJobs = (labourBookings || []).filter(
    (b) => b.status !== "WAGE_SETTLED_COMPLETED"
  );
  const completedJobs = (labourBookings || []).filter(
    (b) => b.status === "WAGE_SETTLED_COMPLETED"
  );

  const handleSimulateWorksiteCall = () => {
    const skillObj =
      LABOUR_SKILL_CATEGORIES.find((s) => s.id === mySkillId) ||
      LABOUR_SKILL_CATEGORIES[0];
    const startOtp = String(Math.floor(1000 + Math.random() * 9000));
    const releaseOtp = String(Math.floor(1000 + Math.random() * 9000));
    const totalWage =
      myWorkerMode === "MISTRI_TOLI"
        ? myFullDayRate + Math.max(0, myToliSize - 1) * myHelperRate
        : myFullDayRate;

    const simJob = {
      id: `WRK-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: "KVR Constructions / Rameshwar Rao",
      siteAddress: "Plot 42, Subhash Nagar Colony, Adilabad",
      skillNeeded: skillObj.name,
      shiftType: "Full-Day Shift (09:00 AM - 05:30 PM)",
      hiringMode:
        myWorkerMode === "MISTRI_TOLI"
          ? `Mistri Toli (1 Mistri + ${Math.max(1, myToliSize - 1)} Helpers)`
          : "Individual Skilled Worker",
      workersCount: myWorkerMode === "MISTRI_TOLI" ? myToliSize : 1,
      toolsRequirement: bringOwnTools
        ? "Bring Own Hand Tools"
        : "Tools Provided at Site",
      transportNote: needTransportPickup
        ? "Customer Sends 3W Auto to Adda"
        : "Direct Reach to Site",
      teaBhattaNote: "2x Site Tea + Rs.30 Bhatta Included",
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
      `New Work-Site Call #${simJob.id} (Rs.${totalWage}/Day) received on Adda Radar!`
    );
  };

  return (
    <div className="space-y-3 text-xs text-white">
      {/* TOP LABOUR ADDA STATUS & BETA TESTING BANNER */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border-2 border-amber-400/60 space-y-2">
        <div className="flex flex-wrap justify-between items-start gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[9px]">
                BETA TESTING PORTAL #6
              </span>
              <h3 className="font-black text-amber-300 text-sm">
                Local Labour &amp; Work-Site Hub (Mistri / Helper / Hamali / Farm)
              </h3>
            </div>
            <p className="text-[10px] text-slate-300 mt-0.5">
              Adda Stand: <strong>{addaStandName}</strong> | Morning Stand Time: 07:30 AM
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
              ? "AVAILABLE FOR WORK TODAY (VISIBLE TO CONTRACTORS & HOMES)"
              : "ALREADY BOOKED ON SITE TODAY (PAUSED)"}
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

      {/* ================================================================== */}
      {/* TAB 1: LIVE SITE CALLS & ADDA DISPATCH QUEUE ("home")              */}
      {/* ================================================================== */}
      {footerTab === "home" && (
        <div className="space-y-2.5">
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex justify-between items-center">
            <div>
              <h4 className="font-black text-amber-400 text-xs">
                1. Live Work-Site Calls &amp; Contractor Bookings ({activeJobs.length})
              </h4>
              <p className="text-[10px] text-slate-400">
                Inspect work type, shift hours, tool requirements &amp; accept site call
              </p>
            </div>
          </div>

          {activeJobs.length === 0 ? (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center space-y-2">
              <p className="font-bold text-slate-300">
                No active work-site calls in your queue right now.
              </p>
              <button
                type="button"
                onClick={handleSimulateWorksiteCall}
                className="bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-[10px] cursor-pointer"
              >
                + Simulate Local Work-Site Call Now
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
                    <strong className="text-amber-300">Work Site:</strong>{" "}
                    {job.siteAddress}
                  </p>
                  <p>
                    <strong className="text-teal-300">Hiring Mode:</strong>{" "}
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
                        `Accepted Site Call #${job.id}! Proceed to Site & verify Morning Start OTP.`
                      );
                    }}
                    className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer shadow"
                  >
                    Accept Work-Site Call (Rs.{job.totalDailyWage}) &amp; Open Muster Roll
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

      {/* ================================================================== */}
      {/* TAB 2: SKILL, TOLI SIZE, TOOLS & WAGE CARD ("skills")              */}
      {/* ================================================================== */}
      {footerTab === "skills" && (
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-emerald-500/40 space-y-3">
          <h4 className="font-black text-emerald-400 text-xs">
            2. Worker / Mistri Skill Profile, Toli Size &amp; Daily Wage Card
          </h4>

          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1">
              Primary Trade / Work Skill:
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
                  {sc.name}
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
              Individual Worker (1 Person)
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
              Mistri + Helper Toli (Group)
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
                Toli Size (Workers):
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

          <div className="space-y-1.5">
            <label className="block text-[10px] text-slate-400 font-bold">
              Tools Carried to Work Site:
            </label>
            <input
              type="text"
              value={myToolsDesc}
              onChange={(e) => setMyToolsDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={bringOwnTools}
                onChange={(e) => setBringOwnTools(e.target.checked)}
              />
              <span className="text-[10px] font-bold">
                We Bring Own Hand Tools
              </span>
            </label>
            <label className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={needTransportPickup}
                onChange={(e) => setNeedTransportPickup(e.target.checked)}
              />
              <span className="text-[10px] font-bold">
                Need Auto Pickup from Adda
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
              const skillObj =
                LABOUR_SKILL_CATEGORIES.find((s) => s.id === mySkillId) ||
                LABOUR_SKILL_CATEGORIES[0];
              const newCard = {
                id: `LAB-${Date.now()}`,
                workerName:
                  currentUser?.fullName || "Verified Mistri & Team",
                phone: currentUser?.phone || "9848011223",
                skillId: mySkillId,
                skillLabel: skillObj.name,
                workerType: myWorkerMode,
                toliCount: myToliSize,
                experienceYrs: 6,
                addaLocation: addaStandName,
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
                `Published ${newCard.workerName} (${skillObj.name}) live to Mega Market Labour Hub!`
              );
            }}
            className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
          >
            Publish My Availability &amp; Rate Card Live to Market
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 3: MUSTER ROLL & SITE ATTENDANCE OTP ("muster")                */}
      {/* ================================================================== */}
      {footerTab === "muster" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3 rounded-2xl border border-amber-500/40">
            <h4 className="font-black text-amber-400 text-xs">
              3. Live Work-Site Muster Roll (Morning Check-In OTP &amp; Evening Wage OTP)
            </h4>
            <p className="text-[10px] text-slate-400">
              Prevents wage disputes: Verify Morning Arrival OTP to start shift &amp; Evening OTP to release full daily wage
            </p>
          </div>

          {activeJobs.length === 0 ? (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center">
              <p className="text-slate-400">
                No active site shift in progress. Accept a call in Tab 1 first.
              </p>
            </div>
          ) : (
            activeJobs.map((job) => {
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
                  <p className="text-[10px] text-slate-300">
                    Site: {job.siteAddress} | Status:{" "}
                    <strong className="text-amber-300">{job.status}</strong>
                  </p>

                  {job.status !== "WORK_IN_PROGRESS_ON_SITE" ? (
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span>
                          Morning Site Reporting OTP:{" "}
                          <strong className="text-emerald-400 font-mono">
                            {sOtp}
                          </strong>
                        </span>
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
                              `Morning Attendance Verified (#${job.id})! Shift timer started.`
                            );
                          }}
                          className="bg-emerald-400 text-slate-950 font-black px-3 py-1 rounded-lg cursor-pointer"
                        >
                          Verify Start OTP ({sOtp}) &amp; Start Shift
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-400/50 space-y-2">
                      <p className="text-[10px] text-emerald-300 font-bold">
                        Shift Checked In at {job.checkedInAt || "09:00 AM"} | Ready for Evening Wage Settlement
                      </p>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder={`Wage OTP (${rOtp})`}
                          value={otpInputs[job.id] || ""}
                          onChange={(e) =>
                            setOtpInputs({
                              ...otpInputs,
                              [job.id]: e.target.value
                            })
                          }
                          className="w-28 bg-slate-900 border border-amber-400 rounded-xl p-2 text-center font-mono text-white"
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
                              `Evening OTP (${rOtp}) Verified! Rs.${job.totalDailyWage} Daily Wage settled to Ledger.`
                            );
                          }}
                          className="flex-1 bg-amber-400 text-slate-950 font-black rounded-xl text-[10px] cursor-pointer"
                        >
                          Verify Evening OTP ({rOtp}) &amp; Release Rs.{job.totalDailyWage}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 4: DAILY WAGE & CONTRACT PAYOUT LEDGER ("orders")              */}
      {/* ================================================================== */}
      {footerTab === "orders" && (
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-emerald-500/40 space-y-2.5">
          <div className="flex justify-between items-center">
            <h4 className="font-black text-emerald-400 text-xs">
              4. Daily Wage &amp; Mistri Toli Payout Ledger ({completedJobs.length})
            </h4>
            <span className="font-black text-amber-300 text-xs">
              Total Earned: Rs.
              {completedJobs.reduce(
                (s, j) => s + Number(j.totalDailyWage || 0),
                0
              )}
            </span>
          </div>
          {completedJobs.length === 0 ? (
            <p className="text-slate-400 text-[11px]">
              Completed shifts will appear here with instant UPI / Cash settlement records.
            </p>
          ) : (
            completedJobs.map((cj) => (
              <div
                key={cj.id}
                className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-white">
                    #{cj.id} | {cj.skillNeeded} ({cj.workersCount} Workers)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Site: {cj.siteAddress} | Settled at {cj.completedAt}
                  </p>
                </div>
                <span className="font-black text-emerald-400 text-xs">
                  +Rs.{cj.totalDailyWage}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}