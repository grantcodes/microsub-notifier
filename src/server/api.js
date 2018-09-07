import querystring from 'querystring'
import express from 'express'
import bodyParser from 'body-parser'
import axios from 'axios'
import relParser from 'rel-parser'
import schedule from 'node-schedule'
import IndieAuthentication from 'indieauth-authentication'
import db from './lib/db'
import notify from './lib/notifier'

// Run notifier every minute
schedule.scheduleJob('* * * * *', notify)

const app = express.Router()
const appUrl = process.env.RAZZLE_URL || 'https://microsub-notifier.tpxl.io'

const getUser = me =>
  db
    .get('users')
    .find({ me })
    .value()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.post('/login', async (req, res) => {
  console.log('Logging in', req.body)
  if (req.body.me) {
    req.session.me = req.body.me
    const rels = await relParser(req.body.me)
    if (
      !rels.authorization_endpoint ||
      !rels.token_endpoint ||
      !rels.microsub
    ) {
      console.log('Missing rels from ' + req.body.me, rels)
      if (req && req.session)
        req.session.error = 'Could not find your endpoints'
      return res.redirect('/error')
    }

    const existingUser = await getUser(req.session.me)

    const user = {
      me: req.body.me,
      authEndpoint: rels.authorization_endpoint[0],
      tokenEndpoint: rels.token_endpoint[0],
      microsubEndpoint: rels.microsub[0],
      state: Date.now() + 'msnotifier',
    }

    if (existingUser) {
      db.get('users')
        .find({ me: req.body.me })
        .set('authEndpoint', rels.authorization_endpoint[0])
        .set('tokenEndpoint', rels.token_endpoint[0])
        .set('microsubEndpoint', rels.microsub[0])
        .set('state', user.state)
        .write()
    } else {
      db.get('users')
        .push(user)
        .write()
    }

    const auth = new IndieAuthentication({
      me: user.me,
      authEndpoint: user.authEndpoint,
      tokenEndpoint: user.tokenEndpoint,
      clientId: `${appUrl}`,
      redirectUri: `${appUrl}/api/auth`,
      scope: 'read',
      state: user.state,
    })

    const authUrl = await auth.getAuthUrl()

    res.redirect(authUrl + `&scope=read`)
  }
})

app.get('/auth', async (req, res) => {
  try {
    const user = await getUser(req.query.me)
    if (!user) {
      // return res.render("error", { message: "Error finding user" });
      if (req && req.session)
        req.session.error = 'Error getting your user data from the database'
      return res.redirect('/error')
    }

    const data = {
      grant_type: 'authorization_code',
      me: user.me,
      code: req.query.code,
      client_id: `${appUrl}`,
      redirect_uri: `${appUrl}/api/auth`,
    }

    const request = {
      url: user.tokenEndpoint,
      method: 'POST',
      timeout: 6000,
      data: querystring.stringify(data),
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        accept: 'application/json, application/x-www-form-urlencoded',
      },
    }

    let response = await axios(request)
    if (typeof response.data === 'string') {
      response.data = querystring.parse(response.data)
    }

    if (response.data && response.data.access_token) {
      // Get microsub channels
      const channels = await axios({
        method: 'get',
        url: `${user.microsubEndpoint}/?action=channels`,
        responseType: 'json',
        timeout: 8000,
        headers: {
          Authorization: 'Bearer ' + user.token,
        },
      })

      if (!channels || !channels.data || !channels.data.channels) {
        if (req.session) {
          req.session.error = 'Error getting channels'
        }
        res.redirect('/error')
      }
      db.get('users')
        .find({ me: user.me })
        .set('token', response.data.access_token)
        .set('channels', channels.data.channels)
        .write()
      res.redirect('/setup')
    } else {
      console.log('Bad response from token endpoint', response)
      // res.render("error", { message: "Error getting token" });
      if (req && req.session)
        req.session.error = 'Bad response from token endpoint'
      res.redirect('/error')
    }
  } catch (err) {
    console.log('Error getting token', err)
    // res.render("error", {
    //   message: `Error getting token: ${JSON.stringify(err, null, 2)}`
    // });
    if (req && req.session) req.session.error = 'Error getting token'
    res.redirect('/error')
  }
})

app.post('/notifiers', (req, res) => {
  if (!req.body.notifiers) {
    return res.status(400).json({ error: 'Missing notifiers' })
  }
  if (!req.session.me) {
    return res.json({ error: 'Not logged in' })
  }

  db.get('users')
    .find({ me: req.session.me })
    .set('notifiers', req.body.notifiers)
    .write()
  res.json({ error: null })
})

app.post('/setup', async (req, res) => {
  const user = await getUser(req.session.me)
  if (!user) {
    // return res.render("error", { message: "You need to log in" });
    if (req && req.session)
      req.session.error = 'You need to be logged in to update your settings'
    return res.redirect('/error')
  }
  let webhooks = req.body.webhook

  webhooks = webhooks
    .map((url, i) => {
      if (!url || !req.body.webhook_json[i]) {
        return null
      }
      return {
        url,
        json: req.body.webhook_json[i],
      }
    })
    .filter(webhook => webhook)

  // Delete all existing channels that are unchecked
  if (user.notificationChannels) {
    for (const uid in user.notificationChannels) {
      if (
        user.notificationChannels.hasOwnProperty(uid) &&
        (!req.body.channels || !req.body.channels.includes(uid))
      ) {
        delete user.notificationChannels[uid]
      }
    }
  } else {
    user.notificationChannels = {}
  }

  // Add new channels to notification channels
  req.body.channels.forEach(uid => {
    if (!user.notificationChannels[uid]) {
      user.notificationChannels[uid] = null
    }
  })

  // Update in database
  db.get('users')
    .find({ me: user.me })
    .set('notifiers.webhooks', webhooks)
    .set('notificationChannels', user.notificationChannels)
    .write()

  // Redirect back to page
  res.redirect('/setup')
})

export default app
