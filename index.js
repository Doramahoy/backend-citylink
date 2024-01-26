require('dotenv').config();
const express = require('express')
const sequelize = require('./database')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const fileUpload = require('express-fileupload')
const router = require('./routes/index')
const path = require('path')
const errorHandler = require('./middleware/ErrorHandlingMiddleware')

const PORT = process.env.PORT || 4000;

const app = express();

const corsOptions = {
    origin: ['http://localhost:4000', 'http://localhost:3000', 'http://192.168.0.103:3000'],
    credentials: true,            //access-control-allow-credentials:true
    optionSuccessStatus: 200
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.resolve(__dirname, 'static', 'images', 'profile-pics')));
app.use(fileUpload({}));
app.use('/api', router);


const yamlFilePath = path.resolve(__dirname, 'swagger', 'openapi.yaml');
const swaggerDocument = yaml.load(fs.readFileSync(yamlFilePath, 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorHandler);

const start = async () => {
    try {
        await sequelize.authenticate()
        await sequelize.sync()
        app.listen(PORT, () => console.log(`Server started on ${PORT}`))
    } catch (e) {
        console.log(e)
    }
}

start();
