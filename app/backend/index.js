import app from './app.js'; // Assuming app.js is in the same directory

app.listen(3000, (error) => {
  if (error) console.log(error);
  console.log('Server running in http://localhost:3000');
});
