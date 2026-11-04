import React, { useState } from "react";
import { 
  ArrowRight, 
  Award, 
  BookOpen, 
  Briefcase, 
  Check, 
  ChevronRight, 
  Clock, 
  DollarSign, 
  FileSpreadsheet, 
  GraduationCap, 
  HelpCircle, 
  Landmark, 
  Percent, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  UserCheck, 
  Users, 
  Zap,
  MapPin,
  Menu,
  X,
  FileText,
  Map,
  BadgeDollarSign
} from "lucide-react";

// Import custom high-fidelity interactive widgets
import PracticeExam from "./components/PracticeExam";
import CompCalculator from "./components/CompCalculator";
import LicensingRoadmap from "./components/LicensingRoadmap";
import StateGuide from "./components/StateGuide";
import WebinarRegister from "./components/WebinarRegister";
import FAQAccordion from "./components/FAQAccordion";

export default function App() {
  const [activeTab, setActiveTab] = useState<"rates" | "clients" | "commissions">("rates");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRoadmapStep, setActiveRoadmapStep] = useState<number>(0);

  // Dynamic state navigation helper to scroll smoothly
  const smoothScrollTo = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FBFC] font-sans antialiased text-[#111111]">
      
      {/* ================================== HEADER & NAVIGATION ================================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo representing an authoritative educational platform */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-[#F36F23] flex items-center justify-center text-white font-bold text-xl shadow-md border border-orange-500/25">
                LF
              </div>
              <div>
                <span className="font-display font-black text-2xl tracking-tight text-[#111111] uppercase leading-none block">
                  Loan <span className="text-[#F36F23]">Factory</span>
                </span>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#F36F23] block uppercase mt-0.5">
                  CAREER & licensing PORTAL
                </span>
              </div>
            </div>

            {/* Desktop Nav Actions focusing on main educational hubs */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              <button 
                onClick={() => smoothScrollTo("recruiting-sponsorship-section")} 
                className="text-sm font-semibold text-gray-700 hover:text-[#F36F23] transition-colors cursor-pointer"
              >
                About Us
              </button>
              <button 
                onClick={() => smoothScrollTo("roadmap-section")} 
                className="text-sm font-semibold text-gray-700 hover:text-[#F36F23] transition-colors cursor-pointer"
              >
                Get Licensed
              </button>
              <button 
                onClick={() => smoothScrollTo("practice-exam-quiz")} 
                className="text-sm font-semibold text-gray-700 hover:text-[#F36F23] transition-colors cursor-pointer"
              >
                SAFE Exam
              </button>
              <button 
                onClick={() => smoothScrollTo("state-lookup-section")} 
                className="text-sm font-semibold text-gray-700 hover:text-[#F36F23] transition-colors cursor-pointer"
              >
                State Licensing
              </button>
              <button 
                onClick={() => smoothScrollTo("salary-calculator-section")} 
                className="text-sm font-semibold text-gray-700 hover:text-[#F36F23] transition-colors cursor-pointer"
              >
                Earnings
              </button>
              <button 
                onClick={() => smoothScrollTo("resource-center-section")} 
                className="text-sm font-semibold text-gray-700 hover:text-[#F36F23] transition-colors cursor-pointer"
              >
                Guides
              </button>
              <button 
                onClick={() => smoothScrollTo("faq-section-container")} 
                className="text-sm font-semibold text-gray-700 hover:text-[#F36F23] transition-colors cursor-pointer"
              >
                FAQs
              </button>
            </nav>

            {/* Header Right Actions */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => smoothScrollTo("practice-exam-quiz")}
                className="text-xs font-bold font-mono tracking-wider bg-white hover:bg-gray-50 border border-gray-950 text-[#111111] px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
              >
                MLO QUIZ
              </button>
              <button
                onClick={() => smoothScrollTo("recruiting-sponsorship-section")}
                className="text-xs font-bold font-mono tracking-wider bg-[#F36F23] hover:bg-[#D75612] text-white px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm shadow-orange-500/10"
              >
                SPONSORED CAREERS
              </button>
            </div>

            {/* Mobile Menu Toggler */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              id="mobile-menu-toggler"
              className="md:hidden p-2 text-gray-600 hover:text-[#F36F23] focus:outline-none cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 p-4 space-y-3 slide-in duration-200">
            <button 
              onClick={() => { setMobileMenuOpen(false); smoothScrollTo("recruiting-sponsorship-section"); }} 
              className="block w-full text-left py-2 font-semibold text-gray-700 hover:text-[#F36F23] transition-colors"
            >
              About Us
            </button>
            <button 
              onClick={() => { setMobileMenuOpen(false); smoothScrollTo("roadmap-section"); }} 
              className="block w-full text-left py-2 font-semibold text-gray-700 hover:text-[#F36F23] transition-colors"
            >
              Get Licensed
            </button>
            <button 
              onClick={() => { setMobileMenuOpen(false); smoothScrollTo("practice-exam-quiz"); }} 
              className="block w-full text-left py-2 font-semibold text-gray-700 hover:text-[#F36F23] transition-colors"
            >
              SAFE Exam
            </button>
            <button 
              onClick={() => { setMobileMenuOpen(false); smoothScrollTo("state-lookup-section"); }} 
              className="block w-full text-left py-2 font-semibold text-gray-700 hover:text-[#F36F23] transition-colors"
            >
              State Licensing
            </button>
            <button 
              onClick={() => { setMobileMenuOpen(false); smoothScrollTo("salary-calculator-section"); }} 
              className="block w-full text-left py-2 font-semibold text-gray-700 hover:text-[#F36F23] transition-colors"
            >
              Earnings
            </button>
            <button 
              onClick={() => { setMobileMenuOpen(false); smoothScrollTo("resource-center-section"); }} 
              className="block w-full text-left py-2 font-semibold text-gray-700 hover:text-[#F36F23] transition-colors"
            >
              Guides
            </button>
            <button 
              onClick={() => { setMobileMenuOpen(false); smoothScrollTo("faq-section-container"); }} 
              className="block w-full text-left py-2 font-semibold text-gray-700 hover:text-[#F36F23] transition-colors"
            >
              FAQs
            </button>
            <hr className="border-gray-105" />
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => { setMobileMenuOpen(false); smoothScrollTo("practice-exam-quiz"); }}
                className="text-center text-xs font-bold font-mono tracking-wider py-2.5 bg-white text-[#111111] border border-gray-950 rounded-lg hover:bg-gray-50 transition-colors"
              >
                PRACTICE EXAM
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); smoothScrollTo("recruiting-sponsorship-section"); }}
                className="text-center text-xs font-bold font-mono tracking-wider py-2.5 bg-[#F36F23] text-white rounded-lg hover:bg-[#D75612]"
              >
                About Us
              </button>
            </div>
          </div>
        )}
      </header>


      {/* ================================== TITLE HUB / EDUCATIONAL HERO ================================== */}
      <section className="relative overflow-hidden py-16 md:py-24 lg:py-28 bg-gradient-to-b from-white via-gray-50/70 to-[#F9FBFC]">
        {/* Subtle, background grid graphic representing academic rigor */}
        <div className="absolute inset-0 bg-grid-[#F36F23]/[0.02] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="absolute top-20 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 bottom-0 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 text-left space-y-6">
              
              {/* Trust Badge / Portal Identification */}
              <div className="inline-flex items-center gap-2 bg-orange-100/60 border border-orange-200/50 text-[#F36F23] font-mono text-xs font-bold px-3 py-1.5 rounded-full tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>NMLS Approved Materials & Career Blueprints</span>
              </div>

              <div className="space-y-4">
                <h1 className="font-display font-medium tracking-tight text-gray-950 text-4xl sm:text-5xl lg:text-6xl leading-[1.08] max-w-3xl">
                  Loan Officer <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F36F23] to-[#D75612] font-semibold">Career Guide</span>
                </h1>
                <p className="text-gray-550 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl">
                  Everything you need to start your career. Find state licensing requirements, free study guides, practice quizzes, and an earnings estimator.
                </p>
              </div>

              {/* Core Hub Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  onClick={() => smoothScrollTo("roadmap-section")}
                  id="hero-primary-cta"
                  className="bg-[#F36F23] hover:bg-[#D75612] text-white py-4 px-8 rounded-2xl text-base font-semibold tracking-wide flex justify-center items-center gap-2 shadow-lg hover:shadow-orange-500/20 hover:scale-[1.01] transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Explore Licensing Roadmap</span>
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </button>
                <button
                  onClick={() => smoothScrollTo("state-lookup-section")}
                  id="hero-secondary-cta"
                  className="bg-white hover:bg-gray-50 border-2 border-gray-950 text-[#111111] py-4 px-8 rounded-2xl text-base font-semibold tracking-wide transition-all flex justify-center items-center gap-2 cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.01]"
                >
                  <MapPin className="text-[#F36F23] w-5 h-5" />
                  <span>Lookup State NMLS Fee & Hours</span>
                </button>
              </div>



            </div>

            {/* Right Column featuring high-fidelity collaborative illustration/image */}
            <div className="lg:col-span-5 relative mt-8 lg:mt-0 flex justify-center">
              {/* Outer circle glow */}
              <div className="absolute -inset-4 bg-orange-500/10 rounded-full blur-2xl"></div>
              
              <div className="relative">
                {/* Main image container */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-[4/3] w-full max-w-md">
                  <img 
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=600&h=450" 
                    referrerPolicy="no-referrer"
                    alt="Loan Officers collaborating with clients" 
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                  {/* Subtle vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/20 to-transparent"></div>
                </div>

                {/* Floating Metric 1 */}
                <div className="absolute -top-4 -right-4 bg-white/95 backdrop-blur border border-orange-100 p-3 rounded-2xl shadow-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-gray-400">Commission Rate</p>
                    <p className="text-sm font-bold text-gray-900">Keep 100% Splits</p>
                  </div>
                </div>

                {/* Floating Metric 2 */}
                <div className="absolute -bottom-4 -left-4 bg-white/95 backdrop-blur border border-orange-100 p-3.5 rounded-2xl shadow-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#F36F23] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-gray-400">NMLS Approved</p>
                    <p className="text-xs font-bold text-gray-900">National Exam Ready</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ================================== SECTION 2 — YOUR ROADMAP ================================== */}
      <section id="roadmap-section" className="py-16 md:py-24 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="font-mono text-xs font-bold tracking-widest text-[#F36F23] uppercase">
              RELIABLE CAREER BLUEPRINT
            </span>
            <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl tracking-normal text-gray-950">
              Your 3-Step Path to Becoming a Loan Officer
            </h2>
            <p className="text-gray-550 text-base md:text-lg">
              Start with confidence. Choose each step below to see the required classes, licensing costs, and timelines.
            </p>
          </div>

          <LicensingRoadmap viewMode="cards" activeStep={activeRoadmapStep} setActiveStep={setActiveRoadmapStep} />

        </div>
      </section>


      {/* ================================== SECTION 2.5 — ROADMAP DRILLDOWN ================================== */}
      <section id="roadmap-drilldown" className="py-16 md:py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <LicensingRoadmap viewMode="drilldown" activeStep={activeRoadmapStep} setActiveStep={setActiveRoadmapStep} />
        </div>
      </section>


      {/* ================================== SECTION 3 — DIAGNOSTIC EXAM SECTION ================================== */}
      <section id="practice-exam-quiz" className="py-16 md:py-24 bg-slate-50/70 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="font-mono text-xs font-bold tracking-widest text-[#F36F23] uppercase">
              Loan Officer Practice Quiz
            </span>
            <h2 className="font-display font-medium text-3xl sm:text-4xl text-gray-950">
              Test Your Mortgage Knowledge
            </h2>
            <p className="text-gray-550 text-sm md:text-base max-w-2xl mx-auto">
              Take this quick 5-question quiz to see how prepared you are for the mortgage licensing exam. Get a feel for the types of topics you'll need to know before becoming a Loan Officer.
            </p>
          </div>

          <PracticeExam />

        </div>
      </section>


      {/* ================================== SECTION 4 — STATE LICENSING LOOKUP ================================== */}
      <section id="state-lookup-section" className="py-16 md:py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="font-mono text-xs font-bold tracking-widest text-[#F36F23] uppercase">
              NMLS STATE GUIDE
            </span>
            <h2 className="font-display font-medium text-3xl sm:text-4xl text-gray-950 uppercase">
              LOAN OFFICER REQUIREMENTS BY STATE
            </h2>
            <p className="text-gray-550 text-sm md:text-base max-w-2xl mx-auto">
              Every state has different licensing requirements. Check your state's education hours, fees, and application process.
            </p>
          </div>

          <StateGuide />

        </div>
      </section>


      {/* ================================== SECTION 5 — LOAN OFFICER SALARY GUIDE & EXT COMP CALCULATOR ================================== */}
      <section id="salary-calculator-section" className="py-20 md:py-28 bg-[#111111] text-white border-y border-gray-900 relative overflow-hidden">
        {/* Subtle decorative lights */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12 relative z-10">
          
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="font-mono text-xs font-bold tracking-widest text-[#F36F23] uppercase bg-[#F36F23]/10 px-3 py-1 rounded-full border border-[#F36F23]/20">
              HOW MUCH ARE YOU GIVING AWAY?
            </span>
            <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl tracking-normal text-white">
              See What You Could Keep Instead.
            </h2>
            <p className="text-gray-400 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
              Compare Loan Factory with a typical brokerage and discover how much you could potentially save every year.
            </p>
          </div>

          <CompCalculator />

        </div>
      </section>

      {/* ================================== SECTION 6 — CONTENT RESOURCE HUB (5 CARDS WITH PREMIUM ILLUSTRATIONS & ACCENTS) ================================== */}
      <section id="resource-center-section" className="py-20 md:py-28 bg-[#F9FBFC] border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 text-left">
          
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100/50 text-[#F36F23] rounded-full text-xs font-mono font-bold tracking-wider uppercase">
              <BookOpen className="w-4 h-4" />
              <span>LOAN OFFICER KNOWLEDGE CENTER</span>
            </div>
            <h2 className="font-display font-medium text-3xl sm:text-4xl text-gray-950 tracking-tight leading-tight">
              Beginner-Friendly Career Guides & Tools
            </h2>
            <p className="text-gray-550 text-sm md:text-base leading-relaxed">
              Everything you need to start and grow your mortgage business—all in one place.
            </p>
          </div>

          {/* 5 Card Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            
            {/* CARD 1: How to Become */}
            <div className="bg-white hover:bg-white rounded-3xl p-6 border border-gray-150 hover:border-orange-500 hover:shadow-[0_20px_40px_rgba(243,111,35,0.06)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
              <div className="space-y-5">
                {/* Custom abstract vector illustration background representation */}
                <div className="relative w-full h-24 bg-gradient-to-br from-orange-500/5 to-orange-500/10 rounded-2xl flex items-center justify-center overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-[#F36F23]/10 rounded-full group-hover:scale-150 transition-all duration-500"></div>
                  <div className="absolute -left-2 -top-2 w-12 h-12 bg-[#F36F23]/5 rounded-full"></div>
                  <div className="w-12 h-12 bg-[#F36F23] text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300 relative z-10">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-orange-600 bg-orange-50 px-2 py-1 rounded-md uppercase">Licensing</span>
                  <span className="text-[10px] font-mono font-medium text-gray-400">4 min read</span>
                </div>

                <h3 className="font-display font-bold text-base text-gray-950 group-hover:text-[#F36F23] transition-colors">
                  How to Become a Loan Officer
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Learn <strong>how to become a Loan Officer</strong> from scratch. We walk you through the essential education and <strong>NMLS licensing</strong> process.
                </p>
              </div>
              <div className="pt-5 border-t border-gray-100/80 mt-5">
                <button 
                  onClick={() => smoothScrollTo("roadmap-section")}
                  className="text-xs font-bold font-mono tracking-wider text-[#F36F23] flex items-center gap-1 hover:gap-2 transition-all cursor-pointer"
                >
                  <span>Start Journey</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CARD 2: SAFE Exam */}
            <div className="bg-white hover:bg-white rounded-3xl p-6 border border-gray-150 hover:border-emerald-500 hover:shadow-[0_20px_40px_rgba(16,185,129,0.06)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
              <div className="space-y-5">
                {/* Custom abstract vector illustration */}
                <div className="relative w-full h-24 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 rounded-2xl flex items-center justify-center overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-emerald-500/10 rounded-full group-hover:scale-150 transition-all duration-500"></div>
                  <div className="absolute -left-2 -top-2 w-12 h-12 bg-emerald-500/5 rounded-full"></div>
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300 relative z-10">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-600 bg-emerald-50/50 px-2 py-1 rounded-md uppercase">Exam Prep</span>
                  <span className="text-[10px] font-mono font-medium text-gray-400">5 min read</span>
                </div>

                <h3 className="font-display font-bold text-base text-gray-950 group-hover:text-emerald-600 transition-colors">
                  Mortgage Licensing Exam Guide
                </h3>
                <p className="text-gray-550 text-xs leading-relaxed">
                  Getting ready for your mortgage licensing exam? Find study tips, practice strategies, and simple guidance to help you prepare with confidence.
                </p>
              </div>
              <div className="pt-5 border-t border-gray-100/80 mt-5">
                <button 
                  onClick={() => smoothScrollTo("practice-exam-quiz")}
                  className="text-xs font-bold font-mono tracking-wider text-emerald-600 flex items-center gap-1 hover:gap-2 transition-all cursor-pointer"
                >
                  <span>Study for the Exam</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CARD 3: Multi-State Licensing */}
            <div className="bg-white hover:bg-white rounded-3xl p-6 border border-gray-150 hover:border-blue-500 hover:shadow-[0_20px_40px_rgba(59,130,246,0.06)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
              <div className="space-y-5">
                {/* Custom abstract vector illustration */}
                <div className="relative w-full h-24 bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-2xl flex items-center justify-center overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-blue-500/10 rounded-full group-hover:scale-150 transition-all duration-500"></div>
                  <div className="absolute -left-2 -top-2 w-12 h-12 bg-blue-500/5 rounded-full"></div>
                  <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300 relative z-10">
                    <MapPin className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">Scope</span>
                  <span className="text-[10px] font-mono font-medium text-gray-400">3 min read</span>
                </div>

                <h3 className="font-display font-bold text-base text-gray-950 group-hover:text-blue-600 transition-colors">
                  Multi-State Licensing
                </h3>
                <p className="text-gray-550 text-xs leading-relaxed">
                  Expand your market by obtaining <strong>NMLS licensing</strong> in multiple states. Grab our NMLS guide details to grow your footprint.
                </p>
              </div>
              <div className="pt-5 border-t border-gray-100/80 mt-5">
                <button 
                  onClick={() => smoothScrollTo("state-lookup-section")}
                  className="text-xs font-bold font-mono tracking-wider text-blue-600 flex items-center gap-1 hover:gap-2 transition-all cursor-pointer"
                >
                  <span>Explore States</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CARD 4: Salary Guide */}
            <div className="bg-white hover:bg-white rounded-3xl p-6 border border-gray-150 hover:border-violet-500 hover:shadow-[0_20px_40px_rgba(139,92,246,0.06)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
              <div className="space-y-5">
                {/* Custom abstract vector illustration */}
                <div className="relative w-full h-24 bg-gradient-to-br from-violet-500/5 to-violet-500/10 rounded-2xl flex items-center justify-center overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-violet-500/10 rounded-full group-hover:scale-150 transition-all duration-500"></div>
                  <div className="absolute -left-2 -top-2 w-12 h-12 bg-violet-500/5 rounded-full"></div>
                  <div className="w-12 h-12 bg-violet-550 text-white rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform duration-300 relative z-10">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-violet-600 bg-violet-50 px-2 py-1 rounded-md uppercase">Earnings</span>
                  <span className="text-[10px] font-mono font-medium text-gray-400">3 min read</span>
                </div>

                <h3 className="font-display font-bold text-base text-gray-950 group-hover:text-violet-600 transition-colors">
                  Loan Officer Salary Guide
                </h3>
                <p className="text-gray-550 text-xs leading-relaxed">
                  See how Loan Factory compares to typical brokers when it comes to the expenses that impact your bottom line.
                </p>
              </div>
              <div className="pt-5 border-t border-gray-100/80 mt-5">
                <button 
                  onClick={() => smoothScrollTo("salary-calculator-section")}
                  className="text-xs font-bold font-mono tracking-wider text-violet-600 flex items-center gap-1 hover:gap-2 transition-all cursor-pointer"
                >
                  <span>Explore Income</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CARD 5: Lead Generation */}
            <div className="bg-white hover:bg-white rounded-3xl p-6 border border-gray-150 hover:border-pink-500 hover:shadow-[0_20px_40px_rgba(236,72,153,0.06)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
              <div className="space-y-5">
                {/* Custom abstract vector illustration */}
                <div className="relative w-full h-24 bg-gradient-to-br from-pink-500/5 to-pink-500/10 rounded-2xl flex items-center justify-center overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-pink-500/10 rounded-full group-hover:scale-150 transition-all duration-500"></div>
                  <div className="absolute -left-2 -top-2 w-12 h-12 bg-pink-500/5 rounded-full"></div>
                  <div className="w-12 h-12 bg-pink-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform duration-300 relative z-10">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-pink-600 bg-pink-50 px-2 py-1 rounded-md uppercase">Growth</span>
                  <span className="text-[10px] font-mono font-medium text-gray-400">4 min read</span>
                </div>

                <h3 className="font-display font-bold text-base text-gray-950 group-hover:text-pink-600 transition-colors">
                  Lead Gen & Marketing
                </h3>
                <p className="text-gray-550 text-xs leading-relaxed">
                  Build a continuous closed loan pipeline. Learn modern digital prospecting, social branding, and real estate developer partner marketing.
                </p>
              </div>
              <div className="pt-5 border-t border-gray-100/80 mt-5">
                <button 
                  onClick={() => smoothScrollTo("registration-banner")}
                  className="text-xs font-bold font-mono tracking-wider text-pink-600 flex items-center gap-1 hover:gap-2 transition-all cursor-pointer"
                >
                  <span>Build Pipeline</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ================================== SECTION 7 — REPOSITIONED LOAN FACTORY RECRUITING & PLATFORM ================================== */}
      <section id="recruiting-sponsorship-section" className="py-16 md:py-24 bg-[#111111] text-white overflow-hidden relative">
        <span id="loan-factory-edge" className="absolute top-0 left-0 pointer-events-none"></span>
        {/* Subtle decorative background graphic */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -ml-44"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16 text-left">
          
          <div className="max-w-3xl space-y-2">
            <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl tracking-normal">
              WHY LOAN FACTORY?
            </h2>
          </div>

          {/* 5 Sponsorship Benefit Cards (100% Commission, Tera Technology, Licensed in 48 States, 240+ Lenders, Training & Live Support) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            
            {/* BENEFIT 1: 100% Commission */}
            <div className="bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-6 border border-white/5 hover:border-[#F36F23]/40 transition-all duration-300 flex flex-col justify-between space-y-4 group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-[#F36F23]/20 flex items-center justify-center text-[#F36F23] group-hover:scale-110 transition-transform">
                  <Percent className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-base text-white group-hover:text-[#F36F23] transition-colors">
                  100% Commission
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Keep 100% of your commission payout. We only charge a flat loan fee of just $595 on closing. No hidden fees or desk splits.
                </p>
              </div>
            </div>

            {/* BENEFIT 2: Tera Technology */}
            <div className="bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-6 border border-white/5 hover:border-blue-500/40 transition-all duration-300 flex flex-col justify-between space-y-4 group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-550/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-base text-white group-hover:text-blue-400 transition-colors">
                  Tera Technology
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  TERA brings everything you need into one platform—including LOS, POS, CRM, pricing, marketing, support, and marketplace tools. Built in-house and free for Loan Officers, it helps you save time and close more loans.
                </p>
              </div>
            </div>

            {/* BENEFIT 3: Licensed in 48 States */}
            <div className="bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-6 border border-white/5 hover:border-pink-500/40 transition-all duration-300 flex flex-col justify-between space-y-4 group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-550/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-base text-white group-hover:text-pink-400 transition-colors">
                  Licensed in 48 States
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Grow your business nationwide with multi-state opportunities.
                </p>
              </div>
            </div>

            {/* BENEFIT 4: 240+ Lenders */}
            <div className="bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-6 border border-white/5 hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between space-y-4 group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-[#F36F23]/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Landmark className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-base text-white group-hover:text-emerald-400 transition-colors">
                  240+ Lenders
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  To close any type of loans: Commercial, Land, Chattel (Mobile home loans), etc.
                </p>
              </div>
            </div>

            {/* BENEFIT 5: Training & Live Support */}
            <div className="bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-6 border border-white/5 hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between space-y-4 group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-base text-white group-hover:text-amber-400 transition-colors">
                  Training & Live Support
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Free weekly training, underwriting assistance, marketing support, and live help whenever you need it.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ================================== SECTION 8 — WEBINAR REGISTRATION CTA ================================== */}
      <section id="registration-banner" className="py-16 md:py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <WebinarRegister />
        </div>
      </section>


      {/* ================================== SECTION 9 — DETAILED SEO & AI-SEARCH FAQS ================================== */}
      <section id="faq-section-container" className="py-16 md:py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Description Column styled optimally for visual layout and hierarchy */}
            <div className="lg:col-span-4 text-left space-y-4 lg:sticky lg:top-24">
              <span className="font-mono text-xs font-bold tracking-widest text-[#F36F23] uppercase">
                Loan Officer FAQs
              </span>
              <h2 className="font-display font-medium text-3xl sm:text-4xl text-gray-950 leading-tight">
                Loan Officer FAQs
              </h2>
              <p className="text-gray-500 text-sm md:text-base leading-relaxed">
                Get answers to common questions about how to become a Loan Officer, licensing requirements, SAFE exam preparation, and how Loan Officers earn money.
              </p>
              <p className="text-xs text-gray-400">
                Have specific structural questions? Reach our educational counselors directly at <span className="text-[#F36F23] font-bold">careers@loanfactory.com</span>.
              </p>
              
              <div className="pt-4">
                <button 
                  onClick={() => smoothScrollTo("registration-banner")}
                  className="bg-white hover:bg-gray-50 border border-gray-950 text-[#111111] font-bold font-mono text-xs tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md hover:scale-[1.01]"
                >
                  SCHEDULE CAREER ADVISING
                </button>
              </div>
            </div>

            {/* Right Interactive Accordion Column */}
            <div className="lg:col-span-8">
              <FAQAccordion />
            </div>

          </div>
        </div>
      </section>





      {/* ================================== FOOTER ================================== */}
      <footer className="bg-white border-t border-gray-100 py-12 md:py-16 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-gray-100">
            
            {/* Branding Column */}
            <div className="col-span-2 lg:col-span-4 space-y-4 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F36F23] flex items-center justify-center text-white font-black text-sm">
                  LF
                </div>
                <span className="font-display font-bold text-lg text-gray-900 tracking-tight">
                  LOAN <span className="text-[#F36F23]">FACTORY</span>
                </span>
              </div>
              <p className="text-gray-400 text-xs leading-normal pr-4">
                Loan Factory is the premier wholesale platform that hosts Loan Officers with elite proprietary technology, market-low pricing setups, and live support structures. Built to help originators self-sustain.
              </p>
              <div className="text-[10px] text-gray-400 font-mono">
                © {new Date().getFullYear()} Loan Factory, Inc. All rights reserved.
              </div>
            </div>

            {/* Resources Column */}
            <div className="col-span-1 lg:col-span-2.5 space-y-3 text-left">
              <h5 className="font-mono text-xs font-bold tracking-wider text-gray-800 uppercase">
                EDUCATIONAL HUBS
              </h5>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => smoothScrollTo("roadmap-section")} className="text-gray-400 hover:text-[#F36F23] transition-colors cursor-pointer">
                    Get Licensed
                  </button>
                </li>
                <li>
                  <button onClick={() => smoothScrollTo("practice-exam-quiz")} className="text-gray-400 hover:text-[#F36F23] transition-colors cursor-pointer">
                    SAFE Exam
                  </button>
                </li>
                <li>
                  <button onClick={() => smoothScrollTo("state-lookup-section")} className="text-gray-400 hover:text-[#F36F23] transition-colors cursor-pointer">
                    State Licensing
                  </button>
                </li>
                <li>
                  <button onClick={() => smoothScrollTo("resource-center-section")} className="text-gray-400 hover:text-[#F36F23] transition-colors cursor-pointer">
                    Guides
                  </button>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="col-span-1 lg:col-span-2.5 space-y-3 text-left">
              <h5 className="font-mono text-xs font-bold tracking-wider text-gray-800 uppercase">
                ORGANIZATION
              </h5>
              <ul className="space-y-2">
                <li>
                  <a href="#company" className="text-gray-400 hover:text-[#F36F23] transition-colors">
                    About Loan Factory
                  </a>
                </li>
                <li>
                  <a href="mailto:careers@loanfactory.com" className="text-gray-400 hover:text-[#F36F23] transition-colors font-semibold">
                    Contact Careers Team
                  </a>
                </li>
                <li>
                  <a href="#careers" className="text-gray-400 hover:text-[#F36F23] transition-colors font-mono">
                    careers@loanfactory.com
                  </a>
                </li>
              </ul>
            </div>

            {/* Compliance Matrix */}
            <div className="col-span-2 lg:col-span-3 space-y-3 font-mono text-[10px] text-gray-400 text-left border-l border-gray-100 pl-4">
              <h5 className="font-semibold text-gray-650 uppercase tracking-wider">
                COMPLIANCE INDEX
              </h5>
              <div className="space-y-1 bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                <p className="font-semibold text-gray-600">NMLS Company ID: #32084</p>
                <p>NMLS Sponsor Broker ID: #1024</p>
                <p>Equal Housing Opportunity Lender</p>
                <p>Licensed under state mortgage laws nationwide.</p>
              </div>
            </div>

          </div>

          {/* Licensing disclosures */}
          <div className="pt-8 text-center text-[10px] text-gray-400 leading-normal space-y-2">
            <p>
              Disclaimer: Fees, salaries, and commission outputs inside this page are shown for learning purposes. Actual earnings depend on your state, experience, and mortgage market volume.
            </p>
            <p className="font-mono text-gray-350">
              Licensed Broker under CA DRE #01429990, DFPI #60DBO-32084 | TX SML #32084 | FL OFR #MLD359.
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
