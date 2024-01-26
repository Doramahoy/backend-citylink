const Router = require('express')
const router = new Router();
const userController = require('../controllers/userController')
const authMiddleware = require('../middleware/authMiddleware')
const checkRoleMiddleware = require('../middleware/checkRoleMiddleware');

router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.get('/auth', authMiddleware, userController.updateToken);
router.put('/update', authMiddleware, userController.updateProfile);
router.get('/info', authMiddleware, userController.getUserInfo);
router.post('/validateData', userController.dataValidation);
router.get('/getUsers', authMiddleware, checkRoleMiddleware, userController.getUsers);
router.delete('/deleteUser', authMiddleware, checkRoleMiddleware, userController.deleteUser);

module.exports = router;