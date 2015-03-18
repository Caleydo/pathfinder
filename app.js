/**
 * Created by Christian on 11.12.2014.
 */
require(['jquery', 'd3', './listeners', './listview', './setlist', './overviewgraph', './setinfo', './datastore', './pathstats/pathstatsview', './search/main', './pathutil', './query/queryview', 'font-awesome', 'bootstrap'],
  function ($, d3, listeners, listView, setList, overviewGraph, setInfo, dataStore, pathStatsView, SearchPath, pathUtil, QueryView) {

    'use strict';

    //var jsonPaths = require('./testpaths1.json');

    var currentPathId = 0;




    $(document).ready(function () {

        var queryView = new QueryView("#pathQuery");

        queryView.init();
        overviewGraph.init();
        listView.init();
        pathStatsView.init();
        //setList.init();


        //  $.ajax({
        //
        //    // The 'type' property sets the HTTP method.
        //    // A value of 'PUT' or 'DELETE' will trigger a preflight request.
        //    //type: 'POST',
        //    type: 'GET',
        //
        //    // The URL to make the request to.
        //    url: 'http://localhost:7474/db/data/',
        //    //url: 'http://localhost:7474/db/data/ext/FindShortestPath/graphdb/get_shortest_path',
        //
        //    accepts: 'application/json',
        //
        //    success: function (response) {
        //      d3.select("body").append("p").text(response);
        //    },
        //
        //    error: function (response) {
        //      var x = 2
        //    }
        //  });

        //console.time("time")
        //
        //$.ajax({
        //
        //  // The 'type' property sets the HTTP method.
        //  // A value of 'PUT' or 'DELETE' will trigger a preflight request.
        //  //type: 'POST',
        //  type: 'POST',
        //
        //  // The URL to make the request to.
        //  //url: 'http://localhost:7474/db/data/ext/KShortestPaths/graphdb/kShortestPaths',
        //  url: '/api/pathway/setinfo',
        //
        //  accepts: 'application/json',
        //
        //  // The 'contentType' property sets the 'Content-Type' header.
        //  // The JQuery default for this property is
        //  // 'application/x-www-form-urlencoded; charset=UTF-8', which does not trigger
        //  // a preflight. If you set this value to anything other than
        //  // application/x-www-form-urlencoded, multipart/form-data, or text/plain,
        //  // you will trigger a preflight request.
        //  contentType: 'application/json',
        //  data: "{\"sets\":[\"hsa00310\", \"hsa00330\"]}",
        //
        //  //data: '{"source":"http://localhost/:7474/db/data/node/15991", ' +
        //  //'"target":"http://localhost/:7474/db/data/node/1713", ' +
        //  //'"k":"3", ' +
        //  //'"costFunction":"function getCost(properties) {return 1.0}", ' +
        //  //'"ignoreDirection":"false"}',
        //  //data: '{"node_from": "/node/116", "node_to": "/node/92", "relationship_types": ["PATHWAY_EDGE"], "relationship_costs": [1.0], "only_one_route": true, "soft_timeout": 5000, "max_cost": 1000000.0 }',
        //
        //  //xhrFields: {
        //  // The 'xhrFields' property sets additional fields on the XMLHttpRequest.
        //  // This can be used to set the 'withCredentials' property.
        //  // Set the value to 'true' if you'd like to pass cookies to the server.
        //  // If this is enabled, your server must respond with the header
        //  // 'Access-Control-Allow-Credentials: true'.
        //  //withCredentials: false
        //  //},
        //
        //  //headers: {
        //  // Set any custom headers here.
        //  // If you set any non-simple headers, your server must include these
        //  // headers in the 'Access-Control-Allow-Headers' response header.
        //  //},
        //
        //  success: function (response) {
        //
        //    console.timeEnd("time")
        //    var paths = JSON.parse(response);
        //
        //    //var strp = paths.toString();
        //
        //    loadPaths(paths);
        //
        //    //if (paths.length > 0) {
        //    //
        //    //  renderPaths(svg, paths);
        //    //
        //    //  var firstPath = paths[0];
        //    //  var firstNode = firstPath.nodes[0];
        //    //  var lastNode = firstPath.nodes[firstPath.nodes.length - 1];
        //    //
        //    //  var pathGraph = getGraphFromPaths(paths);
        //    //
        //    //  renderGraph(svg2, pathGraph, firstNode, lastNode);
        //    //}
        //  },
        //
        //  error: function (response) {
        //    // Here's where you handle an error response.
        //    // Note that if the error was due to a CORS issue,
        //    // this function will still fire, but there won't be any additional
        //    // information about the error.
        //    var x = 2
        //  }
        //});

        //$.ajax({
        //  type: 'GET',
        //  url: '/api/pathway/summary',
        //  accepts: 'application/json',
        //
        //  success: function (response) {
        //
        //    var summaryData = JSON.parse(response);
        //
        //    d3.selectAll("body p")
        //      .data(summaryData)
        //      .enter()
        //      .append("p")
        //      .text(function (d) {
        //        return d[0].toString() + ": " + d[1].toString();
        //      });
        //  },
        //
        //  error: function (response) {
        //  }
        //});

        //$.getJSON("/api/pathway/setinfo", {sets:"tololo"}, function (paths) {
        //  loadPaths(paths);
        //} );

        var selectPaths = $('<select>').prependTo('#listView')[0];

        $(selectPaths).append($("<option value='testpaths1.json'>20 paths from node 1800 to node 1713</option>"));
        $(selectPaths).append($("<option value='testpaths2.json'>50 paths from node 1800 to node 1713</option>"));
        $(selectPaths).append($("<option value='testpaths3.json'>50 paths from node 5 to node 9999</option>"));
        $(selectPaths).append($("<option value='testpaths4.json'>20 paths from node 780 to node 5395</option>"));
        $(selectPaths).on("change", function () {
          $.getJSON(this.value, function (paths) {
            reset();

            loadPaths(paths);

          });
        });

        var search = new SearchPath('#search_path');
        $(search).on({
          reset: reset,
          addPath: function (event, path) {
            addPath(path);
          }
        });
        listeners.add(function(query) {
          search.setQuery(query);
        }, listeners.updateType.QUERY_UPDATE);

        $.getJSON("testpaths1.json", function (paths) {

          var i = 0;

          var interval = setInterval(function () {

            if (i >= paths.length) {
              clearInterval(interval);
              return;
            }
            addPath(paths[i]);
            i++;

          }, 100);

          //paths.forEach(function (path) {
          //
          //
          //  //loadPaths(paths);
          //});
          //loadPaths(paths);
        });

        function reset() {
          dataStore.paths = [];
          currentPathId = 0;
          listView.reset();
          overviewGraph.reset();
          pathStatsView.reset();
        }

        function addPath(path) {
          path.id = currentPathId++;
          dataStore.paths.push(path);

          fetchSetInfos([path]);

          pathStatsView.addPath(path);
          pathStatsView.render();
          listView.addPath(path);
          overviewGraph.addPath(path);


        }

        function loadPaths(paths) {

          reset();

          for (var i = 0; i < paths.length; i++) {
            paths[i].id = i;
          }

          //listeners.clear(listeners.updateType.PATH_SELECTION);
          //listeners.clear(listeners.updateType.SET_INFO_UPDATE);


          if (paths.length > 0) {
            //var allSetIds = [];
            //var setDict = {};

            fetchSetInfos(paths);


            listView.render(paths);
            //setList.render(paths);

            overviewGraph.render(paths);

            pathStatsView.setPaths(paths);
            pathStatsView.render();
          }
        }

        function fetchSetInfos(paths) {

          var setIds = [];

          paths.forEach(function (path) {
            path.nodes.forEach(function (node) {
              for (var key in node.properties) {
                if (pathUtil.isNodeSetProperty(key)) {
                  var property = node.properties[key];
                  if (property instanceof Array) {
                    property.forEach(function (setId) {
                      addSet(key, setId);
                    });
                  } else {
                    addSet(key, property);
                  }
                }
              }
            });

            path.edges.forEach(function (edge) {
              for (var key in edge.properties) {
                if (pathUtil.isEdgeSetProperty(key)) {
                  var property = edge.properties[key];
                  if (property instanceof Array) {
                    property.forEach(function (setId) {
                      addSet(key, setId);
                    });
                  } else {
                    addSet(key, property);
                  }
                }
              }
            });
          });

          function addSet(type, setId) {
            setInfo.addToType(type, setId);

            if (setIds.indexOf(setId) == -1) {
              setIds.push(setId);
            }
          }

          setInfo.fetch(setIds);
        }


        //var propertyCosts = {
        //  size: {
        //    big: 2.0,
        //    small: 1.0
        //  },
        //  mood: {
        //    good: 2.0,
        //    bad: 1.0
        //  }
        //};
        //
        //var myCost = getCost([["size", "big"], ["mood", "bad"]]);
        //d3.select("body").append("p").text(myCost);
        //
        //function getCost(properties) {
        //  var totalCost = 1.0;
        //  properties.forEach(function (propObject) {
        //    var property = propObject[0];
        //    var value = propObject[1];
        //    var propDef = propertyCosts[property];
        //    if (typeof propDef != "undefined") {
        //      var cost = propDef[value];
        //      if (typeof cost != "undefined") {
        //        totalCost += cost;
        //      }
        //    }
        //  });
        //  return totalCost;
        //}

      }
    )
    ;


//$.get("/api/pathway/path", function (resp) {
//
//  var paths = JSON.parse(resp);
//
//  renderPaths(svg, paths);
//  //$('<h1>' + resp + '</h1>').appendTo('body');
//});


  }
);
