const fs = require("fs");
const path = require("path");
const puppeteer = require('puppeteer');
const handlebars = require("handlebars");

const data = {
	teamName: "Kuhldata Racing",
	year: 2020,
	season: 3,
	week: 10,
	catId: 2,
	teamReport: {
		kpis: [
			{
				title: 'Races done',
				value: 85,
			},
			 {
				title: 'Driver in team',
				value: 4,
			},
			{
				title: 'iRating gain',
				value: 568,
			},
		],
		irReport: {
			labels: [ 'Monday' ,'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday'],
			ratings: [1111, 1203, 1050, 1850, 1253, 1203, 1452, 1406],
			races: [0, 3, 7, 4, 3, 1, 3, 6],
		},
		gainReport: {
			labels: ['Kalle Kuhlmann', 'Some One', 'a', 'b', 'c', 'Kalle Kuhlmann', 'Some One', 'a', 'b', 'c', 'Kalle Kuhlmann', 'Some One', 'a', 'b', 'c', 'Kalle Kuhlmann', 'Some One', 'a', 'b', 'c'],
			gains: [3142, 4687, -300, 464, 122, 3142, 4687, -300, 464, 122, 3142, 4687, -300, 464, 122, 3142, 4687, -300, 464, 122],
		},
		driverIrReport: {
			labels: ['Kalle Kuhlmann', 'Some One', 'a', 'b', 'MB'],
			ratings: [5000, 4687, 3300, 464, 122],
		},
		racesSeriesReport: {
			labels: ['Porsche iRacing Cup', 'VRS GT Sprint Series', 'Some unusal long special event thing'],
			counts: [2,12,6],
		},
		racesOutcomeReport: {
			labels: ['Wins', '2nd-3rd', 'Finished', 'DNF'],
			counts: [4, 3, 12, 1],
		},
		driverAwards: [
			{
				title: 'Top Farmer',
				drivers: [
					{
						name: 'Kalle Kuhlmann',
						value: 200,
					},
					{
						name: 'Max Mustermann',
						value: 143,
					},
					{
						name: 'Bert Baum',
						value: 51,
					},
				]
			},
			{
				title: 'Most Wins',
				drivers: []
			},
			{
				title: 'Most Races',
				drivers: [
					{
						name: 'Max Mustermann',
						value: 8,
					},
					{
						name: 'Marta Müller',
						value: 7,
					},
					{
						name: 'Bert Baum',
						value: 4,
					},
				]
			}
		],
	},
};

const createReportPage = async (reportData) => {

	// Preprocessing data gainReport
	reportData.teamReport.gainReport.height = 110+25*reportData.teamReport.gainReport.labels.length;
	reportData.teamReport.gainReport.labels = JSON.stringify(reportData.teamReport.gainReport.labels);
	reportData.teamReport.gainReport.gains = JSON.stringify(reportData.teamReport.gainReport.gains);

	
	// Preprocessing data gainReport
	reportData.teamReport.driverIrReport.height = 110+25*reportData.teamReport.driverIrReport.labels.length;
	reportData.teamReport.driverIrReport.labels = JSON.stringify(reportData.teamReport.driverIrReport.labels);
	reportData.teamReport.driverIrReport.ratings = JSON.stringify(reportData.teamReport.driverIrReport.ratings);
	
	// preprocessing data irReport
	const irReportLength = reportData.teamReport.irReport.labels.length;

	reportData.teamReport.irReport.lfratings = reportData.teamReport.irReport.ratings.map((e, i) => {
		if(i == 0 || i == irReportLength-1) {
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
	
	// reace result / outcome
	reportData.teamReport.racesOutcomeReport.labels = JSON.stringify(reportData.teamReport.racesOutcomeReport.labels);
	reportData.teamReport.racesOutcomeReport.counts = JSON.stringify(reportData.teamReport.racesOutcomeReport.counts);


	var templateHtml = fs.readFileSync(path.join(__dirname, '..', 'templates/weekly-team.html'), 'utf8');
	var template = handlebars.compile(templateHtml);
	var html = template(reportData);

	var milis = new Date();
	milis = milis.getTime();

	//var pdfPath = path.join('files', `test.pdf`);

	/*var options = {
		width: '1230px',
		headerTemplate: "<p></p>",
		footerTemplate: "<p></p>",
		displayHeaderFooter: false,
		margin: {
			top: "10px",
			bottom: "30px"
		},
		printBackground: true,
		path: pdfPath
	}*/

	const browser = await puppeteer.launch({
		args: ['--no-sandbox'],
		headless: true
	});

	var page = await browser.newPage();
	
  await page.setContent(html);
	/*await page.goto(`data:text/html;charset=UTF-8,${html}`, {
		waitUntil: 'networkidle0'
	});*/

	///await page.pdf(options);

	let filename = `report-${reportData.teamName}-${reportData.year}-S${reportData.season}`;
	if (reportData.week) filename = `${filename}W${reportData.week}`;

	await page.screenshot({ path: `./${filename.replace(/ /g, '_')}.png`, fullPage: true });
	await browser.close();
}

module.exports.createReportPage = createReportPage;

//createReportPage(data);