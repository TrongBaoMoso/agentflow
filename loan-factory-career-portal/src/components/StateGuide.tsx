import React, { useState } from "react";
import { Landmark, FileSpreadsheet, MapPin, DollarSign, HelpCircle, ArrowRight } from "lucide-react";
import { StateLicensingRequirement } from "../types";

const stateLicensingCollection: StateLicensingRequirement[] = [
  {
    code: "CA",
    name: "California (DFPI / DRE)",
    educationHours: 20,
    stateHoursDetails: "20 standard hours. No extra state hours needed for DFPI.",
    stateFee: 330,
    agencyName: "California Department of Financial Protection and Innovation",
    extraRequirements: [
      "Submit the online MU4 application form.",
      "Complete a standard fingerprint check.",
      "Pass a credit and background check.",
      "DRE license option requires completing 3 college real estate courses."
    ]
  },
  {
    code: "TX",
    name: "Texas (SML)",
    educationHours: 23,
    stateHoursDetails: "20 general hours plus 3 extra hours focused on Texas mortgage laws.",
    stateFee: 190,
    agencyName: "Texas Department of Savings and Mortgage Lending",
    extraRequirements: [
      "Pay a $20 recovery fund fee (included in state fee).",
      "Complete fingerprints at an IdentoGO location.",
      "A licensed mortgage company must sponsor your active license."
    ]
  },
  {
    code: "FL",
    name: "Florida (OFR)",
    educationHours: 22,
    stateHoursDetails: "20 general hours plus 2 extra hours focused on Florida mortgage laws.",
    stateFee: 417,
    agencyName: "Florida Office of Financial Regulation",
    extraRequirements: [
      "Pay a $195 state fee plus a $100 broker fee.",
      "Submit fingerprints online through the NMLS portal.",
      "Get sponsored by a licensed mortgage company in Florida."
    ]
  },
  {
    code: "PA",
    name: "Pennsylvania (DoBS)",
    educationHours: 20,
    stateHoursDetails: "20 standard hours. No additional state-specific hours required.",
    stateFee: 280,
    agencyName: "Pennsylvania Department of Banking and Securities",
    extraRequirements: [
      "Submit the online MU4 application form.",
      "Complete a criminal background check and fingerprints.",
      "Provide a credit report to verify financial integrity.",
      "Secure license sponsorship from an active mortgage company."
    ]
  },
  {
    code: "VA",
    name: "Virginia (SCC)",
    educationHours: 20,
    stateHoursDetails: "20 general hours are enough. No extra hours required.",
    stateFee: 130,
    agencyName: "Virginia State Corporation Commission",
    extraRequirements: [
      "Review the standard application checklist.",
      "Submit the MU4 form online.",
      "Provide your credit report to show financial responsibility."
    ]
  }
];

export default function StateGuide() {
  const [selectedStateCode, setSelectedStateCode] = useState<string>("CA");

  const activeState = stateLicensingCollection.find((s) => s.code === selectedStateCode) || stateLicensingCollection[0];

  return (
    <div id="carrier-guide-resources" className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="p-6 md:p-8">
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 pb-6 border-b border-gray-100 mb-6">
          <div>
            <h4 className="font-display font-semibold text-gray-900 text-lg md:text-xl flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#F36F23]" />
              <span>State License Guide</span>
            </h4>
            <p className="text-gray-500 text-sm mt-0.5">
              Choose your state below to check classes, fees, and state instructions.
            </p>
          </div>

          {/* State chips selector */}
          <div className="flex flex-wrap gap-2">
            {stateLicensingCollection.map((s) => (
              <button
                key={s.code}
                onClick={() => setSelectedStateCode(s.code)}
                id={`state-badge-${s.code}`}
                className={`px-4 py-2.5 text-xs font-bold font-mono tracking-wider rounded-xl transition-all cursor-pointer ${
                  selectedStateCode === s.code
                    ? "bg-[#F36F23] text-white shadow-md shadow-orange-500/10"
                    : "bg-white hover:bg-gray-50 text-[#111111] border border-gray-250 hover:border-gray-950"
                }`}
              >
                {s.code} – {s.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Main Info Area (8 cols) */}
          <div className="md:col-span-8 space-y-6">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-[#F36F23] bg-orange-100/50 px-2.5 py-0.5 rounded tracking-widest">
                {activeState.code} REGULATORY GUIDELINE
              </span>
              <h5 className="font-display font-bold text-gray-950 text-2xl mt-2 leading-none">
                {activeState.name}
              </h5>
              <p className="text-xs text-gray-400 mt-1">
                Agency: {activeState.agencyName}
              </p>
            </div>

            {/* Metrics cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100/50">
                <div className="text-gray-500 text-xs font-semibold mb-1 uppercase tracking-wider">Class Hours Needed</div>
                <div className="text-2xl font-mono font-bold text-gray-900 flex items-baseline gap-1">
                  <span>{activeState.educationHours}</span>
                  <span className="text-sm font-semibold text-gray-400">Hours</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{activeState.stateHoursDetails}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100/50">
                <div className="text-gray-500 text-xs font-semibold mb-1 uppercase tracking-wider">Estimated State Application Cost</div>
                <div className="text-2xl font-mono font-bold text-[#F36F23] flex items-baseline gap-0.5">
                  <span className="text-lg font-bold">$</span>
                  <span>{activeState.stateFee}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 font-sans">This does not include fingerprints ($36) or credit pull ($15).</p>
              </div>

            </div>

            {/* Checklist of sub items */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide block">
                Other Requirements:
              </span>
              <div className="space-y-2 bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100">
                {activeState.extraRequirements.map((req, i) => (
                  <div key={i} className="flex gap-2.5 items-start text-xs text-gray-700 leading-normal">
                    <span className="w-1.5 h-1.5 bg-[#F36F23] rounded-full shrink-0 mt-1.5"></span>
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Lead/Action Area (4 cols) */}
          <div className="md:col-span-4 bg-orange-50/40 rounded-2xl border border-orange-100/60 p-5 mt-4 md:mt-0 space-y-4">
            <h6 className="font-display font-bold text-gray-950 text-base leading-tight">
              Get Your Free {activeState.code} Resource Guide
            </h6>
            <p className="text-xs text-gray-700 leading-relaxed font-sans">
              We will send you a checklist, a free study guide, and recommended online schools for your state.
            </p>
            <div className="space-y-2 pt-2 border-t border-orange-100/80">
              <div className="text-[10px] font-mono text-orange-950 font-bold uppercase tracking-wider font-mono">Why Sponsor With Loan Factory:</div>
              <ul className="text-[11px] text-gray-700 space-y-1">
                <li>✓ Full sponsorship in {activeState.code}</li>
                <li>✓ Easy loan search and check tools</li>
                <li>✓ Weekly free professional coaching</li>
              </ul>
            </div>
            <a 
              href="#registration-banner"
              className="w-full flex justify-center items-center gap-1.5 bg-[#F36F23] hover:bg-[#D75612] text-white text-xs font-mono font-bold tracking-wider py-2.5 rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              <span>Download Free Guide</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

        </div>

        {/* Footnote reference and largest states info */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs text-gray-500 font-sans">
          <p className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F36F23] shrink-0"></span>
            <span>Popular states are shown below for reference only.</span>
          </p>
          <p className="shrink-0">
            Source:{" "}
            <a
              href="https://mortgage.nationwidelicensingsystem.org/knowledge/Products/nmls/stateresourcecenter/SitePages/Checklist-Compiler.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F36F23] hover:underline font-medium font-sans"
            >
              NMLS State Resource Checklist Compiler
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
