const fetch = require('node-fetch');
const config = require('../config');

const mapRace = (r) => {
  const obj = {
    finish: r['3'] || null,
    week: r['8'] || null,
    start: r['12'] || null,
    catid: r['33'] || null,
    season: r['34'] || null,
    incs: r['39'] || null,
    subSessionId: r['41'] || null,
    year: r['42'] || null,
    sof: r['45'] || null,
    startTime: r['11'] || null,
  };

  return obj;
};

module.exports.getProfil = async (cookieString, irid) => fetch(`https://members.iracing.com/membersite/member/GetMember?memberId=${irid}`, {
    method: 'GET',
    headers: {
      'Cookie': cookieString,
    }
  })
  .then(res => {
    if(res.ok && res.status == 200) return res.json();
    throw new Error('can not get profile');
  });

module.exports.getRaces = async (cookieString, irid, year, season, week) => fetch(`https://members.iracing.com/memberstats/member/GetResults?custid=${irid}&showraces=1&showquals=0&showtts=0&showops=0&showofficial=1&showunofficial=0&showrookie=1&showclassd=1&showclassc=1&showclassb=1&showclassa=1&showpro=1&showprowc=1&lowerbound=0&upperbound=250&sort=start_time&order=desc&format=json&category=${config.catId}&seasonyear=${year}&seasonquarter=${season}&raceweek=${week}`, {
  method: 'GET',
  headers: {
    'Cookie': cookieString,
  }
})
.then(async (res) => {
  if(res.ok && res.status == 200) return res.json();
  console.log(`can not get races for ${irid}`);
  let text = await res.text();
  console.log(text);
  throw new Error(`can not get races`);
})
.then(races => {
  let rs = races.d.r;
  if(!rs) return null;
  return rs.map(mapRace);
});