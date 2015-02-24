define(['jquery', 'd3', './listeners'], function ($, d3, listeners) {
    'use strict';

    function renderGraph(svg, graph) {

      var w = 800;
      var h = 800;
      var nodeWidth = 50;
      var nodeHeight = 20;
      var sideSpacing = 10;
      var arrowWidth = 7;

      svg.selectAll("g.edgeGroup")
        .remove();
      svg.selectAll("g.nodeGroup")
        .remove();

      var force = d3.layout.force()
        .nodes(graph.nodes)
        .links(graph.edges)
        .size([w, h])
        //.linkDistance(300)
        .charge(-3000)
        .start();

      var edgeGroup = svg.append("g")
        .attr("class", "edgeGroup");

      var edge = edgeGroup.selectAll("g.edge")
        .data(graph.edges)
        .enter()
        .append("g")
        .attr("class", "edge");

      var edgeLines = edge.append("line")
        .attr("marker-end", "url(#arrowRight)");

      var nodeGroup = svg.append("g")
        .attr("class", "nodeGroup");

      var node = nodeGroup.selectAll("g.node")
        .data(graph.nodes)
        .enter()
        .append("g")
        .attr("class", function (d) {
          return "node " + (d.fixed ? ("fixed") : "");
        });

      var nodeRects = node.append("rect")
        .attr("width", nodeWidth)
        .attr("height", nodeHeight);

      var nodeTexts = node.append("text")
        .text(function (d) {
          var text = d.properties["name"];
          if (text.length > 7) {
            text = text.substring(0, 7);
          }
          return text;
        });


      var tick = function () {

        graph.nodes.forEach(function (node) {

          if (node.fixed) {
            node.x++;
          }


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

        nodeRects.attr("x", function (d) {
          return d.x - nodeWidth / 2;
          //}
        });
        nodeRects.attr("y", function (d) {
          return d.y - nodeHeight / 2;

        });

        nodeTexts.attr("x", function (d) {
          return d.x;
        });
        nodeTexts.attr("y", function (d) {
          return d.y + 5;
        });

        edgeLines.attr("x1", function (d) {
          return calcIntersectionX(d.source, d.target, nodeWidth, nodeHeight);
        })
          .attr("y1", function (d) {
            return calcIntersectionY(d.source, d.target, nodeWidth, nodeHeight);
          })
          .attr("x2", function (d) {
            return calcIntersectionX(d.target, d.source, nodeWidth, nodeHeight);
          })
          .attr("y2", function (d) {
            return calcIntersectionY(d.target, d.source, nodeWidth, nodeHeight);
          });
      }

      force.on("tick", tick);

      listeners.add(function (path) {

        var nodeStep = (w - 2 * (sideSpacing + nodeWidth / 2)) / (path.nodes.length - 1);
        var posX = sideSpacing + nodeWidth / 2;
        var posY = h / 2;
        graph.nodes.forEach(function (node) {
          node.fixed = false;
        });

        //var nodeRangeDict = {};


        //for (var i = 0; i <= 100; i++) {
        //
        //  var scale = i / 100;


        path.nodes.forEach(function (fixedNode) {
          graph.nodes.forEach(function (node) {
            if (node.id == fixedNode.id) {

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
              //delete node.py;

            }
          });
        });
        //tick();
        //}
        nodeGroup.selectAll("g.node")
          .attr("class", function (d) {
            return "node " + (d.fixed ? ("fixed") : "");
          });

        force.start();
        //for(var i = 0; i < 200; i++) tick();
        //force.stop();

      }, listeners.updateType.PATH_SELECTION);


    }

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


    function getGraphFromPaths(paths) {

      var nodeMap = {};
      var nodeList = [];

      var edgeMap = {};
      var edgeList = [];

      var nodeIndex = 0;
      paths.forEach(function (path) {
          path.nodes.forEach(function (node) {

            var index = nodeMap[node.id.toString()];

            if (typeof index == "undefined") {
              nodeMap[node.id.toString()] = nodeIndex;
              nodeList.push(node);
              nodeIndex++;
            }
          });

          path.edges.forEach(function (edge) {
            var e = edgeMap[edge.id.toString()];

            if (typeof e == "undefined") {

              var sourceNodeIndex = nodeMap[edge.sourceNodeId];
              if (typeof sourceNodeIndex != "undefined") {

                var targetNodeIndex = nodeMap[edge.targetNodeId];
                if (typeof targetNodeIndex != "undefined") {
                  edgeMap[edge.id.toString()] = edge;
                  edgeList.push({
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

      return {nodes: nodeList, edges: edgeList};
    }


    return {

      init: function () {

        var w = 800;
        var h = 800;

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


      },

      render: function (paths) {
        if (paths.length > 0) {

          var svg = d3.select("#pathgraph svg");
          var pathGraph = getGraphFromPaths(paths);

          renderGraph(svg, pathGraph);
        }
      }

    }
  }
)
;
