const Router = require('express');
const router = new Router();
const routesController = require('../controllers/routesController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRoleMiddleware = require('../middleware/checkRoleMiddleware');

router.get('/getRouteRecords', routesController.getRouteRecords);
router.get('/getCities', authMiddleware, checkRoleMiddleware, routesController.getCities);
router.get('/getRoutes', authMiddleware, checkRoleMiddleware, routesController.getRoutes);
router.post('/addRoute', authMiddleware, checkRoleMiddleware, routesController.addRoute);
router.post('/addRouteRecord', authMiddleware, checkRoleMiddleware, routesController.addRouteRecord);
router.post('/addBus', authMiddleware, checkRoleMiddleware, routesController.addBus);
router.post('/addCity', authMiddleware, checkRoleMiddleware, routesController.addCity);
router.delete('/delete', authMiddleware, checkRoleMiddleware, routesController.delete);
router.put('/update', authMiddleware, checkRoleMiddleware, routesController.update);


module.exports = router;