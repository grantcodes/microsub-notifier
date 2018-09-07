import React, { Component } from 'react'
import { Form, Card, Radio, Select, Button } from 'antd'
import { Link } from 'react-router-dom'
import axios from 'axios'
import notifiers from '../notifiers'
const FormItem = Form.Item
const Option = Select.Option
const RadioButton = Radio.Button
const RadioGroup = Radio.Group

const user = typeof window !== 'undefined' ? window.microsubNotifierUser : {}

const blankNotificationSet = {
  channels: {},
  notifier: {
    type: notifiers[0].id,
    options: notifiers[0].defaultOptions,
  },
}

class Setup extends Component {
  constructor(props) {
    super(props)
    this.state = {
      sets: user.notifiers || [Object.assign({}, blankNotificationSet)],
    }
    this.addSet = this.addSet.bind(this)
    this.deleteSet = this.deleteSet.bind(this)
    this.channelChangeHandler = this.channelChangeHandler.bind(this)
    this.notificationTypeChangeHandler = this.notificationTypeChangeHandler.bind(
      this
    )
    this.notificationOptionsChangeHandler = this.notificationOptionsChangeHandler.bind(
      this
    )
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  addSet() {
    this.setState(state => ({
      sets: [...state.sets, Object.assign({}, blankNotificationSet)],
    }))
  }

  deleteSet(index) {
    const { sets } = this.state
    sets.splice(index, 1)
    this.setState({ sets: [...sets] })
  }

  channelChangeHandler = setIndex => channels => {
    let { sets } = this.state
    let newChannels = {}
    let oldChannels = sets[setIndex].channels
    channels.forEach(uid => {
      const value = oldChannels[uid] ? oldChannels[uid] : null
      newChannels[uid] = value
    })
    sets[setIndex].channels = newChannels
    this.setState({ sets: [...sets] })
  }

  notificationTypeChangeHandler = setIndex => e => {
    let { sets } = this.state
    const type = e.target.value
    const notifier = notifiers.find(n => n.id === type)
    const options =
      notifier && notifier.defaultOptions ? notifier.defaultOptions : {}
    sets[setIndex].notifier = { type, options }
    this.setState({ sets: [...sets] })
  }

  notificationOptionsChangeHandler = setIndex => options => {
    let { sets } = this.state
    let notifier = sets[setIndex].notifier
    notifier.options = options
    sets[setIndex].notifier = Object.assign({}, notifier)
    this.setState({ sets: [...sets] })
  }

  handleSubmit(e) {
    e.preventDefault()
    const { sets } = this.state
    if (e.target.checkValidity()) {
      // Check sets look good
      for (const set of sets) {
        if (set.channels.length === 0) {
          alert(
            "Wait a minute, you haven't selected channels to be notified about"
          )
          return false
        }
      }

      this.setState({ loading: true })
      try {
        const res = axios.post('/api/notifiers', {
          notifiers: sets,
          me: user.me,
        })
        if (!res || res.error) {
          alert('Error setting notifiers')
        } else {
          alert('Saved your notifications')
        }
      } catch (err) {
        alert('Error setting notifiers')
      }
      this.setState({ loading: false })
    }
    return false
  }

  render() {
    const { sets } = this.state
    if (!user || !user.channels) {
      return (
        <p>
          Whoa, you need to log in first: <Link to="/">Go home</Link>
        </p>
      )
    }
    return (
      <Form className="login-form" onSubmit={this.handleSubmit}>
        {sets.map((set, i) => {
          const NotifierOptions =
            notifiers.find(notifier => notifier.id === set.notifier.type)
              .component || null
          return (
            <Card
              title={`Notification Set ${i + 1}`}
              extra={
                <Button type="danger" onClick={() => this.deleteSet(i)}>
                  🗑 Delete
                </Button>
              }
              style={{ marginBottom: '2rem' }}
            >
              <FormItem label="Select Channels to receive notifications for">
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="No Channels Selected"
                  value={Object.keys(set.channels)}
                  onChange={this.channelChangeHandler(i)}
                  required
                >
                  {user.channels &&
                    user.channels.map(channel => (
                      <Option value={channel.uid} key={channel.uid}>
                        {channel.name}
                      </Option>
                    ))}
                </Select>
              </FormItem>

              <FormItem label="Select the type of notification you wish to receive">
                <RadioGroup
                  buttonStyle="solid"
                  size="large"
                  value={set.notifier.type}
                  style={{ display: 'flex', flexWrap: 'wrap' }}
                  onChange={this.notificationTypeChangeHandler(i)}
                >
                  {notifiers.map(notifier => (
                    <RadioButton
                      style={{ flexGrow: 1, textAlign: 'center' }}
                      value={notifier.id}
                    >
                      {notifier.name}
                    </RadioButton>
                  ))}
                </RadioGroup>
              </FormItem>

              {NotifierOptions && (
                <NotifierOptions
                  options={set.notifier.options}
                  setOptions={this.notificationOptionsChangeHandler(i)}
                />
              )}
            </Card>
          )
        })}

        <FormItem>
          <Button type="primary" size="large" onClick={this.addSet} ghost block>
            Add New Notification Set
          </Button>
        </FormItem>
        <FormItem>
          <Button type="primary" size="large" htmlType="submit" block>
            Save
          </Button>
        </FormItem>
      </Form>
    )
  }
}

export default Setup
