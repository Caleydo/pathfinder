/**
 * Created by Christian on 11.12.2014.
 */
require(['jquery', 'd3', '../caleydo_core/main', '../caleydo_core/ajax', './listeners', './list/listview', './pathgraph/pathgraph2', './setinfo', './datastore',
    './pathstats/pathstatsview', '../pathfinder_graph/search', './pathutil', './query/queryview', './query/pathquery', './config', './list/pathsorting', './statisticsutil',
    '../pathfinder_ccle/ccle', './extradata', './list/progressbar', './list/path/pathdata', 'font-awesome', 'bootstrap'],

  function ($, d3, C, ajax, listeners, listView, overviewGraph, setInfo, dataStore, pathStatsView, ServerSearch, pathUtil,
            queryView, pathQuery, config, pathSorting, statisticsUtil, ccle, extradata, progressBar, pathData) {

    'use strict';

    //var jsonPaths = require('./testpaths1.json');

    //$(function () {
    //    $("#resizable").resizable({
    //        containment: "#container"
    //    });
    //});

    var currentPathId = 0;
    var showSettings = false;

    //how to use the extra data
    //extradata.getGeneData(['ACAA1'], "pathfinder_mrna").then(function (data) {
    //    console.log(data);
    //});
    //
    //extradata.getKEGGData((['C00157'], "pathfinder_metabolomics")).then(function (data) {
    //    console.log(data);
    //});
    //
    //extradata.list().then(function (descs) {
    //    console.log(descs);
    //});
    //extradata.getData(['ACAA1'], "pathfinder_mrna").then(function (data) {
    //    console.log(data);
    //});


    $(document).ready(function () {

        //$('#listView').resizable({
        //    handles: 'w,e', minWidth: 200
        //});
        //
        //$('#pathGraphView').resizable({
        //    handles: 'w,e', minWidth: 200
        //});
        //
        // $('#pathStatsView').resizable({
        //    handles: 'w,e', minWidth: 200
        //});


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
        var x = 0;

        ServerSearch.on({
          query_start: function () {
            //reset();
            progressBar.reset();
          },
          query_path: function (event, data) {
            addPath(data.path);
            //dataStore.addPath(data.path);
            //console.log("added path " +(x++))
          },

          query_done: function () {
            progressBar.render(-1);
          },

          neighbor_neighbor: function (event, data) {

            overviewGraph.addNeighbor(data.node, data.neighbor);
          }
          ,
          neighbor_done: function (event, data) {
            console.log(data.node, data.neighbors);
          }
        });

        //var selectPaths = d3.select('#select_dump');
        //ajax.getJSON('dump/testpaths.json').then(function (data) {
        //    var options = selectPaths.selectAll('option').data([{value: '', label: ''}].concat(data));
        //    options.enter().append('option')
        //        .attr('value', function (d) {
        //            return d.value
        //        })
        //        .text(function (d) {
        //            return d.label;
        //        });
        //});
        //selectPaths.on("change", function () {
        //    if (this.value != '') {
        //        ajax.getJSON(this.value, function (paths) {
        //            reset();
        //            loadPaths(paths);
        //        });
        //    }
        //});

        ServerSearch.resolveConfig().then(function (data) {
          config.setConfig(data);

          $("#toggleSettingsButton").click(function () {
            showSettings = !showSettings;
            $(this).toggleClass("btn-active");
            $(this).toggleClass("btn-default");


            if (showSettings) {
              $("#settings").css({display: "inline-block"});
              $("#mainContent").css({"margin-right": 255});
            } else {
              $("#settings").css({display: "none"});
              $("#mainContent").css({"margin-right": 0});
            }
          });

          dataStore.init();
          pathSorting.init();
          pathData.init();
          queryView.init();
          overviewGraph.init();
          progressBar.init();


          listView.init().then(function () {

            pathStatsView.init();

            var initialPaths = config.getSamplePathsFile();
            if (initialPaths) {

              ajax.getJSON(initialPaths).then(function (paths) {

                var i = 0;

                var interval = setInterval(function () {

                  if (i >= paths.length) {
                    clearInterval(interval);
                    progressBar.render(-1);
                    return;
                  }
                  addPath(paths[i]);
                  i++;

                }, 100);

              });
            }


          });

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
          var added = dataStore.addPath(path);
          if (added) {
            pathQuery.addPath(path);

            pathData.addPath(path);

            fetchSetInfos([path]);

            pathStatsView.addPath(path);
            pathStatsView.render();
            //listView.addPath(path);
            overviewGraph.addPath(path);
            progressBar.update(path);
          }
          progressBar.update(path, added);

        }

        //function addNeighbor(node, neighbor) {
        //    console.log(node, neighbor.properties.name);
        //}

        //function loadPaths(paths) {
	//
        //  reset();
	//
        //  for (var i = 0; i < paths.length; i++) {
        //    paths[i].id = currentPathId++;
        //    dataStore.addPath(paths[i]);
        //  }
        //  //dataStore.paths = paths;
        //  pathQuery.update();
	//
	//
        //  if (paths.length > 0) {
        //    //var allSetIds = [];
        //    //var setDict = {};
	//
        //    fetchSetInfos(paths);
	//
	//
        //    listView.render(paths);
        //    //setList.render(paths);
	//
        //    overviewGraph.render(paths);
	//
        //    pathStatsView.setPaths(paths);
        //    pathStatsView.render();
        //  }
        //}

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
)
;
