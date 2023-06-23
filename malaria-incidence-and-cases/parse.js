const fs = require("fs");
const readXlsxFile = require("read-excel-file/node");
const csvParser = require("csv-parser");

// WB data from:
// https://data.worldbank.org/indicator/SH.MLR.INCD.P3
const incidenceFile = "./wb-malaria.xlsx";

// WHO indicator MALARIA_EST_CASES
// WHO data from:
// https://www.who.int/data/gho/data/indicators/indicator-details/GHO/estimated-number-of-malaria-cases
// (click on Data, right-click save at the top right)
const casesFile = "./who-malaria-cases.csv";
const WHOColumns = {
  iso: "SpatialDimValueCode",
  year: "Period",
  value: "FactValueNumeric",
};

const cols = ["Country Code", "type"];
for (let year = 2000; year <= 2020; year++) {
  cols.push("" + year);
}

const process = async () => {
  const rows = await readXlsxFile(incidenceFile);
  const keys = rows[0];
  const countries = rows.slice(1).map((cols) =>
    cols.reduce((acc, val, i) => {
      acc[keys[i]] = val;
      return acc;
    }, {})
  );

  //fs.writeFileSync("wb-incidence.json", JSON.stringify(countries));

  const casesResult = [];
  fs.createReadStream(casesFile)
    .pipe(csvParser())
    .on("data", (data) => casesResult.push(data))
    .on("end", () => {
      // find list of all contained countries:
      const countryList = Array.from(
        new Set(casesResult.map((c) => c[WHOColumns.iso]))
      );
      // find all values for country and add it:
      countryList.forEach((iso) => {
        const yearValues = {};
        for (let year = 2000; year <= 2020; year++) {
          const yearRow = casesResult.find(
            (c) => c[WHOColumns.iso] === iso && +c[WHOColumns.year] === year
          );
          if (yearRow) {
            yearValues[year] = +yearRow[WHOColumns.value];
          } else {
            yearValues[year] = null;
          }
        }

        countries.push({
          type: "cases",
          "Country Code": iso,
          ...yearValues,
        });
      });

      // convert to csv and save as file:
      let lines = [];
      lines.push(cols.join(","));
      countries.forEach((c) => {
        let cs = `${c["Country Code"]},${c.type},`;
        for (let year = 2000; year <= 2020; year++) {
          cs += c["" + year] + ",";
        }
        cs = cs.substring(0, cs.length - 1);
        lines.push(cs);
      });

      fs.writeFileSync("incidence.csv", lines.join("\n"));

      //fs.writeFileSync("incidence.json", JSON.stringify(countries));

      //fs.writeFileSync("who-malaria-cases.json", JSON.stringify(casesResult));
    });
};
process();
