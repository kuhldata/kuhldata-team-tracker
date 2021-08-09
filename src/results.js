const fetch = require('node-fetch');
const neatCsv = require('neat-csv');

//const config = require('../../config');

/*const publishSubSessionToSns = async (subSession, subSessionId) => {
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
};*/


/*const publishDriverResultToSns = async (subSession, subSessionId) => {
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
  
}*/

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
    if(intLevel > 8) return 3000 + intSubLevel;
    // D4 8 2000
    if(intLevel > 4) return 2000 + intSubLevel;
    // R 4 1000
    return 1000 + intSubLevel;
}

const timeStringToMs = (ts) => {
  if(ts == '' || ts.length > 9) return 0;
  let time = 0;
  let split = ts.split(':');
  if(split.length == 1) { // no minutes
    split = split[0];
  } else {
    time += parseInt(split[0])*60*1000;
    split = split[1];
  }
  split = split.split('.');
  time += parseInt(split[0])*1000 + parseInt(split[1]);
  return time;
}

const mapRaceCSVObj = (csvQbj) => ({
  rFinPos: parseInt(csvQbj['Fin Pos']),
  carId: parseInt(csvQbj['Car ID']),
  carName: csvQbj['Car'],
  carClassId: parseInt(csvQbj['Car Class ID']),
  carClassName: csvQbj['Car Class'],
  driverId: parseInt(csvQbj['Cust ID']),
  teamId: parseInt(csvQbj['Team ID']),
  driverName: csvQbj['Name'],
  startPos: parseInt(csvQbj['Start Pos']),
  carNumber: parseInt(csvQbj['Car #']),
  outId: parseInt(csvQbj['Out ID']),
  outText: csvQbj['Out'],
  intervalText: csvQbj['Interval'],
  lapsLed: parseInt(csvQbj['Laps Led']),
  fastestRaceLap: parseInt(csvQbj['Fast Lap#']) || 0,
  fastestRaceLapTime: timeStringToMs(csvQbj['Fastest Lap Time']),
  avgRaceLapTime: timeStringToMs(csvQbj['Average Lap Time']),
  completedRaceLaps: parseInt(csvQbj['Laps Comp']) || 0,
  raceIncs: parseInt(csvQbj['Inc']),
  points: parseInt(csvQbj['Pts']),
  clubPoints: parseInt(csvQbj['Club Pts']) || 0,
  div: parseInt(csvQbj['Div']) || 0,
  clubId: parseInt(csvQbj['Club ID']),
  clubName: csvQbj['Club'],
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
    'Cookie': cookieString,
  }
})
.then(async res => {
  if(res.ok && res.url.includes('login')) {
    const err = new Error('Cookie invalid');
    logger.error(err);
    err.type = 'cookie';
    throw err;
  }
  if(res.ok) return res.text();
  logger.info(`Res status is: ${res.status}`);
  logger.info(`Cookiestring ${cookieString}`);
  logger.info(`subSessionId ${subSessionId}`);
  logger.info(`sessionType ${sessionType}`);
  logger.info(`res text ${await res.text()}`);
  logger.error(res);
  const error =  new Error('Could not get results!?');
  logger.error(error);
  throw error;
})
.then(csv => {
  if(csv.length < 450 && (csv.match(/\n/g) || '').length < 2) {
    const error =  new Error('Result not found.');
    error.type = 'notfound';
    logger.error(error);
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
    .then(rawArray => {
      const data = [];
      let ele;
      for(let i = 0; i < rawArray.length; i++) {
        try {
          ele = mapRaceCSVObj(rawArray[i]);
        } catch(err) {
          logger.error('HERE', err);
          throw err;
        }

        if(i == 0) {
          metaData.winnerName = ele.driverName;
          metaData.winnerId = ele.driverId;
        }
        // num drivers & mu,teams
        if(ele.driverId < 0) {
          metaData.numOfTeams++; // numOfTeams
          if(!temp.teamData[`${ele.teamId}`]) temp.teamData[`${ele.teamId}`] = { sof: 0, ir: 0, drivers: [], name: ele.driverName };
          if(!temp.classData[`${ele.carClassId}`]) temp.classData[`${ele.carClassId}`] = { ir: 0, classWinnerId: ele.driverId, classWinnerName: ele.driverName, finPos: 0, qPos: 0, driverCount: 0, sof: 0 };
        } 
        if(ele.driverId == ele.teamId)  {
          if(!temp.classData[`${ele.carClassId}`]) temp.classData[`${ele.carClassId}`] = { ir: 0, classWinnerId: ele.driverId, classWinnerName: ele.driverName, finPos: 0, qPos: 0, driverCount: 0, sof: 0 };
          temp.classData[`${ele.carClassId}`].finPos++;
        }
        if(ele.driverId > 0) {
          metaData.numOfDrivers++; // numOfDrivers
          temp.driverIRSum += ele.oldIRating; // for sof
          if(!temp.teamData[`${ele.teamId}`]) temp.teamData[`${ele.teamId}`] = {sof: 0, ir: 0, drivers: [], name: '' };
          temp.teamData[`${ele.teamId}`].ir += ele.oldIRating;
          temp.teamData[`${ele.teamId}`].drivers.push({ 
            driverName: ele.driverName,
            driverId: ele.driverId,
          });
          temp.teamData[`${ele.teamId}`].sof = Math.round(temp.teamData[`${ele.teamId}`].ir / temp.teamData[`${ele.teamId}`].drivers.length);
          if(!temp.classData[`${ele.carClassId}`]) temp.classData[`${ele.carClassId}`] = { ir: 0, classWinnerId: ele.driverId, classWinnerName: ele.driverName, finPos: 0, qPos: 0, driverCount: 0, sof: 0 };
          temp.classData[`${ele.carClassId}`].ir += ele.oldIRating; // classSof
          temp.classData[`${ele.carClassId}`].driverCount++;
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
    logger.error(`Could not get Quali Setup for ${subSessionId}`);
  }

  let enrichObj;
  if(qualiCSV) {
    // add qualidata
    enrichObj = {};
    let qEle;
    for(let i = 0; i < qualiCSV.length; i++) {
      qEle = mapQualiToObj(qualiCSV[i]);
      if(qEle.driverId == qEle.teamId)  {
        temp.classData[`${qEle.carClassId}`].qPos++;
      }
      qEle.classQFinPos = temp.classData[`${qEle.carClassId}`].qPos;
      enrichObj[qualiCSV[i]['Cust ID']] = qEle;
    }
  }

  // enrich and calculate
  for( let i = 0; i < results.length; i++) {
    if(enrichObj && enrichObj[`${results[i].driverId}`]) { 
      results[i].classQFinPos = enrichObj[`${results[i].driverId}`].classQFinPos;
      results[i].qFinPos = enrichObj[`${results[i].driverId}`].qFinPos;
      results[i].qualiyTime = enrichObj[`${results[i].driverId}`].qualiyTime;
      results[i].avgQualiTime = enrichObj[`${results[i].driverId}`].avgQualiTime;
      results[i].fastestQualifyLap = enrichObj[`${results[i].driverId}`].fastestQualifyLap || 0;
      results[i].completedQualifyLaps = enrichObj[`${results[i].driverId}`].completedQualifyLaps;
    }
    if(temp.teamData[`${results[i].teamId}`]) {
      results[i].teamName = temp.teamData[`${results[i].teamId}`].name;
      results[i].teamDrivers = temp.teamData[`${results[i].teamId}`].drivers;
      results[i].teamIR = temp.teamData[`${results[i].teamId}`].sof;
    }
    if(temp.classData[`${results[i].carClassId}`]) {
      results[i].classWinnerId = temp.classData[`${results[i].carClassId}`].classWinnerId;
      results[i].classWinnerName = temp.classData[`${results[i].carClassId}`].classWinnerName;
      results[i].classSof = temp.classData[`${results[i].carClassId}`].sof;
      results[i].numOfClassDrivers = temp.classData[`${results[i].carClassId}`].driverCount;
    }
  }


  return {
    metaData,
    results,
  }
}

/*const getAndSaveOfficialResults = async ({ enrichData = {}, subSessionId, endTime = 0}, cookieString) => {
  if(!subSessionId || subSessionId < 100000) {
    const err = new Error(`Session ${subSessionId} seams invalid.`);
    err.type = 'invalid';
    throw err;
  }
  if(endTime && endTime > Date.now()) {
    const err = new Error(`Session ${subSessionId} did not end yet. Reschedule...`);
    err.type = 'notended';
    throw err;
  }
  
  // get results
  // if type = notfound reschedule with tryInterval delay
  // if type == cookie reschedule message with 15 min delay
  const results = await getOfficalResults(cookieString, subSessionId); // TODO: 
  const sessionJson = {
    results: results.results,
    catId: enrichData.catId,
    endTime: enrichData.endTime,
    seriesId: enrichData.seriesId,
    seasionId: enrichData.seasionId,
    splitNumber: enrichData.min ? subSessionId - enrichData.min + 1 : 0,
    sessionId: enrichData.sessionId,
    startTime: enrichData.startTime,
    subSessionIds: enrichData.subSessionIds,
    trackName: enrichData.trackName,
    trackConfigName: enrichData.trackConfigName,
    sof: results.metaData.sof,
    numOfDrivers: results.metaData.numOfDrivers,
    numOfTeams: results.metaData.numOfTeams,
    winnerName: results.metaData.winnerName,
    winnerId: results.metaData.winnerId,
    scrapedAt: Date.now(),
  };

  const zipped = await gzip(JSON.stringify(sessionJson));

  const date = new Date();
  
  // build session file and save to s3
  await s3.putObject({
    Bucket: config.s3.bucketName,
    Key: `${date.getUTCFullYear()}/${date.getUTCMonth()+1}/${date.getUTCDate()}/${subSessionId}.gzip`,
    Body: zipped,
  }).promise();

  // publish to sns
  try {
    await publishSubSessionToSns(sessionJson, subSessionId);
  } catch(err) {
    logger.error(err, `Could not post ${subSessionId} to sns.`);
    throw err;
  }

  // enrich results and save to dynamo
  const dataArray = [];
  const dynPro = sessionJson.results.map(r => {
    const item = {
      ...r,
      ...enrichData,
      sof: results.metaData.sof,
      numOfDrivers: results.metaData.numOfDrivers,
      numOfTeams: results.metaData.numOfTeams,
      winnerName: results.metaData.winnerName,
      splitNumber: enrichData.min ? subSessionId - enrichData.min + 1 : 0,
      winnerId: results.metaData.winnerId,
      scrapedAt: Date.now(),
    };
    dataArray.push(item);
    return putResultToDb(item);
  });

  
  try {
    Promise.all(dynPro);
  } catch(err) {
    logger.error({ err, data: { subSessionId }}, `While putting result of ${subSessionId} to db.`);
    throw err;
  }

  logger.info(`${dynPro.length} results saved to dyndb`);

  return true;
}

module.exports.processSubsession = async ({subSessionId, seasionId, seriesId, subSessionIds, min, catId, endTime, sessionId, startTime, triesLeft = 2, trackName, trackConfigName}, cookieString) => {
  
  const enrichData = {
    catId,
    endTime,
    sessionId,
    startTime,
    subSessionIds,
    trackConfigName,
    trackName,
    subSessionId,
    triesLeft,
    seriesId,
    seasionId,
    min,
  };
  if (triesLeft <= 0) {
    logger.info(enrichData, `Subsession has no more tries left: ${subSessionId}`);
    await sqs.messageToDlQueue(enrichData);
    return true;
  }
  if (!startTime) {
    logger.info(enrichData, `Subsession message has no starttime: ${subSessionId}`);
    await sqs.messageToDlQueue(enrichData);
    return true;
  }
  if(!cookieString) {
    logger.error({
      enrichData,
      err: new Error('No cookiestring in processSubsession'),
    });
    await sqs.messageToDlQueue(enrichData);
    return true;
  }
  try {
    await getAndSaveOfficialResults({ 
      enrichData,
      endTime,
      subSessionId,
    },
    cookieString);
  } catch(err) {
    if (err.type === 'invalid') {
      logger.info({
        subSessionId,
      },`SubSessionId seems invalid: ${subSessionId}`);
      await sqs.messageToDlQueue(enrichData);
      return true;
    }
    if (err.type === 'cookie') {
      logger.error({
        subSessionId,
        cookieString,
      },`Cookie was invalid while processing: ${subSessionId}`);
      cookieHelper.removeCookie();
      await sqs.rescheduleMessage(enrichData, 60*15);
      return true;
    }
    if (err.type === 'notended') {
      let delay = Math.round((endTime-Date.now())/1000)+5;
      if(delay > 900) delay = 900;
      if(delay < 60) delay = 60;
      logger.info({
        subSessionId,
      }, `Reschedule ${subSessionId} as not ended yet.`);
      await sqs.rescheduleMessage(enrichData, delay);
      return true;
    }
    if (err.type === 'notfound') {
      
      enrichData.triesLeft--;
      if(enrichData.triesLeft <= 0) {
        await sqs.messageToDlQueue(enrichData);
        logger.info({
          subSessionId,
        }, `Put ${subSessionId} to dl as results not available yet and no more tries.`);
        return true;
      }
      logger.info({
        subSessionId,
      }, `Reschedule ${subSessionId} as results not available yet (${enrichData.triesLeft} tries left).`);
      if(enrichData.triesLeft <= config.scrape.longIntervalStart) await sqs.rescheduleMessage(enrichData, config.scrape.tryIntervalLong);
      else await sqs.rescheduleMessage(enrichData, config.scrape.tryInterval);
      return true;
    }
    throw err;
  }
  return true;
}*/
