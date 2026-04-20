const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const env = require('./config/env.js')
const routes = require('./routes/index.js')
const v1Routes = require('./routes/v1.routes.js')
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.js')

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.clientUrls,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.use('/api', routes)
app.use('/api/v1', v1Routes)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
