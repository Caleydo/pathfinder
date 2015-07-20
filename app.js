/**
 * Created by Christian on 11.12.2014.
 */
require(['jquery', 'd3', '../caleydo/main', './listeners', './list/listview', './pathgraph/pathgraph2', './setinfo', './datastore',
    './pathstats/pathstatsview', './search', './pathutil', './query/queryview', './query/pathquery', './config', './list/pathsorting', './statisticsutil',
    '../pathfinder-ccle/ccle', 'font-awesome', 'bootstrap'],
  function ($, d3, C, listeners, listView, overviewGraph, setInfo, dataStore, pathStatsView, ServerSearch, pathUtil, queryView, pathQuery, config, pathSorting, statisticsUtil, ccle) {

    'use strict';

    //set a cookie such that it will be transferred to the server
    document.cookie = 'uc=' + C.hash.getProp('uc', 'dblp') + '; path=/';


    //var jsonPaths = require('./testpaths1.json');

    var currentPathId = 0;


    $(document).ready(function () {


        //$.widget("custom.typedAutocomplete", $.ui.autocomplete, {
        //  _renderItem: function (ul, item) {
        //
        //    return $("<li>")
        //      .append($("<a>").text(item.label))
        //      .appendTo(ul);
        //    //return $( "<li>" )
        //    //  .attr( "data-value", item.value )
        //    //  .css("color", item.color)
        //    //  .append( item.label )
        //    //  .appendTo( ul );
        //  },
        //
        //  _renderMenu: function (ul, items) {
        //    var that = this;
        //    items.sort(function (a, b) {
        //      return d3.ascending(a.category, b.category);
        //    });
        //
        //    var currentCategory = 0;
        //    $.each(items, function (index, item) {
        //
        //      if (item.category !== currentCategory) {
        //
        //        $("<a>").text(item.category)
        //          .css({
        //            "font-style": "italic",
        //            "font-weight": "bold",
        //            "font-size": 11
        //          })
        //          .appendTo(ul);
        //        currentCategory = item.category;
        //      }
        //      that._renderItemData(ul, item);
        //    });
        //  }
        //});

        //$("#testInput").typedAutocomplete({
        //
        //  minLength: 3,
        //  source: function (request, response) {
        //    var term = request.term;
        //    ServerSearch.search(term, 'name', '_Network_Node').then(function (nameResults) {
        //      nameResults.forEach(function (element) {
        //        element.category = "Name";
        //      });
        //      ServerSearch.search(term, 'name', '_Set_Node').then(function (setResults) {
        //        setResults.forEach(function (element) {
        //          element.category = "Set";
        //        });
        //
        //        var nodeTypes = config.getNodeTypes();
        //        nodeTypes = nodeTypes.filter(function (type) {
        //          var res = type.search(new RegExp(term, "i"));
        //          return res !== -1;
        //        });
        //        var typeResults = nodeTypes.map(function (type) {
        //          return {
        //            label: type,
        //            value: type,
        //            category: "Type"
        //          }
        //        });
        //        response(nameResults.concat(setResults, typeResults));
        //      });
        //    });
        //  },
        //  select: function (event, ui) {
        //    $("#testInput").val(ui.item.label);
        //    //that.id = ui.item.value;
        //    //pathQuery.setQuery(queryView.container.getPathQuery(), false);
        //    return false; // Prevent the widget from inserting the value.
        //  },
        //  focus: function (event, ui) {
        //    $("#testInput").val(ui.item.label);
        //    //that.id = ui.item.value;
        //    return false; // Prevent the widget from inserting the value.
        //  }
        //
        //  //source: [{label: "Alex", value: "value1", category: "Set"}, {
        //  //  label: "Marc",
        //  //  value: "value2",
        //  //  category: "Name"
        //  //}, {label: "Christian", value: "value3", category: "Name"}, {label: "Sam", value: "value4", category: "Type"}]
        //});

        statisticsUtil.statisticsOf([0, NaN, 5, 3, NaN, 7, 3]);

        ServerSearch.on({
          query_start: function () {
            //reset();
          },
          query_path: function (event, data) {
            addPath(data.path);
          },
          neighbor_neighbor: function(event, data) {
            addNeighbor(data.node,data.path);
          },
          neighbor_done: function(event, data) {
            console.log(data.node, data.neighbors);
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
            //C.getJSON("dump/egfr-ptk2-sos1.json", function (paths) {
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

        function addNeighbor(node, neighbor) {
          console.log(node, neighbor);
        }

        function loadPaths(paths) {

          reset();

          for (var i = 0; i < paths.length; i++) {
            paths[i].id = currentPathId++;
            dataStore.addPath(paths[i]);
          }
          //dataStore.paths = paths;
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
