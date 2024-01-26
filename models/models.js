const sequelize = require('../database');
const {DataTypes} = require('sequelize');

const Passengers = sequelize.define('Passengers', {
    id: {type: DataTypes.STRING(50), primaryKey: true, unique: true, allowNull: false},
    role: {type: DataTypes.STRING(5), allowNull: false, defaultValue: 'user'},
    lastName: {type: DataTypes.STRING(50), allowNull: false},
    firstName: {type: DataTypes.STRING(50), allowNull: false},
    middleName: {type: DataTypes.STRING(50)},
    gender: {type: DataTypes.BOOLEAN},
    phoneNumber: {type: DataTypes.STRING(11), allowNull: false, unique: true},
    email: {type: DataTypes.STRING(30), unique: true},
    birthDate: {type: DataTypes.DATE},
    documentNumber: {type: DataTypes.STRING(10)},
    password: {type: DataTypes.STRING, allowNull: false}
});

const Cities = sequelize.define('Cities', {
    id: {type: DataTypes.INTEGER, primaryKey: true, unique: true, allowNull: false, autoIncrement: true},
    cityName: {type: DataTypes.STRING(50), allowNull: false},
}, {timestamps: false});

const Route = sequelize.define('Route', {
    id: {type: DataTypes.INTEGER, primaryKey: true, unique: true, allowNull: false, autoIncrement: true},
    duration: {type: DataTypes.INTEGER, allowNull: false}
}, {timestamps: false});

const Bus = sequelize.define('Bus', {
    id: {type: DataTypes.INTEGER, primaryKey: true, unique: true, allowNull: false, autoIncrement: true},
    model: {type: DataTypes.STRING(50), allowNull: false},
    regNumber: {type: DataTypes.STRING(50), allowNull: false, unique: true},
    seatsAmount: {type: DataTypes.INTEGER, allowNull: false},
}, {timestamps: false});

const RouteRecord = sequelize.define('RouteRecord', {
    id: {type: DataTypes.INTEGER, primaryKey: true, unique: true, allowNull: false, autoIncrement: true},
    price: {type: DataTypes.INTEGER, allowNull: false},
    departureDate: {type: DataTypes.DATE, allowNull: false},
}, {timestamps: false});

const Ticket = sequelize.define('Ticket', {
    id: {type: DataTypes.STRING, primaryKey: true, unique: true, allowNull: false},
    seatNo: {type: DataTypes.INTEGER, allowNull: false},
});

Cities.hasMany(Route, {foreignKey: 'departureCityId'});
Route.belongsTo(Cities, {foreignKey: 'departureCityId', as: 'departureCity'});

Cities.hasMany(Route, {foreignKey: 'destinationCityId'});
Route.belongsTo(Cities, {foreignKey: 'destinationCityId', as: 'destinationCity'});

Route.hasMany(RouteRecord, {foreignKey: 'routeId'});
RouteRecord.belongsTo(Route, {foreignKey: 'routeId'});

Bus.hasMany(RouteRecord, {foreignKey: 'busId'});
RouteRecord.belongsTo(Bus, {foreignKey: 'busId'});

Passengers.hasMany(Ticket, {foreignKey: 'passengerId'});
Ticket.belongsTo(Passengers, {foreignKey: 'passengerId'});

RouteRecord.hasMany(Ticket, {foreignKey: 'recordId'});
Ticket.belongsTo(RouteRecord, {foreignKey: 'recordId'});

module.exports = {
    Passengers,
    Ticket,
    Cities,
    Route,
    Bus,
    RouteRecord
}