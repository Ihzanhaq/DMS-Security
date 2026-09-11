import type {
  ApprovedDuty, Employee, EmployeePayRule, PayrollDeduction, PostRateRule,
  Site, SitePayRule, Skill, StatutorySettings,
} from "@/types/domain";

export const employees: Employee[] = [
  { id:"BMG-1840", name:"Suresh Babu", initials:"SB", role:"Security Officer", district:"Ernakulam", site:"Lulu Mall, Kochi", shift:"Day", status:"Active", salary:16000, payBasis:"monthly", pfOverride:"inherit", esiOverride:"inherit", skills:["General security","Day book"], pf:true, esi:true, phone:"98470 12840" },
  { id:"BMG-2274", name:"Fathima N", initials:"FN", role:"Security Officer", district:"Ernakulam", site:"Aster Medcity", shift:"Day", status:"Active", salary:0, payBasis:"site", pfOverride:"disabled", esiOverride:"inherit", skills:["General security","Day book"], pf:false, esi:true, phone:"97462 41982" },
  { id:"BMG-1988", name:"Rajeev Kumar", initials:"RK", role:"Senior Guard", district:"Thiruvananthapuram", site:"TCS Technopark", shift:"Night", status:"Active", salary:19000, payBasis:"monthly", pfOverride:"inherit", esiOverride:"inherit", skills:["Specialized","Day book","Driving"], pf:true, esi:true, phone:"94471 56301" },
  { id:"BMG-1469", name:"Hareendrakumar K", initials:"HK", role:"Driver", district:"Kollam", site:"Travancore Medicity", shift:"Day", status:"Reliever", salary:0, dailyRate:750, skills:["Driving","General security"], pf:false, esi:false, phone:"95678 14329" },
  { id:"BMG-2031", name:"Anzar M", initials:"AM", role:"Security Officer", district:"Alappuzha", site:"Lake Palace Resort", shift:"Night", status:"Leave", salary:15000, skills:["General security"], pf:false, esi:true, phone:"70252 46810" },
  { id:"BMG-1778", name:"Shamnad C M", initials:"SC", role:"Security Officer", district:"Kottayam", site:"Caritas Hospital", shift:"Night", status:"Active", salary:15734, skills:["General security","Day book"], pf:true, esi:true, phone:"98952 67142" },
  { id:"BMG-2118", name:"Vinod Raj", initials:"VR", role:"Reliever", district:"Ernakulam", site:"Unassigned", shift:"Day", status:"Reliever", salary:0, dailyRate:650, skills:["General security"], pf:false, esi:true, phone:"94953 71204" },
  { id:"BMG-2260", name:"Bijoy Thomas", initials:"BT", role:"Reliever", district:"Kottayam", site:"Unassigned", shift:"Night", status:"Reliever", salary:0, dailyRate:516, skills:["General security"], pf:false, esi:true, phone:"90745 33810" },
  { id:"BMG-2295", name:"Salim Basheer", initials:"SB", role:"Reliever", district:"Kollam", site:"Unassigned", shift:"Day", status:"Reliever", salary:0, dailyRate:500, skills:["General security"], pf:false, esi:false, phone:"85901 22764" },
  { id:"BMG-1902", name:"Deepa Menon", initials:"DM", role:"Security Officer", district:"Thrissur", site:"Sobha City Mall", shift:"Day", status:"Active", salary:16400, skills:["General security","Day book"], pf:true, esi:true, phone:"99610 45528" },
  { id:"BMG-2044", name:"Noushad P", initials:"NP", role:"Senior Guard", district:"Kozhikode", site:"Malabar Gold, Kozhikode", shift:"24-hour", status:"Active", salary:18500, skills:["Specialized","Day book"], pf:true, esi:true, phone:"97448 90113" },
  { id:"BMG-2087", name:"Jomon Jose", initials:"JJ", role:"Security Officer", district:"Kannur", site:"Skyline Apartments", shift:"Night", status:"Active", salary:15200, skills:["General security"], pf:false, esi:true, phone:"96334 71589" },
  { id:"BMG-1655", name:"Ashraf Ali", initials:"AA", role:"Driver", district:"Thiruvananthapuram", site:"TCS Technopark", shift:"Day", status:"Active", salary:17600, skills:["Driving","General security"], pf:true, esi:true, phone:"94004 61237" },
  { id:"BMG-2301", name:"Prasanth V", initials:"PV", role:"Reliever", district:"Thrissur", site:"Unassigned", shift:"Day", status:"Reliever", salary:0, dailyRate:650, skills:["General security","Driving"], pf:false, esi:true, phone:"89432 05517" },
];

/** Fixed reliever day rates. The tier applied depends on site and skill. */
export const relieverRates: { rate: number; label: string; applies: string }[] = [
  { rate:500, label:"Base tier",        applies:"Standard posts · salary-only sites" },
  { rate:516, label:"Statutory tier",   applies:"Standard posts · ESI-covered sites" },
  { rate:650, label:"Skilled tier",     applies:"Day book handling or 12-hour posts" },
  { rate:750, label:"Specialized tier", applies:"Driving, jewellery and hospital posts" },
];

export const sites: Site[] = [
  { client:"Lulu Group",                name:"Lulu Mall, Kochi",         district:"Ernakulam",          posts:18, staffed:18, coverage:100, scheme:"PF + ESI",    lat:10.02700, lng:76.30800, radius:120 },
  { client:"Tata Consultancy Services", name:"TCS Technopark",           district:"Thiruvananthapuram", posts:24, staffed:22, coverage:92,  scheme:"PF + ESI",    lat:8.55700,  lng:76.87900, radius:100 },
  { client:"Aster DM Healthcare",       name:"Aster Medcity",            district:"Ernakulam",          posts:16, staffed:15, coverage:94,  scheme:"ESI",         lat:10.04500, lng:76.27600, radius:85  },
  { client:"Lake Palace",               name:"Lake Palace Resort",       district:"Alappuzha",          posts:8,  staffed:7,  coverage:88,  scheme:"Salary only", lat:9.49800,  lng:76.33900, radius:75  },
  { client:"Caritas Hospital",          name:"Caritas Hospital",         district:"Kottayam",           posts:12, staffed:10, coverage:83,  scheme:"PF + ESI",    lat:9.61800,  lng:76.53200, radius:100 },
  { client:"Malabar Gold & Diamonds",   name:"Malabar Gold, Kozhikode",  district:"Kozhikode",          posts:10, staffed:10, coverage:100, scheme:"PF + ESI",    lat:11.24880, lng:75.78040, radius:60  },
  { client:"Sobha Developers",          name:"Sobha City Mall",          district:"Thrissur",           posts:14, staffed:13, coverage:93,  scheme:"ESI",         lat:10.52760, lng:76.21440, radius:110 },
  { client:"Skyline Builders",          name:"Skyline Apartments",       district:"Kannur",             posts:6,  staffed:5,  coverage:83,  scheme:"Salary only", lat:11.87450, lng:75.37040, radius:70  },
];

export const statutorySettings: StatutorySettings = {
  pfRate: .12,
  esiRate: .0075,
  pfWageCeiling: 15000,
  esiWageCeiling: 21000,
};

export const employeePayRules: EmployeePayRule[] = employees.map(employee => ({
  employeeId: employee.id,
  effectiveFrom: "2026-01-01",
  basis: employee.payBasis ?? (employee.dailyRate ? "daily" : "monthly"),
  monthlySalary: employee.salary || undefined,
  dailyRate: employee.dailyRate,
  payableDays: 26,
  pfOverride: employee.pfOverride ?? (employee.pf ? "enabled" : "disabled"),
  esiOverride: employee.esiOverride ?? (employee.esi ? "enabled" : "disabled"),
}));

export const sitePayRules: SitePayRule[] = [
  { site:"Lulu Mall, Kochi", effectiveFrom:"2026-01-01", defaultDutyRate:650, scheme:"pf-esi" },
  { site:"Lulu Mall, Kochi", effectiveFrom:"2026-08-01", defaultDutyRate:700, scheme:"pf-esi" },
  { site:"TCS Technopark", effectiveFrom:"2026-01-01", defaultDutyRate:750, scheme:"pf-esi" },
  { site:"Aster Medcity", effectiveFrom:"2026-01-01", defaultDutyRate:700, scheme:"esi" },
  { site:"Aster Medcity", effectiveFrom:"2026-08-01", defaultDutyRate:750, scheme:"esi" },
  { site:"Lake Palace Resort", effectiveFrom:"2026-01-01", defaultDutyRate:600, scheme:"salary-only" },
  { site:"Caritas Hospital", effectiveFrom:"2026-01-01", defaultDutyRate:650, scheme:"pf-esi" },
  { site:"Malabar Gold, Kozhikode", effectiveFrom:"2026-01-01", defaultDutyRate:725, scheme:"pf-esi" },
  { site:"Sobha City Mall", effectiveFrom:"2026-01-01", defaultDutyRate:675, scheme:"esi" },
  { site:"Skyline Apartments", effectiveFrom:"2026-01-01", defaultDutyRate:600, scheme:"salary-only" },
  { site:"Travancore Medicity", effectiveFrom:"2026-01-01", defaultDutyRate:700, scheme:"salary-only" },
];

export const postRateRules: PostRateRule[] = [
  { site:"Aster Medcity", post:"Emergency", effectiveFrom:"2026-08-01", dutyRate:825 },
  { site:"TCS Technopark", post:"Control room", effectiveFrom:"2026-08-01", dutyRate:800 },
];

type DutySegment = { site:string; post:string; quantities:number[] };
function makeDuties(employeeId:string, segments:DutySegment[]): ApprovedDuty[] {
  let day = 1;
  return segments.flatMap(segment => segment.quantities.map(quantity => {
    const dutyDay=day++;
    return {
    id:`${employeeId}-${String(dutyDay).padStart(2,"0")}`,
    employeeId,
    date:`2026-08-${String(dutyDay).padStart(2,"0")}`,
    site:segment.site,
    post:segment.post,
    quantity,
    status:"approved" as const,
  }; }));
}

export const approvedDuties: ApprovedDuty[] = [
  ...makeDuties("BMG-1840", [{ site:"Lulu Mall, Kochi", post:"Main gate", quantities:Array(26).fill(1) }]),
  ...makeDuties("BMG-2274", [
    { site:"Aster Medcity", post:"Ward entrance", quantities:Array(11).fill(1) },
    { site:"Aster Medcity", post:"Emergency", quantities:[1,.75] },
    { site:"Lake Palace Resort", post:"Lobby", quantities:Array(12).fill(1) },
  ]),
  ...makeDuties("BMG-1988", [
    { site:"TCS Technopark", post:"Block A", quantities:Array(10).fill(1) },
    { site:"Aster Medcity", post:"Emergency", quantities:Array(10).fill(1) },
  ]),
  ...makeDuties("BMG-1469", [{ site:"Travancore Medicity", post:"Main gate", quantities:[...Array(12).fill(1),.5] }]),
  ...makeDuties("BMG-2044", [{ site:"Malabar Gold, Kozhikode", post:"Control room", quantities:[...Array(22).fill(1),1.5] }]),
  ...makeDuties("BMG-1902", [{ site:"Sobha City Mall", post:"Main gate", quantities:[...Array(25).fill(1),.75] }]),
];

export const payrollDeductions: PayrollDeduction[] = [
  { id:"DED-1", employeeId:"BMG-1840", period:"2026-08", kind:"uniform", label:"Uniform recovery", amount:800 },
  { id:"DED-2", employeeId:"BMG-2274", period:"2026-08", kind:"uniform", label:"Uniform recovery", amount:1000 },
  { id:"DED-3", employeeId:"BMG-1988", period:"2026-08", kind:"penalty", label:"Verified performance penalty", amount:500 },
  { id:"DED-4", employeeId:"BMG-1469", period:"2026-08", kind:"advance", label:"Salary advance instalment", amount:2000 },
  { id:"DED-5", employeeId:"BMG-2044", period:"2026-08", kind:"uniform", label:"Uniform recovery", amount:1200 },
];

export const attendanceRows = [
  { employee:"Suresh Babu", id:"BMG-1840", site:"Lulu Mall, Kochi", shift:"08:00–20:00", punch:"07:52", accuracy:"12 m", duty:"1.00", state:"On site" },
  { employee:"Fathima N", id:"BMG-2274", site:"Aster Medcity", shift:"09:00–18:00", punch:"09:18", accuracy:"18 m", duty:"1.00", state:"Late" },
  { employee:"Rajeev Kumar", id:"BMG-1988", site:"TCS Technopark", shift:"20:00–08:00", punch:"19:43", accuracy:"9 m", duty:"1.00", state:"On site" },
  { employee:"Hareendrakumar K", id:"BMG-1469", site:"Travancore Medicity", shift:"08:00–14:00", punch:"07:57", accuracy:"24 m", duty:"0.50", state:"On site" },
  { employee:"Anzar M", id:"BMG-2031", site:"Lake Palace Resort", shift:"20:00–08:00", punch:"—", accuracy:"—", duty:"0.00", state:"Absent" },
  { employee:"Noushad P", id:"BMG-2044", site:"Malabar Gold, Kozhikode", shift:"24-hour", punch:"08:01", accuracy:"7 m", duty:"1.50", state:"On site" },
  { employee:"Deepa Menon", id:"BMG-1902", site:"Sobha City Mall", shift:"09:00–18:00", punch:"09:34", accuracy:"31 m", duty:"0.75", state:"Late" },
  { employee:"Jomon Jose", id:"BMG-2087", site:"Skyline Apartments", shift:"20:00–08:00", punch:"—", accuracy:"—", duty:"0.00", state:"Absent" },
];

/** Employees who had not punched in by the 9:00 AM policy cut-off. */
export const lateAndAbsent = [
  { employee:"Fathima N", id:"BMG-2274", site:"Aster Medcity", district:"Ernakulam", due:"09:00", punch:"09:18", delay:"18 min", state:"Late" },
  { employee:"Deepa Menon", id:"BMG-1902", site:"Sobha City Mall", district:"Thrissur", due:"09:00", punch:"09:34", delay:"34 min", state:"Late" },
  { employee:"Anzar M", id:"BMG-2031", site:"Lake Palace Resort", district:"Alappuzha", due:"08:00", punch:"—", delay:"—", state:"Absent" },
  { employee:"Jomon Jose", id:"BMG-2087", site:"Skyline Apartments", district:"Kannur", due:"08:00", punch:"—", delay:"—", state:"Absent" },
];

export const payrollRows = [
  { employee:"Suresh Babu", id:"BMG-1840", duties:"26.00 / 26", gross:16000, pf:1920, esi:120, deductions:800, net:13160, state:"Ready" },
  { employee:"Fathima N", id:"BMG-2274", duties:"24.75 / 26", gross:16183, pf:0, esi:121, deductions:1000, net:15062, state:"Review" },
  { employee:"Rajeev Kumar", id:"BMG-1988", duties:"20.00 / 26", gross:14615, pf:1754, esi:110, deductions:500, net:12251, state:"Ready" },
  { employee:"Hareendrakumar K", id:"BMG-1469", duties:"12.50 duties", gross:9375, pf:0, esi:0, deductions:2000, net:7375, state:"Review" },
  { employee:"Noushad P", id:"BMG-2044", duties:"23.50 / 26", gross:16721, pf:2007, esi:125, deductions:1200, net:13389, state:"Ready" },
  { employee:"Deepa Menon", id:"BMG-1902", duties:"25.75 / 26", gross:16248, pf:1950, esi:122, deductions:0, net:14176, state:"Ready" },
];

/** Line-level deduction ledger backing the deduction-log report. */
export const deductionLog = [
  { id:"BMG-1840", employee:"Suresh Babu", site:"Lulu Mall, Kochi", kind:"Uniform recovery", note:"Partial advance plan · 1 of 2", amount:800, month:"August 2026" },
  { id:"BMG-2274", employee:"Fathima N", site:"Aster Medcity", kind:"Uniform recovery", note:"Full salary deduction · 1 of 2", amount:1000, month:"August 2026" },
  { id:"BMG-1988", employee:"Rajeev Kumar", site:"TCS Technopark", kind:"Performance penalty", note:"Withdrawal after verified complaint", amount:500, month:"August 2026" },
  { id:"BMG-1469", employee:"Hareendrakumar K", site:"Travancore Medicity", kind:"Salary advance", note:"Recovery instalment 2 of 3", amount:2000, month:"August 2026" },
  { id:"BMG-2044", employee:"Noushad P", site:"Malabar Gold, Kozhikode", kind:"Uniform recovery", note:"Full salary deduction · 2 of 2", amount:1200, month:"August 2026" },
];

export const complaints = [
  { id:"CMP-26091", client:"TCS Technopark", issue:"Night patrol missed at Block C", owner:"Praveen S", due:"Today, 16:00", state:"Investigating", priority:"High" },
  { id:"CMP-26088", client:"Lake Palace Resort", issue:"Lobby register was incomplete", owner:"Meera K", due:"Tomorrow", state:"Assigned", priority:"Medium" },
  { id:"CMP-26074", client:"Lulu Mall, Kochi", issue:"Replacement guard arrived late", owner:"Niyas P", due:"10 Sep, 12:00", state:"Resolved", priority:"Low" },
  { id:"CMP-26095", client:"Skyline Apartments", issue:"Flat committee reports gate left unmanned", owner:"Meera K", due:"Today, 18:00", state:"Investigating", priority:"High" },
  { id:"CMP-26069", client:"Malabar Gold, Kozhikode", issue:"Shutter check not logged at closing", owner:"Praveen S", due:"09 Sep, 20:00", state:"Resolved", priority:"Medium" },
];

/** Investigation trail keyed by complaint id, used by the redressal drawer. */
export const complaintTrail: Record<string, { title: string; time: string; note?: string; state?: "done" | "active" }[]> = {
  "CMP-26091": [
    { title:"Logged by client", time:"09 Sep · 21:40", note:"Raised by TCS facility desk against the Block C night post.", state:"done" },
    { title:"Assigned to Praveen S", time:"09 Sep · 22:05", note:"District operations acknowledged within the 1-hour SLA.", state:"done" },
    { title:"Site visit completed", time:"10 Sep · 07:15", note:"FSO confirmed two patrol rounds were not recorded in the day book.", state:"done" },
    { title:"Awaiting withdrawal decision", time:"Due today · 16:00", note:"If the withdrawal is verified a one-time ₹500 penalty applies.", state:"active" },
  ],
  "CMP-26088": [
    { title:"Logged by client", time:"09 Sep · 11:20", note:"Resort duty manager reported gaps in the lobby register.", state:"done" },
    { title:"Assigned to Meera K", time:"09 Sep · 12:00", state:"done" },
    { title:"Investigation in progress", time:"Due tomorrow", note:"Register pages photographed and sent for HR review.", state:"active" },
  ],
  "CMP-26074": [
    { title:"Logged by client", time:"08 Sep · 08:30", state:"done" },
    { title:"Assigned to Niyas P", time:"08 Sep · 08:55", state:"done" },
    { title:"Reliever dispatched", time:"08 Sep · 10:10", note:"Vinod Raj covered the post at the ₹650 skilled tier.", state:"done" },
    { title:"Closed within SLA", time:"10 Sep · 11:45", note:"Client confirmed the post has been covered since.", state:"done" },
  ],
  "CMP-26095": [
    { title:"Logged by flat committee", time:"10 Sep · 06:50", note:"Committee secretary reported the main gate unmanned at 05:30.", state:"done" },
    { title:"Assigned to Meera K", time:"10 Sep · 07:10", state:"done" },
    { title:"Investigation in progress", time:"Due today · 18:00", note:"Night vigilance log shows two missed check-ins before 05:30.", state:"active" },
  ],
  "CMP-26069": [
    { title:"Logged by client", time:"07 Sep · 20:15", state:"done" },
    { title:"Assigned to Praveen S", time:"07 Sep · 20:30", state:"done" },
    { title:"Closed within SLA", time:"09 Sep · 19:10", note:"Closing checklist reissued and acknowledged by both shift guards.", state:"done" },
  ],
};

export const inspections = [
  { site:"TCS Technopark", officer:"Praveen S", window:"09:00–11:00", status:"Due now", distance:"6.2 km" },
  { site:"Aster Medcity", officer:"Praveen S", window:"13:00–15:00", status:"Upcoming", distance:"11.4 km" },
  { site:"LMG Junction", officer:"Niyas P", window:"08:00–10:00", status:"Completed", distance:"—" },
];

/** The 12-item kit issued on joining. */
export const uniformKit = [
  { item:"Shirt (full sleeve)", issued:2, stock:184, reorder:60 },
  { item:"Trousers", issued:2, stock:156, reorder:60 },
  { item:"Shoes (black)", issued:1, stock:98, reorder:40 },
  { item:"Belt", issued:1, stock:221, reorder:50 },
  { item:"Cap", issued:1, stock:176, reorder:50 },
  { item:"Raincoat", issued:1, stock:63, reorder:70 },
  { item:"Sweater", issued:1, stock:112, reorder:40 },
  { item:"Name badge", issued:1, stock:268, reorder:60 },
  { item:"Shoulder epaulette", issued:2, stock:204, reorder:50 },
  { item:"Whistle and lanyard", issued:1, stock:147, reorder:40 },
  { item:"Torch", issued:1, stock:58, reorder:60 },
  { item:"Baton holder", issued:1, stock:131, reorder:40 },
];

/** The three uniform recovery options offered at issuance. */
export const uniformPlans = [
  { name:"Full upfront payment", upfront:1960, deduction:0,    total:1960, people:112, note:"Settled at issuance, nothing carried into payroll." },
  { name:"Partial advance",      upfront:1000, deduction:1200, total:2200, people:186, note:"₹1,200 recovered from the next month-end salary." },
  { name:"Full salary deduction",upfront:0,    deduction:2600, total:2600, people:170, note:"Entire amount recovered from the month-end salary." },
];

export const payslips = [
  {
    month:"August 2026", net:13160, duties:"26.00 / 26",
    earnings:[ { label:"Basic salary", amount:16000 } ],
    deductions:[ { label:"Employee PF (12%)", amount:1920 }, { label:"Employee ESI (0.75%)", amount:120 }, { label:"Uniform recovery", amount:800 } ],
  },
  {
    month:"July 2026", net:14082, duties:"26.00 / 26",
    earnings:[ { label:"Basic salary", amount:16000 }, { label:"Night allowance", amount:600 } ],
    deductions:[ { label:"Employee PF (12%)", amount:1920 }, { label:"Employee ESI (0.75%)", amount:124 }, { label:"Salary advance recovery", amount:474 } ],
  },
  {
    month:"June 2026", net:13640, duties:"25.00 / 26",
    earnings:[ { label:"Basic salary", amount:15385 } ],
    deductions:[ { label:"Employee PF (12%)", amount:1846 }, { label:"Employee ESI (0.75%)", amount:115 } ],
  },
];

/** Site instructions shown in the SOP repository and the guard app. */
export const sopDocuments = [
  {
    title:"Overnight pump and lighting schedule",
    site:"Skyline Apartments · Kannur",
    category:"Apartments",
    version:"2.3",
    effective:"01 September 2026",
    ack:"5 of 6",
    state:"Pending",
    sections:[
      { heading:"Water pump operation", steps:[
        "Start the borewell pump at 05:30 and record the starting meter reading in the day book.",
        "Stop the pump once the overhead tank float alarm sounds, or after 90 minutes, whichever is first.",
        "Never run both pumps together. The second pump is only for a failure of the first.",
        "Log the stop time and closing meter reading before handing over the shift.",
      ]},
      { heading:"Lighting timings", steps:[
        "Switch on corridor and compound lights at 18:30.",
        "Switch off alternate compound lights at 23:00 to reduce load.",
        "Switch off all external lighting at 06:00.",
      ]},
      { heading:"Gate discipline", steps:[
        "The main gate must never be left unmanned. Call the reliever before stepping away.",
        "Record every visitor vehicle number and flat number at entry.",
      ]},
    ],
  },
  {
    title:"Showroom opening and shutter protocol",
    site:"Malabar Gold, Kozhikode",
    category:"Jewellery showroom",
    version:"4.1",
    effective:"15 August 2026",
    ack:"10 of 10",
    state:"Complete",
    sections:[
      { heading:"Opening", steps:[
        "Confirm all three shutter seals are intact before the manager arrives, and photograph them in the app.",
        "Verify the strong room door log matches the previous night's closing entry.",
        "Only open the shutter in the presence of the branch manager and one other staff member.",
      ]},
      { heading:"Closing", steps:[
        "Confirm the strong room is locked and the time lock is armed.",
        "Check every display cabinet is empty and record the cabinet count in the day book.",
        "Seal the shutter, photograph the seal, and log the closing check in the app before leaving the post.",
      ]},
      { heading:"Escalation", steps:[
        "Any seal discrepancy is reported to district operations immediately, before the shutter is touched.",
      ]},
    ],
  },
  {
    title:"Night closure and air-conditioning shutdown",
    site:"Lake Palace Resort · Alappuzha",
    category:"Hotel",
    version:"1.8",
    effective:"01 September 2026",
    ack:"6 of 8",
    state:"Pending",
    sections:[
      { heading:"Air-conditioning shutoff", steps:[
        "Shut off air-conditioning in the banquet hall and conference rooms at 23:00 once the last guest has left.",
        "Leave lobby and corridor units running through the night. These are never switched off.",
        "Record the shutoff time for each block in the day book.",
      ]},
      { heading:"Lighting and pool", steps:[
        "Dim the poolside lighting at 22:00 and switch the pool pump off at 23:30.",
        "Keep the jetty approach lit until 06:00 for early departures.",
      ]},
      { heading:"Patrol rounds", steps:[
        "Complete four rounds between 23:00 and 05:00, logging each round in the app.",
        "Check the kitchen gas line is closed during the first round.",
      ]},
    ],
  },
  {
    title:"Loading bay vehicle movement",
    site:"Lulu Mall, Kochi",
    category:"Retail",
    version:"3.2",
    effective:"20 August 2026",
    ack:"18 of 18",
    state:"Complete",
    sections:[
      { heading:"Vehicle entry", steps:[
        "Goods vehicles are admitted only between 05:00 and 10:00, and after 22:00.",
        "Record the vehicle number, driver name and gate pass number for every entry.",
        "Reversing into bays 1 to 4 requires a guard to guide the vehicle on foot.",
      ]},
      { heading:"Fire lane", steps:[
        "The fire lane must stay clear at all times. Move or report any vehicle blocking it immediately.",
      ]},
    ],
  },
  {
    title:"Emergency and ambulance access",
    site:"Caritas Hospital · Kottayam",
    category:"Hospital",
    version:"2.0",
    effective:"05 September 2026",
    ack:"9 of 12",
    state:"Pending",
    sections:[
      { heading:"Ambulance ramp", steps:[
        "The ambulance ramp is kept clear at all times and is never used for visitor parking.",
        "On hearing a siren, clear the ramp approach and hold visitor traffic until the ambulance has passed.",
      ]},
      { heading:"Casualty entrance", steps:[
        "Only patients, attenders and staff pass the casualty entrance after 21:00.",
        "Record attender passes issued and collected in the day book at every shift change.",
      ]},
    ],
  },
];

export const skillOptions: Skill[] = ["Day book", "Driving", "General security", "Specialized"];

export const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(amount);

/** Compact rupee formatting for dense tables. */
export const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * Great-circle distance in metres. Used to decide whether a punch falls
 * inside a site geofence.
 */
export function distanceMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/**
 * 24-hour rotational pair split. A 30-day month divides 15/15; a 31-day
 * month divides 16/15, and the extra duty alternates between the pair each
 * month so the rotation stays balanced over the year.
 */
export function rotationSplit(year: number, month: number, leadIsFirst = true) {
  const days = new Date(year, month + 1, 0).getDate();
  const first = Math.ceil(days / 2);
  const second = days - first;
  return {
    days,
    lead: leadIsFirst ? first : second,
    partner: leadIsFirst ? second : first,
    pattern: Array.from({ length: days }, (_, index) => (index % 2 === 0) === leadIsFirst ? "a" : "b" as "a" | "b"),
  };
}
