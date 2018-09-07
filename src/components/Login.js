import React from 'react'
import { Form, Icon, Input, Button } from 'antd'
const FormItem = Form.Item

const Login = () => (
  <Form
    className="login-form"
    onSubmit={e => console.log(e)}
    method="post"
    action="/api/login"
  >
    <FormItem label="Login with your domain">
      <Input
        type="url"
        size="large"
        name="me"
        prefix={<Icon type="link" style={{ color: 'rgba(0,0,0,.25)' }} />}
        placeholder="https://example.com"
      />
      <small>
        My apologies, but this isn't a very robust app at the moment. You
        probably need a trailing slash on the end of your url
      </small>
    </FormItem>
    <FormItem>
      <Button
        type="primary"
        size="large"
        htmlType="submit"
        className="login-form-button"
      >
        Log in
      </Button>
    </FormItem>
  </Form>
)

export default Login
