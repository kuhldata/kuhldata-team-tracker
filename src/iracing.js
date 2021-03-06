const fetch = require('node-fetch');

const timeConverter = require('ir-time-converter');

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

// TODO: remove fallback as soon as iracing fixed the bug
const getRacesFallback = async (cookieString, irid, catId, year, season) => fetch(`https://members.iracing.com/memberstats/member/GetResults?custid=${irid}&showraces=1&showquals=0&showtts=0&showops=0&showofficial=1&showunofficial=0&showrookie=1&showclassd=1&showclassc=1&showclassb=1&showclassa=1&showpro=1&showprowc=1&lowerbound=0&upperbound=250&sort=start_time&order=desc&format=json&category=${catId}&seasonyear=${year}&seasonquarter=${season}`, {
  method: 'GET',
  headers: {
    Cookie: cookieString,
  },
})
  .then(async (res) => {
    if (res.ok && res.status === 200) return res.json();
    console.log(`can not get races for ${irid}`);
    const text = await res.text();
    console.log(text);
    throw new Error('can not get races');
  });

module.exports.getProfil = async (cookieString, irid) => fetch(`https://members.iracing.com/membersite/member/GetMember?memberId=${irid}`, {
  method: 'GET',
  headers: {
    Cookie: cookieString,
  },
})
  .then((res) => {
    if (res.ok && res.status === 200) return res.json();
    throw new Error('can not get profile');
  });
//                                                                                        https://members.iracing.com/memberstats/member/GetResults?custid=518012&showraces=1&showquals=0&showtts=0&showops=0&showofficial=1&showunofficial=0&showrookie=1&showclassd=1&showclassc=1&showclassb=1&showclassa=1&showpro=1&showprowc=1&lowerbound=0&upperbound=25&sort=start_time&order=desc&format=json&category=2&starttime_low=1627948800000&starttime_high=1628553599000
module.exports.getRaces = async (cookieString, irid, catId, startTime, endTime) => fetch(`https://members.iracing.com/memberstats/member/GetResults?custid=${irid}&showraces=1&showquals=0&showtts=0&showops=0&showofficial=1&showunofficial=0&showrookie=1&showclassd=1&showclassc=1&showclassb=1&showclassa=1&showpro=1&showprowc=1&lowerbound=0&upperbound=250&sort=start_time&order=desc&format=json&category=${catId}&starttime_low=${startTime}&starttime_high=${endTime}`, {
  method: 'GET',
  headers: {
    Cookie: cookieString,
  },
})
  .then(async (res) => {
    if (res.ok && res.status === 200) return res.json();
    if (res.status === 504) {
      const seasonObj = timeConverter.dateToIRacingTime(new Date(startTime));
      console.log(`Got 504 for getting races for ${irid} between ${startTime} and ${endTime} for category ${catId}`);
      return getRacesFallback(
        cookieString, irid, catId, seasonObj.year, seasonObj.season,
      );
    }
    console.log(`can not get races for ${irid}`);
    const text = await res.text();
    console.log(text);
    throw new Error('can not get races');
  })
  .then((races) => {
    const rs = races.d.r;
    if (!rs) return null;
    return rs.map(mapRace).filter((r) => startTime <= r.startTime && r.startTime <= endTime);
  });
