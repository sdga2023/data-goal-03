rm(list=ls())

library(dplyr)
library(tidyr)
library(readxl)
library(wbstats)
library(countrycode)
library(R.utils)
library(rvest)

# Set directories
dir <- getwd()
sdg3.dir <- paste0(dir, "/SDG_Atlas/sdg3-data/")
input.dir <- paste0(sdg3.dir, "input/")
output.dir <- paste0(sdg3.dir, "output/")

# Get region/country from wbstats
rg.ctr <- wb_countries()

# Excess mortality:
# https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being/#c2
# Data from WHO Global excess deaths associated with COVID-19 (modeled estimates)
# https://www.who.int/data/sets/global-excess-deaths-associated-with-covid-19-modelled-estimates
excess.xlsx <- paste0(input.dir,"WHO_COVID_Excess_Deaths_EstimatesByCountry.xlsx")
dt.yr.mth<- read_excel(excess.xlsx, sheet="Country by year and month", skip=12)
dt.rate <- read_excel(excess.xlsx, sheet="Country rate by year", skip=8)

rate <- filter(dt.rate, year=="2020-2021")

dth.rate <- select(dt.yr.mth, country, iso3, cumul.excess.mean=excess.mean, expected=expected.mean) %>%
  group_by(country, iso3) %>%
  summarize_each(funs(sum(.,na.rm=T))) %>% 
  ungroup() %>%
  filter(!is.na(iso3)) %>%
  left_join(select(rate, iso3, cumul.excess.relative=excess.mean), by="iso3") %>%
  left_join(select(rg.ctr, iso3c, region), by=c("iso3"="iso3c")) %>%
  select(region, country,iso3, cumul.excess.relative, everything()) %>%
  arrange(iso3)
  
write.csv(dth.rate, paste0(output.dir, "relative excess mortality by co.csv"), row.names=F,na="")


# Number of deaths due to tuberculosis
# https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being#c17
# Data table directly received from WHO, saved in the input folder
tub.dt <- read_excel(paste0(input.dir,"TB_data_download-WDI-2022-11-09.xlsx"),
                     sheet="Aggregated data") %>%
  filter(group_type=="global") %>%
  select(Year=year, 
         'Estimated number of deaths due to tuberculosis (all forms, excluding HIV)'=e_mort_exc_tbhiv_num)

write.csv(tub.dt, paste0(output.dir, "tb-deaths_2021.csv"), row.names=F)


# Estimated Malaria deaths by age group:
# https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being/#c25
# Data from WHO, Global health estimates: Leading causes of death 
# https://www.who.int/data/gho/data/themes/mortality-and-global-health-estimates/ghe-leading-causes-of-death
malaria.url <- "https://cdn.who.int/media/docs/default-source/gho-documents/global-health-estimates/ghe2019_cod_global_2000_20194e572f53-509f-4578-b01e-6370c65d9fc5_3096f6a3-0f82-4c0c-94e2-623e802527c8.xlsx"
malaria.file <- paste0(input.dir,"who_cod.xlsx")
download.file(malaria.f, malaria.file,  mode = "wb")

# Only get deaths by Malaria from each sheet
mal.dth <- list()

for (i in 4:7) {
  df <- read_excel(path = malaria.file, sheet = i, range = "A8:Y38") 
  names(df)[6] <- "cod"
  temp <- filter(df, grepl("Malaria",cod))
 mal.dth[[i]] <- assign(paste0("temp.",i), temp)
}

all <- do.call(rbind, mal.dth) %>%
  mutate(year=c(2019, 2015, 2010,2000)) 

#  Only keep values by different age group, sum male and female 
all <- all[c(6, 10:26)] 
all.rev <- gather(all, key=age, value=value, `0-28 days...10`:`70+ years...25`) %>%
  mutate(age= str_sub(age, end=-6)) %>%
  group_by(cod,year, age) %>%
  summarize_each(funs(sum(.,na.rm=T))) %>% 
  ungroup() %>%
  spread(key=age, value=value) %>%
  select(cod:`1-59 months`,`5-14 years`,'15-29 years',`30-49 years`,everything()) %>%
  arrange(desc(year))

write.csv(all.rev, paste0(output.dir, "Malaria deaths by age.csv"), row.names=F)


# Estimated malaria mortality rate (per 100,000 population)
# https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being#c23
# Data from WHO Malaria report 2022, Annex 4F table
# https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2022
mal.dt <- read_excel(paste0(input.dir,"WMR2022_Annex_4F.xlsx"), skip=3)
names(mal.dt)[1] <- "area"
names(mal.dt)[3] <- "pop"
names(mal.dt)[8] <- "dth"

# Find and extract world value 
which (mal.dt$area == "Total") 

mal.wld <- mal.dt[2516:2537,] %>%
  mutate(rate=dth/pop*100000) %>%
  select(Period=Year, 
         'Estimated malaria mortality rate (per 100 000 population)'=rate)

write.csv(mal.wld, paste0(output.dir,"Malaria mortality global.csv"), row.names=F)  


# Immunization rates of one-year-old children: 
# https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being/#c28
# Data from WDI (SH.IMM.MEAS, SH.IMM.HEPB, SH.IMM.IDPT)
immu.df <- wb_data(
  indicator=c("SH.IMM.MEAS", "SH.IMM.HEPB", "SH.IMM.IDPT"),
  country = "all",
  start_date = 1980,
  end_date=2021,
  return_wide = FALSE) %>%
  filter(!is.na(value)) %>%
  filter(iso3c=="WLD")

immu.out <- immu.df %>% 
  select(Time=date, indicator, value) %>%
  mutate(value=round(value,0)) %>%
  spread(key=indicator, value=value)

immu.out <- immu.out[c(1,4,3,2)]

write.csv(immu.out, paste0(output.dir, "Immunization rates global.csv"), row.names=F,na="")


# Number of children not receiving a first dose of diphtheria-tetanus-pertussis combined vaccine (DTP-1):
# https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being/#c31
# Data table scraped from WHO webpage below
url<- "https://www.who.int/news/item/15-07-2021-covid-19-pandemic-leads-to-major-backsliding-on-childhood-vaccinations-new-who-unicef-data-shows"

missing.dtp <- url %>%
  read_html() %>%
  html_nodes(xpath='//*[@id="PageContent_T0643CD2A003_Col00"]/article/div/table') %>%
  html_table()

missing.dtp <- missing.dtp[[1]]
missing.dtp <- missing.dtp[2:12,]
names(missing.dtp) <- c("Country","2019","2020") 

missing.dtp.out<- missing.dtp %>%
  mutate(iso=countrycode(Country, origin = 'country.name', destination = 'iso3c')) %>%
  select(Country, iso, everything()) %>%
  mutate(`2019`=as.numeric(gsub("'","",`2019`)),
         `2020`=as.numeric(gsub("'","",`2020`)))
  
write.csv(missing.dtp.out, paste0(output.dir,"No of children missing vaccines.csv"),row.names = F )


# Tuberculosis case detection rate (percent):
# https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being/#c15
# Data from WDI (SH.TBS.DTEC.ZS)
tb.df <- wb_data(
  indicator=c("SH.TBS.DTEC.ZS"),
  country = "regions_only",
  start_date = 2000,
  end_date=2021,
  return_wide = FALSE) %>%
  filter(!is.na(value)) 

tb.out <- select(tb.df, iso3c, date, value) %>%
  spread(key=iso3c, value=value)

write.csv(tb.out, paste0(output.dir,"tb-detection_2021.csv"),row.names = F )

# Percentage of forgone cares across country income groups:
# https://datatopics.worldbank.org/sdgatlas/goal-3-good-health-and-well-being#c34
# Data directly received from authors as attachment, thus no data preparation required.
# Saved in the 'output' folder as 'foregone-care.csv'

