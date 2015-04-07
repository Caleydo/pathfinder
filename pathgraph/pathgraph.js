define(['jquery', 'd3', 'webcola', 'dagre-d3', '../listeners', '../selectionutil', '../list/pathsorting', '../query/pathquery', '../config'],
  function ($, d3, webcola, dagreD3, listeners, selectionUtil, pathSorting, pathQuery, config) {
    'use strict';

    var w = 800;
    var h = 700;

    var sideSpacing = 10;
    //var arrowWidth = 7;
    var nodeWidth = 50;
    var nodeHeight = 20;



    return {

      nodeIndex: 0,
      paths: [],
      nodeIndexMap: {},
      edgeMap: {},
      graph: new dagreD3.graphlib.Graph().setGraph({
        rankdir: "LR"
      }),


      init: function () {

        var svg = d3.select("#pathgraph").append("svg")
        svg.attr("width", w)
          .attr("height", h);
        svg.append("marker")
          .attr("id", "arrowRight")
          .attr("viewBox", "0 0 10 10")
          .attr("refX", "0")
          .attr("refY", "5")
          .attr("markerUnits", "strokeWidth")
          .attr("markerWidth", "4")
          .attr("markerHeight", "3")
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M 0 0 L 10 5 L 0 10 z");

        svg.append("g")
          .attr("class", "graph");


        //------------------


        //-------------------


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
          //var selectedIds = (selectionUtil.selections["path"])[selectionType];
          //var selected = false;
          //
          //var selectedNodes = [];
          //var selectedEdges = [];
          //var lastPath = {};
          //selectedIds.forEach(function (pathId) {
          //
          //  for (var i = 0; i < that.paths.length; i++) {
          //    lastPath = that.paths[i];
          //    if (lastPath.id === pathId) {
          //      selectedNodes = selectedNodes.concat(lastPath.nodes);
          //      selectedEdges = selectedEdges.concat(lastPath.edges);
          //      break;
          //    }
          //  }
          //});
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

      },

      addPathsToGraph: function (paths) {

        var nodeMap = {};
        var nodeList = [];

        var edgeMap = {};
        var edgeList = [];
        var that = this;


        paths.forEach(function (path) {
            var prevNode = 0;
            path.nodes.forEach(function (node) {
              that.graph.setNode(node.id, {
                label: node.properties[config.getNodeNameProperty(node)],
                node: node,
                padding: 5

              })
              if(prevNode !== 0) {
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
      },

      fixPath: function (path) {

        //if (typeof path.nodes === "undefined") {
        //  return;
        //}
        //
        //var that = this;
        //var nodeStep = (w - 2 * (sideSpacing + nodeWidth / 2)) / (path.nodes.length - 1);
        //var posX = sideSpacing + nodeWidth / 2;
        //var posY = h / 2;
        //var svg = d3.select("#pathgraph svg");
        //
        //this.graph.nodes.forEach(function (node) {
        //  //if (node.fixed === true) {
        //  delete node.parent;
        //  //}
        //  //delete node.x;
        //  //delete node.y;
        //  //delete node.px;
        //  //delete node.py;
        //  node.fixed = false;
        //});
        //
        ////var nodeRangeDict = {};
        //
        //
        ////for (var i = 0; i <= 100; i++) {
        ////
        ////  var scale = i / 100;
        //
        //var fixedNodes = [];
        //
        ////var pathAlignmentConstraint = {
        ////  type: "alignment",
        ////  axis: "y",
        ////  offsets: []
        ////};
        ////
        ////var constraints = [pathAlignmentConstraint];
        //
        //
        //path.nodes.forEach(function (fixedNode) {
        //
        //  for (var i = 0; i < that.graph.nodes.length; i++) {
        //
        //    var node = that.graph.nodes[i];
        //    if (node.id == fixedNode.id) {
        //
        //      //if (i === 0) {
        //      //  nodeRangeDict[node.id.toString()] = {startX: node.x, endX: posX, startY: node.y, endY: posY};
        //      //  node.fixed = true;
        //      //  posX += nodeStep;
        //      //} else {
        //      //
        //      //  var ranges = nodeRangeDict[node.id.toString()];
        //      //
        //      //  var vX = ranges.startX + scale * (ranges.endX - ranges.startX);
        //      //  node.x = vX;
        //      //  node.px = vX;
        //      //  //delete node.px;
        //      //  var vY = ranges.startY + scale * (ranges.endY - ranges.startY);
        //      //  node.y = vY;
        //      //  node.py = vY;
        //
        //      node.x = posX;
        //      node.px = posX;
        //      //delete node.px;
        //      node.y = posY;
        //      node.py = posY;
        //      node.fixed = true;
        //      posX += nodeStep;
        //
        //      fixedNodes.push(i);
        //      //pathAlignmentConstraint.offsets.push({
        //      //  node: i, offset: 0
        //      //});
        //
        //      //if(fixedNodes.length >=2) {
        //      //  constraints.push({axis: "x", left: fixedNodes[fixedNodes.length-2], right: fixedNodes[fixedNodes.length-1], gap: 300, equality:true})
        //      //}
        //      //delete node.py;
        //
        //    }
        //  }
        //});
        ////tick();
        ////}
        ////this.graph.groups = [
        ////  {"leaves": fixedNodes}];
        //
        //
        //this.force
        //  .nodes(that.graph.nodes)
        //  .links(that.graph.edges)
        //  //.groups(that.graph.groups)
        //  //.constraints(constraints)
        //  .start();
        //
        ////svg.selectAll(".group")
        ////  .data(that.graph.groups);
        //svg.selectAll("g.edgeGroup").selectAll("g.edge")
        //  .data(that.graph.edges, function (edge) {
        //    return edge.edge.id;
        //  });
        //
        //svg.selectAll("g.nodeGroup").selectAll("g.node")
        //  .data(that.graph.nodes, function (node) {
        //    return node.id;
        //  })
        //  .classed("fixed", function (d) {
        //    return d.fixed
        //  });
        ////nodeGroup.selectAll("g.node")
        //
        ////for(var i = 0; i < 200; i++) tick();
        ////force.stop();

      },

      updateGraphToFilteredPaths: function () {

        //this.graph = {nodes: [], edges: [], groups: []};
        //this.nodeIndexMap = {};
        //this.edgeMap = {};
        //this.nodeIndex = 0;
        //var that = this;
        //
        //if(pathQuery.isRemoteQuery()) {
        //  for(var i = 0; i < this.paths.length; i++) {
        //    var path = this.paths[i];
        //    if (pathQuery.isPathFiltered(path.id)) {
        //      this.paths.splice(i, 1);
        //      i--;
        //    }
        //  }
        //}
        //
        //this.paths.forEach(function (path) {
        //  if (!pathQuery.isPathFiltered(path.id)) {
        //    that.addPathsToGraph([path]);
        //  }
        //});
        //
        //this.renderGraph(d3.select("#pathgraph svg"));
      },

      updateGraphToAllPaths: function () {
        //this.graph = {nodes: [], edges: [], groups: []};
        //this.nodeIndexMap = {};
        //this.edgeMap = {};
        //this.nodeIndex = 0;
        //var that = this;
        //
        //that.addPathsToGraph(this.paths);
        //
        //this.renderGraph(d3.select("#pathgraph svg"));
      },


      updateFilter: function () {

        //var svg = d3.select("#pathgraph svg");
        //svg.selectAll("g.node")
        //  .transition()
        //  .style("opacity", function (d) {
        //    return pathQuery.isNodeFiltered(d.id) ? 0.5 : 1;
        //  });
        //
        //svg.selectAll("g.edge")
        //  .transition()
        //  .style("opacity", function (d) {
        //    return pathQuery.isEdgeFiltered(d.edge.id) ? 0.5 : 1;
        //  });

      },

      render: function (paths) {
        //this.paths = paths;
        ////if (paths.length > 0) {
        //
        //var svg = d3.select("#pathgraph svg");
        //this.addPathsToGraph(paths);
        //
        //this.renderGraph(svg);
        //}
      }
      ,

      addPath: function (path) {
        this.paths.push(path);
        var svg = d3.select("#pathgraph svg");
        this.addPathsToGraph([path]);

        this.renderGraph(svg);
      }
      ,

      reset: function () {
        var svg = d3.select("#pathgraph svg");

        svg.selectAll("g.edgeGroup")
          .remove();
        svg.selectAll("g.nodeGroup")
          .remove();
        svg.append("g")
          .attr("class", "edgeGroup");
        svg.append("g")
          .attr("class", "nodeGroup");

        this.paths = [];
        //this.graph = {nodes: [], edges: [], groups: []};
        this.nodeIndexMap = {};
        this.edgeMap = {};
        this.nodeIndex = 0;
      }
      ,

      renderGraph: function (svg) {


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
        inner.attr("transform", "translate(" + ((svg.attr("width") - this.graph.graph().width) / 2) + ", " + ((svg.attr("height") - this.graph.graph().height) / 2) + ")");
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
          })
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


      }


    }


  }
)
;
