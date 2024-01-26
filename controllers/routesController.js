const {RouteRecord, Route, Cities, Bus, Ticket} = require('../models/models')
const ApiError = require('../error/ApiError')
const sequelize = require("sequelize");
const {Op} = require("sequelize");

class RoutesController {
    async getRouteRecords(req, res, next) {
        try {
            let {departureCity, destinationCity, departureDate} = req.query;

            const cities = {};
            let routeCondition = {};
            let recordCondition = {};

            if (departureCity && !destinationCity) {
                departureCity = departureCity[0].toUpperCase() + departureCity.substring(1).toLowerCase();
                cities.city1 = await Cities.findOne({where: {cityName: departureCity}});

                if (!cities.city1) {
                    return next(ApiError.badRequest(`Города ${departureCity} нет в базе`));
                }

                routeCondition = {
                    departureCityId: cities.city1.id,
                }
            }
            if (destinationCity && !departureCity) {
                destinationCity = destinationCity[0].toUpperCase() + destinationCity.substring(1).toLowerCase();
                cities.city2 = await Cities.findOne({where: {cityName: destinationCity}});

                if (!cities.city2) {
                    return next(ApiError.badRequest(`Города ${destinationCity} нет в базе`));
                }

                routeCondition = {
                    destinationCityId: cities.city2.id,
                }
            }
            if (departureCity && destinationCity) {
                departureCity = departureCity[0].toUpperCase() + departureCity.substring(1).toLowerCase();
                destinationCity = destinationCity[0].toUpperCase() + destinationCity.substring(1).toLowerCase();
                cities.city1 = await Cities.findOne({where: {cityName: departureCity}});
                cities.city2 = await Cities.findOne({where: {cityName: destinationCity}});

                if (!cities.city2 || !cities.city1) {
                    return next(ApiError.badRequest(`Какого-то города нет в базе`));
                }

                routeCondition = {
                    departureCityId: cities.city1.id,
                    destinationCityId: cities.city2.id,
                }

                const routes = await Route.findOne({
                    where: routeCondition
                    , attributes: ['id', 'duration']
                });

                if (!routes) {
                    return next(ApiError.badRequest('Маршрут по данным городам не зарегестрирован'));
                }
            }

            if (departureDate) {
                if (isNaN(Number(departureDate))) {
                    return next(ApiError.badRequest('Неккоректная дата'));
                }

                departureDate = Number(departureDate);
                const date = departureDate + 86399000;

                recordCondition = {
                    departureDate: {[Op.between]: [departureDate, date]}
                }
            }


            const records = await RouteRecord.findAll({
                where: recordCondition,
                attributes: ['id', 'price', 'departureDate'],
                include: [
                    {
                        model: Bus,
                        attributes: ['seatsAmount'],
                    },
                    {
                        model: Route,
                        where: routeCondition,
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
                            }
                        ]
                    }]
            });

            const availableRoutes = [];

            for (const record of records) {
                const purchasedTicketsCount = await Ticket.count({where: {recordId: record.id}});

                if (purchasedTicketsCount < record.Bus.seatsAmount) {
                    availableRoutes.push({
                        id: record.id,
                        price: record.price,
                        departureDate: record.departureDate,
                        duration: record.Route.duration,
                        departureCity: record.Route.departureCity.cityName,
                        destinationCity: record.Route.destinationCity.cityName,
                    })
                }
            }

            return res.json({routes: availableRoutes});

        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async getRoutes(req, res, next) {
        try {
            const {departureCity, destinationCity} = req.query;

            let departureCityCondition = {};
            let destinationCityCondition = {};

            if (departureCity && !destinationCity) {
                departureCityCondition = {
                    cityName: departureCity
                }
            }
            if (!departureCity && destinationCity) {
                destinationCityCondition = {
                    cityName: destinationCity
                }
            }
            if (departureCity && destinationCity) {
                departureCityCondition = {
                    cityName: departureCity
                }
                destinationCityCondition = {
                    cityName: destinationCity
                }
            }
            let routes = await Route.findAll({
                include: [
                    {
                        model: Cities,
                        where: departureCityCondition,
                        as: 'departureCity',
                        attributes: ['cityName']
                    },
                    {
                        model: Cities,
                        where: destinationCityCondition,
                        as: 'destinationCity',
                        attributes: ['cityName']
                    }
                ]
            });

            for (let key in routes) {
                routes[key] = {
                    id: routes[key].id,
                    departureCity: routes[key].departureCity.cityName,
                    destinationCity: routes[key].destinationCity.cityName,
                    duration: routes[key].duration
                }
            }
            return res.json({routes});
        } catch (e) {
            console.log(e);
            return next(ApiError.internal(e));
        }
    }

    async getCities(req, res, next) {
        try {
            let {cityName} = req.query;
            if (cityName) {
                cityName = cityName[0].toUpperCase() + cityName.substring(1).toLowerCase();
                const cities = await Cities.findAll({where: {cityName: {[sequelize.Op.like]: `${cityName}%`}}});
                return res.json({cities});
            }
            if (!cityName) {
                const cities = await Cities.findAll();
                return res.json({cities});
            }
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async addRoute(req, res, next) {
        try {
            const {departureCity, destinationCity, duration} = req.body;

            if (!departureCity || !destinationCity || !duration) {
                return next(ApiError.badRequest('Получены не все данные для добавления'));
            }

            const cities = {
                city1: await Cities.findOne({where: {cityName: departureCity}}),
                city2: await Cities.findOne({where: {cityName: destinationCity}})
            };

            if (!cities.city1 || !cities.city2) {
                return next(ApiError.badRequest('Какой-то из городов не найден в базе'));
            }

            const check = await Route.findOne({
                where: {
                    departureCityId: cities.city1.id,
                    destinationCityId: cities.city2.id
                }
            });

            if (check) {
                return next(ApiError.badRequest('Такой маршрут уже зарегестрирован'));
            }

            const result = await Route.create({
                duration,
                departureCityId: cities.city1.id,
                destinationCityId: cities.city2.id
            });
            return res.json({result});
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async addRouteRecord(req, res, next) {
        try {
            const {departureCity, destinationCity, regNumber, price, departureDate} = req.body;

            if (!departureCity || !destinationCity || !regNumber || !price || !departureDate) {
                return next(ApiError.badRequest('Получены не все данные для добавления'));
            }

            const cities = {
                city1: await Cities.findOne({where: {cityName: departureCity}}),
                city2: await Cities.findOne({where: {cityName: destinationCity}})
            };

            if (!cities.city1 || !cities.city2) {
                return next(ApiError.badRequest('Маршрут не найден'));
            }
            const bus = await Bus.findOne({where: {regNumber}});
            if (!bus) {
                return next(ApiError.badRequest('Автобус с таким номером не найден'));
            }

            const route = await Route.findOne({
                where: {
                    departureCityId: cities.city1.id,
                    destinationCityId: cities.city2.id
                }
            });

            if (!route) {
                return next(ApiError.badRequest('Маршрут по данным городам не зарегестрирован'))
            }

            const check = await RouteRecord.findOne({where: {departureDate, routeId: route.id, busId: bus.id}});

            if (check) {
                return next(ApiError.badRequest('Такой маршрут уже зарегестрирован'));
            }

            const result = await RouteRecord.create({price, departureDate, routeId: route.id, busId: bus.id});
            return res.json({result});
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async addBus(req, res, next) {
        try {
            const {model, regNumber, seatsAmount} = req.body;

            if (!regNumber || !model || !seatsAmount) {
                return next(ApiError.badRequest('Получены не все данные для добавления'));
            }

            const check = await Bus.findOne({where: {regNumber}});
            if (check) {
                return next(ApiError.badRequest('Такой автобус уже зарегестрирован'));
            }
            const result = await Bus.create({model, regNumber, seatsAmount})
            return res.json({result});
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async addCity(req, res, next) {
        try {
            const {cityName} = req.body;

            if (!cityName) {
                return next(ApiError.badRequest('Введите город'));
            }

            const check = await Cities.findOne({where: {cityName}});
            if (check) {
                return next(ApiError.badRequest('Такой город уже зарегестрирован'));
            }
            const result = await Cities.create({cityName})
            return res.json({result});
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async delete(req, res, next) {
        try {
            let {cityId, routeId, recordId} = req.query;

            if (cityId) {
                cityId = Number(cityId)
                const check = await Cities.findOne({where: {id: cityId}});

                if (!check) return next(ApiError.badRequest('Город не найден'));

                await Cities.destroy({where: {id: cityId}});
                return res.status(200).json('Request completed')
            }
            if (routeId) {
                routeId = Number(routeId)
                const check = await Route.findOne({where: {id: routeId}});

                if (!check) return next(ApiError.badRequest('Маршрут не найден'));

                await Route.destroy({where: {id: routeId}});
                return res.status(200).json('Request completed')
            }
            if (recordId) {
                recordId = Number(recordId)
                const check = await RouteRecord.findOne({where: {id: recordId}});

                if (!check) return next(ApiError.badRequest('Маршрут не найден'));

                await RouteRecord.destroy({where: {id: recordId}});
                return res.status(200).json('Request completed')
            }

            return next(ApiError.badRequest('Не найдены входные параметры :('));
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async update(req, res, next) {
        try {
            let infoToUpdate = req.body;

            if (infoToUpdate.cityId) {
                const check = await Cities.findOne({where: {id: infoToUpdate.cityId}});

                if (!check) return next(ApiError.badRequest('Город не найден'));

                await Cities.update(infoToUpdate, {where: {id: infoToUpdate.cityId}});
                return res.status(200).json('Request completed')
            }

            if (infoToUpdate.routeId) {
                const check = await Route.findOne({where: {id: infoToUpdate.routeId}});

                if (!check) return next(ApiError.badRequest('Маршрут не найден'));

                await Route.update(infoToUpdate, {where: {id: infoToUpdate.routeId}});
                return res.status(200).json('Request completed')
            }

            if (infoToUpdate.recordId) {
                const check = await RouteRecord.findOne({where: {id: infoToUpdate.recordId}});

                if (!check) return next(ApiError.badRequest('Маршрут не найден'));

                await RouteRecord.update(infoToUpdate, {where: {id: infoToUpdate.recordId}});
                return res.status(200).json('Request completed')
            }

            return next(ApiError.badRequest('Не найдены входные параметры :('));
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

}

module.exports = new RoutesController();