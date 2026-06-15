import { useState, useEffect, Component, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { set401Handler, clearToken, default as api, setToken as setApiToken, tokenIsValid } from './api/api.js';
import { usePushNotifications } from './hooks/usePushNotifications.js';
import { API_BASE_URL } from './api/config.js';
import PlatformPresentationModal from './components/modals/PlatformPresentationModal.jsx';

// ── Lazy-loaded pages (each becomes its own JS chunk) ──────────────────────────
const MeetingRoom      = lazy(() => import('./pages/meeting/MeetingRoom.jsx'));
const JobDistribution  = lazy(() => import('./pages/admin/JobDistribution.jsx'));
const AuthScreen = lazy(() => import('./pages/auth/AuthScreen.jsx'));
const SetPasswordPage = lazy(() => import('./pages/auth/SetPasswordPage.jsx'));
const CareersPage          = lazy(() => import('./pages/careers/CareersPage.jsx'));
const JobDetailPage        = lazy(() => import('./pages/careers/JobDetailPage.jsx'));
const ApplicationTracker   = lazy(() => import('./pages/public/ApplicationTracker.jsx'));
const NpsSurveyPage        = lazy(() => import('./pages/public/NpsSurveyPage.jsx'));
const LandingPage = lazy(() => import('./pages/marketing/LandingPage.jsx'));
const AboutPage = lazy(() => import('./pages/marketing/AboutPage.jsx'));
const ServicesPage = lazy(() => import('./pages/marketing/ServicesPage.jsx'));
const ContactPage = lazy(() => import('./pages/marketing/ContactPage.jsx'));
const HRMSPage = lazy(() => import('./pages/marketing/HRMSPage.jsx'));
const ServiceDetailPage = lazy(() => import('./pages/marketing/ServiceDetailPage.jsx'));
const BlogPage = lazy(() => import('./pages/marketing/BlogPage.jsx'));
const BlogPostPage = lazy(() => import('./pages/marketing/BlogPostPage.jsx'));
const CompaniesPage      = lazy(() => import('./pages/marketing/CompaniesPage.jsx'));
const ProductsPage       = lazy(() => import('./pages/marketing/ProductsPage.jsx'));
const ProductHireBoard   = lazy(() => import('./pages/marketing/ProductHireBoard.jsx'));
const ProductPeopleDesk  = lazy(() => import('./pages/marketing/ProductPeopleDesk.jsx'));
const ProductJobTrack    = lazy(() => import('./pages/marketing/ProductJobTrack.jsx'));
const ProductCampusHub   = lazy(() => import('./pages/marketing/ProductCampusHub.jsx'));
const PrivacyPage = lazy(() => import('./pages/marketing/PrivacyPage.jsx'));
const TermsPage = lazy(() => import('./pages/marketing/TermsPage.jsx'));
const InviteResponsePage = lazy(() => import('./pages/public/InviteResponsePage.jsx'));
const SchedulingPage       = lazy(() => import('./pages/public/SchedulingPage.jsx'));
const OfferApprovalPage    = lazy(() => import('./pages/public/OfferApprovalPage.jsx'));
const OrgCareersPage = lazy(() => import('./pages/careers/OrgCareersPage.jsx'));

const CandidateDashboard = lazy(() => import('./pages/candidate/CandidateDashboard.jsx'));
const CandidateApplications = lazy(() => import('./pages/candidate/CandidateApplications.jsx'));
const CandidateInterviews = lazy(() => import('./pages/candidate/CandidateInterviews.jsx'));
const CandidateNotificationSettings = lazy(() => import('./pages/candidate/CandidateNotificationSettings.jsx'));
const CandidateProfile = lazy(() => import('./pages/candidate/CandidateProfile.jsx'));
const CandidateAssessment = lazy(() => import('./pages/candidate/CandidateAssessment.jsx'));
const CandidateSmartMatch = lazy(() => import('./pages/candidate/CandidateSmartMatch.jsx'));
const CandidateReferEarn  = lazy(() => import('./pages/candidate/CandidateReferEarn.jsx'));
const CandidateCareerJourney = lazy(() => import('./pages/candidate/CandidateCareerJourney.jsx'));
const CandidateBackgroundVerification = lazy(() => import('./pages/candidate/CandidateBackgroundVerification.jsx'));
const RecruiterDashboard = lazy(() => import('./pages/recruiter/RecruiterDashboard.jsx'));
const RecruiterJobs = lazy(() => import('./pages/recruiter/RecruiterJobs.jsx'));
const RecruiterTalentMatch = lazy(() => import('./pages/recruiter/RecruiterTalentMatch.jsx'));
const RecruiterPipeline = lazy(() => import('./pages/recruiter/RecruiterPipeline.jsx'));
const RecruiterCandidates = lazy(() => import('./pages/recruiter/RecruiterCandidates.jsx'));
const RecruiterAssessments = lazy(() => import('./pages/recruiter/RecruiterAssessments.jsx'));
const RecruiterSmartMatch  = lazy(() => import('./pages/recruiter/RecruiterSmartMatch.jsx'));
const RecruiterMyPerformance = lazy(() => import('./pages/recruiter/RecruiterMyPerformance.jsx'));

const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs.jsx'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics.jsx'));
const CollegeOverview = lazy(() => import('./pages/college/CollegeOverview.jsx'));
const CollegeStudents = lazy(() => import('./pages/college/CollegeStudents.jsx'));
const CollegePlacements = lazy(() => import('./pages/college/CollegePlacements.jsx'));
const CollegeAddCandidates = lazy(() => import('./pages/college/CollegeAddCandidates.jsx'));
const CollegeDrives = lazy(() => import('./pages/college/CollegeDrives.jsx'));
const CollegeDriveCreate = lazy(() => import('./pages/college/CollegeDriveCreate.jsx'));
const CollegeDriveDetail = lazy(() => import('./pages/college/CollegeDriveDetail.jsx'));
const CollegeTrainingResources = lazy(() => import('./pages/college/CollegeTrainingResources.jsx'));
const CollegeSkillGaps = lazy(() => import('./pages/college/CollegeSkillGaps.jsx'));
const CompanyCollegeDrives = lazy(() => import('./pages/recruiter/CompanyCollegeDrives.jsx'));
const CompanyDriveDetail = lazy(() => import('./pages/recruiter/CompanyDriveDetail.jsx'));
const AdminInsights      = lazy(() => import('./pages/admin/AdminInsights.jsx'));
const AdminInterviewKits = lazy(() => import('./pages/admin/AdminInterviewKits.jsx'));
const AdminWebhooks      = lazy(() => import('./pages/admin/AdminWebhooks.jsx'));
const DiversityReport    = lazy(() => import('./pages/admin/DiversityReport.jsx'));
const AdminReviews       = lazy(() => import('./pages/admin/AdminReviews.jsx'));
const AdminReferrals     = lazy(() => import('./pages/admin/AdminReferrals.jsx'));
const AdminTalentPool    = lazy(() => import('./pages/admin/TalentPool.jsx'));
const OrgSettings = lazy(() => import('./pages/admin/OrgSettings.jsx'));
const AdminJobApproval = lazy(() => import('./pages/admin/AdminJobApproval.jsx'));
const OutreachTracker = lazy(() => import('./pages/admin/OutreachTracker.jsx'));
const ContactLeads = lazy(() => import('./pages/admin/ContactLeads.jsx'));
// EmailLogsPage merged into OutreachTracker (tab 2)

const BillingPage = lazy(() => import('./pages/billing/BillingPage.jsx'));
const SuperAdminOrgs = lazy(() => import('./pages/superadmin/SuperAdminOrgs.jsx'));
const SuperAdminPlatform = lazy(() => import('./pages/superadmin/SuperAdminPlatform.jsx'));
const SuperAdminPermissions = lazy(() => import('./pages/superadmin/SuperAdminPermissions.jsx'));
const SuperAdminSecurity = lazy(() => import('./pages/superadmin/SuperAdminSecurity.jsx'));
const SuperAdminCandidateImport = lazy(() => import('./pages/superadmin/SuperAdminCandidateImport.jsx'));
const SuperAdminPlaybooks = lazy(() => import('./pages/superadmin/SuperAdminPlaybooks.jsx'));
const SuperAdminCandidateRequests = lazy(() => import('./pages/superadmin/SuperAdminCandidateRequests.jsx'));
const SuperAdminAuditLogs = lazy(() => import('./pages/superadmin/SuperAdminAuditLogs.jsx'));
const SuperAdminBlogs     = lazy(() => import('./pages/superadmin/SuperAdminBlogs.jsx'));
const SuperAdminBgvTracker = lazy(() => import('./pages/superadmin/SuperAdminBgvTracker.jsx'));
const SuperAdminPlatformReferrals = lazy(() => import('./pages/superadmin/SuperAdminPlatformReferrals.jsx'));
const SuperAdminCollegeGroups = lazy(() => import('./pages/superadmin/SuperAdminCollegeGroups.jsx'));
const SuperAdminCompanyGroups = lazy(() => import('./pages/superadmin/SuperAdminCompanyGroups.jsx'));
const SuperAdminCustomizations = lazy(() => import('./pages/superadmin/SuperAdminCustomizations.jsx'));
const SuperAdminCandidates = lazy(() => import('./pages/superadmin/SuperAdminCandidates.jsx'));
const SuperAdminUnregisteredCandidates = lazy(() => import('./pages/superadmin/SuperAdminUnregisteredCandidates.jsx'));
const SuperAdminCommandCenter = lazy(() => import('./pages/superadmin/SuperAdminCommandCenter.jsx'));
const SuperAdminReportedPosts = lazy(() => import('./pages/superadmin/SuperAdminReportedPosts.jsx'));
const CompanyReviewsPage      = lazy(() => import('./pages/shared/CompanyReviewsPage.jsx'));

const AdminPipeline = lazy(() => import('./pages/admin/AdminPipeline.jsx'));
const AdminCandidateRequest = lazy(() => import('./pages/admin/AdminCandidateRequest.jsx'));
const AdminClients = lazy(() => import('./pages/admin/AdminClients.jsx'));
const AdminAutomation = lazy(() => import('./pages/admin/AdminAutomation.jsx'));
const AdminOnboarding       = lazy(() => import('./pages/admin/AdminOnboarding.jsx'));
const OnboardingTemplates   = lazy(() => import('./pages/admin/OnboardingTemplates.jsx'));
const AdminNPS              = lazy(() => import('./pages/admin/AdminNPS.jsx'));
const EmailSequences        = lazy(() => import('./pages/admin/EmailSequences.jsx'));
const PipelineHeatmap       = lazy(() => import('./pages/admin/PipelineHeatmap.jsx'));
const InterviewScorecards   = lazy(() => import('./pages/admin/InterviewScorecards.jsx'));
const TimeToFillTracker     = lazy(() => import('./pages/admin/TimeToFillTracker.jsx'));
const DuplicateMerge        = lazy(() => import('./pages/admin/DuplicateMerge.jsx'));
const SourcingTracker       = lazy(() => import('./pages/admin/SourcingTracker.jsx'));
const RejectionTemplates    = lazy(() => import('./pages/admin/RejectionTemplates.jsx'));
const OfferLetterBuilder    = lazy(() => import('./pages/admin/OfferLetterBuilder.jsx'));
const DashboardWidgets      = lazy(() => import('./pages/admin/DashboardWidgets.jsx'));
const HeadcountPlanner      = lazy(() => import('./pages/admin/HeadcountPlanner.jsx'));
const SlaAlerts             = lazy(() => import('./pages/admin/SlaAlerts.jsx'));
const CustomHiringStages    = lazy(() => import('./pages/admin/CustomHiringStages.jsx'));
const AdminCustomFields = lazy(() => import('./pages/admin/AdminCustomFields.jsx'));
const OrgChart          = lazy(() => import('./pages/admin/OrgChart.jsx'));
const CandidateOnboarding = lazy(() => import('./pages/candidate/CandidateOnboarding.jsx'));
const CandidateJobAlerts = lazy(() => import('./pages/candidate/CandidateJobAlerts.jsx'));
const CandidateOpportunities = lazy(() => import('./pages/candidate/CandidateOpportunities.jsx'));

const RecruiterInterviews = lazy(() => import('./pages/recruiter/RecruiterInterviews.jsx'));
const RecruiterOffers = lazy(() => import('./pages/recruiter/RecruiterOffers.jsx'));
const TalentPool = lazy(() => import('./pages/recruiter/TalentPool.jsx'));

const CandidateOffer      = lazy(() => import('./pages/candidate/CandidateOffer.jsx'));
const OfferComparison     = lazy(() => import('./pages/candidate/OfferComparison.jsx'));

const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard.jsx'));
const HiringManagerDashboard = lazy(() => import('./pages/hiring_manager/HiringManagerDashboard.jsx'));
const MyTeam = lazy(() => import('./pages/hiring_manager/MyTeam.jsx'));
const ClientShortlists = lazy(() => import('./pages/client/ClientShortlists.jsx'));
const ClientInterviews = lazy(() => import('./pages/client/ClientInterviews.jsx'));
const ClientPlacements = lazy(() => import('./pages/client/ClientPlacements.jsx'));
const ClientRequirements = lazy(() => import('./pages/client/ClientRequirements.jsx'));
const JobRequirements = lazy(() => import('./pages/admin/JobRequirements.jsx'));

const InterestConfirmedPage = lazy(() => import('./pages/public/InterestConfirmedPage.jsx'));
const InterestDeclinedPage = lazy(() => import('./pages/public/InterestDeclinedPage.jsx'));

const AddCandidateForm = lazy(() => import('./components/shared/AddCandidateForm.jsx'));
const AssignedCandidates = lazy(() => import('./pages/shared/AssignedCandidates.jsx'));
const ApplicantsRecordsPage = lazy(() => import('./pages/shared/ApplicantsRecordsPage.jsx'));
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage.jsx'));
const CreateJobPage = lazy(() => import('./pages/shared/CreateJobPage.jsx'));
const FormsHub = lazy(() => import('./pages/shared/FormsHub.jsx'));
const InviteCandidatePage = lazy(() => import('./pages/shared/InviteCandidatePage.jsx'));
const CreateOrganisationPage = lazy(() => import('./pages/superadmin/CreateOrganisationPage.jsx'));
const ProvisionUserPage = lazy(() => import('./pages/shared/ProvisionUserPage.jsx'));
const GenerateOfferPage = lazy(() => import('./pages/recruiter/GenerateOfferPage.jsx'));
const ScheduleInterviewPage = lazy(() => import('./pages/recruiter/ScheduleInterviewPage.jsx'));
const CandidateRejectionPage = lazy(() => import('./pages/recruiter/CandidateRejectionPage.jsx'));
const SecuritySettingsPage = lazy(() => import('./pages/shared/SecuritySettingsPage.jsx'));
const EmailSettingsPage = lazy(() => import('./pages/shared/EmailSettingsPage.jsx'));
const ChangePasswordPage = lazy(() => import('./pages/shared/ChangePasswordPage.jsx'));
const ResumeViewPage = lazy(() => import('./pages/shared/ResumeViewPage.jsx'));
const PlatformModalsGuide = lazy(() => import('./pages/shared/PlatformModalsGuide.jsx'));
const CommunityFeed        = lazy(() => import('./pages/shared/CommunityFeed.jsx'));
const PeoplePage           = lazy(() => import('./pages/shared/PeoplePage.jsx'));
const CommunitiesPage      = lazy(() => import('./pages/shared/CommunitiesPage.jsx'));
const CommunityDetailPage  = lazy(() => import('./pages/shared/CommunityDetailPage.jsx'));
const PostPublicPage       = lazy(() => import('./pages/public/PostPublicPage.jsx'));
const CommunityPreviewPage = lazy(() => import('./pages/marketing/CommunityPreviewPage.jsx'));
const UserPublicProfilePage = lazy(() => import('./pages/shared/UserPublicProfilePage.jsx'));
// ── Page loading fallback ──────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ padding: 24, animation: 'tn-fadein 0.2s ease both' }}>
      {/* KPI row skeleton */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="tn-skeleton" style={{ flex: 1, height: 80, borderRadius: 12 }} />
        ))}
      </div>
      {/* Two column skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="tn-skeleton" style={{ height: 220, borderRadius: 12 }} />
        <div className="tn-skeleton" style={{ height: 220, borderRadius: 12 }} />
      </div>
      {/* Table skeleton */}
      <div className="tn-skeleton" style={{ height: 180, borderRadius: 12 }} />
    </div>
  );
}

// ── Error Boundary ─────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null, errorInfo: null, reloading: false }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(err, info) {
    this.setState({ errorInfo: info });
    console.error('Portal error:', err, info);
    // Auto-reload on chunk load failures (stale cache after deployment)
    const msg = err?.message || '';
    if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Loading chunk') || msg.includes('Importing a module script failed')) {
      this.setState({ reloading: true });
      window.location.reload();
    }
  }
  render() {
    if (this.state.reloading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 32 }}>
          <span style={{ fontSize: 40 }}>🔄</span>
          <h2 style={{ color: '#06b6d4', fontWeight: 700, margin: 0 }}>Updating…</h2>
          <p style={{ color: '#706E6B', fontSize: 13, margin: 0 }}>New version detected. Reloading…</p>
        </div>
      );
    }
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 32 }}>
          <span style={{ fontSize: 40 }}>⚠️</span>
          <h2 style={{ color: '#fca5a5', fontWeight: 700, margin: 0 }}>Something went wrong</h2>
          <p style={{ color: '#706E6B', fontSize: 13, margin: 0, textAlign: 'center', maxWidth: 400 }}>{this.state.error.message}</p>
          {import.meta?.env?.DEV && (
            <pre style={{ color: '#ef4444', fontSize: 10, background: '#1a1a2e', padding: 12, borderRadius: 8, maxWidth: 600, overflowX: 'auto', textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.error?.stack}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 12, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Waking up notice (shown after 4s of loading — Render cold start) ──────────
function WakingUp() {
  const [show, setShow] = useState(false);
  useEffect(() => { 
    const t = setTimeout(() => setShow(true), 4000); 
    return () => clearTimeout(t); 
  }, []);
  
  if (!show) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(1,118,211,0.05)', padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(1,118,211,0.1)', animation: 'tn-fadein 0.5s ease' }}>
      <div className="tn-spinner-small" style={{ width: 14, height: 14, border: '2px solid rgba(1,118,211,0.2)', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 600, margin: 0, letterSpacing: '0.3px' }}>
        OPTIMIZING CONNECTION… (Waking up server)
      </p>
    </div>
  );
}

// ── Auth helpers ───────────────────────────────────────────────────────────────

const Layout = lazy(() => import('./layout/Layout.jsx'));
const AssessmentReviewPage = lazy(() => import('./pages/recruiter/AssessmentReviewPage.jsx'));

const APP_PRELOADERS = {
  shared: [
    () => import('./layout/Layout.jsx'),
    () => import('./pages/shared/ProfilePage.jsx'),
    () => import('./components/shared/AddCandidateForm.jsx'),
    () => import('./pages/shared/FormsHub.jsx'),
  ],
  candidate: [
    () => import('./pages/candidate/CandidateDashboard.jsx'),
    () => import('./pages/candidate/CandidateSmartMatch.jsx'),
    () => import('./pages/candidate/CandidateApplications.jsx'),
    () => import('./pages/candidate/CandidateProfile.jsx'),
  ],
  recruiter: [
    () => import('./pages/recruiter/RecruiterDashboard.jsx'),
    () => import('./pages/recruiter/RecruiterJobs.jsx'),
    () => import('./pages/recruiter/RecruiterCandidates.jsx'),
    () => import('./pages/recruiter/RecruiterPipeline.jsx'),
    () => import('./pages/recruiter/RecruiterAssessments.jsx'),
  ],
  admin: [
    () => import('./pages/admin/AdminAnalytics.jsx'),
    () => import('./pages/admin/AdminJobs.jsx'),
    () => import('./pages/admin/AdminUsers.jsx'),
    () => import('./pages/admin/OrgSettings.jsx'),
  ],
  super_admin: [
    () => import('./pages/admin/AdminAnalytics.jsx'),
    () => import('./pages/admin/AdminJobs.jsx'),
    () => import('./pages/admin/AdminUsers.jsx'),
    () => import('./pages/superadmin/SuperAdminPlatform.jsx'),
    () => import('./pages/superadmin/SuperAdminOrgs.jsx'),
  ],
  client: [
    () => import('./pages/client/ClientDashboard.jsx'),
    () => import('./pages/client/ClientShortlists.jsx'),
    () => import('./pages/client/ClientInterviews.jsx'),
  ],
  hiring_manager: [
    () => import('./pages/hiring_manager/HiringManagerDashboard.jsx'),
  ],
};

function preloadAppChunks(role) {
  const loaders = [...(APP_PRELOADERS.shared || []), ...(APP_PRELOADERS[role] || [])];
  loaders.forEach(load => {
    Promise.resolve()
      .then(() => load())
      .catch(() => {});
  });
}

function scheduleAppPreload(role) {
  if (!role) return () => {};
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const id = window.requestIdleCallback(() => preloadAppChunks(role), { timeout: 1200 });
    return () => window.cancelIdleCallback?.(id);
  }
  const timeout = window.setTimeout(() => preloadAppChunks(role), 250);
  return () => window.clearTimeout(timeout);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Public routes that must render immediately without waiting for auth
  const isPublicRoute = !location.pathname.startsWith('/app') && location.pathname !== '/login';

  // Push notification subscription (fires 30s after login, production only)
  usePushNotifications({
    isLoggedIn: !!user,
    apiBaseUrl: API_BASE_URL,
    getToken: () => api.getToken(),
  });

  useEffect(() => {
    set401Handler(() => {
      setUser(null);
      clearToken();
      sessionStorage.removeItem('tn_user');
      sessionStorage.removeItem('tn_impersonate_token');
      sessionStorage.removeItem('tn_sa_backup');
      navigate('/login', { replace: true });
    });

    // If an impersonation session is active, restore it directly.
    // IMPORTANT: set the token BEFORE setUser() to avoid 401s on first render.
    const impersonateToken = sessionStorage.getItem('tn_impersonate_token');
    const saBackup = sessionStorage.getItem('tn_sa_backup');
    
    // Only restore impersonation if we have both the token and the backup, 
    // AND the token hasn't obviously expired yet.
    if (impersonateToken && saBackup && tokenIsValid(impersonateToken)) {
      try {
        const storedUser = sessionStorage.getItem('tn_user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          setApiToken(impersonateToken); // synchronous — must happen before setUser
          setUser(u);
          window.dispatchEvent(new CustomEvent('tn_auth_ready', { detail: { user: u } }));
          setAuthLoading(false);
          return;
        }
      } catch (e) {
        sessionStorage.removeItem('tn_impersonate_token');
        sessionStorage.removeItem('tn_sa_backup');
      }
    }

    // Silent session restore via HTTP-only refresh cookie
    import('./api/api.js').then(({ initAuth }) => {
      initAuth().then(result => {
        if (result?.user) {
          // Happy path: refresh token exchanged for fresh access token
          const uJson = JSON.stringify(result.user);
          sessionStorage.setItem('tn_user', uJson);
          localStorage.setItem('tn_user', uJson); // persist across browser-reopen
          setUser(result.user);
          window.dispatchEvent(new CustomEvent('tn_auth_ready', { detail: { user: result.user } }));
        } else if (result?.networkError) {
          // Backend unreachable (Render cold-start, offline) — keep the cached
          // session so the user doesn't get bounced to /login.  The next API
          // call will retry and either succeed (token refreshed) or 401-logout.
          const stored = sessionStorage.getItem('tn_user');
          let restoredUser = null;
          if (stored) {
            try { restoredUser = JSON.parse(stored); setUser(restoredUser); } catch {}
          }
          window.dispatchEvent(new CustomEvent('tn_auth_ready', { detail: { user: restoredUser } }));
        } else {
          // null = refresh token absent/expired — legitimate session end
          window.dispatchEvent(new CustomEvent('tn_auth_ready', { detail: { user: null } }));
        }
      }).catch(() => {
        // Unexpected JS error — fall back to sessionStorage
        const stored = sessionStorage.getItem('tn_user');
        let restoredUser = null;
        if (stored) { try { restoredUser = JSON.parse(stored); setUser(restoredUser); } catch {} }
        window.dispatchEvent(new CustomEvent('tn_auth_ready', { detail: { user: restoredUser } }));
      }).finally(() => setAuthLoading(false));
    }).catch(() => setAuthLoading(false));

    // Global navigation listener (legacy: window.dispatchEvent(new CustomEvent('tn_nav', {detail:'pipeline'})))
    const navHandler = (e) => { if (e.detail) navigate(`/app/${e.detail}`, { replace: false }); };
    window.addEventListener('tn_nav', navHandler);

    // Cross-tab role sync: if admin updates a user's role in another tab,
    // the 'storage' event fires here with the updated tn_user value.
    const storageHandler = (e) => {
      if (e.key === 'tn_user') {
        try {
          const updated = e.newValue ? JSON.parse(e.newValue) : null;
          if (updated) setUser(updated);
        } catch {}
      }
    };
    window.addEventListener('storage', storageHandler);

    // Expose imperative updater so any component can push a fresh user object
    // after a self-profile update (e.g. role change accepted in same tab).
    window.tn_refreshUser = (u) => { sessionStorage.setItem('tn_user', JSON.stringify(u)); setUser(u); };

    return () => {
      window.removeEventListener('tn_nav', navHandler);
      window.removeEventListener('storage', storageHandler);
      delete window.tn_refreshUser;
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => scheduleAppPreload(user?.role), [user?.role]);

  // Capture platform referral code from URL on first visit (stored until user registers)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('platformRef');
    if (ref && !user) localStorage.setItem('tn_platform_ref', ref);
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // After a new user registers and logs in, credit their referrer
  useEffect(() => {
    if (!user) return;
    const ref = localStorage.getItem('tn_platform_ref');
    if (!ref) return;
    localStorage.removeItem('tn_platform_ref');
    import('./api/api.js').then(({ default: api }) => {
      api.creditPlatformReferral({ referralCode: ref }).catch(() => {});
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Capture candidate login location once per session (non-blocking)
  // Super admin can see lastLoginLocation on user records
  useEffect(() => {
    if (!user || user.role !== 'candidate') return;
    const sessionKey = 'tn_loc_sent';
    if (sessionStorage.getItem(sessionKey)) return; // already sent this session
    sessionStorage.setItem(sessionKey, '1');

    import('./utils/geolocation.js').then(({ requestGeolocation }) => {
      requestGeolocation().then(geo => {
        if (!geo) return;
        import('./api/api.js').then(({ default: api }) => {
          api.updateMyLoginLocation(geo).catch(() => {});
        });
      }).catch(() => {});
    }).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Heartbeat loop for presence API
  useEffect(() => {
    if (!user) return;
    const heartbeat = () => {
      import('./api/api.js').then(({ default: api }) => {
        if (api.sendHeartbeat) api.sendHeartbeat().catch(() => {});
      });
    };
    heartbeat(); // initial call
    const interval = setInterval(heartbeat, 60000); // every 1 min
    return () => clearInterval(interval);
  }, [user]);

  // Show clean loader while silent refresh is in-flight — but never block public marketing pages
  if (authLoading && !isPublicRoute) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #E2E8F0', borderTop: '3px solid #0176D3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#706E6B', fontSize: 13, margin: '0 0 6px' }}>Loading TalentNest…</p>
          <WakingUp />
        </div>
      </div>
    );
  }

  const ROLE_DEFAULT = { super_admin: 'analytics', admin: 'analytics', recruiter: 'dashboard', candidate: 'dashboard', client: 'dashboard', hiring_manager: 'dashboard', placement_officer: 'dashboard' };

  const auth = (u, token) => {
    const uJson = JSON.stringify(u);
    sessionStorage.setItem('tn_user', uJson);
    localStorage.setItem('tn_user', uJson); // survives browser close/reopen
    // Persist access token so page refresh doesn't log the user out
    if (token) setApiToken(token);
    setUser(u);
    // Pending assessment deep-link (from invite email)
    const pendingJobId = sessionStorage.getItem('tn_pending_assessment_job');
    // Post-login redirect (e.g. from community share link /c/:slug)
    const postLoginRedirect = sessionStorage.getItem('tn_post_login_redirect');
    if (pendingJobId && u.role === 'candidate') {
      sessionStorage.removeItem('tn_pending_assessment_job');
      import('./api/api.js').then(({ api: apiModule }) => {
        apiModule.getAssessmentForJob(pendingJobId).then(assessment => {
          navigate(assessment?.id ? `/app/assessment/${assessment.id}` : '/app/dashboard', { replace: true });
        }).catch(() => navigate('/app/dashboard', { replace: true }));
      }).catch(() => navigate('/app/dashboard', { replace: true }));
    } else if (postLoginRedirect) {
      sessionStorage.removeItem('tn_post_login_redirect');
      navigate(postLoginRedirect, { replace: true });
    } else {
      navigate(`/app/${ROLE_DEFAULT[u.role] || 'dashboard'}`, { replace: true });
    }
  };

  const logout = () => {
    sessionStorage.removeItem('tn_user');
    sessionStorage.removeItem('tn_token');
    sessionStorage.removeItem('tn_impersonate_token');
    sessionStorage.removeItem('tn_sa_backup');
    localStorage.removeItem('tn_user');
    localStorage.removeItem('tn_token');
    localStorage.removeItem('tn_logged_in');
    setUser(null);
    api.logout().catch(() => {});   // clears HTTP-only refresh cookie on server
    navigate('/login', { replace: true });
  };

  const rk = user ? (user.role === 'super_admin' ? 'superadmin' : (user.role === 'placement_officer' && user.tenantType === 'college' ? 'admin' : user.role)) : null;
  const isCollege = user?.tenantType === 'college';

  const authRedirect = user ? <Navigate to="/app" replace /> : <Suspense fallback={<PageLoader />}><AuthScreen onAuth={auth} /></Suspense>;

  return (
    <ErrorBoundary>
    <Routes>
      {/* ── Marketing pages ── */}
      <Route path="/" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />
      <Route path="/about" element={<Suspense fallback={<PageLoader />}><AboutPage /></Suspense>} />
      <Route path="/services" element={<Suspense fallback={<PageLoader />}><ServicesPage /></Suspense>} />
      <Route path="/services/:slug" element={<Suspense fallback={<PageLoader />}><ServiceDetailPage /></Suspense>} />
      <Route path="/contact" element={<Suspense fallback={<PageLoader />}><ContactPage /></Suspense>} />
      <Route path="/hrms" element={<Suspense fallback={<PageLoader />}><HRMSPage /></Suspense>} />
      <Route path="/products"              element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
      <Route path="/products/hireboard"   element={<Suspense fallback={<PageLoader />}><ProductHireBoard /></Suspense>} />
      <Route path="/products/recruit-os"  element={<Navigate to="/products/hireboard" replace />} />
      <Route path="/products/peopledesk"  element={<Suspense fallback={<PageLoader />}><ProductPeopleDesk /></Suspense>} />
      <Route path="/products/people-os"   element={<Navigate to="/products/peopledesk" replace />} />
      <Route path="/products/jobtrack"    element={<Suspense fallback={<PageLoader />}><ProductJobTrack /></Suspense>} />
      <Route path="/products/career-os"   element={<Navigate to="/products/jobtrack" replace />} />
      <Route path="/products/campushub"   element={<Suspense fallback={<PageLoader />}><ProductCampusHub /></Suspense>} />
      <Route path="/blog" element={<Suspense fallback={<PageLoader />}><BlogPage /></Suspense>} />
      <Route path="/blog/:slug" element={<Suspense fallback={<PageLoader />}><BlogPostPage /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPage /></Suspense>} />
      <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsPage /></Suspense>} />
      <Route path="/c/:slug" element={<Suspense fallback={<PageLoader />}><CommunityPreviewPage /></Suspense>} />

      {/* ── Public job board + Companies ── */}
      <Route path="/meeting/:roomToken" element={<Suspense fallback={<PageLoader />}><MeetingRoom /></Suspense>} />
      <Route path="/careers" element={<Suspense fallback={<PageLoader />}><CareersPage /></Suspense>} />
      {/* Individual job detail — canonical URL for Google for Jobs / NaukriBot */}
      <Route path="/careers/job/:slug" element={<Suspense fallback={<PageLoader />}><JobDetailPage /></Suspense>} />
      <Route path="/careers/:companySlug" element={<Suspense fallback={<PageLoader />}><CareersPage /></Suspense>} />
      <Route path="/companies" element={<Suspense fallback={<PageLoader />}><CompaniesPage /></Suspense>} />
      <Route path="/track/:token"    element={<Suspense fallback={<PageLoader />}><ApplicationTracker /></Suspense>} />
      <Route path="/nps/:token"      element={<Suspense fallback={<PageLoader />}><NpsSurveyPage /></Suspense>} />
      <Route path="/invite/:token"   element={<Suspense fallback={<PageLoader />}><InviteResponsePage /></Suspense>} />
      <Route path="/schedule/:token"           element={<Suspense fallback={<PageLoader />}><SchedulingPage /></Suspense>} />
      <Route path="/app/offer-approval/:offerId" element={<Suspense fallback={<PageLoader />}><OfferApprovalPage /></Suspense>} />
      <Route path="/interest/confirmed" element={<Suspense fallback={<PageLoader />}><InterestConfirmedPage /></Suspense>} />
      <Route path="/interest/declined" element={<Suspense fallback={<PageLoader />}><InterestDeclinedPage /></Suspense>} />
      <Route path="/nps-thankyou" element={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F2F2', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{new URLSearchParams(window.location.search).get('status') === 'success' ? '🌟' : '⚠️'}</div>
            <h2 style={{ color: '#032D60', margin: '0 0 12px', fontWeight: 800 }}>{new URLSearchParams(window.location.search).get('status') === 'success' ? 'Thank you for your feedback!' : 'Invalid or expired link'}</h2>
            <p style={{ color: '#706E6B', fontSize: 14 }}>{new URLSearchParams(window.location.search).get('status') === 'success' ? 'Your response has been recorded. We appreciate you taking the time to share your experience.' : 'This survey link is no longer valid.'}</p>
          </div>
        </div>
      } />

      {/* ── HR Portal ── */}
      <Route path="/login" element={authRedirect} />
      <Route path="/auth"  element={authRedirect} />
      <Route path="/set-password" element={<Suspense fallback={<PageLoader />}><SetPasswordPage /></Suspense>} />

      <Route path="/app" element={
        user ? (
          <Suspense fallback={<PageLoader />}>
            <Layout user={user} onLogout={logout} />
          </Suspense>
        ) : (
          <Navigate to="/login" replace />
        )
      }>
        {/* Default redirect based on role */}
        <Route index element={<Navigate to={
          user?.role === 'super_admin' ? 'analytics' :
            (user?.role === 'admin' || (user?.role === 'placement_officer' && user?.tenantType === 'college')) ? 'analytics' : 'dashboard'
        } replace />} />

        {/* Public user profile — view any user's full profile */}
        <Route path="profile/:userId" element={<Suspense fallback={<PageLoader />}><UserPublicProfilePage user={user} /></Suspense>} />

        {/* Shared / General Routes — profile is role-aware */}
        <Route path="profile" element={
          rk === 'candidate'
            ? <CandidateProfile user={user} />
            : <ProfilePage user={user} onUserUpdate={(u) => { sessionStorage.setItem('tn_user', JSON.stringify(u)); setUser(u); }} />
        } />
        <Route path="forms" element={<FormsHub user={user} />} />
        <Route path="settings/password" element={<ChangePasswordPage user={user} onBack={() => window.history.back()} />} />
        <Route path="settings/email" element={<EmailSettingsPage user={user} onBack={() => window.history.back()} />} />
        <Route path="settings/security" element={<SecuritySettingsPage user={user} onBack={() => window.history.back()} />} />
        <Route path="settings/notifications" element={<Suspense fallback={<PageLoader />}><CandidateNotificationSettings /></Suspense>} />
        <Route path="add-candidate" element={<Suspense fallback={<PageLoader />}><AddCandidateForm addedBy={user} onSuccess={() => { window.dispatchEvent(new CustomEvent('tn_nav', { detail: 'candidates' })); }} /></Suspense>} />
        {/* Resume full-page view — accessible by all logged-in roles */}
        <Route path="resume/:candidateId" element={<Suspense fallback={<PageLoader />}><ResumeViewPage user={user} /></Suspense>} />

        {/* Candidate Routes */}
        {rk === 'candidate' && (
          <>
            <Route path="dashboard" element={<CandidateDashboard user={user} />} />
            <Route path="smart-match" element={<CandidateSmartMatch user={user} />} />
            <Route path="refer-earn" element={<CandidateReferEarn user={user} />} />
            <Route path="career-journey" element={<CandidateCareerJourney user={user} />} />
            <Route path="applications" element={<CandidateApplications user={user} />} />
            <Route path="interviews" element={<Suspense fallback={<PageLoader />}><CandidateInterviews user={user} /></Suspense>} />
            <Route path="assessment/:assessmentId" element={<CandidateAssessment user={user} onBack={() => window.history.back()} />} />
            <Route path="job-alerts" element={<CandidateJobAlerts />} />
            <Route path="opportunities" element={<Suspense fallback={<PageLoader />}><CandidateOpportunities /></Suspense>} />
            <Route path="onboarding" element={<CandidateOnboarding user={user} />} />
            <Route path="background-verification" element={<CandidateBackgroundVerification user={user} />} />
            <Route path="offer/:offerId" element={<CandidateOffer user={user} />} />
            <Route path="offer-comparison" element={<OfferComparison user={user} />} />
            <Route path="feed" element={<Suspense fallback={<PageLoader />}><CommunityFeed user={user} /></Suspense>} />
            <Route path="people" element={<Suspense fallback={<PageLoader />}><PeoplePage user={user} /></Suspense>} />
            <Route path="communities" element={<Suspense fallback={<PageLoader />}><CommunitiesPage user={user} /></Suspense>} />
            <Route path="communities/:slug" element={<Suspense fallback={<PageLoader />}><CommunityDetailPage user={user} /></Suspense>} />
            <Route path="company-reviews" element={<Suspense fallback={<PageLoader />}><CompanyReviewsPage user={user} /></Suspense>} />
          </>
        )}

        {/* Recruiter / Admin / SuperAdmin Shared Routes */}
        {(rk === 'recruiter' || rk === 'admin' || rk === 'superadmin') && (
          <>
            {rk === 'recruiter' && <Route path="dashboard" element={<RecruiterDashboard user={user} />} />}
            <Route path="jobs" element={rk === 'recruiter' ? <RecruiterJobs user={user} /> : <AdminJobs user={user} />} />
            <Route path="jobs/create" element={<CreateJobPage user={user} onBack={() => window.history.back()} onSuccess={() => window.history.back()} />} />
            <Route path="candidates" element={rk === 'recruiter' ? <RecruiterCandidates user={user} /> : isCollege ? <Suspense fallback={<PageLoader />}><CollegeStudents user={user} /></Suspense> : <AdminUsers filterRole="candidate" isSuperAdmin={rk === 'superadmin'} user={user} />} />
            <Route path="applicants" element={isCollege ? <Suspense fallback={<PageLoader />}><CollegePlacements user={user} /></Suspense> : <ApplicantsRecordsPage user={user} />} />
            {isCollege && <Route path="add-candidates" element={<Suspense fallback={<PageLoader />}><CollegeAddCandidates user={user} /></Suspense>} />}
            {isCollege && <Route path="drives" element={<Suspense fallback={<PageLoader />}><CollegeDrives user={user} /></Suspense>} />}
            {isCollege && <Route path="drives/new" element={<Suspense fallback={<PageLoader />}><CollegeDriveCreate user={user} /></Suspense>} />}
            {isCollege && <Route path="drives/:driveId" element={<Suspense fallback={<PageLoader />}><CollegeDriveDetail user={user} /></Suspense>} />}
            {isCollege && <Route path="training-resources" element={<Suspense fallback={<PageLoader />}><CollegeTrainingResources user={user} /></Suspense>} />}
            {isCollege && <Route path="skill-gaps" element={<Suspense fallback={<PageLoader />}><CollegeSkillGaps user={user} /></Suspense>} />}
            {!isCollege && (rk === 'recruiter' || rk === 'admin') && <Route path="college-drives" element={<Suspense fallback={<PageLoader />}><CompanyCollegeDrives user={user} /></Suspense>} />}
            {!isCollege && (rk === 'recruiter' || rk === 'admin') && <Route path="college-drives/:driveId" element={<Suspense fallback={<PageLoader />}><CompanyDriveDetail user={user} /></Suspense>} />}
            <Route path="assigned-candidates" element={<AssignedCandidates user={user} />} />
            <Route path="review/:assessmentId/:submissionId" element={<AssessmentReviewPage user={user} />} />
            <Route path="talent-match" element={<RecruiterTalentMatch user={user} />} />
            {rk === 'recruiter' && <Route path="smart-match" element={<RecruiterSmartMatch user={user} />} />}
            <Route path="pipeline" element={rk === 'recruiter' ? <RecruiterPipeline user={user} /> : <AdminPipeline user={user} />} />
            <Route path="assessments" element={<RecruiterAssessments user={user} />} />
            <Route path="interviews" element={<RecruiterInterviews user={user} />} />
            <Route path="offers" element={<RecruiterOffers user={user} />} />
            {rk === 'recruiter' && <Route path="my-performance" element={<RecruiterMyPerformance user={user} />} />}
            {rk === 'recruiter' && <Route path="talent-pool" element={<TalentPool user={user} />} />}
            <Route path="onboarding" element={<AdminOnboarding user={user} />} />
            <Route path="onboarding-templates" element={<OnboardingTemplates />} />
            <Route path="nps-dashboard" element={<AdminNPS />} />
            <Route path="email-sequences" element={<EmailSequences />} />
            <Route path="pipeline-heatmap" element={<PipelineHeatmap />} />
            <Route path="interview-scorecards" element={<InterviewScorecards />} />
            <Route path="time-to-fill" element={<TimeToFillTracker />} />
            <Route path="duplicate-merge" element={<DuplicateMerge />} />
            <Route path="sourcing-tracker" element={<SourcingTracker />} />
            <Route path="rejection-templates" element={<RejectionTemplates />} />
            <Route path="offer-letter-builder" element={<OfferLetterBuilder />} />
            <Route path="dashboard-widgets" element={<DashboardWidgets />} />
            <Route path="headcount-planner" element={<HeadcountPlanner />} />
            <Route path="sla-alerts" element={<SlaAlerts />} />
            <Route path="custom-stages" element={<CustomHiringStages />} />
            <Route path="outreach" element={<OutreachTracker />} />
            <Route path="email-logs" element={<OutreachTracker />} />
            {/* Recruiter can submit candidate requests (same component as admin) */}
            {rk === 'recruiter' && <Route path="candidate-requests" element={<AdminCandidateRequest user={user} />} />}

            {/* Form-specific routes */}
            <Route path="forms/invite" element={<InviteCandidatePage user={user} onBack={() => window.history.back()} />} />
            <Route path="forms/interview" element={<ScheduleInterviewPage user={user} onBack={() => window.history.back()} onDone={() => window.history.back()} />} />
            <Route path="forms/offer" element={<GenerateOfferPage user={user} onBack={() => window.history.back()} onSuccess={() => window.history.back()} />} />
            <Route path="forms/reject" element={<CandidateRejectionPage user={user} onBack={() => window.history.back()} onDone={() => window.history.back()} />} />
            <Route path="feed" element={<Suspense fallback={<PageLoader />}><CommunityFeed user={user} /></Suspense>} />
            <Route path="people" element={<Suspense fallback={<PageLoader />}><PeoplePage user={user} /></Suspense>} />
            <Route path="communities" element={<Suspense fallback={<PageLoader />}><CommunitiesPage user={user} /></Suspense>} />
            <Route path="communities/:slug" element={<Suspense fallback={<PageLoader />}><CommunityDetailPage user={user} /></Suspense>} />
            <Route path="company-reviews" element={<Suspense fallback={<PageLoader />}><CompanyReviewsPage user={user} /></Suspense>} />
            <Route path="job-requirements" element={<JobRequirements user={user} />} />
            {rk === 'recruiter' && <Route path="clients" element={<AdminClients user={user} />} />}
          </>
        )}

        {/* Admin / SuperAdmin Roles */}
        {(rk === 'admin' || rk === 'superadmin') && (
          <>
            <Route path="modal-guide" element={<PlatformModalsGuide user={user} />} />
            <Route path="analytics" element={isCollege ? <Suspense fallback={<PageLoader />}><CollegeOverview user={user} /></Suspense> : <AdminAnalytics user={user} onNavigate={(p) => navigate(`/app/${p}`)} />} />
            <Route path="insights" element={<AdminInsights user={user} />} />
            <Route path="jobs/:jobId/distribution" element={<Suspense fallback={<PageLoader />}><JobDistribution user={user} /></Suspense>} />
            <Route path="dashboard" element={<Navigate to="/app/analytics" replace />} />
            <Route path="job-approvals" element={<AdminJobApproval user={user} />} />
            <Route path="org-settings" element={<OrgSettings user={user} />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="automation" element={<AdminAutomation />} />
            <Route path="custom-fields" element={<AdminCustomFields />} />
            <Route path="customizations" element={<SuperAdminCustomizations />} />
            <Route path="contact-leads" element={<ContactLeads />} />
            <Route path="recruiters" element={<AdminUsers filterRole="recruiter" isSuperAdmin={rk === 'superadmin'} user={user} />} />
            <Route path="hiring-managers" element={<AdminUsers filterRole="hiring_manager" isSuperAdmin={rk === 'superadmin'} user={user} />} />
            <Route path="interview-kits" element={<AdminInterviewKits user={user} />} />
            <Route path="webhooks" element={<AdminWebhooks user={user} />} />
            <Route path="diversity" element={<DiversityReport user={user} />} />
            <Route path="reviews" element={<AdminReviews user={user} />} />
            <Route path="referrals" element={<AdminReferrals user={user} />} />
            <Route path="talent-pool" element={<AdminTalentPool />} />
            <Route path="org-chart" element={<OrgChart user={user} />} />
            <Route path="clients" element={<AdminClients user={user} />} />
            <Route path="candidate-requests" element={rk === 'superadmin' ? <SuperAdminCandidateRequests /> : <AdminCandidateRequest user={user} />} />
            <Route path="reported-posts" element={<Suspense fallback={<PageLoader />}><SuperAdminReportedPosts /></Suspense>} />
          </>
        )}

        {/* SuperAdmin Specific */}
        {rk === 'superadmin' && (
          <>
            <Route path="command-center" element={<SuperAdminCommandCenter user={user} />} />
            <Route path="platform" element={<SuperAdminPlatform />} />
            <Route path="organisations" element={<SuperAdminOrgs />} />
            <Route path="forms/create-org" element={<CreateOrganisationPage user={user} onBack={() => window.history.back()} onSuccess={() => window.history.back()} />} />
            <Route path="forms/provision" element={<ProvisionUserPage user={user} onBack={() => window.history.back()} onSuccess={() => window.history.back()} />} />
            <Route path="permissions" element={<SuperAdminPermissions />} />
            <Route path="security" element={<SuperAdminSecurity />} />
            <Route path="import-candidates" element={<SuperAdminCandidateImport user={user} />} />
            <Route path="audit-logs" element={<SuperAdminAuditLogs />} />
            <Route path="playbooks" element={<SuperAdminPlaybooks />} />
            <Route path="blogs" element={<SuperAdminBlogs />} />
            <Route path="customizations" element={<SuperAdminCustomizations />} />
            <Route path="all-candidates" element={<SuperAdminCandidates />} />
            <Route path="unregistered-candidates" element={<Suspense fallback={<PageLoader />}><SuperAdminUnregisteredCandidates /></Suspense>} />
            <Route path="admins" element={<AdminUsers filterRole="admin" isSuperAdmin={true} user={user} />} />
            <Route path="bgv-tracker" element={<SuperAdminBgvTracker />} />
            <Route path="referrals" element={<AdminReferrals user={user} />} />
            <Route path="platform-referrals" element={<SuperAdminPlatformReferrals />} />
            <Route path="college-groups" element={<Suspense fallback={<PageLoader />}><SuperAdminCollegeGroups /></Suspense>} />
            <Route path="company-groups" element={<Suspense fallback={<PageLoader />}><SuperAdminCompanyGroups /></Suspense>} />
          </>
        )}

        {/* Hiring Manager */}
        {rk === 'hiring_manager' && (
          <>
            <Route path="dashboard" element={<HiringManagerDashboard user={user} />} />
            <Route path="my-team" element={<Suspense fallback={<PageLoader />}><MyTeam user={user} /></Suspense>} />
            <Route path="pipeline" element={<AdminPipeline user={user} />} />
            <Route path="interviews" element={<RecruiterInterviews user={user} />} />
            <Route path="feed" element={<Suspense fallback={<PageLoader />}><CommunityFeed user={user} /></Suspense>} />
            <Route path="people" element={<Suspense fallback={<PageLoader />}><PeoplePage user={user} /></Suspense>} />
            <Route path="communities" element={<Suspense fallback={<PageLoader />}><CommunitiesPage user={user} /></Suspense>} />
            <Route path="communities/:slug" element={<Suspense fallback={<PageLoader />}><CommunityDetailPage user={user} /></Suspense>} />
            <Route path="company-reviews" element={<Suspense fallback={<PageLoader />}><CompanyReviewsPage user={user} /></Suspense>} />
            <Route path="job-requirements" element={<JobRequirements user={user} />} />
            <Route path="clients" element={<AdminClients user={user} />} />
          </>
        )}
        {rk === 'client' && (
          <>
            <Route path="dashboard" element={<ClientDashboard user={user} />} />
            <Route path="shortlists" element={<ClientShortlists user={user} />} />
            <Route path="interviews" element={<ClientInterviews user={user} />} />
            <Route path="placements" element={<ClientPlacements user={user} />} />
            <Route path="requirements" element={<ClientRequirements user={user} />} />
            <Route path="feed" element={<Suspense fallback={<PageLoader />}><CommunityFeed user={user} /></Suspense>} />
            <Route path="people" element={<Suspense fallback={<PageLoader />}><PeoplePage user={user} /></Suspense>} />
            <Route path="communities" element={<Suspense fallback={<PageLoader />}><CommunitiesPage user={user} /></Suspense>} />
            <Route path="communities/:slug" element={<Suspense fallback={<PageLoader />}><CommunityDetailPage user={user} /></Suspense>} />
            <Route path="company-reviews" element={<Suspense fallback={<PageLoader />}><CompanyReviewsPage user={user} /></Suspense>} />
          </>
        )}
      </Route>

      {/* Public shareable post page — no auth required */}
      <Route path="/post/:id" element={<Suspense fallback={<PageLoader />}><PostPublicPage /></Suspense>} />

      {/* Org-specific career page — no nav, embeddable */}
      <Route path="/:orgSlug/careers" element={
        <Suspense fallback={<PageLoader />}>
          <OrgCareersPage />
        </Suspense>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <PlatformPresentationModal />
    </ErrorBoundary>
  );
}
