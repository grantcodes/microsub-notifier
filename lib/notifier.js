const axios = require('axios')
const nunjucks = require('nunjucks')
const db = require('./db')

const notify = async () => {
  const users = db.get('users').value()
  for (const user of users) {
    if (user.notificationChannels) {
      const notificationPosts = []
      for (const uid in user.notificationChannels) {
        if (user.notificationChannels.hasOwnProperty(uid)) {
          const before = user.notificationChannels[uid]
          let requestUrl = `${
            user.microsubEndpoint
          }?action=timeline&channel=${uid}`
          if (before) {
            requestUrl += `&before=${before}`
          }
          try {
            const posts = await axios({
              method: 'get',
              url: requestUrl,
              responseType: 'json',
              timeout: 8000,
              headers: {
                Authorization: 'Bearer ' + user.token,
              },
            })

            if (posts && posts.data && posts.data.items) {
              if (posts.data.paging && posts.data.paging.before) {
                db.get('users')
                  .find({ me: user.me })
                  .set(`notificationChannels.${uid}`, posts.data.paging.before)
                  .write()
              }
              for (const post of posts.data.items) {
                if (!post._is_read) {
                  notificationPosts.push({
                    post,
                    channel: user.channels.find(channel => channel.uid == uid),
                  })
                }
              }
            }
          } catch (err) {
            console.log('Error getting posts for notifications', err)
          }
        }

        for (const post of notificationPosts) {
          if (user.notifiers && user.notifiers.webhooks) {
            for (const webhook of user.notifiers.webhooks) {
              try {
                const json = nunjucks
                  .renderString(webhook.json, post)
                  .replace(/\r?\n|\r/g, '')
                await axios({
                  method: 'post',
                  url: webhook.url,
                  data: json,
                  headers: { 'Content-Type': 'application/json' },
                })
              } catch (err) {
                console.log('Error sending webmention', err)
              }
            }
          }
        }
      }
    }
  }
}

module.exports = notify
