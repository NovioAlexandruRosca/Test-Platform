require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const session = require('express-session');
const bodyParser = require('body-parser');
const crypto = require('crypto');

function generateUniqueCode() {
    return crypto.randomBytes(3).toString('hex');
}

const app = express();

app.use(express.static(path.join(__dirname, '../public')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use(bodyParser.json());
app.use(session({
  secret: '3213123213dasdsadagfsadada',
  resave: false,
  saveUninitialized: true,
}));

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT, 
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM clients WHERE email = $1 AND password = $2', [email, password]);
      client.release();

      if (result.rows.length > 0) {
          req.session.isAuthenticated = true;
          req.session.clientId = result.rows[0].id;
          req.session.isAdmin = result.rows[0].isadmin;
          res.status(200).json({ message: 'Client authenticated successfully' });
      } else {
          req.session.isAuthenticated = false;
          res.status(401).json({ error: 'Authentication failed' });
      }
  } catch (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/topics', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT DISTINCT topic FROM questions');
    client.release();

    const topics = result.rows.map(row => row.topic);
    res.status(200).json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/test', (req, res) => {
  if (req.session.isAuthenticated && req.session.isAdmin) {
    res.sendFile(path.join(__dirname, '../public', 'test.html'));
  }else if(req.session.isAuthenticated && !req.session.isAdmin){
    res.sendFile(path.join(__dirname, '../public', 'takeTest.html'));
  }
   else {
    res.status(401).send('Unauthorized');
  }
});

app.get('/username', async (req, res) => {
  const userId = req.session.clientId; 

  if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
      const client = await pool.connect();
      const result = await client.query('SELECT name FROM clients WHERE id = $1', [userId]);
      client.release();

      if (result.rows.length > 0) {
          const username = result.rows[0].name;
          res.status(200).json({ username });
      } else {
          res.status(404).json({ error: 'User not found' });
      }
  } catch (error) {
      console.error('Error fetching username:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/check-code', async (req, res) => {
  const { code } = req.body;
  try {
      const client = await pool.connect();
      const queryResult = await client.query('SELECT * FROM generatedTests WHERE code = $1', [code]);

      if (queryResult.rows.length > 0) {
          const creationDate = queryResult.rows[0].creationdate;

          if(!creationDate){
            res.status(200).json({ isValid: false, error: 'The test hasn`t started yet' });
          }else{

            const currentTime = new Date();
            const timeDifference = (currentTime - creationDate) / 1000 / 60;

            if (timeDifference <= 10) {

              const testData = queryResult.rows[0];

              const takenTestQuery = await client.query(
                'SELECT * FROM takenTests WHERE clientId = $1 AND code = $2',
                [req.session.clientId, testData.code]
              );

              if(takenTestQuery.rows.length > 0){
                res.status(200).json({ isValid: false, error: 'Test already taken' });
              }else{
                const result = await client.query(
                  'SELECT generate_test($1, $2, $3, $4, $5)',
                  [req.session.clientId, testData.title, testData.description, testData.topic, testData.creationdate]
                );

                await client.query(
                  'INSERT INTO takenTests (clientid, code) VALUES ($1, $2)',
                  [req.session.clientId, testData.code]
                );

                res.status(200).json({ isValid: true, testData: result.rows[0].generate_test});
              }
            } else {
                res.status(200).json({ isValid: false, error: 'Code expired' });
            }
          }
      } else {
          res.status(200).json({ isValid: false, error: 'Invalid code' });
      }
      client.release();
  } catch (error) {
      console.error('Error checking code:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/generate-test', async (req, res) => {
  const { title, description, topic } = req.body;

  try {
    const code = generateUniqueCode();

    const client = await pool.connect();
    const queryText = 'INSERT INTO generatedTests (title, description, topic, code, creationdate) VALUES ($1, $2, $3, $4, null) RETURNING *';
    const values = [title, description, topic, code];
    const result = await client.query(queryText, values);
    client.release();


    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error generating test:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/update-test-date', async (req, res) => {
  const { code } = req.body;

  try {
      const client = await pool.connect();
      const currentDate = new Date();
      const queryResult = await client.query(
          'UPDATE generatedTests SET creationDate = $1 WHERE code = $2 RETURNING *',
          [currentDate, code]
      );
      client.release();

      if (queryResult.rows.length > 0) {
          res.status(200).json({ message: 'Test date updated successfully' });
      } else {
          res.status(404).json({ error: 'Test not found' });
      }
  } catch (error) {
      console.error('Error updating test date:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logout successful' });
  });
});

app.get('/questions/:testId', async (req, res) => {
  const testId = req.params.testId;
  try {
    const result = await pool.query(`
      SELECT t.name, t.description, t.maxscore, q.id AS question_id, q.questiontext, q.score, a.id AS answer_id, a.answertext
      FROM questions q
      JOIN testquestions tq ON q.id = tq.questionId
      JOIN tests t on t.id = tq.testid
      JOIN questionanswers qa ON q.id = qa.questionId
      JOIN answers a ON qa.answerId = a.id
      WHERE t.id = $1;
      
    `, [testId]);

    const questions = result.rows;
    res.status(200).json(questions);
  } catch (error) {
    console.error('Error fetching questions for test:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/submit-answers', async (req, res) => {
  const submittedAnswers = req.body;
  let score = 0;
  try {
    const client = await pool.connect();

    for (const submittedAnswer of submittedAnswers) {
        const { questionId, answerId } = submittedAnswer;

        const answerQuery = await client.query(
            `SELECT a.is_correct, q.score FROM answers a
              Join questionanswers qa on qa.answerid = a.id  
              join questions q on q.id = qa.questionid
              where a.id = $1`,
            [ answerId]
        );

        if (answerQuery.rows[0].is_correct) {
            score += answerQuery.rows[0].score;
        } 

        await client.query(
          `INSERT INTO userAnswers (questionId, answerId, testId) VALUES ($1, $2, $3)`,
          [questionId, answerId, req.session.testId]
      );
    }

    console.log(score);

    client.release();
    res.status(200).json(score);
  } catch (error) {
      console.error('Error submitting answers:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/test-details/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const client = await pool.connect();
    const queryResult = await client.query(
      'SELECT id, name, description, creationDate FROM tests WHERE id = $1',
      [code]
    );
    client.release();

    if (queryResult.rows.length > 0) {
      req.session.testId = queryResult.rows[0].id;
      const testDetails = {
        name: queryResult.rows[0].name,
        description: queryResult.rows[0].description,
        creationDate: queryResult.rows[0].creationdate 
      };
      res.status(200).json(testDetails);
    } else {
      res.status(404).json({ error: 'Test not found' });
    }
  } catch (error) {
    console.error('Error fetching test details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/testData', async (req, res) => {
  const userId = req.session.clientId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const client = await pool.connect();

    const result = await client.query('SELECT * FROM tests WHERE userid = $1 order by creationdate desc', [userId]);
    client.release();

    if (result.rows.length > 0) {
      const testData = result.rows;
      res.status(200).json({ testData });
    } else {
      res.status(404).json({ error: 'No test data found for this user' });
    }
  } catch (error) {
    console.error('Error fetching test data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/testInfo/:testId', async (req, res) => {
  const testId = req.params.testId;

  try {
    const client = await pool.connect();
    const result = await client.query(`SELECT q.id, q.questiontext, q.score, a.id, a.answertext, a.is_correct FROM testquestions tq
      Join questions q on q.id = tq.questionid
      join questionanswers qa on qa.questionid = q.id
      join answers a on a.id = qa.answerid
    WHERE tq.testid = $1`, [testId]);

    const result1 = await client.query(`SELECT ua.questionid, q.questiontext, a.answertext, ua.answerid FROM useranswers ua
    join answers a on a.id = ua.answerid
    join questions q on q.id = ua.questionid
    WHERE ua.testid = $1`, [testId]);

    client.release();

    if (result.rows.length > 0) {
      res.status(200).json({result, result1});
    } else {
      res.status(404).json({ error: 'Test not found' });
    }
  } catch (error) {
    console.error('Error fetching test details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'login.html'));  
});

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
