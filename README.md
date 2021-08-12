# Kuhldata Team Tracker

## USAGE AT YOUR OWN RISK.

## Overview
This is a small script to track you iRacing racing team's progress. It collects race results of each driver and calculates KPIs and other stats from it. (Only Road for now)

The current version just saves a CSV-File with all the data for you. You should be able to open this in Google Sheet or Excel and use the data like you need it.

In a future Version I want the script to also render a PDF file with a polished report to read through.

## Installation
The script should also run on Linux and Mac but I never tested it. So I only describe the installation for windows.
### Windows

**Precondition**
For the script to run, you need to install node on your pc. You can get it from here: [Node Homepage](https://nodejs.org/en/download/current/)

To see if node is correctly installed type `node -v` and `npm -v` in a powershell.

**Install**
`npm i kuhldata-team-tracker -g`

## Usage
To let the script collect data (and generate a cool report png) you can use the `kuhldata-report` command after installation.

The full command look like this:
```cmd
kuhldata-report --team team.txt --teamName "Demo Team" --year 2021 --season 3 --week 8 --road --user kalle+smurf@kalle.co --pass '"neg7gte_BNY_nxp5vkb"'
```

`--team team.txt` specifies the text file with a list of iRacing driver IDs. One id per line, no comma or comments allowed. Example:

```txt
518012
123456
987654
```

`--teamName "Demo Team"` specifies the team name printed to the top of the report.

`--year 2021`, `--season 3` and `--week 8` specifies the time you want the report for. If you omit the `--year` the current year is used. If you omit the `--week` the report is build for the whole season.

To select the category (road / oval / dirtRoad / dirtOval ) you want the report for specify the according option: `--road`, `--oval`, `--dirtRoad` or `--dirtOval`. If you omit the category, road is used.

`--user`  and  `--pass` are used to hand over your credentials **directly** to iRacing. I do not send them anywhere else. It is needed to gather the data from iRacing's API. To be totally clear: That means you are using your own account for the requests. If iRacing at anytime decides that they do not want that reports like this are created they may punish your account. So: Be calm, the script is throttled to be fairly slow to not make iRacing angry. If I hear something, I will note it down here.

## Notes
* If a driver did not race in the timeframe of a report, his current iRating is assumed. Keep that in mind as it could make you calculations for reports in the past inaccurate. In case a driver did not race a line like `Driver 123456 did not race in this timeframe. Assuming his current iRating.`.
* iRacing does odd things sometimes. For example: The season of some series is longer then the normal iRacing season. This can lead to some inaccuracy. I am thinking about a solution, but as the tool still works good, the current version ignores this problem.

## TODO
* make command more reliable
* optimize report output
* report for single drivers

## Support
If you want to support me, I am happy to welcome you to the [kuhldata Discord](https://discord.gg/PTuZfQRWDj) or to link you to my [Ko-Fi Page](https://ko-fi.com/kuhldata).