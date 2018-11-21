
// Copyright (c) 2016 CanalTP
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as L from "leaflet";
import * as d3fetch from "d3-fetch";
import * as tinycolor from "tinycolor2";
import * as sprintf from "sprintf";
import $ from 'jquery';
window.jQuery = $;
window.$ = $;
import 'jquery-datetimepicker';


/** Map generation section**/
var map;
var heatMapMarkersGroup;
var starting_point_marker;

createMap();

function createMap() {
    var mapboxTiles = L
        .tileLayer(
            'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token={token}',
            {
                attribution : 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                mapId : 'mapbox-streets',
                token : 'pk.eyJ1Ijoic2hha2VkayIsImEiOiJjaWxjYzVxbzIwMDZud2dsejg3Zmw3dncyIn0.1mxg8ZqXNXzMZ2OkH9os5A'
            });

    map = L.map('map', {renderer: new L.canvas()}).addLayer(mapboxTiles).locate(/*{setView: true, maxZoom: 20}*/);

    map.on('locationfound', function(e) {
        map.setView(e.latlng, 16);
    });
    map.on('locationerror', function(e) {
        //If no location, setting on Merhav
        var marhav_location = [32.072728, 34.792708];
        map.setView(marhav_location, 14);
    });
    return map;
}


function addHeatMapLayer(featureGroup) {
    /*var div = $('<div/>');
    div.addClass('leaflet');*/
    centerOnCurrentLocation();
    var bounds = featureGroup.addTo(map).getBounds();
    setTimeout(function() {
        /*if (bounds) { map.fitBounds(bounds); } else { map.fitWorld(); }*/
    }, 100);

}

function addHeatMap(url) {
    d3fetch.json(url).then(function (data) {
        loadHeatMap(data)
    }).catch(function(error) { console.log(error); });
}

function getColorFromDuration (duration) {
    return toCssColor(computeColorFromDuration(duration));
};


function computeColorFromDuration (duration) {
    var boundry1 = 900; //15min
    var boundry2 = 1800;
    var boundry3 = 2700;
    var maxboundry=3600;
    var r, g, b, ratioForLuminace, hslColor, rgb;
    if (duration < boundry1) {
        r = 102;
        g = 194;
        b = 165;
        rgb = '"rgb(' + r + ',' + g + ',' + b + ')"';
        hslColor = new tinycolor(rgb);
        ratioForLuminace = 50 - Math.round((duration / boundry1) * 50 );
        hslColor.lighten(ratioForLuminace);
        hslColor.toRgb();
        r = Math.round(hslColor._r);
        g = Math.round(hslColor._g);
        b = Math.round(hslColor._b);
    }
    else if (duration >= boundry1 && duration < boundry2) {
        r = 252;
        g = 141;
        b = 98;
        rgb = '"rgb(' + r + ',' + g + ',' + b + ')"';
        hslColor = new tinycolor(rgb);
        ratioForLuminace = 50 - Math.round((duration / boundry2) * 50 );
        hslColor.lighten((ratioForLuminace));
        hslColor.toRgb();
        r = Math.round(hslColor._r);
        g = Math.round(hslColor._g);
        b = Math.round(hslColor._b);
    } else if (duration >= boundry2 && duration < boundry3) {
        r = 141;
        g = 160;
        b = 203;
        rgb = '"rgb(' + r + ',' + g + ',' + b + ')"';
        hslColor = new tinycolor(rgb);
        ratioForLuminace = 50 - Math.round((duration / boundry3) * 50);
        hslColor.lighten((ratioForLuminace));
        hslColor.toRgb();
        r = Math.round(hslColor._r);
        g = Math.round(hslColor._g);
        b = Math.round(hslColor._b);
    }
    else  {
        r = 231;
        g = 138;
        b = 195;
        rgb = '"rgb(' + r + ',' + g + ',' + b + ')"';
        hslColor = new tinycolor(rgb);
        ratioForLuminace = 50 - Math.round((duration / maxboundry) * 50 );
        hslColor.lighten((ratioForLuminace));
        hslColor.toRgb();
        r = Math.round(hslColor._r);
        g = Math.round(hslColor._g);
        b = Math.round(hslColor._b);
    }
    return {red: r, green: g, blue: b};
};

function toCssColor (c, alpha) {
    if (alpha) {
        return sprintf('rgba(%s, %s, %s, %s)', c.red, c.green, c.blue, alpha);
    } else {
        return sprintf('#%02x%02x%02x', c.red, c.green, c.blue);
    }
};

function loadHeatMap(data) {
    var heatMatrix= data.heat_maps[0].heat_matrix;
    var scale = 0;
    heatMatrix.lines.forEach(function(lines) {
        lines.duration.forEach(function(duration) {
            if (duration !== null) {
                scale = Math.max(duration, scale);
            }
        });
    });

    heatMapMarkersGroup = new L.FeatureGroup
    heatMatrix.lines.forEach(function(lines/*, i*/) {
        lines.duration.forEach(function(duration, j) {
            var color;
            if (duration !== null) {
                color = getColorFromDuration(duration);
            } else {
                color = '#000000';
                // for the moment, we don't want to print the null duration squares because
                // it impacts the performances of the navigator.
                return;
            }
            var rectangle = [
                [heatMatrix.line_headers[j].cell_lat.max_lat, lines.cell_lon.max_lon],
                [heatMatrix.line_headers[j].cell_lat.min_lat, lines.cell_lon.min_lon]
            ];
            heatMapMarkersGroup.addLayer(makePixel(rectangle, color, duration));
        });
    });
    addHeatMapLayer(heatMapMarkersGroup);
    ;
}

function makePixel (PolygonCoords, color, duration) {
    var sum = 'not accessible';
    if (duration !== null) {
        sum = sprintf('duration: %s', durationToString(duration));
    }
    return L.rectangle(PolygonCoords, {
        smoothFactor: 0,
        color:  '#555555',
        opacity: 0,
        weight: 0,
        fillColor: color,
        fillOpacity: 0.5
    }).bindPopup(sum);
};

function durationToString (duration) {
    var res = '';
    var seconds = duration % 60;
    var minutes = Math.floor(duration / 60) % 60;
    var hours = Math.floor(duration / (60 * 60)) % 24;
    var days = Math.floor(duration / (24 * 60 * 60));

    if (days !== 0) { res += sprintf('%sd', days); }
    if (hours !== 0) { res += sprintf('%sh', hours); }
    if (minutes !== 0) { res += sprintf('%smin', minutes); }
    if (seconds !== 0) { res += sprintf('%ss', seconds); }

    if (! res) {
        return '0s';
    } else {
        return res;
    }
};

function centerOnCurrentLocation() {
    map.on('locationfound', function(e) {
            map.setView(e.latlng, 13);
    });
}

/**User Interaction**/
var starting_location;

map.on('click', function(e){
    starting_location = e.latlng;
    //remove former starting marker point
    if (starting_point_marker !== undefined) {
        map.removeLayer(starting_point_marker);
    }
    starting_point_marker = new L.marker(starting_location).addTo(map);
});

var navitia_server_url= "http://localhost:9191/v1/coverage/default/heat_maps";
var max_duration = "1800";
var resolution = "5000"

var date_time_picker = $('#datetimepicker').datetimepicker({
    format:'d.m.Y H:i',
    formatDate: 'd.m.Y',
    formatTime: 'H:i',
    startDate: '21.10.2018',
    minDate:'21.10.2018',
    maxDate:'27.10.2018',
    defaultTime:'08:00',
    step: 30
});
date_time_picker.val('21.10.2018 08:00:00');

var runButton = $('#runButton');

runButton.on("click", function () {
    if (starting_point_marker === undefined) {
        alert("Please select a starting point on the map");
        return;
    }
    //Getting the time from the Date & time picker
    var dt = date_time_picker.datetimepicker('getValue');
    var dateTimeString = sprintf('%s%s%sT%s%s00', dt.getFullYear(),
        ("0" + (dt.getMonth() + 1)).slice(-2),
        ("0" + (dt.getDate())).slice(-2),
        ("0" + (dt.getHours())).slice(-2),
        ("0" + (dt.getMinutes())).slice(-2));

    console.log(dateTimeString);

    var heatMapJsonUrl = navitia_server_url+
        "?max_duration=" + max_duration +
        "&from="+ starting_location.lng + "%3B" + starting_location.lat +
        "&datetime=" + dateTimeString + "&resolution=" + resolution;

    //remove current heat map
    if (map.hasLayer(heatMapMarkersGroup)) {
        map.removeLayer(heatMapMarkersGroup);
    }

    //add new heat map
    addHeatMap(heatMapJsonUrl);
})

