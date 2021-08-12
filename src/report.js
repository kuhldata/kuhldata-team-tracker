const cookies = require('ir-cookie-scraper');
const iracing = require('./iracing');
const results = require('./results');
const output = require('./output');

const config = require('../config');

const sessions = {};

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  });
}

const createTopFarmerAward = (ps) => {
  ps.sort((a, b) => b.kpis.gain - a.kpis.gain);
  const report = {
    title: 'Top Farmer',
    description: 'Most iRating gained.',
    drivers: []
  };
  for(let i = 0; i < 3 && i < ps.length; i++) {
    report.drivers.push({
      name: ps[i].displayName.replaceAll('+', ' '),
      value: ps[i].kpis.gain,
    })
  };
  return report;
}

const createTopWinnerAward = (ps) => {
  ps.sort((a, b) => b.kpis.wins - a.kpis.wins);
  const report = {
    title: 'Winner',
    description: 'Most wins in official races.',
    drivers: []
  };
  for(let i = 0; i < 3 && i < ps.length; i++) {
    if(ps[i].kpis.wins <= 0) break;
    report.drivers.push({
      name: ps[i].displayName.replaceAll('+', ' '),
      value: ps[i].kpis.wins,
    })
  };
  return report;
}

const createInCollectorAward = (ps) => {
  ps.sort((a, b) => b.kpis.incs - a.kpis.incs);
  const report = {
    title: 'Inc Collector',
    description: 'Most incs in official races.',
    drivers: []
  };
  for(let i = 0; i < 3 && i < ps.length; i++) {
    if(ps[i].kpis.incs <= 0) break;
    report.drivers.push({
      name: ps[i].displayName.replaceAll('+', ' '),
      value: ps[i].kpis.incs,
    })
  };
  return report;
}

const createRacerAward = (ps) => {
  ps.sort((a, b) => b.kpis.races - a.kpis.races);
  const report = {
    title: 'Racer',
    description: 'Most official races started.',
    drivers: []
  };
  for(let i = 0; i < 3 && i < ps.length; i++) {
    if(ps[i].kpis.races <= 0) break;
    report.drivers.push({
      name: ps[i].displayName.replaceAll('+', ' '),
      value: ps[i].kpis.races,
    })
  };
  return report;
}

const getLabel = (unix, week) => {
  const date = new Date(unix);
  const day = date.getUTCDay();
  let label = '';
  if(day === 0) label = 'S';
  if(day === 1) label = 'M';
  if(day === 2) label = 'T';
  if(day === 3) label = 'W';
  if(day === 4) label = 'T';
  if(day === 5) label = 'F';
  if(day === 6) label = 'S';
  label = `${label}${week}`;
  return label;
}

const getDayUnix = (unix) => {
  const date = new Date(unix);
  date.setUTCHours(0);
  date.setUTCMinutes(0);
  date.setUTCSeconds(0);
  date.setMilliseconds(0);
  return date.getTime();
}

const getProfiles = async (cookieString, drivers) => {
  const profiles = [];
  let profile = null;
  for (let i = 0; i < drivers.length; i++) {
    profile = await iracing.getProfil(cookieString, drivers[i]);

    // console.log(profile);
    if (profile.success) {
      profile.displayName = decodeURI(profile.displayName);
      profiles.push(profile);
    } else {
      console.log(`Invalid customer id ${drivers[i]}`);
      throw new Error('Invalid ')
    }
    console.log(`Got ${i + 1}/${drivers.length}`);
    await delay(config.delay);
  }
  return profiles;
}

const getDriverResult = (sessions, subSessionId, customerId) => {
  return sessions[subSessionId].results.find((r) => r.driverId == customerId);
}

module.exports.createReport = async ({drivers, user, pass, catId, year, season, week, teamName}) => {
  // get Cookie
  console.log('Getting cookie... ');
  let cookieString = await cookies.scrapeCookie(user, pass);
  console.log('Cookie done. Yum.');
  console.log(cookieString);

  // get Profiles
  console.log('Getting profiles... ');
  const profiles = await getProfiles(cookieString, drivers);
  console.log('Profiles loaded.');
  console.log(profiles);

  // get races
  console.log('Searching races... ');
  let raceCount = 0;
  for (let i = 0; i < profiles.length; i++) {
    let races = await iracing.getRaces(cookieString, profiles[i].custID, catId, year, season, week);
    if (races && races.length > 0) {
      raceCount += races.length;
      profiles[i].races = races;
    } else {
      profiles[i].races = [];
      console.log(`Driver ${profiles[i].custID} did not race in this timeframe. Assuming his current iRating.`)
    }
    console.log(`Found races of ${i + 1}/${profiles.length} drivers`);
    await delay(config.delay);
  }
  console.log(`${raceCount} Races found.`);
  

  await delay(config.delay);
  // Get Sessions
  const sessions = {};
  console.log('Getting Subsession Data...');
  for (let i = 0; i < profiles.length; i++) {
    for (let j = 0; j < profiles[i].races.length; j++) {
      if (!sessions[profiles[i].races[j].subSessionId]) {
        try {
          sessions[profiles[i].races[j].subSessionId] = await results.getOfficalResults(cookieString, profiles[i].races[j].subSessionId);

        } catch (e) {
          console.log(e);
        }
      }
      console.log('.');
      await delay(config.delay);
    }
    console.log(`Results from driver ${i + 1}/${profiles.length} done.`)
  }

  console.log('Done.');

  //console.log(JSON.stringify(sessions[profiles[0].races[0].subSessionId]));

  console.log("Starting Calculations.")
  // Calculations

  let firstRace = null;
  let lastRace = null;

  console.log("Driver KPIs and Timeseries");
  // Calculate Driver KPIs, startIr, endIr, racesDone, wins, dnfs, podiums, top5s, poles, series race count, racecount timeseries, iRating timeseries
  for (let i = 0; i < profiles.length; i++) {
    profiles[i].startIr = 0;
    profiles[i].endIr = 0;
    profiles[i].kpis = {
      wins: 0,
      podiums: 0,
      top5s: 0,
      poles: 0,
      dnfs: 0,
      races: 0,
      incs: 0,
      // in step 2
      gain: 0,
      gainPerRace: 0,
      incsPerRace: 0,
    }
    profiles[i].timeseries = {};
    profiles[i].seriesStats = {};

    if(profiles[i].races.length <= 0) {
      let license = profiles[i].licenses.find(l => l.catId == catId);
      profiles[i].startIr = license.true_iRating;
      profiles[i].endIr = license.true_iRating;
    }
    for (let j = 0; j < profiles[i].races.length; j++) {
      // get earliest race
      if(!firstRace || firstRace.startTime > profiles[i].races[j].startTime) {
        firstRace = profiles[i].races[j];
      }

      // get last race
      if(!lastRace || lastRace.startTime < profiles[i].races[j].startTime) {
        lastRace = profiles[i].races[j];
      }

      // get result
      let result = getDriverResult(sessions, profiles[i].races[j].subSessionId, profiles[i].custID);

      // timeseries
      let dayUnix = getDayUnix(profiles[i].races[j].startTime);
      if(!profiles[i].timeseries[dayUnix]) {
        profiles[i].timeseries[dayUnix] = {
          races: 0,
          rating: 0,
          lastStartTime: 0,
        }
      }
      profiles[i].timeseries[dayUnix].races++;
      if(profiles[i].timeseries[dayUnix].lastStartTime < profiles[i].races[j].startTime) {
        profiles[i].timeseries[dayUnix].lastStartTime = profiles[i].races[j].startTime;
        profiles[i].timeseries[dayUnix].rating = result.newIRating;
      }

      // start/end iR
      if(!profiles[i].firstRaceTime || profiles[i].firstRaceTime > profiles[i].races[j].startTime) {
        profiles[i].startIr = result.oldIRating;
        profiles[i].firstRaceTime = profiles[i].races[j].startTime;
      }
      if(!profiles[i].lastRaceTime || profiles[i].lastRaceTime < profiles[i].races[j].startTime) {
        profiles[i].endIr = result.newIRating;
        profiles[i].lastRaceTime = profiles[i].races[j].startTime;
      }

      if(!profiles[i].seriesStats[result.seriesName]) profiles[i].seriesStats[result.seriesName] = 0;
      profiles[i].seriesStats[result.seriesName]++;

      // races
      profiles[i].kpis.races++;

      // incs
      profiles[i].kpis.incs += result.raceIncs;

      // wins
      if(result.classRFinPos == 1) profiles[i].kpis.wins++;

      // podiums
      if(result.classRFinPos <= 3) profiles[i].kpis.podiums++;

      // top5s
      if(result.classRFinPos <= 5) profiles[i].kpis.top5s++;
      
      // poles
      if(result.classQFinPos == 1) profiles[i].kpis.poles++;
      
      if(result.classRFinPos > 5 && result.outId > 0) profiles[i].kpis.dnfs++;
    }

    // Calculate driver gain, gain/race, inc/race
    profiles[i].kpis.gain = profiles[i].endIr - profiles[i].startIr;
    if(profiles[i].kpis.races > 0) profiles[i].kpis.gainPerRace = profiles[i].kpis.gain / profiles[i].kpis.races;
    if(profiles[i].kpis.races > 0) profiles[i].kpis.incsPerRace = profiles[i].kpis.incs / profiles[i].kpis.races;
    

  }

  console.log("Statistic Meta Data")
  // Calculate statistic start
  let firstRaceDayTimestamp = getDayUnix(firstRace.startTime);
  let weekOfFirstRace = firstRace.week;
  let dayDate = new Date(firstRaceDayTimestamp);
  let dayOfFirstRace = dayDate.getUTCDay() - 2;
  if (dayOfFirstRace < 0) dayOfFirstRace += 7;
  let weeksToSub = weekOfFirstRace-1;
  if(week) weeksToSub = 0;
  let firstSeasonDayTimeStamp = firstRaceDayTimestamp - (weeksToSub * (7*24*60*60*1000)) - (dayOfFirstRace * (24*60*60*1000));

  console.log("First Season TS", firstSeasonDayTimeStamp);

  // calculate stats end
  let lastRaceDayTimestamp = getDayUnix(lastRace.startTime);
  let weekOfLastRace = lastRace.week;
  let lastDayDate = new Date(lastRaceDayTimestamp);
  let dayOfLastRace = lastDayDate.getUTCDay() - 2;
  if (dayOfLastRace < 0) dayOfLastRace += 7;
  let weeksToAdd = weekOfLastRace >= 12 ? 0 : 12 - weekOfLastRace;
  if(week) weeksToAdd = 0;
  let lastSeasonDayTimeStamp = lastRaceDayTimestamp + (weeksToAdd * (7*24*60*60*1000)) + ((6-dayOfLastRace) * (24*60*60*1000));

  console.log("Last Season TS", lastSeasonDayTimeStamp);

  console.log("Team KPIs");
  // Calculate team KPIs races done, wins, driver count
  const teamKPIs = {
    irsum: 0,
    gain: 0,
    wins: 0,
    podiums: 0,
    top5s: 0,
    poles: 0,
    dnfs: 0,
    races: 0,
    incs: 0,
  };
  for(let i = 0; i < profiles.length; i++) {
    teamKPIs.irsum += profiles[i].endIr;
    teamKPIs.gain += profiles[i].kpis.gain;
    teamKPIs.wins += profiles[i].kpis.wins;
    teamKPIs.podiums += profiles[i].kpis.podiums;
    teamKPIs.top5s += profiles[i].kpis.top5s;
    teamKPIs.poles += profiles[i].kpis.poles;
    teamKPIs.dnfs += profiles[i].kpis.dnfs;
    teamKPIs.races += profiles[i].kpis.races;
    teamKPIs.incs += profiles[i].kpis.incs;
  }


  // Calculate team timelines ir, races done, labels
  console.log("Team Timeseries");
  const timeSeries = {
    races: [],
    avgRating: [],
    irsum: [],
    labels: [],
  };

  // Init
  timeSeries.races.push(0);
  timeSeries.irsum.push(profiles.reduce((sum, p) => sum + p.startIr, 0));
  timeSeries.labels.push('M0');
  timeSeries.avgRating.push(timeSeries.irsum[0] / profiles.length);

  const lastRatings = profiles.map((e) => e.startIr);

  let dayCount = 0;
  let weekCount = week || 1;
  const dayMillies = (24*60*60*1000);
  for(let t = firstSeasonDayTimeStamp; t <= lastSeasonDayTimeStamp; t += dayMillies) {
    console.log("TIMESERIES loop", t);
    let dayData = {
      races: 0,
      avgRating: 0,
      irsum: 0,
      label: '',
    };
    for(let j = 0; j < profiles.length; j++) {
      if(profiles[j].timeseries[t]) {
        //races
        dayData.races += profiles[j].timeseries[t].races;
        // rating
        dayData.irsum += profiles[j].timeseries[t].rating;
        lastRatings[j] = profiles[j].timeseries[t].rating;
      } else {
        dayData.irsum += lastRatings[j];
      }
    }

    if(dayData)
    // avg rating
    dayData.avgRating = dayData.irsum / profiles.length;

    // label TODO: with get label
    dayData.label = getLabel(t, weekCount);
    dayCount++;
    if(dayCount > 6) {
      dayCount = 0;
      weekCount++;
    }

    timeSeries.races.push(dayData.races);
    timeSeries.avgRating.push(dayData.avgRating);
    timeSeries.irsum.push(dayData.irsum);
    timeSeries.labels.push(dayData.label);
  }

  console.log("Gain Report");
  // Calculate gains report
  profiles.sort((a, b) => b.kpis.gain - a.kpis.gain);
  const gainReport = {
    labels: [],
    gains: [],
  };
  
  let gainAvgIn = false;
  for(let i = 0; i < profiles.length; i++) {
    if(!gainAvgIn && profiles[i].kpis.gain < teamKPIs.gain / profiles.length) {
      gainAvgIn = true;
      gainReport.labels.push('TEAM AVERAGE');
      gainReport.gains.push(teamKPIs.gain / profiles.length);
    }
    gainReport.labels.push(profiles[i].displayName.replaceAll('+', ' '));
    gainReport.gains.push(profiles[i].kpis.gain);
  }

  console.log("ir report");
  // calculate ir report
  profiles.sort((a, b) => b.endIr - a.endIr);
  const driverIrReport = {
    labels: [],
    ratings: [],
  };
  let teamAvgIn = false;
  for(let i = 0; i < profiles.length; i++) {
    if(!teamAvgIn && profiles[i].endIr < teamKPIs.irsum / profiles.length) {
      teamAvgIn = true;
      driverIrReport.labels.push('TEAM AVERAGE');
      driverIrReport.ratings.push(teamKPIs.irsum / profiles.length);
    }
    driverIrReport.labels.push(profiles[i].displayName.replaceAll('+', ' '));
    driverIrReport.ratings.push(profiles[i].endIr);
  }

  console.log("Race outcomes");
  // calculate races outcome report
  const raceOutcomeData = {
    wins: 0,
    secThirds: 0,
    finishs: 0,
    dnfs: 0,
  }
  for(let i = 0; i < profiles.length; i++) {
    raceOutcomeData.wins += profiles[i].kpis.wins;
    raceOutcomeData.secThirds += profiles[i].kpis.podiums - profiles[i].kpis.wins;
    raceOutcomeData.dnfs += profiles[i].kpis.dnfs - profiles[i].kpis.wins;
    raceOutcomeData.finishs += profiles[i].kpis.races - profiles[i].kpis.dnfs - profiles[i].kpis.podiums;
  }


  console.log("Series Report");
  // calculate series report
  const seriesReportData = {};
  for(let i = 0; i < profiles.length; i++) {
    for(const s in profiles[i].seriesStats) {
      if(!seriesReportData[s]) seriesReportData[s] = 0;
      seriesReportData[s] += profiles[i].seriesStats[s];
    }
  }

  console.log("Driver awards");
  const driverAwards = [];
  // calculate driver awards
  // top farmes
  driverAwards.push(createTopFarmerAward(profiles));

  // winner
  driverAwards.push(createTopWinnerAward(profiles));

  // most races
  driverAwards.push(createRacerAward(profiles));

  // inc collecot
  driverAwards.push(createInCollectorAward(profiles));

  // Format Data for output
  console.log("Formatting data for output")
  const outputData = {
    teamName,
    year,
    season,
    week,
    catId,
  };

  const racesSeriesReport = {
    labels: [],
    counts: [],
  }
  for(const sr in seriesReportData) {
    racesSeriesReport.labels.push(sr);
    racesSeriesReport.counts.push(seriesReportData[sr])
  }

  outputData.teamReport = {
    kpis: [
			{
				title: 'Races done',
				value: teamKPIs.races,
			},
			 {
				title: 'Driver in Team',
				value: profiles.length,
			},
			{
				title: 'iRating Gain',
				value: teamKPIs.gain,
			},
			{
				title: 'Offical Wins',
				value: teamKPIs.wins,
			},
    ],
    irReport: {
			labels: timeSeries.labels,
			ratings: timeSeries.avgRating,
			races: timeSeries.races,
		},
    gainReport,
		driverIrReport,
		racesSeriesReport,
		racesOutcomeReport: {
			labels: ['Wins', '2nd-3rd', 'Finished', 'DNF'],
			counts: [raceOutcomeData.wins, raceOutcomeData.secThirds, raceOutcomeData.finishs, raceOutcomeData.dnfs],
		},
    driverAwards,
  };

  console.log(JSON.stringify(outputData.teamReport.irReport));


  console.log('Done.')
  console.log(outputData);

  await output.createReportPage(outputData);

}

