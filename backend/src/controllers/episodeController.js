import Episode from '../models/Episode.js';
import Patient from '../models/Patient.js';
import CheckIn from '../models/CheckIn.js';

/**
 * POST /api/episodes
 * Create a new surgical episode
 */
export const createEpisode = async (req, res) => {
  try {
    const { patientId, procedureLabel, surgeryDate, woundSite, notes } = req.body;

    if (!procedureLabel || !surgeryDate) {
      return res.status(400).json({
        success: false,
        message: 'procedureLabel and surgeryDate are required.',
      });
    }

    // Resolve patient
    let targetPatientId = patientId;
    if (!targetPatientId) {
      const defaultPatient = await Patient.findOne();
      targetPatientId = defaultPatient?._id;
    }

    if (!targetPatientId) {
      return res.status(404).json({
        success: false,
        message: 'No patient record found.',
      });
    }

    const episode = await Episode.create({
      patientId: targetPatientId,
      procedureLabel,
      surgeryDate: new Date(surgeryDate),
      woundSite: woundSite || '',
      notes: notes || '',
      status: 'ACTIVE',
    });

    return res.status(201).json({
      success: true,
      data: episode,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create surgical episode.',
    });
  }
};

/**
 * GET /api/episodes
 * Fetch episodes (optionally by patientId)
 */
export const getEpisodes = async (req, res) => {
  try {
    const filter = {};
    if (req.query.patientId) {
      filter.patientId = req.query.patientId;
    }

    const episodes = await Episode.find(filter)
      .populate('patientId', 'name mrn surgeryType')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: episodes.length,
      data: episodes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch surgical episodes.',
    });
  }
};

/**
 * GET /api/episodes/:id
 * Get a specific episode with its check-ins
 */
export const getEpisodeById = async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id).populate('patientId');
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found.',
      });
    }

    const checkIns = await CheckIn.find({ patientId: episode.patientId._id }).sort({
      capturedAt: 1,
    });

    return res.status(200).json({
      success: true,
      data: {
        episode,
        checkIns,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  createEpisode,
  getEpisodes,
  getEpisodeById,
};
