define(['jquery', 'd3', 'webcola', 'dagre-d3', '../listeners', '../selectionutil', '../list/pathsorting', '../query/pathquery', '../config', '../view'],
  function ($, d3, webcola, dagreD3, listeners, selectionUtil, pathSorting, pathQuery, config, View) {
    'use strict';

    var w = 800;
    var h = 700;

    var sideSpacing = 10;
    //var arrowWidth = 7;
    var nodeWidth = 50;
    var nodeHeight = 20;

    function PathGraphView() {
      View.call(this, "#pathgraph");
      this.grabHSpace = true;
      this.grabVSpace = true;

      this.paths = [];
      this.graph = new dagreD3.graphlib.Graph().setGraph({
        rankdir: "LR",
        marginx: 5,
        marginy: 5
      });
    }

    PathGraphView.prototype = Object.create(View.prototype);

    PathGraphView.prototype.getMinSize = function () {
      if (this.graph.nodes().length === 0) {
        return {width: 200, height: 200};
      }

      return {width: Math.max(this.graph.graph().width, 200), height: Math.max(this.graph.graph().height, 200)};
    };

    PathGraphView.prototype.init = function () {
      View.prototype.init.call(this);
      d3.select(this.parentSelector + " svg").append("g")
        .attr("class", "graph");

      $(window).on('resize.center', function (e) {
        that.centerGraph();
      });

      var that = this;

      selectionUtil.addListener("path", function (selectionType) {
        var selectedIds = (selectionUtil.selections["path"])[selectionType];
        var selected = false;

        var selectedNodes = {};
        var selectedPaths = [];
        selectedIds.forEach(function (pathId) {

          for (var i = 0; i < that.paths.length; i++) {
            var path = that.paths[i];
            if (path.id === pathId) {
              selectedPaths.push(path);
              path.nodes.forEach(function (node) {
                selectedNodes[node.id.toString()] = true;
              });
            }
          }
        });

        var svg = d3.select("#pathgraph svg");
        svg.selectAll("g.node")
          .classed("path_" + selectionType, function (d) {
            return (typeof selectedNodes[d] !== "undefined");
          });

        svg.selectAll("g.edgePath path")
          .classed("path_" + selectionType, function (d) {


            return (typeof selectedNodes[d.v] !== "undefined") && (typeof selectedNodes[d.w] !== "undefined");
          });


      });

      listeners.add(function (query) {
        if (pathQuery.isRemoveFilteredPaths() || pathQuery.isRemoteQuery()) {
          that.updateGraphToFilteredPaths();
        } else {
          that.updateFilter();
        }
      }, listeners.updateType.QUERY_UPDATE);
      listeners.add(function (remove) {
        if (remove) {
          that.updateGraphToFilteredPaths();
        } else {
          that.updateGraphToAllPaths();
        }
      }, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);
    };

    PathGraphView.prototype.addPathsToGraph = function (paths) {

      var that = this;


      paths.forEach(function (path) {
          var prevNode = 0;
          path.nodes.forEach(function (node) {
            that.graph.setNode(node.id, {
              label: node.properties[config.getNodeNameProperty(node)],
              node: node,
              padding: 5

            });
            if (prevNode !== 0) {
              that.graph.setEdge(prevNode.id, node.id, {edge: node});
            }
            prevNode = node;
          });


        }
      );
    };

    PathGraphView.prototype.centerGraph = function () {
      var svg = d3.select("#pathgraph svg");
      var svgWidth = $(svg[0]).width();
      var svgHeight = $(svg[0]).height();
      var graphWidth = this.graph.graph().width;
      var graphHeight = this.graph.graph().height;
      svg.select("g.graph").attr("transform", "translate(" + ((svgWidth - graphWidth) / 2) + ", " + ((svgHeight - graphHeight) / 2) + ")");
    };


    PathGraphView.prototype.updateGraphToFilteredPaths = function () {

      this.graph = new dagreD3.graphlib.Graph().setGraph({
        rankdir: "LR",
        marginx: 5,
        marginy: 5
      });

      var that = this;

      if (pathQuery.isRemoteQuery()) {
        for (var i = 0; i < this.paths.length; i++) {
          var path = this.paths[i];
          if (pathQuery.isPathFiltered(path.id)) {
            this.paths.splice(i, 1);
            i--;
          }
        }
      }

      this.paths.forEach(function (path) {
        if (!pathQuery.isPathFiltered(path.id)) {
          that.addPathsToGraph([path]);
        }
      });

      this.renderGraph(d3.select("#pathgraph svg"));
    };

    PathGraphView.prototype.updateGraphToAllPaths = function () {
      var that = this;

      this.graph = new dagreD3.graphlib.Graph().setGraph({
        rankdir: "LR",
        marginx: 5,
        marginy: 5
      });

      that.addPathsToGraph(this.paths);

      this.renderGraph(d3.select("#pathgraph svg"));
    };


    PathGraphView.prototype.updateFilter = function () {

      var svg = d3.select("#pathgraph svg");
      svg.selectAll("g.node")
        .transition()
        .style("opacity", function (d) {
          return pathQuery.isNodeFiltered(d) ? 0.5 : 1;
        });

      svg.selectAll("g.edgePath path")
        .classed("filtered", function (d) {
          return pathQuery.isNodeFiltered(d.v) || pathQuery.isNodeFiltered(d.w);
        });

    };

    PathGraphView.prototype.render = function (paths) {
      this.paths = paths;
      //if (paths.length > 0) {

      var svg = d3.select("#pathgraph svg");
      this.addPathsToGraph(paths);

      this.renderGraph(svg);

    };

    PathGraphView.prototype.addPath = function (path) {
      this.paths.push(path);
      var svg = d3.select("#pathgraph svg");
      this.addPathsToGraph([path]);

      this.renderGraph(svg);
    };

    PathGraphView.prototype.reset = function () {
      var svg = d3.select("#pathgraph svg");

      svg.selectAll("g.graph")
        .remove();

      svg.append("g")
        .attr("class", "graph");

      this.paths = [];
      this.graph = new dagreD3.graphlib.Graph().setGraph({
        rankdir: "LR",
        marginx: 5,
        marginy: 5
      });
    };

    PathGraphView.prototype.renderGraph = function (svg) {


      var that = this;

      // Set some general styles
      this.graph.nodes().forEach(function (v) {
        var node = that.graph.node(v);
        node.rx = node.ry = 5;
      });

// Add some custom colors based on state
//        g.node('CLOSED').style = "fill: #f77";
//        g.node('ESTAB').style = "fill: #7f7";

      var inner = svg.select("g.graph");

// Set up zoom support
//        var zoom = d3.behavior.zoom().on("zoom", function() {
//          inner.attr("transform", "translate(" + d3.event.translate + ")" +
//          "scale(" + d3.event.scale + ")");
//        });
//        svg.call(zoom);

// Create the renderer
      var render = new dagreD3.render();

// Run the renderer. This is what draws the final graph.
      render(inner, this.graph);

// Center the graph
//        var initialScale = 0.75;
//        zoom
//          .translate([(svg.attr("width") - g.graph().width * initialScale) / 2, 20])
//          .scale(initialScale)
//          .event(svg);

      this.updateFilter();

      this.updateViewSize();
      this.centerGraph();

      inner.selectAll("g.node")
        .on("dblclick", function (d) {
          pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getNodePresenceStrategy([d]));
          listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
        });
      selectionUtil.addDefaultListener(inner, "g.node", function (d) {
          return d;
        },
        "node"
      );


    };


    return new PathGraphView();


  }
)
;
