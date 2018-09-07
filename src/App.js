import React from 'react'
import { Route, Switch, Link } from 'react-router-dom'
import { Layout } from 'antd'
import Login from './components/Login'
import Setup from './components/Setup'
import Error from './components/Error'
import './App.css'
const { Header, Content, Footer } = Layout

const App = () => (
  <Layout className="layout">
    <Header className="header">
      <h1>
        <Link to="/">Microsub Notifier</Link>
      </h1>
    </Header>
    <Content className="content">
      <div className="content__inner">
        <Switch>
          <Route exact path="/" component={Login} />
          <Route exact path="/setup" component={Setup} />
          <Route exact path="/error" component={Error} />
        </Switch>
      </div>
    </Content>
    <Footer style={{ textAlign: 'center' }}>
      Microsub Notifer is made by <a href="https://grant.codes">grant.codes</a>
    </Footer>
  </Layout>
)

export default App
