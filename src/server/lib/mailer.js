let mailer = (email, subject, message) =>
  new Promise((resolve, reject) => {
    let nodemailer = null
    if (process.env.BUILD_TARGET === 'server') {
      nodemailer = require('nodemailer')
    }
    if (nodemailer) {
      const transporter = nodemailer.createTransport({
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail',
      })

      transporter.sendMail(
        {
          from: 'microsub-notifier@tpxl.io',
          to: email,
          subject: subject,
          text: message,
        },
        (err, info) => {
          if (err) {
            reject(err)
          } else {
            console.log('Email sent')
            resolve()
          }
        }
      )
    }
  })

export default mailer
