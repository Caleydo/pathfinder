define(['jquery', 'd3', 'webcola', 'dagre-d3', '../listeners', '../selectionutil', '../list/pathsorting', '../query/pathquery', '../config', '../pathutil', './neighboredge', '../query/queryutil', '../../pathfinder_graph/search'],
    function ($, d3, webcola, dagreD3, listeners, selectionUtil, pathSorting, pathQuery, config, pathUtil, neighborEdgeManager, queryUtil, ServerSearch) {
        'use strict';

        var sideSpacing = 10;

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
            //this.nodeIndex = 0;
            this.paths = [];
            //this.nodeIndexMap = {};
            //this.edgeMap = {};
            this.graph = {nodes: [], edges: []};
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

                var nodeGroup = d3.select("#pathgraph svg g.nodeGroup");

                var allNodes = nodeGroup.selectAll("g.node").data(that.graph.nodes, function (d) {
                    return d.node.id;
                });

                allNodes.each(function (d) {
                    //if (!node.fixed) {
                    d.x = Math.max(nodeWidth / 2, Math.min(w - (nodeWidth / 2), d.x));
                    d.y = Math.max(nodeHeight / 2, Math.min(h - nodeHeight / 2, d.y));
                    d3.select(this)
                        .attr("transform", "translate(" + d.x + ", " + d.y + ")");
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

                allEdges.selectAll("path.selectionLines").data(that.graph.edges, function (d) {
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

            };


            this.force.on("tick", tick);
        }


        ForceLayout.prototype = {

            init: function () {

            },

            getMinSize: function () {
                return {width: 300, height: 300};
            },

            onPathSelectionUpdate: function (selectionType, source) {


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


                //if (selectionType === "selected" && lastPath != 0 && source !== this) {
                //  that.fixPath(lastPath);
                //}
            },

            prepareLayoutChange: function () {
                this.force.stop();
            },


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


                            node.x = posX;
                            node.px = posX;
                            //delete node.px;
                            node.y = posY;
                            node.py = posY;
                            node.fixed = true;
                            posX += nodeStep;

                            fixedNodes.push(i);

                        }
                    }
                });

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


            updateFilter: function () {

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
                            return !d.neighborEdge && (pathQuery.isNodeFiltered(d.edge.sourceNodeId) || pathQuery.isNodeFiltered(d.edge.targetNodeId));
                        });

                    d3.select(this).select("defs marker path")
                        .classed("filtered", function (d) {
                            return !d.neighborEdge && (pathQuery.isNodeFiltered(d.edge.sourceNodeId) || pathQuery.isNodeFiltered(d.edge.targetNodeId));
                        });

                });


            }
            ,

            render: function (paths, graph) {
                this.paths = paths;
                this.graph = this.convertGraph(graph);

                //if (paths.length > 0) {

                var svg = d3.select("#pathgraph svg");
                //this.addPathsToGraph(paths);

                this.renderGraph(svg);
                //}
            }
            ,

            convertGraph: function (g) {
                var graph = {nodes: [], edges: []};
                var nodeMap = {};
                var nodeIndex = 0;

                g.nodes().forEach(function (n) {
                    var node = g.node(n);
                    nodeMap[node.node.id.toString()] = nodeIndex;
                    nodeIndex++;
                    graph.nodes.push(node);
                });

                g.edges().forEach(function (e) {
                    var sourceIndex = nodeMap[e.v.toString()];
                    var targetIndex = nodeMap[e.w.toString()];
                    var edge = Object.create(g.edge(e));
                    edge.source = sourceIndex;
                    edge.target = targetIndex;
                    graph.edges.push(edge);
                });
                return graph;
            },

            //addPath: function (path) {
            //    this.paths.push(path);
            //    var svg = d3.select("#pathgraph svg");
            //    this.addPathsToGraph([path]);
            //
            //    this.renderGraph(svg);
            //}
            //,

            reset: function () {
                this.paths = [];
                this.graph = {nodes: [], edges: []};
                //this.nodeIndexMap = {};
                //this.edgeMap = {};
                //this.nodeIndex = 0;
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
                    .classed("edgePath", true)
                    .on("dblclick", function (d) {
                        //pathSorting.sortingStrategies.selectionSortingStrategy.setPathIds(selectionUtil.selections["path"]["selected"]);
                        pathSorting.addSelectionBasedSortingStrategy(new pathSorting.PathPresenceSortingStrategy(selectionUtil.selections["path"]["selected"]));
                        listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
                    });


                edge.append("path")
                    .style({
                        fill: "none",
                        "stroke-dasharray": function (d) {
                            if (d.neighborEdge) {
                                return "1,5";
                            }
                            return config.isNetworkEdge(d.edge) ? "0,0" : "10,5";
                        }
                    })
                    .classed("lines", true)
                    .attr({
                        "marker-end": function (d) {
                            return config.isNetworkEdge(d.edge) ? "url(#arrowhead" + d.edge.id.toString() + ")" : null;
                        }
                    });

                edge.append("path")
                    .style({fill: "none", opacity: 0, "stroke-width": 8})
                    .classed("selectionLines", true);

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

                selectionUtil.addDefaultTrigger(edgeGroup, "g.edgePath", function (d) {

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
                }, "path", that);


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
                    .classed({
                        node: true,
                        neighbor: function (d) {
                            return d.isNeighborNode;
                        }
                    })
                    .on("dblclick", function (d) {
                        //pathSorting.sortingStrategies.selectionSortingStrategy.setNodeIds([d.node.id]);
                        pathSorting.addSelectionBasedSortingStrategy(new pathSorting.NodePresenceSortingStrategy(selectionUtil.selections["node"]["selected"]));
                        listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
                    });
                //.style("opacity", function (d) {
                //  return pathQuery.isNodeFiltered(d.node.id) ? 0.5 : 1;
                //});

                selectionUtil.addDefaultListener(nodeGroup, "g.node", function (d) {
                        return d.node.id;
                    },
                    "node"
                );

                node.each(function (d) {
                    var items = queryUtil.getFilterOverlayItems("name", d.node.properties[config.getNodeNameProperty(d.node)]);
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
                    pathUtil.renderNode(d3.select(this), d.node, -d.width / 2, -d.height / 2, d.width, d.height, "url(#graphNodeClipPath)", function (text) {
                        return that.view.getTextWidth(text)
                    }, items);
                });

                allNodes.classed("neighbor", function (d) {
                    return d.isNeighborNode;
                });


                allNodes.exit()
                    .remove();

                this.updateFilter();

            }


        };

        return ForceLayout;
    }
)
;
