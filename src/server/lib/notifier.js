import axios from 'axios'
import nunjucks from 'nunjucks'
import db from './db'
import notifierObjects from '../../notifiers/index'

const notify = async () => {
  const users = db.get('users').value()
  for (const user of users) {
    if (user.notifiers) {
      let notifierIndex = -1
      for (const notifier of user.notifiers) {
        notifierIndex++
        if (notifier.channels && notifier.notifier && notifier.notifier.type) {
          const notificationPosts = []
          for (const uid in notifier.channels) {
            if (notifier.channels.hasOwnProperty(uid)) {
              const before = notifier.channels[uid]
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
                      .set(
                        `notifiers.${notifierIndex}.channels.${uid}`,
                        posts.data.paging.before
                      )
                      .write()
                  }
                  for (const post of posts.data.items) {
                    if (!post._is_read) {
                      notificationPosts.push({
                        post,
                        channel: user.channels.find(
                          channel => channel.uid == uid
                        ),
                      })
                    }
                  }
                }
              } catch (err) {
                console.log('Error getting posts for notifications', err)
              }
            }
          }
          const sender = notifierObjects.find(
            n => n.id === notifier.notifier.type
          ).sender
          if (sender) {
            for (const post of notificationPosts) {
              try {
                await sender({
                  options: notifier.notifier.options,
                  channel: post.channel,
                  post: post.post,
                })
              } catch (err) {
                console.log(
                  `Error sending ${notifier.notifier.type} notification for ${
                    user.me
                  }`,
                  err
                )
              }
            }
          }
        }
      }
    }
  }
}

export default notify
