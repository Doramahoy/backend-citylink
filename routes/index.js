const Router = require('express')
const router = new Router();
const userRouter =require('./userRouter')
const routesRouter =require('./routesRouter')
const ticketsRouter =require('./ticketsRouter')

router.use('/user', userRouter)
router.use('/routes', routesRouter)
router.use('/tickets', ticketsRouter)

module.exports = router;