const express = require('express');
const app = express();
const router = express.Router();

router.use('/:orgId', (req, res, next) => {
  console.log('middleware req.params:', req.params);
  next();
});

router.get('/:orgId', (req, res) => {
  console.log('handler req.params:', req.params);
  res.send('ok');
});

router.get('/:orgId/members', (req, res) => {
  console.log('members handler req.params:', req.params);
  res.send('ok');
});

app.use('/organizations', router);

const request = require('supertest');
request(app).get('/organizations/123').expect(200).then(() => {
  request(app).get('/organizations/123/members').expect(200).then(() => {
    console.log('done');
  });
});
