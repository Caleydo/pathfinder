define(['jquery', 'd3', 'webcola', 'dagre', '../listeners', '../selectionutil', '../list/pathsorting', '../query/pathquery', '../config', '../view'],
  function ($, d3, webcola, dagre, listeners, selectionUtil, pathSorting, pathQuery, config, View) {
    'use strict';

    var w = 800;
    var h = 700;

    var sideSpacing = 10;
    //var arrowWidth = 7;
    var nodeWidth = 50;
    var nodeHeight = 20;

    function getEdgeKey(d) {
      return d.edge.label;
    }

    function EdgeWrapper(v, w, edge) {
      this.v = v;
      this.w = w;
      this.edge = edge;
    }

    EdgeWrapper.prototype = {};

    function newGraph() {
      return new dagre.graphlib.Graph().setGraph({
        rankdir: "LR",
        marginx: 10,
        marginy: 10,
        nodesep: 30,
        ranksep: 50
        //edgesep: 0
      });
    }

    function PathGraphView() {
      View.call(this, "#pathgraph");
      this.grabHSpace = true;
      this.grabVSpace = false;
      this.nodeSelectionListener = 0;
      //unfortunately we need edge wrappers that contain all information
      this.edgeWrappers = [];

      this.paths = [];
      this.graph = newGraph();
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

      nodeWidth = config.getNodeWidth();
      nodeHeight = config.getNodeHeight();

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


      var graphGroup = svg.append("g")
        .attr("class", "graph");

      graphGroup.append("g")
        .classed("edgeGroup", true);
      graphGroup.append("g")
        .classed("nodeGroup", true);


      $(window).on('resize.center', function (e) {
        that.centerGraph();
      });

      var that = this;

      selectionUtil.addListener("path", function (selectionType) {
        var selectedIds = (selectionUtil.selections["path"])[selectionType];
        var selected = false;

        var selectedNodes = {};
        var selectedEdges = {};
        selectedIds.forEach(function (pathId) {

          for (var i = 0; i < that.paths.length; i++) {
            var path = that.paths[i];
            if (path.id === pathId) {
              path.nodes.forEach(function (node) {
                selectedNodes[node.id.toString()] = true;
              });
              path.edges.forEach(function (edge) {
                selectedEdges[edge.id.toString()] = true;
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
            return (typeof selectedEdges[d.edge.label] !== "undefined");
          });

        //if (selectionType === "selected") {
        //  that.graph.edges().forEach(function (e) {
        //    var edge = that.graph.edge(e);
        //    if (typeof selectedEdges[edge.label] !== "undefined") {
        //      that.setEdge(e.v, e.w, edge.label, edge, 1000);
        //    } else {
        //      that.setEdge(e.v, e.w, edge.label, edge, 1);
        //    }
        //  });
        //  console.log("-----------------------------------------");
        //  that.graph.edges().forEach(function (e) {
        //    console.log("Edge " + e.v + " -> " + e.w + ": " + JSON.stringify(that.graph.edge(e)));
        //  });
        //
        //
        //  that.renderGraph(svg);
        //}

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

    PathGraphView.prototype.getTextWidth = function (string) {

      this.textSizeDomElement
        .text(string);

      return this.textSizeDomElement.node().getBBox().width;
    };

    //PathGraphView.prototype.setEdge = function (v, w, label, edge, weight) {
    //
    //  this.graph.setEdge(v, w, {
    //    label: label,
    //    edge: edge,
    //    weight: weight
    //  });
    //
    //}

    PathGraphView.prototype.addPathsToGraph = function (paths) {

      var that = this;


      paths.forEach(function (path) {
          var prevNode = 0;

          for (var i = 0; i < path.nodes.length; i++) {
            var node = path.nodes[i];
            that.graph.setNode(node.id, {
              label: node.properties[config.getNodeNameProperty(node)],
              node: node,
              width: nodeWidth,
              height: nodeHeight

            });
            if (prevNode !== 0) {
              that.graph.setEdge(prevNode.id, node.id, {
                label: path.edges[i - 1].id.toString(),
                edge: path.edges[i - 1]
              });
            }
            prevNode = node;
          }


        }
      );
    };

    PathGraphView.prototype.centerGraph = function () {
      if (this.graph.nodes().length === 0) {
        return;
      }
      var svg = d3.select("#pathgraph svg");
      var svgWidth = $(svg[0]).width();
      var svgHeight = $(svg[0]).height();
      var graphWidth = this.graph.graph().width;
      var graphHeight = this.graph.graph().height;
      svg.select("g.graph").attr("transform", "translate(" + ((svgWidth - graphWidth) / 2) + ", " + ((svgHeight - graphHeight) / 2) + ")");
    };


    PathGraphView.prototype.updateGraphToFilteredPaths = function () {

      this.graph = newGraph();

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

      this.graph = newGraph();

      that.addPathsToGraph(this.paths);

      this.renderGraph(d3.select("#pathgraph svg"));
    };


    PathGraphView.prototype.updateFilter = function () {

      var svg = d3.select("#pathgraph svg");
      svg.selectAll("g.node")
        .classed("filtered", function (d) {
          return pathQuery.isNodeFiltered(d);
        });
      //.transition()
      //.style("opacity", function (d) {
      //  return pathQuery.isNodeFiltered(d) ? 0.5 : 1;
      //});

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

      var graphGroup = svg.append("g")
        .attr("class", "graph");


      graphGroup.append("g")
        .classed("edgeGroup", true);
      graphGroup.append("g")
        .classed("nodeGroup", true);

      this.paths = [];
      this.graph = newGraph();
    };

    PathGraphView.prototype.renderGraph = function (svg) {


      var that = this;

      dagre.layout(this.graph);

      var edgeGroup = svg.select("g.edgeGroup");

      this.edgeWrappers = [];

      that.graph.edges().forEach(function (e) {
        that.edgeWrappers.push(new EdgeWrapper(e.v, e.w, that.graph.edge(e)));
      });


      var allEdges = edgeGroup.selectAll("g.edgePath")
        .data(that.edgeWrappers, getEdgeKey);

      allEdges.exit()
        .remove();

      var edge = allEdges
        .enter()
        .append("g")
        .classed("edgePath", true);

      var line = d3.svg.line()
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .interpolate("basis");

      edge.append("path")
        .style({fill: "none"})
        .classed("lines", true)
        .attr({
          "marker-end": function (d) {
            return "url(#arrowhead" + d.edge.label + ")"
          }
        });

      //<marker id="arrowhead1177" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="strokeWidth" markerWidth="8" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" style="stroke-width: 1px; stroke-dasharray: 1px, 0px;"></path></marker>

      edge.append("defs")
        .append("marker")
        .attr("id", function (d) {
          return "arrowhead" + d.edge.label;
        })
        .attr("viewBox", "0 0 10 10")
        .attr("refX", "9")
        .attr("refY", "5")
        .attr("markerUnits", "strokeWidth")
        .attr("markerWidth", "8")
        .attr("markerHeight", "6")
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z");


      /**
       * Path generator for bezier link.
       * @param srcX Source x coordinate.
       * @param srcY Source y coordinate.
       * @param tarX Target x coordinate.
       * @param tarY Target y coordinate.
       * @returns {*} Path for link.
       */
      function drawBezierLink2(srcX, srcY, tarX, tarY) {
        var pathSegment = "M" + srcX + "," + srcY;

        var width = 50;

        //if (tarX - srcX > 50) {
        pathSegment = pathSegment.concat(" H" + (tarX - width) + " Q" + ((tarX - width) + width / 3) + "," + (srcY) + " " +
        ((tarX - width) + width / 2) + "," + (srcY + (tarY - srcY) / 2) + " " +
        "T" + (tarX) + "," + tarY);
        //} else {
        //  pathSegment = pathSegment.concat(" C" + (srcX + width) + "," + (srcY) + " " +
        //  (tarX - width) + "," + (tarY) + " " +
        //  (tarX) + "," + (tarY) + " ");
        //}

        return pathSegment;
      };


      //<path d="M31.694915254237287,300L80,15L130,15L180,15L205,15"></path>
      //<path class="path" d="M23.52980132450331,307L64,16L113,16L162,16L197,16" marker-end="url(#arrowhead1177)" style="fill: none;"></path>

      allEdges.selectAll("path.lines")
        .data(that.edgeWrappers, getEdgeKey)
        .transition()
        .attr({
          d: function (d) {
            //var points = Object.create(d.edge.points);
            //points.splice(0, 1);
            //points.splice(points.length - 1, 1);
            var sourceNode = that.graph.node(d.v);
            var targetNode = that.graph.node(d.w);
            //
            //points.splice(0, 0, {x: sourceNode.x + nodeWidth / 2, y: sourceNode.y});
            //points.splice(1, 0, {x: sourceNode.x + nodeWidth / 2 + 20, y: sourceNode.y});
            //
            //
            //points.push({x: targetNode.x - nodeWidth / 2 - 20, y: targetNode.y});
            //points.push({x: targetNode.x - nodeWidth / 2, y: targetNode.y});
            //
            //return line(points);
            //return line(d.edge.points);

            return drawBezierLink2(sourceNode.x + nodeWidth / 2, sourceNode.y, targetNode.x - nodeWidth / 2, targetNode.y);
          }
        });
      //var edgeLines = edge.append("line");
      //.
      //attr("marker-end", "url(#arrowRight)");

      var nodeGroup = svg.select("g.nodeGroup");

      var allNodes = nodeGroup.selectAll("g.node")
        .data(that.graph.nodes(), function (node) {
          return node;
        });


      allNodes.exit()
        .remove();

      var node = allNodes
        .enter()
        .append("g")
        .classed("node", true)
        .attr("transform", function (d) {
          var n = that.graph.node(d);
          return "translate(" + n.x + ", " + n.y + ")";
        })
        .on("dblclick", function (d) {
          pathSorting.sortingStrategies.selectionSortingStrategy.setNodeIds([d]);
          //pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getNodePresenceStrategy([d]));
          listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
        });

      selectionUtil.removeListeners(that.nodeSelectionListener, "node");
      that.nodeSelectionListener = selectionUtil.addDefaultListener(nodeGroup, "g.node", function (d) {
          return d;
        },
        "node"
      );

      allNodes.transition()
        .attr("transform", function (d) {
          var n = that.graph.node(d);
          return "translate(" + n.x + ", " + n.y + ")";
        });

      var nodeRects = node.append("rect")
        .attr({
          rx: 5,
          ry: 5,
          x: -nodeWidth / 2,
          y: -nodeHeight / 2,
          width: function (d) {
            return that.graph.node(d).width;
          },
          height: function (d) {
            return that.graph.node(d).height;
          }
        });

      var nodeTexts = node.append("text")
        .attr({
          x: function (d) {
            var node = that.graph.node(d).node;
            var text = node.properties[config.getNodeNameProperty(node)];
            var width = that.getTextWidth(text);
            return Math.max(-width / 2, -nodeWidth / 2 + 3);
          },
          y: nodeHeight / 2 - 5,

          "clip-path": "url(#graphNodeClipPath)"
        })
        .text(function (d) {
          var node = that.graph.node(d).node;
          var text = node.properties[config.getNodeNameProperty(node)];
          //if (text.length > 7) {
          //  text = text.substring(0, 7);
          //}
          return text;
        });

      node.append("title")
        .text(function (d) {
          var node = that.graph.node(d).node;
          return node.properties[config.getNodeNameProperty(node)];
        });

      this.updateFilter();

      this.updateViewSize();
      this.centerGraph();

      //inner.selectAll("g.node")
      //  .on("dblclick", function (d) {
      //    pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getNodePresenceStrategy([d]));
      //    listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
      //  });
      //selectionUtil.addDefaultListener(inner, "g.node", function (d) {
      //    return d;
      //  },
      //  "node"
      //);


    };


    return new PathGraphView();


  }
)
;
