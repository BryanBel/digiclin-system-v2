import app from './app.js';

app.listen(3000, (error) => {
  if (error) console.log(error);
  console.log('Server running in http://localhost:3000');
});
