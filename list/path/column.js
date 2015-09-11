define(["jquery", "d3", "./settings", "../../listeners", "../../uiutil", "../pathsorting", "../../datastore", "../../config", "../../setinfo", '../../sorting'],
    function ($, d3, s, listeners, uiUtil, pathSorting, dataStore, config, setInfo, sorting) {

        //var DEFAULT_COLUMN_WIDTH = 80;
        var COLUMN_SPACING = 5;
        var BAR_SIZE = s.DEFAULT_BAR_SIZE;
        var SMALL_BAR_SIZE = 8;


        //var RANK_CRITERION_SELECTOR_WIDTH = 50;
        //var COLUMN_ELEMENT_SPACING = 5;
        //var STRATEGY_SELECTOR_START = 5;

        var HEADER_ELEMENT_SPACING = 5;
        var HEADER_BUTTON_SIZE = 16;

        var BAR_SIDE_PADDING = 4;
        var BAR_COLUMN_WIDTH = 90;
        var HEATMAP_COLUMN_WIDTH = 40;
        var TEXT_COLUMN_WIDTH = 40;
        var BOOLEAN_COLUMN_WIDTH = 40;
        //var RANK_CRITERION_ELEMENT_HEIGHT = 22;

        var currentColumnID = 0;
        //var allColumns = [];

        function getTotalColumnWidth(columns, index) {

            var maxIndex = (typeof index === "undefined") ? columns.length - 1 : index;

            var width = 0;
            for (var i = 0; i < maxIndex; i++) {
                width += columns[i].getWidth();
                width += COLUMN_SPACING;
            }

            return width;
        }

        function getColumnItemTranlateX(columns, column, pathWrappers, index) {
            var pathTranslation = s.isAlignColumns() ? getMaxPathTranslation(pathWrappers, column.pathList) : getPathTranslation(pathWrappers[index], column.pathList);
            var translateX = pathTranslation + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
            translateX += getTotalColumnWidth(columns, columns.indexOf(column));
            return translateX;
        }

        function getMaxPathTranslation(pathWrappers, pathList) {
            var maxPathTranslation = 0;
            pathWrappers.forEach(function (p) {
                var t = getPathTranslation(p, pathList);
                if (t > maxPathTranslation) {
                    maxPathTranslation = t;
                }
            });

            return maxPathTranslation;
        }

        function getPathTranslation(pathWrapper, pathList) {
            return pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH;
        }

        function getMaxLengthPathWrapper(pathWrappers) {
            var maxPathLength = 0;
            var maxLengthPathWrapper = 0;

            pathWrappers.forEach(function (p) {
                var l = p.path.nodes.length;
                if (l > maxPathLength) {
                    maxPathLength = l;
                    maxLengthPathWrapper = p;
                }
            });

            return maxLengthPathWrapper;
        }


        function RankColumnHeader(priority, column, columnManager, sortingStrategy) {
            this.priority = priority;
            this.column = column;
            this.columnManager = columnManager;
            this.sortingStrategy = sortingStrategy;
            this.minHeight = s.COLUMN_HEADER_HEIGHT;
            //this.selectedStrategyIndex = selectedStrategyIndex || 0;
        }

        RankColumnHeader.prototype = {

            setPriority: function (priority) {
                this.priority = priority;
            },

            setMinHeight: function (height) {
                this.minHeight = height;
                //this.columnManager.updateHeaderHeights();
            },

            init: function (parent) {

                var that = this;
                var columnWidth = that.column.getWidth();

                this.rootDomElement = parent.append("g")
                    .classed("rankCriterionElement", true);

                this.rootDomElement.append("rect")
                    .classed("colBg", true)
                    .attr({
                        x: 0,
                        y: s.COLUMN_HEADER_HEIGHT / 2,
                        width: columnWidth,
                        height: "100%"
                    })
                    .style({
                        fill: "rgb(240,240,240)"
                    });

                var columnGroup = this.rootDomElement.append("g");

                var headerBackground = columnGroup.append("rect")
                    .classed("headerBg", true)
                    .attr({
                        x: 0,
                        y: 0,
                        rx: 5,
                        ry: 5,
                        width: columnWidth,
                        height: s.COLUMN_HEADER_HEIGHT
                    })
                    .style({
                        fill: "lightgray"
                    });


                this.rootDomElement.on("mouseover", function () {
                    headerBackground.style({
                        fill: "rgb(180,180,180)"
                    });
                })
                    .on("mouseout", function () {
                        headerBackground.style({
                            fill: "lightgray"
                        });
                    });

                this.rootDomElement.append("clipPath")
                    .attr("id", "columnHeaderClipPath" + this.column.id)
                    .append("rect")
                    .attr("x", 3)
                    .attr("y", 0)
                    .attr("width", columnWidth - (3 * HEADER_ELEMENT_SPACING + HEADER_BUTTON_SIZE))
                    .attr("height", s.COLUMN_HEADER_HEIGHT);

                var tooltip = columnGroup.append("title")
                    .text(this.sortingStrategy.label);


                var label = columnGroup.append("text")
                    .attr({
                        x: HEADER_ELEMENT_SPACING,
                        y: s.COLUMN_HEADER_HEIGHT / 2 + 4,
                        "clip-path": "url(#columnHeaderClipPath" + this.column.id + ")"
                    })
                    .style({font: "12px 'Arial'"})
                    .text(this.sortingStrategy.label);

                columnGroup.on("click.openOptions", function () {

                    var listItems = [{
                        text: "Rank by...",
                        icon: "",
                        callback: function () {
                            pathSorting.openConfigureSortingDialog(function (sortingStrategy) {
                                label.text(sortingStrategy.label);
                                tooltip.text(sortingStrategy.label);
                                that.sortingStrategy = sortingStrategy;
                                that.column.setSortingStrategy(sortingStrategy);
                                that.updateWidth();
                                that.columnManager.updateSortOrder();
                                that.columnManager.updateHeaderHeights();
                                that.columnManager.notify();
                            });
                        }
                    }];

                    listItems = listItems.concat(that.columnManager.getMultiFormListItems(that.column), [{
                        text: "Sort ascending",
                        icon: "\uf160",
                        callback: function () {
                            updateSortOrder(true);
                        }
                    },
                        {
                            text: "Sort descending",
                            icon: "\uf161",
                            callback: function () {
                                updateSortOrder(false);
                            }
                        },
                        {
                            text: "Remove column",
                            icon: "\uf00d",
                            callback: function () {
                                that.columnManager.removeColumn(that.column);
                                that.columnManager.notify();
                            }
                        }
                    ]);

                    uiUtil.showListOverlay(listItems);


                });

                function updateSortOrder(ascending) {
                    that.sortingStrategy.ascending = ascending;
                    that.columnManager.updateSortOrder();
                    that.columnManager.notify();
                }


                that.sortingOrderButton = uiUtil.addOverlayButton(this.rootDomElement, columnWidth - HEADER_ELEMENT_SPACING - HEADER_BUTTON_SIZE, 3,
                    HEADER_BUTTON_SIZE, HEADER_BUTTON_SIZE, that.orderButtonText(), 16 / 2, 16 - 3, "rgb(30,30,30)", false);

                that.sortingOrderButton
                    .classed("sortOrderButton", true)
                    .on("click", function () {
                        updateSortOrder(!that.sortingStrategy.ascending);
                    }).append("title")
                    .text("Toggle sort order");


                //var removeButton = uiUtil.addOverlayButton(this.rootDomElement, STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 10 + 16, 3, 16, 16, "\uf00d", 16 / 2, 16 - 3, "red", true);
                //
                //
                //removeButton.attr("display", "none");
                //
                //removeButton.on("click", function () {
                //  that.columnManager.removeColumn(that.column);
                //});
                //
                //
                //$(this.rootDomElement[0]).mouseenter(function () {
                //  removeButton.attr("display", "inline");
                //});
                ////
                //$(this.rootDomElement[0]).mouseleave(function () {
                //  removeButton.attr("display", "none");
                //});
            },

            orderButtonText: function () {
                return this.sortingStrategy.ascending ? "\uf160" : "\uf161";
            },

            updateSortOrder: function () {
                this.rootDomElement.select("g.sortOrderButton").select("text").text(this.orderButtonText());
            },


            updateWidth: function () {

                var width = this.column.getWidth();

                this.rootDomElement.select("rect.colBg")
                    .transition()
                    .attr({
                        width: width
                    });

                this.rootDomElement.select("rect.headerBg")
                    .transition()
                    .attr({
                        width: width
                    });

                this.rootDomElement.select("#columnHeaderClipPath" + this.column.id).select("rect")
                    .transition()
                    .attr("width", width - (3 * HEADER_ELEMENT_SPACING + HEADER_BUTTON_SIZE));

                this.sortingOrderButton
                    .transition()
                    .attr({
                        transform: "translate(" + (width - HEADER_BUTTON_SIZE - HEADER_ELEMENT_SPACING) + "," + (3) + ")"
                    });
            }

        };

        function Column(columnManager, sortingStrategy, priority) {
            this.columnManager = columnManager;
            this.pathList = columnManager.pathList;
            this.id = currentColumnID++;
            this.header = new RankColumnHeader(priority, this, columnManager, sortingStrategy);
            this.setSortingStrategy(sortingStrategy);
        }

        Column.prototype = {
            setSortingStrategy: function (sortingStrategy) {
                if (this.itemRenderer) {
                    this.itemRenderer.destroy(this);
                }
                d3.selectAll("g.columnItem" + this.id).remove();
                this.sortingStrategy = sortingStrategy;
                this.itemRenderer = this.columnManager.getItemRenderer(sortingStrategy, this);
                this.itemRenderer.init(this);
            },

            render: function (parent, pathWrappers) {
                this.renderHeader(pathWrappers);
                this.renderBackground(parent, pathWrappers);

                var gridStrokeColor = "white";
                var gridFillColor = "rgba(0,0,0,0)"

                var that = this;

                var allColumnItems = parent.selectAll("g.columnItem" + this.id)
                    .data(pathWrappers, function (d) {
                        return d.path.id
                    });

                var maxLengthPathWrapper = getMaxLengthPathWrapper(pathWrappers);
                var columnItem = allColumnItems.enter()
                    .append("g")
                    .classed("columnItem" + this.id, true)
                    .attr({
                        transform: function (d, i) {
                            var translateY = s.getPathContainerTranslateY(pathWrappers, i);
                            return "translate(" + getColumnItemTranlateX(that.columnManager.columns, that, pathWrappers, i) + "," + translateY + ")";
                        }
                    });

                columnItem.each(function (pathWrapper, index) {
                    var item = d3.select(this);
                    //item.append("rect")
                    //  .classed("bgPathItem", true)
                    //  .attr({
                    //    x: 0,
                    //    y: 0,
                    //    width: that.getWidth(),
                    //    height: pathWrapper.getHeight()
                    //  })
                    //  .style({
                    //    stroke: "black",
                    //    fill: "rgba(0,0,0,0)"
                    //  });

                    //item.append("rect")
                    //  .classed("bgPath", true)
                    //  .attr({
                    //    x: 0,
                    //    y: 0,
                    //    width: that.getWidth(),
                    //    height: s.PATH_HEIGHT
                    //  })
                    //  .style({
                    //    stroke: gridStrokeColor,
                    //    fill: gridFillColor,
                    //    "shape-rendering": "crispEdges"
                    //  });

                    that.itemRenderer.enter(item, pathWrapper, index, pathWrappers, that);
                });

                allColumnItems.transition()
                    .attr({
                        transform: function (d, i) {
                            var translateY = s.getPathContainerTranslateY(pathWrappers, i);
                            return "translate(" + getColumnItemTranlateX(that.columnManager.columns, that, pathWrappers, i) + "," + translateY + ")";
                            //var pathWrapper = s.isAlignColumns() ? maxLengthPathWrapper : d;
                            //var translateX = that.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
                            //translateX += getTotalColumnWidth(that.columnManager.columns, that.columnManager.columns.indexOf(that));
                            //var translateY = s.getPathContainerTranslateY(pathWrappers, i);
                            //return "translate(" + translateX + "," + translateY + ")";
                        }
                    });


                allColumnItems.each(function (pathWrapper, index) {
                    var item = d3.select(this);

                    that.itemRenderer.update(item, pathWrapper, index, pathWrappers, that);
                });

                allColumnItems.exit().remove();
            },

            renderHeader: function (pathWrappers) {
                var that = this;
                var translateX = getTotalColumnWidth(that.columnManager.columns, that.columnManager.columns.indexOf(this));
                if (pathWrappers.length !== 0) {
                    var pathTranslation = s.isAlignColumns() ? getMaxPathTranslation(pathWrappers, this.pathList) : getPathTranslation(pathWrappers[0], this.pathList);
                    translateX += pathTranslation + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
                    //var pathWrapper = s.isAlignColumns() ? getMaxLengthPathWrapper(pathWrappers) : pathWrappers[0];
                    //translateX += this.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
                }


                if (!this.headerElement) {
                    this.headerElement = d3.select("#columnHeaders svg g.headers").append("g")
                        .classed("columnHeader" + this.id, true)
                        .attr({
                            transform: "translate(" + translateX + ",0)"
                        });


                    this.header.init(this.headerElement);
                }

                this.headerElement.transition()
                    .attr({
                        transform: "translate(" + translateX + ",0)"
                    });

            },

            renderBackground: function (parent, pathWrappers) {

                var that = this;

                if (!this.bgRoot) {
                    this.bgRoot = parent.insert("g", ":first-child")
                        .classed("columnBackground" + this.id, true);
                }


                var bgDataLeft = [];
                var bgDataRight = [];

                for (var i = 0, j = pathWrappers.length - 1; i < pathWrappers.length && j >= 0; i++, j--) {

                    var translateX = getColumnItemTranlateX(that.columnManager.columns, that, pathWrappers, i);
                    var translateY = s.getPathContainerTranslateY(pathWrappers, i);

                    bgDataLeft.push({
                        x: translateX,
                        y: translateY
                    });
                    bgDataLeft.push({
                        x: translateX,
                        y: translateY + pathWrappers[i].getHeight()
                    });

                    translateX = getColumnItemTranlateX(that.columnManager.columns, that, pathWrappers, j);
                    translateY = s.getPathContainerTranslateY(pathWrappers, j);

                    bgDataRight.push({
                        x: translateX + that.getWidth(),
                        y: translateY + pathWrappers[j].getHeight()
                    });
                    bgDataRight.push({
                        x: translateX + that.getWidth(),
                        y: translateY
                    });

                }

                var bgData = bgDataLeft.concat(bgDataRight);
                if (pathWrappers.length === 0) {
                    this.bgRoot.selectAll("path").remove();
                    return;
                }

                var allBg = this.bgRoot.selectAll("path")
                    .data([bgData]);

                var line = d3.svg.line()
                    .x(function (d) {
                        return d.x;
                    })
                    .y(function (d) {
                        return d.y;
                    })
                    .interpolate("linear");

                allBg.enter()
                    .append("path")
                    .attr({
                        //stroke: "black",
                        fill: "rgb(240,240,240)",
                        d: function (d) {
                            return line(d) + "Z";
                        }
                    });

                allBg.transition()
                    .attr({
                        d: function (d) {
                            return line(d) + "Z";
                        }
                    });

                allBg.exit().remove();


            },

            destroy: function () {
                this.itemRenderer.destroy(this);
                if (this.headerElement) {
                    this.headerElement.remove();
                }
                if (this.bgRoot) {
                    this.bgRoot.remove();
                }
                d3.selectAll("g.columnItem" + this.id).remove();
            },

            getWidth: function () {
                return this.itemRenderer.getWidth();
            }
        };

        function PathItemRenderer(column, scoreRepresentation) {
            this.scoreRepresentation = scoreRepresentation || new BarRepresentation();
            this.column = column;
        }

        PathItemRenderer.prototype = {
            enter: function (item, pathWrapper, index, pathWrappers) {

            },

            setScoreRepresentation: function (scoreRepresentation) {
                this.destroy();
                this.scoreRepresentation = scoreRepresentation;
                this.init();
            },

            update: function (item, pathWrapper, index, pathWrappers) {

            },

            init: function () {
                this.scoreRepresentation.init(this.column);
            },

            destroy: function () {
                this.scoreRepresentation.destroy(this.column);
            },

            getWidth: function () {
                return this.scoreRepresentation.getWidth();
            }
        };

        function getScoreValueRange(pathWrappers, sortingStrategy) {
            var max = Number.NEGATIVE_INFINITY;
            var min = Number.POSITIVE_INFINITY;

            pathWrappers.forEach(function (pathWrapper) {
                var score = sortingStrategy.getScoreInfo(pathWrapper.path).score;
                if (score > max) {
                    max = score;
                }
                if (score < min) {
                    min = score;
                }
            });

            return {min: min, max: max};
        }

        function SimplePathScoreRenderer(column, scoreRepresentation, tooltipTextAccessor) {
            PathItemRenderer.call(this, column, scoreRepresentation);
            this.tooltipTextAccessor = tooltipTextAccessor;
        }

        SimplePathScoreRenderer.prototype = Object.create(PathItemRenderer.prototype);

        SimplePathScoreRenderer.prototype.enter = function (item, pathWrapper, index, pathWrappers, column) {

            var valueRange = getScoreValueRange(pathWrappers, column.sortingStrategy);

            var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path);

            this.scoreRepresentation.setValueRange(valueRange);
            this.scoreRepresentation.appendScore(item, scoreInfo.score, s.PATH_HEIGHT, true);


            item.append("title")
                .text(this.tooltipTextAccessor(column.sortingStrategy, scoreInfo));
        };

        SimplePathScoreRenderer.prototype.update = function (item, pathWrapper, index, pathWrappers, column) {
            var valueRange = getScoreValueRange(pathWrappers, column.sortingStrategy);

            var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path);
            this.scoreRepresentation.setValueRange(valueRange);
            this.scoreRepresentation.updateScore(item, scoreInfo.score, s.PATH_HEIGHT, true);
            item.select("title").text(this.tooltipTextAccessor(column.sortingStrategy, scoreInfo))
        };

        function getPathDataScoreValueRange(pathWrappers, dataset, sortingStrategy) {
            var max = Number.NEGATIVE_INFINITY;
            var min = Number.POSITIVE_INFINITY;
            var originalSortingStrategy = unwrapSortingStrategy(sortingStrategy);

            pathWrappers.forEach(function (pathWrapper) {
                var score = sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id).score;
                if (score > max) {
                    max = score;
                }
                if (score < min) {
                    min = score;
                }
                if (originalSortingStrategy.supportsScoresPerGroup) {
                    dataset.children.forEach(function (group) {
                        var score = sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id, group.name).score;
                        if (score > max) {
                            max = score;
                        }
                        if (score < min) {
                            min = score;
                        }
                    })
                }

            });

            return {min: min, max: max};
        }

        function ScoreRepresentation() {
        }

        ScoreRepresentation.prototype = {

            setValueRange: function (valueRange) {
                this.scale = d3.scale.linear().domain([Math.min(0, valueRange.min), Math.max(0, valueRange.max)]).range([0, this.getWidth()]);
            },

            appendSortingIndicator: function (parent, maxHeight, show) {
                var that = this;
                parent.append("rect")
                    .classed("sortingIndicator", true)
                    .attr({
                        x: 0,
                        y: 0,
                        width: that.getWidth(),
                        height: maxHeight
                    })
                    .style({
                        fill: show ? "rgba(170,170,170,1)" : "rgba(0,0,0,0)"
                    });
            },

            updateSortingIndicator: function (parent, maxHeight, show) {
                var that = this;
                parent.select("rect.sortingIndicator")
                    .transition()
                    .attr({
                        width: that.getWidth(),
                        height: maxHeight
                    })
                    .style({
                        fill: show ? "rgba(170,170,170,1)" : "rgba(0,0,0,0)"
                    });
            },

            getWidth: function () {
            },

            appendScore: function (parent, score, maxHeight, color) {
            },

            updateScore: function (parent, score, maxHeight, color) {

            },

            init: function (column) {

            },

            destroy: function (column) {

            }
        };


        function BarRepresentation(color) {
            ScoreRepresentation.call(this);
            this.color = color || "gray";
        }

        BarRepresentation.prototype = Object.create(ScoreRepresentation.prototype);

        BarRepresentation.prototype.setValueRange = function (valueRange) {
            var that = this;
            var min = Math.min(0, valueRange.min);
            var max = Math.max(0, valueRange.max);
            var maxWidth = this.getWidth() - (2 * BAR_SIDE_PADDING);
            this.scale = d3.scale.linear().domain([min, max]).range([0, maxWidth]);


            //var axis = d3.svg.axis()
            //  .scale(this.scale)
            //  .orient("top")
            //  .tickValues([min, max])
            //  //.tickFormat(d3.format(".2f"))
            //  .tickSize(3, 3);

            var ext = this.column.header.rootDomElement.select("g.scoreAxis");
            if (ext.empty()) {

                ext = this.column.header.rootDomElement.append("g")
                    .classed("scoreAxis", true)
                    .attr({
                        transform: function (d, i) {
                            return "translate(" + BAR_SIDE_PADDING + "," + (s.COLUMN_HEADER_HEIGHT + 4) + ")";
                        }
                    });

                ext.append("rect")
                    .classed("scoreFrameFill", true)
                    .attr({
                        x: 0,
                        y: 0,
                        width: maxWidth,
                        height: BAR_SIZE
                    })
                    .style({
                        fill: "rgb(200,200,200)"
                    });

                ext.append("rect")
                    .classed("scoreFrame", true)
                    .attr({
                        x: 0,
                        y: 0,
                        width: maxWidth,
                        height: BAR_SIZE
                    })
                    .style({
                        "shape-rendering": "crispEdges",
                        fill: "rgba(0,0,0,0)",
                        stroke: "rgb(80,80,80)"
                    });

                ext.append("line")
                    .classed("zero", true)
                    .attr({
                        x1: 0 + that.scale(0),
                        y1: -4,
                        x2: 0 + that.scale(0),
                        y2: BAR_SIZE + 4
                    })
                    .style({
                        "opacity": min < 0 && max > 0 ? 1 : 0,
                        "shape-rendering": "crispEdges",
                        stroke: "rgb(80,80,80)"
                    });

                ext.append("line")
                    .classed("tickMin", true)
                    .attr({
                        x1: 0,
                        y1: BAR_SIZE,
                        x2: 0,
                        y2: BAR_SIZE + 4
                    })
                    .style({
                        "shape-rendering": "crispEdges",
                        stroke: "rgb(80,80,80)"
                    });

                ext.append("line")
                    .classed("tickMax", true)
                    .attr({
                        x1: maxWidth,
                        y1: BAR_SIZE,
                        x2: maxWidth,
                        y2: BAR_SIZE + 4
                    })
                    .style({
                        "shape-rendering": "crispEdges",
                        stroke: "rgb(80,80,80)"
                    });


                ext.append("text")
                    .classed("min", true)
                    .attr({
                        x: 0,
                        y: BAR_SIZE + 14
                    })
                    .style({
                        "text-anchor": "start"
                    });

                ext.append("text")
                    .classed("max", true)
                    .attr({
                        x: maxWidth,
                        y: BAR_SIZE + 14
                    })
                    .style({
                        "text-anchor": "end"
                    });

            }

            ext.select("line.zero").transition()
                .attr({
                    x1: 0 + that.scale(0),
                    x2: 0 + that.scale(0)
                })
                .style({
                    "opacity": min < 0 && max > 0 ? 1 : 0
                });

            ext.select("text.min").text(uiUtil.formatNumber(min, 2));
            ext.select("text.max").text(uiUtil.formatNumber(max, 2));

            //ext.call(axis);
            //
            //ext.selectAll("text").each(function (d, i) {
            //  d3.select(this).style({"text-anchor": i === 0 ? "start" : "end"});
            //})

        };

        BarRepresentation.prototype.getWidth = function () {
            return BAR_COLUMN_WIDTH;
        };

        BarRepresentation.prototype.appendScore = function (parent, score, maxHeight, showSortingIndicator, color) {
            var height = Math.min(BAR_SIZE, maxHeight);
            var that = this;
            this.appendSortingIndicator(parent, maxHeight, showSortingIndicator);
            var maxWidth = that.getWidth() - (2 * BAR_SIDE_PADDING);

            if (isNaN(score)) {
                return;
            }

            parent.append("rect")
                .classed("scoreFrameFill", true)
                .attr({
                    x: BAR_SIDE_PADDING,
                    y: (maxHeight - height) / 2,
                    width: maxWidth,
                    height: height
                })
                .style({
                    fill: "rgb(200,200,200)"
                });

            parent.append("rect")
                .classed("score", true)
                .attr({
                    x: BAR_SIDE_PADDING + (score < 0 ? that.scale(score) : that.scale(0)),
                    y: (maxHeight - height) / 2,
                    fill: color || that.color,
                    width: Math.abs(that.scale(0) - that.scale(score)),
                    height: height
                });

            parent.append("rect")
                .classed("scoreFrame", true)
                .attr({
                    x: BAR_SIDE_PADDING,
                    y: (maxHeight - height) / 2,
                    width: maxWidth,
                    height: height
                })
                .style({
                    "shape-rendering": "crispEdges",
                    fill: "rgba(0,0,0,0)",
                    stroke: "rgb(80,80,80)"
                });

            parent.append("line")
                .classed("zero", true)
                .attr({
                    x1: BAR_SIDE_PADDING + that.scale(0),
                    y1: (maxHeight - height) / 2 - 4,
                    x2: BAR_SIDE_PADDING + that.scale(0),
                    y2: (maxHeight + height) / 2 + 4
                })
                .style({
                    "opacity": (that.scale.domain()[0] < 0 && that.scale.domain()[1] > 0) ? 1 : 0,
                    "shape-rendering": "crispEdges",
                    stroke: "rgb(80,80,80)"
                });


        };

        BarRepresentation.prototype.updateScore = function (parent, score, maxHeight, showSortingIndicator, color) {
            var height = Math.min(BAR_SIZE, maxHeight);
            var that = this;
            this.updateSortingIndicator(parent, maxHeight, showSortingIndicator);
            var maxWidth = that.getWidth() - (2 * BAR_SIDE_PADDING);

            if (isNaN(score)) {
                return;
            }

            parent.select("rect.scoreFrameFill")
                .transition()
                .attr({
                    x: BAR_SIDE_PADDING,
                    y: (maxHeight - height) / 2,
                    width: maxWidth,
                    height: height
                });

            parent.select("rect.score")
                .transition()
                .attr({
                    x: BAR_SIDE_PADDING + (score < 0 ? that.scale(score) : that.scale(0)),
                    y: (maxHeight - height) / 2,
                    fill: color || that.color,
                    width: Math.abs(that.scale(0) - that.scale(score)),
                    height: height
                });

            parent.select("rect.scoreFrame")
                .transition()
                .attr({
                    x: BAR_SIDE_PADDING,
                    y: (maxHeight - height) / 2,
                    width: maxWidth,
                    height: height
                });

            parent.select("line.zero")
                .transition()
                .attr({
                    x1: BAR_SIDE_PADDING + that.scale(0),
                    y1: (maxHeight - height) / 2 - 4,
                    x2: BAR_SIDE_PADDING + that.scale(0),
                    y2: (maxHeight + height) / 2 + 4
                })
                .style({
                    "opacity": (that.scale.domain()[0] < 0 && that.scale.domain()[1] > 0) ? 1 : 0
                });
        };

        BarRepresentation.prototype.init = function (column) {
            this.column = column;
            column.header.setMinHeight(s.COLUMN_HEADER_HEIGHT + 30);
        };

        BarRepresentation.prototype.destroy = function (column) {
            this.column.header.rootDomElement.select("g.scoreAxis").remove();
        };

        //------------------------------------------


        function BooleanRepresentation(color) {
            ScoreRepresentation.call(this);
            this.color = color || "gray";
        }

        BooleanRepresentation.prototype = Object.create(ScoreRepresentation.prototype);

        //BooleanRepresentation.prototype.setValueRange = function (valueRange) {
        //this.scale = d3.scale.linear().domain([Math.min(0, valueRange.min), Math.max(0, valueRange.max)]).range([0, this.getWidth()]);
        //};

        BooleanRepresentation.prototype.getWidth = function () {
            return BOOLEAN_COLUMN_WIDTH;
        };

        BooleanRepresentation.prototype.appendScore = function (parent, score, maxHeight, showSortingIndicator, color) {
            var that = this;
            this.appendSortingIndicator(parent, maxHeight, showSortingIndicator);
            parent.append("text")
                .classed("scoreIcon", true)
                .attr({
                    x: that.getWidth() / 2,
                    y: maxHeight / 2 + 4
                })
                .text(score > 0 ? "\uf00c" : "");
        };

        BooleanRepresentation.prototype.updateScore = function (parent, score, maxHeight, showSortingIndicator, color) {
            var that = this;
            this.updateSortingIndicator(parent, maxHeight, showSortingIndicator);
            parent.select("text.scoreIcon")
                .transition()
                .attr({
                    x: that.getWidth() / 2,
                    y: maxHeight / 2 + 4
                })
                .text(score > 0 ? "\uf00c" : "");
        };

        BooleanRepresentation.prototype.init = function (column) {
            column.header.setMinHeight(s.COLUMN_HEADER_HEIGHT);
        };


//---------------------------------------

        function HeatmapRepresentation(size) {
            ScoreRepresentation.call(this);
            this.size = size || 12;
        }

        HeatmapRepresentation.prototype = Object.create(ScoreRepresentation.prototype);

        HeatmapRepresentation.prototype.setValueRange = function (valueRange) {
            var that = this;
            var min = Math.min(0, valueRange.min);
            var max = Math.max(0, valueRange.max);
            var COLOR_LEGEND_HEIGHT = 36;
            this.scale = d3.scale.linear().domain([min, max]).range(["black", "white"]);


            //var axisScale = d3.scale.linear().domain([min, max]).range([0, 35]);
            //
            //var axis = d3.svg.axis()
            //  .scale(axisScale)
            //  .orient("left")
            //  .tickValues([min, max])
            //  //.tickFormat(d3.format(".2f"))
            //  .tickSize(3, 3);
            //
            var ext = this.column.header.rootDomElement.select("g.colorLegend");
            if (ext.empty()) {
                ext = this.column.header.rootDomElement.append("g")
                    .classed("colorLegend", true)
                    .attr({
                        transform: function (d, i) {
                            return "translate(0," + (s.COLUMN_HEADER_HEIGHT) + ")";
                        }
                    });

                var gradient = ext.append("defs")
                    .append("linearGradient")
                    .attr({
                        id: "gradient" + that.column.id,
                        x1: "0%",
                        y1: "0%",
                        x2: "0%",
                        y2: "100%"
                    });

                gradient.append("stop")
                    .attr({
                        offset: "0%"
                    })
                    .style({
                        "stop-color": "white",
                        "stop-opacity": 1
                    });
                gradient.append("stop")
                    .attr({
                        offset: "100%"
                    })
                    .style({
                        "stop-color": "black",
                        "stop-opacity": 1
                    });

                ext.append("rect")
                    .attr({
                        x: that.getWidth() - 14,
                        y: 2,
                        width: 10,
                        height: COLOR_LEGEND_HEIGHT
                    })
                    .style({
                        "shape-rendering": "crispEdges",
                        stroke: "rgb(80,80,80)",
                        fill: "url(#gradient" + that.column.id + ")"
                    });

                ext.append("text")
                    .classed("top", true)
                    .attr({
                        x: that.getWidth() - 16,
                        y: 10
                    })
                    .style({
                        "text-anchor": "end"
                    });

                ext.append("text")
                    .classed("bottom", true)
                    .attr({
                        x: that.getWidth() - 16,
                        y: 2 + COLOR_LEGEND_HEIGHT
                    })
                    .style({
                        "text-anchor": "end"
                    });
            }

            ext.select("text.top")
                .text(uiUtil.formatNumber(max, 2));
            ext.select("text.bottom")
                .text(uiUtil.formatNumber(min, 2));
            //ext.call(axis);

            //ext.selectAll("text").each(function (d, i) {
            //  d3.select(this).style({"text-anchor": i === 0 ? "start" : "end"});
            //})
        };

        HeatmapRepresentation.prototype.getWidth = function () {
            return HEATMAP_COLUMN_WIDTH;
        };

        HeatmapRepresentation.prototype.appendScore = function (parent, score, maxHeight, showSortingIndicator, color) {
            var size = Math.min(this.size, maxHeight);
            var that = this;
            this.appendSortingIndicator(parent, maxHeight, showSortingIndicator);

            parent.append("rect")
                .classed("score", true)
                .attr({
                    x: (that.getWidth() - that.size) / 2,
                    y: (maxHeight - size) / 2,
                    fill: that.scale(score),
                    width: size,
                    height: size
                })
                .style({
                    "shape-rendering": "crispEdges",
                    stroke: "rgb(80,80,80)"
                });
        };

        HeatmapRepresentation.prototype.updateScore = function (parent, score, maxHeight, showSortingIndicator, color) {
            var size = Math.min(this.size, maxHeight);
            var that = this;
            this.updateSortingIndicator(parent, maxHeight, showSortingIndicator);
            parent.select("rect.score")
                .transition()
                .attr({
                    x: (that.getWidth() - that.size) / 2,
                    y: (maxHeight - size) / 2,
                    fill: that.scale(score),
                    width: size,
                    height: size
                });
        };

        HeatmapRepresentation.prototype.init = function (column) {
            this.column = column;
            column.header.setMinHeight(s.COLUMN_HEADER_HEIGHT + 40);
        };

        HeatmapRepresentation.prototype.destroy = function (column) {
            this.column.header.rootDomElement.select("g.colorLegend").remove();
        };


        //---------------------------------------

        function TextRepresentation() {
            ScoreRepresentation.call(this);
        }

        TextRepresentation.prototype = Object.create(ScoreRepresentation.prototype);

        TextRepresentation.prototype.getWidth = function () {
            return TEXT_COLUMN_WIDTH;
        };

        TextRepresentation.prototype.appendScore = function (parent, score, maxHeight, showSortingIndicator, color) {
            var size = Math.min(this.size, maxHeight);
            var that = this;
            this.appendSortingIndicator(parent, maxHeight, showSortingIndicator);
            parent.append("text")
                .classed("score", true)
                .attr({
                    x: 5,
                    y: maxHeight / 2 + 4
                })
                .text(uiUtil.formatNumber(score));
        };

        TextRepresentation.prototype.updateScore = function (parent, score, maxHeight, showSortingIndicator, color) {
            var size = Math.min(this.size, maxHeight);
            var that = this;
            this.updateSortingIndicator(parent, maxHeight, showSortingIndicator);
            parent.select("text.score")
                .transition()
                .attr({
                    x: 5,
                    y: maxHeight / 2 + 4
                })
                .text(uiUtil.formatNumber(score));
        };

        TextRepresentation.prototype.init = function (column) {
            column.header.setMinHeight(s.COLUMN_HEADER_HEIGHT);
        };

        function unwrapSortingStrategy(sortingStrategy) {
            return sortingStrategy.id === "REFERENCE_PATH_DIFFERENCE" ? sortingStrategy.wrappee : sortingStrategy;
        }

        //--------------------------------------

        function SetItemRenderer(column, scoreRepresentation, tooltipTextAccessor) {
            PathItemRenderer.call(this, column, scoreRepresentation);
            this.tooltipTextAccessor = tooltipTextAccessor;
        }

        SetItemRenderer.prototype = Object.create(PathItemRenderer.prototype);

        SetItemRenderer.prototype.enter = function (item, pathWrapper, index, pathWrappers, column) {

            var that = this;
            var originalSortingStrategy = unwrapSortingStrategy(column.sortingStrategy);

            var valueRange = getScoreValueRange(pathWrappers, column.sortingStrategy);

            this.scoreRepresentation.setValueRange(valueRange);
            if (pathWrapper.setTypes.length > 1) {

                var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path);

                var pathGroup = item.append("g").classed("path", true)
                    .on("dblclick", function () {
                        //if (column.sortingStrategy.setType) {
                        //  s.decStickyDataGroupOwners(dataset.id, column.sortingStrategy.groupId);
                        //}
                        delete originalSortingStrategy.setType;
                        listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator, that.column.columnManager);
                    });
                this.scoreRepresentation.appendScore(pathGroup, scoreInfo.score, s.PATH_HEIGHT, typeof originalSortingStrategy.setType === "undefined");


                pathGroup.append("title")
                    .text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));
            }

            var setTypes = item.selectAll("g.setType").data(pathWrapper.setTypes, function (d) {
                return d.id;
            }).enter()
                .append("g")
                .classed("setType", true);

            setTypes.each(function (setType, i) {
                var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path, setType.type);
                d3.select(this).attr({
                    transform: "translate(0," + s.getSetTypeTranslateY(pathWrapper, i) + ")"
                }).on("dblclick", function () {
                    //if (column.sortingStrategy.setType) {
                    //  s.decStickyDataGroupOwners(dataset.id, column.sortingStrategy.groupId);
                    //}
                    originalSortingStrategy.setType = setType.type;
                    listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator, that.column.columnManager);
                });

                that.scoreRepresentation.appendScore(d3.select(this), scoreInfo.score, s.SET_TYPE_HEIGHT, originalSortingStrategy.setType === setType.type || pathWrapper.setTypes.length === 1, config.getSetColorFromSetTypePropertyName(setType.type));

                d3.select(this).append("title")
                    .text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));
            });
        };

        SetItemRenderer.prototype.update = function (item, pathWrapper, index, pathWrappers, column) {
            var that = this;
            var originalSortingStrategy = unwrapSortingStrategy(column.sortingStrategy);
            var valueRange = getScoreValueRange(pathWrappers, column.sortingStrategy);
            this.scoreRepresentation.setValueRange(valueRange);

            if (pathWrapper.setTypes.length > 1) {
                var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path);
                this.scoreRepresentation.updateScore(item, scoreInfo.score, s.PATH_HEIGHT, typeof originalSortingStrategy.setType === "undefined");
                item.select("g.path").select("title").text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));
            }

            var allSetTypes = item.selectAll("g.setType").data(pathWrapper.setTypes, function (d) {
                return d.id;
            });

            allSetTypes.each(function (setType, i) {
                var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path, setType.type);
                d3.select(this).transition()
                    .attr({
                        transform: "translate(0," + s.getSetTypeTranslateY(pathWrapper, i) + ")"
                    });

                that.scoreRepresentation.updateScore(d3.select(this), scoreInfo.score, s.SET_TYPE_HEIGHT, originalSortingStrategy.setType === setType.type || pathWrapper.setTypes.length === 1, config.getSetColorFromSetTypePropertyName(setType.type));
                d3.select(this).select("title").text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));
            });
        };


        //--------------------------

        function PropertyItemRenderer(column, scoreRepresentation, tooltipTextAccessor) {
            PathItemRenderer.call(this, column, scoreRepresentation);
            this.tooltipTextAccessor = tooltipTextAccessor;
        }

        PropertyItemRenderer.prototype = Object.create(PathItemRenderer.prototype);

        PropertyItemRenderer.prototype.enter = function (item, pathWrapper, index, pathWrappers, column) {

            var that = this;
            var valueRange = getScoreValueRange(pathWrappers, column.sortingStrategy);
            var originalSortingStrategy = unwrapSortingStrategy(column.sortingStrategy);

            var propertyIndex = -1;
            for (var i = 0; i < pathWrapper.properties.length; i++) {
                if (pathWrapper.properties[i].name === originalSortingStrategy.property) {
                    propertyIndex = i;
                    break;
                }
            }
            var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path);
            if (propertyIndex >= 0) {
                var property = pathWrapper.properties[propertyIndex];
                var p = item.append("g")
                    .classed("property", true)
                    .attr({
                        transform: "translate(0, " + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + property.getPosYRelativeToParent(pathWrapper.properties)) + ")"
                    });
                that.scoreRepresentation.setValueRange(valueRange);
                that.scoreRepresentation.appendScore(p, scoreInfo.score, property.getHeight(), true, config.getNodePropertyColorFromPropertyName(property.name));

                p.append("title")
                    .text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));
            }
        };

        PropertyItemRenderer.prototype.update = function (item, pathWrapper, index, pathWrappers, column) {
            var that = this;
            var valueRange = getScoreValueRange(pathWrappers, column.sortingStrategy);
            var originalSortingStrategy = unwrapSortingStrategy(column.sortingStrategy);

            var propertyIndex = -1;
            for (var i = 0; i < pathWrapper.properties.length; i++) {
                if (pathWrapper.properties[i].name === originalSortingStrategy.property) {
                    propertyIndex = i;
                    break;
                }
            }
            var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path);
            if (propertyIndex >= 0) {
                var property = pathWrapper.properties[propertyIndex];
                var p = item.select("g.property").transition()
                    .attr({
                        transform: "translate(0, " + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + property.getPosYRelativeToParent(pathWrapper.properties)) + ")"
                    });
                that.scoreRepresentation.setValueRange(valueRange);
                that.scoreRepresentation.updateScore(p, scoreInfo.score, property.getHeight(), true, config.getNodePropertyColorFromPropertyName(property.name));
                p.select("title").text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));
            }
        };

//------------------------------
        function MatrixDatasetItemRenderer(column, scoreRepresentation, tooltipTextAccessor) {
            PathItemRenderer.call(this, column, scoreRepresentation);
            this.tooltipTextAccessor = tooltipTextAccessor;
        }

        MatrixDatasetItemRenderer.prototype = Object.create(PathItemRenderer.prototype);

        MatrixDatasetItemRenderer.prototype.enter = function (item, pathWrapper, index, pathWrappers, column) {

            var that = this;

            var originalSortingStrategy = unwrapSortingStrategy(column.sortingStrategy);

            var datasetId = originalSortingStrategy.datasetId;
            var groupId = originalSortingStrategy.groupId;
            var dataset = getDatasetWrapper(pathWrapper, datasetId);

            var valueRange = getPathDataScoreValueRange(pathWrappers, dataset, column.sortingStrategy);
            this.scoreRepresentation.setValueRange(valueRange);
            //var barScale = d3.scale.linear().domain([Math.min(0, valueRange.min), Math.max(0, valueRange.max)]).range([0, column.getWidth()]);

            var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id);
            var score = scoreInfo.score;

            var posY = dataset.getPosYRelativeToParent(pathWrapper.datasets);

            var datasetGroup = item.append("g")
                .classed("dataset", true)
                .attr({
                    transform: "translate(0," + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + pathWrapper.getPropertyHeight() + posY) + ")"
                })
                .on("dblclick", function () {
                    if (originalSortingStrategy.groupId) {
                        s.decStickyDataGroupOwners(dataset.id, originalSortingStrategy.groupId);
                    }
                    delete originalSortingStrategy.groupId;
                    listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator, that.column.columnManager);
                });

            this.scoreRepresentation.appendScore(datasetGroup, score, dataset.getBaseHeight(), (typeof groupId === "undefined"), (typeof groupId === "undefined") ? dataset.color : d3.hsl(dataset.color).brighter(1).toString());


            datasetGroup.append("title")
                .text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));

        };

        MatrixDatasetItemRenderer.prototype.update = function (item, pathWrapper, index, pathWrappers, column) {

            var that = this;
            var originalSortingStrategy = unwrapSortingStrategy(column.sortingStrategy);

            var groupId = originalSortingStrategy.groupId;
            var datasetId = originalSortingStrategy.datasetId;
            var dataset = getDatasetWrapper(pathWrapper, datasetId);

            var valueRange = getPathDataScoreValueRange(pathWrappers, dataset, column.sortingStrategy);
            this.scoreRepresentation.setValueRange(valueRange);
            //var barScale = d3.scale.linear().domain([Math.min(0, valueRange.min), Math.max(0, valueRange.max)]).range([0, column.getWidth()]);

            var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id);
            var score = scoreInfo.score;

            var posY = dataset.getPosYRelativeToParent(pathWrapper.datasets);

            var datasetPosY = s.PATH_HEIGHT + pathWrapper.getSetHeight() + pathWrapper.getPropertyHeight() + posY;

            var datasetGroup = item.select("g.dataset")
                .attr({
                    transform: "translate(0," + datasetPosY + ")"
                });


            this.scoreRepresentation.updateScore(datasetGroup, score, dataset.getBaseHeight(), (typeof groupId === "undefined"), dataset.color);
            datasetGroup.select("title").text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));

            if (originalSortingStrategy.supportsScoresPerGroup) {
                var allGroups = item.selectAll("g.group")
                    .data(dataset.getVisibleChildren(), function (d) {
                        return d.name
                    });

                allGroups.enter()
                    .append("g")
                    .classed("group", true)
                    .each(function (group, index) {

                        var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id, group.name);
                        var score = scoreInfo.score;

                        var posY = dataset.getBaseHeight();
                        var groups = dataset.getVisibleChildren();

                        for (var j = 0; j < index; j++) {
                            var g = groups[j];
                            posY += g.getHeight();
                        }


                        d3.select(this).attr({
                            transform: "translate(0," + (datasetPosY + group.getPosYRelativeToParent()) + ")"
                        })
                            .on("dblclick", function () {
                                if (originalSortingStrategy.groupId) {
                                    s.decStickyDataGroupOwners(dataset.id, originalSortingStrategy.groupId);
                                }
                                s.incStickyDataGroupOwners(dataset.id, group.name);
                                originalSortingStrategy.groupId = group.name;
                                listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator, that.column.columnManager);
                            });

                        that.scoreRepresentation.appendScore(d3.select(this), score, group.getBaseHeight(), (groupId === group.name), dataset.color);

                        d3.select(this).append("title")
                            .text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));

                    });

                allGroups.each(function (group, index) {
                    var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id, group.name);

                    var posY = dataset.getBaseHeight();
                    var groups = dataset.getVisibleChildren();

                    for (var j = 0; j < index; j++) {
                        var g = groups[j];
                        posY += g.getHeight();
                    }


                    d3.select(this).attr({
                        transform: "translate(0," + (datasetPosY + group.getPosYRelativeToParent()) + ")"
                    });

                    that.scoreRepresentation.updateScore(d3.select(this), scoreInfo.score, group.getBaseHeight(), (groupId === group.name), dataset.color);
                    d3.select(this).select("title").text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));
                });

                allGroups.exit().remove();
            }
        };

        MatrixDatasetItemRenderer.prototype.init = function () {
            PathItemRenderer.prototype.init.call(this);
            var originalSortingStrategy = unwrapSortingStrategy(this.column.sortingStrategy);
            if (originalSortingStrategy.groupId) {
                s.incStickyDataGroupOwners(originalSortingStrategy.datasetId, originalSortingStrategy.groupId);
            }
        };

        MatrixDatasetItemRenderer.prototype.destroy = function () {
            var originalSortingStrategy = unwrapSortingStrategy(this.column.sortingStrategy);
            if (originalSortingStrategy.groupId) {
                s.decStickyDataGroupOwners(originalSortingStrategy.datasetId, originalSortingStrategy.groupId);
            }
            PathItemRenderer.prototype.destroy.call(this);
        };

        function getDatasetWrapper(pathWrapper, datasetId) {
            for (var i = 0; i < pathWrapper.datasets.length; i++) {
                if (pathWrapper.datasets[i].id === datasetId) {
                    return pathWrapper.datasets[i];
                }
            }
        }

        function getTableColumntWrapper(datasetWrapper, tableColumnName) {
            for (var i = 0; i < datasetWrapper.children.length; i++) {
                if (datasetWrapper.children[i].name === tableColumnName) {
                    return datasetWrapper.children[i];
                }
            }
        }

        //------------------------------

        function TableDatasetItemRenderer(column, scoreRepresentation, tooltipTextAccessor) {
            PathItemRenderer.call(this, column, scoreRepresentation);
            this.tooltipTextAccessor = tooltipTextAccessor;
        }

        TableDatasetItemRenderer.prototype = Object.create(PathItemRenderer.prototype);

        TableDatasetItemRenderer.prototype.enter = function (item, pathWrapper, index, pathWrappers, column) {

            var originalSortingStrategy = unwrapSortingStrategy(column.sortingStrategy);

            var that = this;
            var datasetId = originalSortingStrategy.datasetId;
            var attribute = originalSortingStrategy.attribute;
            var datasetWrapper = getDatasetWrapper(pathWrapper, datasetId);
            var tableColumnWrapper = getTableColumntWrapper(datasetWrapper, attribute);

            if (!tableColumnWrapper || !tableColumnWrapper.canBeShown()) {
                return;
            }

            var valueRange = getScoreValueRange(pathWrappers, column.sortingStrategy);
            var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path);


            //var p1 = datasetWrapper.getPosYRelativeToParent(pathWrapper.datasets);
            //var p2 = tableColumnWrapper.getPosYRelativeToParent()

            var p = item.append("g")
                .classed("property", true)
                .attr({
                    transform: "translate(0, " + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + pathWrapper.getPropertyHeight() + datasetWrapper.getPosYRelativeToParent(pathWrapper.datasets) + tableColumnWrapper.getPosYRelativeToParent()) + ")"
                });
            that.scoreRepresentation.setValueRange(valueRange);
            that.scoreRepresentation.appendScore(p, scoreInfo.score, tableColumnWrapper.getHeight(), true, datasetWrapper.color);

            p.append("title")
                .text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));

        };

        TableDatasetItemRenderer.prototype.update = function (item, pathWrapper, index, pathWrappers, column) {
            var that = this;
            var originalSortingStrategy = unwrapSortingStrategy(column.sortingStrategy);
            var datasetId = originalSortingStrategy.datasetId;
            var attribute = originalSortingStrategy.attribute;
            var datasetWrapper = getDatasetWrapper(pathWrapper, datasetId);
            var tableColumnWrapper = getTableColumntWrapper(datasetWrapper, attribute);

            if (!tableColumnWrapper) {
                return;
            }

            var valueRange = getScoreValueRange(pathWrappers, column.sortingStrategy);
            var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path);

            var p = item.select("g.property").transition()
                .attr({
                    transform: "translate(0, " + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + pathWrapper.getPropertyHeight() + datasetWrapper.getPosYRelativeToParent(pathWrapper.datasets) + tableColumnWrapper.getPosYRelativeToParent()) + ")"
                });
            that.scoreRepresentation.setValueRange(valueRange);
            that.scoreRepresentation.updateScore(p, scoreInfo.score, tableColumnWrapper.getHeight(), true, datasetWrapper.color);
            p.select("title")
                .text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));

        };

        TableDatasetItemRenderer.prototype.init = function () {
            PathItemRenderer.prototype.init.call(this);
            var originalSortingStrategy = unwrapSortingStrategy(this.column.sortingStrategy);
            s.incStickyDataGroupOwners(originalSortingStrategy.datasetId, originalSortingStrategy.attribute);

        };

        TableDatasetItemRenderer.prototype.destroy = function () {
            var originalSortingStrategy = unwrapSortingStrategy(this.column.sortingStrategy);
            s.decStickyDataGroupOwners(originalSortingStrategy.datasetId, originalSortingStrategy.attribute);
            PathItemRenderer.prototype.destroy.call(this);
        };

//----------------------

        function overallStatsTooltip(strategy, scoreInfo) {
            return strategy.stat + ": " + scoreInfo.score;
        }

        function perNodeStatsTooltip(strategy, scoreInfo) {
            return strategy.stat + ": " + scoreInfo.score + " (Node: " + scoreInfo.node.properties[config.getNodeNameProperty(scoreInfo.node)] + ")";
        }

        function overallBetweenGroupsStatsTooltip(strategy, scoreInfo) {
            return strategy.stat + ": " + scoreInfo.score + " (Groups: " + scoreInfo.group1 + ", " + scoreInfo.group2 + ")";
        }

        function perNodeBetweenGroupsStatsTooltip(strategy, scoreInfo) {
            return strategy.stat + ": " + scoreInfo.score + " (Groups: " + scoreInfo.group1 + ", " + scoreInfo.group2 + ", Node: " + scoreInfo.node.properties[config.getNodeNameProperty(scoreInfo.node)] + ")";
        }

        function simpleScoreTooltip(strategy, scoreInfo) {
            return strategy.label + ": " + scoreInfo.score;
        }

        function simpleBooleanScoreTooltip(strategy) {
            return strategy.label;
        }

        function nodePresenceTooltip(strategy, scoreInfo) {
            var nodeNames = scoreInfo.nodeIds.map(function (nodeId) {
                var node = dataStore.getNode(nodeId);
                if (node) {
                    return node.properties[config.getNodeNameProperty(node)];
                }
            });
            return "Present nodes: " + nodeNames.toString();
        }

        function setPresenceTooltip(strategy, scoreInfo) {
            var setNames = scoreInfo.setIds.map(function (setId) {
                return setInfo.getSetLabel(setId);
            });
            return "Present sets: " + setNames.toString();
        }

        function referencePathDifferenceWrapperTooltipFactory(wrappeeTooltip) {
            return function (strategy, scoreInfo) {
                if (typeof scoreInfo.refPathScoreInfo === "undefined") {
                    return "No reference path specified";
                }
                return simpleScoreTooltip(strategy, scoreInfo) + "\nReference path: " + wrappeeTooltip(strategy.wrappee, scoreInfo.refPathScoreInfo) + "\nThis path: " + wrappeeTooltip(strategy.wrappee, scoreInfo.pathScoreInfo);
            }
        }


        function ColumnManager() {
            var that = this;
            this.columns = [];
            this.itemRenderers = {};

            listeners.add(function (comparator, source) {
                if (source === that) {
                    return;
                }

                var chain = that.getStrategyChain();
                if (chain.length === pathSorting.sortingManager.currentStrategyChain.length)
                    var allEqual = true;
                for (var i = 0; i < chain.length; i++) {
                    if (chain[i] !== pathSorting.sortingManager.currentStrategyChain[i]) {
                        allEqual = false;
                        break;
                    }
                }

                if (!allEqual) {
                    that.createColumnsFromCurrentStrategyChain();
                    that.notify();
                }
            }, pathSorting.updateType);
        }

        ColumnManager.prototype = {

            createColumnsFromCurrentStrategyChain: function () {
                var that = this;
                this.columns.forEach(function (col) {
                    col.destroy();
                });
                this.columns = [];

                var initialPathSortingStrategies = Object.create(pathSorting.sortingManager.currentStrategyChain);
                //remove filter strategy
                initialPathSortingStrategies.splice(0, 1);
                //remove path id strategy
                initialPathSortingStrategies.splice(initialPathSortingStrategies.length - 1, 1);

                this.columns = initialPathSortingStrategies.map(function (sortingStrategy, i) {
                    return new Column(that, sortingStrategy, i + 1);
                });
                this.updateHeaderHeights();
            },

            init: function (pathList) {
                this.pathList = pathList;
                this.itemRenderers[pathSorting.sortingStrategies.pathLength.id] = function (column, wrapped) {
                    return new SimplePathScoreRenderer(column, wrapped ? new BarRepresentation() : new TextRepresentation(), wrapped ? referencePathDifferenceWrapperTooltipFactory(simpleScoreTooltip) : simpleScoreTooltip);
                };
                this.itemRenderers["SET_COUNT_EDGE_WEIGHT"] = function (column, wrapped) {
                    return new SetItemRenderer(column, new BarRepresentation(), wrapped ? referencePathDifferenceWrapperTooltipFactory(simpleScoreTooltip) : simpleScoreTooltip);
                };
                this.itemRenderers["NUMERICAL_PROPERTY"] = function (column, wrapped) {
                    return new PropertyItemRenderer(column, new BarRepresentation(), wrapped ? referencePathDifferenceWrapperTooltipFactory(simpleScoreTooltip) : simpleScoreTooltip);
                };
                this.itemRenderers["NUMERICAL_TABLE_ATTRIBUTE"] = function (column, wrapped) {
                    return new TableDatasetItemRenderer(column, new BarRepresentation(), wrapped ? referencePathDifferenceWrapperTooltipFactory(simpleScoreTooltip) : simpleScoreTooltip);
                };
                this.itemRenderers["OVERALL_STATS"] = function (column, wrapped) {
                    return new MatrixDatasetItemRenderer(column, new BarRepresentation(), wrapped ? referencePathDifferenceWrapperTooltipFactory(overallStatsTooltip) : overallStatsTooltip);
                };
                this.itemRenderers["PER_NODE_STATS"] = function (column, wrapped) {
                    return new MatrixDatasetItemRenderer(column, new BarRepresentation(), wrapped ? referencePathDifferenceWrapperTooltipFactory(perNodeStatsTooltip) : perNodeStatsTooltip);
                };
                this.itemRenderers["OVERALL_BETWEEN_GROUPS_STATS"] = function (column, wrapped) {
                    return new MatrixDatasetItemRenderer(column, new BarRepresentation(), wrapped ? referencePathDifferenceWrapperTooltipFactory(overallBetweenGroupsStatsTooltip) : overallBetweenGroupsStatsTooltip);
                };
                this.itemRenderers["PER_NODE_BETWEEN_GROUPS_STATS"] = function (column, wrapped) {
                    return new MatrixDatasetItemRenderer(column, new BarRepresentation(), wrapped ? referencePathDifferenceWrapperTooltipFactory(perNodeBetweenGroupsStatsTooltip) : perNodeBetweenGroupsStatsTooltip);
                };
                this.itemRenderers["SELECTED_PATHS"] = function (column) {
                    return new SimplePathScoreRenderer(column, new BooleanRepresentation(), simpleBooleanScoreTooltip);
                };
                this.itemRenderers["SELECTED_NODES"] = function (column) {
                    return new SimplePathScoreRenderer(column, new BooleanRepresentation(), nodePresenceTooltip);
                };
                this.itemRenderers["SELECTED_SETS"] = function (column) {
                    return new SimplePathScoreRenderer(column, new BooleanRepresentation(), setPresenceTooltip);
                };


                this.createColumnsFromCurrentStrategyChain();

            },

            updateHeaderHeights: function () {
                var maxHeight = Number.NEGATIVE_INFINITY;

                this.columns.forEach(function (col) {
                    var height = col.header.minHeight;
                    if (height > maxHeight) {
                        maxHeight = height;
                    }
                });

                d3.select("#columnHeaders")
                    .style({height: maxHeight + "px"});
                d3.select("#columnHeaders svg")
                    .attr({height: maxHeight});
            },

            getStrategyChain: function () {
                var chain = [];
                //var that = this;

                this.columns.forEach(function (column) {
                    chain.push(column.sortingStrategy);
                });

                chain.splice(0, 0, pathSorting.sortingStrategies.pathQueryStrategy);
                chain.push(pathSorting.sortingStrategies.pathId);

                return chain;
            },

            notify: function () {
                var chain = this.getStrategyChain();
                pathSorting.sortingManager.setStrategyChain(chain);
                listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator, this);
            }
            ,

            updateSortOrder: function () {
                this.columns.forEach(function (column) {
                    column.header.updateSortOrder();
                });
            }
            ,

            removeColumn: function (col) {
                var index = this.columns.indexOf(col);
                if (index !== -1) {
                    this.columns.splice(index, 1);
                    col.destroy();

                    this.columns.forEach(function (column, i) {
                        column.header.setPriority(i + 1);
                    });
                    this.updateHeaderHeights();
                    //this.pathList.renderPaths();
                }
            }
            ,

            getItemRenderer: function (sortingStrategy, column) {

                var wrapped = sortingStrategy.id === "REFERENCE_PATH_DIFFERENCE";
                var originalSortingStrategy = unwrapSortingStrategy(sortingStrategy);

                var factory = this.itemRenderers[originalSortingStrategy.id];
                if (factory) {
                    return factory(column, wrapped);
                }

                if (originalSortingStrategy.id.indexOf("CUSTOM") === 0) {
                    return new SimplePathScoreRenderer(column, new BarRepresentation(), wrapped ? referencePathDifferenceWrapperTooltipFactory(simpleScoreTooltip) : simpleScoreTooltip);
                }

                return new PathItemRenderer(column);
            }
            ,

            getMultiFormListItems: function (column) {
                if (column.sortingStrategy.type === sorting.SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE) {
                    return [];
                }
                var that = this;
                return [{
                    text: "Show as Bars",
                    icon: "",
                    callback: function () {
                        d3.selectAll("g.columnItem" + column.id).remove();
                        column.itemRenderer.setScoreRepresentation(new BarRepresentation());
                        column.header.updateWidth();
                        that.updateHeaderHeights();
                        that.notify();
                    }
                },
                    {
                        text: "Show as Heatmap",
                        icon: "",
                        callback: function () {
                            d3.selectAll("g.columnItem" + column.id).remove();
                            column.itemRenderer.setScoreRepresentation(new HeatmapRepresentation());
                            column.header.updateWidth();
                            that.updateHeaderHeights();
                            that.notify();
                        }
                    },
                    {
                        text: "Show as Text",
                        icon: "",
                        callback: function () {
                            d3.selectAll("g.columnItem" + column.id).remove();
                            column.itemRenderer.setScoreRepresentation(new TextRepresentation());
                            column.header.updateWidth();
                            that.updateHeaderHeights();
                            that.notify();
                        }
                    }];
            },

            renderColumns: function (parent, pathWrappers) {

                var svg = d3.select("#columnHeaders svg");
                if (svg.select("g.overlay").empty()) {
                    svg.append("g")
                        .classed("headers", true);
                    svg.append("g")
                        .classed("overlay", true);
                }

                if (!this.addColumnButton) {

                    var that = this;
                    var overlay = svg.select("g.overlay");

                    this.addColumnButton = uiUtil.addOverlayButton(overlay, 0, 0, 16, 16, "\uf067", 16 / 2, 16 - 1, "green", true);
                    this.addColumnButton
                        .attr("display", "none")
                        .on("click", function () {
                            pathSorting.openConfigureSortingDialog(function (sortingStrategy) {
                                that.columns.push(new Column(that, sortingStrategy, that.columns.length + 1));
                                that.updateHeaderHeights();
                                that.notify();
                            });

                        }).append("title").text("Add rank column");


                    $(svg[0]).mouseenter(function () {
                        that.addColumnButton.attr("display", "inline");
                    });

                    $(svg[0]).mouseleave(function () {
                        that.addColumnButton.attr("display", "none");
                    });
                }

                this.columns.forEach(function (col) {
                    col.render(parent, pathWrappers);
                });

                this.addColumnButton.transition().attr({
                    transform: "translate(" + ((this.columns.length > 0 && pathWrappers.length > 0) ? getColumnItemTranlateX(this.columns, this.columns[this.columns.length - 1], pathWrappers, 0) + this.columns[this.columns.length - 1].getWidth() + COLUMN_SPACING : 0) + ", 3)"
                });
            }
            ,

            getWidth: function () {
                return getTotalColumnWidth(this.columns);
            }

        }
        ;

        return new ColumnManager();

    })
;
