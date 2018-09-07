import React, { Fragment } from 'react'
import { Form, Input, Checkbox } from 'antd'
import nunjucks from 'nunjucks'
import mailer from '../server/lib/mailer'
const FormItem = Form.Item
const TextArea = Input.TextArea

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
    <FormItem label="Subject">
      <Input
        value={options.subject}
        type="text"
        onChange={e =>
          setOptions(Object.assign({}, options, { subject: e.target.value }))
        }
        required
      />
    </FormItem>
    <FormItem label="Message">
      <TextArea
        value={options.message}
        autosize
        onChange={e =>
          setOptions(Object.assign({}, options, { message: e.target.value }))
        }
        required
      />
    </FormItem>
    <FormItem>
      <Checkbox
        checked={options.attachHtml}
        onChange={e =>
          setOptions(
            Object.assign({}, options, { attachHtml: e.target.checked })
          )
        }
      >
        Attach as html file (can be used to send to kindle)
      </Checkbox>
    </FormItem>
    <small>
      You can use{' '}
      <a
        href="https://mozilla.github.io/nunjucks/"
        target="_blank"
        rel="noopener noreferrer"
      >
        nunjucks
      </a>{' '}
      templating inside the subject and message to pull out information on the
      post and channel. A <code>{'{{post}}'}</code> and{' '}
      <code>{'{{channel}}'}</code> are both available
    </small>
  </Fragment>
)

const sender = async ({ options, channel, post }) => {
  const email = options.email
  const subject = nunjucks.renderString(options.subject, { channel, post })
  const message = nunjucks.renderString(options.message, { channel, post })
  const htmlAttachment = options.htmlAttachment
    ? nunjucks.renderString(
        `
      <html>
        <head>
          <title>{{post.name}} - via {{channel.name}}</title>
        </head>
        <body>
          <h1>{{post.name}}</h1>
          {{post.content.html}}
          <hr />
          <p><small>
            Originally found on your {{channel.name}} microsub channel
            and delivered via <a href="https://microsub-notifier.tpxl.io">Microsub Notifier</a>
          </small></p>
        </body>
      </html>
    `,
        { channel, post }
      )
    : null
  await mailer(email, subject, message, htmlAttachment)
  return true
}

export default {
  id: 'email',
  name: 'Email',
  defaultOptions: {
    email: '',
    subject: "Hey there's a new post in your microsub server",
    message: '{{channel.name}} - {{post.name}} {{post.content.text}}',
    attachHtml: false,
  },
  component: Notifier,
  sender,
}
