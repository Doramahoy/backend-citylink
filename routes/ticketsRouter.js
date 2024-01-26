const Router = require('express');
const router = new Router();
const ticketsController = require('../controllers/ticketsController');
const checkRoleMiddleware = require('../middleware/checkRoleMiddleware')
const authMiddleware = require('../middleware/authMiddleware');

router.post('/addTicket', authMiddleware, ticketsController.addTicket);
router.get('/getUserTickets', authMiddleware, ticketsController.getUserTickets);
router.get('/getTickets', authMiddleware, checkRoleMiddleware, ticketsController.getTickets);
router.delete('/deleteTicket', authMiddleware, checkRoleMiddleware, ticketsController.deleteTicket);

module.exports = router;