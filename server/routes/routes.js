import { Router } from 'express';
import * as controller from '../controllers/';
const router = new Router();

router.route('/getRanks').get(controller.getRanks);

export default router;
