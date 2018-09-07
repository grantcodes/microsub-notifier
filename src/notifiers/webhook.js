import axios from 'axios'
import nunjucks from 'nunjucks'
import React, { Fragment } from 'react'
import { Form, Input } from 'antd'
const FormItem = Form.Item
const TextArea = Input.TextArea

const Notifier = ({ options, setOptions }) => (
  <Fragment>
    <FormItem label="URL">
      <Input
        value={options.url}
        type="url"
        onChange={e =>
          setOptions(Object.assign({}, options, { url: e.target.value }))
        }
        required
      />
    </FormItem>
    <FormItem label="JSON">
      <TextArea
        value={options.json}
        autosize
        onChange={e =>
          setOptions(Object.assign({}, options, { json: e.target.value }))
        }
        required
      />
    </FormItem>
  </Fragment>
)

const sender = async ({ options, post, channel }) => {
  const json = nunjucks
    .renderString(options.json, { post, channel })
    .replace(/\r?\n|\r/g, '')
  await axios({
    method: 'post',
    url: options.url,
    data: json,
    headers: { 'Content-Type': 'application/json' },
  })
  console.log('Sent webhook')
  return true
}

export default {
  id: 'webhook',
  name: 'Webhook',
  defaultOptions: {
    url: '',
    json: JSON.stringify(
      {
        value1: '{{channel.name}}',
        value2: '{{post.name}}',
      },
      null,
      2
    ),
  },
  component: Notifier,
  sender: sender,
}
