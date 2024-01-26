const {RouteRecord, Ticket, Bus, Route, Cities, Passengers} = require('../models/models')
const ApiError = require('../error/ApiError')
const uuid = require("uuid");
const {Op} = require("sequelize");

class TicketsController {
    async addTicket(req, res, next) {
        try {
            const {id} = req.body;
            const userId = req.user.id;
            let TicketId = uuid.v4();

            if (!id) return next(ApiError.badRequest('The route id was not found'));

            if (!userId) return next(ApiError.unauthorized('User is not authorized'));

            const user = await Passengers.findOne({
                where: {id: userId},
                attributes: ['documentNumber']
            })

            if (!user.documentNumber) return next(ApiError.badRequest('There is not enough user data to purchase'));

            const record = await RouteRecord.findOne({
                where: {id},
                include: [{model: Bus, attributes: ['seatsAmount']}],
            });

            const occupiedPlaces = await Ticket.findAll({where: {recordId: record.id}, attributes: ['seatNo']});

            let place = 1;

            while (occupiedPlaces.some((occupiedPlace) => occupiedPlace.seatNo === place)) {
                place++;
            }

            if (place <= record.Bus.seatsAmount) {
                const ticket = await Ticket.create({id: TicketId, recordId: id, passengerId: userId, seatNo: place});
                return res.json({ticket});
            } else {
                return next(ApiError.badRequest('Все места заняты'));
            }
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async getUserTickets(req, res, next) {
        try {
            const userId = req.user.id;

            const tickets = await Ticket.findAll(
                {
                    where: {passengerId: userId},
                    attributes: ['seatNo', 'id', 'createdAt'],
                    include: [
                        {
                            model: RouteRecord,
                            attributes: ['departureDate', 'price'],
                            include: [
                                {
                                    model: Route,
                                    attributes: ['duration', 'departureCityId', 'destinationCityId'],
                                    include: [
                                        {
                                            model: Cities,
                                            as: 'departureCity',
                                            attributes: ['cityName']
                                        },
                                        {
                                            model: Cities,
                                            as: 'destinationCity',
                                            attributes: ['cityName']
                                        }],
                                }]
                        }]
                });


            const formattedTickets = tickets.map(ticket => {
                return {
                    id: ticket.id,
                    seatNo: ticket.seatNo,
                    price: ticket.RouteRecord.price,
                    duration: ticket.RouteRecord.Route.duration,
                    departureCity: ticket.RouteRecord.Route.departureCity.cityName,
                    destinationCity: ticket.RouteRecord.Route.destinationCity.cityName,
                    departureDate: ticket.RouteRecord.departureDate
                };
            });
            return res.json({tickets: formattedTickets});
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async getTickets(req, res, next) {
        try {

            let {firstDate, secondDate, passengerId} = req.query;
            let condition = {};

            if (!firstDate || !secondDate) return next(ApiError.badRequest("Какая-то из дат не указана!"));

            if (passengerId) {
                condition = {
                    createdAt: {[Op.between]: [+firstDate, +secondDate]},
                    passengerId
                };
            } else {
                condition = {
                    createdAt: {[Op.between]: [+firstDate, +secondDate]},
                };
            }


            const tickets = await Ticket.findAll(
                {
                    where: condition,
                    attributes: ['seatNo', 'id', 'passengerId', 'createdAt'],
                    include: [
                        {
                            model: RouteRecord,
                            attributes: ['departureDate', 'price'],
                            include: [
                                {
                                    model: Route,
                                    attributes: ['duration', 'departureCityId', 'destinationCityId'],
                                    include: [
                                        {
                                            model: Cities,
                                            as: 'departureCity',
                                            attributes: ['cityName']
                                        },
                                        {
                                            model: Cities,
                                            as: 'destinationCity',
                                            attributes: ['cityName']
                                        }],
                                }]
                        },
                        {
                            model: Passengers, //---------------------------------------
                            attributes: ['firstName', 'lastName']
                        }]
                });

            const formattedTickets = tickets.map(ticket => {
                return {
                    id: ticket.id,
                    seatNo: ticket.seatNo,
                    passengerId: ticket.passengerId,
                    price: ticket.RouteRecord.price,
                    // firstname: ticket.Passengers.firstname, ??????????????????????
                    departureDate: ticket.RouteRecord.departureDate,
                    duration: ticket.RouteRecord.Route.duration,
                    departureCity: ticket.RouteRecord.Route.departureCity.cityName,
                    destinationCity: ticket.RouteRecord.Route.destinationCity.cityName
                };
            });
            return res.json({tickets: formattedTickets});

        } catch (e) {
            console.log(e.message);
            return next(ApiError.internal(e.message))
        }
    }

    async deleteTicket(req, res, next) {
        try {
            const {id} = req.query;

            if (!id || !(await Ticket.findOne({where: {id}}))) return next(ApiError.badRequest("id билета не найден"));

            await Ticket.destroy({where: {id}})

            return res.status(200).json("Request completed");

        } catch (e) {
            console.log(e.message);
            return next(ApiError.internal(e.message));
        }
    }
}

module.exports = new TicketsController();