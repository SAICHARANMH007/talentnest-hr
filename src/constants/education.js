// Master lists of degrees and branches/specializations used across candidate
// profile education entries, college candidate imports, and placement drive
// eligibility filters. Keep this the single source of truth so dropdowns stay
// consistent everywhere. Existing free-text values are NOT invalidated —
// fields that don't match a known option fall back to a custom "Other" entry.

export const DEGREES = [
  '10th / SSC',
  '12th / Intermediate / Diploma',
  'Diploma (Polytechnic)',
  'ITI',
  'Associate Degree',
  'B.Tech',
  'B.E.',
  'B.Sc',
  'B.Com',
  'B.A.',
  'BBA',
  'BCA',
  'B.Pharm',
  'B.Arch',
  'B.Des',
  'B.Ed',
  'BFA',
  'B.Voc',
  'LLB',
  'BHM',
  'MBBS',
  'BDS',
  'BAMS',
  'BHMS',
  'B.VSc',
  'BPT',
  'B.Sc Nursing',
  'M.Tech',
  'M.E.',
  'M.Sc',
  'M.Com',
  'M.A.',
  'MBA',
  'MCA',
  'M.Pharm',
  'M.Arch',
  'M.Des',
  'M.Ed',
  'MFA',
  'LLM',
  'MD',
  'MS (Medical)',
  'MHM',
  'M.Phil',
  'PhD',
  'Post Doctorate',
];

export const ENGINEERING_BRANCHES = [
  'Computer Science Engineering (CSE)',
  'Information Technology (IT)',
  'Electronics & Communication Engineering (ECE)',
  'Electrical & Electronics Engineering (EEE)',
  'Electrical Engineering (EE)',
  'Mechanical Engineering (ME)',
  'Civil Engineering (CE)',
  'Chemical Engineering',
  'Aerospace Engineering',
  'Automobile Engineering',
  'Biotechnology',
  'Biomedical Engineering',
  'Metallurgical Engineering',
  'Mining Engineering',
  'Production Engineering',
  'Instrumentation Engineering',
  'Agricultural Engineering',
  'Artificial Intelligence & Machine Learning (AI & ML)',
  'Data Science',
  'Cyber Security',
];

export const MBA_SPECIALIZATIONS = [
  'Finance',
  'Marketing',
  'Human Resources (HR)',
  'Operations Management',
  'Information Technology',
  'International Business',
  'Business Analytics',
  'Supply Chain Management',
  'General Management',
  'Healthcare Management',
];

export const COMPUTER_APPLICATIONS_SPECIALIZATIONS = [
  'Computer Applications',
  'Computer Science',
  'Information Technology',
  'Data Science',
  'Cyber Security',
];

export const SCIENCE_BRANCHES = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Biotechnology',
  'Electronics',
  'Statistics',
];

export const COMMERCE_MANAGEMENT_BRANCHES = [
  'General',
  'Accounting & Finance',
  'Banking & Insurance',
  'Economics',
  'Marketing',
  'Human Resources',
];

export const LAW_SPECIALIZATIONS = [
  'General / Corporate Law',
  'Criminal Law',
  'Civil Law',
  'Constitutional Law',
  'Intellectual Property Law',
  'Taxation Law',
  'International Law',
  'Labour & Employment Law',
];

export const ARCHITECTURE_DESIGN_BRANCHES = [
  'Architecture',
  'Urban Planning',
  'Interior Design',
  'Landscape Architecture',
  'Graphic Design',
  'Product Design',
  'Fashion Design',
  'Animation',
];

export const MEDICAL_HEALTH_BRANCHES = [
  'General Medicine',
  'Dentistry',
  'Ayurveda',
  'Homeopathy',
  'Pharmacy',
  'Nursing',
  'Physiotherapy',
  'Veterinary Science',
  'Hospital Management',
];

export const EDUCATION_BRANCHES = [
  'General Education',
  'Elementary Education',
  'Secondary Education',
  'Special Education',
  'Educational Psychology',
];

// Maps a chosen degree to its list of branch / specialization options.
// Degrees not listed here fall back to DEFAULT_BRANCHES.
export const BRANCHES_BY_DEGREE = {
  'B.Tech': ENGINEERING_BRANCHES,
  'B.E.': ENGINEERING_BRANCHES,
  'M.Tech': ENGINEERING_BRANCHES,
  'M.E.': ENGINEERING_BRANCHES,
  'Diploma (Polytechnic)': ENGINEERING_BRANCHES,
  'MBA': MBA_SPECIALIZATIONS,
  'BBA': MBA_SPECIALIZATIONS,
  'MHM': MBA_SPECIALIZATIONS,
  'BCA': COMPUTER_APPLICATIONS_SPECIALIZATIONS,
  'MCA': COMPUTER_APPLICATIONS_SPECIALIZATIONS,
  'B.Sc': SCIENCE_BRANCHES,
  'M.Sc': SCIENCE_BRANCHES,
  'M.Phil': SCIENCE_BRANCHES,
  'B.Com': COMMERCE_MANAGEMENT_BRANCHES,
  'M.Com': COMMERCE_MANAGEMENT_BRANCHES,
  'LLB': LAW_SPECIALIZATIONS,
  'LLM': LAW_SPECIALIZATIONS,
  'B.Arch': ARCHITECTURE_DESIGN_BRANCHES,
  'M.Arch': ARCHITECTURE_DESIGN_BRANCHES,
  'B.Des': ARCHITECTURE_DESIGN_BRANCHES,
  'M.Des': ARCHITECTURE_DESIGN_BRANCHES,
  'BFA': ARCHITECTURE_DESIGN_BRANCHES,
  'MFA': ARCHITECTURE_DESIGN_BRANCHES,
  'MBBS': MEDICAL_HEALTH_BRANCHES,
  'BDS': MEDICAL_HEALTH_BRANCHES,
  'BAMS': MEDICAL_HEALTH_BRANCHES,
  'BHMS': MEDICAL_HEALTH_BRANCHES,
  'B.Pharm': MEDICAL_HEALTH_BRANCHES,
  'M.Pharm': MEDICAL_HEALTH_BRANCHES,
  'B.VSc': MEDICAL_HEALTH_BRANCHES,
  'BPT': MEDICAL_HEALTH_BRANCHES,
  'B.Sc Nursing': MEDICAL_HEALTH_BRANCHES,
  'MD': MEDICAL_HEALTH_BRANCHES,
  'MS (Medical)': MEDICAL_HEALTH_BRANCHES,
  'BHM': MEDICAL_HEALTH_BRANCHES,
  'B.Ed': EDUCATION_BRANCHES,
  'M.Ed': EDUCATION_BRANCHES,
};

export const DEFAULT_BRANCHES = ['General'];

// All branch/specialization options across every degree, de-duplicated —
// used to populate placement drive eligibility "Branch" filter dropdowns
// so a placement officer can pick from every possible specialization.
export const ALL_BRANCHES = Array.from(new Set([
  ...ENGINEERING_BRANCHES,
  ...MBA_SPECIALIZATIONS,
  ...COMPUTER_APPLICATIONS_SPECIALIZATIONS,
  ...SCIENCE_BRANCHES,
  ...COMMERCE_MANAGEMENT_BRANCHES,
  ...LAW_SPECIALIZATIONS,
  ...ARCHITECTURE_DESIGN_BRANCHES,
  ...MEDICAL_HEALTH_BRANCHES,
  ...EDUCATION_BRANCHES,
  ...DEFAULT_BRANCHES,
]));
