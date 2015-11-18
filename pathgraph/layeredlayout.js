define(['jquery', 'd3', 'webcola', 'dagre', '../listeners', '../selectionutil', '../list/pathsorting', '../query/pathquery', '../config', '../view', '../pathutil', '../../pathfinder_graph/search', '../uiutil', '../query/queryutil', './neighboredge'],
  function ($, d3, webcola, dagre, listeners, selectionUtil, pathSorting, pathQuery, config, View, pathUtil, ServerSearch, uiUtil, queryUtil, neighborEdgeManager) {
    'use strict';


    function getEdgeKey(d) {
      return d.edge.id;
    }

    function EdgeWrapper(v, w, edge) {
      this.v = v;
      this.w = w;
      this.edge = edge;
    }

    EdgeWrapper.prototype = {};


    function LayeredLayout(view) {
      //View.call(this, "#pathgraph");
      this.grabHSpace = true;
      this.grabVSpace = false;
      this.nodeSelectionListener = 0;
      //unfortunately we need edge wrappers that contain all information
      this.edgeWrappers = [];
      this.view = view;

      this.paths = [];
      //this.graph = newGraph();
    }

    //LayeredGraph.prototype = Object.create(View.prototype);

    LayeredLayout.prototype.getMinSize = function () {
      if (!this.graph || this.graph.nodes().length === 0) {
        return {width: 200, height: 200};
      }

      return {width: Math.max(this.graph.graph().width, 200), height: Math.max(this.graph.graph().height, 200)};
    };

    LayeredLayout.prototype.init = function () {


    };

    LayeredLayout.prototype.onPathSelectionUpdate = function (selectionType) {
      var that = this;
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
          return (typeof selectedNodes[d.node.id] !== "undefined");
        });

      svg.selectAll("g.edgePath path")
        .classed("path_" + selectionType, function (d) {
          return (typeof selectedEdges[d.edge.label] !== "undefined");
        });


    };

    LayeredLayout.prototype.prepareLayoutChange = function () {
      var svg = d3.select("#pathgraph svg");
      svg.select("g.graph").attr("transform", "translate(0,0)");
    };


    LayeredLayout.prototype.centerGraph = function () {
      if (this.graph.nodes().length === 0) {
        return;
      }
      var svg = d3.select("#pathgraph svg");
      var svgWidth = $(svg[0]).width();
      var svgHeight = $(svg[0]).height();
      var graphWidth = this.graph.graph().width;
      var graphHeight = this.graph.graph().height;


      var scale = Math.min(svgWidth / graphWidth, svgHeight / graphHeight);
      scale = scale < 1 ? scale : 1;

      var translateX = ((svgWidth - (graphWidth * scale)) / 2);
      var translateY = ((svgHeight - (graphHeight * scale)) / 2);

      this.view.zoom.translate([translateX, translateY]);
      this.view.zoom.scale(scale);

      svg.select("g.graph").transition()
        .attr("transform", "translate(" + translateX + ", " + translateY + ")scale(" + scale + ")");
    };


    LayeredLayout.prototype.updateFilter = function () {

      var svg = d3.select("#pathgraph svg");
      svg.selectAll("g.node")
        .classed("filtered", function (d) {

          return !d.isNeighborNode && pathQuery.isNodeFiltered(d.node.id);
        });
      //.transition()
      //.style("opacity", function (d) {
      //  return pathQuery.isNodeFiltered(d) ? 0.5 : 1;
      //});

      svg.selectAll("g.edgePath").each(function (d) {
        d3.select(this).select("path.lines")
          .classed("filtered", function (d) {
            return !d.edge.neighborEdge && (pathQuery.isNodeFiltered(d.v) || pathQuery.isNodeFiltered(d.w));
          });

        d3.select(this).select("defs marker path")
          .classed("filtered", function (d) {
            return !d.edge.neighborEdge && (pathQuery.isNodeFiltered(d.v) || pathQuery.isNodeFiltered(d.w));
          });

      });

    };

    LayeredLayout.prototype.render = function (paths, graph) {
      this.paths = paths;
      //if (paths.length > 0) {
      this.graph = graph;
      this.graph.setGraph({
        rankdir: "LR",
        marginx: 10,
        marginy: 10,
        nodesep: 30,
        ranksep: 50
        //edgesep: 0
      });

      var svg = d3.select("#pathgraph svg");
      //this.addPathsToGraph(paths);

      this.renderGraph(svg);

    };


    LayeredLayout.prototype.reset = function () {
      this.paths = [];
      //this.graph = newGraph();
    };

    LayeredLayout.prototype.renderGraph = function (svg) {


      var that = this;

      dagre.layout(this.graph);

      var edgeGroup = svg.select("g.edgeGroup");

      this.edgeWrappers = [];

      that.graph.edges().forEach(function (e) {
        that.edgeWrappers.push(new EdgeWrapper(e.v, e.w, that.graph.edge(e)));
      });


      var allEdges = edgeGroup.selectAll("g.edgePath")
        .data(that.edgeWrappers, getEdgeKey);


      var edge = allEdges
        .enter()
        .append("g")
        .classed("edgePath", true)
        .on("dblclick", function (d) {
          //pathSorting.sortingStrategies.selectionSortingStrategy.setPathIds(selectionUtil.selections["path"]["selected"]);
          pathSorting.addSelectionBasedSortingStrategy(new pathSorting.PathPresenceSortingStrategy(selectionUtil.selections["path"]["selected"]));
          listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);

          //ServerSearch.loadNeighbors(d.node.id, false);
        });

      var line = d3.svg.line()
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .interpolate("basis");

      edge.append("path")
        .style({
          fill: "none",
          "stroke-dasharray": function (d) {
            if (d.edge.neighborEdge) {
              return "1,5";
            }

            return (config.isSetEdgesOnly() || config.isNetworkEdge(d.edge.edge)) ? "0,0" : "10,5";
          }
        })
        .classed("lines", true)
        .attr({
          "marker-end": function (d) {
            return config.isNetworkEdge(d.edge.edge) ? "url(#arrowhead" + d.edge.label + ")" : null;
          }
        });

      edge.append("path")
        .style({fill: "none", opacity: 0, "stroke-width": 8})
        .classed("selectionLines", true);

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
      }


      //<path d="M31.694915254237287,300L80,15L130,15L180,15L205,15"></path>
      //<path class="path" d="M23.52980132450331,307L64,16L113,16L162,16L197,16" marker-end="url(#arrowhead1177)" style="fill: none;"></path>

      allEdges.selectAll("path.lines")
        .data(that.edgeWrappers, getEdgeKey)
        .transition()
        //.each("start", function(d) {
        //  d3.select(this).style("display", "none");
        //})
        //.duration(5000)
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
            return line(d.edge.points);

            //return drawBezierLink2(sourceNode.x + nodeWidth / 2, sourceNode.y, targetNode.x - nodeWidth / 2, targetNode.y);
          }
        });

      allEdges.selectAll("path.selectionLines")
        .data(that.edgeWrappers, getEdgeKey)
        .transition()
        //.each("start", function(d) {
        //  d3.select(this).style("display", "none");
        //})
        //.duration(5000)
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
            return line(d.edge.points);

            //return drawBezierLink2(sourceNode.x + nodeWidth / 2, sourceNode.y, targetNode.x - nodeWidth / 2, targetNode.y);
          }
        });
      //.each("end", function(d) {
      //  d3.select(this).style("display", "inline");
      //});
      //var edgeLines = edge.append("line");
      //.
      //attr("marker-end", "url(#arrowRight)");


      selectionUtil.addDefaultTrigger(edgeGroup.selectAll("g.edgePath"), function (d) {

        var pathIds = [];
        that.paths.forEach(function (path) {
          for (var i = 0; i < path.edges.length; i++) {
            var edge = path.edges[i];
            if (edge.id === d.edge.id) {
              pathIds.push(path.id);
              break;
            }
          }
        });
        return pathIds;
      }, "path");


      allEdges.exit()
        .remove();

      var nodeGroup = svg.select("g.nodeGroup");

      var allNodes = nodeGroup.selectAll("g.node")
        .data(that.graph.nodes().map(function (node) {
          return that.graph.node(node);
        }), function (d) {
          return d.node.id;
        });


      var node = allNodes
        .enter()
        .append("g")
        .classed({
          node: true,
          neighbor: function (d) {
            return d.isNeighborNode;
          }
        })
        .attr("transform", function (d) {
          //var n = that.graph.node(d);
          return "translate(" + d.x + ", " + d.y + ")";
        })
        .on("dblclick", function (d) {
          //pathSorting.sortingStrategies.selectionSortingStrategy.setNodeIds([d.node.id]);
          pathSorting.addSelectionBasedSortingStrategy(new pathSorting.NodePresenceSortingStrategy(selectionUtil.selections["node"]["selected"]));
          listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);

        });

      node.each(function (d) {


        pathUtil.renderNode(d3.select(this), d.node, -d.width / 2, -d.height / 2, d.width, d.height, "url(#graphNodeClipPath)", function (text) {
          return that.view.getTextWidth(text);
        }, getNodeOverlayItems(d), true);
      });


      selectionUtil.removeListeners(that.nodeSelectionListener, "node");
      that.nodeSelectionListener = selectionUtil.addDefaultListener(nodeGroup, "g.node", function (d) {
          return d.node.id;
        },
        "node"
      );

      allNodes
        .classed({
          node: true,
          neighbor: function (d) {
            return d.isNeighborNode;
          }
        })
        .transition()
        //.duration(5000)
        .attr("transform", function (d) {
          //var n = that.graph.node(d);
          return "translate(" + d.x + ", " + d.y + ")";
        })
        .each(function (d) {
          pathUtil.updateNode(d3.select(this), d.node, -d.width / 2, -d.height / 2, d.width, d.height, function (text) {
            return that.view.getTextWidth(text);
          }, getNodeOverlayItems(d));
        });


      allNodes.exit()
        .remove();

      this.updateFilter();

      //this.view.updateViewSize();
      this.centerGraph();

      function getNodeOverlayItems(d) {
        var items = pathUtil.getDefaultNodeOverlayItems(d.node);
        items.push({
          text: "Add Neighbors",
          icon: "\uf067",
          callback: function () {
            ServerSearch.loadNeighbors(d.node.id, config.getUseCase() !== "dblp");
          }
        });
        items.push({
          text: d.isNeighborNode ? "Remove" : "Remove Neighbors",
          icon: "\uf068",
          callback: function () {
            if (d.isNeighborNode) {
              that.view.removeNeighborNode(d.node.id);
            } else {
              that.view.removeNeighborsOfNode(d.node.id);
            }
          }
        });
        return items;
      }

    };

    return LayeredLayout;


  }
)
;
