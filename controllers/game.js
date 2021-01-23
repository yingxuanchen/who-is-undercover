const Room = require('../models/room');
const Card = require('../models/card');
const io = require('../socket');
const Feedback = require('../models/feedback');

exports.feedback = (req, res, next) => {
  const name = req.body.name;
  const content = req.body.content;

  const feedback = new Feedback(name, content);
  feedback.insert()
    .then(feedback => {
      res.sendStatus(200);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: err });
    });
};

exports.checkSession = (req, res, next) => {
  const roomId = req.session.roomId;
  const username = req.session.username;

  if (!roomId || !username) {
    return res.sendStatus(200);
  }

  Room.findByRoomId(roomId)
    .then(room => {
      if (!room) {
        return req.session.destroy(err => {
          res.sendStatus(200);
        });
      }
      const user = room.users.find(user => user.name === username);
      if (!user) {
        return req.session.destroy(err => {
          res.sendStatus(200);
        });
      }
      return res.status(200).json({ roomId: roomId, username: username });
    })
    .catch(err => console.log(err));
};

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
        req.session.roomId = roomId;
        req.session.username = username;
        req.session.save(err => {
          io.getIO().emit('room' + room.roomId, { action: 'enterRoom', room: room });
          return res.sendStatus(200);
        });
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
        req.session.destroy(err => {
          io.getIO().emit('room' + room.roomId, { action: 'leaveRoom', room: room });
          return res.sendStatus(200);
        });
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
  const randomOrder = req.body.randomOrder;
  const languageArray = req.body.languageArray;
  let updatedRoom;

  Room.findByRoomId(room.roomId)
    .then(oldRoom => {
      if (!oldRoom) {
        res.status(400).json({ error: 'room does not exist' });
        return null;
      }
      updatedRoom = {...oldRoom};
      return Card.getOne(languageArray);
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
      updatedRoom.users.forEach((user, index) => {
        user.role = roleCardArray[index].role;
        user.card = roleCardArray[index].card;
        user.isOut = false;
      });

      if (randomOrder) {
        do {
          shuffleArray(updatedRoom.users);
        } while (updatedRoom.users[0].role === 'blank');
      } else {
        let firstTurn = 0;
        do {
          firstTurn = getRandomInt(0, updatedRoom.users.length);
        } while (updatedRoom.users[firstTurn].role === 'blank');
        updatedRoom.firstTurn = firstTurn;
        updatedRoom.currentTurn = firstTurn;
      }

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
        io.getIO().emit('room' + updatedRoom.roomId, { action: 'endGame', room: updatedRoom, userVotedOut: req.body.userVotedOut });
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
      delete updatedRoom.winner;
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
  const roomId = req.body.roomId;

  Room.findByRoomId(roomId)
    .then(room => {
      if (!room) {
        res.status(400).json({ error: 'room does not exist' });
        return null;
      }

      const nextTurn = getNextTurn(room.users, +room.currentTurn, +room.firstTurn, room.totalCount);

      const updatedRoom = {...room, currentTurn: nextTurn };
      if (nextTurn === 'voting') {
        updatedRoom.users.forEach(user => user.hasVoted = false);
      }

      return Room.updateRoom(updatedRoom);
    })
    .then(updatedRoom => {
      if (updatedRoom) {
        io.getIO().emit('room' + updatedRoom.roomId, { action: 'endTurn', room: updatedRoom });
        return res.sendStatus(200);
      }
    })
    .catch(err => console.log(err));
};

exports.vote = (req, res, next) => {
  const roomId = req.body.roomId;
  const username = req.body.username;
  const chosenUser = req.body.chosenUser;
  let userVotedOut = null;

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
          userVotedOut = usersWithMostVotes[0];
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
          req.body.userVotedOut = userVotedOut;
          next();
        } else {
          io.getIO().emit('room' + updatedRoom.roomId, { action: 'vote', room: updatedRoom, userVotedOut: userVotedOut });
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
          req.body.userVotedOut = chosenUser;
          next();
        } else {
          io.getIO().emit('room' + updatedRoom.roomId, { action: 'hostVote', room: updatedRoom, userVotedOut: chosenUser });
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

  do {
    shuffleArray(arr)
  } while (arr[0].role === 'blank');
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
  const normUsers = inUsers.filter(user => user.role === 'norm');
  const antiUsers = inUsers.filter(user => user.role === 'anti');

  if (inUsers.length === normUsers.length) {
    return true;
  }
  if (antiUsers.length > normUsers.length) {
    return true;
  }
  return false;
}

function getWinner(users, currentCount) {
  const inUsers = users.filter(user => !user.isOut);
  const normUsers = inUsers.filter(user => user.role === 'norm');
  const antiUsers = inUsers.filter(user => user.role === 'anti');
  const blankUsers = inUsers.filter(user => user.role === 'blank');

  if (inUsers.length === normUsers.length) {
    return 'norm';
  }
  if (antiUsers.length > normUsers.length) {
    return 'anti';
  }

  if (blankUsers.length === 2) {
    return 'blank';
  } else if (blankUsers.length === 1) {
    return users.findIndex(user => user.name === blankUsers[0].name);
  }

  return 'anti';
}