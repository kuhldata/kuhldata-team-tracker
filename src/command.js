#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');

const yargs = require('yargs');
const timeConverter = require('ir-time-converter');

const report = require('./report');

const { argv } = yargs(process.argv.slice(2));

let catId = 2;

if (argv.road) catId = 2;
else if (argv.oval) catId = 1;
else if (argv.dirtRoad) catId = 4;
else if (argv.dirtOval) catId = 3;

if (!argv.teamName) {
  console.log(`Team name not set correctly. Found ${argv.teamName}. Aborting.`);
  process.exit(0);
}

let year = 0;
if (!argv.year) {
  const date = new Date();
  year = date.getUTCFullYear();
  console.log(`Year not set. Using ${year}.`);
} else if (argv.year < 2000) {
  console.log(`Year not set correctly. Found ${argv.year}. Aborting.`);
  process.exit(0);
} else {
  year = argv.year;
}

if (!argv.season || argv.season < 1 || argv.season > 4) {
  console.log(`Season not set correctly. Found ${argv.season}. Aborting.`);
  process.exit(0);
}

let includeWeek13 = false;
if (argv.includeWeek13) {
  includeWeek13 = true;
}

const seasonTimes = timeConverter.iRacingSeasonToDates(year, argv.season, includeWeek13);

if (!argv.week) {
  // ok
} else if (argv.week < 1 || argv.week > 14) {
  console.log(`Week not set correctly. Found ${argv.week}. Aborting.`);
  process.exit(0);
}

let weekCount = 1;
if (!argv.weekCount) {
  // ok
} else if (!argv.week) {
  console.log('--week need to be set in order to use --weekCount.');
  process.exit(0);
} else {
  weekCount = argv.weekCount;
}

let weekTimes = null;
if (argv.week) {
  weekTimes = timeConverter.iRacingWeekToDates(
    year, argv.season, argv.week, weekCount, includeWeek13,
  );
}

if (!argv.user) {
  console.log(`User not set correctly. Found ${argv.user}. Aborting.`);
  process.exit(0);
}
if (!argv.pass) {
  console.log('Pass not set correctly. Aborting.');
  process.exit(0);
}

if (!argv.team) {
  console.log('Team not set correctly. Aborting.');
  process.exit(0);
} else {
  fs.readFile(argv.team, 'utf8', (err, data) => {
    if (err) {
      console.error('Could not find team file.');
      throw err;
    }
    console.log(`Found team file: ${argv.team}`);
    const drivers = data.split(/\r?\n/);
    for (let i = 0; i < drivers.length; i += 1) {
      if (drivers[i] < 10000 || drivers[i] > 999999) {
        console.log(`Team error. ${drivers[i]} does not look like a valid customer id.`);
        process.exit(0);
      }
    }

    if (weekTimes) {
      console.log(`Creating Week Report for ${year} S${argv.season} week ${argv.week} to week ${argv.week + weekCount - 1} for ${drivers.length} drivers.`);
      report.createReport({
        drivers,
        user: argv.user,
        pass: argv.pass,
        catId,
        startTime: weekTimes.start,
        endTime: weekTimes.end,
        teamName: argv.teamName,
      });
    } else {
      console.log(`Creating Season Report for ${year} S${argv.season} for ${drivers.length} drivers.`);
      report.createReport({
        drivers,
        user: argv.user,
        pass: argv.pass,
        catId,
        startTime: seasonTimes.start,
        endTime: seasonTimes.end,
        teamName: argv.teamName,
      });
    }
  });
}
