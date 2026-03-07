const express = require('express');
const { register } = require('../metrics/prometheus');

const router = express.Router();

// Prometheus scrape endpoint
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = router;
