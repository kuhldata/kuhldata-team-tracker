/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');

const createReportPage = async (reportData) => {
  // Preprocessing data gainReport
  reportData.teamReport.gainReport.height = 110 + 25 * reportData.teamReport.gainReport.labels.length;
  reportData.teamReport.gainReport.labels = JSON.stringify(reportData.teamReport.gainReport.labels);
  reportData.teamReport.gainReport.gains = JSON.stringify(reportData.teamReport.gainReport.gains);

  // Preprocessing data gainReport
  reportData.teamReport.driverIrReport.height = 110 + 25 * reportData.teamReport.driverIrReport.labels.length;
  reportData.teamReport.driverIrReport.labels = JSON.stringify(reportData.teamReport.driverIrReport.labels);
  reportData.teamReport.driverIrReport.ratings = JSON.stringify(reportData.teamReport.driverIrReport.ratings);

  // preprocessing data irReport
  const irReportLength = reportData.teamReport.irReport.labels.length;

  reportData.teamReport.irReport.lfratings = reportData.teamReport.irReport.ratings.map((e, i) => {
    if (i === 0 || i === irReportLength - 1) {
      return e;
    }
    return null;
  });

  reportData.teamReport.irReport.labels = JSON.stringify(reportData.teamReport.irReport.labels);
  reportData.teamReport.irReport.ratings = JSON.stringify(reportData.teamReport.irReport.ratings);
  reportData.teamReport.irReport.races = JSON.stringify(reportData.teamReport.irReport.races);
  reportData.teamReport.irReport.lfratings = JSON.stringify(reportData.teamReport.irReport.lfratings);

  // raced series PP
  reportData.teamReport.racesSeriesReport.labels = JSON.stringify(reportData.teamReport.racesSeriesReport.labels);
  reportData.teamReport.racesSeriesReport.counts = JSON.stringify(reportData.teamReport.racesSeriesReport.counts);

  // raced cars PP
  reportData.teamReport.carsDrivenReport.labels = JSON.stringify(reportData.teamReport.carsDrivenReport.labels);
  reportData.teamReport.carsDrivenReport.counts = JSON.stringify(reportData.teamReport.carsDrivenReport.counts);

  // reace result / outcome
  reportData.teamReport.racesOutcomeReport.labels = JSON.stringify(reportData.teamReport.racesOutcomeReport.labels);
  reportData.teamReport.racesOutcomeReport.counts = JSON.stringify(reportData.teamReport.racesOutcomeReport.counts);

  const templateHtml = fs.readFileSync(path.join(__dirname, '..', 'templates/weekly-team.html'), 'utf8');
  const template = handlebars.compile(templateHtml);
  const html = template(reportData);

  // let milis = new Date();
  // milis = milis.getTime();

  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    headless: true,
  });

  const page = await browser.newPage();

  await page.setContent(html);

  /// await page.pdf(options);

  let filename = `report-${reportData.teamName}-${reportData.year}-S${reportData.season}`;
  if (reportData.week) filename = `${filename}W${reportData.week}-W${reportData.weekEnd}`;

  await page.screenshot({ path: `./${filename.replace(/ /g, '_')}.png`, fullPage: true });
  await browser.close();
};

module.exports.createReportPage = createReportPage;

// createReportPage(data);
