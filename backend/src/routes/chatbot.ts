import { Router } from 'express';

const router = Router();

// Store conversational state in memory (in production, use Redis or DB)
const conversationStates: Map<string, {
  step: string;
  data: any;
  lastUpdate: Date;
}> = new Map();

// Clean old states every hour (older than 1 hour)
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [chatId, state] of conversationStates.entries()) {
    if (state.lastUpdate < oneHourAgo) {
      conversationStates.delete(chatId);
    }
  }
}, 60 * 60 * 1000);

// Get conversation state
router.get('/state/:chatId', (req, res) => {
  const { chatId } = req.params;
  const state = conversationStates.get(chatId) || {
    step: 'start',
    data: {},
    lastUpdate: new Date()
  };
  
  res.json({ success: true, data: state });
});

// Update conversation state
router.post('/state/:chatId', (req, res) => {
  const { chatId } = req.params;
  const { step, data } = req.body;
  
  conversationStates.set(chatId, {
    step,
    data: data || {},
    lastUpdate: new Date()
  });
  
  res.json({ success: true });
});

// Reset conversation state
router.delete('/state/:chatId', (req, res) => {
  const { chatId } = req.params;
  conversationStates.delete(chatId);
  
  res.json({ success: true });
});

export default router;
