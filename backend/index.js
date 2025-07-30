const express = require('express');
dotenv.config();
app = express();
app.use(cors());
app.use(express.json());
app.get('/', 'Backend de ClinKlank funcionando!');
app.listen(PORT, 3000);
