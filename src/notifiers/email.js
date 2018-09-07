import React, { Fragment } from 'react'
import { Form, Input } from 'antd'
import nunjucks from 'nunjucks'
import mailer from '../server/lib/mailer'
const FormItem = Form.Item
const TextArea = Input.TextArea

const Notifier = ({ options, setOptions }) => (
  <Fragment>
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
      small>
        You can use{' '}
        <a href="https://mozilla.github.io/nunjucks/" target="_blank">
          nunjucks
        </a>{' '}
        templating inside the subject and message to pull out information on the post and
        channel. A <code>{'{{post}}'}</code> and <code>{'{{channel}}'}</code>{' '}
        are both available
      </small>
    </FormItem>
  </Fragment>
)

const sender = async ({ options, channel, post }) => {
  const email = options.email
  const subject = nunjucks.renderString(options.subject, { channel, post })
  const message = nunjucks.renderString(options.message, { channel, post })
  await mailer(email, subject, message)
  return true
}

export default {
  id: 'email',
  name: 'Email',
  defaultOptions: {
    email: '',
    subject: "Hey there's a new post in your microsub server",
    message: '{{channel.name}} - {{post.name}} {{post.content.text}}',
  },
  component: Notifier,
  sender,
}
