import React from "react";
import { ArrowRight, Award } from "lucide-react";

interface TopProducer {
  name: string;
  volume: string;
  units: number;
  avatar: string;
}

export default function CompCalculator() {
  // Real Top Producers data with Premium Diverse Headshots
  const topProducers: TopProducer[] = [
    { 
      name: "Andy Singh", 
      volume: "$88M+", 
      units: 156,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120"
    },
    { 
      name: "Tien Dang", 
      volume: "$82M+", 
      units: 147,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120&h=120"
    },
    { 
      name: "Minh Voduy", 
      volume: "$67M+", 
      units: 133,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120&h=120"
    },
    { 
      name: "Vivek Agarwal", 
      volume: "$47M+", 
      units: 96,
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120&h=120"
    },
    { 
      name: "Anne Nguyen", 
      volume: "$44M+", 
      units: 102,
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120&h=120"
    }
  ];

  return (
    <div id="earning-simulator-container" className="space-y-16 max-w-6xl mx-auto text-left">
      
      {/* Static Savings Comparison Card */}
      <div id="calculator-section" className="bg-[#1c1c1e] text-white rounded-3xl shadow-2xl border border-white/5 p-6 md:p-10 relative overflow-hidden">
        {/* Abstract background grid */}
        <div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          
          {/* Column 1: Hero Savings Statement */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#F36F23]/15 via-amber-500/5 to-transparent rounded-[2rem] p-8 border border-[#F36F23]/20 relative overflow-hidden text-center space-y-6">
            {/* Absolute decorative glow circles */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#F36F23]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-1 relative z-10">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                Save Up To
              </h4>
            </div>

            <div className="relative z-10">
              <span className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-white block tracking-tight leading-none bg-gradient-to-r from-white via-orange-100 to-[#F36F23] bg-clip-text text-transparent drop-shadow-sm">
                $11,556
              </span>
              <span className="text-lg font-mono font-extrabold text-[#F36F23] tracking-wide mt-1 block uppercase">
                / year
              </span>
              <p className="text-gray-400 text-xs sm:text-sm font-medium mt-1">
                in software costs
              </p>
            </div>

            <div className="relative z-10 py-1 flex items-center justify-center gap-3">
              <div className="h-px bg-white/10 flex-grow" />
              <span className="text-[10px] font-mono font-black text-gray-500 tracking-widest uppercase px-2.5 py-0.5 bg-white/5 rounded border border-white/5">
                PLUS
              </span>
              <div className="h-px bg-white/10 flex-grow" />
            </div>

            <div className="relative z-10">
              <span className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-emerald-400 block tracking-tight leading-none">
                $200–$600
              </span>
              <p className="text-gray-350 text-xs sm:text-sm font-medium mt-2 leading-relaxed">
                on every closed loan.
              </p>
            </div>
          </div>

          {/* Column 2: Comparison Table */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="text-[#F36F23] font-mono text-xs font-bold uppercase tracking-wider block mb-1">
                Side-by-Side Savings
              </span>
              <h3 className="font-display font-semibold text-2xl sm:text-3xl text-white tracking-tight">
                What Does It Cost to Run Your Business?
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mt-2 italic font-mono pl-3 border-l-2 border-[#F36F23]/40">
                "Many brokers charge you to run your business. Loan Factory helps you keep more of what you earn."
              </p>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Expenses
                    </th>
                    <th className="py-4 px-4 text-xs font-bold text-[#F36F23] uppercase tracking-wider text-center">
                      Loan Factory
                    </th>
                    <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                      Other Brokers
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-4 text-sm font-medium text-slate-300">
                      Software Costs
                    </td>
                    <td className="py-4 px-4 text-sm font-black text-center text-emerald-400">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full text-xs font-semibold">
                        $0/mo
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-mono text-gray-400 text-right">
                      $963/mo
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-4 text-sm font-medium text-slate-300">
                      Processing Fee
                    </td>
                    <td className="py-4 px-4 text-sm font-black text-center text-emerald-400">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full text-xs font-semibold">
                        $500/loan
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-mono text-gray-400 text-right">
                      $700–$1,100/loan
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-4 text-sm font-medium text-slate-300">
                      Compensation Model
                    </td>
                    <td className="py-4 px-4 text-sm font-black text-center text-emerald-400">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full text-xs font-semibold font-sans">
                        100% Payout
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-mono text-gray-400 text-right">
                      Varies
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-4 text-sm font-medium text-slate-300">
                      Company Fee
                    </td>
                    <td className="py-4 px-4 text-sm font-black text-center text-[#F36F23]">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-300 rounded-full text-xs font-semibold">
                        $595/loan
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-mono text-gray-400 text-right">
                      Varies
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => {
                  const reg = document.getElementById("registration-banner");
                  if (reg) reg.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-3 rounded-xl bg-[#F36F23] hover:bg-orange-550 text-white font-bold text-xs font-mono tracking-wider transition-all shadow-lg hover:shadow-orange-500/20 cursor-pointer"
              >
                START SAVING TODAY
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Top Producers Section */}
      <div id="top-producers-section" className="space-y-8">
        
        {/* Title area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-orange-500/10">
              <Award className="w-3.5 h-3.5 text-[#F36F23]" />
              <span>Our Top Producers</span>
            </span>
            <h4 className="font-display font-medium text-2xl sm:text-3xl text-white">
              Meet Loan Factory's Top Producers
            </h4>
            <p className="text-gray-400 text-sm max-w-xl">
              See what some of Loan Factory's top-performing Loan Officers achieved in 2025. Their success reflects dedication, consistency, and the opportunities available on our platform.
            </p>
          </div>
          
          <button 
            onClick={() => {
              const road = document.getElementById("roadmap-section");
              if (road) road.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs font-bold font-mono tracking-wider text-[#F36F23] flex items-center gap-1 hover:gap-2 transition-all cursor-pointer bg-white/5 px-4 py-2 rounded-xl border border-white/5 hover:border-[#F36F23]"
          >
            <span>JOIN THE PORTAL</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Real Loan Officers Card Grid with Headshots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {topProducers.map((producer, index) => (
            <div 
              key={producer.name}
              className="bg-[#1c1c1e] hover:bg-white/5 border border-white/5 hover:border-[#F36F23]/50 rounded-2xl p-5 transition-all duration-300 relative group text-left"
            >
              {/* Placement badge */}
              <div className="absolute top-4 right-4 text-[10px] font-bold text-gray-500 font-mono">
                Top #{index + 1}
              </div>
              
              <div className="space-y-4">
                {/* Profile Photo Headshot */}
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#F36F23] transition-colors shadow">
                  <img 
                    src={producer.avatar} 
                    referrerPolicy="no-referrer"
                    alt={producer.name} 
                    className="w-full h-full object-cover transform scale-102 group-hover:scale-108 transition-all duration-300 pointer-events-none select-none"
                  />
                </div>

                <div>
                  <h5 className="font-semibold text-white text-sm group-hover:text-[#F36F23] transition-colors">{producer.name}</h5>
                  <span className="text-[10px] text-gray-455 uppercase tracking-wider block mt-0.5">Licensed Originator</span>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-450 uppercase font-mono tracking-wider">Loan Volume:</span>
                    <span className="font-mono font-bold text-[#F36F23] text-sm">{producer.volume}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-455 uppercase font-mono tracking-wider">Loans Closed:</span>
                    <span className="font-mono text-xs font-semibold text-white bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">{producer.units}</span>
                  </div>
                </div>
              </div>
              
            </div>
          ))}
        </div>

        {/* Footer info notes */}
        <div className="pt-6 border-t border-white/5 space-y-4 text-left">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] p-5 rounded-2xl border border-white/5 shadow-inner">
            <p className="text-sm font-semibold text-white">
              Think you're next? Explore what you can build with Loan Factory.
            </p>
            <button
              onClick={() => {
                const reg = document.getElementById("registration-banner");
                if (reg) reg.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-xs font-bold font-mono tracking-wider text-[#F36F23] flex items-center gap-1 hover:gap-2 transition-all cursor-pointer bg-white/5 hover:bg-[#F36F23]/10 px-4 py-2.5 rounded-xl border border-[#F36F23]/25"
            >
              <span>EXPLORE OPPORTUNITIES</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed italic">
            *These results represent the performance of individual Loan Officers and are not typical or guaranteed. Your results will depend on your experience, effort, market conditions, and business performance.*
          </p>
        </div>

      </div>

    </div>
  );
}
