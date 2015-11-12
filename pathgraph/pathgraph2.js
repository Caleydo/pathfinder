define(['jquery', 'd3', 'webcola', 'dagre', '../listeners', '../selectionutil', '../list/pathsorting', '../query/pathquery', '../config', '../view', './forcelayout', './layeredlayout', '../list/path/pathdata'],
  function ($, d3, webcola, dagre, listeners, selectionUtil, pathSorting, pathQuery, config, View, ForceLayout, LayeredLayout, pathData) {
    'use strict';


    function newGraph() {
      return new dagre.graphlib.Graph();
    }

    function PathGraphView() {
      View.call(this, "#pathgraph");
      this.grabHSpace = true;
      this.grabVSpace = true;
      this.layeredLayout = new LayeredLayout(this);
      this.forceLayout = new ForceLayout(this);
      this.paths = [];
      this.currentGraphLayout = this.layeredLayout;
      this.neighbors = [];
      this.graph = newGraph();
      this.showAllPaths = false;
    }

    PathGraphView.prototype = Object.create(View.prototype);


    PathGraphView.prototype.init = function () {

      View.prototype.init.call(this);
      var that = this;

      pathData.addUpdateListener(function (changes) {

        if ((that.showAllPaths && changes.pathsChanged) || (!that.showAllPaths && changes.pagePathsChanged)) {
          that.paths = pathData.getPaths(that.showAllPaths);
          that.updateGraph();
        } else if (changes.cause === listeners.updateType.QUERY_UPDATE) {
          that.currentGraphLayout.render(that.paths, that.graph);
        }

      });

      var nodeWidth = config.getNodeWidth();
      var nodeHeight = config.getNodeHeight();

      var svg = d3.select(this.parentSelector + " svg");

      this.textSizeDomElement = svg.append("text")
        .attr('class', "textSizeElement")
        .attr("x", 0)
        .attr("y", 0)
        .style("font", "10px sans-serif")
        .style("opacity", 0);

      svg.append("clipPath")
        .attr("id", "graphNodeClipPath")
        .append("rect")
        .attr("x", -nodeWidth / 2 + 3)
        .attr("y", -nodeHeight / 2)
        .attr("width", nodeWidth - 6)
        .attr("height", nodeHeight);

      //svg.append("rect")
      //  .attr("style", {
      //    fill: "none",
      //    "pointer-events": "all"
      //  })
      //  .attr("width", "100%")
      //  .attr("height", "100%");
      //
      //svg.append("g")
      //  .call(d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", zoom))
      //  .append("g");
      //
      //function zoom() {
      //  svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
      //}

      var graphGroup = svg.append("g")
        .attr("class", "graph");

      graphGroup.append("g")
        .classed("edgeGroup", true);
      graphGroup.append("g")
        .classed("nodeGroup", true);


      var zoom = d3.behavior.zoom()
        .scaleExtent([0.1, 1])
        .on("zoom", function () {
          var translate = zoom.translate();
          var scale = zoom.scale();
           svg.select("g.graph").attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
          //svg.select("nodeGroup").attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
          //svg.select("edgeGroup").attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
        });

      svg.call(zoom);

      $("#showActivePagePaths").on("click", function () {
        if (that.showAllPaths) {
          that.showAllPaths = false;
          that.paths = pathData.getPaths(that.showAllPaths);
          that.updateGraph();
        }
        //listeners.notify("ALIGN_PATH_NODES", this.checked);
      });

      $("#showAllPaths").on("click", function () {
        if (!that.showAllPaths) {
          that.showAllPaths = true;
          that.paths = pathData.getPaths(that.showAllPaths);
          that.updateGraph();
        }
        //listeners.notify("ALIGN_PATH_NODES", this.checked);
      });


      $(window).on('resize.center', function (e) {
        if (that.currentGraphLayout === that.layeredLayout) {
          that.layeredLayout.centerGraph();
        } else {
          that.forceLayout.render(that.paths);
        }
      });

      selectionUtil.addListener("path", function (selectionType, source) {
        that.currentGraphLayout.onPathSelectionUpdate(selectionType, source);
      });


      //listeners.add(function (query) {
      //  if (pathQuery.isRemoveFilteredPaths() || pathQuery.isRemoteQuery()) {
      //    if (pathQuery.isRemoteQuery()) {
      //      for (var i = 0; i < that.paths.length; i++) {
      //        var path = that.paths[i];
      //        if (pathQuery.isPathFiltered(path.id)) {
      //          that.paths.splice(i, 1);
      //          i--;
      //        }
      //      }
      //    }
      //    that.updateGraph();
      //  } else {
      //    that.currentGraphLayout.updateFilter();
      //  }
      //}, listeners.updateType.QUERY_UPDATE);

      //listeners.add(function (remove) {
      //  that.updateGraph();
      //  //if (remove) {
      //  //    that.updateGraphToFilteredPaths();
      //  //} else {
      //  //    that.updateGraphToAllPaths();
      //  //}
      //}, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);

      this.currentGraphLayout.init();

      $("#layeredLayout").on("click", function () {
        //that.currentGraphLayout.reset();
        that.currentGraphLayout.prepareLayoutChange();
        that.currentGraphLayout = that.layeredLayout;
        //that.render(that.paths);
        that.currentGraphLayout.render(that.paths, that.graph);
        that.updateViewSize();
      });

      $("#forceLayout").on("click", function () {
        //that.currentGraphLayout.reset();
        that.currentGraphLayout.prepareLayoutChange();
        that.currentGraphLayout = that.forceLayout;
        //that.render(that.paths);
        that.currentGraphLayout.render(that.paths, that.graph);
        that.updateViewSize();
      });
    };

    PathGraphView.prototype.getTextWidth = function (string) {

      this.textSizeDomElement
        .text(string);

      return this.textSizeDomElement.node().getBBox().width;
    };


    PathGraphView.prototype.reset = function () {
      this.paths = [];
      this.graph = newGraph();
      this.forceLayout.reset();
      this.layeredLayout.reset();

      var svg = d3.select("#pathgraph svg");

      svg.selectAll("g.graph")
        .remove();

      var graphGroup = svg.append("g")
        .attr("class", "graph");


      graphGroup.append("g")
        .classed("edgeGroup", true);
      graphGroup.append("g")
        .classed("nodeGroup", true);
    };

    //PathGraphView.prototype.addPath = function (path) {
    //  this.paths.push(path);
    //  this.addPathsToGraph([path]);
    //  this.currentGraphLayout.render(this.paths, this.graph);
    //};

    //PathGraphView.prototype.render = function (paths) {
    //  this.reset();
    //  this.paths = paths;
    //  this.addPathsToGraph(paths);
    //  this.currentGraphLayout.render(this.paths, this.graph);
    //};

    PathGraphView.prototype.getMinSize = function () {
      return this.currentGraphLayout.getMinSize();
    };

    PathGraphView.prototype.addPathsToGraph = function (paths) {

      var that = this;


      paths.forEach(function (path) {
          var prevNode = 0;

          for (var i = 0; i < path.nodes.length; i++) {
            var node = path.nodes[i];
            that.graph.setNode(node.id, {
              label: node.properties[config.getNodeNameProperty(node)],
              node: node,
              isNeighborNode: false,
              width: config.getNodeWidth(),
              height: config.getNodeHeight()

            });
            if (prevNode !== 0) {
              that.graph.setEdge(prevNode.id, node.id, {
                label: path.edges[i - 1].id.toString(),
                id: path.edges[i - 1].id,
                neighborEdge: false,
                edge: path.edges[i - 1]
              });
            }
            prevNode = node;
          }
        }
      );
    };

    PathGraphView.prototype.addNeighbor = function (sourceId, neighbor) {
      this.neighbors.push({sourceId: sourceId, neighbor: neighbor});
      this.addNeighborToGraph(sourceId, neighbor);
      this.currentGraphLayout.render(this.paths, this.graph);
    };

    PathGraphView.prototype.addNeighborToGraph = function (sourceId, neighbor) {
      var that = this;
      var sourceNode = this.graph.node(sourceId);

      if (!sourceNode) {
        return;
      }

      if (!this.graph.node(neighbor.id)) {
        that.graph.setNode(neighbor.id, {
          label: neighbor.properties[config.getNodeNameProperty(neighbor)],
          node: neighbor,
          isNeighborNode: true,
          width: config.getNodeWidth(),
          height: config.getNodeHeight()
        });
      }

      var edge = neighbor._edge;
      var exists = that.graph.edge({v: edge.sourceNodeId, w: edge.targetNodeId}) || that.graph.edge({
          v: edge.sourceNodeId, w: edge.targetNodeId
        });

      if (!exists) {
        that.graph.setEdge(edge.sourceNodeId, edge.targetNodeId, {
          label: edge.id.toString(),
          id: edge.id,
          neighborEdge: true,
          edge: edge
          //label: "neighborEdge" + currentNeighborEdgeId,
          //id: "neighborEdge" + currentNeighborEdgeId,
          //neighborEdge: true,
          //edge: {
          //    id: "neighborEdge" + currentNeighborEdgeId,
          //    type: "tempNeighborEdge"
          //}
        });
      }
    };


    PathGraphView.prototype.updateGraph = function () {

      this.graph = newGraph();
      var that = this;
      this.addPathsToGraph(this.paths);
      //this.paths.forEach(function (path) {
      //  //if (!pathQuery.isRemoveFilteredPaths() || !pathQuery.isPathFiltered(path.id)) {
      //    that.addPathsToGraph([path]);
      //  //}
      //});
      this.neighbors.forEach(function (n) {
        that.addNeighborToGraph(n.sourceId, n.neighbor);
      });

      this.currentGraphLayout.render(this.paths, this.graph);
    };

    //PathGraphView.prototype.updateGraphToAllPaths = function () {
    //    var that = this;
    //
    //    this.graph = newGraph();
    //
    //    this.addPathsToGraph(this.paths);
    //    this.neighbors.forEach(function (n) {
    //        that.addNeighborToGraph(n.sourceId, n.neighbor);
    //    });
    //
    //    this.currentGraphLayout.render(this.paths, this.graph);
    //};


    PathGraphView.prototype.removeNeighborNode = function (nodeId) {

      for (var i = 0; i < this.neighbors.length; i++) {
        var n = this.neighbors[i];
        if (n.sourceId === nodeId || n.neighbor.id === nodeId) {
          this.neighbors.splice(i, 1);
          i--;
        }
      }

      this.updateGraph();

    };

    PathGraphView.prototype.removeNeighborsOfNode = function (nodeId) {

      var that = this;
      var neighbors = this.graph.neighbors(nodeId);

      if (neighbors) {
        neighbors.forEach(function (neighborId) {
          var neighborNode = that.graph.node(neighborId);
          if (neighborNode.isNeighborNode) {
            for (var i = 0; i < that.neighbors.length; i++) {
              var n = that.neighbors[i];
              if (n.sourceId.toString() === neighborId.toString() || n.neighbor.id.toString() === neighborId.toString()) {
                that.neighbors.splice(i, 1);
                i--;
              }
            }
          }
        });
      }

      this.updateGraph();

    };

    return new PathGraphView();


  }
)
;
