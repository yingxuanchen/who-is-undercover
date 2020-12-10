const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;

class Card {
  constructor(num, a, b) {
    this.num = num;
    this.a = a;
    this.b = b;
    // this._id = id ? new ObjectId(id) : null;
  }

  insert() {
    const db = getDb();
    return db.collection('cards').insertOne(this)
      .then(result => {
        console.log('Inserted card: ' + JSON.stringify(this));
      })
      .catch(err => console.log(err));
  }

  static getOne() {
    const db = getDb();
    return db.collection('cards').countDocuments()
      .then(count => {
        const randomInt = getRandomIntInclusive(1, count);
        return db.collection('cards').findOne({ num: randomInt });
      })
      .then(card => {
        return card;
      })
      .catch(err => console.log(err));
  }
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive 
}

module.exports = Card;