const app = require('./api/index');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App listening on http://localhost:${port}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
