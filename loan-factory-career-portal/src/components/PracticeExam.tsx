import React, { useState } from "react";
import { CheckCircle2, XCircle, ChevronRight, RefreshCw, Trophy, FileText, Sparkles, BookOpen } from "lucide-react";
import { ExamQuestion } from "../types";

const mockQuestions: ExamQuestion[] = [
  {
    id: 1,
    question: "Which federal law protects home buyers by prohibiting kickbacks and referral fees in a mortgage transaction?",
    options: [
      "Truth in Lending Act (TILA)",
      "Real Estate Settlement Procedures Act (RESPA)",
      "Equal Credit Opportunity Act (ECOA)",
      "Home Mortgage Disclosure Act (HMDA)"
    ],
    correctAnswerIndex: 1,
    explanation: "RESPA Section 8 makes it illegal to give or accept any payments, gifts, or favors in exchange for sending business to a service company.",
    category: "RESPA"
  },
  {
    id: 2,
    question: "Under the Truth in Lending Act (TILA), how accurate must the written Annual Percentage Rate (APR) be for a standard fixed-rate loan?",
    options: [
      "No variance whatsoever is allowed",
      "0.125% (1/8 of a percent)",
      "0.250% (1/4 of a percent)",
      "0.500% (1/2 of a percent)"
    ],
    correctAnswerIndex: 1,
    explanation: "For standard fixed-rate loans, the displayed APR must be within 0.125% (1/8 of a percent) of the actual underlying rate.",
    category: "TILA"
  },
  {
    id: 3,
    question: "Under the Equal Credit Opportunity Act (ECOA), how many days does a lender have to notify you about their decision on your loan application?",
    options: [
      "3 business days",
      "15 business days",
      "30 calendar days",
      "45 calendar days"
    ],
    correctAnswerIndex: 2,
    explanation: "The law gives lenders 30 days once you turn in a full application to notify you if you are approved, denied, or if they have a counteroffer.",
    category: "ECOA"
  },
  {
    id: 4,
    question: "What score do you need to pass the nationwide SAFE Mortgage Loan Officer Test?",
    options: [
      "70% correct answers",
      "75% correct answers",
      "80% correct answers",
      "85% correct answers"
    ],
    correctAnswerIndex: 1,
    explanation: "The national test requires a score of 75% or higher. Out of 125 total multiple-choice questions, 115 are scored and 10 are ungraded practice questions.",
    category: "General mortgage knowledge"
  },
  {
    id: 5,
    question: "A loan officer suggests signing a family member's name on an application without telling them. This is a severe violation of:",
    options: [
      "RESPA Section 8 referral guidelines",
      "ECOA passive income disclosures",
      "Professional Ethics & Mortgage Fraud Laws",
      "S.A.F.E. Act state reporting procedures"
    ],
    correctAnswerIndex: 2,
    explanation: "Forging a signature is a serious crime. It is a severe violation of ethics and mortgage fraud laws.",
    category: "Ethics"
  }
];

export default function PracticeExam() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  
  // Lead Capture state at finish
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", state: "CA" });
  
  const question = mockQuestions[currentIdx];

  const handleSelectOption = (optionIndex: number) => {
    if (isAnswered) return;
    setSelectedAns(optionIndex);
    setIsAnswered(true);
    if (optionIndex === question.correctAnswerIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < mockQuestions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedAns(null);
      setIsAnswered(false);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedAns(null);
    setIsAnswered(false);
    setScore(0);
    setFinished(false);
    setFormSubmitted(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setFormSubmitted(true);
  };

  const scorePct = Math.round((score / mockQuestions.length) * 100);
  const isPassed = scorePct >= 75;

  return (
    <div id="practice-exam-quiz" className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-orange-100" />
          <div>
            <h3 className="font-display font-semibold text-lg tracking-wide leading-tight">MLO QUIZ</h3>
            <p className="text-orange-100 text-xs mt-0.5">Test your mortgage rules and ethics knowledge</p>
          </div>
        </div>
        <div className="bg-orange-700/40 text-xs font-mono font-bold px-3 py-1.5 rounded-full border border-orange-400/35">
          {!finished ? `Q: ${currentIdx + 1} / ${mockQuestions.length}` : "COMPLETE"}
        </div>
      </div>

      {/* Main body */}
      <div className="p-6 md:p-8">
        {!finished ? (
          <div>
            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / mockQuestions.length) * 100}%` }}
              ></div>
            </div>

            {/* Category tag */}
            <div className="mb-3">
              <span className="text-xs font-mono font-semibold tracking-wider uppercase bg-orange-50 text-primary px-2.5 py-1 rounded-md border border-orange-100">
                Category: {question.category}
              </span>
            </div>

            {/* Question Text */}
            <h4 className="font-display font-semibold text-gray-900 text-lg md:text-xl leading-relaxed mb-6">
              {question.question}
            </h4>

            {/* Options list */}
            <div className="space-y-3 mb-6">
              {question.options.map((option, idx) => {
                let btnStyle = "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800";
                let iconEl = null;

                if (isAnswered) {
                  if (idx === question.correctAnswerIndex) {
                    btnStyle = "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium ring-1 ring-emerald-500";
                    iconEl = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
                  } else if (idx === selectedAns) {
                    btnStyle = "border-rose-300 bg-rose-50/80 text-rose-950 ring-1 ring-rose-300";
                    iconEl = <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
                  } else {
                    btnStyle = "border-gray-200 text-gray-400 cursor-not-allowed opacity-60";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswered}
                    id={`opt-btn-${idx}`}
                    className={`w-full text-left p-4 rounded-xl border flex justify-between items-center gap-4 transition-all duration-250 cursor-pointer ${btnStyle}`}
                  >
                    <span className="text-sm md:text-base">{option}</span>
                    {iconEl}
                  </button>
                );
              })}
            </div>

            {/* Explanation card hidden until actioned */}
            {isAnswered && (
              <div className="bg-orange-50/70 rounded-xl p-5 border border-orange-100/80 mb-6 slide-in duration-300">
                <span className="font-mono text-[10px] font-bold tracking-wider text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded uppercase block w-max mb-2">
                  Answer Explanation
                </span>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            )}

            {/* Footer action button */}
            {isAnswered && (
              <button
                onClick={handleNext}
                id="next-question-btn"
                className="w-full flex justify-center items-center gap-2 bg-primary hover:bg-primary-hover text-white py-3.5 px-6 rounded-xl font-medium tracking-wide shadow-md transition-colors cursor-pointer"
              >
                <span>{currentIdx < mockQuestions.length - 1 ? "Next Question" : "View Results"}</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4 text-primary">
              <Trophy className="w-10 h-10 text-orange-500" />
            </div>

            <h4 className="font-display font-bold text-2xl md:text-3xl text-gray-900 mb-2">
              Your Quiz Score
            </h4>
            <div className="flex items-baseline justify-center gap-2 mb-4">
              <span className={`text-5xl font-mono font-black ${isPassed ? "text-emerald-600" : "text-amber-500"}`}>
                {scorePct}%
              </span>
              <span className="text-gray-500 text-sm font-semibold">({score} out of {mockQuestions.length})</span>
            </div>

            <div className="max-w-md mx-auto mb-8">
              {isPassed ? (
                <div className="bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-lg p-3.5 text-sm">
                  🚀 <strong>Amazing!</strong> You scored 75% or higher. You are in great shape to pass the actual license test!
                </div>
              ) : (
                <div className="bg-amber-50 text-amber-950 border border-amber-100 rounded-lg p-3.5 text-sm">
                  📚 <strong>Nice try!</strong> The official passing score is 75%. We recommend using our free online question bank to practice.
                </div>
              )}
            </div>

            {/* Free Exam Center promo block */}
            <div className="max-w-md mx-auto mb-6 p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 via-orange-50 to-amber-500/5 border border-orange-200 shadow-sm text-left">
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F36F23] flex items-center justify-center shrink-0 font-bold">
                  🎓
                </div>
                <div>
                  <span className="font-mono text-[9px] font-bold text-[#F36F23] bg-orange-100/60 px-2 py-0.5 rounded tracking-wide uppercase">100% FREE PRACTICE CENTER</span>
                  <h5 className="font-display font-bold text-gray-950 text-base mt-2">
                    Master your License Exam
                  </h5>
                  <p className="text-gray-655 text-xs mt-1 leading-relaxed">
                    Try over <strong>10,000 free practice questions</strong>, real test simulators, and study tools without paying anything or registering.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <a
                  href="https://www.loanfactory.com/loanofficerexamcenter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#F36F23] hover:bg-[#D75612] text-white font-mono text-xs font-bold tracking-wider py-3 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <span>Go to Free Exam Center (10,000+ Qs)</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
                <p className="text-center text-[10px] text-gray-400 mt-2 font-mono">
                  loanfactory.com/loanofficerexamcenter
                </p>
              </div>
                      </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={handleRestart}
                id="restart-exam-btn"
                className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retake Quiz</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
