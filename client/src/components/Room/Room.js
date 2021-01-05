import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import axios from 'axios';
import openSocket from 'socket.io-client';
import {
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Typography
} from '@material-ui/core';
import AlertDialog from '../common/AlertDialog';
import WordCard from '../WordCard/WordCard';
import UserList from '../UserList/UserList';
import UserListDnd from '../UserListDnd/UserListDnd';
import { getUserString } from '../../shared/utils';
import * as actionTypes from '../../store/actions';

const Room = (props) => {
  const onUpdateRoom = props.onUpdateRoom;
  
  const roomId = props.location.data ? props.location.data.roomId : null;
  const username = props.location.data ? props.location.data.username : null;

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
  const [ randomOrderState, setRandomOrderState ] = useState(false);

  useEffect(() => {
    const socket = openSocket();
    socket.on('room' + roomId, data => {
      props.onUpdateRoom(data.room);
      const user = data.room.users.find(user => user.name === username);
      if (user) {
        setUserState(user);
      }

      if (data.userVotedOut !== undefined && data.userVotedOut !== null) {
        const usernameVotedOut = data.room.users[data.userVotedOut].name;
        setMessageState(`${usernameVotedOut} was voted out!`);
        setChosenUserState(null);
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
        onUpdateRoom(res.data.room);
        setUserState(res.data.user);
      })
      .catch(err => console.log(err));
  }, [roomId, username, onUpdateRoom]);

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
      { 
        room: {
          roomId: roomId,
          antiCount: inputState.antiCount,
          blankCount: inputState.blankCount,
          users: props.room.users
        },
        randomOrder: randomOrderState
      })
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
      .then()
      .catch(err => console.log(err));
  };

  const handleChooseUser = (event) => {
    setChosenUserState(event.target.value.toString());
  };

  const handleVote = () => {
    if (!chosenUserState) {
      return;
    }

    if (props.room.currentTurn === 'hostVoting') {
      axios.post('/host-vote', { roomId: roomId, chosenUser: chosenUserState })
        .then()
        .catch(err => console.log(err));
    } else {
      axios.post('/vote', { roomId: roomId, username: username, chosenUser: chosenUserState })
        .then()
        .catch(err => console.log(err));
    }
  };

  const handleOrderSwitch = () => {
    setRandomOrderState(!randomOrderState);
  };

  const getVoteMessage = () => {
    if (props.room.currentTurn === 'hostVoting') {
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
      return `${props.room.users[winner].name} wins as the only Blank left!`;
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

  return (props.room && userState &&
    <div>
      <Typography variant='h6'>
        <Grid container spacing={1}>
          <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Room Id:</Grid><Grid item xs={5} sm={2}>{props.room.roomId}</Grid><Grid item xs={1} sm={4}/>
          <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Total:</Grid><Grid item xs={5} sm={2}>{props.room.totalCount}</Grid><Grid item xs={1} sm={4}/>

          {(props.room.hasStarted || userState.isHost) &&
            <React.Fragment>
              <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Undercover:</Grid>
              <Grid item xs={5} sm={2}>
                {userState.isHost && !props.room.hasStarted ?
                  <TextField type='number' fullWidth id='antiCount' name='antiCount' label='Undercover' defaultValue={inputState.antiCount}
                    inputProps={{min: '1', max: `${parseInt(props.room.totalCount/3)}`}} onChange={handleInputChange} />
                  : props.room.antiCount
                }
              </Grid>
              <Grid item xs={1} sm={4}/>

              <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Blank:</Grid>
              <Grid item xs={5} sm={2}>
                {userState.isHost && !props.room.hasStarted ?
                  <TextField type='number' fullWidth id='blankCount' name='blankCount' label='Blank' defaultValue={inputState.blankCount}
                    inputProps={{min: '0', max: `${props.room.totalCount < 4 ? '0' : '1'}`}} onChange={handleInputChange} />
                  : props.room.blankCount
                }
              </Grid>
              <Grid item xs={1} sm={4}/> 
            </React.Fragment>
          }

          <Grid item xs={1}/>
            <Grid item xs={10}>
              {!props.room.hasStarted &&
                <Button variant='contained' onClick={handleLeaveRoom}>Leave Room</Button>
              }
              {userState.isHost && !props.room.hasStarted &&
                <Button variant='contained' color='primary' onClick={handleStartGame}
                  disabled={props.room.totalCount < 3 ? true : false} >
                  Start Game
                </Button>
              }
              {userState.isHost && props.room.hasStarted && !(props.room.currentTurn === 'ended') &&
                <Button variant='contained' onClick={handleEndGame}>
                  End Game
                </Button>
              }
              {userState.isHost && props.room.currentTurn === 'ended' &&
                <Button variant='contained' onClick={handleLeaveGame}>
                  Leave Game
                </Button>
              }
            </Grid>
          <Grid item xs={1}/>
        </Grid>
      </Typography>
      <br/>

      {!props.room.hasStarted &&
        <Typography color='error'>{props.room.totalCount < 3 ? 'Game must have at least 3 users' : ''}</Typography>
      }
      <Typography variant='h6' color='primary'>
        {messageState}
      </Typography>
      {props.room.currentTurn === 'ended' && 
        <Typography variant='h6' color='primary'>
          Game has ended! <br/>
          {getWinnerMessage(props.room.winner)}
        </Typography>
      }

      {!props.room.hasStarted && userState.isHost &&
        <Typography component="div">
          <Grid component="label" container alignItems="center" justify="center" spacing={1}>
            <Grid item>Follow Order</Grid>
            <Grid item>
              <Switch checked={randomOrderState} onChange={handleOrderSwitch} color='primary' />
            </Grid>
            <Grid item>Random Order</Grid>
          </Grid>
        </Typography>
      }

      {props.room.hasStarted && (props.room.currentTurn === 'voting' || props.room.currentTurn === 'hostVoting') ?
        <React.Fragment>
          <FormControl component="fieldset">
            <FormLabel component="legend">Users</FormLabel>
            <RadioGroup aria-label="users" name="users" value={chosenUserState} onChange={handleChooseUser}>
              {props.room.users.map((user, index) => {
                return (
                  <FormControlLabel
                    key={index}
                    value={index.toString()}
                    disabled={user.isOut || userState.hasVoted || (props.room.currentTurn === 'hostVoting' && !props.room.usersWithMostVotes.includes(index))}
                    control={<Radio />}
                    label={getUserString(user, index, props.room.currentTurn, username)} />
                )
              })}
            </RadioGroup>
            <FormHelperText>{getVoteMessage()}</FormHelperText>
            <Button variant='contained' color='primary'
              disabled={(props.room.currentTurn === 'hostVoting' && !userState.isHost) || 
                (props.room.currentTurn === 'voting' && userState.isOut) || 
                userState.hasVoted}
              onClick={handleVote}>
              Vote
            </Button>
          </FormControl>
          <p></p>
        </React.Fragment> :

        !props.room.hasStarted && userState.isHost && !randomOrderState ?
        <UserListDnd username={username} handleEndTurn={handleEndTurn} /> :
        <UserList username={username} handleEndTurn={handleEndTurn} />
      }

      {props.room.hasStarted &&
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

const mapStateToProps = state => {
  return {
    room: state.room.room
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onUpdateRoom: (room) => dispatch({type: actionTypes.UPDATE_ROOM, room: room})
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Room);