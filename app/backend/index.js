import { createAndConfigureApp } from './app.js';

const startServer = async () => {
  const app = await createAndConfigureApp();
  const port = process.env.PORT || 3000;
  app.listen(port, (error) => {
    if (error) console.log('Error starting server:', error);
    console.log(`Server running in http://localhost:${port}`);
  });
};

startServer();
