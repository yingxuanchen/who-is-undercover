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

const useStyles = makeStyles({
  listItem: {
    textAlign: 'center'
  },
  listSubheader: {
    lineHeight: 1.5,
    marginTop: '2em'
  }
});

const UserList = (props) => {
  const classes = useStyles();

  return (
    <List subheader={
      <ListSubheader classes={{root: classes.listSubheader}}>
        Players
      </ListSubheader>
    }>
        {props.room.users.map((user, index) => {
          return (
            <React.Fragment key={index}>
              <ListItem className={classes.listItem}>
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

export default connect(mapStateToProps)(UserList);