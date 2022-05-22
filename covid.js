/**
 * @author Bivash Pandey
 * Final Project: Information Visualization
 * COVID-19 Dashboard
 *
 */

$("body").ready(init);

const MAX_RADIUS = 7;
const MIN_RADIUS = 0;

// json mapData and CSV covidData
var mapData;
var covidData;

// initial month data based on which graph is to be displayed
var monthName = "April";

// all the months to be displayed on dropdown
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function init() {
  // Read two data one from json and another from csv
  Promise.all([d3.json("countries.json"), d3.csv("covid.csv")])
    .then(function (files) {
      // store json and csv data into mapData and covidData
      mapData = files[0];
      covidData = files[1];

      // Drop down for the month names
      var monthDropdown = $("<select>")
        .attr("id", "monthValues")
        .attr("x", 10)
        .attr("y", 10)
        .change(() => {
          monthName = getSelectedMonth();
          draw();
        });

      // loop through each month in the months and put it in dropdown
      for (var i = 0; i < months.length; i++) {
        if (months[i] === monthName) {
          var op = $("<option selected=${monthName}>")
            .html(monthName)
            .val(monthName);
          monthDropdown.append(op);
        } else {
          var opt = $("<option>").html(months[i]).val(months[i]);
          monthDropdown.append(opt);
        }
      }

      // append the monthDropdown to the div
      $("#list").append(monthDropdown);
      draw();
    })
    .catch(function (err) {
      console.log(err);
    });
}

// This function plots the map
function draw() {
  $("#container").empty();

  // width and height of a map
  const width = 900;
  const height = 600;

  // max cases and deaths in a particular month
  var maxCases = getMaxCase(monthName);
  var maxDeaths = getMaxDeath(monthName);

  // total cases and deaths in a particular month
  var totalCases = getTotalCase(monthName);
  var totalDeaths = getTotalDeath(monthName);

  // scaling the Radius
  var scaleRadius = d3
    .scaleSymlog()
    .domain([0, maxDeaths])
    .range([MIN_RADIUS, MAX_RADIUS]);

  // scale cases and deaths using symlog
  var scaleCase = d3.scaleSymlog().domain([0, maxCases]).range([0, 100000]);
  var scaleDeath = d3.scaleSymlog().domain([0, maxDeaths]).range([0, 1000]);

  // svg area for the map
  const svg = d3
    .select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", "rgba(5,5,5,0.1)");

  // projection
  const projection = d3
    .geoMercator()
    .scale(140)
    .translate([width / 2, height / 1.4]);
  const path = d3.geoPath(projection);
  const g = svg.append("g");

  // read countries data from topojson
  const countries = topojson.feature(mapData, mapData.objects.countries);

  var countryName = {};
  countries.features.forEach((d) => {
    countryName[d.id] = d.properties.name;
  });

  // for map
  g.selectAll("path")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("cursor", "pointer")
    .style("fill", "#4CAF50")
    .attr(
      "opacity",
      (d) =>
        scaleCase(getTotalMonthlyCases(d.properties.name, monthName)) /
        scaleCase(totalCases)
    )
    .on("click", (d) => handleClick(d))
    .append("title")
    .text((d) => countryName[d.id]);

  // for circles
  g.selectAll("circle")
    .data(countries.features)
    .enter()
    .append("circle")
    .attr("class", "country-circle")
    .attr("cx", (d) => projection(d3.geoCentroid(d))[0])
    .attr("cy", (d) => projection(d3.geoCentroid(d))[1])
    .attr("r", (d) =>
      scaleRadius(getTotalMonthlyDeaths(d.properties.name, monthName))
    )
    .attr("fill", "#E53935")
    .attr(
      "opacity",
      (d) =>
        scaleDeath(getTotalMonthlyDeaths(d.properties.name, monthName)) /
        scaleDeath(totalDeaths)
    );
}

// This is to draw the line graph when user clicks on particular country
function handleClick(d) {
  $("#linegraph").empty();

  const width = 400;
  const height = 400;
  const padding = 20;

  // user selected country
  var selectedCountry = d.target.textContent;

  // monthly data of a country
  var monthlyStats = getMonthDataOfCountry(selectedCountry, monthName);

  // empty objects for cases and deaths
  var casesData = [];
  var deathsData = [];

  // Maximum cases and deaths in particular month of a country
  var monthMaxCase = getMaxMonthlyCases(selectedCountry, monthName);
  var monthMaxDeath = getMaxMonthlyDeaths(selectedCountry, monthName);

  // Total monthly cases and deaths of a country
  var monthCase = getTotalMonthlyCases(selectedCountry, monthName);
  var monthDeath = getTotalMonthlyDeaths(selectedCountry, monthName);

  // loop through monthy data and fill the casesData and deathsData object
  monthlyStats.forEach((data) => {
    var twoDigitDays = data.date.substring(
      data.date.length - 2,
      data.date.length
    );
    casesData.push({
      days: twoDigitDays,
      cases: data.cases / monthMaxCase,
    });
    deathsData.push({
      days: twoDigitDays,
      deaths: data.deaths / monthMaxDeath,
    });
  });

  // scaling along X-axis
  var scaleX = d3
    .scaleLinear()
    .domain([1, 31])
    .range([2 * padding, width - padding]);

  // scaling along Y-axis
  var scaleY = d3
    .scaleLinear()
    .domain([0, 1])
    .range([height - padding, 2 * padding]);

  // svg area for a line graph
  const svg2 = d3
    .select("#linegraph")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", "antiquewhite");

  // scaled axes
  var xAxis = d3.axisBottom().scale(scaleX);
  var yAxis = d3.axisRight().scale(scaleY);
  svg2
    .append("g")
    .attr("transform", "translate(0, " + (height - padding) + ")")
    .call(xAxis);
  svg2.append("g").call(yAxis);

  // line graph of the first data (Eg: Days, Cases)
  svg2
    .append("path")
    .datum(casesData)
    .attr("fill", "none")
    .attr("stroke", "#00ff00")
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line()
        .x(function (d2) {
          return scaleX(d2.days);
        })
        .y(function (d2) {
          return scaleY(d2.cases);
        })
    );

  // line graph of the second data (Eg: Days, Death)
  svg2
    .append("path")
    .datum(deathsData)
    .attr("fill", "none")
    .attr("stroke", "#ff0000")
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line()
        .x(function (d2) {
          return scaleX(d2.days);
        })
        .y(function (d2) {
          return scaleY(d2.deaths);
        })
    );

  selectedCountry = d.target.textContent;

  // call the method to display additional textual/numerical information
  displayInfo(selectedCountry, monthName, monthCase, monthDeath);
}

// This method displays the additional information of a country when user clicks on country
// Country Name, Month Name, Number of Covid Cases and Deaths
function displayInfo(sCountry, mName, mCase, mDeath) {
  $("#extraInfo").empty();

  // put text in the div using d3 and html
  d3.select("#extraInfo").append("text").attr("id", "info").html(
    `<div>
          <div>
            <span class="icon is-small is-left">
              <i class="fas fa-globe-americas"></i>
            </span>
            Country: ${sCountry} 
          </div>
          <div>
            <span class="icon is-small is-left">
              <i class="fas fa-calendar-alt"></i>
            </span>
            Month: ${mName}
          </div>
          <div>
            <span class="icon is-small is-left">
              <i class="fas fa-circle green-color"></i>
            </span>
            Cases: ${mCase} 
          </div>
          <div>
            <span class="icon is-small is-left">
              <i class="fas fa-circle red-color"></i>
            </span>
            Deaths: ${mDeath}
          </div>
      </div>`
  );
}

// get all the data of a single country
function getAllDataOfCountry(country) {
  return covidData.filter((data) => {
    return data.name_en === country;
  });
}

// data of a country of a particular month
function getMonthDataOfCountry(country, month) {
  var monthNum = months.indexOf(month) + 1;
  var from =
    monthNum < 10 ? "2020-0" + monthNum + "-01" : "2020-" + monthNum + "-01";
  var to =
    monthNum < 10 ? "2020-0" + monthNum + "-31" : "2020-" + monthNum + "-31";

  return getAllDataOfCountry(country).filter((data) => {
    return data.date >= from && data.date <= to;
  });
}

// get the maximum of the cases of a single country in a particular month
function getMaxMonthlyCases(country, month) {
  return d3.max(getMonthDataOfCountry(country, month), function (d) {
    return parseInt(d.cases);
  });
}

// get the maximum of the deaths of a single country in a particular month
function getMaxMonthlyDeaths(country, month) {
  return d3.max(getMonthDataOfCountry(country, month), function (d) {
    return parseInt(d.deaths);
  });
}

// get the monthly total cases of a single country
function getTotalMonthlyCases(country, month) {
  return d3.sum(getMonthDataOfCountry(country, month), function (d) {
    return parseInt(d.cases);
  });
}

// get the monthly total deaths of a single country
function getTotalMonthlyDeaths(country, month) {
  return d3.sum(getMonthDataOfCountry(country, month), function (d) {
    return parseInt(d.deaths);
  });
}

// this function returns the monthly data of all the countries
function getMonthlyDataOfWorld(month) {
  var monthNum = months.indexOf(month) + 1;
  var from =
    monthNum < 10 ? "2020-0" + monthNum + "-01" : "2020-" + monthNum + "-01";
  var to =
    monthNum < 10 ? "2020-0" + monthNum + "-31" : "2020-" + monthNum + "-31";

  return covidData.filter((data) => {
    return data.date >= from && data.date <= to;
  });
}

// this function returns the maximum cases in a month
function getMaxCase(month) {
  return d3.max(getMonthlyDataOfWorld(month), function (d) {
    return parseInt(d.cases);
  });
}

// this function returns the maximum cases in a month
function getMaxDeath(month) {
  return d3.max(getMonthlyDataOfWorld(month), function (d) {
    return parseInt(d.deaths);
  });
}

// this function returns the total cases in a month
function getTotalCase(month) {
  return d3.sum(getMonthlyDataOfWorld(month), function (d) {
    return parseInt(d.cases);
  });
}

// this function returns the total deaths in a month
function getTotalDeath(month) {
  return d3.sum(getMonthlyDataOfWorld(month), function (d) {
    return parseInt(d.deaths);
  });
}

// this function returns the month selected by user from the dropdown
function getSelectedMonth() {
  return $("#monthValues option:selected").val();
}
