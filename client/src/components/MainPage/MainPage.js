import React, { useState, useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import axios from 'axios';
import {
  Backdrop,
  Button,
  CircularProgress,
  Grid,
  TextField,
  Typography
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AlertDialog from '../common/AlertDialog';
import Feedback from '../Feedback/Feedback';
// import classes from './MainPage.module.css';

const useStyles = makeStyles((theme) => ({
  root: {
    overflowX: 'hidden'
  },
  note: {
    marginTop: '1em',
    marginBottom: '1em'
  },
  rules: {
    marginRight: '1em'
  },
  footer: {
    marginTop: '2em',
    marginBottom: '1em',
    display: 'inline-block'
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
}));

const MainPage = (props) => {
  const classes = useStyles();

  const [ redirectState, setRedirectState ] = useState(null);
  const [ inputState, setInputState ] = useState({
    roomId: '',
    username: ''
  });
  const [ roomIdErrorState, setRoomIdErrorState ] = useState({
    error: false,
    helperText: ''
  });
  const [ usernameErrorState, setUsernameErrorState ] = useState({
    error: false,
    helperText: ''
  });
  const [ dialogState, setDialogState ] = useState(false);
  const [ dialogPropsState, setDialogPropsState ] = useState({
    onClose: null,
    title: '',
    message: '',
    onCancel: null,
    onConfirm: null
  });
  const [ backdropState, setBackdropState ] = useState(false);

  useEffect(() => {
    setBackdropState(true);

    axios.get('/check-session')
      .then(res => {
        setBackdropState(false);
        if (res.data.roomId && res.data.username) {
          setRedirectState(
            <Redirect to={{ pathname: '/room', data: {roomId: res.data.roomId, username: res.data.username} }} />
          );
        }
      })
      .catch(err => {
        console.log(err);
        setBackdropState(false);
        displayErrorDialog();
      });
    // eslint-disable-next-line
  }, []);

  const handleInputChange = (event) => {
    const updatedInputState = {...inputState, [event.target.name]: event.target.value};
    setInputState(updatedInputState);
  };

  const handleEnterRoom = (event) => {
    event.preventDefault();

    setBackdropState(true);

    setRoomIdErrorState({ error: false, helperText: '' });
    setUsernameErrorState({ error: false, helperText: '' });

    axios.post('/enter-room', inputState)
      .then(res => {
        setRedirectState(
          <Redirect to={{ pathname: '/room', data: {roomId: inputState.roomId, username: inputState.username} }} />
        );
      })
      .catch(err => {
        setBackdropState(false);
        console.log(err.response);
        const error = err.response.data.error;
        if (error === 'game has started') {
          setRoomIdErrorState({
            error: true,
            helperText: 'Game has started in this room. Please choose another room.'
          });
        } else if (error === 'username already exists') {
          setUsernameErrorState({
            error: true,
            helperText: 'Username already exists in this room. Please choose another username.'
          });
        }
      });
  };

  const handleCloseDialog = () => {
    setDialogState(false);
  };

  const displayErrorDialog = () => {
    setDialogState(true);
    setDialogPropsState({
      onClose: handleCloseDialog,
      title: 'Server Error',
      message: 'Please try again later.',
      onCancel: null,
      onConfirm: handleCloseDialog
    });
  }

  return (
    <div className={classes.root}>
      {redirectState}
      <Backdrop className={classes.backdrop} open={backdropState}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <form onSubmit={handleEnterRoom}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField required id='roomId' name='roomId' label='Room Id' onChange={handleInputChange} {...roomIdErrorState} />
          </Grid>
          <Grid item xs={12}>
            <TextField required id='username' name='username' label='Username' onChange={handleInputChange} {...usernameErrorState} />
          </Grid>
          <Grid item xs={12}>
            <Button variant='contained' color='primary' type='submit'>Enter Room</Button>
          </Grid>
        </Grid>
      </form>
      <Typography variant='subtitle2' color='error' classes={{root: classes.note}}>
        Note: If you find that your game is not synchronized with other players at any point of time, please refresh your page.
      </Typography>
      <Typography variant='h6'>Game Rules</Typography>
      <Typography variant='body2' align='left' component={'div'} classes={{root: classes.rules}}>
        <ol>
          <li>In each game, there will be a pair of similar words.</li>
          <li>
            At the start of the game, each player will get either of the 2 words. 
            Most of the players (Civilians) will get the same word, while the Undercover(s) will get the other word. 
            If there is a Blank in the game, that player will not get any word. 
            The Blank must hide the fact that he/she does not have any word.
          </li>
          <li>In each round, players will take turns to describe their word, without saying what the word is. Players cannot repeat what have been said before.</li>
          <li>
            After every player has spoken, each player will vote for the player that he/she thinks is an Undercover. 
            The player with the most votes will be out of the game. If there is a tie, the players in the tie will describe their word again 
            (with new description) and everyone will decide again who to vote for. The host of the game will do the voting in the system.
          </li>
          <li>
            At the end of each round,
            <ol type='a'>
              <li>If only Civilians are left in the game, the Civilians win.</li>
              <li>If only 1 Civilian is left, the game ends. If there are Blanks alive, the Blanks win. If not, the Undercovers win.</li>
            </ol>
          </li>
        </ol>
      </Typography>
      <Feedback />
      <Typography variant='caption' classes={{root: classes.footer}}>
        The code for this app can be found <a href='https://github.com/yingxuanchen/who-is-undercover' target='_blank' rel='noreferrer'>here</a>.
      </Typography>

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

export default MainPage;