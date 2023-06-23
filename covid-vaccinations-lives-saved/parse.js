const fs = require("fs");
const csvParser = require("csv-parser");

// Country name to ISO file from:
// plus some manual additions to country names in the 'alternatives' column
// https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes/blob/master/all/all.csv
const countryIsoFile = "./countries.csv";

// Lancet study data
// https://github.com/mrc-ide/covid-vaccine-impact-orderly/releases/tag/v1.0.1
const deathsFile = "./reported_death_summary_table.csv";

// Coverage data from Our World In Data
// "Share of people who received at least one dose of COVID-19 vaccine"
// https://ourworldindata.org/grapher/share-people-vaccinated-covid
const coverageFile = "./share-people-vaccinated-covid.csv";

const process = async () => {
  let deathsResult = [];
  let countryISO = [];
  let coverageResult = [];
  let countryIsos = new Set();

  const columns = [
    "ISO3",
    "country",
    "coverage",
    "deaths",
    "averted",
    "per10k",
  ];

  fs.createReadStream(countryIsoFile)
    .pipe(csvParser())
    .on("data", (data) => {
      countryISO.push(data);
      countryIsos.add(data["alpha-3"]);
    })
    .on("end", () => {
      // manually add 'OWID_WRL' to also get data for World
      countryISO.push({ "alpha-3": "OWID_WRL" });
      countryIsos.add("OWID_WRL");

      fs.createReadStream(coverageFile)
        .pipe(csvParser())
        .on("data", (data) => {
          coverageResult.push(data);
          countryIsos.add(data.Code);
        })
        .on("end", () => {
          fs.createReadStream(deathsFile)
            .pipe(csvParser())
            .on("data", (data) => deathsResult.push(data))
            .on("end", () => {
              let extendedCountries = [];

              Array.from(countryIsos)
                .sort((a, b) => a - b)
                .forEach((iso) => {
                  const ctr = countryISO.find((d) => d["alpha-3"] === iso);

                  const parsed = {};
                  parsed.ISO = iso;

                  if (ctr) {
                    // find coverage data
                    const coverage = coverageResult
                      .filter((d) => d.Code === parsed.ISO)
                      .sort((a, b) => new Date(b.Day) - new Date(a.Day));

                    if (!coverage || coverage.length === 0) {
                      console.log(
                        `couldn't find coverage for ${parsed.country}`
                      );
                    } else {
                      parsed.coverage =
                        +coverage[0]["people_vaccinated_per_hundred"];
                    }

                    const dr = deathsResult.find(
                      (d) =>
                        d[" "].trim() === ctr.name ||
                        d[" "].trim() === ctr.alternatives
                    );

                    if (dr) {
                      dr.ticked = true;
                      parsed.country = dr[" "]?.trim();
                      // parse deaths
                      const deaths = +dr["Total Deaths,with vaccinations"]
                        .split(" ")[0]
                        .replace(/,/g, "");
                      parsed.deaths = deaths;

                      // parse averted
                      const averted = +dr["Deaths Averted by Vaccinations"]
                        .split(" ")[0]
                        .replace(/,/g, "");
                      parsed.averted = averted;

                      // parse averted per 10k
                      const averted10k = +dr[
                        "Deaths Averted by Vaccinations Per 10k People"
                      ]
                        .split(" ")[0]
                        .replace(/,/g, "");
                      parsed.averted10k = averted10k;
                    }
                  } else {
                    console.log(
                      `couldn't find entry/ISO for ${parsed.country}`
                    );
                  }

                  console.log(parsed);

                  extendedCountries.push(parsed);
                });

              // console.log(deathsResult.filter((d) => !d.ticked));

              // rename OWID_WRL to the World Bank's WLD:
              extendedCountries = extendedCountries
                .map((d) => {
                  if (d.ISO === "OWID_WRL") {
                    return {
                      ISO: "WLD",
                      country: "World",
                      coverage: d.coverage,
                    };
                  } else {
                    return d;
                  }
                })
                .filter((d) => d.ISO && !d.ISO.startsWith("OWID_"));

              // convert to csv and save as file:
              let lines = [];
              lines.push(columns.join(","));
              extendedCountries
                .sort((a, b) => a.ISO.localeCompare(b.ISO))
                .forEach((c) => {
                  let cs = [
                    c.ISO,
                    c.country,
                    c.coverage,
                    c.deaths,
                    c.averted,
                    c.averted10k,
                  ].join(",");
                  lines.push(cs);
                });

              fs.writeFileSync("out/lives-saved.csv", lines.join("\n"), {
                encoding: "utf8",
                flag: "w",
              });
            });
        });
    });
};
process();
