let mailer = (email, subject, message, htmlAttachment = null) =>
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

      let mail = {
        from: 'microsub-notifier@tpxl.io',
        to: email,
        subject: subject,
        text: message,
      }

      if (htmlAttachment) {
        mail.attachments = [
          {
            filename: subject ? `${subject}.html` : 'article.html',
            content: htmlAttachment,
          },
        ]
      }

      transporter.sendMail(mail, (err, info) => {
        if (err) {
          reject(err)
        } else {
          console.log('Email sent')
          resolve()
        }
      })
    }
  })

export default mailer
