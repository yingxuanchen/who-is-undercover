import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';
import axios from 'axios';
import {
  Button,
  Grid,
  TextField
} from '@material-ui/core';

// import classes from './MainPage.module.css';

const MainPage = (props) => {
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

  const handleInputChange = (event) => {
    const updatedInputState = {...inputState, [event.target.name]: event.target.value};
    setInputState(updatedInputState);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setRoomIdErrorState({ error: false, helperText: '' });
    setUsernameErrorState({ error: false, helperText: '' });

    axios.post('/enter-room', inputState)
      .then(res => {
        setRedirectState(
          <Redirect to={{ pathname: '/room', data: {roomId: inputState.roomId, username: inputState.username} }} />
        );
      })
      .catch(err => {
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

  return (
    <div>
      {redirectState}
      <form onSubmit={handleSubmit}>
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
    </div>
  );
};

export default MainPage;