import React, { useState } from 'react';
import axios from 'axios';
import {
  Button,
  Grid,
  IconButton,
  Snackbar,
  TextField,
  Typography
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';

const Feedback = (props) => {
  const [ feedbackState, setFeedbackState ] = useState({
    name: null,
    content: null
  });
  const [openState, setOpenState] = React.useState(false);

  const handleFeedbackChange = (event) => {
    const updatedFeedbackState = {...feedbackState, [event.target.name]: event.target.value};
    setFeedbackState(updatedFeedbackState);
  }

  const handleSubmitFeedback = (event) => {
    event.preventDefault();

    axios.post('/feedback', feedbackState)
      .then(res => {
        setOpenState(true);
      })
      .catch(err => {
        console.log(err.response.data.error);
      });
  };

  const handleClose = (event, reason) => {
    setOpenState(false);
  };

  return (
    <div>
      <Typography variant='h6'>Feedback</Typography>
      <form onSubmit={handleSubmitFeedback}>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <TextField id='name' name='name' label='Name (optional)' onChange={handleFeedbackChange}
              variant="outlined" size='small' />
          </Grid>
          <Grid item xs={2}/>
          <Grid item xs={8}>
            <TextField id='content' name='content' label='Feedback / Suggestions' onChange={handleFeedbackChange}
              multiline required variant="outlined" size='small' rows={4} fullWidth />
          </Grid>
          <Grid item xs={2}/>
          <Grid item xs={12}>
            <Button variant='contained' color='primary' type='submit'>Submit</Button>
          </Grid>
        </Grid>
      </form>
      <Snackbar open={openState} autoHideDuration={6000} onClose={handleClose} message='Thank you for your feedback!'
        action={
          <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </div>
  );
};

export default Feedback;