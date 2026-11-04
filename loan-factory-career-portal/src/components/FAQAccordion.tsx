import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { FAQItem } from "../types";

const faqData: FAQItem[] = [
  {
    id: 1,
    question: "How long does it take to become a Loan Officer?",
    answer: "It usually takes 3 to 6 weeks. You will take a 20-hour online class (1 to 2 weeks), study for and pass the national test (2 to 3 weeks), and then wait for your state's approval. During this time, they will run a background check and review your credit."
  },
  {
    id: 2,
    question: "How much does it cost to get licensed?",
    answer: "It usually costs between $500 and $900 to get started. But you can save money! Through Loan Factory's partnership with Mortgage-Education.com, the 20-hour class is only $180 (usually $349). Other costs include the test fee ($110), a background check ($36), a credit check ($15), and state fees ($100 to $400)."
  },
  {
    id: 6,
    question: "How do I get the $180 special rate for the 20-hour course?",
    answer: "It is very easy! 1) Click any class link on this website to go to Mortgage-Education.com. 2) Choose your state's 20-hour course. 3) Enter coupon code 'LF180' at checkout to drop the price to $180. Plus, if you join Loan Factory after passing your test, we will pay you back for the class cost!"
  },
  {
    id: 3,
    question: "Do I need any real estate or mortgage experience?",
    answer: "No, you don't need any mortgage or real estate experience! The 20-hour class and the exam will teach you everything you need to know about laws, rules, and how to help home buyers. Many of our top team members used to work in retail, sales, healthcare, or the military."
  },
  {
    id: 4,
    question: "Can I get licensed in multiple states?",
    answer: "Yes! Many loan officers work in 5, 10, or more states. Once you pass the national test one time, you never have to retake it. To get licensed in another state, you just need to take a short state-law class (usually 1 to 4 hours) and pay that state's license fee."
  },
  {
    id: 5,
    question: "How do Loan Officers get paid?",
    answer: "Most loan officers earn a commission when they close a loan, calculated using 'basis points' (bps). 100 basis points equals 1% of the loan amount. For example, if you close $1,000,000 in loans in a month and your split is 125 bps (1.25%), you earn $12,500. With Loan Factory's low interest rates, it is much easier to attract customers and close more loans."
  }
];

export default function FAQAccordion() {
  const [openId, setOpenId] = useState<number | null>(1); // Default keep first open

  const toggleOpen = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {faqData.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className={`bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm transition-all duration-300 ${
              isOpen ? "ring-1 ring-orange-500/10 border-orange-200" : ""
            }`}
          >
            <button
              onClick={() => toggleOpen(item.id)}
              id={`faq-btn-${item.id}`}
              className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className={`w-5 h-5 shrink-0 ${isOpen ? "text-primary animate-pulse" : "text-gray-400"}`} />
                <span className="font-display font-semibold text-gray-950 text-base md:text-lg">
                  {item.question}
                </span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${
                  isOpen ? "rotate-180 text-primary" : ""
                }`}
              />
            </button>
            <div
              className={`transition-all duration-300 overflow-hidden ${
                isOpen ? "max-h-72 border-t border-gray-100" : "max-h-0"
              }`}
            >
              <div className="p-5 md:p-6 bg-gray-50/40 text-gray-700 text-sm md:text-base leading-relaxed">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
