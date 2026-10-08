"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle, Building2, CalendarCheck, Check, CheckCircle2, ClipboardList, Clock,
  Crosshair, FileText, HandCoins, Plus, Save, ShieldCheck, Trash2, Users, Wallet,
} from "lucide-react";
import {
  BackCrumb, Button, DefRows, DetailDrawer, Field, FormGrid, FormStack, IconTile, InlineAlert,
  Input, InputAffix, KeyValue, ListRow, PageHeader, Panel, PersonCell, SegmentedControl, Select,
  Section, SplitLayout, StatStrip, StatusChip, StarRating, Textarea, Timeline, ToggleRow, useConfirm,
} from "@/components/ui-kit";
import { BoundaryEditor } from "@/components/shared/boundary-editor";
import { useToast } from "@/components/shared/toast-context";
import { useOnboarding, withChecklist } from "@/components/shared/onboarding-context";
import { FileSlot } from "@/components/shared/file-upload";
import { AddItemRow } from "@/components/shared/add-item-row";
import { employees as employeeRecords, rupees, siteDocuments, siteFeedback, sites as siteRecords, skillOptions, statutorySettings } from "@/lib/mock-data";
import { useOps } from "@/components/shared/ops-context";
import { usePayroll } from "@/components/shared/payroll-context";
import { keralaDistricts, keralaTaluks } from "@/lib/kerala-geo";
import { useAccess } from "@/components/shared/access-context";
import { computeAdvanceEligibility } from "@/lib/advance-calculator";
import { APP_TODAY } from "@/lib/app-date";
import { daysSince, isValidEsiIp, isValidUan, statutoryNeeds, statutoryStatus } from "@/lib/pf-esi";
import { NAV, ROLE_TERMS } from "@/lib/labels";
import type { NavClickMeta } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import type { AppView, BenefitOverride, BenefitScheme, EmployeeDocument, EmployeeDocumentStatus, EscalationContact, LatLng, PayBasis, PatrolPlan, SiteDocument, SiteDocumentKind, SiteFeedback, NightCheck } from "@/types/domain";

const districts = keralaDistricts;
const sites = ["Lulu Mall, Kochi", "Aster Medcity", "TCS Technopark", "Lake Palace Resort"];
/** Phone on file for an employee id, when the id resolves. */
const phoneOf = (employeeId: string) => employeeRecords.find(item => item.id === employeeId)?.phone;
const dutyUnits = ["0.25", "0.50", "0.75", "1.00", "1.50"];

/* ------------------------------ Employee form ------------------------------ */

export function EmployeeFormScreen({ onBack, onImport, employeeId }: { onBack: () => void; onImport: () => void; employeeId?: string | null }) {
  const notify = useToast();
  const { employeeRules, updateEmployeeRule } = usePayroll();
  const isNew = !employeeId;
  const employee = isNew ? undefined : employeeRecords.find(item => item.id === employeeId);
  const targetEmployeeId = employeeId ?? "BMG-NEW";
  const currentRule = employeeRules.filter(rule => rule.employeeId === targetEmployeeId).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const [saved, setSaved] = useState(false);
  const [payBasis, setPayBasis] = useState<PayBasis>(currentRule?.basis ?? "monthly");
  const [amount, setAmount] = useState(currentRule?.monthlySalary ?? currentRule?.dailyRate ?? 16000);
  const [payableDays, setPayableDays] = useState(currentRule?.payableDays ?? 26);
  const [pfOverride, setPfOverride] = useState<BenefitOverride>(currentRule?.pfOverride ?? "inherit");
  const [esiOverride, setEsiOverride] = useState<BenefitOverride>(currentRule?.esiOverride ?? "inherit");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-09-01");
  const [skills, setSkills] = useState<string[]>(employee ? [...employee.skills] : []);
  const availableSkills: string[] = [...skillOptions];
  const toggleSkill = (skill: string) => setSkills(current => current.includes(skill) ? current.filter(item => item !== skill) : [...current, skill]);
  const onboarding = useOnboarding();
  const canEditProfile = useAccess().canEdit("employee-form");
  const { config } = onboarding;
  const [savedProfile] = useState(() => onboarding.getProfile(targetEmployeeId));
  const homeDistrict = employee?.district ?? "";
  const [district, setDistrict] = useState(homeDistrict);
  const [joiningDate, setJoiningDate] = useState(isNew ? APP_TODAY : savedProfile.joiningDate);
  const [uan, setUan] = useState(savedProfile.uan ?? "");
  const [esiIp, setEsiIp] = useState(savedProfile.esiIpNumber ?? "");
  const [prefDistrict, setPrefDistrict] = useState(savedProfile.workPreference.district || homeDistrict);
  const [prefTaluk, setPrefTaluk] = useState(savedProfile.workPreference.taluk || ((keralaTaluks[savedProfile.workPreference.district || homeDistrict] ?? [])[0] ?? ""));
  const [sizes, setSizes] = useState(savedProfile.uniformSizes);
  const [customValues, setCustomValues] = useState(savedProfile.customFields);
  const [docs, setDocs] = useState<EmployeeDocument[]>(() => withChecklist(targetEmployeeId, savedProfile.documents, config.documentChecklist));
  const [nominee, setNominee] = useState(savedProfile.nominee);
  const statutory = statutoryStatus(statutoryNeeds(employee, pfOverride, esiOverride), uan, esiIp);
  const pfEsiOverdue = !statutory.complete && daysSince(joiningDate, APP_TODAY) >= config.pfEsiWindowDays;

  const saveEmployee = () => {
    updateEmployeeRule({ employeeId: targetEmployeeId, effectiveFrom, basis: payBasis, monthlySalary: payBasis === "monthly" ? amount : undefined, dailyRate: payBasis === "daily" ? amount : undefined, payableDays, pfOverride, esiOverride });
    onboarding.saveProfile(targetEmployeeId, {
      joiningDate, pfEsiDataReceived: statutory.complete, uan: uan.replace(/\s/g, ""), esiIpNumber: esiIp.replace(/\s/g, ""),
      workPreference: { district: prefDistrict, taluk: prefTaluk },
      uniformSizes: sizes, nominee, customFields: customValues, documents: docs,
    });
    setSaved(true);
    notify(isNew ? "Employee added" : "Employee profile saved");
  };
  const editDocRow = (index: number, patch: Partial<EmployeeDocument>) => setDocs(current => current.map((doc, row) => row === index ? { ...doc, ...patch } : doc));

  return <>
    <BackCrumb backLabel={NAV.workforce} onBack={onBack} current={employee ? employee.name : "New employee"} />
    <PageHeader
      title={isNew ? "Add employee" : "Edit employee"}
      subtitle="Identity, skills, documents, pay and statutory settings."
      actions={<>
        <Button variant="outline" onClick={onImport}>Import from spreadsheet</Button>
        <Button onClick={saveEmployee}><Save />{isNew ? "Add employee" : "Save changes"}</Button>
      </>}
    />
    {saved && <InlineAlert tone="success" className="mb-4">Employee profile, documents, nominee and onboarding details saved.</InlineAlert>}
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Identity and employment" description="Core details used across deployment and payroll.">
        <FormGrid>
          <Field label="Employee ID"><Input defaultValue={employee?.id ?? ""} placeholder="Assigned on save, e.g. BMG-2310" /></Field>
          <Field label="Full name" required><Input defaultValue={employee?.name ?? ""} placeholder="Employee name" /></Field>
          <Field label="Mobile number" required><Input defaultValue={employee?.phone ?? ""} placeholder="10-digit mobile" inputMode="tel" /></Field>
          <Field label="Home district" required>
            <Select value={district} onChange={event => setDistrict(event.target.value)}>
              <option value="" disabled>Select district</option>
              {districts.map(item => <option key={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Joining date" hint={statutory.needs.pf || statutory.needs.esi ? `PF/ESI numbers are due within ${config.pfEsiWindowDays} days of joining.` : undefined}>
            <Input type="date" value={joiningDate} onChange={event => setJoiningDate(event.target.value)} />
          </Field>
          {statutory.needs.pf && <Field label="PF UAN" hint={uan && !isValidUan(uan) ? "A UAN has 12 digits." : "Universal Account Number, 12 digits."}>
            <Input value={uan} onChange={event => setUan(event.target.value.replace(/[^\d\s]/g, ""))} inputMode="numeric" maxLength={14} placeholder="e.g. 101012345678" aria-invalid={!!uan && !isValidUan(uan)} />
          </Field>}
          {statutory.needs.esi && <Field label="ESI IP number" hint={esiIp && !isValidEsiIp(esiIp) ? "An ESI IP number has 10 digits." : "Insurance Person number, 10 digits."}>
            <Input value={esiIp} onChange={event => setEsiIp(event.target.value.replace(/[^\d\s]/g, ""))} inputMode="numeric" maxLength={12} placeholder="e.g. 3112345678" aria-invalid={!!esiIp && !isValidEsiIp(esiIp)} />
          </Field>}
          {!statutory.needs.pf && !statutory.needs.esi && <Field label="PF/ESI"><Input value="Not applicable for this employee" disabled /></Field>}
          <Field label="Employment status">
            <Select defaultValue={employee?.status === "Leave" ? "On leave" : employee?.status ?? "Active"}><option>Active</option><option>Reliever</option><option>On leave</option><option>Exit initiated</option></Select>
          </Field>
          <Field label="Preferred work district">
            <Select value={prefDistrict} onChange={event => { setPrefDistrict(event.target.value); setPrefTaluk((keralaTaluks[event.target.value] ?? [])[0] ?? ""); }}>
              <option value="" disabled>Select district</option>
              {keralaDistricts.map(item => <option key={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Preferred taluk">
            <Select value={prefTaluk} onChange={event => setPrefTaluk(event.target.value)} disabled={!prefDistrict}>
              {!prefDistrict && <option value="">Choose a district first</option>}
              {(keralaTaluks[prefDistrict] ?? []).map(item => <option key={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Shirt size"><Select value={sizes.shirt} onChange={event => setSizes({ ...sizes, shirt: event.target.value })}>{["S", "M", "L", "XL", "XXL"].map(size => <option key={size}>{size}</option>)}</Select></Field>
          <Field label="Trouser size"><Select value={sizes.trouser} onChange={event => setSizes({ ...sizes, trouser: event.target.value })}>{["30", "32", "34", "36", "38"].map(size => <option key={size}>{size}</option>)}</Select></Field>
          <Field label="Shoe size"><Select value={sizes.shoe} onChange={event => setSizes({ ...sizes, shoe: event.target.value })}>{["6", "7", "8", "9", "10", "11"].map(size => <option key={size}>{size}</option>)}</Select></Field>
        </FormGrid>
        {pfEsiOverdue && <InlineAlert tone="warning" className="mt-4">{`${statutory.missing.join(" and ")} not on file and ${config.pfEsiWindowDays} days have passed since joining (${joiningDate}). HR has been alerted.`}</InlineAlert>}
      </Panel>

      <Panel title="Skills and eligibility" description="Operations filter employees by these verified capabilities.">
        <div className="grid gap-2 sm:grid-cols-2">
          {availableSkills.map(skill => {
            const selected = skills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                aria-pressed={selected}
                className={cn("flex items-start gap-3 rounded-xl border p-3 text-left transition-colors", selected ? "border-emerald bg-emerald/5" : "border-border hover:bg-surface")}
              >
                <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", selected ? "border-emerald bg-emerald text-white" : "border-border")}>
                  {selected && <Check className="h-3.5 w-3.5" />}
                </span>
                <span>
                  <strong className="block text-sm font-medium">{skill}</strong>
                  <small className="text-xs text-muted">{skill === "Driving" ? "Record the licence under Documents" : "Eligible for matching posts"}</small>
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Documents" description="Checklist items are set in Settings. Pending items past their due date raise alerts." className="xl:col-span-2">
        <div className="hidden grid-cols-[minmax(140px,1fr)_140px_160px_auto] gap-3 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted md:grid">
          <span>Document</span><span>Status</span><span>Due by</span><span>File</span>
        </div>
        <div className="divide-y divide-border">
          {docs.map((doc, index) => {
            const overdue = doc.status === "pending" && doc.dueBy < APP_TODAY;
            return (
              <div className="grid gap-2 py-3 md:grid-cols-[minmax(140px,1fr)_140px_160px_auto] md:items-center md:gap-3" key={doc.id}>
                <span className="flex items-center gap-2 text-sm font-medium">{doc.type}{overdue && <StatusChip tone="danger">Overdue</StatusChip>}</span>
                <Select className="h-9" value={doc.status} onChange={event => editDocRow(index, { status: event.target.value as EmployeeDocumentStatus, uploadedOn: event.target.value === "pending" ? undefined : doc.uploadedOn })} aria-label={`${doc.type} status`}>
                  <option value="pending">Pending</option><option value="uploaded">Uploaded</option><option value="verified">Verified</option>
                </Select>
                <Input className="h-9" type="date" value={doc.dueBy} onChange={event => editDocRow(index, { dueBy: event.target.value })} aria-label={`${doc.type} due date`} />
                <FileSlot storageKey={`employee-${targetEmployeeId}-${doc.type}`} file={doc.file} label={doc.type} disabled={!canEditProfile}
                  onChange={file => editDocRow(index, file
                    ? { file, status: doc.status === "verified" ? "verified" : "uploaded", uploadedOn: file.uploadedOn }
                    : { file: undefined, status: "pending", uploadedOn: undefined })} />
              </div>
            );
          })}
        </div>
        <AddItemRow label="Add another document" placeholder="Document name, e.g. Driving licence" buttonLabel="Add document"
          existing={docs.map(doc => doc.type)} disabled={!canEditProfile}
          onAdd={type => setDocs(current => [...current, { id: `DOC-NEW-${Date.now()}`, employeeId: targetEmployeeId, type, status: "pending", dueBy: "2026-09-29" }])} />
      </Panel>

      <Panel title="Nominee" description="Identity, address and bank details for statutory records.">
        <FormGrid>
          <Field label="Nominee name"><Input value={nominee.name} onChange={event => setNominee(current => ({ ...current, name: event.target.value }))} placeholder="Full name" /></Field>
          <Field label="Relation"><Select value={nominee.relation} onChange={event => setNominee(current => ({ ...current, relation: event.target.value }))}>{["Spouse", "Father", "Mother", "Son", "Daughter", "Other"].map(relation => <option key={relation}>{relation}</option>)}</Select></Field>
          <Field label="Phone"><Input value={nominee.phone} onChange={event => setNominee(current => ({ ...current, phone: event.target.value }))} /></Field>
          <Field label="Bank account"><Input value={nominee.bankAccount} onChange={event => setNominee(current => ({ ...current, bankAccount: event.target.value }))} /></Field>
          <Field label="IFSC"><Input value={nominee.ifsc} onChange={event => setNominee(current => ({ ...current, ifsc: event.target.value }))} /></Field>
          <Field label="Address"><Textarea rows={2} className="min-h-11" value={nominee.address} onChange={event => setNominee(current => ({ ...current, address: event.target.value }))} /></Field>
        </FormGrid>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-3">
          <span><strong className="block text-sm font-medium">Nominee photo</strong><small className="text-xs text-muted">JPG, PNG or PDF, up to 5 MB</small></span>
          <FileSlot storageKey={`employee-${targetEmployeeId}-nominee-photo`} file={nominee.photo} label="nominee photo" disabled={!canEditProfile}
            onChange={photo => setNominee(current => ({ ...current, photo, photoOnFile: Boolean(photo) }))} />
        </div>
      </Panel>

      <Panel title="Additional fields" description="Defined by administrators in Settings.">
        {config.customFieldDefs.length === 0
          ? <p className="text-sm text-muted">No custom fields defined. Add them in Settings → Onboarding.</p>
          : <FormGrid>
            {config.customFieldDefs.map(def => <Field key={def.key} label={def.label}><Input type={def.kind === "number" ? "number" : def.kind === "date" ? "date" : "text"} value={customValues[def.key] ?? ""} onChange={event => setCustomValues(current => ({ ...current, [def.key]: event.target.value }))} /></Field>)}
          </FormGrid>}
      </Panel>

      <Panel title="Pay and statutory profile" description="Employee settings override organization, client and site defaults.">
        <FormGrid>
          <Field label="Pay basis">
            <Select value={payBasis} onChange={event => { const basis = event.target.value as PayBasis; setPayBasis(basis); setAmount(basis === "monthly" ? 16000 : 650); }}>
              <option value="monthly">Monthly salary</option><option value="daily">Fixed daily rate</option><option value="site">Site-wise rate</option>
            </Select>
          </Field>
          {payBasis !== "site"
            ? <Field label={payBasis === "monthly" ? "Monthly salary" : "Rate per duty"}><InputAffix prefix="₹" type="number" min="1" value={amount} onChange={event => setAmount(Number(event.target.value))} /></Field>
            : <InlineAlert><strong>Rate resolved per duty.</strong> Post override first, then site default. Missing rates block payroll.</InlineAlert>}
          <Field label="Salary denominator">
            <Select value={payableDays} onChange={event => setPayableDays(Number(event.target.value))} disabled={payBasis !== "monthly"}>
              <option value="26">26 scheduled payable days</option><option value="30">30 organization days</option><option value="31">Calendar days</option>
            </Select>
          </Field>
          <Field label="Payment method"><Select><option>Bank transfer</option><option>Cash</option></Select></Field>
          <Field label="Effective from"><Input type="date" value={effectiveFrom} onChange={event => setEffectiveFrom(event.target.value)} /></Field>
        </FormGrid>
        <FormGrid className="mt-4 border-t border-border pt-4">
          <Field label="Provident Fund (PF)" hint="An employee exception takes precedence over the site.">
            <Select value={pfOverride} onChange={event => setPfOverride(event.target.value as BenefitOverride)}><option value="inherit">Same as site</option><option value="enabled">Always deduct</option><option value="disabled">Never deduct</option></Select>
          </Field>
          <Field label="ESI" hint="An employee exception takes precedence over the site.">
            <Select value={esiOverride} onChange={event => setEsiOverride(event.target.value as BenefitOverride)}><option value="inherit">Same as site</option><option value="enabled">Always deduct</option><option value="disabled">Never deduct</option></Select>
          </Field>
        </FormGrid>
      </Panel>

      <Panel title="Opening balances" description="Enter balances carried over from the previous system, or import them in bulk."
        action={<Button variant="outline" size="sm" onClick={onImport}>Import balances</Button>}>
        <FormGrid>
          <Field label="Uniform recovery balance"><InputAffix prefix="₹" type="number" defaultValue={isNew ? 0 : 800} /></Field>
          <Field label="Advance balance"><InputAffix prefix="₹" type="number" defaultValue={0} /></Field>
          <Field label="Penalty carried forward"><InputAffix prefix="₹" type="number" defaultValue={0} /></Field>
          <Field label="Effective from"><Input type="date" defaultValue="2026-09-01" /></Field>
        </FormGrid>
      </Panel>
    </div>
  </>;
}

/* --------------------------- Site configuration ---------------------------- */

function bumpSiteDocumentVersion(current: string): string {
  const trimmed = current.trim() || "1.0";
  const parts = trimmed.split(".");
  const last = parts[parts.length - 1];
  const minor = Number(last);
  if (parts.length >= 2 && !Number.isNaN(minor)) {
    parts[parts.length - 1] = String(minor + 1);
    return parts.join(".");
  }
  const whole = Number(trimmed);
  if (!Number.isNaN(whole)) return String(whole + 1);
  return `${trimmed}.1`;
}

function versionAfterSiteDocumentUpload(previousVersion: string, hadFile: boolean): string {
  const base = previousVersion.trim() || "1.0";
  return hadFile ? bumpSiteDocumentVersion(base) : base;
}

type SiteTab = "Site profile" | "Posts and shifts" | "Geofence and attendance" | "Team and escalation" | "Documents and SOP" | "Salary and benefits";

export function SiteConfigurationScreen({ onBack, role, siteName, initialTab }: { onBack: () => void; role: string; siteName?: string | null; initialTab?: "profile" | "salary" | "boundary" | "documents" }) {
  const isNew = !siteName;
  const selectedSite = siteName ?? "";
  const siteRecord = siteRecords.find(item => item.name === selectedSite) ?? siteRecords[0];
  const { siteRules, postRules, updateSiteRule, updatePostRule } = usePayroll();
  const existingSiteRule = siteRules.filter(rule => rule.site === selectedSite).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const { can } = useAccess();
  const confirm = useConfirm();
  const salaryManager = can("salary", "view");
  const salaryEditor = can("salary", "edit");
  const firstTab: SiteTab = initialTab === "documents" ? "Documents and SOP"
    : initialTab === "salary" && salaryManager ? "Salary and benefits"
      : initialTab === "boundary" ? "Geofence and attendance"
        : "Site profile";
  const [tab, setTab] = useState<SiteTab>(firstTab);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(selectedSite);
  const [latitude, setLatitude] = useState(siteRecord.lat);
  const [longitude, setLongitude] = useState(siteRecord.lng);
  const [radius, setRadius] = useState(isNew ? 100 : siteRecord.radius);
  const [siteRate, setSiteRate] = useState(existingSiteRule?.defaultDutyRate ?? 0);
  const [scheme, setScheme] = useState<BenefitScheme>(existingSiteRule?.scheme ?? "salary-only");
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState("2026-09-01");
  const latestPostRate = (post: string): number | "" => postRules.filter(rule => rule.site === selectedSite && rule.post === post).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.dutyRate ?? "";
  const secondPost = selectedSite === "Aster Medcity" ? "Emergency" : "Loading bay";
  const [posts, setPosts] = useState<Array<{ name: string; shift: string; required: number; duty: string; rate: number | "" }>>(isNew
    ? [{ name: "Main gate", shift: "Day · 08:00–20:00", required: 1, duty: "1.00", rate: "" }]
    : [
      { name: "Main gate", shift: "Day · 08:00–20:00", required: 2, duty: "1.00", rate: latestPostRate("Main gate") },
      { name: secondPost, shift: "Night · 20:00–08:00", required: 2, duty: "1.00", rate: latestPostRate(secondPost) },
      { name: "Control room", shift: "24-hour rotation", required: 2, duty: "1.00", rate: latestPostRate("Control room") },
    ]);
  const notify = useToast();
  const locate = () => navigator.geolocation?.getCurrentPosition(result => {
    setLatitude(Number(result.coords.latitude.toFixed(6)));
    setLongitude(Number(result.coords.longitude.toFixed(6)));
  }, () => notify({ message: "Location permission was denied", kind: "error" }));
  const [boundaryMode, setBoundaryMode] = useState<"circle" | "polygon">(!isNew && siteRecord.polygon ? "polygon" : "circle");
  const [polygon, setPolygon] = useState<LatLng[]>(isNew ? [] : siteRecord.polygon ?? []);
  const [graceMins, setGraceMins] = useState(siteRecord.graceMins);
  const [dayInterval, setDayInterval] = useState(siteRecord.dayCheckIntervalMins);
  const [nightInterval, setNightInterval] = useState(siteRecord.nightCheckIntervalMins);
  const [patrol, setPatrol] = useState(siteRecord.patrol);
  const editPatrol = (shift: "day" | "night", patch: Partial<PatrolPlan>) => setPatrol(current => ({ ...current, [shift]: { ...current[shift], ...patch } }));
  // Shifts are 12 hours; flag a plan whose rounds can't all start within one shift.
  const patrolOverrun = (["day", "night"] as const).filter(shift => (patrol[shift].rounds - 1) * patrol[shift].intervalMins >= 12 * 60);
  const [contacts, setContacts] = useState<EscalationContact[]>(isNew ? [] : siteRecord.escalationContacts);
  const [officers, setOfficers] = useState<string[]>(isNew ? [] : siteRecord.fieldOfficers);
  const [docs, setDocs] = useState<SiteDocument[]>(siteDocuments.filter(doc => doc.site === selectedSite));
  const [docsDirty, setDocsDirty] = useState(false);
  const [feedbackEntries, setFeedbackEntries] = useState<SiteFeedback[]>(siteFeedback.filter(item => item.site === selectedSite));
  const [feedbackScore, setFeedbackScore] = useState(8);
  const [feedbackNote, setFeedbackNote] = useState("");
  const officerOptions = ["Ajmal Khan", "Praveen S", "Niyas P", "Meera K"];
  const editDoc = (index: number, patch: Partial<SiteDocument>) => {
    setDocs(current => current.map((doc, row) => row === index ? { ...doc, ...patch } : doc));
    setDocsDirty(true);
  };
  const confirmRemove = async (title: string, description: string, remove: () => void) => {
    if (await confirm({ title, description, confirmLabel: "Remove", destructive: true })) remove();
  };

  const save = () => {
    if (isNew && !name.trim()) { setTab("Site profile"); notify({ message: "Enter a site name before saving", kind: "error" }); return; }
    if (salaryEditor && !isNew) {
      updateSiteRule({ site: selectedSite, effectiveFrom: salaryEffectiveFrom, defaultDutyRate: siteRate || undefined, scheme });
      posts.forEach(post => updatePostRule(post.rate ? { site: selectedSite, post: post.name, effectiveFrom: salaryEffectiveFrom, dutyRate: Number(post.rate) } : null, selectedSite, post.name, salaryEffectiveFrom));
    }
    if (docsDirty) {
      setDocs(current => current.map(doc => ({ ...doc, updatedOn: APP_TODAY, updatedBy: role })));
      setDocsDirty(false);
      notify(`Site saved · ${officers[0] ?? "field officer"} notified of document changes`);
    } else {
      notify(isNew ? "Site added" : "Site saved");
    }
    setSaved(true);
  };

  const tabs: SiteTab[] = ["Site profile", "Posts and shifts", "Geofence and attendance", "Team and escalation", "Documents and SOP", ...(salaryManager ? ["Salary and benefits" as const] : [])];

  return <>
    <BackCrumb backLabel={NAV.sites} onBack={onBack} current={isNew ? "New site" : selectedSite} />
    <PageHeader title={isNew ? "Add site" : selectedSite} subtitle={isNew ? "Set up the client location, posts and attendance boundary." : `${siteRecord.client} · ${siteRecord.district}`}
      actions={<Button onClick={save}><Save />{isNew ? "Add site" : "Save changes"}</Button>} />
    {saved && <InlineAlert tone="success" className="mb-4">Site configuration saved.</InlineAlert>}
    <SegmentedControl options={tabs} value={tab} onChange={setTab} />

    {tab === "Site profile" && <Panel title="Client location" description="The client contract stays separate from operational posts.">
      <FormGrid>
        <Field label="Client" required><Select defaultValue={isNew ? "" : siteRecord.client}>{isNew && <option value="" disabled>Select client</option>}{Array.from(new Set([siteRecord.client, "Lulu Group", "TCS", "Aster DM Healthcare"])).map(item => <option key={item}>{item}</option>)}</Select></Field>
        <Field label="Site name" required><Input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Lulu Mall, Kochi" /></Field>
        <Field label="District" required><Select defaultValue={isNew ? "" : siteRecord.district}>{isNew && <option value="" disabled>Select district</option>}{districts.map(item => <option key={item}>{item}</option>)}</Select></Field>
        <Field label="Site code"><Input defaultValue={isNew ? "" : "SITE-EKM-014"} placeholder="Generated on save" /></Field>
        <Field label="Contract start"><Input type="date" defaultValue={isNew ? APP_TODAY : "2026-01-01"} /></Field>
        <Field label="Site contact"><Input defaultValue={isNew ? "" : "Site Manager · 98470 33445"} placeholder="Name and phone" /></Field>
      </FormGrid>
    </Panel>}

    {tab === "Posts and shifts" && <Panel title="Posts" description={salaryManager ? "Shift, headcount, duty value and optional pay override per post." : "Shift, headcount and duty value per post."}
      action={<Button variant="outline" size="sm" onClick={() => setPosts(current => [...current, { name: "New post", shift: "Day · 08:00–20:00", required: 1, duty: "1.00", rate: "" }])}><Plus />Add post</Button>}>
      <div className={cn("hidden gap-3 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted md:grid", salaryManager ? "md:grid-cols-[1.4fr_1.3fr_90px_100px_120px_40px]" : "md:grid-cols-[1.4fr_1.3fr_90px_100px_40px]")}>
        <span>Post name</span><span>Shift</span><span>Headcount</span><span>Duty value</span>{salaryManager && <span>Pay override</span>}<span />
      </div>
      {posts.length === 0 && <p className="py-4 text-sm text-muted">No posts yet. Add the first post to start rostering.</p>}
      <div className="divide-y divide-border">
        {posts.map((post, index) => (
          <div key={index} className={cn("grid gap-2 py-3 md:items-center md:gap-3", salaryManager ? "md:grid-cols-[1.4fr_1.3fr_90px_100px_120px_40px]" : "md:grid-cols-[1.4fr_1.3fr_90px_100px_40px]")}>
            <Input className="h-9" value={post.name} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} aria-label={`Post ${index + 1} name`} />
            <Select className="h-9" value={post.shift} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, shift: event.target.value } : item))}><option>Day · 08:00–20:00</option><option>Night · 20:00–08:00</option><option>24-hour rotation</option><option>Flexible</option></Select>
            <Input className="h-9" type="number" min={1} value={post.required} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, required: Number(event.target.value) } : item))} aria-label="Required headcount" />
            <Select className="h-9" value={post.duty} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, duty: event.target.value } : item))}>{dutyUnits.map(unit => <option key={unit}>{unit}</option>)}</Select>
            {salaryManager && <InputAffix className="[&_input]:h-9" prefix="₹" type="number" min="0" value={post.rate} placeholder="Site rate" onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, rate: event.target.value === "" ? "" : Number(event.target.value) } : item))} aria-label={`${post.name} pay override`} />}
            <Button variant="ghost" size="icon" className="h-9 w-9 text-status-danger" title="Remove post" aria-label={`Remove ${post.name}`}
              onClick={() => confirmRemove(`Remove ${post.name}?`, "Guards rostered to this post will need a new assignment.", () => setPosts(current => current.filter((_, row) => row !== index)))}><Trash2 /></Button>
          </div>
        ))}
      </div>
    </Panel>}

    {tab === "Geofence and attendance" && <SplitLayout wideFirst>
      <Panel title="Attendance boundary" description="Guards can only punch in inside this area. Use satellite view to trace the site's walls or fence.">
        <BoundaryEditor mode={boundaryMode} onModeChange={setBoundaryMode}
          center={{ lat: latitude, lng: longitude }} radius={radius} polygon={polygon}
          onCircleChange={(next, nextRadius) => { setLatitude(next.lat); setLongitude(next.lng); setRadius(nextRadius); }}
          onPolygonChange={points => {
            setPolygon(points);
            // The site pin follows the outline so maps and distance hints still centre on the site.
            if (points.length >= 3) {
              setLatitude(Number((points.reduce((sum, point) => sum + point.lat, 0) / points.length).toFixed(6)));
              setLongitude(Number((points.reduce((sum, point) => sum + point.lng, 0) / points.length).toFixed(6)));
            }
          }} />
      </Panel>
      <Panel title="Boundary and attendance rules" className="lg:sticky lg:top-20 lg:self-start"
        description={boundaryMode === "circle" ? "The circle's centre. Paste coordinates, use this device's location, or drag the pin on the map." : "The outline on the map decides who is inside. The site pin is placed at its centre automatically."}>
        <FormStack>
          {boundaryMode === "circle" && <><FormGrid>
            <Field label="Latitude"><Input type="number" step="0.000001" value={latitude} onChange={event => setLatitude(Number(event.target.value))} /></Field>
            <Field label="Longitude"><Input type="number" step="0.000001" value={longitude} onChange={event => setLongitude(Number(event.target.value))} /></Field>
          </FormGrid>
          <Button variant="outline" onClick={locate}><Crosshair />Use my current location</Button></>}
          {boundaryMode === "circle" && <Field label="Boundary radius"><InputAffix suffix="metres" type="number" value={radius} onChange={event => setRadius(Number(event.target.value))} /></Field>}
          <FormGrid>
            <Field label="Late-arrival grace" hint="15–60 minutes per site policy."><InputAffix suffix="minutes" type="number" min={15} max={60} value={graceMins} onChange={event => setGraceMins(Number(event.target.value))} /></Field>
            <Field label="GPS accuracy threshold"><InputAffix suffix="metres" type="number" defaultValue={50} /></Field>
            <Field label="Day presence-check interval"><InputAffix suffix="minutes" type="number" min={15} value={dayInterval} onChange={event => setDayInterval(Number(event.target.value))} /></Field>
            <Field label="Night presence-check interval"><InputAffix suffix="minutes" type="number" min={15} value={nightInterval} onChange={event => setNightInterval(Number(event.target.value))} /></Field>
          </FormGrid>
          <FormGrid>
            <Field label="Day patrol rounds" hint="Rounds the guard walks each day shift."><InputAffix suffix="rounds" type="number" min={0} value={patrol.day.rounds} onChange={event => editPatrol("day", { rounds: Number(event.target.value) })} /></Field>
            <Field label="Day patrol interval" hint="Time between the start of each round."><InputAffix suffix="minutes" type="number" min={15} value={patrol.day.intervalMins} onChange={event => editPatrol("day", { intervalMins: Number(event.target.value) })} /></Field>
            <Field label="Night patrol rounds" hint="Rounds the guard walks each night shift."><InputAffix suffix="rounds" type="number" min={0} value={patrol.night.rounds} onChange={event => editPatrol("night", { rounds: Number(event.target.value) })} /></Field>
            <Field label="Night patrol interval" hint="Time between the start of each round."><InputAffix suffix="minutes" type="number" min={15} value={patrol.night.intervalMins} onChange={event => editPatrol("night", { intervalMins: Number(event.target.value) })} /></Field>
          </FormGrid>
          {patrolOverrun.length > 0 && <InlineAlert tone="warning">{patrolOverrun.map(shift => shift === "day" ? "Day" : "Night").join(" and ")} patrol rounds don&apos;t fit in a 12-hour shift. Reduce the rounds or the interval.</InlineAlert>}
          <ToggleRow title="Allow shared devices" description="Every punch still requires employee identity" />
          <ToggleRow title="Flag mock-location signals" description="Send suspicious punches to HR for review" defaultChecked />
        </FormStack>
      </Panel>
    </SplitLayout>}

    {tab === "Team and escalation" && <SplitLayout>
      <Panel title="Field officers" description="FO 1 leads; FO 2 and FO 3 are backups. Guard-change alerts go to FO 1."
        action={<Button variant="outline" size="sm" disabled={officers.length >= officerOptions.length} onClick={() => setOfficers(current => [...current, officerOptions.find(person => !current.includes(person)) ?? officerOptions[0]])}><Plus />Add field officer</Button>}>
        {officers.length === 0 && <InlineAlert tone="warning">No field officer linked. Guard-change alerts have nowhere to go.</InlineAlert>}
        {officers.map((officer, index) => (
          <ListRow key={`${officer}-${index}`}>
            <StatusChip tone="info">FO {index + 1}</StatusChip>
            <Select className="h-9 flex-1" value={officer} onChange={event => setOfficers(current => current.map((item, row) => row === index ? event.target.value : item))} aria-label={`Field officer ${index + 1}`}>{officerOptions.map(person => <option key={person}>{person}</option>)}</Select>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-status-danger" aria-label={`Remove FO ${index + 1}`} title="Remove field officer"
              onClick={() => confirmRemove(`Remove ${officer} from this site?`, "They will stop receiving guard-change alerts for this site.", () => setOfficers(current => current.filter((_, row) => row !== index)))}><Trash2 /></Button>
          </ListRow>
        ))}
      </Panel>
      <Panel title="Escalation contacts" description="Shown to guards in the mobile app."
        action={<Button variant="outline" size="sm" onClick={() => setContacts(current => [...current, { label: "New contact", name: "", phone: "" }])}><Plus />Add contact</Button>}>
        {contacts.length === 0 && <p className="text-sm text-muted">No contacts yet. Guards will only see the BMG control room.</p>}
        {contacts.map((contact, index) => (
          <ListRow key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_40px]">
            <Input className="h-9" value={contact.label} onChange={event => setContacts(current => current.map((item, row) => row === index ? { ...item, label: event.target.value } : item))} aria-label={`Contact ${index + 1} role`} placeholder="Role" />
            <Input className="h-9" value={contact.name} onChange={event => setContacts(current => current.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} aria-label={`Contact ${index + 1} name`} placeholder="Name" />
            <Input className="h-9" value={contact.phone} onChange={event => setContacts(current => current.map((item, row) => row === index ? { ...item, phone: event.target.value } : item))} aria-label={`Contact ${index + 1} phone`} placeholder="Phone" />
            <Button variant="ghost" size="icon" className="h-9 w-9 text-status-danger" aria-label={`Remove contact ${index + 1}`} title="Remove contact"
              onClick={() => confirmRemove(`Remove ${contact.name || contact.label}?`, "Guards will no longer see this contact in the app.", () => setContacts(current => current.filter((_, row) => row !== index)))}><Trash2 /></Button>
          </ListRow>
        ))}
      </Panel>
    </SplitLayout>}

    {tab === "Documents and SOP" && <>
      <Panel title="Site documents" description="Agreement, PCC, biodata, SOP and check data. One row per document — attach a file, then save. The lead field officer is notified."
        action={<Button variant="outline" size="sm" onClick={() => { setDocs(current => [...current, { id: `SDOC-${Date.now()}`, site: selectedSite, kind: "sop", title: "New document", version: "1.0", updatedOn: APP_TODAY, updatedBy: role }]); setDocsDirty(true); }}><Plus />Add document</Button>}>
        {docs.length === 0 && <p className="text-sm text-muted">No documents recorded for this site yet.</p>}
        {docs.length > 0 && (
          <div className="-mx-1 overflow-x-auto">
            <div className="min-w-[920px] px-1">
              <div className="grid grid-cols-[minmax(148px,1fr)_minmax(220px,2fr)_72px_minmax(240px,1.4fr)_40px] items-end gap-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <span>Type</span><span>Title</span><span>Ver.</span><span>File</span><span />
              </div>
              <div className="divide-y divide-border">
                {docs.map((doc, index) => (
                  <div key={doc.id} className="grid grid-cols-[minmax(148px,1fr)_minmax(220px,2fr)_72px_minmax(240px,1.4fr)_40px] items-center gap-3 py-3">
                    <Select className="h-9 w-full" value={doc.kind} onChange={event => editDoc(index, { kind: event.target.value as SiteDocumentKind })} aria-label={`Document ${index + 1} type`}>
                      <option value="agreement">Client agreement</option><option value="pcc-requirement">PCC requirement</option><option value="biodata-requirement">Biodata requirement</option><option value="sop">SOP</option><option value="check-data">Check data</option>
                    </Select>
                    <div className="min-w-0">
                      <Input className="h-9 w-full" value={doc.title} onChange={event => editDoc(index, { title: event.target.value })} aria-label={`Document ${index + 1} title`} />
                      <small className="mt-1 block truncate text-[11px] text-muted">Updated {doc.updatedOn}</small>
                    </div>
                    <Input className="h-9 w-full bg-surface" value={doc.version} readOnly aria-readonly title="Updates automatically when you upload or replace a file" aria-label={`Document ${index + 1} version`} />
                    <FileSlot
                      storageKey={`site-${selectedSite}-${doc.id}`}
                      file={doc.file}
                      label={doc.title}
                      onChange={file => {
                        if (!file) { editDoc(index, { file: undefined }); return; }
                        const hadFile = Boolean(doc.file);
                        editDoc(index, {
                          file,
                          version: versionAfterSiteDocumentUpload(doc.version, hadFile),
                          updatedOn: APP_TODAY,
                        });
                      }}
                    />
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-status-danger" aria-label={`Remove ${doc.title}`} title="Remove document"
                      onClick={() => confirmRemove(`Remove ${doc.title}?`, "The document will be removed from this site when you save.", () => { setDocs(current => current.filter((_, row) => row !== index)); setDocsDirty(true); })}><Trash2 /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {docsDirty && <InlineAlert tone="warning" className="mt-3">Unsaved document changes. Saving notifies {officers[0] ?? "the field officer"}.</InlineAlert>}
      </Panel>
      <Panel title="Client feedback" description="Satisfaction scores collected at this site." className="mt-4">
        {feedbackEntries.length === 0 && <p className="mb-3 text-sm text-muted">No feedback recorded yet.</p>}
        {feedbackEntries.map(entry => (
          <ListRow key={entry.id}>
            <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald/10 text-sm font-bold text-emerald">{entry.satisfaction}/10</span>
            <div className="min-w-0"><strong className="block text-sm font-medium">{entry.date}</strong><small className="text-xs text-muted">{entry.note}</small></div>
          </ListRow>
        ))}
        <div className="mt-4 grid gap-4 border-t border-border pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(160px,0.28fr)_1fr] sm:gap-x-4 sm:gap-y-2">
            <div className="grid gap-2 sm:contents">
              <span className="text-sm font-medium text-foreground">Satisfaction</span>
              <StarRating value={feedbackScore} onChange={setFeedbackScore} />
            </div>
            <div className="grid gap-2 sm:contents">
              <span className="text-sm font-medium text-foreground">What did the client say?</span>
              <Textarea rows={2} value={feedbackNote} onChange={event => setFeedbackNote(event.target.value)} placeholder="Summary of the conversation" aria-label="Client feedback" />
            </div>
          </div>
          <Button variant="outline" className="w-fit" disabled={!feedbackNote.trim()} onClick={() => { setFeedbackEntries(current => [{ id: `FB-${Date.now()}`, site: selectedSite, date: APP_TODAY, satisfaction: feedbackScore, note: feedbackNote.trim() }, ...current]); setFeedbackNote(""); notify("Client feedback recorded"); }}><Plus />Record feedback</Button>
        </div>
      </Panel>
    </>}

    {tab === "Salary and benefits" && salaryManager && <SplitLayout>
      <Panel title="Site pay rule" description="Used for employees paid site-wise.">
        <FormStack>
          <Field label="Default rate per duty" hint="A post override replaces this rate for duties on that post."><InputAffix prefix="₹" type="number" min="0" value={siteRate} disabled={!salaryEditor} onChange={event => setSiteRate(Number(event.target.value))} /></Field>
          <Field label="Effective from" hint="Earlier duties keep the rule that was effective on their duty date."><Input type="date" value={salaryEffectiveFrom} disabled={!salaryEditor} onChange={event => setSalaryEffectiveFrom(event.target.value)} /></Field>
          <div className="grid gap-2">
            {([
              ["salary-only", "Salary only", "No PF or ESI at this site"],
              ["esi", "Salary + ESI", "ESI applies to eligible earnings"],
              ["pf-esi", "Salary + ESI + PF", "Both contributions apply"],
            ] as const).map(item => (
              <label key={item[0]} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3", scheme === item[0] ? "border-emerald bg-emerald/5" : "border-border")}>
                <input type="radio" name="site-scheme" className="mt-1 accent-[#00be73]" checked={scheme === item[0]} disabled={!salaryEditor} onChange={() => setScheme(item[0])} />
                <span><strong className="block text-sm font-medium">{item[1]}</strong><small className="text-xs text-muted">{item[2]}</small></span>
              </label>
            ))}
          </div>
        </FormStack>
      </Panel>
      <Panel title="Statutory settings" description="Organization rules applied to eligible earnings.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3"><span className="text-xs text-muted">Employee PF</span><strong className="block text-2xl font-bold">{statutorySettings.pfRate * 100}%</strong><small className="text-xs text-muted">Wage ceiling {rupees(statutorySettings.pfWageCeiling)}</small></div>
          <div className="rounded-xl border border-border p-3"><span className="text-xs text-muted">Employee ESI</span><strong className="block text-2xl font-bold">{statutorySettings.esiRate * 100}%</strong><small className="text-xs text-muted">Eligibility ceiling {rupees(statutorySettings.esiWageCeiling)}</small></div>
        </div>
        <Section title="Rate history" className="mt-5 mb-0">
          {siteRules.filter(rule => rule.site === selectedSite).length === 0 && <p className="text-sm text-muted">No pay rule recorded yet.</p>}
          {siteRules.filter(rule => rule.site === selectedSite).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map(rule => (
            <KeyValue key={rule.effectiveFrom} label={rule.effectiveFrom} value={<>{rule.defaultDutyRate ? `${rupees(rule.defaultDutyRate)} / duty` : "Rate missing"} <span className="ml-2 font-normal text-muted">{rule.scheme === "pf-esi" ? "PF + ESI" : rule.scheme === "esi" ? "ESI" : "Salary only"}</span></>} />
          ))}
        </Section>
      </Panel>
    </SplitLayout>}
  </>;
}

/* -------------------------- Payroll allocation audit ------------------------ */

export function PayrollAllocationScreen({ employeeId: selectedEmployeeId, onBack, onNavigate }: { employeeId?: string | null; onBack: () => void; onNavigate?: (view: string, meta?: string | NavClickMeta) => void }) {
  const notify = useToast();
  const { getBreakdown } = usePayroll();
  const [employeeId, setEmployeeId] = useState(selectedEmployeeId ?? "BMG-2274");
  const [approved, setApproved] = useState(false);

  const employee = employeeRecords.find(item => item.id === employeeId) ?? employeeRecords[0];
  const breakdown = getBreakdown(employeeId);

  return <>
    <BackCrumb backLabel={NAV.payroll} onBack={onBack} current="Multi-site allocation" />
    <PageHeader title="Multi-site payroll allocation" subtitle={`${employee.name} · August 2026 · calculated from approved duties`}
      actions={<>
        <Select className="h-10 w-auto min-w-[180px]" value={employeeId} onChange={event => { setEmployeeId(event.target.value); setApproved(false); }} aria-label="Employee">
          {employeeRecords.filter(item => getBreakdown(item.id).duties > 0).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Button disabled={breakdown.exceptions.length > 0 || approved} onClick={() => { setApproved(true); notify("Allocation approved"); }}><CheckCircle2 />{approved ? "Approved" : "Approve allocation"}</Button>
      </>} />
    {approved && <InlineAlert tone="success" className="mb-4">Allocation approved and added to the payroll audit trail.</InlineAlert>}
    {breakdown.exceptions.length > 0 && <InlineAlert tone="danger" className="mb-4">{breakdown.exceptions.length} configuration exception{breakdown.exceptions.length === 1 ? "" : "s"} must be resolved before approval.</InlineAlert>}
    <StatStrip items={[
      { icon: CalendarCheck, value: breakdown.duties.toFixed(2), label: "Approved duties", note: "Across all sites", onClick: () => onNavigate?.("attendance"), actionLabel: "Open attendance" },
      { icon: Wallet, value: rupees(breakdown.gross), label: "Allocated gross", note: "Resolved duty rates", tone: "green", onClick: onBack, actionLabel: "Back to the payroll register" },
      { icon: ShieldCheck, value: rupees(breakdown.pf), label: "Employee PF", note: "Eligible site earnings", onClick: () => onNavigate?.("reports", { report: "Statutory contributions" }), actionLabel: "Open the statutory contributions report" },
      { icon: ShieldCheck, value: rupees(breakdown.esi), label: "Employee ESI", note: "Eligible site earnings", onClick: () => onNavigate?.("settings", { settingsGroup: "PF and ESI" }), actionLabel: "Open PF and ESI settings" },
    ]} />
    <Panel title="Site allocation" description="Earnings and contributions use the rule effective on each approved duty." flush>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="bg-surface text-left text-xs uppercase tracking-wide text-muted">{["Site", "Duties", "Rate source", "Gross", "PF", "ESI", "Net"].map(head => <th key={head} className={cn("px-4 py-3 font-semibold", head !== "Site" && head !== "Rate source" && "text-right")}>{head}</th>)}</tr></thead>
          <tbody>
            {breakdown.sites.map(site => (
              <tr key={site.site} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{site.site}</td>
                <td className="px-4 py-3 text-right tabular-nums">{site.duties.toFixed(2)}</td>
                <td className="px-4 py-3 text-muted">{site.rateSources.join(" / ")} · {site.schemeLabel}</td>
                <td className="px-4 py-3 text-right tabular-nums">{rupees(site.gross)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{rupees(site.pf)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{rupees(site.esi)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{rupees(site.net)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-surface font-semibold">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3 text-right tabular-nums">{breakdown.duties.toFixed(2)}</td>
              <td />
              <td className="px-4 py-3 text-right tabular-nums">{rupees(breakdown.gross)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{rupees(breakdown.pf)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{rupees(breakdown.esi)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{rupees(breakdown.gross - breakdown.pf - breakdown.esi)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="border-t border-border p-4">
        <InlineAlert><strong>How this is calculated.</strong> Monthly and fixed daily rates ignore site pay rates. Site-wise employees use the post override first, then the site default. Site benefits apply unless the employee has an explicit exception.</InlineAlert>
      </div>
    </Panel>
  </>;
}

/* ------------------------------ Night checks ------------------------------- */

/** The guard app demo signs in as the guard whose check is due now. */
const GUARD_NIGHT_CHECK_ID = "BMG-1932";

export function NightVigilanceScreen({ onBack, guardMode = false }: { onBack: () => void; guardMode?: boolean }) {
  const notify = useToast();
  const [interval, setIntervalValue] = useState("60 minutes");
  const { nightChecks: checks, confirmNightCheck } = useOps();
  const confirmPresence = (check: NightCheck) => {
    confirmNightCheck(check.empId);
    notify(guardMode ? "Presence confirmed" : `Presence recorded for ${check.employee}`);
  };
  const visible = guardMode ? checks.filter(item => item.empId === GUARD_NIGHT_CHECK_ID) : checks;

  return <>
    {guardMode
      ? <BackCrumb backLabel="Home" onBack={onBack} current="Night check" />
      : null}
    <PageHeader title={guardMode ? "Night check" : NAV.nightChecks}
      subtitle={guardMode ? "Confirm you are at your post. It takes one tap and a location sample." : "Low-bandwidth presence checks during night duty, with escalation for missed responses."} />
    {!guardMode && <SplitLayout>
      <Panel title="Check-in policy" description="Organization default. Sites and posts can override it.">
        <FormStack>
          <Field label="Check every"><Select value={interval} onChange={event => setIntervalValue(event.target.value)}><option>30 minutes</option><option>45 minutes</option><option>60 minutes</option><option>90 minutes</option></Select></Field>
          <Field label="Guard must respond within"><InputAffix suffix="minutes" type="number" defaultValue={10} /></Field>
          <Field label="If a check is missed, alert"><Select><option>District operations and HR</option><option>District operations only</option><option>{ROLE_TERMS.fieldOfficer} on duty</option></Select></Field>
          <Button onClick={() => notify(`Night check policy saved · every ${interval}`)}><Save />Save policy</Button>
        </FormStack>
      </Panel>
      <Panel title="How a night check works" description="No photo upload is needed.">
        <div className="flex items-start gap-3">
          <IconTile icon={Clock} />
          <div>
            <strong className="block text-sm font-medium">One tap and a location sample</strong>
            <p className="mt-1 text-sm text-muted">The app records the time, approximate location, device and how quickly the guard responded, using minimal mobile data.</p>
          </div>
        </div>
      </Panel>
    </SplitLayout>}
    <Panel title={guardMode ? "Current check" : "Live check-in board"} description={guardMode ? "Confirm while you are at your assigned post." : "Missed checks become attendance exceptions and vacancy risks."}>
      {visible.length === 0 && <p className="text-sm text-muted">No checks due right now.</p>}
      {visible.map(item => (
        <ListRow key={item.empId}>
          <div className="min-w-0 flex-1"><PersonCell name={item.employee} id={item.site} phone={guardMode ? undefined : phoneOf(item.empId)} /></div>
          <span className="text-sm"><strong className="block tabular-nums">{item.due}</strong><small className="text-xs text-muted">Due</small></span>
          <StatusChip tone={item.state === "Confirmed" ? "success" : item.state === "Missed" ? "danger" : item.state === "Due now" ? "warning" : "neutral"}>{item.state}</StatusChip>
          <Button size="sm" variant={item.state === "Confirmed" ? "outline" : "default"} disabled={item.state === "Confirmed"} onClick={() => confirmPresence(item)}>
            {item.state === "Confirmed" ? <><CheckCircle2 />Confirmed</> : <><Crosshair />{guardMode ? "I'm at my post" : "Mark present"}</>}
          </Button>
        </ListRow>
      ))}
    </Panel>
  </>;
}

/* ------------------------------ Exit clearance ----------------------------- */

export function ExitClearanceScreen() {
  const notify = useToast();
  const confirm = useConfirm();
  const { addVacancy } = useOps();
  const [exitEmployeeId, setExitEmployeeId] = useState(employeeRecords[0].id);
  const [exitDate, setExitDate] = useState("2026-09-30");
  const [exitTime, setExitTime] = useState("18:00");
  const [exitReason, setExitReason] = useState("");
  const [exitAdjustments, setExitAdjustments] = useState("");
  const [exitPriority, setExitPriority] = useState<"high" | "normal">("normal");
  const [exitRecorded, setExitRecorded] = useState(false);
  const exitEmployee = employeeRecords.find(item => item.id === exitEmployeeId) ?? employeeRecords[0];

  const initiateExit = async () => {
    const ok = await confirm({
      title: `Record exit for ${exitEmployee.name}?`,
      description: `${exitEmployee.name} leaves on ${exitDate} at ${exitTime}. Their post at ${exitEmployee.site} becomes an open vacancy in Recruitment.`,
      confirmLabel: "Record exit",
      destructive: true,
    });
    if (!ok) return;
    addVacancy({
      id: `VAC-${Date.now()}`,
      site: exitEmployee.site === "Unassigned" ? "Reliever pool" : exitEmployee.site,
      post: `${exitEmployee.role} · ${exitEmployee.shift}`,
      district: exitEmployee.district,
      priority: exitPriority,
      openedOn: exitDate,
      source: "exit",
      status: "open",
    });
    setExitRecorded(true);
    notify("Exit recorded · vacancy added to Recruitment");
  };
  const records = [
    { id: "BMG-2031", name: "Anzar M", site: "Lake Palace Resort", uniform: 800, advance: 0, penalty: 0 },
    { id: "BMG-1469", name: "Hareendrakumar K", site: "Travancore Medicity", uniform: 0, advance: 1500, penalty: 500 },
    { id: "BMG-1778", name: "Shamnad C M", site: "Caritas Hospital", uniform: 0, advance: 0, penalty: 0 },
  ];
  const [selectedId, setSelectedId] = useState(records[0].id);
  const [uniformDue, setUniformDue] = useState(records[0].uniform);
  const [returned, setReturned] = useState(false);
  const [approved, setApproved] = useState(false);
  const [detail, setDetail] = useState<"advance" | "penalty" | null>(null);
  const selected = records.find(item => item.id === selectedId) ?? records[0];
  const totalDue = uniformDue + selected.advance + selected.penalty;
  const blocked = totalDue > 0 || !returned;
  const selectRecord = (id: string) => {
    const record = records.find(item => item.id === id) ?? records[0];
    setSelectedId(id); setUniformDue(record.uniform); setReturned(false); setApproved(false);
  };
  const settleUniform = async () => {
    if (await confirm({ title: "Record uniform settlement?", description: `Confirms ${rupees(uniformDue)} has been paid or recovered for ${selected.name}.`, confirmLabel: "Record settlement" })) {
      setUniformDue(0);
      notify("Uniform settlement recorded");
    }
  };
  const approve = async () => {
    if (await confirm({ title: `Approve exit clearance for ${selected.name}?`, description: "Final settlement will be released and the employee marked as exited. This cannot be undone.", confirmLabel: "Approve clearance" })) {
      setApproved(true);
      notify("Exit clearance approved");
    }
  };

  return <>
    <PageHeader title={NAV.exitClearance} subtitle="Record resignations and withdrawals, then clear every due before final settlement." />
    <Panel title="Record an exit" description="The vacancy moves to Recruitment automatically." className="mb-4">
      <FormGrid className="lg:grid-cols-3">
        <Field label="Employee" required><Select value={exitEmployeeId} onChange={event => { setExitEmployeeId(event.target.value); setExitRecorded(false); }}>{employeeRecords.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</Select></Field>
        <Field label="Exit date" required><Input type="date" value={exitDate} onChange={event => setExitDate(event.target.value)} /></Field>
        <Field label="Exit time"><Input type="time" value={exitTime} onChange={event => setExitTime(event.target.value)} /></Field>
        <Field label="Vacancy priority"><Select value={exitPriority} onChange={event => setExitPriority(event.target.value as "high" | "normal")}><option value="normal">Normal</option><option value="high">High — critical post</option></Select></Field>
        <Field label="Reason" required><Input value={exitReason} onChange={event => setExitReason(event.target.value)} placeholder="Resignation, relocation, termination…" /></Field>
        <Field label="Settlement notes"><Input value={exitAdjustments} onChange={event => setExitAdjustments(event.target.value)} placeholder="Final salary, leave encashment, recoveries" /></Field>
      </FormGrid>
      {exitRecorded && <InlineAlert tone="success" className="mt-4">{`Exit recorded for ${exitDate} ${exitTime}. The vacancy is now visible in Recruitment.`}</InlineAlert>}
      <div className="mt-4 flex justify-end">
        <Button disabled={exitRecorded || !exitReason.trim()} onClick={initiateExit}><CheckCircle2 />{exitRecorded ? "Exit recorded" : "Record exit"}</Button>
      </div>
    </Panel>
    <SplitLayout>
      <Panel title="Pending clearances" description="Select an employee to review recovery items.">
        {records.map(item => {
          const due = item.uniform + item.advance + item.penalty;
          return (
            <ListRow key={item.id} onClick={() => selectRecord(item.id)} active={selectedId === item.id}>
              <div className="min-w-0 flex-1"><PersonCell name={item.name} id={item.id} phone={phoneOf(item.id)} /></div>
              <span className="text-xs text-muted">{due > 0 ? `${rupees(due)} due` : "No dues"}</span>
              <StatusChip tone={due > 0 ? "danger" : "success"}>{due > 0 ? "Dues pending" : "Ready"}</StatusChip>
            </ListRow>
          );
        })}
      </Panel>
      <Panel title={selected.name} description={`${selected.id} · ${selected.site}`}>
        {approved ? <InlineAlert tone="success">Exit clearance approved and employee status updated.</InlineAlert> : <FormStack>
          <InlineAlert tone={blocked ? "warning" : "success"}>
            <strong>{blocked ? "Clearance is blocked." : "Ready for approval."}</strong> {blocked ? "Settle every due and confirm all assets were returned." : "All mandatory checks are complete."}
          </InlineAlert>
          <div className="rounded-xl border border-border">
            {[
              { label: "Uniform recovery", amount: uniformDue, action: uniformDue > 0 ? <Button size="sm" variant="outline" onClick={settleUniform}>Record settlement</Button> : null },
              { label: "Salary advance", amount: selected.advance, action: <Button size="sm" variant="ghost" onClick={() => setDetail("advance")}>View details</Button> },
              { label: "Verified penalty", amount: selected.penalty, action: <Button size="sm" variant="ghost" onClick={() => setDetail("penalty")}>View details</Button> },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 border-t border-border px-3 py-2.5 text-sm first:border-t-0">
                <span className="flex-1 text-muted">{row.label}</span>
                <strong className={cn("tabular-nums", row.amount > 0 && "text-status-danger")}>{rupees(row.amount)}</strong>
                {row.action}
              </div>
            ))}
          </div>
          <ToggleRow title="All issued assets returned" description="Uniform pieces, ID card, registers and site property" checked={returned} onChange={setReturned} />
          <Button disabled={blocked} onClick={approve}><CheckCircle2 />Approve exit clearance</Button>
        </FormStack>}
      </Panel>
    </SplitLayout>

    {detail === "advance" && <DetailDrawer title="Salary advance recovery" subtitle={`${selected.name} · ${selected.id}`} onClose={() => setDetail(null)}
      footer={<Button variant="outline" onClick={() => setDetail(null)}>Close</Button>}>
      <Section title="Outstanding balance">
        <DefRows rows={[
          { label: "Original advance", value: rupees(selected.advance ? 4500 : 0), mono: true },
          { label: "Recovered so far", value: rupees(selected.advance ? 3000 : 0), mono: true },
          { label: "Balance at exit", value: rupees(selected.advance), mono: true, total: true },
        ]} />
      </Section>
      <Section title="Recovery schedule">
        {selected.advance > 0 ? <Timeline entries={[
          { title: "Instalment 1 recovered", time: "July 2026 payroll", note: "₹1,500 deducted from net salary.", state: "done" },
          { title: "Instalment 2 recovered", time: "August 2026 payroll", note: "₹1,500 deducted from net salary.", state: "done" },
          { title: "Instalment 3 outstanding", time: "September 2026 payroll", note: `${rupees(selected.advance)} must be settled before clearance.`, state: "active" },
        ]} /> : <p className="text-sm text-muted">This employee has no salary advance.</p>}
      </Section>
    </DetailDrawer>}

    {detail === "penalty" && <DetailDrawer title="Penalty ledger" subtitle={`${selected.name} · ${selected.id}`} onClose={() => setDetail(null)}
      footer={<Button variant="outline" onClick={() => setDetail(null)}>Close</Button>}>
      {selected.penalty > 0 ? <>
        <Section title="Applied penalty">
          <DefRows rows={[
            { label: "Source complaint", value: "CMP-26091" },
            { label: "Site action", value: "Withdrawn from site" },
            { label: "Amount", value: rupees(selected.penalty), mono: true },
            { label: "Applied in", value: "September 2026 payroll" },
          ]} />
        </Section>
        <Section title="History">
          <Timeline entries={[
            { title: "Complaint verified", time: "28 Aug 2026", note: "District operations confirmed the withdrawal.", state: "done" },
            { title: "₹500 penalty created", time: "29 Aug 2026", note: "Linked to complaint CMP-26091.", state: "done" },
            { title: "Pending recovery at exit", time: "Outstanding", state: "active" },
          ]} />
        </Section>
        <InlineAlert>This penalty is linked to CMP-26091 and applied once. Rejoining or reinstatement cannot create a second ₹500 deduction.</InlineAlert>
      </> : <p className="text-sm text-muted">No performance penalty has been applied to this employee.</p>}
    </DetailDrawer>}
  </>;
}

/* ------------------------- Penalties and deductions ------------------------ */

const complaintOptions = ["CMP-26091 · Night patrol missed at Block C", "CMP-26095 · Gate left unmanned"];

export function PenaltiesScreen({ onBack }: { onBack: () => void }) {
  const notify = useToast();
  const confirm = useConfirm();
  const [employeeId, setEmployeeId] = useState("BMG-2274");
  const [complaint, setComplaint] = useState(complaintOptions[0]);
  const [applied, setApplied] = useState(false);
  const duplicate = employeeId === "BMG-1988";
  const admin = useAccess().can("salary", "edit");
  const [exceptionEmployee, setExceptionEmployee] = useState("BMG-1840");
  const [exceptionAmount, setExceptionAmount] = useState(500);
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionSaved, setExceptionSaved] = useState(false);
  const penaltyEmployee = employeeRecords.find(item => item.id === employeeId);
  const exceptionPerson = employeeRecords.find(item => item.id === exceptionEmployee);

  const createPenalty = async () => {
    if (await confirm({ title: `Deduct ₹500 from ${penaltyEmployee?.name}?`, description: `Linked to ${complaint.split(" · ")[0]}. The deduction appears in the September payroll and can only be applied once per complaint.`, confirmLabel: "Create deduction", destructive: true })) {
      setApplied(true);
      notify("₹500 penalty recorded");
    }
  };
  const createException = async () => {
    if (await confirm({ title: `Deduct ${rupees(exceptionAmount)} from ${exceptionPerson?.name}?`, description: "Office exception deductions appear in payroll with your reason in the audit history.", confirmLabel: "Create deduction", destructive: true })) {
      setExceptionSaved(true);
      notify("Office exception deduction recorded");
    }
  };

  return <>
    <BackCrumb backLabel={NAV.payroll} onBack={onBack} current={NAV.penalties} />
    <PageHeader title={NAV.penalties} subtitle="Complaint-linked ₹500 penalties and admin-only office exception deductions." />
    <SplitLayout>
      <Panel title="Complaint penalty" description="Needs a verified complaint and a site withdrawal decision.">
        <FormStack>
          <Field label="Employee" required><Select value={employeeId} onChange={event => { setEmployeeId(event.target.value); setApplied(false); }}>{employeeRecords.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</Select></Field>
          <Field label="Verified complaint" required><Select value={complaint} onChange={event => setComplaint(event.target.value)}>{complaintOptions.map(item => <option key={item}>{item}</option>)}</Select></Field>
          <Field label="Site action"><Select><option>Withdrawn from site</option><option>Removed by client request</option></Select></Field>
          <FormGrid>
            <Field label="Amount" hint="Fixed by policy"><InputAffix prefix="₹" value="500" readOnly /></Field>
            <Field label="Payroll month"><Input type="month" defaultValue="2026-09" /></Field>
          </FormGrid>
          {duplicate && <InlineAlert tone="warning">This employee already has a penalty for CMP-26091. Rejoining or reinstatement cannot create a second deduction.</InlineAlert>}
          {applied && <InlineAlert tone="success">Penalty created and linked to the complaint.</InlineAlert>}
          <Button variant="destructive" disabled={duplicate || applied} onClick={createPenalty}><Wallet />{applied ? "Penalty recorded" : "Create ₹500 deduction"}</Button>
        </FormStack>
      </Panel>
      <Panel title="Recent penalties" description="Each complaint can create only one deduction.">
        {[
          { name: "Rajeev Kumar", id: "BMG-1988", status: "Applied", tone: "success" as const, ref: "CMP-26091" },
          { name: "Anzar M", id: "BMG-2031", status: "Recovered", tone: "neutral" as const, ref: "CMP-26069" },
        ].map(row => (
          <ListRow key={row.id}>
            <div className="min-w-0 flex-1"><PersonCell name={row.name} id={row.id} phone={phoneOf(row.id)} /></div>
            <StatusChip tone={row.tone}>{row.status}</StatusChip>
            <span className="text-right text-xs text-muted">{row.ref}<strong className="block text-sm text-foreground">₹500</strong></span>
          </ListRow>
        ))}
      </Panel>
    </SplitLayout>
    <SplitLayout>
      <Panel title="Office exception deduction" description="Admin-only deduction for one-off situations. Shows in payroll as an office exception.">
        <FormStack>
          <Field label="Employee" required><Select value={exceptionEmployee} onChange={event => { setExceptionEmployee(event.target.value); setExceptionSaved(false); }}>{employeeRecords.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</Select></Field>
          <FormGrid>
            <Field label="Amount" required><InputAffix prefix="₹" type="number" min={1} value={exceptionAmount} onChange={event => setExceptionAmount(Number(event.target.value))} /></Field>
            <Field label="Payroll month"><Input type="month" defaultValue="2026-09" /></Field>
          </FormGrid>
          <Field label="Reason" required hint="Kept in the audit history."><Textarea rows={3} value={exceptionReason} onChange={event => setExceptionReason(event.target.value)} placeholder="Why this deduction applies" /></Field>
          {!admin && <InlineAlert tone="warning">Office exception deductions need edit access to salary figures and rates.</InlineAlert>}
          {exceptionSaved && <InlineAlert tone="success">Deduction recorded. It appears in payroll as an office exception.</InlineAlert>}
          <Button variant="destructive" disabled={!admin || exceptionSaved || !exceptionReason.trim() || exceptionAmount <= 0} onClick={createException}><Wallet />{exceptionSaved ? "Deduction recorded" : "Create deduction"}</Button>
        </FormStack>
      </Panel>
      <Panel title="Penalty or office exception?" description="Penalties are complaint-linked; office exceptions are discretionary.">
        <KeyValue label="Source" value="Office decision" />
        <KeyValue label="Amount" value="Any amount (not fixed ₹500)" />
        <KeyValue label="Who can create" value="Admin roles only" />
        <p className="mt-3 text-sm text-muted">Use for one-off recoveries with no complaint behind them, such as damaged property, canteen dues, or a correction agreed with the employee.</p>
      </Panel>
    </SplitLayout>
  </>;
}

/* ------------------------------- Action centre ----------------------------- */

const actionItems: { id: number; title: string; owner: string; due: string; type: string; target: AppView; urgent?: boolean; icon: typeof Users }[] = [
  { id: 1, title: "Aster Medcity emergency post vacant", owner: "Ernakulam operations", due: "Now", type: "Vacancy", target: "deployment", urgent: true, icon: Building2 },
  { id: 2, title: "Seven late check-ins need review", owner: "HR attendance desk", due: "09:30", type: "Attendance", target: "attendance", icon: CalendarCheck },
  { id: 3, title: "August payroll has three exceptions", owner: "Payroll team", due: "Today", type: "Payroll", target: "payroll", icon: Wallet },
  { id: 4, title: "Complaint CMP-26091 approaching SLA", owner: "District manager", due: "16:00", type: "Complaint", target: "complaints", icon: AlertTriangle },
];

export function ActionCentreScreen({ onOpen }: { onOpen: (view: string) => void }) {
  const { canOpen } = useAccess();
  const items = actionItems.filter(item => canOpen(item.target));
  return <>
    <PageHeader title={NAV.actionCentre} subtitle="Vacancies, attendance exceptions, payroll blockers and complaint SLAs, most urgent first." />
    <StatStrip items={[
      { icon: AlertTriangle, value: String(items.length), label: "Open actions", note: "Sorted by urgency", tone: items.length ? "orange" : "green", onClick: () => document.getElementById("action-queue")?.scrollIntoView({ behavior: "smooth", block: "start" }), actionLabel: "Jump to the priority queue" },
      { icon: Building2, value: "3", label: "Vacancy risks", note: "Two relievers available", tone: "red", onClick: () => onOpen("deployment"), actionLabel: "Open deployment to fill vacant posts" },
      { icon: CalendarCheck, value: "7", label: "Attendance reviews", note: "Six GPS-related", onClick: () => onOpen("attendance"), actionLabel: "Review attendance" },
      { icon: Clock, value: "1", label: "SLAs due today", note: "Complaints", onClick: () => onOpen("complaints"), actionLabel: "Open complaints due today" },
    ]} />
    <div id="action-queue" className="scroll-mt-4"><Panel title="Priority queue" description="Open an item to resolve it on its own screen.">
      {items.length === 0 && <p className="py-6 text-center text-sm text-muted">Nothing needs action right now.</p>}
      {items.map(item => (
        <ListRow key={item.id}>
          <IconTile icon={item.icon} tone={item.urgent ? "danger" : "warn"} />
          <div className="min-w-0 flex-1"><strong className="block text-sm font-medium">{item.title}</strong><small className="text-xs text-muted">{item.owner} · due {item.due}</small></div>
          <StatusChip tone={item.urgent ? "danger" : "warning"}>{item.type}</StatusChip>
          <Button size="sm" variant="outline" onClick={() => onOpen(item.target)}>Open</Button>
        </ListRow>
      ))}
    </Panel></div>
  </>;
}

/* ---------------------------- Detailed workflows --------------------------- */

export type WorkflowKind = "assignment" | "attendance" | "inspection" | "complaint" | "sop" | "advance";

const workflowConfig: Record<WorkflowKind, { title: string; description: string; submit: string; done: string; back: string; icon: typeof Users }> = {
  assignment: { title: "Assign employee to a post", description: "Create a dated post assignment. Pay rules are resolved automatically.", submit: "Save assignment", done: "Assignment saved", back: NAV.deployment, icon: Users },
  attendance: { title: "Attendance correction", description: "Add a missing or disputed punch. HR approves it and the original punch is kept.", submit: "Submit for approval", done: "Correction sent to HR for approval", back: NAV.attendance, icon: CalendarCheck },
  inspection: { title: "Log site inspection", description: `Record a ${ROLE_TERMS.fieldOfficer} visit, checklist result and follow-up owner.`, submit: "Save inspection", done: "Inspection saved", back: NAV.inspections, icon: ClipboardList },
  complaint: { title: "Log client complaint", description: "Capture the issue, severity, SLA and investigation owner.", submit: "Create complaint", done: "Complaint logged", back: NAV.complaints, icon: AlertTriangle },
  sop: { title: "Create site SOP", description: "Write versioned post instructions that guards must acknowledge.", submit: "Publish to guards", done: "SOP published to guards", back: NAV.sops, icon: FileText },
  advance: { title: "New salary advance", description: "Request an advance on behalf of an employee. The limit is 40% of earnings after deductions.", submit: "Submit request", done: "Advance request submitted", back: NAV.advances, icon: HandCoins },
};

export function DetailedWorkflowScreen({ kind, onBack }: { kind: WorkflowKind; onBack: () => void }) {
  const notify = useToast();
  const confirm = useConfirm();
  const { employeeRules, siteRules, postRules, getBreakdown } = usePayroll();
  const config = workflowConfig[kind];
  const Icon = config.icon;
  const [duty, setDuty] = useState("1.00");
  const [employeeId, setEmployeeId] = useState("BMG-1840");
  const [assignmentSite, setAssignmentSite] = useState(sites[0]);
  const [assignmentPost, setAssignmentPost] = useState("Main gate");
  const [assignmentDate, setAssignmentDate] = useState(APP_TODAY);
  const [advanceAmount, setAdvanceAmount] = useState(2000);
  const [advanceReason, setAdvanceReason] = useState("");
  const effectiveEmployeeRule = employeeRules.filter(item => item.employeeId === employeeId && item.effectiveFrom <= assignmentDate).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const effectiveSiteRule = siteRules.filter(item => item.site === assignmentSite && item.effectiveFrom <= assignmentDate).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const effectivePostRule = postRules.filter(item => item.site === assignmentSite && item.post === assignmentPost && item.effectiveFrom <= assignmentDate).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const resolvedSource = effectiveEmployeeRule?.basis === "monthly" ? "Monthly" : effectiveEmployeeRule?.basis === "daily" ? "Daily" : effectivePostRule ? "Post" : effectiveSiteRule?.defaultDutyRate ? "Site" : "Missing";
  const resolvedRate = effectiveEmployeeRule?.basis === "monthly" ? (effectiveEmployeeRule.monthlySalary ?? 0) / effectiveEmployeeRule.payableDays : effectiveEmployeeRule?.basis === "daily" ? (effectiveEmployeeRule.dailyRate ?? 0) : effectivePostRule?.dutyRate ?? effectiveSiteRule?.defaultDutyRate ?? 0;
  const canSeeSalary = useAccess().can("salary", "view");
  const pfEnabled = effectiveEmployeeRule?.pfOverride === "enabled" || (effectiveEmployeeRule?.pfOverride === "inherit" && effectiveSiteRule?.scheme === "pf-esi");
  const esiEnabled = effectiveEmployeeRule?.esiOverride === "enabled" || (effectiveEmployeeRule?.esiOverride === "inherit" && (effectiveSiteRule?.scheme === "pf-esi" || effectiveSiteRule?.scheme === "esi"));
  const breakdown = getBreakdown(employeeId);
  const eligibility = computeAdvanceEligibility({ grossEarned: breakdown.gross, deductionsToDate: breakdown.pf + breakdown.esi + breakdown.otherDeductions, alreadyRequested: 0 });
  const overLimit = kind === "advance" && advanceAmount > eligibility.maxAdvance;
  const submitDisabled = kind === "advance" && (overLimit || advanceAmount <= 0 || !advanceReason.trim());

  const submit = async () => {
    if (kind === "sop" && !await confirm({ title: "Publish this SOP to guards?", description: "Every guard on the selected post gets an acknowledgement task. The previous version stays in history.", confirmLabel: "Publish" })) return;
    notify(config.done);
    onBack();
  };

  const showEmployee = kind !== "complaint" && kind !== "sop";
  const showSite = kind !== "advance";

  return <>
    <BackCrumb backLabel={config.back} onBack={onBack} current={config.title} />
    <PageHeader title={config.title} subtitle={config.description} />
    <SplitLayout wideFirst>
      <Card title={config.title} icon={Icon}>
        <FormGrid>
          {showEmployee && <Field label="Employee" required>
            <Select value={employeeId} onChange={event => setEmployeeId(event.target.value)}>{employeeRecords.map(item => <option value={item.id} key={item.id}>{item.name} · {item.id}</option>)}</Select>
          </Field>}
          {showSite && <Field label={kind === "complaint" ? "Client site" : "Site"} required>
            <Select value={assignmentSite} onChange={event => setAssignmentSite(event.target.value)}>{sites.map(item => <option key={item}>{item}</option>)}</Select>
          </Field>}
          {(kind === "assignment" || kind === "attendance") && <Field label="Post" required>
            <Select value={assignmentPost} onChange={event => setAssignmentPost(event.target.value)}><option>Main gate</option><option>Loading bay</option><option>Control room</option><option>Emergency</option></Select>
          </Field>}
          {kind !== "advance" && <Field label={kind === "sop" ? "Effective from" : kind === "assignment" ? "Start date" : "Date"} required>
            <Input type="date" value={assignmentDate} onChange={event => setAssignmentDate(event.target.value)} />
          </Field>}
          {kind === "assignment" && <>
            <Field label="Shift"><Select><option>Day · 08:00–20:00</option><option>Night · 20:00–08:00</option><option>24-hour duty</option></Select></Field>
            <Field label="Duty value" hint="1.00 = one full duty"><Select value={duty} onChange={event => setDuty(event.target.value)}>{dutyUnits.map(unit => <option key={unit}>{unit}</option>)}</Select></Field>
          </>}
          {kind === "attendance" && <>
            <Field label="Punch-in time" required><Input type="time" defaultValue="08:03" /></Field>
            <Field label="Duty value"><Select value={duty} onChange={event => setDuty(event.target.value)}>{dutyUnits.map(unit => <option key={unit}>{unit}</option>)}</Select></Field>
            <Field label="Reason for correction" required><Select><option>Device or network failure</option><option>Supervisor verified presence</option><option>Incorrect shift mapping</option></Select></Field>
          </>}
          {kind === "inspection" && <>
            <Field label="Visit time"><Input type="time" defaultValue="13:00" /></Field>
            <Field label="Result" required><Select><option>Compliant</option><option>Follow-up required</option><option>Critical exception</option></Select></Field>
            <Field label="Follow-up owner"><Select><option>District operations</option><option>HR</option><option>Client manager</option></Select></Field>
          </>}
          {kind === "complaint" && <>
            <Field label="Category" required><Select><option>Guard conduct</option><option>Vacancy or late relief</option><option>Register or SOP compliance</option><option>Other service issue</option></Select></Field>
            <Field label="Priority" required><Select><option>High · 4-hour SLA</option><option>Medium · 12-hour SLA</option><option>Low · 24-hour SLA</option></Select></Field>
            <Field label="Investigation owner"><Select><option>Ernakulam district manager</option><option>HR manager</option><option>{ROLE_TERMS.fieldOfficer}</option></Select></Field>
          </>}
          {kind === "sop" && <>
            <Field label="SOP title" required><Input placeholder="e.g. Loading bay vehicle movement" /></Field>
            <Field label="Version"><Input defaultValue="1.0" /></Field>
            <Field label="Applies to post"><Select><option>All posts</option><option>Main gate</option><option>Loading bay</option></Select></Field>
          </>}
          {kind === "advance" && <>
            <Field label="Amount" required hint={`Up to ${rupees(eligibility.maxAdvance)} this month`}>
              <InputAffix prefix="₹" type="number" min={1} value={advanceAmount} onChange={event => setAdvanceAmount(Number(event.target.value))} />
            </Field>
            <Field label="Recover from"><Select><option>September 2026 payroll</option><option>Split over 2 months</option><option>Split over 3 months</option></Select></Field>
          </>}
        </FormGrid>
        {(kind === "complaint" || kind === "sop" || kind === "inspection" || kind === "advance") && <div className="mt-4">
          <Field label={kind === "complaint" ? "What happened?" : kind === "sop" ? "Instructions for guards" : kind === "advance" ? "Reason" : "Inspection notes"} required={kind !== "inspection"}>
            {kind === "advance"
              ? <Textarea rows={3} value={advanceReason} onChange={event => setAdvanceReason(event.target.value)} placeholder="Why the employee needs the advance" />
              : <Textarea rows={6} placeholder={kind === "complaint" ? "Describe the issue as reported by the client" : kind === "sop" ? "Step-by-step instructions for this post" : "Registers checked, guard briefing, issues found"} />}
          </Field>
        </div>}
        {overLimit && <InlineAlert tone="danger" className="mt-4">The amount is above this employee’s limit of {rupees(eligibility.maxAdvance)}.</InlineAlert>}
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button disabled={submitDisabled} onClick={submit}><CheckCircle2 />{config.submit}</Button>
        </div>
      </Card>
      <Panel title="Summary" description="Calculated before this record is saved.">
        {kind === "assignment" && <>
          <KeyValue label="Duty value" value={duty} />
          <KeyValue label="Pay source" value={`${resolvedSource}${canSeeSalary && resolvedRate ? ` · ${rupees(resolvedRate)}` : ""}`} />
          <KeyValue label="Benefits" value={pfEnabled && esiEnabled ? "PF + ESI" : esiEnabled ? "ESI" : pfEnabled ? "PF" : "Salary only"} />
          {resolvedSource === "Missing" && <InlineAlert tone="warning" className="mt-3">You can save this assignment, but payroll stays blocked until a site or post rate is set.</InlineAlert>}
          <p className="mt-3 text-sm text-muted">A 24-hour assignment counts as one duty unless its post rule says otherwise.</p>
        </>}
        {kind === "attendance" && <>
          <KeyValue label="Recorded duty" value={duty} />
          <KeyValue label="Approval" value="HR required" />
          <KeyValue label="Original punch" value="Kept unchanged" />
          <p className="mt-3 text-sm text-muted">The correction is stored as a separate record once HR approves it.</p>
        </>}
        {kind === "inspection" && <>
          <KeyValue label="GPS verification" value="Required" />
          <KeyValue label="Checklist" value="4 controls" />
          <KeyValue label="Follow-up SLA" value="24 hours" />
        </>}
        {kind === "complaint" && <>
          <KeyValue label="SLA target" value="4 hours" />
          <KeyValue label="Starting status" value="Investigating" />
          <KeyValue label="₹500 penalty" value="Only after verification" />
          <p className="mt-3 text-sm text-muted">A penalty can be created only after the complaint is verified and the guard is withdrawn from the site.</p>
        </>}
        {kind === "sop" && <>
          <KeyValue label="Acknowledgement" value="Required" />
          <KeyValue label="Sent to" value="Guards on the post" />
          <KeyValue label="Previous version" value="Kept in history" />
        </>}
        {kind === "advance" && <>
          <KeyValue label="Earned this month" value={rupees(eligibility.grossEarned)} />
          <KeyValue label="Deductions so far" value={rupees(eligibility.deductionsToDate)} />
          <KeyValue label="Maximum advance (40%)" value={rupees(eligibility.maxAdvance)} />
          <KeyValue label="Requested" value={<span className={overLimit ? "text-status-danger" : ""}>{rupees(advanceAmount)}</span>} />
        </>}
      </Panel>
    </SplitLayout>
  </>;
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" data-enter>
      <div className="mb-5 flex items-center gap-3">
        <IconTile icon={Icon} />
        <div><strong className="block text-sm font-medium">{title}</strong><small className="text-xs text-muted">Fields marked * are required.</small></div>
      </div>
      {children}
    </section>
  );
}
