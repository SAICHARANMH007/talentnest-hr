export const STAGES = [
  { id:"applied",             label:"Applied",     icon:"📋", color:"#0176D3" },
  { id:"screening",           label:"Screening",   icon:"🔍", color:"#014486" },
  { id:"shortlisted",         label:"Shortlisted", icon:"⭐", color:"#A07E00" },
  { id:"interview_scheduled", label:"Interview",   icon:"📅", color:"#F59E0B" },
  { id:"interview_completed", label:"Interviewed", icon:"💬", color:"#0176D3" },
  { id:"offer_extended",      label:"Offer Sent",  icon:"📨", color:"#10b981" },
  { id:"selected",            label:"Hired",       icon:"🎉", color:"#2E844A" },
  { id:"rejected",            label:"Rejected",    icon:"✕",  color:"#BA0517" },
];
export const SM = Object.fromEntries(STAGES.map(s => [s.id, s]));

// Maps DB title-case stage names → frontend lowercase IDs (single source of truth)
export const DB_TO_FRONTEND_STAGE = {
  'Applied'            : 'applied',
  'Screening'          : 'screening',
  'Shortlisted'        : 'shortlisted',
  'Interview Round 1'  : 'interview_scheduled',
  'Interview Round 2'  : 'interview_completed',
  'Offer'              : 'offer_extended',
  'Hired'              : 'selected',
  'Rejected'           : 'rejected',
};
// Reverse: frontend lowercase ID → DB title-case
export const FRONTEND_TO_DB_STAGE = Object.fromEntries(
  Object.entries(DB_TO_FRONTEND_STAGE).map(([k, v]) => [v, k])
);
export const NEXT = {
  applied:             ["screening","shortlisted","rejected"],
  screening:           ["shortlisted","rejected"],
  shortlisted:         ["interview_scheduled","rejected"],
  interview_scheduled: ["interview_completed","rejected"],
  interview_completed: ["offer_extended","rejected"],
  offer_extended:      ["selected","rejected"],
  selected:[], rejected:[],
};
