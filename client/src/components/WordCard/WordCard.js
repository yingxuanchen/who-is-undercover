import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Button, Card } from '@material-ui/core';

const useStyles = makeStyles({
  card: {
    width: 'fit-content',
    margin: 'auto',
    padding: '20px'
  },
});

const WordCard = (props) => {
  const classes = useStyles();

  const [ cardState, setCardState ] = useState(true);

  const handleTurnCard = () => {
    setCardState(!cardState);
  };

  return (
    <React.Fragment>
      <Card raised className={classes.card}>
        {cardState ? props.word : 'Your word is hidden'}
      </Card>
      <p></p>
      <Button variant='contained' onClick={handleTurnCard}>{cardState ? 'Hide Word' : 'Show Word'}</Button>
    </React.Fragment>
  );
};

export default WordCard;