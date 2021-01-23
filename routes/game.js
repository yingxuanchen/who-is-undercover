const express = require('express');
const router = express.Router();
const gameController = require('../controllers/game');

router.post('/feedback', gameController.feedback);

router.get('/check-session', gameController.checkSession);

router.post('/enter-room', gameController.enterRoom);
router.post('/leave-room', gameController.leaveRoom);
router.post('/room', gameController.getRoom);

router.post('/start-game', gameController.startGame);
router.post('/end-game', gameController.endGame);
router.post('/leave-game', gameController.leaveGame);

router.post('/end-turn', gameController.endTurn);
router.post('/vote', gameController.vote, gameController.endGame);
router.post('/host-vote', gameController.hostVote, gameController.endGame);

module.exports = router;