import CheckIn from '../models/CheckIn.js';

// Calculate if a check-in is high risk and return human-readable reasons
const assessCheckInRisk = (checkIn) => {
  const reasons = [];
  const symptoms = checkIn.symptoms || {};
  const mlOutput = checkIn.mlOutput || {};

  // Check severe symptoms
  if (symptoms.fever) reasons.push('Fever reported');
  if (symptoms.purulentDischarge) reasons.push('Purulent (cloudy) discharge');
  if (symptoms.spreadingRedness) reasons.push('Spreading redness');
  if (symptoms.increasingPain) reasons.push('Increasing pain');

  // Check AI concern score
  if (mlOutput.concernScore !== null && mlOutput.concernScore !== undefined) {
    if (mlOutput.concernScore >= 0.50 || mlOutput.predictedClass === 'Elevated Concern') {
      reasons.push(`Elevated AI concern score (${Math.round(mlOutput.concernScore * 100)}%)`);
    }
  }

  const isHighRisk = reasons.length > 0;
  return { isHighRisk, riskReasons: reasons };
};

/**
 * GET /api/clinician/queue
 * Query unreviewed check-ins prioritized by high risk (elevated ML score or positive symptoms)
 */
export const getReviewQueue = async (req, res) => {
  try {
    const { status } = req.query;

    // Filter by requested status, or default to all actionable unreviewed check-ins
    const statusFilter = status
      ? { reviewStatus: status }
      : { reviewStatus: { $in: ['pending', 'manual_review_required', 'escalated', 'retake_requested'] } };

    // Fetch check-ins and populate patient information
    const checkIns = await CheckIn.find(statusFilter)
      .populate('patientId', 'name mrn surgeryType surgeryDate')
      .lean();

    // Attach risk assessment to each check-in
    const enrichedQueue = checkIns.map((checkIn) => {
      const { isHighRisk, riskReasons } = assessCheckInRisk(checkIn);
      return {
        ...checkIn,
        isHighRisk,
        riskReasons,
      };
    });

    // Sort: High risk first, then by concernScore desc, then by date desc
    enrichedQueue.sort((a, b) => {
      // 1. High risk priority
      if (a.isHighRisk && !b.isHighRisk) return -1;
      if (!a.isHighRisk && b.isHighRisk) return 1;

      // 2. Concern score priority
      const scoreA = a.mlOutput?.concernScore || 0;
      const scoreB = b.mlOutput?.concernScore || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;

      // 3. Most recent check-in first
      return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime();
    });

    return res.status(200).json({
      success: true,
      count: enrichedQueue.length,
      data: enrichedQueue,
    });
  } catch (error) {
    console.error('Error fetching clinician queue:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch review queue',
    });
  }
};

/**
 * GET /api/clinician/stats
 * Aggregated statistics for the clinician dashboard
 */
export const getClinicianStats = async (req, res) => {
  try {
    const total = await CheckIn.countDocuments();
    const pending = await CheckIn.countDocuments({ reviewStatus: 'pending' });
    const reviewed = await CheckIn.countDocuments({ reviewStatus: 'reviewed' });
    const escalated = await CheckIn.countDocuments({ reviewStatus: 'escalated' });
    const manualReview = await CheckIn.countDocuments({ reviewStatus: 'manual_review_required' });
    const retakeRequested = await CheckIn.countDocuments({ reviewStatus: 'retake_requested' });

    // Count flagged: either escalated, manual review, or high AI concern
    const flagged = await CheckIn.countDocuments({
      $or: [
        { reviewStatus: 'escalated' },
        { 'symptoms.fever': true },
        { 'symptoms.purulentDischarge': true },
        { 'mlOutput.concernScore': { $gte: 0.5 } },
      ],
    });

    return res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        flagged,
        underReview: manualReview + retakeRequested,
        reviewed,
        escalated,
      },
    });
  } catch (error) {
    console.error('Error fetching clinician stats:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch clinician statistics',
    });
  }
};

export default {
  getReviewQueue,
  getClinicianStats,
};

