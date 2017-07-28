'use strict';

var timeFormat = d3.time.format('%Y/%m/%d %H:%M');
var numberFormat = d3.format('.2f');

d3.csv('JCMB_2015.csv', function (row) {
    //converting csv data to javascript data types

    return {
        time: timeObj(timeFormat.parse(row['date-time'])),
        atmPressure: +row['atmospheric pressure (mBar)'],
        rainfall: +row['rainfall (mm)'],
        windSpeed: +row['wind speed (m/s)'],
        windDirection: +row['wind direction (degrees)'],
        surfaceTemperature: +row['surface temperature (C)'],
        relativeHumidity: +row['relative humidity (%)'],
        solarFlux: +row['solar flux (Kw/m2)'],
        battery: +row['battery (V)']
    };
}, function (data) {
    var agg = d3.nest()
        .key(function(d) { return d.time.year;})
        .key(function(d) {return d.time.month;})
        .key(function (d) {return d.time.day;})
        .key(function (d) {return d.time.hour;})
        .entries(data);

    var newData = [];
    var s = 0;
    agg[0].values.forEach(function (byMonth) {
        byMonth.values.forEach(function(byDay){
            byDay.values.forEach(function(byHour) {
                var middle = Math.floor((byHour.values.length - 1) / 2);
                newData.push(byHour.values[middle]);
            });
        });
    });

    newData.forEach(function (t) { console.log(t.time); });
});


function timeObj(date) {
    return {
        fullDate: date,
        year: date.getFullYear(),
        month : date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes()
    };
}



