/**
 * Created by Christian on 06.11.2015.
 */
define(['jquery', 'd3', '../../listeners', '../../sorting', '../../setinfo', '../../selectionutil',
    '../pathsorting', '../../pathutil', '../../query/pathquery', '../../datastore', '../../config', '../../listoverlay',
    '../../query/queryview', '../../query/queryutil', '../../hierarchyelements', './settings', './datasetrenderer', '../../settings/visibilitysettings', '../../uiutil', './column'],
  function ($, d3, listeners, sorting, setInfo, selectionUtil, pathSorting, pathUtil, pathQuery, dataStore, config, ListOverlay, queryView, queryUtil, hierarchyElements, s, dr, vs, uiUtil, columns) {

    var currentSetTypeId = 0;
    var pageSize = 20;

    function SetRep(setId, type) {
      this.id = setId;
      this.nodeIndices = [];
      this.relIndices = [];
      this.setType = type;
    }

    SetRep.prototype = {
      getHeight: function () {
        return s.SET_HEIGHT;
      },

      //Defines whether this set can be shown. Only considers own data to determine that, not e.g. whether its set type is collapsed.
      canBeShown: function () {
        return vs.isShowNonEdgeSets() || (!vs.isShowNonEdgeSets() && this.relIndices.length > 0);
      }
    };

    function SetType(type) {
      this.id = currentSetTypeId++;
      this.type = type;
      this.sets = [];
      this.setDict = {};
      this.collapsed = true;
      this.nodeIndices = [];
      this.relIndices = [];
    }

    SetType.prototype = {
      getHeight: function () {
        var height = s.SET_TYPE_HEIGHT;
        if (!this.collapsed) {
          this.sets.forEach(function (setRep) {
            if (setRep.canBeShown()) {
              height += setRep.getHeight();
            }
          });
        }
        return height;
      },

      canBeShown: function () {
        return vs.isShowNonEdgeSets() || (!vs.isShowNonEdgeSets() && this.relIndices.length > 0);
      }
    };

    function NodeProperty(name) {
      hierarchyElements.HierarchyElement.call(this);
      this.name = name;
    }

    NodeProperty.prototype = Object.create(hierarchyElements.HierarchyElement.prototype);

    NodeProperty.prototype.getBaseHeight = function () {
      return s.SET_TYPE_HEIGHT;
    };


    function PathWrapper(path) {
      this.path = path;
      this.nodePositions = d3.range(0, path.nodes.length - 1);
      this.rank = "?.";
      this.datasets = [];
      this.addPathSets(path);
      this.addPathProperties(path);
      this.updateDatasets();
    }

    PathWrapper.prototype = {

      getHeight: function () {
        var height = s.PATH_HEIGHT;
        height += this.getSetHeight();
        height += this.getPropertyHeight();
        height += this.getDatasetHeight();
        return height;
      },

      getSetHeight: function () {
        var height = 0;
        this.setTypes.forEach(function (setType) {
          if (setType.canBeShown()) {
            height += setType.getHeight();
          }
        });
        return height;
      },

      getPropertyHeight: function () {
        var height = 0;
        this.properties.forEach(function (prop) {
          if (prop.canBeShown()) {
            height += prop.getHeight();
          }
        });
        return height;
      },

      getDatasetHeight: function () {
        var height = 0;
        this.datasets.forEach(function (dataset) {
          if (dataset.canBeShown()) {
            height += dataset.getHeight();
          }
        });
        return height;
      },

      getWidth: function () {
        return s.NODE_START + this.path.nodes.length * config.getNodeWidth() + this.path.edges.length * s.EDGE_SIZE;
      },

      updateDatasets: function () {
        var datasets = dataStore.getDataSets();
        var that = this;


        datasets.forEach(function (dataset) {
            var d = new dr.DatasetWrapper(dataset, that);
            var exists = false;
            //Use existing wrapper if present
            that.datasets.forEach(function (wrapper) {
              if (wrapper.id === dataset.info.id) {
                d = wrapper;
                //clear children
                d.children = [];
                exists = true;
              }
            });

            if (!exists) {
              that.datasets.push(d);
            }

            if (dataset.info.type === "matrix") {
              Object.keys(dataset.groups).forEach(function (group) {
                var g = new dr.DataGroupWrapper(group, d, that);
                d.children.push(g);
              });
            }
            else if (dataset.info.type === "table") {
              dataset.info.columns.forEach(function (col) {
                if (col.value.type === "real") {
                  var c = new dr.TableColumnWrapper(col, d, that);
                  d.children.push(c);
                }
              });
            }

          }
        );


      },

      addPathProperties: function (path) {
        var numericalProperties = {};

        path.nodes.forEach(function (node) {
          var props = config.getNumericalNodeProperties(node);
          props.forEach(function (prop) {
            if (!numericalProperties[prop]) {
              numericalProperties[prop] = new NodeProperty(prop);
            }
          });
        });

        this.properties = Object.keys(numericalProperties).map(function (key) {
          return numericalProperties[key];
        });

      }

      ,

      addPathSets: function (path) {

        var setTypeDict = {};
        var setTypeList = [];

        for (var i = 0; i < path.nodes.length; i++) {
          var node = path.nodes[i];

          pathUtil.forEachNodeSet(node, function (setType, setId) {
            addSetForNode(setType, setId, i);
          });
        }


        for (var i = 0; i < path.edges.length; i++) {
          var edge = path.edges[i];

          pathUtil.forEachEdgeSet(edge, function (setType, setId) {
            addSetForEdge(setType, setId, i);
          });
        }

        function addSetForNode(type, setId, nodeIndex) {
          var currentSet = addSet(type, setId);
          currentSet.nodeIndices.push(nodeIndex);
          var currentSetType = setTypeDict[type];
          if (currentSetType.nodeIndices.indexOf(nodeIndex) === -1) {
            currentSetType.nodeIndices.push(nodeIndex);
          }
        }

        function addSetForEdge(type, setId, relIndex) {
          var currentSet = addSet(type, setId);
          currentSet.relIndices.push(relIndex);
          var currentSetType = setTypeDict[type];
          if (currentSetType.relIndices.indexOf(relIndex) === -1) {
            currentSetType.relIndices.push(relIndex);
          }
        }

        function addSet(type, setId) {
          var setType = setTypeDict[type];

          if (typeof setType === "undefined") {
            setType = new SetType(type);
            //setType = {type: type, sets: [], setDict: {}, collapsed: false, nodeIndices: [], relIndices: []};
            setTypeDict[type] = setType;
            setTypeList.push(setType);
          }

          var mySet = setType.setDict[setId];
          if (typeof mySet === "undefined") {
            mySet = new SetRep(setId, type);
            //mySet = {id: setId, nodeIndices: [], relIndices: [], setType: type};
            setType.setDict[setId] = mySet;
            setType.sets.push(mySet);
          }
          return mySet;
        }

        //setTypeList.forEach(function (setType) {
        //  delete setType.setDict;
        //});

        this.setTypes = setTypeList;
        this.setTypeDict = setTypeDict;
      }
    };

    function getNodeSetCount(node, setTypeWrapper) {
      var numSets = 0;

      pathUtil.forEachNodeSetOfType(node, setTypeWrapper.type, function (type, setId) {
        if (setTypeWrapper.setDict[setId].canBeShown()) {
          numSets++;
        }
      });
      return numSets;
    }

    function getEdgeSetCount(edge, setTypeWrapper) {
      var numSets = 0;

      pathUtil.forEachEdgeSetOfType(edge, setTypeWrapper.type, function (type, setId) {
        if (setTypeWrapper.setDict[setId].canBeShown()) {
          numSets++;
        }
      });
      return numSets;
    }

    function createChangeObject(changes) {
      return {
        //Identifies what caused the changes, typically some events update types
        cause: changes.cause || "UNKNOWN",
        //Applies, when cross path data, like maximum number of sets of a node, property max or min etc. changes
        crossPathDataChanged: changes.crossPathDataChanged || false,
        //Applies, when the paths of the active page are changed, or their order is changed
        pagePathsChanged: changes.pagePathsChanged || false,
        //Applies, when paths were added or removed
        pathsChanged: changes.pathsChanged || false
      }
    }

    return {

      pathWrappers: [],
      maxNumNodeSets: 0,
      maxNumEdgeSets: 0,
      numericalPropertyDomains: {},
      lastVisiblePathIndex: -1,
      currentPageIndex: 0,

      updateListeners: [],


      init: function () {
        var that = this;

        listeners.add(function (comparator) {
          var changes = that.sortPaths(comparator);
          changes.cause = pathSorting.updateType;
          that.notifyUpdateListeners(createChangeObject(changes));
        }, pathSorting.updateType);

        listeners.add(function () {
          var changes = that.sortPaths(pathSorting.sortingManager.currentComparator);
          changes.cause = s.pathListUpdateTypes.UPDATE_REFERENCE_PATH;
          that.notifyUpdateListeners(createChangeObject(changes));
        }, s.pathListUpdateTypes.UPDATE_REFERENCE_PATH);

        listeners.add(function () {
          var changes = that.updatePathWrappersToQuery();
          changes.cause = listeners.updateType.QUERY_UPDATE;
          that.notifyUpdateListeners(createChangeObject(changes));
        }, listeners.updateType.QUERY_UPDATE);

        listeners.add(function () {
          var changes = that.updateLastVisibleIndex();
          var crossPathDataChanged = that.updateCrossPathData();
          that.updatePagination();
          that.notifyUpdateListeners(createChangeObject({
            cause: listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE,
            pathsChanged: changes.pathsChanged,
            pagePathsChanged: changes.pagePathsChanged,
            crossPathDataChanged: crossPathDataChanged
          }));
        }, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);


        listeners.add(function () {
          var changes = that.sortPaths(pathSorting.sortingManager.currentComparator);

          var changed = that.updateCrossPathData();
          changes.crossPathDataChanged = changed;
          changes.cause = vs.updateTypes.UPDATE_NODE_SET_VISIBILITY
          that.notifyUpdateListeners(createChangeObject(changes));
        }, vs.updateTypes.UPDATE_NODE_SET_VISIBILITY);

        listeners.add(function () {
          that.pathWrappers.forEach(function (pathWrapper) {
            pathWrapper.updateDatasets();
          });
          that.notifyUpdateListeners(createChangeObject({cause: listeners.updateType.DATASET_UPDATE}));
        }, listeners.updateType.DATASET_UPDATE);


        d3.select("#pathPagination li.prevPage a")
          .on("click", function () {
            that.setActivePage(Math.max(0, that.currentPageIndex - 1));
          });
        d3.select("#pathPagination li.nextPage a")
          .on("click", function () {
            that.setActivePage(Math.min(Math.floor(that.lastVisiblePathIndex / pageSize), that.currentPageIndex + 1));
          });

        $("#apply_page_size").on("click", function () {
          var numPaths = parseInt($("#page_size").val());
          if (numPaths !== pageSize) {
            pageSize = numPaths;
            //var changes = that.updateLastVisibleIndex();
            that.updatePagination();
            that.notifyUpdateListeners(createChangeObject({
              cause: "PAGE_SIZE_UPDATE",
              pagePathsChanged: true
            }))
          }
        });
      }
      ,

      addPaths: function (paths) {

        var that = this;
        var pagePathsChanged = false;
        var crossPathDataChanged = false;
        var firstPageIndex = this.currentPageIndex * pageSize;
        paths.forEach(function (path) {
          var pathWrapper = new PathWrapper(path);
          pagePathsChanged = pagePathsChanged || ((that.pathWrappers.length >= firstPageIndex) && (that.pathWrappers.length <= (firstPageIndex + pageSize - 1)));
          that.pathWrappers.push(pathWrapper);
          var pathFiltered = pathQuery.isPathFiltered(path.id);
          var removeFilteredPaths = pathQuery.isRemoveFilteredPaths();

          if (!(pathFiltered && removeFilteredPaths)) {
            crossPathDataChanged = crossPathDataChanged || that.updateCrossPathDataForPathWrapper(pathWrapper);
          }

          if (removeFilteredPaths) {
            //Index increases when path is not filtered, otherwise it stays the same
            if (!pathFiltered) {
              that.lastVisiblePathIndex++;
            }
          } else {
            that.lastVisiblePathIndex = that.pathWrappers.length - 1;
          }
        });


        var c = this.sortPaths().pagePathsChanged;
        pagePathsChanged = pagePathsChanged || c;

        this.updatePagination();

        this.notifyUpdateListeners(createChangeObject({
          cause: "ADD_PATH",
          pagePathsChanged: pagePathsChanged,
          crossPathDataChanged: crossPathDataChanged,
          pathsChanged: true
        }));
      }
      ,

      getPathWrappers: function (all) {

        if (this.lastVisiblePathIndex === -1) {
          return [];
        }

        if (all) {
          return this.pathWrappers.slice(0, this.lastVisiblePathIndex + 1);
        } else {
          var minIndex = this.currentPageIndex * pageSize;
          var maxIndex = Math.min(minIndex + pageSize, this.lastVisiblePathIndex + 1);

          return this.pathWrappers.slice(minIndex, maxIndex);
        }
      },

      getPaths: function (all) {
        return this.getPathWrappers(all).map(function (pathWrapper) {
          return pathWrapper.path;
        });
      },

      updateLastVisibleIndex: function () {
        var prevIndex = this.lastVisiblePathIndex;
        var withinCurrentPage = Math.floor(prevIndex / pageSize) === this.currentPageIndex;
        var pagePathsChanged = false;
        if (pathQuery.isRemoveFilteredPaths()) {
          //We assume that paths are sorted correctly, i.e., filtered paths are last
          for (var i = 0; i < this.pathWrappers.length; i++) {
            if (pathQuery.isPathFiltered(this.pathWrappers[i].path.id)) {
              this.lastVisiblePathIndex = i - 1;
              break;
            } else if (i === this.pathWrappers.length - 1) {
              this.lastVisiblePathIndex = i;
            }
          }

          if (this.currentPageIndex * pageSize > this.lastVisiblePathIndex) {
            this.currentPageIndex = Math.max(0, Math.floor(this.lastVisiblePathIndex / pageSize));
            pagePathsChanged = true;
          }
        } else {
          this.lastVisiblePathIndex = this.pathWrappers.length - 1;
        }
        var pathsChanged = prevIndex !== this.lastVisiblePathIndex;
        withinCurrentPage = withinCurrentPage || Math.floor(this.lastVisiblePathIndex / pageSize) === this.currentPageIndex;
        return {pathsChanged: pathsChanged, pagePathsChanged: pagePathsChanged || (withinCurrentPage && pathsChanged)};
      },

      updateCrossPathData: function () {
        var that = this;
        var changed = false;

        this.numericalPropertyDomains = {};
        this.maxNumEdgeSets = 0;
        this.maxNumNodeSets = 0;
        this.pathWrappers.forEach(function (pathWrapper) {
          var c = that.updateCrossPathDataForPathWrapper(pathWrapper);
          changed = changed || c;
        });
        return changed;
      },


      updateCrossPathDataForPathWrapper: function (pathWrapper) {
        var that = this;
        var changed = false;

        pathWrapper.setTypes.forEach(function (setTypeWrapper) {
          pathWrapper.path.nodes.forEach(function (node) {
            var numNodeSets = getNodeSetCount(node, setTypeWrapper);
            if (numNodeSets > that.maxNumNodeSets) {
              that.maxNumNodeSets = numNodeSets;
              changed = true;
            }


          });

          pathWrapper.path.edges.forEach(function (edge) {
            var numEdgeSets = getEdgeSetCount(edge, setTypeWrapper);
            if (numEdgeSets > that.maxNumEdgeSets) {
              that.maxNumEdgeSets = numEdgeSets;
              changed = true;
            }
          });
        });

        pathWrapper.path.nodes.forEach(function (node) {
          config.getNumericalNodeProperties(node).forEach(function (property) {
            var domain = that.numericalPropertyDomains[property];
            var value = node.properties[property];

            if (!domain) {
              that.numericalPropertyDomains[property] = [Math.min(0, value), Math.max(0, value)];
              changed = true;
            } else {
              var oldMin = domain[0];
              var oldMax = domain[1];
              domain[0] = Math.min(0, Math.min(domain[0], value));
              domain[1] = Math.max(0, Math.max(domain[1], value));
              changed = (oldMin !== domain[0] || oldMax !== domain[1])
            }
          });
        });

        return changed;
      }
      ,

      sortPaths: function (comparator) {
        var that = this;
        comparator = comparator || pathSorting.sortingManager.currentComparator;

        var oldPathIds = this.getPathWrappers(false).map(function (pw) {
          return pw.path.id;
        });


        this.pathWrappers.sort(comparator);

        var c = this.updateLastVisibleIndex();

        var pagePathsChanged = c.pagePathsChanged;

        if (!pagePathsChanged) {
          var newPathIds = this.getPathWrappers(false).map(function (pw) {
            return pw.path.id;
          });

          for (var i = 0; i < oldPathIds.length; i++) {
            if (oldPathIds[i] !== newPathIds[i]) {
              pagePathsChanged = true;
              break;
            }
          }
        }

        var rankingStrategyChain = Object.create(pathSorting.sortingManager.currentStrategyChain);
        rankingStrategyChain.splice(rankingStrategyChain.length - 1, 1);

        var rankComparator = sorting.getComparatorFromStrategyChain(rankingStrategyChain);

        var currentRank = 0;
        var rankCounter = 0;
        var prevWrapper = 0;
        that.pathWrappers.forEach(function (pathWrapper) {
          rankCounter++;
          if (prevWrapper === 0) {
            currentRank = rankCounter;
          } else {
            if (rankComparator(prevWrapper, pathWrapper) !== 0) {
              currentRank = rankCounter;
            }
          }
          if (pathWrapper.rank !== currentRank.toString()) {
            pagePathsChanged = true;
          }
          pathWrapper.rank = currentRank.toString() + ".";
          prevWrapper = pathWrapper;
        });

        return {pagePathsChanged: pagePathsChanged, pathsChanged: c.pathsChanged};
      }
      ,

      updatePathWrappersToQuery: function () {

        var c = this.sortPaths();
        var pagePathsChanged = c.pagePathsChanged;
        var pathsChanged = c.pathsChanged;

        if (pathQuery.isRemoteQuery()) {

          for (var i = 0; i < this.pathWrappers.length; i++) {
            var pathWrapper = this.pathWrappers[i];
            if (pathQuery.isPathFiltered(pathWrapper.path.id)) {
              var numElementsToRemove = this.pathWrappers.length - i;
              this.pathWrappers.splice(i, numElementsToRemove);
              pathsChanged = true;
              break;
            }
          }
        }

        var crossPathDataChanged = this.updateCrossPathData();
        this.updatePagination();
        return {
          pagePathsChanged: pagePathsChanged,
          pathsChanged: pathsChanged,
          crossPathDataChanged: crossPathDataChanged
        }
      },

      addUpdateListener: function (l) {
        this.updateListeners.push(l);
      },

      notifyUpdateListeners: function (changes) {
        var that = this;
        changes = changes || {
            crossPathDataChanged: true,
            pagePathsChanged: true,
            filterStatusChanged: true,
            pathsChanged: true
          };
        this.updateListeners.forEach(function (l) {
          l(changes);
        })
      },

      updatePagination: function () {
        var that = this;
        var pagination = d3.select("#pathPagination");

        var lastPageIndex = Math.floor(this.lastVisiblePathIndex / pageSize);
        var data = d3.range(lastPageIndex + 1);
        var allpages = pagination.selectAll("li.pageNumber").data(data);

        allpages.enter().insert("li", "li.nextPage")
          .classed("pageNumber", true)
          .append("a")
          .text(function (d) {
            return d + 1;
          })
          .on("click", function (pageIndex) {
            that.setActivePage(pageIndex);
          });

        allpages.classed("active", function (d) {
          return d === that.currentPageIndex;
        });

        pagination.select("li.prevPage")
          .classed("disabled", that.currentPageIndex === 0);
        pagination.select("li.nextPage")
          .classed("disabled", that.currentPageIndex === lastPageIndex);


        allpages.exit().remove();
      },


      setActivePage: function (pageIndex) {
        if (pageIndex !== this.currentPageIndex) {
          this.currentPageIndex = pageIndex;
          this.updatePagination();
          this.notifyUpdateListeners(createChangeObject({pagePathsChanged: true}));
        }
      }
    }


  });
