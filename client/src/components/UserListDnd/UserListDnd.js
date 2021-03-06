import React from 'react';
import { connect } from 'react-redux';
import { Container, Draggable } from 'react-smooth-dnd';
import { makeStyles } from '@material-ui/core/styles';
import {
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  ListSubheader,
} from '@material-ui/core';
import DragHandleIcon from '@material-ui/icons/DragHandle';
import { applyDrag, getUserString } from '../../shared/utils';
import * as actionTypes from '../../store/actions';

const useStyles = makeStyles({
  listItem: {
    textAlign: 'center',
  },
  listSubheader: {
    lineHeight: 1.5,
    marginTop: '2em'
  }
});

const UserListDnd = (props) => {
  const classes = useStyles();

  const handleChangeOrder = (e) => {
    props.onUpdateRoom({
      ...props.room,
      users: applyDrag(props.room.users, e)
    });
  };

  return (
    <List subheader={
      <ListSubheader classes={{root: classes.listSubheader}}>
        Players
      </ListSubheader>
    }>
      <Container dragHandleSelector=".drag-handle" lockAxis="y" onDrop={handleChangeOrder}>
        {props.room.users.map((user, index) => {
          return (
            <Draggable key={index}>
              <ListItem className={classes.listItem}>
                <ListItemText primary={getUserString(user, index, props.room.currentTurn, props.username)} />
                <ListItemSecondaryAction>
                  <ListItemIcon className="drag-handle">
                    <DragHandleIcon />
                  </ListItemIcon>
                </ListItemSecondaryAction>
              </ListItem>
              {user.name === props.username && props.room.currentTurn === index &&
                <Button variant='contained' color='primary' onClick={props.handleEndTurn}>
                  End Turn
                </Button>
              }
            </Draggable>
          )
        })}
      </Container>
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

export default connect(mapStateToProps, mapDispatchToProps)(UserListDnd);