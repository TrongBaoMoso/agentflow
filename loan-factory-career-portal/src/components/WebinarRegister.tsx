import React, { useState, useEffect } from "react";
import { Calendar, Users, ArrowRight, ShieldCheck, Mail, CheckCircle, Clock } from "lucide-react";

export default function WebinarRegister() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [isRegistered, setIsRegistered] = useState(false);

  // Countdown timer calculation to next Tuesday/Wednesday webinar
  // Let's mock a standard weekly webinar scheduled for Wednesday at 5:00 PM PST
  const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 4, minutes: 12, seconds: 48 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        } else {
          // Reset countdown back to a new cycle
          return { days: 6, hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) return;
    setIsRegistered(true);
  };

  return (
    <div id="registration-banner" className="bg-gradient-to-br from-orange-400 via-primary to-orange-600 rounded-3xl p-6 md:p-10 lg:p-12 text-white shadow-2xl relative overflow-hidden max-w-6xl mx-auto">
      
      {/* Visual Ambient Background Graphics */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-700/20 rounded-full blur-2xl pointer-events-none -ml-16 -mb-16"></div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
        
        {/* Text info and countdown */}
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-mono font-bold uppercase tracking-wider">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>WEEKLY LIVE STRATEGY WEBINAR</span>
          </div>

          <h3 className="font-display font-medium text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight">
            See How Top Loan Officers Grow Their Business
          </h3>

          <p className="text-orange-100 text-sm md:text-base leading-relaxed max-w-xl">
            Join our weekly live class to learn how to get your license, find customers, and earn top commission splits with Loan Factory.
          </p>

          {/* Real-time Countdown Grid */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-mono font-semibold text-orange-200 tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-100" />
              NEXT LIVE BROADCAST COUNTDOWN
            </span>
            <div className="flex gap-3">
              {[
                { label: "DAYS", val: timeLeft.days },
                { label: "HRS", val: timeLeft.hours },
                { label: "MINS", val: timeLeft.minutes },
                { label: "SECS", val: timeLeft.seconds }
              ].map((item, idx) => (
                <div key={idx} className="bg-orange-850/40 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 w-16 text-center">
                  <div className="font-mono text-xl md:text-2xl font-black text-white leading-none">
                    {String(item.val).padStart(2, "0")}
                  </div>
                  <div className="text-[9px] font-mono font-medium text-orange-200 mt-1 uppercase tracking-widest">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webinar host bullet points */}
          <div className="flex flex-wrap gap-y-2 gap-x-6 pt-2 text-xs font-medium text-orange-100 font-mono">
            <span className="flex items-center gap-1.5">📅 Wednesdays at 5:00 PM PST</span>
            <span className="flex items-center gap-1.5">🙋 Interactive Q&A Included</span>
            <span className="flex items-center gap-1.5">⏱️ Duration: 45 Mins</span>
          </div>
        </div>

        {/* Lead Registration Card */}
        <div className="w-full lg:max-w-md">
          <div className="bg-white text-gray-900 rounded-2xl p-6 md:p-8 shadow-xl border border-white/10 relative">
            
            {!isRegistered ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-center pb-2 border-b border-gray-100 mb-2">
                  <h5 className="font-display font-bold text-gray-950 text-xl leading-tight">
                    Claim Your Free Virtual Seat
                  </h5>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-650 uppercase tracking-wide mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sarah Smith"
                    className="w-full text-sm border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-650 uppercase tracking-wide mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sarah@example.com"
                    className="w-full text-sm border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-650 uppercase tracking-wide mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 000-0000"
                    className="w-full text-sm border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  id="webinar-register-btn"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl text-sm font-semibold transition-colors flex justify-center items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Reserve Webinar Spot</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex justify-center items-center gap-1.5 text-[10px] text-gray-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>No spam constraint. Opt-out at any time.</span>
                </div>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="inline-flex p-3 bg-emerald-50 rounded-full text-emerald-600 mb-4 animate-bounce">
                  <CheckCircle className="w-10 h-10" />
                </div>
                
                <h5 className="font-display font-semibold text-gray-950 text-xl leading-tight">
                  Seat Confirmed, {formData.name}!
                </h5>
                <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
                  We sent your virtual ticket and calendar link to <span className="font-mono text-gray-900 font-bold">{formData.email}</span>.
                </p>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 my-6 text-left space-y-2 text-xs">
                  <div className="text-gray-500 font-semibold tracking-wider font-mono">WEBINAR TICKET</div>
                  <div><strong>Live Platform:</strong> Zoom Link</div>
                  <div><strong>Access Code:</strong> <span className="font-mono bg-orange-100 text-primary-hover font-semibold px-1 rounded">LF-CAREER-WEB</span></div>
                  <div><strong>Calendar Invite:</strong> In your mailbox</div>
                </div>

                <div className="text-[11px] text-gray-400 italic">
                  We will text you a link 15 minutes before the show start at {formData.phone}!
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
