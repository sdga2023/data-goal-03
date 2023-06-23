# data-goal-03

# covid-vaccinations-lives-saved

Input data from
* Country name to ISO file plus some manual additions to country names in the 'alternatives' column https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes/blob/master/all/all.csv

* Lancet study data https://github.com/mrc-ide/covid-vaccine-impact-orderly/releases/tag/v1.0.1

* Coverage data from Our World In Data "Share of people who received at least one dose of COVID-19 vaccine" https://ourworldindata.org/grapher/share-people-vaccinated-covid

Run `npm run convert` to convert the data. Output file goes to `./out/lives-saved.csv`.
Used in chapter 3 globe, https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being#c5 and https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being#c7

# malaria-incidence-and-cases

Input data from
* https://data.worldbank.org/indicator/SH.MLR.INCD.P3

* WHO indicator MALARIA_EST_CASES https://www.who.int/data/gho/data/indicators/indicator-details/GHO/estimated-number-of-malaria-cases

Run `npm run convert` to convert the data. Output file goes to `./incidence.csv`.
Used in https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being#c20

# tuberculosis-incidence-and-cases

Input data from
* https://www.who.int/teams/global-tuberculosis-programme/data

Run `npm run convert` to convert the data. Output file is `./tb-cases_2021.csv`.
Used in https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being#c12

