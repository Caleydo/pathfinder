define(['jquery', 'd3', 'webcola', 'dagre-d3', '../listeners', '../selectionutil', '../list/pathsorting', '../query/pathquery', '../config'],
  function ($, d3, webcola, dagreD3, listeners, selectionUtil, pathSorting, pathQuery, config) {
    'use strict';

    //var w = 800;
    //var h = 700;
    //
    var sideSpacing = 10;
    ////var arrowWidth = 7;
    //var nodeWidth = 50;
    //var nodeHeight = 20;


    function calcIntersectionX(source, target, nodeWidth, nodeHeight) {
      if (source.x === target.x) {
        return source.x;
      } else if (source.y === target.y) {
        if (source.x < target.x) {
          return source.x + nodeWidth / 2;
        } else {
          return source.x - nodeWidth / 2;
        }
      }

      var vector = {x: target.x - source.x, y: target.y - source.y};

      var vecRatio = Math.abs(vector.x / vector.y);
      var boxRatio = nodeWidth / nodeHeight;

      if (source.x < target.x) {
        //if (d.source.y < d.target.y) {
        if (boxRatio > vecRatio) {
          return source.x + nodeHeight / 2 * vecRatio;
        } else {
          return source.x + nodeWidth / 2;
        }
        //} else {
        //  if (boxRatio > vecRatio) {
        //    return d.source.x + nodeHeight / 2 * vecRatio;
        //  } else {
        //    return d.source.x + nodeWidth / 2;
        //  }
      } else {
        if (boxRatio > vecRatio) {
          return source.x - nodeHeight / 2 * vecRatio;
        } else {
          return source.x - nodeWidth / 2;
        }
      }
    }

    function calcIntersectionY(source, target, nodeWidth, nodeHeight) {
      if (source.x === target.x) {
        if (source.y < target.y) {
          return source.y + nodeHeight / 2;
        } else {
          return source.y - nodeHeight / 2;
        }
      } else if (source.y === target.y) {
        return source.y;
      }

      var vector = {x: target.x - source.x, y: target.y - source.y};

      var vecRatio = Math.abs(vector.x / vector.y);
      var boxRatio = nodeWidth / nodeHeight;

      if (source.y < target.y) {
        //if (d.source.y < d.target.y) {
        if (boxRatio > vecRatio) {
          return source.y + nodeHeight / 2;
        } else {
          return source.y + (nodeWidth / 2 * 1 / vecRatio);
        }
        //} else {
        //  if (boxRatio > vecRatio) {
        //    return d.source.x + nodeHeight / 2 * vecRatio;
        //  } else {
        //    return d.source.x + nodeWidth / 2;
        //  }
      } else {
        if (boxRatio > vecRatio) {
          return source.y - nodeHeight / 2;
        } else {
          return source.y - (nodeWidth / 2 * 1 / vecRatio);
        }
      }
    }

    function ForceLayout(view) {
      this.view = view;
      this.nodeIndex = 0;
      this.paths = [];
      this.nodeIndexMap = {};
      this.edgeMap = {};
      this.graph = {nodes: [], edges: [], groups: []};
      this.force = d3.layout.force()
        .linkDistance(100)
        .charge(-3000);


      var that = this;

      var tick = function () {

        var nodeWidth = config.getNodeWidth();
        var nodeHeight = config.getNodeHeight();

        var $svg = $("#pathgraph svg")[0];

        var w = $svg.offsetWidth;
        var h = $svg.offsetHeight;

        that.graph.nodes.forEach(function (node) {

          if (node.x + nodeWidth / 2 > w) {
            node.x = w - nodeWidth / 2;
          }
          if (node.y + nodeHeight / 2 > h) {
            node.y = h - nodeHeight / 2;
          }
          if (node.x - nodeWidth / 2 < 0) {
            node.x = nodeWidth / 2;
          }
          if (node.y - nodeHeight / 2 < 0) {
            node.y = nodeHeight / 2;
          }
        });

        var nodeGroup = d3.select("#pathgraph svg g.nodeGroup");

        var allNodes = nodeGroup.selectAll("g.node").data(that.graph.nodes, function (d) {
          return d.node.id;
        });

        allNodes.each(function (node) {
          //if (!node.fixed) {
          d3.select(this)
            .attr("transform", function (d) {
              return "translate(" + d.x + ", " + d.y + ")";
              //}
            });
          //}
        });


        //var allNodeTexts = nodeGroup.selectAll("g.node text").data(that.graph.nodes, function (node) {
        //  return node.id;
        //});


        var edgeGroup = d3.select("#pathgraph svg g.edgeGroup");


        var line = d3.svg.line()
          .x(function (d) {
            return d.x;
          })
          .y(function (d) {
            return d.y;
          })
          .interpolate("linear");


        var allEdges = edgeGroup.selectAll("g.edgePath").data(that.graph.edges, function (edge) {
          return edge.edge.id;
        });

        allEdges.selectAll("path.lines")
          .data(that.graph.edges, function (d) {
            return d.edge.id;
          })
          .attr({
            d: function (d) {

              return line([{
                x: calcIntersectionX(d.source, d.target, nodeWidth, nodeHeight),
                y: calcIntersectionY(d.source, d.target, nodeWidth, nodeHeight)
              },
                {
                  x: calcIntersectionX(d.target, d.source, nodeWidth, nodeHeight),
                  y: calcIntersectionY(d.target, d.source, nodeWidth, nodeHeight)
                }]);
            }
          });

        //allEdges
        //  .transition()
        //  .attr("x1", function (d) {
        //    return calcIntersectionX(d.source, d.target, nodeWidth, nodeHeight);
        //  })
        //  .attr("y1", function (d) {
        //    return calcIntersectionY(d.source, d.target, nodeWidth, nodeHeight);
        //  })
        //  .attr("x2", function (d) {
        //    return calcIntersectionX(d.target, d.source, nodeWidth, nodeHeight);
        //  })
        //  .attr("y2", function (d) {
        //    return calcIntersectionY(d.target, d.source, nodeWidth, nodeHeight);
        //  });
      };

      //this.force.on("start", function () {
      //  var nodeGroup = d3.select("#pathgraph svg g.nodeGroup");
      //  var allNodes = nodeGroup.selectAll("g.node").data(that.graph.nodes, function (node) {
      //    return node.node.id;
      //  });
      //
      //  allNodes.each(function (node) {
      //    if (node.fixed) {
      //      d3.select(this)
      //        .transition()
      //        .duration(1000)
      //        .attr("transform", function (d) {
      //          return "translate(" + d.x + ", " + d.y + ")";
      //          //}
      //        })
      //        .each("end", function () {
      //          that.force.stop();
      //        });
      //    }
      //  });
      //
      //});

      this.force.on("tick", tick);
    }


    ForceLayout.prototype = {

      init: function () {

      },

      getMinSize: function () {
        return {width: 300, height: 300};
      },

      onPathSelectionUpdate: function (selectionType) {
        //var that = this;
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

        var that = this;
        var selectedIds = (selectionUtil.selections["path"])[selectionType];
        var selected = false;

        var selectedNodes = {};
        var selectedEdges = {};
        var lastPath = 0;
        selectedIds.forEach(function (pathId) {

          for (var i = 0; i < that.paths.length; i++) {
            var path = that.paths[i];
            if (path.id === pathId) {
              lastPath = path;
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
            return (typeof selectedEdges[d.edge.id] !== "undefined");
          });


        if (selectionType === "selected" && lastPath != 0) {
          that.fixPath(lastPath);
        }
      },

      prepareLayoutChange: function () {
        this.force.stop();
      },

      addPathsToGraph: function (paths) {

        var that = this;


        paths.forEach(function (path) {
            path.nodes.forEach(function (node) {
              var index = that.nodeIndexMap[node.id.toString()];

              if (typeof index == "undefined") {
                that.nodeIndexMap[node.id.toString()] = that.nodeIndex;
                //node.width = config.getNodeWidth() + 20;
                //node.height = config.getNodeWidth() + 20;
                that.graph.nodes.push({
                  label: node.properties[config.getNodeNameProperty(node)],
                  node: node,
                  width: config.getNodeWidth(),
                  height: config.getNodeHeight()

                });
                that.nodeIndex++;
              }
            });

            path.edges.forEach(function (edge) {
              var e = that.edgeMap[edge.id.toString()];

              if (typeof e == "undefined") {

                var sourceNodeIndex = that.nodeIndexMap[edge.sourceNodeId];
                if (typeof sourceNodeIndex != "undefined") {

                  var targetNodeIndex = that.nodeIndexMap[edge.targetNodeId];
                  if (typeof targetNodeIndex != "undefined") {
                    that.edgeMap[edge.id.toString()] = edge;
                    that.graph.edges.push({
                      source: sourceNodeIndex,
                      target: targetNodeIndex,
                      edge: edge
                    });
                  }
                }
              }
            });

          }
        );
      }
      ,

      fixPath: function (path) {

        if (typeof path.nodes === "undefined") {
          return;
        }

        var $svg = $("#pathgraph svg")[0];

        var w = $svg.offsetWidth;
        var h = $svg.offsetHeight;

        var that = this;
        var nodeStep = (w - 2 * (sideSpacing + config.getNodeWidth() / 2)) / (path.nodes.length - 1);
        var posX = sideSpacing + config.getNodeWidth() / 2;
        var posY = h / 2;
        var svg = d3.select("#pathgraph svg");

        this.graph.nodes.forEach(function (node) {
          //if (node.fixed === true) {
          //delete node.parent;
          //}
          //delete node.x;
          //delete node.y;
          //delete node.px;
          //delete node.py;
          node.fixed = false;
        });


        var fixedNodes = [];


        path.nodes.forEach(function (fixedNode) {

          for (var i = 0; i < that.graph.nodes.length; i++) {

            var node = that.graph.nodes[i];
            if (node.node.id === fixedNode.id) {

              //if (i === 0) {
              //  nodeRangeDict[node.id.toString()] = {startX: node.x, endX: posX, startY: node.y, endY: posY};
              //  node.fixed = true;
              //  posX += nodeStep;
              //} else {
              //
              //  var ranges = nodeRangeDict[node.id.toString()];
              //
              //  var vX = ranges.startX + scale * (ranges.endX - ranges.startX);
              //  node.x = vX;
              //  node.px = vX;
              //  //delete node.px;
              //  var vY = ranges.startY + scale * (ranges.endY - ranges.startY);
              //  node.y = vY;
              //  node.py = vY;

              node.x = posX;
              node.px = posX;
              //delete node.px;
              node.y = posY;
              node.py = posY;
              node.fixed = true;
              posX += nodeStep;

              fixedNodes.push(i);
              //pathAlignmentConstraint.offsets.push({
              //  node: i, offset: 0
              //});

              //if(fixedNodes.length >=2) {
              //  constraints.push({axis: "x", left: fixedNodes[fixedNodes.length-2], right: fixedNodes[fixedNodes.length-1], gap: 300, equality:true})
              //}
              //delete node.py;

            }
          }
        });
        //tick();
        //}
        //this.graph.groups = [
        //  {"leaves": fixedNodes}];


        this.force
          .nodes(that.graph.nodes)
          .links(that.graph.edges)
          //.groups(that.graph.groups)
          //.constraints(constraints)
          .start();

        //svg.selectAll(".group")
        //  .data(that.graph.groups);
        svg.selectAll("g.edgeGroup").selectAll("g.edge")
          .data(that.graph.edges, function (edge) {
            return edge.edge.id;
          });

        svg.selectAll("g.nodeGroup").selectAll("g.node")
          .data(that.graph.nodes, function (d) {
            return d.node.id;
          });
        //nodeGroup.selectAll("g.node")

        //for(var i = 0; i < 200; i++) tick();
        //force.stop();

      }
      ,

      updateGraphToFilteredPaths: function () {

        this.graph = {nodes: [], edges: [], groups: []};
        this.nodeIndexMap = {};
        this.edgeMap = {};
        this.nodeIndex = 0;
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
      }
      ,

      updateGraphToAllPaths: function () {
        this.graph = {nodes: [], edges: [], groups: []};
        this.nodeIndexMap = {};
        this.edgeMap = {};
        this.nodeIndex = 0;
        var that = this;

        that.addPathsToGraph(this.paths);

        this.renderGraph(d3.select("#pathgraph svg"));
      }
      ,


      updateFilter: function () {

        var svg = d3.select("#pathgraph svg");
        svg.selectAll("g.node")
          .classed("filtered", function (d) {
            return pathQuery.isNodeFiltered(d.node.id);
          });
        //.transition()
        //.style("opacity", function (d) {
        //  return pathQuery.isNodeFiltered(d) ? 0.5 : 1;
        //});

        svg.selectAll("g.edgePath").each(function (d) {
          d3.select(this).select("path.lines")
            .classed("filtered", function (d) {
              return pathQuery.isNodeFiltered(d.edge.sourceNodeId) || pathQuery.isNodeFiltered(d.edge.targetNodeId);
            });

          d3.select(this).select("defs marker path")
            .classed("filtered", function (d) {
              return pathQuery.isNodeFiltered(d.edge.sourceNodeId) || pathQuery.isNodeFiltered(d.edge.targetNodeId);
            });

        });


      }
      ,

      render: function (paths) {
        this.paths = paths;
        //if (paths.length > 0) {

        var svg = d3.select("#pathgraph svg");
        this.addPathsToGraph(paths);

        this.renderGraph(svg);
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
        this.paths = [];
        this.graph = {nodes: [], edges: [], groups: []};
        this.nodeIndexMap = {};
        this.edgeMap = {};
        this.nodeIndex = 0;
      }
      ,

      renderGraph: function (svg) {


        var that = this;
        var $svg = $("#pathgraph svg")[0];

        var w = $svg.offsetWidth;
        var h = $svg.offsetHeight;


        that.force
          .nodes(that.graph.nodes)
          .links(that.graph.edges)
          .size([w, h])
          .start();

        var edgeGroup = svg.select("g.edgeGroup");

        var allEdges = edgeGroup.selectAll("g.edgePath")
          .data(that.graph.edges, function (edge) {
            return edge.edge.id;
          });

        var edge = allEdges
          .enter()
          .append("g")
          .classed("edgePath", true);


        edge.append("path")
          .style({fill: "none"})
          .classed("lines", true)
          .attr({
            "marker-end": function (d) {
              return config.isNetworkEdge(d.edge) ? "url(#arrowhead" + d.edge.id.toString() + ")" : null;
            }
          });

        //<marker id="arrowhead1177" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="strokeWidth" markerWidth="8" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" style="stroke-width: 1px; stroke-dasharray: 1px, 0px;"></path></marker>

        edge.append("defs")
          .append("marker")
          .attr("id", function (d) {
            return "arrowhead" + d.edge.id.toString();
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


        //var edge = allEdges
        //  .enter()
        //  .append("g")
        //  .attr("class", "edge")
        //  .style("opacity", function (d) {
        //    return pathQuery.isEdgeFiltered(d.edge.id) ? 0.5 : 1;
        //  });
        //
        //var edgeLines = edge.append("line");

        allEdges.exit()
          .remove();
        //.attr("marker-end", "url(#arrowRight)");

        var nodeGroup = svg.select("g.nodeGroup");

        var allNodes = nodeGroup.selectAll("g.node")
          .data(that.graph.nodes, function (node) {
            return node.node.id;
          });


        var node = allNodes
          .enter()
          .append("g")
          .classed("node", true)
          .on("dblclick", function (d) {
            pathSorting.sortingStrategies.selectionSortingStrategy.setNodeIds([d.node.id]);
            listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
          })
          .style("opacity", function (d) {
            return pathQuery.isNodeFiltered(d.node.id) ? 0.5 : 1;
          });

        selectionUtil.addDefaultListener(nodeGroup, "g.node", function (d) {
            return d.node.id;
          },
          "node"
        );

        var nodeRects = node.append("rect")
          .attr({
            rx: 5,
            ry: 5,
            x: function (d) {
              return -d.width / 2
            },
            y: function (d) {
              return -d.height / 2
            },
            width: function (d) {
              return d.width
            },
            height: function (d) {
              return d.height
            }
          });


        var nodeTexts = node.append("text")
          .attr({
            x: function (d) {
              //var node = that.graph.node(d).node;
              var text = d.node.properties[config.getNodeNameProperty(d.node)];
              var width = that.view.getTextWidth(text);
              return Math.max(-width / 2, -config.getNodeWidth() / 2 + 3);
            },
            y: function (d) {
              return d.height / 2 - 5;
            },
            "clip-path": "url(#graphNodeClipPath)"
          })
          .text(function (d) {
            //var node = that.graph.node(d).node;
            var text = d.node.properties[config.getNodeNameProperty(d.node)];
            //if (text.length > 7) {
            //  text = text.substring(0, 7);
            //}
            return text;
          });

        allNodes.exit()
          .remove();

      }


    };

    return ForceLayout;


  }
)
;
