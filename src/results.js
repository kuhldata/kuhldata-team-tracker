/* eslint-disable prefer-destructuring */
/* eslint-disable radix */
/* eslint-disable no-console */
const fetch = require('node-fetch');
const neatCsv = require('neat-csv');

// const config = require('../../config');

/* const publishSubSessionToSns = async (subSession, subSessionId) => {
  const attr = {
    resource: {
      DataType: 'String',
      StringValue: 'subsession',
    },
    event: {
      DataType: 'String',
      StringValue: 'saved',
    },
    resourceId: {
      DataType: 'Number',
      StringValue: `${subSessionId}`,
    }
  };

  const msg = {
    TopicArn: config.sns.arn,
    MessageAttributes: attr,
    Message: JSON.stringify(subSession),
  };

  return sns.publish(msg).promise();
}

const putResultToDb = async (result) => {
  const params = {
    TableName: config.db.resultDynName,
    Item: result,
  };
  return dynamodb.put(params).promise();
}; */

/* const publishDriverResultToSns = async (subSession, subSessionId) => {
  const eventBody = result;

  const attr = {
    resource: {
      DataType: 'String',
      StringValue: 'subsession',
    },
    event: {
      DataType: 'String',
      StringValue: 'saved',
    },
    resourceId: {
      DataType: 'Number',
      StringValue: subSessionId,
    }
  };

  const msg = {
    TopicArn: config.sns.arn,
    Message: JSON.stringify(subSession),
    MessageAttributes: attr,
  };

  return sns.publish(msg).promise();

} */

const levelSubLevelToLicense = (level, subLevel) => {
  const intSubLevel = parseInt(subLevel);
  const intLevel = parseInt(level);
  // ProWc 28 7000
  if (intLevel > 24) return 7000 + intSubLevel;
  // Pro 24 6000
  if (intLevel > 20) return 6000 + intSubLevel;
  // A4 20 5000
  if (intLevel > 16) return 5000 + intSubLevel;
  // B4 16 4000
  if (intLevel > 12) return 4000 + intSubLevel;
  // C4 12 3000
  if (intLevel > 8) return 3000 + intSubLevel;
  // D4 8 2000
  if (intLevel > 4) return 2000 + intSubLevel;
  // R 4 1000
  return 1000 + intSubLevel;
};

const timeStringToMs = (ts) => {
  if (ts === '' || ts.length > 9) return 0;
  let time = 0;
  let split = ts.split(':');
  if (split.length === 1) { // no minutes
    split = split[0];
  } else {
    time += parseInt(split[0]) * 60 * 1000;
    split = split[1];
  }
  split = split.split('.');
  time += parseInt(split[0]) * 1000 + parseInt(split[1]);
  return time;
};

const mapRaceCSVObj = (csvQbj) => ({
  rFinPos: parseInt(csvQbj['Fin Pos']),
  carId: parseInt(csvQbj['Car ID']),
  carName: csvQbj.Car,
  carClassId: parseInt(csvQbj['Car Class ID']),
  carClassName: csvQbj['Car Class'],
  driverId: parseInt(csvQbj['Cust ID']),
  teamId: parseInt(csvQbj['Team ID']),
  driverName: csvQbj.Name,
  startPos: parseInt(csvQbj['Start Pos']),
  carNumber: parseInt(csvQbj['Car #']),
  outId: parseInt(csvQbj['Out ID']),
  outText: csvQbj.Out,
  intervalText: csvQbj.Interval,
  lapsLed: parseInt(csvQbj['Laps Led']),
  fastestRaceLap: parseInt(csvQbj['Fast Lap#']) || 0,
  fastestRaceLapTime: timeStringToMs(csvQbj['Fastest Lap Time']),
  avgRaceLapTime: timeStringToMs(csvQbj['Average Lap Time']),
  completedRaceLaps: parseInt(csvQbj['Laps Comp']) || 0,
  raceIncs: parseInt(csvQbj.Inc),
  points: parseInt(csvQbj.Pts),
  clubPoints: parseInt(csvQbj['Club Pts']) || 0,
  div: parseInt(csvQbj.Div) || 0,
  clubId: parseInt(csvQbj['Club ID']),
  clubName: csvQbj.Club,
  oldIRating: parseInt(csvQbj['Old iRating']) || 0,
  newIRating: parseInt(csvQbj['New iRating']) || 0,
  oldLicense: levelSubLevelToLicense(csvQbj['Old License Level'], csvQbj['Old License Sub-Level']),
  newLicense: levelSubLevelToLicense(csvQbj['New License Level'], csvQbj['New License Sub-Level']),
  seriesName: csvQbj['Series Name'],
  aggPts: parseInt(csvQbj['Agg Pts']),
});

const mapQualiToObj = (csvObj) => ({
  qFinPos: parseInt(csvObj['Fin Pos']),
  qualiyTime: timeStringToMs(csvObj['Qualify Time']),
  avgQualiTime: timeStringToMs(csvObj['Average Lap Time']),
  fastestQualifyLap: parseInt(csvObj['Fast Lap#']),
  completedQualifyLaps: parseInt(csvObj['Laps Comp']),
  carClassId: parseInt(csvObj['Car Class ID']),
  driverId: parseInt(csvObj['Cust ID']),
  teamId: parseInt(csvObj['Team ID']),
});

const getResult = async (subSessionId, cookieString, sessionType) => fetch(`https://members.iracing.com/membersite/member/GetEventResultsAsCSV?subsessionid=${subSessionId}&simsesnum=${sessionType}&includeSummary=0`, {
  method: 'GET',
  headers: {
    Cookie: cookieString,
  },
})
  .then(async (res) => {
    if (res.ok && res.url.includes('login')) {
      const err = new Error('Cookie invalid');
      console.log(err);
      err.type = 'cookie';
      throw err;
    }
    if (res.ok) return res.text();
    console.log(`Res status is: ${res.status}`);
    console.log(`Cookiestring ${cookieString}`);
    console.log(`subSessionId ${subSessionId}`);
    console.log(`sessionType ${sessionType}`);
    console.log(`res text ${await res.text()}`);
    console.log(res);
    const error = new Error('Could not get results!?');
    console.log(error);
    throw error;
  })
  .then((csv) => {
    if (csv.length < 450 && (csv.match(/\n/g) || '').length < 2) {
      const error = new Error('Result not found.');
      error.type = 'notfound';
      console.log(error);
      throw error;
    }
    return csv;
  });

module.exports.getOfficalResults = async (cookieString, subSessionId) => {
  const metaData = {
    numOfDrivers: 0,
    numOfTeams: 0,
  };
  const temp = {
    driverIRSum: 0,
    teamData: {},
    classData: {},
    classQFinPos: 0,
    classRFinPos: 0,

  };
  // GET RACE Results
  const results = await getResult(subSessionId, cookieString, 0)
    .then(neatCsv)
    .then((rawArray) => {
      const data = [];
      let ele;
      for (let i = 0; i < rawArray.length; i += 1) {
        try {
          ele = mapRaceCSVObj(rawArray[i]);
        } catch (err) {
          console.log('HERE', err);
          throw err;
        }

        if (i === 0) {
          metaData.winnerName = ele.driverName;
          metaData.winnerId = ele.driverId;
        }
        // num drivers & mu,teams
        if (ele.driverId < 0) {
          metaData.numOfTeams += 1; // numOfTeams
          if (!temp.teamData[`${ele.teamId}`]) {
            temp.teamData[`${ele.teamId}`] = {
              sof: 0, ir: 0, drivers: [], name: ele.driverName,
            };
          }
          if (!temp.classData[`${ele.carClassId}`]) {
            temp.classData[`${ele.carClassId}`] = {
              ir: 0,
              classWinnerId: ele.driverId,
              classWinnerName: ele.driverName,
              finPos: 0,
              qPos: 0,
              driverCount: 0,
              sof: 0,
            };
          }
        }
        if (ele.driverId === ele.teamId) {
          if (!temp.classData[`${ele.carClassId}`]) {
            temp.classData[`${ele.carClassId}`] = {
              ir: 0,
              classWinnerId: ele.driverId,
              classWinnerName: ele.driverName,
              finPos: 0,
              qPos: 0,
              driverCount: 0,
              sof: 0,
            };
          }
          temp.classData[`${ele.carClassId}`].finPos += 1;
        }
        if (ele.driverId > 0) {
          metaData.numOfDrivers += 1; // numOfDrivers
          temp.driverIRSum += ele.oldIRating; // for sof
          if (!temp.teamData[`${ele.teamId}`]) {
            temp.teamData[`${ele.teamId}`] = {
              sof: 0, ir: 0, drivers: [], name: '',
            };
          }
          temp.teamData[`${ele.teamId}`].ir += ele.oldIRating;
          temp.teamData[`${ele.teamId}`].drivers.push({
            driverName: ele.driverName,
            driverId: ele.driverId,
          });
          temp.teamData[`${ele.teamId}`].sof = Math.round(temp.teamData[`${ele.teamId}`].ir / temp.teamData[`${ele.teamId}`].drivers.length);
          if (!temp.classData[`${ele.carClassId}`]) {
            temp.classData[`${ele.carClassId}`] = {
              ir: 0,
              classWinnerId: ele.driverId,
              classWinnerName: ele.driverName,
              finPos: 0,
              qPos: 0,
              driverCount: 0,
              sof: 0,
            };
          }
          temp.classData[`${ele.carClassId}`].ir += ele.oldIRating; // classSof
          temp.classData[`${ele.carClassId}`].driverCount += 1;
          temp.classData[`${ele.carClassId}`].sof = Math.round(temp.classData[`${ele.carClassId}`].ir / temp.classData[`${ele.carClassId}`].driverCount);
        }
        ele.classRFinPos = temp.classData[`${ele.carClassId}`].finPos;

        data.push(ele);
      }
      return data;
    });

  metaData.sof = Math.floor(temp.driverIRSum / metaData.numOfDrivers);
  metaData.classData = temp.classData;
  metaData.teamData = temp.teamData;

  // get quali if available and merge quali fields
  let qualiCSV;
  try {
    qualiCSV = await getResult(subSessionId, cookieString, -1).then(neatCsv);
  } catch (err) {
    console.log(`Could not get Quali Setup for ${subSessionId}`);
  }

  let enrichObj;
  if (qualiCSV) {
    // add qualidata
    enrichObj = {};
    let qEle;
    for (let i = 0; i < qualiCSV.length; i += 1) {
      qEle = mapQualiToObj(qualiCSV[i]);
      if (qEle.driverId === qEle.teamId) {
        temp.classData[`${qEle.carClassId}`].qPos += 1;
      }
      qEle.classQFinPos = temp.classData[`${qEle.carClassId}`].qPos;
      enrichObj[qualiCSV[i]['Cust ID']] = qEle;
    }
  }

  // enrich and calculate
  for (let i = 0; i < results.length; i += 1) {
    if (enrichObj && enrichObj[`${results[i].driverId}`]) {
      results[i].classQFinPos = enrichObj[`${results[i].driverId}`].classQFinPos;
      results[i].qFinPos = enrichObj[`${results[i].driverId}`].qFinPos;
      results[i].qualiyTime = enrichObj[`${results[i].driverId}`].qualiyTime;
      results[i].avgQualiTime = enrichObj[`${results[i].driverId}`].avgQualiTime;
      results[i].fastestQualifyLap = enrichObj[`${results[i].driverId}`].fastestQualifyLap || 0;
      results[i].completedQualifyLaps = enrichObj[`${results[i].driverId}`].completedQualifyLaps;
    }
    if (temp.teamData[`${results[i].teamId}`]) {
      results[i].teamName = temp.teamData[`${results[i].teamId}`].name;
      results[i].teamDrivers = temp.teamData[`${results[i].teamId}`].drivers;
      results[i].teamIR = temp.teamData[`${results[i].teamId}`].sof;
    }
    if (temp.classData[`${results[i].carClassId}`]) {
      results[i].classWinnerId = temp.classData[`${results[i].carClassId}`].classWinnerId;
      results[i].classWinnerName = temp.classData[`${results[i].carClassId}`].classWinnerName;
      results[i].classSof = temp.classData[`${results[i].carClassId}`].sof;
      results[i].numOfClassDrivers = temp.classData[`${results[i].carClassId}`].driverCount;
    }
  }

  return {
    metaData,
    results,
  };
};
