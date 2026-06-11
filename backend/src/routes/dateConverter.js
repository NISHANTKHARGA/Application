const express = require('express');
const router = express.Router();
const dateConverter = require('../controllers/dateConverterController');

router.get('/ad-to-bs', dateConverter.adToBs);
router.get('/bs-to-ad', dateConverter.bsToAd);
router.get('/today', dateConverter.getToday);

module.exports = router;
