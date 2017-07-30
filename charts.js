'use strict';

var dataSource = 'JCMB_2015.csv';

var timeFormat = d3.time.format('%Y/%m/%d %H:%M');
var numberFormat = d3.format('.2f');
var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var monthNames = ['January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];


var tempMonthsRowChart = dc.rowChart('#row-chart-months');
var rainWeekDaysRowChart = dc.rowChart('#row-chart-days');
var rainSeasonPieChart = dc.pieChart('#pie-chart-seasonRainfall');
var variousChart = dc.lineChart('#god-chart');
var magnifierChart = dc.barChart('#magnifier');
var categPieChart = dc.pieChart('#pie-chart-categ');
var fluctChart = dc.barChart('#fluct');
var dataCount = dc.dataCount('.dc-data-count');
var dataTable = dc.dataTable('#data-table');


d3.csv(dataSource, function (row) {
        return {
            time: getTimeObject(timeFormat.parse(row['date-time'])),
            atmPressure: +row['atmospheric pressure (mBar)'],
            rainfall: +row['rainfall (mm)'],
            windSpeed: +row['wind speed (m/s)'],
            windDirection: +row['wind direction (degrees)'],
            surfaceTemperature: +row['surface temperature (C)'],
            relativeHumidity: +row['relative humidity (%)'],
            solarFlux: +row['solar flux (Kw/m2)'],
            battery: +row['battery (V)']
        };
    },

    function (data) {
        var ndx = crossfilter(data);

        //use crossfilter to aggregate data (apparently was too much for my computer to use it all)
        var hourAsDateDimension = ndx.dimension(function (row) {
            var s = timeFormat(row.time.fullDate);
            var key = s.slice(0, s.length - 5);
            return key;
        });

        var groupByHourDate = hourAsDateDimension.group().reduce(godReduceAdd, godReduceRemove, godInit);

        data = [];
        groupByHourDate.all().forEach(function (element) {
            element.value.time = getTimeObject(timeFormat.parse(element.key + "00:00"));
            data.push(element.value);
        });

        // start over with aggregated data
        groupByHourDate = undefined;
        ndx = crossfilter(data);
        var all = ndx.groupAll();


        var dayOfTheWeekDimension = ndx.dimension(function (d) {
            return d.time.day.name;
        });

        var monthDimension = ndx.dimension(function (d) {
            return monthNames[d.time.month - 1];
        });

        var seasonDimension = ndx.dimension(function (d) {
            if (d.time.month <= 2) return 'Winter';
            if (d.time.month <= 5) return 'Spring';
            if (d.time.month <= 8) return 'Summer';
            if (d.time.month <= 11) return 'Autumn';
            return 'Winter';
        });

        var timeDimension = ndx.dimension(function (d) {
            return d.time.fullDate;
        });

        var perDayWeekGroupStats = dayOfTheWeekDimension.group().reduce(godReduceAdd, godReduceRemove, godInit);
        var perMonthGroupStats = monthDimension.group().reduce(godReduceAdd, godReduceRemove, godInit);
        var perSeasonGroupStats = seasonDimension.group().reduce(godReduceAdd, godReduceRemove, godInit);
        var allStats = timeDimension.group().reduce(godReduceAdd, godReduceRemove, godInit);

        var temperatureDimension = ndx.dimension(function (d) {
            return Math.floor(d.surfaceTemperature);
        });

        var tempHitsGroup = temperatureDimension.group();

        var categDimension = ndx.dimension(function (d) {
            return d.rainfall > 4 ? "Rainy" : d.windSpeed > 3 ? "Windy" : "Sunny";
        })

        var categGroup = categDimension.group();

        //fluctuational chart
        fluctChart
            .width(1100)
            .height(400)
            .centerBar(true)
            .dimension(temperatureDimension)
            .group(tempHitsGroup)
            .gap(3)
            .x(d3.scale.linear().domain([-5, 35]))
            .renderHorizontalGridLines(true)
            .yAxisLabel("number of times")
            .xAxis().tickFormat(function (v) {
            return v + "°C";
        });

        //days - rainfall chart
        rainWeekDaysRowChart
            .width(600)
            .height(400)
            .group(perDayWeekGroupStats)
            .valueAccessor(function (d) {
                return d.value.rainfall;
            })
            .elasticX(true)
            .dimension(dayOfTheWeekDimension)
            .xAxis().tickFormat(function (v) {
            return v + "mm";
        });

        //months - temp chart
        tempMonthsRowChart
            .width(500)
            .height(400)
            .group(perMonthGroupStats)
            .valueAccessor(function (d) {
                return d.value.surfaceTemperature;
            })
            .elasticX(true)
            .dimension(monthDimension)
            .xAxis().tickFormat(function (v) {
            return v + "°C";
        });

        //rainfall - season
        rainSeasonPieChart
            .radius(150)
            .dimension(seasonDimension)
            .group(perSeasonGroupStats)
            .innerRadius(55)
            .valueAccessor(function (d) {
                return d.value.rainfall;
            });

        //categgory chart
        categPieChart
            .radius(150)
            .dimension(categDimension)
            .group(categGroup)
            .label(function (d) {
                if (categPieChart.hasFilter() && !categPieChart.hasFilter(d.key)) {
                    return d.key + '(0%)';
                }
                var label = d.key;
                if (all.value()) {
                    label += '(' + Math.floor(d.value / all.value() * 100) + '%)';
                }
                return label;
            });


        //line stack chart with various stats
        variousChart
            .width(1300)
            .height(400)
            .mouseZoomable(true)
            .brushOn(false)
            .dimension(timeDimension)
            .renderArea(true)
            .rangeChart(magnifierChart)
            .x(d3.time.scale().domain([new Date(2015, 0, 1), new Date(2015, 10, 31)]))
            .round(d3.time.month.round)
            .xUnits(d3.time.months)
            .renderHorizontalGridLines(true)
            .legend(dc.legend().x(1160).y(15).itemHeight(10).gap(10))
            .group(allStats, 'Surface Temperature (°C)')
            .valueAccessor(function (d) {
                return d.value.surfaceTemperature;
            })
            .stack(allStats, 'Wind Speed (m/s)', function (d) {
                return d.value.windSpeed;
            })
            .stack(allStats, 'Relative Humidity (%)', function (d) {
                return d.value.relativeHumidity / 2;
            })
            .stack(allStats, 'Atmospheric pressure (mbar)', function (d) {
                return d.value.atmPressure / 20;
            });

        magnifierChart
            .width(1300)
            .height(70)
            .dimension(timeDimension)
            .group(allStats)
            .valueAccessor(function (d) {
                return d.value.atmPressure;
            })
            .centerBar(true)
            .gap(3)
            .x(d3.time.scale().domain([new Date(2015, 0, 1), new Date(2015, 10, 31)]))
            .round(d3.time.month.round)
            .alwaysUseRounding(true)
            .xUnits(d3.time.months);

        dataCount
            .dimension(ndx)
            .group(all)
            .html({
                some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records',
                all: 'All records selected. Please click on the graph to apply filters.'
            });

        dataTable
            .dimension(timeDimension)
            .group(function (d) {
                return d.time.year + ' ' + monthNames[d.time.month - 1];
            })
            .size(50)
            .columns([
                {
                    label: 'Day',
                    format: function (d) {
                        return d.time.day.name + ' ' + d.time.day.number;
                    }
                },
                {
                    label: 'Atmospheric pressure',
                    format: function (d) {
                        return numberFormat(d.atmPressure) + ' mbar';
                    }
                },
                {
                    label: 'Rainfall',
                    format: function (d) {
                        return numberFormat(d.rainfall) + ' mm';
                    }
                },
                {
                    label: 'Temperature',
                    format: function (d) {
                        return Math.floor(d.surfaceTemperature) + " °C";
                    }
                },
                {
                    label: 'Wind Speed',
                    format: function (d) {
                        return numberFormat(d.windSpeed) + ' m/s';
                    }
                }
            ])
            .sortBy(function (d) {
                return d.time.fullDate;
            });


        dc.renderAll();
        dc.redrawAll();

    });


function getTimeObject(date) {

    var dayObject = {
        number: date.getDate(),
        name: dayNames[date.getDay()]
    };
    return {
        fullDate: date,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: dayObject,
        hour: date.getHours()
    };
}


//convenience methods for reduction
function godReduceAdd(p, v) {
    ++p.count;
    p.rainfall += v.rainfall;

    p.atmPressureSum += v.atmPressure;
    p.windSpeedSum += v.windSpeed;
    p.windDirectionSum += v.windDirection;
    p.surfaceTemperatureSum += v.surfaceTemperature;
    p.relativeHumiditySum += v.relativeHumidity;

    p.atmPressure = p.atmPressureSum / p.count;
    p.windSpeed = p.windSpeedSum / p.count;
    p.windDirection = p.windDirectionSum / p.count;
    p.surfaceTemperature = p.surfaceTemperatureSum / p.count;
    p.relativeHumidity = p.relativeHumiditySum / p.count;
    return p;
}

function godReduceRemove(p, v) {
    --p.count;
    p.rainfall -= v.rainfall;

    p.atmPressureSum -= v.atmPressure;
    p.windSpeedSum -= v.windSpeed;
    p.windDirectionSum -= v.windDirection;
    p.surfaceTemperatureSum -= v.surfaceTemperature;
    p.relativeHumiditySum -= v.relativeHumidity;

    //avoid division by 0
    if (p.count === 0) {
        p.atmPressure = p.windSpeed = p.windDirection = p.surfaceTemperature = p.relativeHumidity = 0;
        return p;
    }
    p.atmPressure = p.atmPressureSum / p.count;
    p.windSpeed = p.windSpeedSum / p.count;
    p.windDirection = p.windDirectionSum / p.count;
    p.surfaceTemperature = p.surfaceTemperatureSum / p.count;
    p.relativeHumidity = p.relativeHumiditySum / p.count;

    return p;
}

function godInit() {
    return {
        count: 0,
        atmPressureSum: 0,
        rainfall: 0,
        windSpeedSum: 0,
        windDirectionSum: 0,
        surfaceTemperatureSum: 0,
        relativeHumiditySum: 0,
    }
}









