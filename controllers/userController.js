const ApiError = require('../error/ApiError')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {Passengers, Ticket, RouteRecord, Route, Cities} = require('../models/models')
const uuid = require('uuid')
const {max} = require("pg/lib/defaults");

const generateJwt = (id) => {
    return jwt.sign({id}, process.env.SECRET_KEY, {expiresIn: '5d'});
}

class UserController {
    async signup(req, res, next) {
        try {
            const {phoneNumber, password, firstName, lastName} = req.body;
            if (!phoneNumber || !password) {
                return next(ApiError.badRequest('Некорректный номер или пароль'));
            }
            const candidate = await Passengers.findOne({where: {phoneNumber}});
            if (candidate) {
                return next(ApiError.badRequest('Пользователь с таким номером уже существует'));
            }
            const hashPassword = await bcrypt.hash(password, 5);
            let id = uuid.v4();
            const user = await Passengers.create({id, phoneNumber, password: hashPassword, firstName, lastName});
            const token = generateJwt(user.id);

            return res.json({token});
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async login(req, res, next) {
        try {
            const {phoneNumber, password} = req.body;
            const user = await Passengers.findOne({where: {phoneNumber}});
            if (!user) {
                return next(ApiError.badRequest('Неверный номер или пароль'));
            }
            let comparePassword = bcrypt.compareSync(password, user.password);
            if (!comparePassword) {
                return next(ApiError.badRequest('Неверный номер или пароль'));
            }
            const token = generateJwt(user.id);
            return res.json({token, role: user.role});
        } catch (e) {
            console.log(e.message)
            return next(ApiError.internal(e.message));
        }
    }

    async updateToken(req, res, next) {
        try {
            const token = generateJwt(req.user.id);

            const {firstName, role} = await Passengers.findOne({
                where: {id: req.user.id},
                attributes: ['firstName', 'role']
            })

            return res.json({token, name: firstName, role: role});
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async getUserInfo(req, res, next) {
        try {
            const userId = req.user.id;
            if (!userId) {
                return next(ApiError.unauthorized('User is not authorized'));
            }
            const user = await Passengers.findOne({
                where: {id: userId},
                attributes: ['id', 'lastName', 'gender', 'firstName', 'middleName', 'phoneNumber', 'email', 'birthDate', 'documentNumber']
            });
            const tickets = await Ticket.findAll(
                {
                    where: {passengerId: userId},
                    attributes: ['id'],
                    include: [
                        {
                            model: RouteRecord,
                            attributes: ['price'],
                            include: [
                                {
                                    model: Route,
                                    attributes: ['departureCityId', 'destinationCityId'],
                                }]
                        }]
                });

            user.ticketsAmount = tickets.length;

            if (tickets.length) {
                const countCities = {};

                tickets.forEach(ticket => {
                    if (!countCities[ticket.RouteRecord.Route.departureCityId]) {
                        countCities[ticket.RouteRecord.Route.departureCityId] = 1
                    } else {
                        countCities[ticket.RouteRecord.Route.departureCityId]++
                    }
                    if (!countCities[ticket.RouteRecord.Route.destinationCityId]) {
                        countCities[ticket.RouteRecord.Route.destinationCityId] = 1
                    } else {
                        countCities[ticket.RouteRecord.Route.destinationCityId]++
                    }
                })

                if (countCities) {
                    let maxId = tickets[0].RouteRecord.Route.departureCityId;

                    for (let id in countCities) {
                        if (countCities[id] > countCities[maxId]) maxId = id;
                    }
                    const favouriteCity = await Cities.findOne({where: {id: maxId}, attributes: ['cityName']})

                    user.favouriteCity = favouriteCity.cityName;
                    user.favouriteCityCount = countCities[maxId];
                }
            }

            return res.json(
                {
                    user: {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        middleName: user.middleName,
                        email: user.email,
                        gender: user.gender,
                        documentNumber: user.documentNumber,
                        birthDate: user.birthDate,
                        favouriteCity: user.favouriteCity,
                        favouriteCityCount: user.favouriteCityCount,
                        ticketsAmount: user.ticketsAmount,
                        phoneNumber: user.phoneNumber
                    }
                });
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async dataValidation(req, res, next) {
        try {
            const {email, phoneNumber} = req.body;

            if (email) {
                const candidate = await Passengers.findOne({where: {email}});
                if (candidate) return next(ApiError.badRequest('Пользователь с такой почтой уже существует'));
            }
            if (phoneNumber) {
                const candidate = await Passengers.findOne({where: {phoneNumber}});
                if (candidate) return next(ApiError.badRequest('Пользователь с таким номером уже существует'));
            }

            return res.status(200).json({message: 'Request completed'});
        } catch (e) {
            console.log(e)
            return next(ApiError.internal(e.message));
        }
    }

    async updateProfile(req, res, next) {
        try {
            const user = req.body;
            const userId = req.user.id;
            if (user.newPassword && user.currentPassword) {
                const {newPassword, currentPassword} = user;
                const currentUser = await Passengers.findOne({where: {id: userId}});
                let comparePassword = bcrypt.compareSync(currentPassword, currentUser.password);

                if (!comparePassword) {
                    return next(ApiError.badRequest('Пароли не совпадают'));
                }

                const hashPassword = await bcrypt.hash(newPassword, 5);
                await Passengers.update({password: hashPassword}, {where: {id: userId}});
                return res.status(200).json({message: 'Request completed'});
            }

            if (user.id && (user.id !== userId)) return next(ApiError.badRequest('Authorization id is incorrect'));

            if (user.birthDate) user.birthDate = +user.birthDate;

            if (user.email) {
                const checkEmail = await Passengers.findOne({where: {email: user.email}})
                if (checkEmail) {
                    return next(ApiError.badRequest('Пользователь с таким email уже зарегестрирован'));
                }
            }
            if (user.phoneNumber) return next(ApiError.badRequest('Невозможно поменять номер'));

            const updateProfile = await Passengers.update(user, {where: {id: userId}});

            return res.json({updateProfile});
        } catch (e) {
            console.log(e.message)
            return next(ApiError.internal(e.message));
        }
    }

    async getUsers(req, res, next) {
        try {
            const users = await Passengers.findAll({
                attributes: ['id', 'role', 'lastName', 'firstName', 'middleName',
                    'gender', 'phoneNumber', 'email', 'birthDate', 'documentNumber', 'createdAt']
            })

            return res.json({users});
        } catch (e) {
            console.log(e.message);
            return next(ApiError.internal(e.message));
        }
    }

    async deleteUser(req, res, next) {
        try {
            const {id} = req.query;

            if (!id || !(await Passengers.findOne({where: {id}}))) return next(ApiError.badRequest("id пользователя не найден"));

            await Passengers.destroy({where: {id}});

            return res.status(200).json("Request completed");
        } catch (e) {
            console.log(e.message);
            return next(ApiError.internal(e.message));
        }
    }
}

module.exports = new UserController();