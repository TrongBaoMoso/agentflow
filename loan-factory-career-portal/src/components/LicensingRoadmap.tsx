import React, { useState } from "react";
import { BookOpen, Award, UserCheck, ShieldCheck, HelpCircle, FileCheck, CheckSquare, GraduationCap, ExternalLink, Tag, Compass, Flag, Sparkles, Briefcase, Laptop, MapPin, Building2, Star, Check } from "lucide-react";

interface LicensingRoadmapProps {
  viewMode?: "cards" | "drilldown";
  activeStep?: number;
  setActiveStep?: (step: number) => void;
}

export default function LicensingRoadmap({
  viewMode,
  activeStep: propActiveStep,
  setActiveStep: propSetActiveStep
}: LicensingRoadmapProps) {
  const [localActiveStep, setLocalActiveStep] = useState<number>(0);

  const activeStep = propActiveStep !== undefined ? propActiveStep : localActiveStep;
  const setActiveStep = propSetActiveStep !== undefined ? propSetActiveStep : setLocalActiveStep;

  const stepsDetails = [
    {
      id: 0,
      stepNum: "STEP 1",
      icon: <GraduationCap className="w-8 h-8 text-[#F36F23]" />,
      title: "Complete Your 20-Hour Education",
      shortDesc: "Take the required online mortgage class and learn the basics of being a loan officer.",
      ctaText: "Learn More Hour Details",
      bulletPoints: [
        "NMLS lessons: Learn about mortgage rules, fair lending, and ethics for 20 hours.",
        "Extra hours: Some states require a few more hours (for example, California asks for 2 extra hours).",
        "Easy options: Take your classes fully online, on your own schedule.",
        "School records: Your course completion is automatically sent to the official NMLS system."
      ],
      estimatedCost: "$180 Special Offer",
      timeframe: "1 – 2 weeks"
    },
    {
      id: 1,
      stepNum: "STEP 2",
      icon: <Award className="w-8 h-8 text-[#F36F23]" />,
      title: "Pass the SAFE Exam",
      shortDesc: "Access study resources, exam tips, and simple practice quizzes to pass on your first try.",
      ctaText: "Practice Exam",
      bulletPoints: [
        "The test has 125 multiple-choice questions about federal lending rules, ethics, and practices.",
        "Passing grade: You need a score of 75% or higher to pass. You have 190 minutes for the test.",
        "Easy sign-up: Book your test through your online NMLS account. You can take it at a local test center or at home.",
        "Retake rules: If you do not pass, you can try again after 30 days. If you fail 3 times, you must wait 180 days."
      ],
      estimatedCost: "$110 per attempt",
      timeframe: "2 – 4 weeks study plan"
    },
    {
      id: 2,
      stepNum: "STEP 3",
      icon: <UserCheck className="w-8 h-8 text-[#F36F23]" />,
      title: "Get Licensed & Start",
      shortDesc: "Apply for your state license and begin working with a mortgage sponsor.",
      ctaText: "View Licensing Guide",
      bulletPoints: [
        "Set up an NMLS account online and fill out the simple MU4 license application form.",
        "Background checks: Submit your fingerprints and have your credit checked to complete your approval.",
        "Find a company: Join a friendly company like Loan Factory so you can officially start work.",
        "Help clients: Start offering low rates and using our easy tools to help home buyers get loans."
      ],
      estimatedCost: "$250 – $450 (varies by state)",
      timeframe: "2 – 3 weeks review period"
    }
  ];

  if (viewMode === "cards") {
    // Coordinate mapping of the car along the custom winding S-curve
    const carPositionMap = [
      { left: "24.5%", top: "42%", rotation: 4, name: "Education Station" },
      { left: "50%", top: "79%", rotation: 15, name: "MLO Exam Checkpoint" },
      { left: "76.5%", top: "42%", rotation: -8, name: "Career Launch City" }
    ];

    return (
      <div className="relative max-w-6xl mx-auto bg-gradient-to-b from-sky-100/70 via-sky-50/50 to-[#fafbfc] border border-slate-200 rounded-[3rem] p-6 sm:p-10 md:p-12 overflow-hidden shadow-2xl">
        {/* CSS Keyframe Animations for Roadtrip Vibe */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes float-scenic {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-7px); }
          }
          @keyframes car-rumble {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(1px, -1px) rotate(0.4deg); }
          }
          @keyframes drift-scenic {
            0% { transform: translateX(0); }
            50% { transform: translateX(12px); }
            100% { transform: translateX(0); }
          }
          @keyframes pulse-beam {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.35; }
          }
          @keyframes alert-strobe {
            0%, 100% { opacity: 0.3; background-color: rgb(239, 68, 68); }
            50% { opacity: 1; background-color: rgb(251, 191, 36); }
          }
          .animate-scenic-float {
            animation: float-scenic 4.5s ease-in-out infinite;
          }
          .animate-car-rumble {
            animation: car-rumble 0.2s linear infinite;
          }
          .animate-scenic-drift {
            animation: drift-scenic 12s ease-in-out infinite;
          }
          .animate-pulse-beam {
            animation: pulse-beam 3s ease-in-out infinite;
          }
          .animate-alert-strobe {
            animation: alert-strobe 1s infinite;
          }
        `}} />

        {/* Map Grid Grid Lines Texture Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:38px_38px]" />

        {/* Scenic clouds drifting in sky backdrop */}
        <div className="absolute top-[8%] left-[12%] opacity-40 pointer-events-none animate-scenic-drift select-none">
          <span className="text-4xl">☁️</span>
        </div>
        <div className="absolute top-[14%] right-[16%] opacity-30 pointer-events-none animate-scenic-drift select-none" style={{ animationDelay: "3s" }}>
          <span className="text-5xl">☁️</span>
        </div>

        {/* Scenic gold sun backdrop behind Step 3 */}
        <div className="absolute right-[8%] top-[8%] w-36 h-36 bg-gradient-to-tr from-amber-200/50 to-orange-100/20 rounded-full blur-2xl pointer-events-none" />

        {/* Compass Rose Navigator badge */}
        <div className="absolute top-6 right-6 text-slate-350 hidden lg:block pointer-events-none select-none z-10">
          <div className="flex flex-col items-center">
            <Compass className="w-12 h-12 stroke-[1] animate-spin-slow text-slate-300" />
            <span className="text-[8px] font-mono font-black mt-1 text-slate-400 tracking-widest">LF AUTOPILOT</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP HERO HIGHWAY: Scenic Winding asphalt road layout SVG */}
        {/* ========================================================================= */}
        <div className="absolute inset-0 hidden md:block pointer-events-none select-none z-0">
          <svg className="w-full h-full" viewBox="0 0 1100 620" preserveAspectRatio="none">
            {/* Soft underlying shadow to give road heights/perspective */}
            <path 
              d="M 50,340 C 180,340 180,240 280,240 C 430,240 400,490 550,490 C 700,490 680,240 850,240 C 940,240 940,340 1050,340" 
              fill="none" 
              stroke="#cfd8dc" 
              strokeWidth="56" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="opacity-40"
            />

            {/* Asphalt Subsurface lane margins (Solid clean line edges) */}
            <path 
              d="M 50,340 C 180,340 180,240 280,240 C 430,240 400,490 550,490 C 700,490 680,240 850,240 C 940,240 940,340 1050,340" 
              fill="none" 
              stroke="#cbd5e1" 
              strokeWidth="48" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Premium Deep Charcoal Asphalt Base */}
            <path 
              d="M 50,340 C 180,340 180,240 280,240 C 430,240 400,490 550,490 C 700,490 680,240 850,240 C 940,240 940,340 1050,340" 
              fill="none" 
              stroke="#1e293b" 
              strokeWidth="40" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Interior Safe lane pavement depth */}
            <path 
              d="M 50,340 C 180,340 180,240 280,240 C 430,240 400,490 550,490 C 700,490 680,240 850,240 C 940,240 940,340 1050,340" 
              fill="none" 
              stroke="#334155" 
              strokeWidth="32" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Center Yellow Double-Dashed Lane Dividers */}
            <path 
              d="M 50,340 C 180,340 180,240 280,240 C 430,240 400,490 550,490 C 700,490 680,240 850,240 C 940,240 940,340 1050,340" 
              fill="none" 
              stroke="#fbbf24" 
              strokeWidth="2.5" 
              strokeDasharray="12 12" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Active GPS highlight lane overlay trackers */}
            <path 
              d="M 50,340 C 180,340 180,240 280,240 C 430,240 400,490 550,490" 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="4.5" 
              strokeDasharray="4 6" 
              className={`transition-opacity duration-1000 ${activeStep >= 1 ? "opacity-100" : "opacity-0"}`} 
            />
            <path 
              d="M 550,490 C 700,490 680,240 850,240" 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="4.5" 
              strokeDasharray="4 6" 
              className={`transition-opacity duration-1000 ${activeStep >= 2 ? "opacity-100" : "opacity-0"}`} 
            />

            {/* Environment pines standing beside roadsides */}
            <g fill="#059669" className="opacity-80">
              {/* Pines Patch near Station 1 */}
              <polygon points="120,300 125,312 115,312" />
              <polygon points="120,306 127,320 113,320" />
              {/* Pine near Station 3 */}
              <polygon points="980,290 984,302 976,302" />
              <polygon points="980,296 986,310 974,310" />
            </g>
          </svg>
        </div>

        {/* START FLAG (Left desktop edge) */}
        <div className="absolute top-[2%] left-1/2 -translate-x-1/2 md:left-10 md:translate-x-0 z-20 flex items-center gap-1.5 bg-emerald-600 text-white font-mono text-[8px] font-black tracking-widest px-3 py-1.5 rounded-full shadow-lg border border-teal-400/30 select-none uppercase">
          <Flag className="w-2.5 h-2.5 fill-white" />
          <span>START ORIGINATION JOURNEY</span>
        </div>

        {/* FINISH LINE CHECKER (Right desktop edge) */}
        <div className="absolute top-[2%] right-10 hidden md:flex items-center gap-1.5 bg-slate-900 text-white font-mono text-[8px] font-black tracking-widest px-3 py-1.5 rounded-full shadow-lg border border-slate-700/60 select-none uppercase">
          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          <span>DESTINATION LICENSED SUCCESS</span>
        </div>

        {/* ========================================================================= */}
        {/* CHARACTER VEHICLE (DESKTOP): Animated sports car sliding dynamically */}
        {/* ========================================================================= */}
        <div 
          className="absolute hidden md:flex items-center justify-center p-2 rounded-full bg-white border-2 border-[#F36F23] shadow-2xl transition-all duration-1000 ease-in-out z-25 group/car cursor-pointer hover:scale-110"
          style={{
            left: carPositionMap[activeStep].left,
            top: carPositionMap[activeStep].top,
            transform: `translate(-50%, -50%) rotate(${carPositionMap[activeStep].rotation}deg)`,
          }}
        >
          <div className="relative flex items-center justify-center">
            {/* The little sports car emoji with vibration/rumble animation */}
            <span className="text-3xl select-none filter drop-shadow animate-car-rumble">🚗</span>
            
            {/* LED Headlight glow */}
            <div className="absolute right-[-15px] top-1/2 -translate-y-1/2 w-8 h-4 bg-yellow-300/40 blur-sm rounded-r-full pointer-events-none mix-blend-screen" />
            {/* Exhaust gas plume puff */}
            <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 text-slate-400/40 text-[8px] select-none pointer-events-none animate-pulse">💨</div>

            {/* GPS Nav bubble tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-950 text-white font-mono text-[9px] font-bold px-3 py-1 rounded-md shadow-xl whitespace-nowrap opacity-100 scale-100 pointer-events-none select-none">
              <span className="text-[#F36F23] font-black">NAV:</span> {carPositionMap[activeStep].name}!
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LANDSCAPE STATIONS: Columns displaying Billboards and Landmarks */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 relative z-10 pt-12 pb-6">
          {/* STATION 1: EDUCATION STATION */}
          <div className="flex flex-col items-center">
            {/* Green Interstate Signpost */}
            <div 
              onClick={() => {
                setActiveStep(0);
                setTimeout(() => {
                  const el = document.getElementById("roadmap-drilldown");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 100);
              }}
              className={`group bg-emerald-900 border-[3.5px] rounded-3xl p-5 w-full h-[270px] relative flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-350 cursor-pointer select-none ${
                activeStep === 0 
                  ? "border-emerald-400 ring-[10px] ring-emerald-500/10 scale-[1.02] shadow-emerald-950/25 shadow-2xl" 
                  : "border-slate-200 hover:border-emerald-300"
              }`}
            >
              {/* Corner rivets */}
              <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-300 opacity-65" />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-300 opacity-65" />
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-300 opacity-65" />
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-300 opacity-65" />

              {/* Active flashlight glow */}
              {activeStep === 0 && (
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-emerald-500/20 pointer-events-none animate-pulse-beam" />
              )}

              <div>
                <div className="flex justify-between items-center text-emerald-300 font-mono text-[9px] font-black border-b border-emerald-800/40 pb-2 mb-3.5 tracking-widest uppercase">
                  <span>EXIT 01 // INTERSTATE NMLS</span>
                  <span className="bg-emerald-800 font-extrabold px-2 py-0.5 rounded text-white text-[8.5px]">20-HR</span>
                </div>
                
                <h4 className="font-display font-black text-lg text-white leading-tight mb-1.5 tracking-tight flex items-center gap-1.5">
                  <span>📚</span>
                  <span>Education Station</span>
                </h4>
                <p className="text-emerald-100 text-[11.5px] leading-relaxed mb-4 text-left">
                  Complete your mandatory 20-Hour online education. Finish rule classes and ethics training effortlessly.
                </p>

                <div className="space-y-1 text-slate-100 font-mono text-[10.5px] font-semibold bg-emerald-950/40 p-2 rounded-xl border border-emerald-800/20 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#F36F23]">⏱️</span>
                    <span>Timeline: <strong className="text-emerald-300">1–2 Weeks</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-400">🏷️</span>
                    <span>Cost: <strong className="text-emerald-300">$180 Reimbursement</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-emerald-800/30 text-[9.5px] font-mono font-black text-emerald-400 flex justify-between items-center">
                <span>REDEEM ENROLLMENT VOUCHER →</span>
                <span className="bg-emerald-600/30 px-2 py-0.5 rounded text-white text-[8px] tracking-normal font-black uppercase">$180 Reimbursement</span>
              </div>
            </div>

            {/* Solid metal support poles to plant billboard in landscape depth */}
            <div className="flex justify-center gap-16 h-8 w-full -mt-0.5 select-none pointer-events-none">
              <div className="w-1 bg-slate-400/80 rounded-b shadow-inner" />
              <div className="w-1 bg-slate-400/80 rounded-b shadow-inner" />
            </div>

            {/* Landmark: Interactive Checkpoint Toll cabin with barrier stick */}
            <div className="mt-2 text-center hidden md:block">
              <div className="relative w-16 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-slate-700 shadow-xl flex flex-col justify-between p-2 select-none animate-scenic-float">
                <div className="w-full h-8 bg-yellow-100/95 rounded-lg border border-slate-600/40 flex items-center justify-center p-1 font-mono text-[7px] text-slate-950 font-black animate-pulse leading-none uppercase">
                  GATE PASS
                </div>
                
                {/* Gate barrier stick: animates open once education is highlighted/passed */}
                <div 
                  className="absolute left-[-26px] bottom-3.5 w-10 h-2 bg-gradient-to-r from-red-500 via-white to-red-500 rounded border border-slate-950 origin-right transition-transform duration-700 ease-in-out"
                  style={{
                    transform: activeStep >= 1 ? "rotate(-75deg)" : "rotate(0deg)",
                  }}
                />
                
                <div className="absolute left-[-2px] bottom-1 w-2.5 h-6 bg-slate-700 rounded-t border-l border-slate-500" />
                <span className="text-[7.5px] font-mono text-emerald-400 font-extrabold uppercase tracking-wide">GATE OPEN ●</span>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-400 block mt-2">Checkpoint Gate 1</span>
            </div>
          </div>

          {/* STATION 2: MLO EXAM CHECKPOINT */}
          <div className="flex flex-col items-center">
            {/* Caution Yellow Signboard */}
            <div 
              onClick={() => {
                setActiveStep(1);
                setTimeout(() => {
                  const el = document.getElementById("practice-exam-quiz");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 100);
              }}
              className={`group bg-amber-400 border-[3.5px] rounded-3xl p-5 w-full h-[270px] relative flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-350 cursor-pointer select-none ${
                activeStep === 1 
                  ? "border-slate-800 ring-[10px] ring-amber-400/25 scale-[1.02] shadow-amber-500/20 shadow-2xl" 
                  : "border-slate-200 hover:border-amber-300"
              }`}
            >
              {/* Corner rivets */}
              <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-800/40 opacity-65" />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-800/40 opacity-65" />
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-800/40 opacity-65" />
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-800/40 opacity-65" />

              {/* Danger slant stripe accent */}
              <div className="absolute top-0 right-0 w-24 h-5 transform rotate-45 translate-x-8 translate-y-2 bg-slate-900 flex items-center justify-center pointer-events-none select-none">
                <span className="text-[7.5px] text-amber-400 font-mono font-black tracking-widest uppercase">CAUTION</span>
              </div>

              <div>
                <div className="flex justify-between items-center text-slate-900 font-mono text-[9px] font-black border-b border-slate-800/20 pb-2 mb-3.5 tracking-widest uppercase">
                  <span>🚧 MILESTONE EXAM CHECKPOINT</span>
                  <span className="bg-slate-900 font-extrabold px-2 py-0.5 rounded text-amber-400 text-[8.5px]">PASS</span>
                </div>
                
                <h4 className="font-display font-black text-lg text-slate-950 leading-tight mb-1.5 tracking-tight flex items-center gap-1.5">
                  <span>📝</span>
                  <span>MLO Exam Station</span>
                </h4>
                <p className="text-slate-800 text-[11.5px] leading-relaxed mb-4 text-left">
                  Conquer the SAFE Mortgage loan test. Access study materials, helpful guides, and practice quizzes.
                </p>

                <div className="space-y-1 text-slate-900 font-mono text-[10.5px] font-semibold bg-white/40 p-2 rounded-xl border border-amber-500/20 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-700">⏱️</span>
                    <span>Timeline: <strong>2–4 Weeks Study Plan</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-700">🏷️</span>
                    <span>Cost: <strong>$110 Fee Per Try</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800/20 text-[9.5px] font-mono font-black text-slate-900 flex justify-between items-center">
                <span>TAKE PRACTICE STUDY QUIZ →</span>
                <span className="bg-slate-900 px-2 py-0.5 rounded text-amber-400 text-[8px] font-black uppercase">75% Target Score</span>
              </div>
            </div>

            {/* Metal support poles */}
            <div className="flex justify-center gap-16 h-8 w-full -mt-0.5 select-none pointer-events-none">
              <div className="w-1 bg-slate-400/80 rounded-b shadow-inner" />
              <div className="w-1 bg-slate-400/80 rounded-b shadow-inner" />
            </div>

            {/* Landmark: SAFE Exam Checkpoint Station Gate area */}
            <div className="mt-2 text-center hidden md:block">
              <div className="relative w-16 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl border-2 border-slate-800 shadow-xl flex flex-col justify-between p-2 select-none">
                <div className="w-full h-8 bg-slate-950 rounded-lg flex flex-col justify-center items-center shadow-inner text-center">
                  <span className="text-[6.5px] font-mono text-amber-400 font-bold leading-none">TEST PASS</span>
                  <span className="text-[9px] font-display font-black text-emerald-400 mt-0.5">75% MIN</span>
                </div>
                
                {/* Strobing hazard beacon */}
                <div className="absolute top-[-8px] right-2.5 w-3 h-3 rounded-full animate-alert-strobe border border-white shadow-md" />

                {/* Barrier Gate stick */}
                <div 
                  className="absolute left-[-26px] bottom-3.5 w-10 h-2 bg-gradient-to-r from-yellow-400 via-slate-900 to-yellow-400 rounded border border-slate-950 origin-right transition-transform duration-700 ease-in-out"
                  style={{
                    transform: activeStep >= 2 ? "rotate(-75deg)" : "rotate(0deg)",
                  }}
                />
                
                <div className="absolute left-[-2px] bottom-1 w-2.5 h-6 bg-slate-800 rounded-t border-l border-slate-600" />
                <span className="text-[7px] font-mono text-slate-900 font-black tracking-wider uppercase">SECURE</span>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-400 block mt-2">Exam Center 204</span>
            </div>
          </div>

          {/* STATION 3: CAREER LAUNCH CITY */}
          <div className="flex flex-col items-center">
            {/* Dark Neon Digital Dashboard Signboard */}
            <div 
              onClick={() => {
                setActiveStep(2);
                setTimeout(() => {
                  const el = document.getElementById("loan-factory-edge");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 100);
              }}
              className={`group bg-slate-950 border-[3.5px] rounded-3xl p-5 w-full h-[270px] relative flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-350 cursor-pointer select-none ${
                activeStep === 2 
                  ? "border-[#F36F23] ring-[10px] ring-orange-500/10 scale-[1.02] shadow-[#F36F23]/25 shadow-2xl" 
                  : "border-slate-200 hover:border-[#F36F23]/60"
              }`}
            >
              {/* Corner rivets */}
              <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-700/60 opacity-65" />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-700/60 opacity-65" />
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-700/60 opacity-65" />
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-700/60 opacity-65" />

              {/* Glowing dashboard spotlight accent */}
              {activeStep === 2 && (
                <div className="absolute inset-0 bg-gradient-to-tr from-[#F36F23]/10 via-transparent to-[#F36F23]/15 pointer-events-none animate-pulse-beam" />
              )}

              <div>
                <div className="flex justify-between items-center text-[#F36F23] font-mono text-[9px] font-black border-b border-slate-800 pb-2 mb-3.5 tracking-widest uppercase">
                  <span>🚀 DIGITAL ROADWAY END</span>
                  <span className="bg-[#F36F23] font-extrabold px-2 py-0.5 rounded text-white text-[8.5px]">LIVE</span>
                </div>
                
                <h4 className="font-display font-black text-lg text-white leading-tight mb-1.5 tracking-tight flex items-center gap-1.5">
                  <span>🏁</span>
                  <span>Career Launch City</span>
                </h4>
                <p className="text-slate-200 text-[11.5px] leading-relaxed mb-4 text-left">
                  Apply for your regulatory state license, join friendly corporate sponsors, and close low-rate home loans instantly.
                </p>

                <div className="space-y-1 text-slate-200 font-mono text-[10.5px] font-semibold bg-slate-900 p-2 rounded-xl border border-slate-800 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#F36F23]">⏱️</span>
                    <span>Timeline: <strong>2–3 Weeks Review Period</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400">🏷️</span>
                    <span>Cost: <strong>$250 – $450 (varies by state)</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800 text-[9.5px] font-mono font-black text-[#F36F23] flex justify-between items-center">
                <span>START REALTOR ONBOARDING →</span>
                <span className="bg-[#F36F23]/25 px-2 py-0.5 rounded text-white text-[8px] font-black uppercase">Sponsor Ready</span>
              </div>
            </div>

            {/* Supporting columns */}
            <div className="flex justify-center gap-16 h-8 w-full -mt-0.5 select-none pointer-events-none">
              <div className="w-1 bg-[#F36F23]/60 rounded-b shadow-inner" />
              <div className="w-1 bg-[#F36F23]/60 rounded-b shadow-inner" />
            </div>

            {/* Landmark: High-Rise Skyline of Destination City */}
            <div className="mt-2 text-center hidden md:block">
              <div className="relative w-18 h-20 bg-gradient-to-tr from-slate-900 to-slate-950 rounded-2xl border-2 border-orange-500/50 shadow-2xl flex flex-col justify-between p-2 select-none animate-scenic-float" style={{ animationDelay: "2s" }}>
                <div className="w-full h-8 bg-[#090d16] border border-orange-500/30 rounded-lg shadow-inner flex items-center justify-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-orange-400 animate-spin-slow" />
                  <span className="text-[7.5px] font-mono text-[#F36F23] font-black uppercase tracking-wider">LAUNCHED</span>
                </div>
                
                {/* Hanging checkered decorative finish banners */}
                <div className="absolute right-[-24px] bottom-3 w-10 flex flex-col gap-0.5 pointer-events-none select-none">
                  <div className="flex gap-0.5 self-start scale-90">
                    <div className="w-2 h-2 bg-slate-950 border border-slate-800" />
                    <div className="w-2 h-2 bg-white" />
                    <div className="w-2 h-2 bg-slate-950 border border-slate-800" />
                  </div>
                  <div className="flex gap-0.5 scale-90">
                    <div className="w-2 h-2 bg-white" />
                    <div className="w-2 h-2 bg-slate-950 border border-slate-800" />
                    <div className="w-2 h-2 bg-white" />
                  </div>
                </div>

                <div className="absolute right-2 bottom-0 w-0.5 h-16 bg-slate-500/80" />
                <span className="text-[7px] text-slate-100 font-bold tracking-tight">CAREER SUCCESS</span>
                <span className="text-[8.5px] font-mono text-emerald-400 font-black mt-1">ACTIVE ▲</span>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-400 block mt-2">Loan Factory HQ</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESTINATION FINALE: Bottom Celebratory Section */}
        {/* ========================================================================= */}
        <div className="mt-12 bg-gradient-to-r from-amber-50 via-white to-emerald-50 rounded-[2.5rem] p-8 md:p-12 border-2 border-emerald-100 shadow-xl relative overflow-hidden text-left z-10">
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <div className="confetti bg-yellow-400" style={{ left: "12%", top: "-10px", animationDelay: "0s" }} />
            <div className="confetti bg-rose-400" style={{ left: "28%", top: "-10px", animationDelay: "1.2s" }} />
            <div className="confetti bg-[#F36F23]" style={{ left: "44%", top: "-10px", animationDelay: "0.5s" }} />
            <div className="confetti bg-emerald-400" style={{ left: "62%", top: "-10px", animationDelay: "1.9s" }} />
            <div className="confetti bg-amber-400" style={{ left: "78%", top: "-10px", animationDelay: "0.8s" }} />
            <div className="confetti bg-rose-400" style={{ left: "91%", top: "-10px", animationDelay: "2.4s" }} />
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-2 bg-emerald-500 text-white font-mono text-[9px] font-black tracking-widest px-4 py-2 rounded-full uppercase shadow-md shadow-emerald-500/10">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-white animate-spin-slow" />
                <span>DESTINATION FINALE COMPLETE</span>
              </div>

              <div className="space-y-1">
                <h3 className="font-display font-black text-gray-900 text-2xl md:text-3xl tracking-tight leading-tight flex items-center gap-2.5">
                  <span>🏆</span>
                  <span>Registered MLO Success!</span>
                </h3>
                <p className="text-emerald-700 font-mono text-xs uppercase tracking-widest font-black flex items-center gap-1.5 pt-1">
                  <span>★</span> SPONSORSHIP ACTIVE WITH LOAN FACTORY <span>★</span>
                </p>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">
                Congratulations! After finishing your education course, passing the SAFE exam, and securing your NMLS company sponsorship, you are officially a Licensed Loan Officer. With Loan Factory's platform, unbeatable pricing model, and cutting edge tech tools, your origination business is armed for instant profit margins.
              </p>

              <div className="flex flex-wrap gap-4 pt-3 select-none">
                <div className="bg-emerald-800 text-white border-2 border-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-mono text-[10px] font-black shrink-0">
                  <Check className="w-4 h-4 stroke-[3] text-yellow-300" />
                  <span>NMLS CERTIFICATION GRANTED</span>
                </div>
                <div className="bg-[#F36F23] text-white border-2 border-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-mono text-[10px] font-black shrink-0 animate-bounce">
                  <Flag className="w-4 h-4 fill-white" />
                  <span>START MAKING DEALS WITH US TODAY!</span>
                </div>
              </div>
            </div>

            <div className="relative shrink-0 w-full sm:w-auto flex justify-center">
              <div className="w-52 h-52 rounded-full bg-gradient-to-tr from-orange-400/20 via-emerald-100 to-[#F36F23]/20 flex items-center justify-center p-4 relative z-10 border border-white shadow-inner animate-scenic-float">
                <div className="w-full h-full rounded-full bg-white border border-slate-100 shadow-xl flex flex-col justify-center items-center p-4 text-center">
                  <div className="relative w-18 h-18 bg-slate-100 border-2 border-orange-200 rounded-full flex items-center justify-center overflow-hidden mb-2">
                    <UserCheck className="w-12 h-12 text-[#F36F23] animate-pulse" />
                    <Star className="absolute bottom-0 right-0 w-4.5 h-4.5 text-yellow-500 fill-yellow-400" />
                  </div>

                  <span className="font-display font-black text-slate-850 text-xs tracking-tight leading-none">Leslie L.</span>
                  <span className="text-[9px] text-emerald-600 font-mono font-bold uppercase tracking-wider mt-1">Licensed MLO</span>
                  
                  <div className="bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5 mt-2 flex items-center gap-1 text-[8.5px] text-emerald-800 font-semibold font-mono">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span>Sponsorship Active</span>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full border border-dashed border-[#F36F23]/30 animate-spin-slow pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }



  if (viewMode === "drilldown") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden p-6 md:p-8 text-left max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-gray-100 mb-6">
          <div>
            <span className="font-mono text-xs font-bold tracking-widest text-[#F36F23]">
              ROADMAP DRILLDOWN
            </span>
            <h5 className="font-display font-medium text-lg text-gray-900 mt-0.5">
              Detailed Breakdown for: <strong className="text-[#F36F23]">{stepsDetails[activeStep].title}</strong>
            </h5>
          </div>
          <div className="flex gap-4 text-xs font-mono font-bold">
            <div className="bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
              <span className="text-gray-400">Time:</span> {stepsDetails[activeStep].timeframe}
            </div>
            <div className="bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
              <span className="text-gray-400">Cost:</span> {stepsDetails[activeStep].estimatedCost}
            </div>
          </div>
        </div>

        {/* Milestone bullets list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {stepsDetails[activeStep].bulletPoints.map((bullet, index) => (
            <div key={index} className="flex gap-3 items-start bg-gray-50 p-4 rounded-xl border border-gray-100/50">
              <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0 pt-0.5" />
              <p className="text-gray-700 text-sm leading-relaxed">{bullet}</p>
            </div>
          ))}
        </div>

        {/* If step 1, show exclusive Mortgage-Education.com partner promo badge/card */}
        {activeStep === 0 && (
          <div className="mb-6 p-5 md:p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 via-orange-50 to-amber-500/5 border border-orange-200/80 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
            <div className="space-y-3 flex-1 text-left">
              <div className="inline-flex items-center gap-1 bg-orange-100 text-[#F36F23] font-mono text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                <Tag className="w-3 h-3" />
                <span>EXCLUSIVELY FOR LOAN FACTORY DEVELOPING AGENTS</span>
              </div>
              <h6 className="font-display font-bold text-gray-950 text-base md:text-lg leading-snug">
                Mortgage-Education.com 20-Hour Course for Only <span className="text-[#F36F23] text-xl font-extrabold font-mono">$180</span>
              </h6>
              <p className="text-gray-600 text-xs md:text-sm leading-relaxed">
                Save over <strong>50%</strong> (normally $349+) on your mandatory 20-Hour classes. We sponsored this low price to help you start your career without expensive upfront costs!
              </p>
              
              {/* How to redeem list */}
              <div className="pt-2 border-t border-orange-100/50">
                <p className="text-xs font-bold text-[#F36F23] font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1">👉 REDEEM YOUR DISCOUNT:</p>
                <div className="text-xs text-gray-700 font-medium leading-relaxed">
                  <strong>Get reimbursed:</strong> Send us your class receipt when you join Loan Factory. We will pay you back the $180 of course costs once you close your first two loans!
                </div>
              </div>
            </div>

            {/* Direct CTA */}
            <div className="shrink-0 w-full md:w-auto text-center">
              <a
                href="https://www.mortgage-education.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#F36F23] hover:bg-[#D75612] text-white font-mono text-xs font-bold tracking-wider px-5 py-3.5 rounded-xl transition-all shadow-md hover:shadow-orange-500/15 cursor-pointer"
              >
                <span>Enroll & Save $180</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <p className="text-[10px] text-gray-400 mt-2 font-mono italic">Opens in a secure window</p>
            </div>
          </div>
        )}

        {/* Action routing based on step selected */}
        {activeStep !== 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center bg-orange-50/40 rounded-xl p-4 md:p-5 border border-orange-100/60 gap-4">
            <div className="text-xs text-orange-950 font-medium font-sans">
              🚩 {activeStep === 1 && "Start studying with our free exam prep tool."}
              {activeStep === 2 && "Once licensed, Loan Factory offers keep-100% commission splits, full sponsor approval, and weekly training."}
            </div>
            <div>
              {activeStep === 1 && (
                <a
                  href="#practice-exam-quiz"
                  className="bg-[#F36F23] hover:bg-[#D75612] text-white text-xs font-bold font-mono tracking-wider px-4 py-2.5 rounded-lg transition-colors inline-block text-center cursor-pointer font-mono"
                >
                  TAKE FREE MLO QUIZ
                </a>
              )}
              {activeStep === 2 && (
                <a
                  href="#registration-banner"
                  className="bg-[#F36F23] hover:bg-[#D75612] text-white text-xs font-bold font-mono tracking-wider px-4 py-2.5 rounded-lg transition-colors inline-block text-center cursor-pointer font-mono"
                >
                  SUBSCRIBE FOR CAREER PORTAL
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback: render both together in a single container
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stepsDetails.map((step) => {
          const isSelected = activeStep === step.id;
          return (
            <div
              key={step.id}
              onClick={() => {
                setActiveStep(step.id);
                const targetId = step.id === 0 
                  ? "roadmap-drilldown" 
                  : step.id === 1 
                    ? "practice-exam-quiz" 
                    : "loan-factory-edge";
                setTimeout(() => {
                  const el = document.getElementById(targetId);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }, 100);
              }}
              className={`bg-white text-left rounded-2xl p-6 md:p-8 cursor-pointer transition-all duration-300 border flex flex-col justify-between shadow-sm relative overflow-hidden group ${
                isSelected
                  ? "border-[#F36F23] ring-2 ring-orange-500/20 translate-y-[-4px]"
                  : "border-gray-100 hover:border-gray-200 hover:translate-y-[-2px] hover:shadow-md"
              }`}
            >
              <div>
                {/* Top ribbon for selection status */}
                {isSelected && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#F36F23]"></div>
                )}
                
                {/* Header info */}
                <div className="flex justify-between items-center mb-5">
                  <div className="inline-flex p-3 rounded-xl bg-orange-50 text-[#F36F23]">
                    {step.icon}
                  </div>
                  <span className="font-mono text-xs font-bold tracking-widest text-[#F36F23] bg-orange-100/50 px-2.5 py-1 rounded">
                    {step.stepNum}
                  </span>
                </div>

                <h4 className="font-display font-bold text-gray-950 text-lg md:text-xl leading-tight mb-3">
                  {step.title}
                </h4>

                <p className="text-gray-550 text-sm leading-relaxed mb-6">
                  {step.shortDesc}
                </p>
              </div>

              {/* Card CTA mimicking list item CTA but with interactive state support */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-xs font-bold font-mono tracking-wider">
                <span className={isSelected ? "text-[#F36F23]" : "text-gray-700 group-hover:text-[#F36F23] transition-colors"}>
                  {isSelected ? "VIEWING DETAILS ●" : "SELECT CARD TO EXPLORE →"}
                </span>
                <span className="text-gray-400 font-normal">
                  {step.timeframe}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden p-6 md:p-8 text-left">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-gray-100 mb-6">
          <div>
            <span className="font-mono text-xs font-bold tracking-widest text-[#F36F23]">
              ROADMAP DRILLDOWN
            </span>
            <h5 className="font-display font-medium text-lg text-gray-900 mt-0.5">
              Detailed Breakdown for: <strong className="text-[#F36F23]">{stepsDetails[activeStep].title}</strong>
            </h5>
          </div>
          <div className="flex gap-4 text-xs font-mono font-bold">
            <div className="bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
              <span className="text-gray-400">Time:</span> {stepsDetails[activeStep].timeframe}
            </div>
            <div className="bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
              <span className="text-gray-400">Cost:</span> {stepsDetails[activeStep].estimatedCost}
            </div>
          </div>
        </div>

        {/* Milestone bullets list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {stepsDetails[activeStep].bulletPoints.map((bullet, index) => (
            <div key={index} className="flex gap-3 items-start bg-gray-50 p-4 rounded-xl border border-gray-100/50">
              <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0 pt-0.5" />
              <p className="text-gray-700 text-sm leading-relaxed">{bullet}</p>
            </div>
          ))}
        </div>

        {/* If step 1, show exclusive Mortgage-Education.com partner promo badge/card */}
        {activeStep === 0 && (
          <div className="mb-6 p-5 md:p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 via-orange-50 to-amber-500/5 border border-orange-200/80 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
            <div className="space-y-3 flex-1 text-left">
              <div className="inline-flex items-center gap-1 bg-orange-100 text-[#F36F23] font-mono text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                <Tag className="w-3 h-3" />
                <span>EXCLUSIVELY FOR LOAN FACTORY DEVELOPING AGENTS</span>
              </div>
              <h6 className="font-display font-bold text-gray-950 text-base md:text-lg leading-snug">
                Mortgage-Education.com 20-Hour Course for Only <span className="text-[#F36F23] text-xl font-extrabold font-mono">$180</span>
              </h6>
              <p className="text-gray-600 text-xs md:text-sm leading-relaxed">
                Save over <strong>50%</strong> (normally $349+) on your mandatory 20-Hour classes. We sponsored this low price to help you start your career without expensive upfront costs!
              </p>
              
              {/* How to redeem list */}
              <div className="pt-2 border-t border-orange-100/50">
                <p className="text-xs font-bold text-[#F36F23] font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1">👉 REDEEM YOUR DISCOUNT:</p>
                <div className="text-xs text-gray-700 font-medium leading-relaxed">
                  <strong>Get reimbursed:</strong> Send us your class receipt when you join Loan Factory. We will pay you back the $180 of course costs once you close your first two loans!
                </div>
              </div>
            </div>

            {/* Direct CTA */}
            <div className="shrink-0 w-full md:w-auto text-center">
              <a
                href="https://www.mortgage-education.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#F36F23] hover:bg-[#D75612] text-white font-mono text-xs font-bold tracking-wider px-5 py-3.5 rounded-xl transition-all shadow-md hover:shadow-orange-500/15 cursor-pointer"
              >
                <span>Enroll & Save $180</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <p className="text-[10px] text-gray-400 mt-2 font-mono italic">Opens in a secure window</p>
            </div>
          </div>
        )}

        {/* Action routing based on step selected */}
        {activeStep !== 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center bg-orange-50/40 rounded-xl p-4 md:p-5 border border-orange-100/60 gap-4">
            <div className="text-xs text-orange-950 font-medium font-sans">
              🚩 {activeStep === 1 && "Start studying with our free exam prep tool."}
              {activeStep === 2 && "Once licensed, Loan Factory offers keep-100% commission splits, full sponsor approval, and weekly training."}
            </div>
            <div>
              {activeStep === 1 && (
                <a
                  href="#practice-exam-quiz"
                  className="bg-[#F36F23] hover:bg-[#D75612] text-white text-xs font-bold font-mono tracking-wider px-4 py-2.5 rounded-lg transition-colors inline-block text-center cursor-pointer font-mono"
                >
                  TAKE FREE MLO QUIZ
                </a>
              )}
              {activeStep === 2 && (
                <a
                  href="#registration-banner"
                  className="bg-[#F36F23] hover:bg-[#D75612] text-white text-xs font-bold font-mono tracking-wider px-4 py-2.5 rounded-lg transition-colors inline-block text-center cursor-pointer font-mono"
                >
                  SUBSCRIBE FOR CAREER PORTAL
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
