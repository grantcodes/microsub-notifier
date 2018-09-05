require('dotenv').config()
const querystring = require('querystring')
const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const nunjucks = require('nunjucks')
const axios = require('axios')
const relParser = require('rel-parser')
const schedule = require('node-schedule')
const IndieAuthentication = require('indieauth-authentication')
const db = require('./lib/db')
const notify = require('./lib/notifier')

// Run notifier every minute
schedule.scheduleJob('* * * * *', notify)

const app = new express()

const getUser = me =>
  db
    .get('users')
    .find({ me })
    .value()

nunjucks.configure('views', {
  autoescape: true,
  express: app,
})

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

var sess = {
  secret: 'super secret session',
  cookie: {},
}

if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess))

app.set('views', __dirname + '/views')
app.set('view engine', 'njk')

app.get('/', (req, res) => {
  res.render('home', {})
})

app.get('/login', async (req, res) => {
  if (req.query.me) {
    req.session.me = req.query.me
    const rels = await relParser(req.query.me)
    if (
      !rels.authorization_endpoint ||
      !rels.token_endpoint ||
      !rels.microsub
    ) {
      console.log('Missing rels from ' + req.query.me, rels)
      res.render('error', {
        message: 'There was an error finding one of your required endpoints',
      })
    }

    const existingUser = await getUser(req.session.me)

    const user = {
      me: req.query.me,
      authEndpoint: rels.authorization_endpoint[0],
      tokenEndpoint: rels.token_endpoint[0],
      microsubEndpoint: rels.microsub[0],
    }

    if (existingUser) {
      db.get('users')
        .find({ me: req.query.me })
        .set('authEndpoint', rels.authorization_endpoint[0])
        .set('tokenEndpoint', rels.token_endpoint[0])
        .set('microsubEndpoint', rels.microsub[0])
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
      clientId: 'https://microsub-notifier.tpxl.io',
      redirectUri: 'https://microsub-notifier.tpxl.io/auth',
      scope: 'read',
    })

    const authUrl = await auth.getAuthUrl()

    res.redirect(authUrl + `&scope=read`)
  }
})

app.get('/auth', async (req, res) => {
  try {
    const user = await getUser(req.query.me)
    if (!user) {
      return res.render('error', { message: 'Error finding user' })
    }

    const data = {
      grant_type: 'authorization_code',
      me: user.me,
      code: req.query.code,
      scope: 'read',
      client_id: 'https://microsub-notifier.tpxl.io',
      redirect_uri: 'https://microsub-notifier.tpxl.io/auth',
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

    const response = await axios(request)

    if (response.data && response.data.access_token) {
      db.get('users')
        .find({ me: user.me })
        .set('token', response.data.access_token)
        .write()
      res.redirect('/setup')
    } else {
      console.log('Bad response from token endpoint', response)
      res.render('error', { message: 'Error getting token' })
    }
  } catch (err) {
    console.log('Error getting token', err)
    res.render('error', {
      message: `Error getting token: ${JSON.stringify(err, null, 2)}`,
    })
  }
})

app.get('/setup', async (req, res) => {
  try {
    const user = await getUser(req.session.me)
    if (!user) {
      return res.render('error', { message: "You're not logged in" })
    }
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
      return res.render('error', { message: 'Error getting channels' })
    }

    db.get('users')
      .find({ me: user.me })
      .set('channels', channels.data.channels)
      .write()

    const defaultWebhookJson = JSON.stringify(
      {
        value1: '{{channel.name}}',
        value2: '{{post.name}}',
      },
      null,
      2
    )

    res.render('setup', {
      user,
      channels: channels.data.channels,
      defaultWebhookJson,
    })
  } catch (err) {
    console.log('Setup page error', err)
    res.render('error', { message: 'Uh oh ' + err })
  }
})

app.post('/setup', async (req, res) => {
  const user = await getUser(req.session.me)
  if (!user) {
    return res.render('error', { message: 'You need to log in' })
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

const port = process.env.port || 3000
async function init() {
  app.listen(port, () => console.log(`listening on port ${port}`))
}
init()
