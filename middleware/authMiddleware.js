const jwt = require('jsonwebtoken');
const ApiError = require('../error/ApiError');

module.exports = function (req, res, next) {
    if (req.method === "OPTIONS"){
        next();
    }
    try {
        const token = req.headers.authorization?.split(' ')[1]
        if (!token) {
            console.log('no token')
            return next(ApiError.unauthorized('User is not authorized'));
        }
        req.user = jwt.verify(token, process.env.SECRET_KEY);
        next();
    } catch (e){
        console.log(e)
        return next(ApiError.forbidden(e));
    }
}