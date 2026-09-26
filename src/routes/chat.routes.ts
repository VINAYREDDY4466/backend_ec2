import { Router } from 'express';
import * as chatController from '../controllers/chat.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  createChatSchema,
  renameChatSchema,
  sendMessageSchema,
} from '../validators/chat.validator.js';

const router = Router();

router.use(authMiddleware);

router.get('/', chatController.listChats);
router.post('/', validateBody(createChatSchema), chatController.createChat);
router.get('/:chatId', chatController.getChat);
router.patch('/:chatId', validateBody(renameChatSchema), chatController.renameChat);
router.delete('/:chatId', chatController.deleteChat);
router.post('/:chatId/messages', validateBody(sendMessageSchema), chatController.sendMessage);

export default router;
