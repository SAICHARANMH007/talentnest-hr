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
export const NEXT = {
  applied:             ["screening","shortlisted","rejected"],
  screening:           ["shortlisted","rejected"],
  shortlisted:         ["interview_scheduled","rejected"],
  interview_scheduled: ["interview_completed","rejected"],
  interview_completed: ["offer_extended","rejected"],
  offer_extended:      ["selected","rejected"],
  selected:[], rejected:[],
};
