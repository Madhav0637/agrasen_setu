require('dotenv').config();
const validate = require('./src/middlewares/validate');
const { updateUserSchema } = require('./src/validators/user.validator');

const req = { body: { dateOfBirth: '1990-01-01' } };
const res = { status: (code) => { console.log('STATUS:', code); return res; }, json: (d) => console.log('JSON:', JSON.stringify(d)) };
const next = (err) => console.log('NEXT called with error:', err ? err.message : 'no error');

validate({ body: updateUserSchema })(req, res, next);
