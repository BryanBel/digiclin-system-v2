const endpoint =
  process.env.NODE_ENV === 'dev' ? 'http://localhost:4321' : 'https://digiclin-system.onrender.com';

export default endpoint;
