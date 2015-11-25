define(['jquery', 'd3', 'webcola', 'dagre', '../listeners', '../selectionutil', '../list/pathsorting', '../query/pathquery', '../config', '../view', './forcelayout', './layeredlayout', '../list/path/pathdata'],
  function ($, d3, webcola, dagre, listeners, selectionUtil, pathSorting, pathQuery, config, View, ForceLayout, LayeredLayout, pathData) {
    'use strict';


    function newGraph() {
      return new dagre.graphlib.Graph();
    }

    function PathGraphView() {
      //View.call(this, "#pathgraph");
      this.grabHSpace = true;
      this.grabVSpace = true;
      this.layeredLayout = new LayeredLayout(this);
      this.forceLayout = new ForceLayout(this);
      this.paths = [];
      this.currentGraphLayout = this.layeredLayout;
      this.neighbors = [];
      this.neighborCache = {};
      this.graph = newGraph();
      this.showAllPaths = false;
      this.shownLinks = [];
      this.shownLinkSources = {};
    }

    //PathGraphView.prototype = Object.create(View.prototype);


    PathGraphView.prototype.init = function () {

      //View.prototype.init.call(this);
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

      var svg = d3.select("#pathgraph").append("svg")
        .attr({
          width: "100%",
          height: "100%"
        })
        .style({
          "-webkit-flex": "1 0 auto",
          flex: "1 0 auto"
        });

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

      var isDrag = false;
      svg.append("rect")
        .classed("background", true)
        .attr({
          x: 0, y: 0, width: "100%", height: "100%",
          fill: "rgba(0,0,0,0)"
        })
        .on("mousedown", function(){
          isDrag = false;
        })
        .on("mousemove", function(){
          isDrag = true;
        })
        .on("mouseup", function () {
          if (!isDrag && that.shownLinks.length > 0) {
            that.clearLinks();
            that.currentGraphLayout.render(that.paths, that.graph);
          }
        });

      var graphGroup = svg.append("g")
        .attr("class", "graph");

      graphGroup.append("g")
        .classed("edgeGroup", true);
      graphGroup.append("g")
        .classed("nodeGroup", true);


      this.zoom = d3.behavior.zoom()
        .scaleExtent([0.1, 1])
        .on("zoom", function () {
          svg.select("g.graph").attr("transform", "translate(" + that.zoom.translate() + ")scale(" + that.zoom.scale() + ")");
        });

      svg.call(this.zoom);

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

      listeners.add(function () {
        svg.select("#graphNodeClipPath rect")
          .attr({
            x: -config.getNodeWidth() / 2 + 3,
            width: config.getNodeWidth() - 6
          });
        that.updateGraph();
      }, config.NODE_SIZE_UPDATE);


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
        that.currentGraphLayout.render(that.paths, that.graph, true);
        //that.updateViewSize();
      });

      $("#forceLayout").on("click", function () {
        //that.currentGraphLayout.reset();
        that.currentGraphLayout.prepareLayoutChange();
        that.currentGraphLayout = that.forceLayout;
        //that.render(that.paths);
        that.currentGraphLayout.render(that.paths, that.graph);
        //that.updateViewSize();
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

    PathGraphView.prototype.addLink = function (sourceId, neighbors) {

      var that = this;

      if (that.neighborCache[sourceId]) {
        //already added
        return;
      }

      that.neighborCache[sourceId] = neighbors;
      //neighbors.forEach(function (neighbor) {
      //  if (!that.neighborCache[sourceId]) {
      //    that.neighborCache[sourceId] = [];
      //  }
      //
      //});

      this.showLinksOfNode(sourceId);
      this.currentGraphLayout.render(this.paths, this.graph);
    };

    PathGraphView.prototype.showLinksOfNode = function (sourceId) {

      var that = this;

      var neighbors = this.neighborCache[sourceId];

      if (!neighbors || neighbors.length === 0) {
        return;
      }

      that.shownLinkSources[sourceId] = sourceId;

      var sourceNode = this.graph.node(sourceId);
      if (!sourceNode) {
        return;
      }

      neighbors.forEach(function (neighbor) {
        var targetNode = that.graph.node(neighbor.id);

        if (!targetNode) {
          return;
        }

        var edge = neighbor._edge;
        var e = that.graph.edge({v: edge.sourceNodeId, w: edge.targetNodeId}) || that.graph.edge({
            v: edge.targetNodeId, w: edge.sourceNodeId
          });
        var add = true;

        //FIXME not generic at all
        var isNetworkEdge = config.getUseCase() !== "dblp"; //config.isNetworkEdge(edge)

        if (e) {


          add = (isNetworkEdge && edge.id !== e.edge.id);
        }

        if (add) {

          for (var i = 0; i < that.shownLinks.length; i++) {
            var link = that.shownLinks[i];
            if ((link.sourceNodeId === edge.sourceNodeId && link.targetNodeId === edge.targetNodeId) ||
              (link.targetNodeId === edge.sourceNodeId && link.sourceNodeId === edge.targetNodeId)) {
              if (isNetworkEdge && edge.id !== e.edge.id) {
                return;
              }
            }
          }
          that.shownLinks.push(edge);
        }
      });
    };

    PathGraphView.prototype.clearLinks = function () {
      this.shownLinks = [];
      this.shownLinkSources = {};
    };

    PathGraphView.prototype.addNeighbor = function (sourceId, neighbors) {
      var that = this;
      if (that.neighborCache[sourceId]) {
        //already added
        return;
      }

      that.neighborCache[sourceId] = neighbors;
      neighbors.forEach(function (neighbor) {
        //if (!that.neighborCache[sourceId]) {
        //  that.neighborCache[sourceId] = [];
        //}
        //that.neighborCache[sourceId].push(sourceId);
        that.neighbors.push({sourceId: sourceId, neighbor: neighbor});
        that.addNeighborToGraph(sourceId, neighbor);
      });

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

      this.addEdge(neighbor._edge);

    };

    PathGraphView.prototype.addEdge = function (edge) {
      var that = this;
      var exists = that.graph.edge({v: edge.sourceNodeId, w: edge.targetNodeId}) || that.graph.edge({
          v: edge.targetNodeId, w: edge.sourceNodeId
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

      this.shownLinks = [];
      Object.keys(this.shownLinkSources).forEach(function (key) {
        that.showLinksOfNode(that.shownLinkSources[key]);
      });

      this.currentGraphLayout.render(this.paths, this.graph, true);
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
