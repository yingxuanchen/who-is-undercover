import React from 'react';
import { connect } from 'react-redux';
import {
  Grid,
  TextField,
} from '@material-ui/core';

const RoomInfo = (props) => {
  return (
    <React.Fragment>
      <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Room Id:</Grid><Grid item xs={5} sm={2}>{props.room.roomId}</Grid><Grid item xs={1} sm={4}/>
      <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Total:</Grid><Grid item xs={5} sm={2}>{props.room.totalCount}</Grid><Grid item xs={1} sm={4}/>

      {(props.room.hasStarted || props.user.isHost) &&
        <React.Fragment>
          <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Undercover:</Grid>
          <Grid item xs={5} sm={2}>
            {props.user.isHost && !props.room.hasStarted ?
              <TextField type='number' fullWidth id='antiCount' name='antiCount' label='Undercover' value={props.inputState.antiCount}
                onChange={props.handleInputChange} />
              : props.room.antiCount
            }
          </Grid>
          <Grid item xs={1} sm={4}/>

          <Grid item xs={1} sm={4}/><Grid item xs={5} sm={2}>Blank:</Grid>
          <Grid item xs={5} sm={2}>
            {props.user.isHost && !props.room.hasStarted ?
              <TextField type='number' fullWidth id='blankCount' name='blankCount' label='Blank' value={props.inputState.blankCount}
                onChange={props.handleInputChange} />
              : props.room.blankCount
            }
          </Grid>
          <Grid item xs={1} sm={4}/> 
        </React.Fragment>
      }
    </React.Fragment>
  );
};

const mapStateToProps = state => {
  return {
    room: state.room.room,
    user: state.user.user
  };
};

export default connect(mapStateToProps)(RoomInfo);