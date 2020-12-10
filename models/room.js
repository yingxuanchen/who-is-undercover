const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;

// const ObjectId = mongodb.ObjectId;

class Room {
  constructor(roomId, username) {
    this.roomId = roomId;
    this.totalCount = 1;
    this.antiCount = 0;
    this.blankCount = 0;
    this.users = [{ name: username, isHost: true }];
    this.hasStarted = false;
    // this._id = id ? new ObjectId(id) : null;
  }

  insert() {
    const db = getDb();
    return db.collection('rooms').insertOne(this)
      .then(result => {
        return this;
      })
      .catch(err => console.log(err));
  }

  static updateRoom(room) {
    const db = getDb();
    return db.collection('rooms').replaceOne({ _id: room._id }, room)
      .then(result => {
        return room;
      })
      .catch(err => console.log(err));
  }

  static deleteRoom(room) {
    const db = getDb();
    return db.collection('rooms').deleteOne({ _id: room._id })
      .then(result => {
        return room;
      })
      .catch(err => console.log(err));
  }

  static findByRoomId(roomId) {
    const db = getDb();
    return db.collection('rooms').findOne({ roomId: roomId })
      .then(room => {
        return room;
      })
      .catch(err => console.log(err));
  }
}

module.exports = Room;