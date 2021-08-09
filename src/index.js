#!/usr/bin/env node

const yargs = require('yargs/yargs')

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const cookies = require('ir-cookie-scraper');
const iracing = require('./iracing');
const results = require('./results');

const config = require('../config');

const sessions = {};

function delay(time) {
  return new Promise(function(resolve) { 
      setTimeout(resolve, time)
  });
}

const getProfiles = async (cookieString, drivers) => {
  const profiles = [];
  let profile = null;
  for(let i = 0; i < drivers.length; i++) {
    profile = await iracing.getProfil(cookieString, drivers[i]);
    profile.firstStartTime = -1;
    profile.lastStartTime = -1;
    profile.firstSubSessionId = null;
    profile.lastSubSessionId = null;
    
    console.log(profile);
    if(profile.success) {
      profiles.push(profile);
    } else {
      console.log(`Invalid customer id ${drivers[i]}`);
      throw new Error('Invalid ')
    }
    console.log(`Got ${i+1}/${drivers.length}`);
    await delay(config.delay);
  }
  return profiles;
}

const createWeekReport = async (drivers, user, pass, year, season, week) => {
  // get Cookie
  console.log('Getting cookie... ');
  let cookieString = await cookies.scrapeCookie(user, pass);
  console.log('Cookie done. Yum.');
  console.log(cookieString);

  // get Profile
  console.log('Getting profiles... ');
  const profiles = await getProfiles(cookieString, drivers);
  console.log('Profiles loaded.');
  console.log(profiles);
  console.log('Searching races... ');
  let raceCount = 0;
  for(let i = 0; i < profiles.length; i++) {
    let races = await iracing.getRaces(cookieString, profiles[i].custID, year, season, week);
    if(races && races.length > 0) {
      raceCount += races.length;
      profiles[i].races = races;
    } else {
      profiles[i].races = [];
    }
    console.log(`Found races of ${i+1}/${profiles.length} drivers`);
    await delay(config.delay);
  } 
  console.log(`${raceCount} Races found.`);
  console.log(profiles[0].races);

  await delay(config.delay);
  // Get Sessions
  const sessions = {};
  console.log('Getting Subsession Data...');
  for(let i = 0; i < profiles.length; i++) {
    for(let j = 0; j < profiles[i].races.length; j++) {
      // noting down first and last subsession per driver
      if(profiles[i].firstStartTime < 0 || profiles[i].firstStartTime > profiles[i].races[j].startTime) {
        profiles[i].firstStartTime = profiles[i].races[j].startTime;
        profiles[i].firstSubSessionId = profiles[i].races[j].subSessionId;
      }
      if(profiles[i].lastStartTime < 0 || profiles[i].lastStartTime < profiles[i].races[j].startTime) {
        profiles[i].lastStartTime = profiles[i].races[j].startTime;
        profiles[i].lastSubSessionId = profiles[i].races[j].subSessionId;
      }
      if(!sessions[profiles[i].races[j].subSessionId]) {
        try {
          sessions[profiles[i].races[j].subSessionId] = await results.getOfficalResults(cookieString, profiles[i].races[j].subSessionId);

        } catch(e) {
          console.log(e);
        }
      }
      console.log('.');
      await delay(config.delay);
    }
    console.log(`Results from driver ${i+1}/${profiles.length} done.`)
  }

  console.log('Done.');

  console.log(profiles[0]);


  // Calculations
  console.log('Starting Calculations')
  const outputData = profiles.map((p) => {
    const out = {
      driver: p.displayName.replace('+', ' '),
      customerId: p.custID,
      iRatingStart: 0,
      iRatingEnd: 0,
      iRatingGain: 0,
      incs: 0,
      poles: 0,
      wins: 0,
      podiums: 0,
      top5: 0,
      races: 0,
      ratingPerRace: 0,
    };

    for(let i = 0; i < p.races.length; i++) {
      let subSessionId = p.races[i].subSessionId;
      let result = null;
      if(sessions[subSessionId]) {
        // GET Result
        result = sessions[subSessionId].results.find(e => e.driverId == p.custID);
      }
      if(result) {
        // is first race of the week?
        if(subSessionId == p.firstSubSessionId) {
          out.iRatingStart = result.oldIRating;
        }
        if(subSessionId == p.lastSubSessionId) {
          out.iRatingEnd = result.newIRating;
        }
        out.incs += result.raceIncs;

        if(result.classQFinPos === 1) out.poles++;

        if(result.classRFinPos === 1) out.wins++;

        if(result.classRFinPos <= 3) out.podiums++;

        if(result.classRFinPos <= 5) out.top5++;

        out.races++;

      } else {
        console.log(`Could not find result for session ${subSessionId} of driver ${p.custID}`);
      }
    }

    out.ratingPerRace = (out.iRatingEnd - out.iRatingStart) / out.races;
    out.iRatingGain = out.iRatingEnd - out.iRatingStart;
    return out;
  });
  console.log('Calculations Done.')

  console.log(outputData);

  // Save Data
  console.log('Saving Data.')
  const csvWriter = createCsvWriter({
    path: `./files/${year}-${season}-${week}.csv`,
    header: [
        {id: 'driver', title: 'DRIVER'},
        {id: 'customerId', title: 'ID'},
        {id: 'iRatingStart', title: 'IR START'},

        {id: 'iRatingEnd', title: 'IR END'},
        {id: 'iRatingGain', title: 'IR GAIN'},
        
        {id: 'incs', title: 'INCS'},
        {id: 'poles', title: 'POLES'},
        {id: 'wins', title: 'WINS'},
        {id: 'podiums', title: 'PODIUMS'},
        {id: 'top5', title: 'TOP5'},
        {id: 'races', title: 'RACES'},
        {id: 'ratingPerRace', title: 'IR PER RACE'},
    ]
  });
  
  await csvWriter.writeRecords(outputData);

  console.log('Done.')


}

let argv = yargs(process.argv.slice(2)).argv;

if(!argv.year || argv.year < 2000) {
  console.log(`Year not set correctly. Found ${argv.year}. Aborting.`);
  process.exit(0);
}

if(!argv.season || argv.season < 1 || argv.season > 4) {
  console.log(`Season not set correctly. Found ${argv.season}. Aborting.`);
  process.exit(0);
}
if(!argv.week || argv.week < 1 || argv.week > 14) {
  console.log(`Week not set correctly. Found ${argv.week}. Aborting.`);
  process.exit(0);
}
if(!argv.user) {
  console.log(`User not set correctly. Found ${argv.user}. Aborting.`);
  process.exit(0);
}
if(!argv.pass) {
  console.log(`Pass not set correctly. Aborting.`);
  process.exit(0);
}
if(!argv.drivers || argv.drivers.length < 1) {
  console.log(`Drivers not set correctly. Found ${argv.drivers}. Aborting.`);
  process.exit(0);
}

console.log(`Creating Week Report for ${argv.year} S${argv.season} Week ${argv.week} for ${argv.drivers.length} drivers.`);

createWeekReport(argv.drivers, argv.user, argv.pass, argv.year, argv.season, argv.week);

  // get races and results for cetain week

  //let profile = await iracing.getProfil(cookieString, 640026);
  //console.log(profile);
  //let races = await iracing.getRaces(cookieString, 640026, 2021, 3, 8);
  //console.log(races);
  //let result = await results.getOfficalResults(cookieString, 40042495);
  //console.log(result);


