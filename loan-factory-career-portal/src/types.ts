/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ExamQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  category: "RESPA" | "TILA" | "ECOA" | "General mortgage knowledge" | "Ethics";
}

export interface StateLicensingRequirement {
  code: string;
  name: string;
  educationHours: number;
  stateHoursDetails: string;
  stateFee: number;
  agencyName: string;
  extraRequirements: string[];
}

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  state: string;
  quote: string;
  annualVolume: string;
}
