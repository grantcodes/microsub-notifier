import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'

const adapter = new FileSync(__dirname + '/../data/db.json')
const db = low(adapter)

// Set some defaults
db.defaults({ users: [] }).write()

export default db
