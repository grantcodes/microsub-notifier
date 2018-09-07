import App from '../App'
import React from 'react'
import { StaticRouter } from 'react-router-dom'
import express from 'express'
import session from 'express-session'
import { renderToString } from 'react-dom/server'
import serialize from 'serialize-javascript'
import api from './api'
import db from './lib/db'

const assets = require(process.env.RAZZLE_ASSETS_MANIFEST)

const server = express()

var sess = {
  secret: 'super secret session',
  cookie: {},
}

if (server.get('env') === 'production') {
  server.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

server.use(session(sess))

server.use('/api', api)

server
  .disable('x-powered-by')
  .use(express.static(process.env.RAZZLE_PUBLIC_DIR))
  .get('/*', (req, res) => {
    const context = {}
    const markup = renderToString(
      <StaticRouter context={context} location={req.url}>
        <App />
      </StaticRouter>
    )

    if (context.url) {
      res.redirect(context.url)
    } else {
      let user = {}
      if (req.session && req.session.me) {
        user = db
          .get('users')
          .find({ me: req.session.me })
          .value()
      }
      res.status(200).send(
        `<!doctype html>
    <html lang="">
    <head>
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta charset="utf-8" />
        <title>Microsub Notifier</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        ${
          assets.client.css
            ? `<link rel="stylesheet" href="${assets.client.css}">`
            : ''
        }
        <script>
          window.microsubNotifierUser = ${serialize(user)};
          ${
            req.session && req.session.error
              ? 'window.microsubNotifierError = "' + req.session.error + '";'
              : ''
          }
        </script>
        ${
          process.env.NODE_ENV === 'production'
            ? `<script src="${assets.client.js}" defer></script>`
            : `<script src="${assets.client.js}" defer crossorigin></script>`
        }
    </head>
    <body>
        <div id="root">${markup}</div>
    </body>
</html>`
      )
    }
  })

export default server
