import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import axios from 'axios';
import openSocket from 'socket.io-client';
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Switch,
  Typography
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AlertDialog from '../common/AlertDialog';
import WordCard from '../WordCard/WordCard';
import UserList from '../UserList/UserList';
import UserListDnd from '../UserListDnd/UserListDnd';
import RoomInfo from '../RoomInfo/RoomInfo';
import { getUserString, getMinMaxAntiBlank } from '../../shared/utils';
import * as actionTypes from '../../store/actions';

const useStyles = makeStyles({
  language: {
    flexDirection: 'initial',
  },
  whiteSpace: {
    whiteSpace: 'pre-line',
  }
});

const Room = (props) => {
  const classes = useStyles();

  const onUpdateRoom = props.onUpdateRoom;
  const onUpdateUser = props.onUpdateUser;
  
  const roomId = props.location.data ? props.location.data.roomId : null;
  const username = props.location.data ? props.location.data.username : null;

  const languages = [
    { prop: 'english', label: 'English' },
    { prop: 'chinese', label: 'Chinese' }
  ];

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
  const [ languageState, setLanguageState ] = useState(languages.map(el => el.prop));

  const languageError = languageState.length < 1;

  useEffect(() => {
    const socket = openSocket();
    socket.on('room' + roomId, data => {
      props.onUpdateRoom(data.room);
      const user = data.room.users.find(user => user.name === username);
      if (user) {
        onUpdateUser(user);
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
        onUpdateUser(res.data.user);
      })
      .catch(err => console.log(err));
  }, [roomId, username, onUpdateRoom, onUpdateUser]);

  const handleInputChange = (event) => {
    const value = parseInt(event.target.value, 10) ? parseInt(event.target.value, 10) : 0;
    const updatedInputState = {...inputState, [event.target.name]: value};
    setInputState(updatedInputState);
  };

  const handleChooseLanguage = (event) => {
    if (event.target.checked) {
      setLanguageState(languageState.concat([event.target.name]));
    } else {
      setLanguageState(languageState.filter(lang => lang !== event.target.name));
    }
  };

  const handleOrderSwitch = () => {
    setRandomOrderState(!randomOrderState);
  };

  const handleLeaveRoom = () => {
    axios.post('/leave-room', { roomId: roomId, username: username })
      .then(res => {
        return props.history.replace('/');
      })
      .catch(err => console.log(err));
  };

  const handleStartGame = () => {
    const { minAnti, maxAnti, minBlank, maxBlank } = getMinMaxAntiBlank(props.room.totalCount);
    if (inputState.antiCount < minAnti || inputState.antiCount > maxAnti
      || inputState.blankCount < minBlank || inputState.blankCount > maxBlank) {
        return;
    }

    axios.post('/start-game', 
      { 
        room: {
          roomId: roomId,
          antiCount: inputState.antiCount,
          blankCount: inputState.blankCount,
          users: props.room.users
        },
        randomOrder: randomOrderState,
        languageArray: languageState
      })
      .then()
      .catch(err => console.log(err));
  };

  const handleEndGame = () => {
    setDialogState(true);
    setDialogPropsState({
      onClose: handleCloseDialog,
      title: 'Confirm End Game?',
      message: 'The game will end and all words will be shown to all users.',
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
      message: 'All users will go back to the waiting area.',
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

  const getMinMaxAntiBlankMessage = () => {
    const { minAnti, maxAnti, minBlank, maxBlank } = getMinMaxAntiBlank(props.room.totalCount);
    return `Undercover: min ${minAnti}, max ${maxAnti}
      Blank: min ${minBlank}, max ${maxBlank}`;
  };

  const getVoteMessage = () => {
    if (props.room.currentTurn === 'hostVoting') {
      return 'Please discuss and only host can vote';
    }
    if (props.user.isOut) {
      return 'You cannot vote because you are out';
    }
    if (props.user.hasVoted) {
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

  return (props.room && props.user &&
    <div>
      <Typography variant='h6'>
        <Grid container spacing={1}>
          <RoomInfo inputState={inputState} handleInputChange={handleInputChange} />
          <Grid item xs={1}/>
          <Grid item xs={10}>
            {!props.room.hasStarted &&
              <Button variant='contained' onClick={handleLeaveRoom}>Leave Room</Button>
            }
            {props.user.isHost && !props.room.hasStarted &&
              <Button variant='contained' color='primary' onClick={handleStartGame}
                disabled={props.room.totalCount < 3 || languageError ? true : false} >
                Start Game
              </Button>
            }
            {props.user.isHost && props.room.hasStarted && !(props.room.currentTurn === 'ended') &&
              <Button variant='contained' onClick={handleEndGame}>
                End Game
              </Button>
            }
            {props.user.isHost && props.room.currentTurn === 'ended' &&
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
        <Typography classes={{root: classes.whiteSpace}} color='error'>
          {props.room.totalCount < 3 ? 'Game must have at least 3 players' : getMinMaxAntiBlankMessage()}
        </Typography>
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

      {!props.room.hasStarted && props.user.isHost &&
        <Typography component='div'>
          <p></p>
          <FormControl error={languageError} component='fieldset'>
            <FormLabel component='legend'>Language: </FormLabel>
            <FormGroup classes={{root: classes.language}}>
              {languages.map(lang => {
                return (
                  <FormControlLabel
                    key={lang.prop}
                    control={<Checkbox checked={languageState.includes(lang.prop)} onChange={handleChooseLanguage} name={lang.prop} color='primary' />}
                    label={lang.label} />
                )
              })}
            </FormGroup>
            {languageError && <FormHelperText>Please choose at least 1 language</FormHelperText>}
          </FormControl>
          <Grid component='label' container alignItems='center' justify='center' spacing={1}>
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
          <FormControl component='fieldset'>
            <FormLabel component='legend'>Users</FormLabel>
            <RadioGroup aria-label='users' name='users' value={chosenUserState} onChange={handleChooseUser}>
              {props.room.users.map((user, index) => {
                return (
                  <FormControlLabel
                    key={index}
                    value={index.toString()}
                    disabled={user.isOut || props.user.hasVoted || (props.room.currentTurn === 'hostVoting' && !props.room.usersWithMostVotes.includes(index))}
                    control={<Radio />}
                    label={getUserString(user, index, props.room.currentTurn, username)} />
                )
              })}
            </RadioGroup>
            <FormHelperText>{getVoteMessage()}</FormHelperText>
            <Button variant='contained' color='primary'
              disabled={(props.room.currentTurn === 'hostVoting' && !props.user.isHost) || 
                (props.room.currentTurn === 'voting' && props.user.isOut) || 
                props.user.hasVoted}
              onClick={handleVote}>
              Vote
            </Button>
          </FormControl>
          <p></p>
        </React.Fragment> :

        !props.room.hasStarted && props.user.isHost && !randomOrderState ?
        <UserListDnd username={username} handleEndTurn={handleEndTurn} /> :
        props.room.users !== undefined ?
        <UserList username={username} handleEndTurn={handleEndTurn} /> :
        null
      }

      {props.room.hasStarted &&
        <WordCard word={props.user.card} />
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
    room: state.room.room,
    user: state.user.user
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onUpdateRoom: (room) => dispatch({type: actionTypes.UPDATE_ROOM, room: room}),
    onUpdateUser: (user) => dispatch({type: actionTypes.UPDATE_USER, user: user})
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Room);