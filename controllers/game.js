const Room = require('../models/room');
const Card = require('../models/card');
const io = require('../socket');

exports.enterRoom = (req, res, next) => {
  const roomId = req.body.roomId;
  const username = req.body.username;

  Room.findByRoomId(roomId)
    .then(room => {
      if (!room) {
        const room = new Room(roomId, username);
        return room.insert();
      }

      if (room.hasStarted) {
        res.status(403).json({ error: 'game has started' });
        return null;
      }

      const usernames = room.users.map(user => user.name);
      if (usernames.includes(username)) {
        res.status(403).json({ error: 'username already exists' });
        return null;
      }
      
      const updatedRoom = {...room};
      updatedRoom.totalCount += 1;
      updatedRoom.users.push({ name: username, isHost: false });
      return Room.updateRoom(updatedRoom);
    })
    .then(room => {
      if (room) {
        io.getIO().emit('room' + room.roomId, { action: 'enterRoom', room: room });
        return res.sendStatus(200);
      }
    })
    .catch(err => console.log(err));
};

exports.leaveRoom = (req, res, next) => {
  const roomId = req.body.roomId;
  const username = req.body.username;

  Room.findByRoomId(roomId)
    .then(room => {
      if (!room) {
        res.status(400).json({ error: 'room does not exist' });
        return null;
      }
      
      if (room.users.length === 1) {
        return Room.deleteRoom(room);
      }

      const updatedRoom = {...room};
      updatedRoom.totalCount -= 1;
      updatedRoom.users = room.users.filter(user => user.name !== username);

      const user = room.users.find(user => user.name === username);
      if (user.isHost) {
        updatedRoom.users[0].isHost = true;
      }
      
      return Room.updateRoom(updatedRoom);
    })
    .then(room => {
      if (room) {
        io.getIO().emit('room' + room.roomId, { action: 'leaveRoom', room: room });
        return res.sendStatus(200);
      }
    })
    .catch(err => console.log(err));
};

exports.getRoom = (req, res, next) => {
  const roomId = req.body.roomId;
  const username = req.body.username;

  Room.findByRoomId(roomId)
    .then(room => {
      if (!room) {
        return res.status(400).json({ error: 'room does not exist' });
      }
      const user = room.users.find(user => user.name === username);
      return res.status(200).send({ room: room, user: user });
    })
    .catch(err => console.log(err));
};

exports.startGame = (req, res, next) => {
  const room = req.body.room;
  let updatedRoom;

  Room.findByRoomId(room.roomId)
    .then(oldRoom => {
      if (!oldRoom) {
        res.status(400).json({ error: 'room does not exist' });
        return null;
      }
      updatedRoom = {...oldRoom};
      return Card.getOne();
    })
    .then(card => {
      if (!card) {
        return null;
      }

      updatedRoom = Object.assign(updatedRoom, room,
        {
          hasStarted: true,
          firstTurn: 0, 
          currentTurn: 0, 
          votes: [],
          currentCount: updatedRoom.totalCount
        }
      );
      
      const roleCardArray = getRoleCardArray(card, updatedRoom.totalCount, updatedRoom.antiCount, updatedRoom.blankCount);
      shuffleArray(updatedRoom.users);
      updatedRoom.users.forEach((user, index) => {
        user.role = roleCardArray[index].role;
        user.card = roleCardArray[index].card;
        user.isOut = false;
      });
      do {
        shuffleArray(updatedRoom.users)
      } while (updatedRoom.users[0].role === 'blank');

      return Room.updateRoom(updatedRoom);
    })
    .then(updatedRoom => {
      if (updatedRoom) {
        io.getIO().emit('room' + updatedRoom.roomId, { action: 'startGame', room: updatedRoom });
        return res.sendStatus(200);
      }
    })
    .catch(err => console.log(err));
};

exports.endGame = (req, res, next) => {
  const roomId = req.body.roomId;

  Room.findByRoomId(roomId)
    .then(room => {
      if (!room) {
        res.status(400).json({ error: 'room does not exist' });
        return null;
      }
      const updatedRoom = {...room, currentTurn: 'ended' };
      if (req.body.winner) {
        updatedRoom.winner = req.body.winner;
      }
      return Room.updateRoom(updatedRoom);
    })
    .then(updatedRoom => {
      if (updatedRoom) {
        io.getIO().emit('room' + updatedRoom.roomId, { action: 'endGame', room: updatedRoom });
        return res.sendStatus(200);
      }
    })
    .catch(err => console.log(err));
};

exports.leaveGame = (req, res, next) => {
  const roomId = req.body.roomId;

  Room.findByRoomId(roomId)
    .then(room => {
      if (!room) {
        res.status(400).json({ error: 'room does not exist' });
        return null;
      }

      const updatedRoom = {...room, hasStarted: false };
      delete updatedRoom.currentTurn;
      delete updatedRoom.firstTurn;
      delete updatedRoom.currentCount;
      updatedRoom.users.forEach(user => {
        delete user.isOut;
        delete user.role;
        delete user.card;
      });

      return Room.updateRoom(updatedRoom);
    })
    .then(updatedRoom => {
      if (updatedRoom) {
        io.getIO().emit('room' + updatedRoom.roomId, { action: 'leaveGame', room: updatedRoom });
        return res.sendStatus(200);
      }
    })
    .catch(err => console.log(err));
};

exports.endTurn = (req, res, next) => {
  const room = req.body.room;

  const nextTurn = getNextTurn(room.users, +room.currentTurn, +room.firstTurn, room.totalCount);

  const updatedRoom = {...room, currentTurn: nextTurn };
  if (nextTurn === 'voting') {
    updatedRoom.users.forEach(user => user.hasVoted = false);
  }

  io.getIO().emit('room' + updatedRoom.roomId, { action: 'endTurn', room: updatedRoom });
  return res.sendStatus(200);
};

exports.vote = (req, res, next) => {
  const roomId = req.body.roomId;
  const username = req.body.username;
  const chosenUser = req.body.chosenUser;

  Room.findByRoomId(roomId)
    .then(room => {
      if (!room) {
        res.status(400).json({ error: 'room does not exist' });
        return null;
      }

      const updatedRoom = {...room, currentTurn: 'voting'};
      updatedRoom.votes.push(chosenUser);
      const userIndex = updatedRoom.users.findIndex(user => user.name === username);
      updatedRoom.users[userIndex].hasVoted = true;

      if (updatedRoom.votes.length === updatedRoom.currentCount) {
        const countDict = getCountDict(updatedRoom.votes);
        let mostVotes = 0;
        let usersWithMostVotes;
        for (const index in countDict) {
          const i = +index;
          if (countDict[i] > mostVotes) {
            usersWithMostVotes = [i];
            mostVotes = countDict[i];
          } else if (countDict[i] === mostVotes) {
            usersWithMostVotes.push(i);
          }
        }

        if (usersWithMostVotes.length > 1) {
          updatedRoom.votes = [];
          updatedRoom.currentTurn = 'hostVoting';
          updatedRoom.usersWithMostVotes = [...usersWithMostVotes];
        } else {
          updatedRoom.votes = [];
          updatedRoom.users[usersWithMostVotes[0]].isOut = true;
          updatedRoom.firstTurn = getFirstTurn(updatedRoom.users, usersWithMostVotes[0], updatedRoom.totalCount);
          updatedRoom.currentTurn = updatedRoom.firstTurn;
          updatedRoom.currentCount -= 1;
          delete updatedRoom.usersWithMostVotes;
        }

        updatedRoom.users.forEach(user => delete user.hasVoted);
      }
      
      return Room.updateRoom(updatedRoom);
    })
    .then(updatedRoom => {
      if (updatedRoom) {
        if (shouldEndGame(updatedRoom.users, updatedRoom.currentCount)) {
          req.body.winner = getWinner(updatedRoom.users, updatedRoom.currentCount);
          next();
        } else {
          io.getIO().emit('room' + updatedRoom.roomId, { action: 'vote', room: updatedRoom });
          return res.sendStatus(200);
        }
      }
    })
    .catch(err => console.log(err));
};

exports.hostVote = (req, res, next) => {
  const roomId = req.body.roomId;
  const chosenUser = req.body.chosenUser;

  Room.findByRoomId(roomId)
    .then(room => {
      if (!room) {
        res.status(400).json({ error: 'room does not exist' });
        return null;
      }

      const updatedRoom = {...room};
      updatedRoom.votes = [];
      updatedRoom.users[chosenUser].isOut = true;
      updatedRoom.firstTurn = getFirstTurn(updatedRoom.users, chosenUser, updatedRoom.totalCount);
      updatedRoom.currentTurn = updatedRoom.firstTurn;
      updatedRoom.currentCount -= 1;
      delete updatedRoom.usersWithMostVotes;

      return Room.updateRoom(updatedRoom);
    })
    .then(updatedRoom => {
      if (updatedRoom) {
        if (shouldEndGame(updatedRoom.users, updatedRoom.currentCount)) {
          req.body.winner = getWinner(updatedRoom.users, updatedRoom.currentCount);
          next();
        } else {
          io.getIO().emit('room' + updatedRoom.roomId, { action: 'hostVote', room: updatedRoom });
          return res.sendStatus(200);
        }
      }
    })
    .catch(err => console.log(err));
};

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

function shuffleArray(arr) {
  let i, index, temp;
  for (i = 0; i < arr.length; i++) {
    index = getRandomInt(0, arr.length);
    temp = arr[i];
    arr[i] = arr[index];
    arr[index] = temp;
  }
}

function getRoleCardArray(card, totalCount, antiCount, blankCount) {
  const randomBool = Math.random() >= 0.5;
  const normCard = randomBool ? card.a : card.b;
  const antiCard = randomBool ? card.b : card.a;

  const normCount = totalCount - antiCount - blankCount;
  let arr = [];
  let i;
  for (i = 0; i < normCount; i++) {
    arr.push({ role: 'norm', card: normCard });
  }
  for (i = 0; i < antiCount; i++) {
    arr.push({ role: 'anti', card: antiCard });
  }
  for (i = 0; i < blankCount; i++) {
    arr.push({ role: 'blank', card: '' });
  }

  return arr;
}

function getCountDict(arr) {
  return arr.reduce((acc, el) => {
    acc[el] = acc[el] ? acc[el] + 1 : 1;
    return acc;
  }, {});
}

function getNextTurn(usersArray, currentTurn, firstTurn, totalCount) {
  let nextTurn = currentTurn;
  do {
    nextTurn = (nextTurn + 1) % totalCount === firstTurn ? 'voting' : (nextTurn + 1) % totalCount;
  } while (nextTurn !== 'voting' && usersArray[nextTurn].isOut);
  return nextTurn;
}

function getFirstTurn(usersArray, outIndex, totalCount) {
  let firstTurn = outIndex;
  do {
    firstTurn = (firstTurn + 1) % totalCount;
  } while (usersArray[firstTurn].isOut);
  return firstTurn;
}

function shouldEndGame(users, currentCount) {
  if (currentCount <= 2) {
    return true;
  }
  
  const inUsers = users.filter(user => !user.isOut);
  const firstRole = inUsers[0].role;
  for (let i = 1; i < inUsers.length; i++) {
    if (inUsers[i].role !== firstRole) {
      return false;
    }
  }
  return true;
}

function getWinner(users, currentCount) {
  const inUsers = users.filter(user => !user.isOut);

  if (currentCount > 2) {
    return inUsers[0].role;
  }

  const blankUsers = inUsers.filter(user => user.role === 'blank');
  if (blankUsers.length === 2) {
    return 'blank';
  } else if (blankUsers.length === 1) {
    return users.findIndex(user => user.name === blankUsers[0].name);
  }

  return inUsers.filter(user => user.role === 'anti').length > 0 ? 'anti' : 'norm';
}