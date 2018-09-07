import React, { Fragment } from 'react'
import { Link } from 'react-router-dom'

function Error({ error }) {
  if (!error && typeof window !== 'undefined' && window.microsubNotifierError) {
    error = window.microsubNotifierError
  }
  return (
    <Fragment>
      <h2>Oh no! Something went wrong!</h2>
      {error && <p>{error}</p>}
      <Link to="/">Maybe go home and try again</Link>
    </Fragment>
  )
}

export default Error
