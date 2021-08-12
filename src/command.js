#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const yargs = require('yargs');

const report = require('./report');

let argv = yargs(process.argv.slice(2)).argv;

let catId = 2;

if(argv.road) catId = 2;
else if(argv.oval) catId = 1;
else if(argv.dirtRoad) catId = 4;
else if(argv.dirtOval) catId = 3;

if(!argv.teamName) {
  console.log(`Team name not set correctly. Found ${argv.teamName}. Aborting.`);
  process.exit(0);
}

let year = 0;
if(!argv.year) {
  const date = new Date();
  year = date.getUTCFullYear();
  console.log(`Year not set. Using ${year}.`);
} else if(argv.year < 2000) {
  console.log(`Year not set correctly. Found ${argv.year}. Aborting.`);
  process.exit(0);
} else {
  year = argv.year;
}

if(!argv.season || argv.season < 1 || argv.season > 4) {
  console.log(`Season not set correctly. Found ${argv.season}. Aborting.`);
  process.exit(0);
}
if(!argv.week) {
  // ok
} else if (argv.week < 1 || argv.week > 14) {
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

if(!argv.team) {
  console.log(`Team not set correctly. Aborting.`);
  process.exit(0);
} else {
  fs.readFile(argv.team, 'utf8', function(err, data) {
    if (err) {
      console.error("Could not find team file.")
      throw err;
    }
    console.log('Found team file: ' + argv.team);
    const drivers = data.split(/\r?\n/);
    for(let i = 0; i < drivers.length; i++) {
      if(drivers[i] < 10000 || drivers[i] > 999999) {
        console.log(`Team error. ${drivers[i]} does not look like a valid customer id.`);
        process.exit(0);
      }
    }

    if(argv.week) console.log(`Creating Week Report for ${argv.year} S${argv.season} Week ${argv.week} for ${drivers.length} drivers.`);
    else console.log(`Creating Season Report for ${argv.year} S${argv.season} for ${drivers.length} drivers.`);
    
    report.createReport({
      drivers,
      user: argv.user,
      pass: argv.pass,
      catId,
      year,
      season: argv.season,
      week: argv.week || null,
      teamName: argv.teamName,
    });
  });
}
