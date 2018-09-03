// const Datastore = require('nedb')
// const db = new Datastore(__dirname + '/../data/db')

// module.exports = () =>
//   new Promise(resolve => db.loadDatabase(err => resolve(db)))

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync(__dirname + '/../data/db.json')
const db = low(adapter)

// Set some defaults
db.defaults({ users: [] }).write()

module.exports = db
