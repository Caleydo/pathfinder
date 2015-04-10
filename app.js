/**
 * Created by Christian on 11.12.2014.
 */
require(['jquery', 'd3', '../caleydo/main', './listeners', './list/listview', './pathgraph/pathgraph2', './setinfo', './datastore', './pathstats/pathstatsview', './search', './pathutil', './query/queryview', './query/pathquery', './config', './list/pathsorting', 'font-awesome', 'bootstrap'],
  function ($, d3, C, listeners, listView, overviewGraph, setInfo, dataStore, pathStatsView, ServerSearch, pathUtil, queryView, pathQuery, config, pathSorting) {

    'use strict';

    //set a cookie such that it will be transferred to the server
    document.cookie = 'uc=' + C.hash.getProp('uc', 'dblp') + '; path=/';


    //var jsonPaths = require('./testpaths1.json');

    var currentPathId = 0;


    $(document).ready(function () {

        ServerSearch.on({
          query_start: function () {
            //reset();
          },
          query_path: function (event, data) {
            addPath(data.path);
          }
        });

        var selectPaths = d3.select('#select_dump');
        C.getJSON('dump/testpaths.json').then(function (data) {
          var options = selectPaths.selectAll('option').data([{value: '', label: ''}].concat(data));
          options.enter().append('option')
            .attr('value', function (d) {
              return d.value
            })
            .text(function (d) {
              return d.label;
            });
        });
        selectPaths.on("change", function () {
          if (this.value != '') {
            C.getJSON(this.value, function (paths) {
              reset();
              loadPaths(paths);
            });
          }
        });

        C.getAPIJSON('/pathway/config.json').then(function (data) {
          config.setConfig(data);

          dataStore.init();
          pathSorting.init();
          queryView.init();
          overviewGraph.init();
          listView.init().then(function () {

            pathStatsView.init();
            //C.getJSON("dump/testpaths1.json", function (paths) {
            //
            //  var i = 0;
            //
            //  var interval = setInterval(function () {
            //
            //    if (i >= paths.length) {
            //      clearInterval(interval);
            //      return;
            //    }
            //    addPath(paths[i]);
            //    i++;
            //
            //  }, 100);
            //
            //});
          });


          //paths.forEach(function (path) {
          //
          //
          //  //loadPaths(paths);
          //});
          //loadPaths(paths);
        });

        function reset() {
          //dataStore.paths = [];
          currentPathId = 0;
          dataStore.reset();
          pathQuery.resetPaths();
          listView.reset();
          overviewGraph.reset();
          pathStatsView.reset();
        }

        function addPath(path) {
          path.id = currentPathId++;
          if (dataStore.addPath(path)) {
            pathQuery.addPath(path);

            fetchSetInfos([path]);

            pathStatsView.addPath(path);
            pathStatsView.render();
            listView.addPath(path);
            overviewGraph.addPath(path);
          }

        }

        function loadPaths(paths) {

          reset();

          for (var i = 0; i < paths.length; i++) {
            paths[i].id = currentPathId++;
          }
          dataStore.paths = paths;
          pathQuery.update();


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
              pathUtil.forEachNodeSet(node, addSet);
            });

            path.edges.forEach(function (edge) {

              pathUtil.forEachEdgeSet(edge, addSet);

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
