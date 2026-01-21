import PropTypes from 'prop-types';

/* ENUM-LIKE CONSTANTS (optional but recommended) */
export const RiskLevels = ['critical', 'high', 'medium', 'low'];

export const ApplicationStatuses = [
  'pending_review',
  'awaiting_resubmission',
  'approved',
  'rejected',
];

export const DocumentStatuses = [
  'approved',
  'needs_attention',
  'rejected',
  'pending',
];

/* DOCUMENT */
export const DocumentPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  status: PropTypes.oneOf(DocumentStatuses).isRequired,
  uploadedAt: PropTypes.string.isRequired,
  reviewNotes: PropTypes.string,
  rejectionReason: PropTypes.string,
});

/* TIMELINE EVENT */
export const TimelineEventPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
  timestamp: PropTypes.string.isRequired,
  user: PropTypes.string,
  details: PropTypes.string,
});

/* APPLICATION */
export const ApplicationPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  customerName: PropTypes.string.isRequired,
  businessName: PropTypes.string,
  riskLevel: PropTypes.oneOf(RiskLevels).isRequired,
  riskReasons: PropTypes.arrayOf(PropTypes.string).isRequired,
  submissionDate: PropTypes.string.isRequired,
  slaDeadline: PropTypes.string.isRequired,
  status: PropTypes.oneOf(ApplicationStatuses).isRequired,
  productType: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  phone: PropTypes.string.isRequired,
  documents: PropTypes.arrayOf(DocumentPropType).isRequired,
  timeline: PropTypes.arrayOf(TimelineEventPropType).isRequired,
});

/* KPI DATA */
export const KPIDataPropType = PropTypes.shape({
  averageOnboardingDuration: PropTypes.shape({
    current: PropTypes.number.isRequired,
    previous: PropTypes.number.isRequired,
    trend: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,

  stpRate: PropTypes.shape({
    current: PropTypes.number.isRequired,
    byProduct: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired,
      })
    ).isRequired,
  }).isRequired,

  documentErrorRate: PropTypes.shape({
    current: PropTypes.number.isRequired,
    previous: PropTypes.number.isRequired,
  }).isRequired,

  dropOffRate: PropTypes.shape({
    current: PropTypes.number.isRequired,
    funnel: PropTypes.arrayOf(
      PropTypes.shape({
        stage: PropTypes.string.isRequired,
        count: PropTypes.number.isRequired,
        dropOff: PropTypes.number.isRequired,
      })
    ).isRequired,
  }).isRequired,

  falsePositiveRate: PropTypes.shape({
    current: PropTypes.number.isRequired,
    trend: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,
});
