import React from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ReferralHub from '../../components/candidate/ReferralHub.jsx';

export default function CandidateReferEarn({ user }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <PageHeader
        title="Refer & Grow"
        subtitle="Invite friends to TalentNest HR, earn coins, and unlock exclusive profile badges"
      />
      <ReferralHub user={user} />
    </div>
  );
}
