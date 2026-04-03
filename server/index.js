const express = require('express');
const config = require('./config');
const noteRouter = require('./routes/note');
const authRouter = require('./routes/auth');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.text());

app.use('/api/note', noteRouter);
app.use('/api/auth', authRouter);

app.listen(config.server.port, () => {
  console.log(`Note server running on port ${config.server.port}`);
});
