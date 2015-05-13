define(['d3', '../../hierarchyelements', '../../datastore', '../../listeners', './settings'], function (d3, hierarchyElements, dataStore, listeners, s) {

  var BOX_WIDTH = 16;
  var DATASET_HEIGHT = 14;
  var DATA_GROUP_HEIGHT = 80;
  var DATA_GROUP_V_PADDING = 5;
  var DATA_GROUP_CONTENT_HEIGHT = DATA_GROUP_HEIGHT - 2 * DATA_GROUP_V_PADDING;

  function DatasetWrapper(name, minValue, maxValue) {
    hierarchyElements.HierarchyElement.call(this);
    this.collapsed = true;
    this.name = name;
    this.minValue = minValue;
    this.maxValue = maxValue;
  }

  DatasetWrapper.prototype = Object.create(hierarchyElements.HierarchyElement.prototype);

  DatasetWrapper.prototype.getBaseHeight = function () {
    return DATASET_HEIGHT;
  };

  function DataGroupWrapper(name, parent) {
    hierarchyElements.HierarchyElement.call(this, parent);
    this.name = name;
  }

  DataGroupWrapper.prototype = Object.create(hierarchyElements.HierarchyElement.prototype);

  DataGroupWrapper.prototype.getBaseHeight = function () {
    return DATA_GROUP_HEIGHT;
  };

  function DatasetRenderer(pathList) {
    this.pathList = pathList;
  }

  function appendWhisker(parent, iqr, quartile, classNamePrefix, scaleY, pathWrapper, nodeIndex, pathList) {
    if (!isNaN(iqr)) {

      parent.append("line")
        .classed(classNamePrefix + "Whisker", true)
        .attr({
          x1: pathList.getNodePositionX(pathWrapper, nodeIndex, true) - BOX_WIDTH / 4,
          y1: scaleY(iqr),
          x2: pathList.getNodePositionX(pathWrapper, nodeIndex, true) + BOX_WIDTH / 4,
          y2: scaleY(iqr)
        })
        .style({
          stroke: "black"
        });

      parent.append("line")
        .classed(classNamePrefix + "WhiskerConnector", true)
        .attr({
          x1: pathList.getNodePositionX(pathWrapper, nodeIndex, true),
          y1: scaleY(iqr),
          x2: pathList.getNodePositionX(pathWrapper, nodeIndex, true),
          y2: scaleY(quartile)
        })
        .style({
          stroke: "black"
        });
    }
  }

  function updateWhisker(parent, classPrefix, pathWrapper, nodeIndex, pathList) {
    parent.select("line." + classPrefix + "Whisker")
      .transition()
      .attr({
        x1: pathList.getNodePositionX(pathWrapper, nodeIndex, true) - BOX_WIDTH / 4,
        x2: pathList.getNodePositionX(pathWrapper, nodeIndex, true) + BOX_WIDTH / 4
      });
    parent.select("line." + classPrefix + "WhiskerConnector")
      .transition()
      .attr({
        x1: pathList.getNodePositionX(pathWrapper, nodeIndex, true),
        x2: pathList.getNodePositionX(pathWrapper, nodeIndex, true)
      });
  }

  DatasetRenderer.prototype = {

    render: function () {
      var that = this;
      var allDatasetGroups = that.pathList.parent.selectAll("g.pathContainer g.datasetGroup")
        .data(that.pathList.pathWrappers, function (d) {
          return d.path.id;
        });

      allDatasetGroups.attr({
        transform: function (d) {
          return "translate(0," + (s.PATH_HEIGHT + d.getSetHeight()) + ")";
        }
      });

      allDatasetGroups.each(function (pathWrapper) {

        var allDatasets = d3.select(this).selectAll("g.dataset")
          .data(pathWrapper.datasets);

        var dataset = allDatasets.enter()
          .append("g")
          .classed("dataset", true);

        dataset.append("text")
          .attr("class", "collapseIconSmall");

        allDatasets.selectAll("text.collapseIconSmall")
          .attr("x", 5)
          .attr("y", s.SET_TYPE_HEIGHT)
          .text(function (d) {
            return d.collapsed ? "\uf0da" : "\uf0dd";
          })
          .on("click", function (d) {
            var collapsed = !d.collapsed;
            if (d3.event.ctrlKey) {
              listeners.notify(s.pathListUpdateTypes.COLLAPSE_ELEMENT_TYPE, {
                type: d.name,
                collapsed: collapsed
              });
            } else {
              d.collapsed = collapsed;
              d3.select(this).text(d.collapsed ? "\uf0da" : "\uf0dd");

              that.pathList.updatePathList();

            }
            //updateAggregateList(parent);
          });

        var datasetLabel = dataset.append("text")
          .attr({
            x: s.SET_TYPE_INDENT,
            y: DATASET_HEIGHT,
            "clip-path": "url(#SetLabelClipPath)"
          })
          .text(function (d) {
            return d.name;
          });

        datasetLabel.append("title")
          .text(function (d) {
            return d.name;
          });

        allDatasets.attr({
          transform: function (d, i) {
            var posY = 0;
            var datasetWrappers = pathWrapper.datasets;

            for (var j = 0; j < i; j++) {
              var datasetWrapper = datasetWrappers[j];
              if (datasetWrapper.canBeShown()) {
                posY += datasetWrapper.getHeight();
              }
            }
            return ("translate(0, " + posY + ")");
          }
        });

        allDatasets.each(function (dataset) {

          if (dataset.collapsed) {
            d3.select(this).selectAll("g.dataGroup").remove();
            return;
          }

          var scaleY = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([DATA_GROUP_CONTENT_HEIGHT, 0]);

          var allGroups = d3.select(this).selectAll("g.dataGroup")
            .data(dataset.children);
          var group = allGroups.enter()
            .append("g")
            .classed("dataGroup", true);

          group.append("rect")
            .classed("background", true)
            .attr({
              x: s.SET_TYPE_INDENT,
              y: DATA_GROUP_V_PADDING,
              width: that.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH,
              height: DATA_GROUP_CONTENT_HEIGHT
            })
            .style({
              //stroke: "black",
              fill: "rgba(240,240,240,0.5)"
            });

          var yAxis = d3.svg.axis()
            .scale(scaleY)
            .orient("left")
            .ticks(3);

          group.append("g")
            .classed("boxPlotAxis", true)
            .attr("transform", "translate(" + s.NODE_START + "," + DATA_GROUP_V_PADDING + ")")
            .call(yAxis);

          var groupLabel = group.append("text")
            .attr({
              x: s.SET_TYPE_INDENT,
              y: 14,
              "clip-path": "url(#SetLabelClipPath)"
            })
            .text(function (d) {
              return d.name;
            });

          groupLabel.append("title")
            .text(function (d) {
              return d.name;
            });

          allGroups.attr({
            transform: function (d, i) {
              var posY = DATASET_HEIGHT;
              var groups = dataset.children;

              for (var j = 0; j < i; j++) {
                var g = groups[j];
                if (g.canBeShown()) {
                  posY += g.getHeight();
                }
              }
              return ("translate(0, " + posY + ")");
            }
          });

          allGroups.each(function (group) {

            d3.select(this).select("rect.background")
              .transition()
              .attr({
                width: that.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH
              });


            var allNodeData = d3.select(this).selectAll("g.nodeData")
              .data(pathWrapper.path.nodes);


            var nodeData = allNodeData.enter()
              .append("g")
              .classed("nodeData", true)
              .attr({
                transform: "translate(0," + DATA_GROUP_V_PADDING + ")"
              });

            nodeData.append("title")
              .text(function (d) {
                var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
                return "Elements: " + stats.data.length +
                  "\nNaNs: " + stats.nans +
                  "\nMedian: " + stats.median +
                  "\n1st Quartile: " + stats.quartile25 +
                  "\n3rd Quartile: " + stats.quartile75 +
                  "\nLowest value in 1.5xIQR range: " + stats.iqrMin +
                  "\nHighest value in 1.5xIQR range: " + stats.iqrMax +
                  "\nMin: " + stats.min +
                  "\nMax: " + stats.max;
              });

            nodeData.append("rect")
              .classed("box", true)
              .attr({
                x: function (d, i) {
                  return that.pathList.getNodePositionX(pathWrapper, i, true) - BOX_WIDTH / 2;
                },
                y: function (d) {
                  var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
                  return scaleY(stats.quartile75);
                },
                width: BOX_WIDTH,
                height: function (d) {
                  var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
                  return scaleY(stats.quartile25) - scaleY(stats.quartile75);
                }
              })
              .style({
                fill: "gray",
                stroke: "black"
              });

            d3.select(this).selectAll("g.nodeData rect.box")
              .transition()
              .attr({
                x: function (d, i) {
                  return that.pathList.getNodePositionX(pathWrapper, i, true) - BOX_WIDTH / 2;
                },
                y: function (d) {
                  var stats = dataStore.getStatsForNode(d, dataset.name, group.name);

                  return scaleY(stats.quartile75);
                  //return scaleY(stats.quartile25);
                },
                width: BOX_WIDTH,
                height: function (d) {
                  var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
                  return scaleY(stats.quartile25) - scaleY(stats.quartile75);
                }
              });

            nodeData.append("line")
              .classed("median", true)
              .attr({
                x1: function (d, i) {
                  return that.pathList.getNodePositionX(pathWrapper, i, true) - BOX_WIDTH / 2;
                },
                y1: function (d) {
                  var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
                  return scaleY(stats.median);
                },
                x2: function (d, i) {
                  return that.pathList.getNodePositionX(pathWrapper, i, true) + BOX_WIDTH / 2;
                },
                y2: function (d) {
                  var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
                  return scaleY(stats.median);
                }
              })
              .style({
                stroke: "white"
              });

            d3.select(this).selectAll("g.nodeData line.median")
              .transition()
              .attr({
                x1: function (d, i) {
                  return that.pathList.getNodePositionX(pathWrapper, i, true) - BOX_WIDTH / 2;
                },
                y1: function (d) {
                  var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
                  return scaleY(stats.median);
                },
                x2: function (d, i) {
                  return that.pathList.getNodePositionX(pathWrapper, i, true) + BOX_WIDTH / 2;
                },
                y2: function (d) {
                  var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
                  return scaleY(stats.median);
                }
              });

            nodeData.each(function (node, nodeIndex) {

              var stats = dataStore.getStatsForNode(node, dataset.name, group.name);

              appendWhisker(d3.select(this), stats.iqrMin, stats.quartile25, "lower", scaleY, pathWrapper, nodeIndex, that.pathList);
              appendWhisker(d3.select(this), stats.iqrMax, stats.quartile75, "upper", scaleY, pathWrapper, nodeIndex, that.pathList);

            });


            allNodeData.each(function (node, nodeIndex) {

              updateWhisker(d3.select(this), "lower", pathWrapper, nodeIndex, that.pathList);
              updateWhisker(d3.select(this), "upper", pathWrapper, nodeIndex, that.pathList);

              var allPoints = d3.select(this).selectAll("g.dataPoint")
                .data(dataStore.getDataForNode(node, dataset.name, group.name));

              var point = allPoints.enter()
                .append("g")
                .classed("dataPoint", true);

              point.append("circle")
                .attr({

                  cx: that.pathList.getNodePositionX(pathWrapper, nodeIndex, true),

                  cy: function (d) {
                    return scaleY(d);
                  },
                  r: 1

                })
                .style({
                  opacity: 2,
                  fill: "red"
                });

              allPoints.selectAll("circle")
                .transition()
                .attr({
                  cx: that.pathList.getNodePositionX(pathWrapper, nodeIndex, true),

                  cy: function (d) {
                    return scaleY(d);
                  }
                });

              allPoints.exit().remove();

            });

            allNodeData.exit().remove();

          });

        });

        allDatasets.exit().remove();

      });

    }
  };

  return {
    DatasetWrapper: DatasetWrapper,
    DataGroupWrapper: DataGroupWrapper,
    DatasetRenderer: DatasetRenderer
  };

});
