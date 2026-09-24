import express from 'express';
import {
  createEpisode,
  getEpisodes,
  getEpisodeById,
} from '../controllers/episodeController.js';

const router = express.Router();

router.post('/', createEpisode);
router.get('/', getEpisodes);
router.get('/:id', getEpisodeById);

export default router;
