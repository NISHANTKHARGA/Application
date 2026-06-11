const { ADToBS, BSToAD } = require('bikram-sambat-js');

const MONTHS_BS = ['Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
const MONTHS_BS_NP = ['बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'];
const MONTHS_AD = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_NP = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pad(n) { return String(n).padStart(2, '0'); }

exports.adToBs = (req, res) => {
  try {
    const { year, month, day } = req.query;
    if (!year || !month || !day) {
      return res.status(400).json({ success: false, error: 'year, month, day are required' });
    }
    const ny = parseInt(year);
    const nm = parseInt(month);
    const nd = parseInt(day);
    if (isNaN(ny) || isNaN(nm) || isNaN(nd) || nm < 1 || nm > 12 || nd < 1 || nd > 31) {
      return res.status(400).json({ success: false, error: 'Invalid date values' });
    }
    const bsDate = ADToBS(new Date(ny, nm - 1, nd));
    if (!bsDate) return res.status(400).json({ success: false, error: 'Conversion failed' });
    const parts = bsDate.split('-');
    const bsYear = parseInt(parts[0]);
    const bsMonth = parseInt(parts[1]);
    const bsDay = parseInt(parts[2]);
    const adDate = new Date(ny, nm - 1, nd);
    res.json({
      success: true,
      ad: { year: ny, month: nm, monthName: MONTHS_AD[nm - 1], day: nd, dayName: DAYS_EN[adDate.getDay()] },
      bs: { year: bsYear, month: bsMonth, monthName: MONTHS_BS[bsMonth - 1], monthNameNp: MONTHS_BS_NP[bsMonth - 1], day: bsDay, formatted: `${pad(bsYear)}-${pad(bsMonth)}-${pad(bsDay)}` }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.bsToAd = (req, res) => {
  try {
    const { year, month, day } = req.query;
    if (!year || !month || !day) {
      return res.status(400).json({ success: false, error: 'year, month, day are required' });
    }
    const ny = parseInt(year);
    const nm = parseInt(month);
    const nd = parseInt(day);
    if (isNaN(ny) || isNaN(nm) || isNaN(nd) || nm < 1 || nm > 12 || nd < 1 || nd > 32) {
      return res.status(400).json({ success: false, error: 'Invalid BS date values' });
    }
    const bsStr = `${pad(ny)}-${pad(nm)}-${pad(nd)}`;
    const adDate = BSToAD(bsStr);
    if (!adDate) return res.status(400).json({ success: false, error: 'Conversion failed - date may be out of range' });
    const parts = adDate.split('-');
    const adYear = parseInt(parts[0]);
    const adMonth = parseInt(parts[1]);
    const adDay = parseInt(parts[2]);
    const adDateObj = new Date(adYear, adMonth - 1, adDay);
    res.json({
      success: true,
      bs: { year: ny, month: nm, monthName: MONTHS_BS[nm - 1], monthNameNp: MONTHS_BS_NP[nm - 1], day: nd, formatted: bsStr },
      ad: { year: adYear, month: adMonth, monthName: MONTHS_AD[adMonth - 1], day: adDay, dayName: DAYS_EN[adDateObj.getDay()] }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.getToday = (req, res) => {
  try {
    const now = new Date();
    const bsDate = ADToBS(now);
    if (!bsDate) return res.status(500).json({ success: false, error: 'Conversion failed' });
    const parts = bsDate.split('-');
    const bsYear = parseInt(parts[0]);
    const bsMonth = parseInt(parts[1]);
    const bsDay = parseInt(parts[2]);
    res.json({
      success: true,
      ad: { year: now.getFullYear(), month: now.getMonth() + 1, monthName: MONTHS_AD[now.getMonth()], day: now.getDate(), dayName: DAYS_EN[now.getDay()] },
      bs: { year: bsYear, month: bsMonth, monthName: MONTHS_BS[bsMonth - 1], monthNameNp: MONTHS_BS_NP[bsMonth - 1], day: bsDay, dayName: DAYS_NP[now.getDay()], formatted: `${pad(bsYear)}-${pad(bsMonth)}-${pad(bsDay)}` }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
