const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;

class Card {
  constructor(num, a, b, language) {
    this.num = num;
    this.a = a;
    this.b = b;
    this.language = language;
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

  static dropCollection() {
    const db = getDb();
    return db.collection('cards').drop()
      .then(result => {
        console.log('collection "cards" dropped from db!');
      })
      .catch(err => console.log(err));
  }

  // static getOne() {
  //   const db = getDb();
  //   return db.collection('cards').countDocuments()
  //     .then(count => {
  //       const randomInt = getRandomIntInclusive(1, count);
  //       return db.collection('cards').findOne({ num: randomInt });
  //     })
  //     .then(card => {
  //       return card;
  //     })
  //     .catch(err => console.log(err));
  // }

  static getOne(languageArray) {
    const db = getDb();
    return db.collection('cards').aggregate([
      { $match: { language: { $in: languageArray } } },
      { $sample: { size: 1 } }
    ]).next();
  }
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive 
}

module.exports = Card;