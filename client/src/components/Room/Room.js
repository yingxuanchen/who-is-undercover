import React, { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import axios from 'axios';
import openSocket from 'socket.io-client';
import { makeStyles } from '@material-ui/core/styles';
import {
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Radio,
  RadioGroup,
  TextField,
  Typography
} from '@material-ui/core';
import AlertDialog from '../common/AlertDialog';
import WordCard from '../WordCard/WordCard';

const useStyles = makeStyles({
  list: {
    textAlign: 'center'
  },
});

const Room = (props) => {
  const classes = useStyles();

  const roomId = props.location.data ? props.location.data.roomId : null;
  const username = props.location.data ? props.location.data.username : null;

  const [ roomState, setRoomState ] = useState(null);
  const [ userState, setUserState ] = useState(null);
  const [ inputState, setInputState ] = useState({
    antiCount: 1,
    blankCount: 0
  });
  const [ chosenUserState, setChosenUserState ] = useState(null);
  const [ dialogState, setDialogState ] = useState(false);
  const [ dialogPropsState, setDialogPropsState ] = useState({
    onClose: null,
    title: '',
    message: '',
    onCancel: null,
    onConfirm: null
  });
  const [ messageState, setMessageState ] = useState(null);

  useEffect(() => {
    const socket = openSocket();
    socket.on('room' + roomId, data => {
      setRoomState(data.room);
      const user = data.room.users.find(user => user.name === username);
      if (user) {
        setUserState(user);
      }

      if (data.userVotedOut) {
        const usernameVotedOut = data.room.users[data.userVotedOut].name;
        setMessageState(`${usernameVotedOut} was voted out!`);
      } else {
        setMessageState(null);
      }
    });

    return () => {
      // confirmLeaveGame();
      socket.close();
      console.log(`Client disconnected: id=${socket.id}, roomId=${roomId}, username=${username}`);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!roomId || !username) {
      return;
    }

    axios.post('/room', { roomId: roomId, username: username })
      .then(res => {
        setRoomState(res.data.room);
        setUserState(res.data.user);
      })
      .catch(err => console.log(err));
  }, [roomId, username]);

  const handleInputChange = (event) => {
    const updatedInputState = {...inputState, [event.target.name]: +event.target.value};
    setInputState(updatedInputState);
  };

  const handleLeaveRoom = () => {
    axios.post('/leave-room', { roomId: roomId, username: username })
      .then(res => {
        return props.history.replace('/');
      })
      .catch(err => console.log(err));
  };

  const handleStartGame = () => {
    axios.post('/start-game', 
      { room: { roomId: roomId, antiCount: inputState.antiCount, blankCount: inputState.blankCount }})
      .then()
      .catch(err => console.log(err));
  };

  const handleEndGame = () => {
    setDialogState(true);
    setDialogPropsState({
      onClose: handleCloseDialog,
      title: 'Confirm End Game?',
      message: "The game will end and all words will be shown to all users.",
      onCancel: handleCloseDialog,
      onConfirm: confirmEndGame
    });
  };

  const confirmEndGame = () => {
    axios.post('/end-game', { roomId: roomId })
      .then(res => setDialogState(false))
      .catch(err => console.log(err));
  };

  const handleLeaveGame = () => {
    setDialogState(true);
    setDialogPropsState({
      onClose: handleCloseDialog,
      title: 'Confirm Leave Game?',
      message: "All users will go back to the waiting area.",
      onCancel: handleCloseDialog,
      onConfirm: confirmLeaveGame
    });
  };

  const confirmLeaveGame = () => {
    axios.post('/leave-game', { roomId: roomId })
      .then(res => setDialogState(false))
      .catch(err => console.log(err));
  };

  const handleCloseDialog = () => {
    setDialogState(false);
  };

  const handleEndTurn = () => {
    axios.post('/end-turn', { roomId: roomId })
      .then(res => setChosenUserState(null))
      .catch(err => console.log(err));
  };

  const handleChooseUser = (event) => {
    setChosenUserState(event.target.value.toString());
  };

  const handleVote = () => {
    if (!chosenUserState) {
      return;
    }

    if (roomState.currentTurn === 'hostVoting') {
      axios.post('/host-vote', { roomId: roomId, chosenUser: chosenUserState })
        .then()
        .catch(err => console.log(err));
    } else {
      axios.post('/vote', { roomId: roomId, username: username, chosenUser: chosenUserState })
        .then()
        .catch(err => console.log(err));
    }
  };

  const getUserString = (user, index) => {
    return user.name + 
    (user.name === username ? ' (Me)' : '') + 
    (user.isHost ? ' (Host)' : '') +
    (roomState.currentTurn === index ? ' (Speaking)' : '') +
    (user.isOut ? ' (Out)' : '') +
    (roomState.currentTurn === 'ended' ? ' - ' + user.card : '');
  };

  const getVoteMessage = () => {
    if (roomState.currentTurn === 'hostVoting') {
      return 'Please discuss and only host can vote';
    }
    if (userState.isOut) {
      return 'You cannot vote because you are out';
    }
    if (userState.hasVoted) {
      return 'Please wait for others to vote';
    }
    if (!chosenUserState) {
      return 'Please choose a user';
    }
    return '';
  };

  const getWinnerMessage = (winner) => {
    if (winner === undefined) {
      return 'There is no winner as the game was ended prematurely.';
    }
    if (typeof winner === 'number') {
      return `${roomState.users[winner].name} wins as the only Blank left!`;
    }
    let groupName = '';
    switch (winner) {
      case 'norm': groupName = 'Civilians'; break;
      case 'anti': groupName = 'Undercovers'; break;
      case 'blank': groupName = 'Blanks'; break;
      default: groupName = 'Unknown'; break;
    }
    return `The ${groupName} win!`;
  };

  if (!props.location.data) {
    return <Redirect to='/' />;
  }

  return (roomState && userState &&
    <div>
      <Typography variant='h6'>
        <Grid container spacing={1}>
          <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Room Id:</Grid><Grid item xs={5} sm={2}>{roomState.roomId}</Grid><Grid item xs={1} sm={4}/>
          <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Total:</Grid><Grid item xs={5} sm={2}>{roomState.totalCount}</Grid><Grid item xs={1} sm={4}/>

          {(roomState.hasStarted || userState.isHost) &&
            <React.Fragment>
              <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Undercover:</Grid>
              <Grid item xs={5} sm={2}>
                {userState.isHost && !roomState.hasStarted ?
                  <TextField type='number' fullWidth id='antiCount' name='antiCount' label='Undercover' defaultValue={inputState.antiCount}
                    inputProps={{min: '1', max: `${parseInt(roomState.totalCount/3)}`}} onChange={handleInputChange} />
                  : roomState.antiCount
                }
              </Grid>
              <Grid item xs={1} sm={4}/>

              <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Blank:</Grid>
              <Grid item xs={5} sm={2}>
                {userState.isHost && !roomState.hasStarted ?
                  <TextField type='number' fullWidth id='blankCount' name='blankCount' label='Blank' defaultValue={inputState.blankCount}
                    inputProps={{min: '0', max: `${roomState.totalCount < 4 ? '0' : '1'}`}} onChange={handleInputChange} />
                  : roomState.blankCount
                }
              </Grid>
              <Grid item xs={1} sm={4}/> 
            </React.Fragment>
          }

          <Grid item xs={1}/>
            <Grid item xs={10}>
              {!roomState.hasStarted &&
                <Button variant='contained' onClick={handleLeaveRoom}>Leave Room</Button>
              }
              {userState.isHost && !roomState.hasStarted &&
                <Button variant='contained' color='primary' onClick={handleStartGame}
                  disabled={roomState.totalCount < 3 ? true : false} >
                  Start Game
                </Button>
              }
              {userState.isHost && roomState.hasStarted && !(roomState.currentTurn === 'ended') &&
                <Button variant='contained' onClick={handleEndGame}>
                  End Game
                </Button>
              }
              {userState.isHost && roomState.currentTurn === 'ended' &&
                <Button variant='contained' onClick={handleLeaveGame}>
                  Leave Game
                </Button>
              }
            </Grid>
          <Grid item xs={1}/>
        </Grid>
      </Typography>
      <br/>

      {!roomState.hasStarted &&
        <Typography color='error'>{roomState.totalCount < 3 ? 'Game must have at least 3 users' : ''}</Typography>
      }
      <Typography variant='h6' color='primary'>
        {messageState}
      </Typography>
      {roomState.currentTurn === 'ended' && 
        <Typography variant='h6' color='primary'>
          Game has ended! <br/>
          {getWinnerMessage(roomState.winner)}
        </Typography>
      }

      {roomState.hasStarted && (roomState.currentTurn === 'voting' || roomState.currentTurn === 'hostVoting') ?
        <React.Fragment>
          <FormControl component="fieldset">
            <FormLabel component="legend">Users</FormLabel>
            <RadioGroup aria-label="users" name="users" value={chosenUserState} onChange={handleChooseUser}>
              {roomState.users.map((user, index) => {
                return (
                  <FormControlLabel
                    key={index}
                    value={index.toString()}
                    disabled={user.isOut || userState.hasVoted || (roomState.currentTurn === 'hostVoting' && !roomState.usersWithMostVotes.includes(index))}
                    control={<Radio />}
                    label={getUserString(user, index)} />
                )
              })}
            </RadioGroup>
            <FormHelperText>{getVoteMessage()}</FormHelperText>
            <Button variant='contained' color='primary'
              disabled={(roomState.currentTurn === 'hostVoting' && !userState.isHost) || 
                (roomState.currentTurn === 'voting' && userState.isOut) || 
                userState.hasVoted}
              onClick={handleVote}>
              Vote
            </Button>
          </FormControl>
          <p></p>
        </React.Fragment> :

        <List subheader={
          <ListSubheader>
            Users
          </ListSubheader>
        }>
          {roomState.users.map((user, index) => {
            return (
              <React.Fragment key={index}>
                <ListItem className={classes.list}>
                  <ListItemText primary={getUserString(user, index)} />
                </ListItem>
                {user.name === username && roomState.currentTurn === index &&
                  <Button variant='contained' color='primary' onClick={handleEndTurn}>
                    End Turn
                  </Button>
                }
              </React.Fragment>
            )
          })}
        </List>
      }

      {roomState.hasStarted &&
        <WordCard word={userState.card} />
      }

      <AlertDialog 
        open={dialogState}
        onClose={dialogPropsState.onClose}
        title={dialogPropsState.title}
        message={dialogPropsState.message}
        onCancel={dialogPropsState.onCancel}
        onConfirm={dialogPropsState.onConfirm} />
    </div>
  );
};

export default Room;