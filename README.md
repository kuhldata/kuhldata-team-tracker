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
For the script to run, you need to install node on your pc. You can get it from here: https://nodejs.org/en/download/current/ 

To see if node is correctly installed type `node -v` and `npm -v` in a powershell.

**Install**
`npm i kuhldata-team-tracker -g`

## Usage
To let the script collect data (and save it as a csv) you can use the `teamtracker` command after installation.

The full command look like this:
`teamtracker --year 2021 --season 3 --week 8 --user mail --pass '"password"' --drivers 518012 --drivers 228712`

`year`, `season` and `week` specify the week you want the data for.

You have to replace "mail" behind the `--user` option and "password" behind the `--pass` option with your credetials. Yes, this script is using your credentials. Every request happens via your account. The script is throttled to arround 1 request / 7 seconds. Still do not overstress the API. iRacing could get angry at a certain threshold. For the password you have to leave the format. If your password is "abc" it would say `--pass '"abc"'` in the command.

Last but not least you have to add the drivers with ther iRacing customer id. Just add a `--drivers 123456` for each driver for now. I will adjust this later.

PRO TIP: Put your command together in a text file and save it as soon as it is done, so you do not need to recreate it every week. Don't save your password with it, but the rest of the command. :D