const fs = require("fs");
const csvParser = require("csv-parser");

// WHO Tuberculosis data
// https://www.who.int/teams/global-tuberculosis-programme/data#csv_files
// Data extracted from the WHO global TB database 23-06-23
const burdenFile = "./TB_burden_countries_2023-06-23.csv";

const valueMap = {
  e_inc_100k: "per100k",
  e_inc_num: "numerical",
  //c_newinc: "notifications",
};

let cols = ["Country Name", "Country Code", "type"];
for (let i = 2000; i <= 2021; i++) {
  cols.push(i);
}

const process = () => {
  const casesResult = [];
  fs.createReadStream(burdenFile)
    .pipe(csvParser())
    .on("data", (data) => casesResult.push(data))
    .on("end", () => {
      let countries = Array.from(new Set(casesResult.map((d) => d.iso3)));

      let entries = {};
      countries.forEach((c) => {
        Object.values(valueMap).forEach((v) => {
          entries[`${c}_${v}`] = {
            "Country Code": c,
            "Country Name": casesResult.find((d) => d.iso3 === c).country,
            type: v,
          };
        });
      });

      casesResult.forEach((d) => {
        const c = {
          "Country Name": d.country,
          "Country Code": d.iso3,
        };

        const year = d.year;
        Object.keys(valueMap).forEach((key) => {
          const val = +d[key];
          if (!isNaN(val)) {
            entries[`${d.iso3}_${valueMap[key]}`][year] = val;
          } else {
            entries[`${d.iso3}_${valueMap[key]}`][year] = "";
          }
        });
      });

      console.log(entries);

      // convert to csv and save as file:
      let lines = [];
      lines.push(cols.join(","));
      Object.keys(entries).forEach((key) => {
        const e = entries[key];
        let cs = cols.map((c) => e[c]).join(",");
        lines.push(cs);
      });

      fs.writeFileSync("tb-cases_2021.csv", lines.join("\n"));
    });
};

process();
