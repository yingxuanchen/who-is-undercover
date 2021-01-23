const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;

class Feedback {
  constructor(name, content) {
    this.name = name;
    this.content = content;
    // this._id = id ? new ObjectId(id) : null;
  }

  insert() {
    const db = getDb();
    return db.collection('feedback').insertOne(this)
      .then(result => {
        return this;
      })
      .catch(err => console.log(err));
  }
}

module.exports = Feedback;