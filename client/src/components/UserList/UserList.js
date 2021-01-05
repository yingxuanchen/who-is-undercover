import React from 'react';
import { connect } from 'react-redux';
import { makeStyles } from '@material-ui/core/styles';
import {
  Button,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
} from '@material-ui/core';
import { getUserString } from '../../shared/utils';
import * as actionTypes from '../../store/actions';

const useStyles = makeStyles({
  list: {
    textAlign: 'center'
  },
});

const UserList = (props) => {
  const classes = useStyles();

  return (
    <List subheader={
      <ListSubheader>
        Users
      </ListSubheader>
    }>
        {props.room.users.map((user, index) => {
          return (
            <React.Fragment key={index}>
              <ListItem className={classes.list}>
                <ListItemText primary={getUserString(user, index, props.room.currentTurn, props.username)} />
              </ListItem>
              {user.name === props.username && props.room.currentTurn === index &&
                <Button variant='contained' color='primary' onClick={props.handleEndTurn}>
                  End Turn
                </Button>
              }
            </React.Fragment>
          )
        })}
    </List>
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

export default connect(mapStateToProps, mapDispatchToProps)(UserList);