import React, { Fragment } from 'react'
import { Form, Input } from 'antd'
import mailer from '../server/lib/mailer'
const FormItem = Form.Item

const Notifier = ({ options, setOptions }) => (
  <Fragment>
    <small>Emails are sent from microsub-notifier@tpxl.io</small>
    <FormItem label="Email Address">
      <Input
        value={options.email}
        type="email"
        onChange={e =>
          setOptions(Object.assign({}, options, { email: e.target.value }))
        }
        required
      />
    </FormItem>
  </Fragment>
)

const sender = async ({ options, channel, post }) => {
  if (
    process.env.BUILD_TARGET === 'server' &&
    post.content &&
    post.content.html
  ) {
    // Creates html and removes any non asci characters
    const html = `
      <html>
        <body>
          <h2>${post.name}</h2>
          ${post.content.html.replace(/[^\x00-\x7F]/g, '')}
          <hr />
          <p><small>
            Originally found on your ${channel.name} microsub channel
            and delivered via <a href="https://microsub-notifier.tpxl.io">Microsub Notifier</a>
          </small></p>
        </body>
      </html>
    `
    await mailer(options.email, post.name, '', html)
    console.log('Sent to kindle')
    return true
  }
  return false
}

export default {
  id: 'kindle',
  name: 'Kindle',
  defaultOptions: {
    email: '',
  },
  component: Notifier,
  sender,
}
