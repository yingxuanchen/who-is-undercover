const readXlsxFile = require('read-excel-file/node');
const Card = require('./models/card');
const mongoConnect = require('./util/database').mongoConnect;

require('dotenv').config();

const startNum = 1;

mongoConnect(() => {
  // Card.dropCollection();

  const language = 'english';
  readXlsxFile('words.xlsx', { sheet: language }).then((rows) => {
    // `rows is an array of rows
    // each row being an array of cells.
    for (let i = startNum - 1; i < rows.length; i++) {
      const num = rows[i][0];
      const a = rows[i][1];
      const b = rows[i][2];
  
      const card = new Card(num, a, b, language);
      card.insert();
    }
  });

  return;
});

