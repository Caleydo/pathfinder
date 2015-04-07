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


      //this.force = d3.layout.force()
      //  .linkDistance(100)
      //  .charge(-1000)
      //  .size([w, h]);
      //
      var that = this;
      //
      //var tick = function () {
      //
      //  that.graph.nodes.forEach(function (node) {
      //
      //    if (node.fixed) {
      //      node.x++;
      //    }
      //
      //
      //    if (node.x + nodeWidth / 2 > w) {
      //      node.x = w - nodeWidth / 2;
      //    }
      //    if (node.y + nodeHeight / 2 > h) {
      //      node.y = h - nodeHeight / 2;
      //    }
      //    if (node.x - nodeWidth / 2 < 0) {
      //      node.x = nodeWidth / 2;
      //    }
      //    if (node.y - nodeHeight / 2 < 0) {
      //      node.y = nodeHeight / 2;
      //    }
      //  });
      //
      //  //allGroups.selectAll("rect").attr("x", function (d) {
      //  //  return d.bounds.x;
      //  //})
      //  //  .attr("y", function (d) {
      //  //    return d.bounds.y;
      //  //  })
      //  //  .attr("width", function (d) {
      //  //    return d.bounds.width();
      //  //  })
      //  //  .attr("height", function (d) {
      //  //    return d.bounds.height();
      //  //  });
      //
      //  var nodeGroup = d3.select("#pathgraph svg g.nodeGroup");
      //
      //  var allNodeRects = nodeGroup.selectAll("g.node rect").data(that.graph.nodes, function (node) {
      //    return node.id;
      //  });
      //
      //  allNodeRects
      //    .attr("x", function (d) {
      //      return d.x - nodeWidth / 2;
      //      //}
      //    })
      //    .attr("y", function (d) {
      //      return d.y - nodeHeight / 2;
      //
      //    });
      //
      //  var allNodeTexts = nodeGroup.selectAll("g.node text").data(that.graph.nodes, function (node) {
      //    return node.id;
      //  });
      //
      //  allNodeTexts
      //    .attr("x", function (d) {
      //      return d.x;
      //    })
      //    .attr("y", function (d) {
      //      return d.y + 5;
      //    });
      //
      //  var edgeGroup = d3.select("#pathgraph svg g.edgeGroup");
      //
      //  var allEdges = edgeGroup.selectAll("g.edge line").data(that.graph.edges, function (edge) {
      //    return edge.edge.id;
      //  });
      //
      //  allEdges
      //    .attr("x1", function (d) {
      //      return calcIntersectionX(d.source, d.target, nodeWidth, nodeHeight);
      //    })
      //    .attr("y1", function (d) {
      //      return calcIntersectionY(d.source, d.target, nodeWidth, nodeHeight);
      //    })
      //    .attr("x2", function (d) {
      //      return calcIntersectionX(d.target, d.source, nodeWidth, nodeHeight);
      //    })
      //    .attr("y2", function (d) {
      //      return calcIntersectionY(d.target, d.source, nodeWidth, nodeHeight);
      //    });
      //};
      //
      //this.force.on("tick", tick);

      //webcola.d3adaptor()
      //.convergenceThreshold(0.1)
      //.avoidOverlaps(true)
      //.flowLayout('x', 50)
      //.size([w, h])
      //.jaccardLinkLengths(100);

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


        //
        //svg.selectAll("g.nodeGroup").selectAll("g.node")
        //  .classed("path_" + selectionType, function (d) {
        //    for (var nodeIndex = 0; nodeIndex < selectedNodes.length; nodeIndex++) {
        //      if (d.id === selectedNodes[nodeIndex].id) {
        //        return true;
        //      }
        //    }
        //    return false;
        //  });
        //
        //svg.selectAll("g.edgeGroup").selectAll("g.edge")
        //  .classed("path_" + selectionType, function (d) {
        //    for (var edgeIndex = 0; edgeIndex < selectedEdges.length; edgeIndex++) {
        //      if (d.edge.id === selectedEdges[edgeIndex].id) {
        //        return true;
        //      }
        //    }
        //    return false;
        //  });
        //
        //if (selectionType === "selected") {
        //  that.fixPath(lastPath);
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
              that.graph.setEdge(prevNode.id, node.id, {});
            }
            prevNode = node;
          });

          //path.edges.forEach(function (edge) {
          //
          //  that.graph.setEdge(edge.sourceNodeId, edge.targetNodeId, {});
          //
          //  //var e = that.edgeMap[edge.id.toString()];
          //  //
          //  //if (typeof e == "undefined") {
          //  //
          //  //  var sourceNodeIndex = that.nodeIndexMap[edge.sourceNodeId];
          //  //  if (typeof sourceNodeIndex != "undefined") {
          //  //
          //  //    var targetNodeIndex = that.nodeIndexMap[edge.targetNodeId];
          //  //    if (typeof targetNodeIndex != "undefined") {
          //  //      that.edgeMap[edge.id.toString()] = edge;
          //  //      that.graph.edges.push({
          //  //        source: sourceNodeIndex,
          //  //        target: targetNodeIndex,
          //  //        edge: edge
          //  //      });
          //  //    }
          //  //  }
          //  //}
          //});

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
      //.style("opacity", function (d) {
      //  return pathQuery.isNodeFiltered(d.v) ||  pathQuery.isNodeFiltered(d.w) ? 0.5 : 1;
      //});

      //svg.selectAll("g.edge")
      //  .transition()
      //  .style("opacity", function (d) {
      //    return pathQuery.isEdgeFiltered(d.edge.id) ? 0.5 : 1;
      //  });

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
//        svg.attr('height', g.graph().height * initialScale + 40);


      ////var force = cola.d3adaptor()
      ////  .linkDistance(100)
      ////  .avoidOverlaps(true)
      ////  .handleDisconnected(false)
      ////  .size([w, h]);
      //
      //
      //that.force
      //  .nodes(that.graph.nodes)
      //  .links(that.graph.edges)
      //  //.groups(that.graph.groups)
      //  //.constraints([{
      //  //  type: "alignment",
      //  //  axis: "y",
      //  //  offsets: [{
      //  //    node: 0, offset: 0
      //  //  },
      //  //    {
      //  //      node: 1, offset: 0
      //  //    },
      //  //    {
      //  //      node: 2, offset: 0
      //  //    }]
      //  //}, {axis: "x", left: 0, right: 1, gap: 100, equality:true},
      //  //  {axis: "x", left: 1, right: 2, gap: 100, equality:true}
      //  //])
      //  .start();
      //
      ////var allGroups = svg.selectAll(".group")
      ////  .data(that.graph.groups);
      ////
      ////var group = allGroups
      ////  .enter().append("rect")
      ////  .attr("rx", 8).attr("ry", 8)
      ////  .attr("class", "group")
      ////  .style("fill", "rgb(255,0,0)");
      //
      //var edgeGroup = svg.select("g.edgeGroup");
      //
      //var allEdges = edgeGroup.selectAll("g.edge")
      //  .data(that.graph.edges, function (edge) {
      //    return edge.edge.id;
      //  });
      //
      //allEdges.exit()
      //  .remove();
      //
      //var edge = allEdges
      //  .enter()
      //  .append("g")
      //  .attr("class", "edge")
      //  .style("opacity", function (d) {
      //    return pathQuery.isEdgeFiltered(d.edge.id) ? 0.5 : 1;
      //  });
      //
      //var edgeLines = edge.append("line");
      ////.attr("marker-end", "url(#arrowRight)");
      //
      //var nodeGroup = svg.select("g.nodeGroup");
      //
      //var allNodes = nodeGroup.selectAll("g.node")
      //  .data(that.graph.nodes, function (node) {
      //    return node.id;
      //  });
      //
      //allNodes.exit()
      //  .remove();
      //
      //var node = allNodes
      //  .enter()
      //  .append("g")
      //  .attr("class", function (d) {
      //    return "node " + (d.fixed ? ("fixed") : "");
      //  })
      //
      //  .style("opacity", function (d) {
      //    return pathQuery.isNodeFiltered(d.id) ? 0.5 : 1;
      //  });
      //

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
      //
      //var nodeRects = node.append("rect")
      //  .attr("rx", 5).attr("ry", 5)
      //  .attr("width", nodeWidth)
      //  .attr("height", nodeHeight);
      //
      //var nodeTexts = node.append("text")
      //  .text(function (d) {
      //    var text = d.properties[config.getNodeNameProperty(d)];
      //    if (text.length > 7) {
      //      text = text.substring(0, 7);
      //    }
      //    return text;
      //  });


    };


    return new PathGraphView();


  }
)
;
