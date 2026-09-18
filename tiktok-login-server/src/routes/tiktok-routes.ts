import { Router } from 'express';
import { tikTokWebAuthorization, tiktokRedirect } from '../controllers/tiktok-ctrl';

const router = Router();

router.get('/auth/tiktok/web', tikTokWebAuthorization);
router.get('/auth/tiktok/web/callback', tiktokRedirect);

export default router;