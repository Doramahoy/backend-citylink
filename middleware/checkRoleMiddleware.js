const {Passengers} = require('../models/models')
const ApiError = require('../error/ApiError');

module.exports = async function (req, res, next) {
    if (req.method === "OPTIONS") {
        next();
    }
    try {
        const passenger = await Passengers.findOne({where: {id: req.user.id}})
        if (!passenger.role) {
            return next(ApiError.unauthorized('Role not found'))
        }
        if (passenger.role !== 'admin') {
            return next(ApiError.unauthorized('Not enough rights'));
        }
        next();

    } catch (e) {
        console.log(e)
        return next(ApiError.forbidden(e));
    }
}
