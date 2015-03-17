define(['jquery', 'd3', '../view', './querymodel', '../pathsorting', '../listeners', '../listoverlay'], function ($, d3, View, q, pathSorting, listeners, ListOverlay) {

    var listOverlay = new ListOverlay();

    function BaseGUIElement(parent) {
      this.parent = parent;
      this.translate = {x: 0, y: 0};
    }

    BaseGUIElement.prototype = {
      init: function (domParent) {
        var that = this;
        this.rootElement = domParent.append("g")
          .classed("queryElement", true);

        $(this.rootElement[0]).mouseenter(function () {
          if (that.showRemoveButton()) {
            var size = that.getSize();

            that.rootElement.append("rect")
              .classed("removeButton", true)
              .attr({
                x: size.width - 16,
                y: 0,
                width: 16,
                height: 16,
                fill: "magenta"
              })
              .on("click", function () {
                that.parent.removeChild(that.parent.children.indexOf(that));
              });
          }
        });

        $(this.rootElement[0]).mouseleave(function () {
          that.rootElement.selectAll("rect.removeButton")
            .remove();
        });
      },

      getSize: function () {
        return {width: 100, height: 100};
      },
      update: function () {

      },

      updateParent: function () {
        var currentElement = this;
        while (typeof currentElement.parent != "undefined") {
          currentElement = currentElement.parent;
        }
        currentElement.update();
      },

      showRemoveButton: function () {
        return (typeof this.parent != "undefined");
      },

      getPathQuery: function () {
        return new q.PathQuery();
      },

      remove: function () {
        this.rootElement.remove();
      }
    };

    function ElementContainer(parent, horizontal) {
      BaseGUIElement.call(this, parent);
      this.children = [];
      this.horizontal = horizontal;
      this.padding = 5;
    }

    ElementContainer.prototype = Object.create(BaseGUIElement.prototype);

    ElementContainer.prototype.add = function (childElement) {
      this.children.push(childElement);
      childElement.init(this.rootElement);
      this.updateParent();
    };

    ElementContainer.prototype.insert = function (index, childElement) {
      this.children.splice(index, 0, childElement);
      childElement.init(this.rootElement);
      this.updateParent();
    };

    ElementContainer.prototype.replace = function (child, newChild) {
      var index = this.children.indexOf(child);

      if (index !== -1) {

        this.children[index] = newChild;
        child.remove();
        newChild.init(this.rootElement);
        this.updateParent();
      }
    };

    ElementContainer.prototype.removeChild = function (index) {
      var child = this.children[index];
      child.remove();
      this.children.splice(index, 1);
      this.updateParent();
    };

    ElementContainer.prototype.update = function () {

      var posX = this.padding;
      var posY = this.padding;
      var that = this;

      this.children.forEach(function (child) {
        var childSize = child.getSize();
        child.rootElement.attr("transform", "translate(" + posX + ", " + posY + ")");
        child.translate.x = that.translate.x + posX;
        child.translate.y = that.translate.y + posY;
        child.update();
        if (that.horizontal) {
          posX += childSize.width;
        } else {
          posY += childSize.height;
        }
      });
    };

    ElementContainer.prototype.getMinSize = function () {
      return {width: 100, height: 100};
    };

    ElementContainer.prototype.getSize = function () {
      var height = this.padding * 2;
      var width = this.padding * 2;
      var that = this;

      this.children.forEach(function (child) {
        var childSize = child.getSize();
        if (that.horizontal) {
          width += childSize.width;
          if (height < childSize.height) {
            height = childSize.height;
          }
        } else {
          height += childSize.height;
          if (width < childSize.width) {
            width = childSize.width;
          }
        }
      });

      var minSize = this.getMinSize();

      return {width: Math.max(width, minSize.width), height: Math.max(height, minSize.height)};
    };

    function NodeNameElement(parent) {
      BaseGUIElement.call(this, parent);
    }

    NodeNameElement.prototype = Object.create(BaseGUIElement.prototype);

    NodeNameElement.prototype.init = function (domParent) {
      ElementContainer.prototype.init.call(this, domParent);

      this.rootElement.append("foreignObject")
        .attr({
          width: 100,
          height: 30
        }).append("xhtml:div")
        .style("font", "15px 'Arial'")
        .html('<input type="text" placeholder="Node name" required="required">');
    };

    NodeNameElement.prototype.getSize = function () {
      return {width: 100, height: 30};
    };

    NodeNameElement.prototype.getPathQuery = function () {
      var el = this.rootElement.select("input");
      var val = $(el[0]).val();

      return new q.NodeNameConstraint(val);
    };


    function NodeContainer(parent) {
      ElementContainer.call(this, parent, true);
    }

    NodeContainer.prototype = Object.create(ElementContainer.prototype);

    NodeContainer.prototype.init = function (domParent) {
      ElementContainer.prototype.init.call(this, domParent);

      var that = this;


      //Use jquery mouseenter and mouseleave to prevent flickering of add button
      $(this.rootElement[0]).mouseenter(function () {
        var size = that.getSize();
        if (that.children.length <= 0) {

          that.rootElement.append("rect")
            .classed("addButton", true)
            .attr({
              x: size.width / 2 - 8,
              y: size.height / 2 - 8,
              width: 16,
              height: 16,
              fill: "green"
            })
            .on("click", function () {
              that.add(new NodeNameElement(that));
              d3.select(this).remove();
            });
        }

        that.rootElement.append("rect")
          .classed("addNodeButton", true)
          .attr({
            x: size.width - 16,
            y: size.height / 2 - 16,
            width: 16,
            height: 16,
            fill: "red"
          })
          .on("click", function () {

            var index = that.parent.children.indexOf(that);
            that.parent.insert(index + 1, new NodeContainer(that.parent));
            that.parent.insert(index + 1, new SequenceFiller(that.parent));

            listOverlay.show(d3.select("#queryOverlay"), [{
              text: "Add Node", callback: function () {
              }
            }, {
              text: "Add Edge", callback: function () {
              }
            }], that.translate.x, that.translate.y);
          }
        )

        ;

        that.rootElement.append("rect")
          .classed("addEdgeButton", true)
          .attr({
            x: size.width - 16,
            y: size.height / 2,
            width: 16,
            height: 16,
            fill: "blue"
          })
          .on("click", function () {


            var index = that.parent.children.indexOf(that);

            if (index < that.parent.children.length - 1) {
              var nextChild = that.parent.children[index + 1];
              if (!(nextChild instanceof SequenceFiller)) {
                that.parent.insert(index + 1, new SequenceFiller(that.parent));
              }
            }
            that.parent.insert(index + 1, new EdgeContainer(that.parent));


          });
      });

      $(this.rootElement[0]).mouseleave(function () {
        that.rootElement.selectAll("rect.addButton")
          .remove();
        that.rootElement.selectAll("rect.addNodeButton")
          .remove();
        that.rootElement.selectAll("rect.addEdgeButton")
          .remove();
      });

      var size = this.getSize();

      this.rootElement.append("rect")
        .classed("nodeContainerBg", true)
        .attr({
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          fill: "gray",
          stroke: "black"
        });
    };

    NodeContainer.prototype.update = function () {
      ElementContainer.prototype.update.call(this);

      var size = this.getSize();
      this.rootElement.selectAll("rect.nodeContainerBg")
        .transition()
        .attr({
          width: size.width,
          height: size.height
        });
    };

    NodeContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.NodeMatcher(new q.Constraint());
      }
      return new q.NodeMatcher(this.children[0].getPathQuery());
    };

    function EdgeContainer(parent) {
      ElementContainer.call(this, parent, true);
    }

    EdgeContainer.prototype = Object.create(ElementContainer.prototype);

    EdgeContainer.prototype.init = function (domParent) {
      ElementContainer.prototype.init.call(this, domParent);

      var that = this;

      var size = this.getSize();

      this.rootElement.append("rect")
        .classed("nodeContainerBg", true)
        .attr({
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          fill: "white",
          stroke: "black"
        });

      this.rootElement.append("line")
        .attr({
          x1: 5,
          y1: size.height / 2,
          x2: size.width - 5,
          y2: size.height / 2,
          "stroke-width": "5px",
          stroke: "black"
        });

      $(this.rootElement[0]).mouseenter(function () {
        that.rootElement.append("rect")
          .classed("addNodeButton", true)
          .attr({
            x: size.width - 16,
            y: size.height / 2 - 16,
            width: 16,
            height: 16,
            fill: "red"
          })
          .on("click", function () {

            var index = that.parent.children.indexOf(that);

            if (index < that.parent.children.length - 1) {
              var nextChild = that.parent.children[index + 1];
              if (!(nextChild instanceof SequenceFiller)) {
                that.parent.insert(index + 1, new SequenceFiller(that.parent));
              }
            }
            that.parent.insert(index + 1, new NodeContainer(that.parent));

          }
        )
        ;

        that.rootElement.append("rect")
          .classed("addEdgeButton", true)
          .attr({
            x: size.width - 16,
            y: size.height / 2,
            width: 16,
            height: 16,
            fill: "blue"
          })
          .on("click", function () {

            var index = that.parent.children.indexOf(that);

            that.parent.insert(index + 1, new EdgeContainer(that.parent));
            that.parent.insert(index + 1, new SequenceFiller(that.parent));

          });
      });

      $(this.rootElement[0]).mouseleave(function () {
        that.rootElement.selectAll("rect.addEdgeButton")
          .remove();
        that.rootElement.selectAll("rect.addNodeButton")
          .remove();
      });
    };

    EdgeContainer.prototype.update = function () {
      ElementContainer.prototype.update.call(this);

      var size = this.getSize();
      this.rootElement.selectAll("rect.nodeContainerBg")
        .transition()
        .attr({
          width: size.width,
          height: size.height
        });
    };

    EdgeContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.EdgeMatcher(new q.Constraint());
      }
      return new q.EdgeMatcher(this.children[0].getPathQuery());
    };


    function SequenceFiller(parent) {
      BaseGUIElement.call(this, parent, true);
    }

    SequenceFiller.prototype = Object.create(BaseGUIElement.prototype);

    SequenceFiller.prototype.init = function (domParent) {
      BaseGUIElement.prototype.init.call(this, domParent);

      var size = this.getSize();

      this.rootElement.append("rect")
        .attr({
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          fill: "white",
          stroke: "black"
        });

      this.rootElement.append("line")
        .attr({
          x1: 5,
          y1: size.height / 2,
          x2: size.width - 5,
          y2: size.height / 2,
          "stroke-width": "5px",
          "stroke-linecap": "round",
          "stroke-dasharray": "1, 20",
          stroke: "black"
        });

      var that = this;

      //Use jquery mouseenter and mouseleave to prevent flickering of add button
      $(this.rootElement[0]).mouseenter(function () {
        var size = that.getSize();

        var index = that.parent.children.indexOf(that);

        that.rootElement.append("rect")
          .classed("addNodeButton", true)
          .attr({
            x: size.width / 2 - 16,
            y: size.height / 2 - 8,
            width: 16,
            height: 16,
            fill: "red"
          })
          .on("click", function () {

            var index = that.parent.children.indexOf(that);

            if (index > 0 && index < that.parent.children.length - 1) {
              var prevChild = that.parent.children[index - 1];
              var nextChild = that.parent.children[index + 1];
              if (prevChild instanceof EdgeContainer && nextChild instanceof EdgeContainer) {
                that.parent.replace(that, new NodeContainer(that.parent));
                return;
              }
            }

            that.parent.insert(index, new NodeContainer(that.parent));
            that.parent.insert(index, new SequenceFiller(that.parent));
          });

        that.rootElement.append("rect")
          .classed("addEdgeButton", true)
          .attr({
            x: size.width / 2,
            y: size.height / 2 - 8,
            width: 16,
            height: 16,
            fill: "blue"
          })
          .on("click", function () {

            var index = that.parent.children.indexOf(that);

            if (index > 0 && index < that.parent.children.length - 1) {
              var prevChild = that.parent.children[index - 1];
              var nextChild = that.parent.children[index + 1];
              if (prevChild instanceof NodeContainer && nextChild instanceof NodeContainer) {
                that.parent.replace(that, new EdgeContainer(that.parent));
                return;
              }
            }

            that.parent.insert(index, new EdgeContainer(that.parent));
            that.parent.insert(index, new SequenceFiller(that.parent));

          });
      });

      $(this.rootElement[0]).mouseleave(function () {
        that.rootElement.selectAll("rect.addEdgeButton")
          .remove();
        that.rootElement.selectAll("rect.addNodeButton")
          .remove();
      });
    };

    SequenceFiller.prototype.showRemoveButton = function () {
      var show = BaseGUIElement.prototype.showRemoveButton.call(this)
      if (show) {
        var index = this.parent.children.indexOf(this);
        if (index > 0 && index < this.parent.children.length - 1) {
          var prevChild = this.parent.children[index - 1];
          var nextChild = this.parent.children[index + 1];
          if ((prevChild instanceof EdgeContainer && nextChild instanceof EdgeContainer) ||
            (prevChild instanceof NodeContainer && nextChild instanceof NodeContainer)) {
            return false;
          }
        }
      }
      return show;
    };

    function SequenceContainer(parent) {
      ElementContainer.call(this, parent, true);
    }

    SequenceContainer.prototype = Object.create(ElementContainer.prototype);

    SequenceContainer.prototype.init = function (parent) {
      ElementContainer.prototype.init.call(this, parent);
      this.add(new NodeContainer(this));
      this.add(new SequenceFiller(this));
      this.add(new NodeContainer(this));
    };

    SequenceContainer.prototype.update = function () {

      var sequenceOk = false;

      while (!sequenceOk) {
        var prevChild = 0;
        sequenceOk = true;
        for (var i = 0; i < this.children.length; i++) {
          var child = this.children[i];
          if (prevChild != 0) {
            if ((prevChild instanceof EdgeContainer && child instanceof EdgeContainer) ||
              (prevChild instanceof NodeContainer && child instanceof NodeContainer)) {
              this.insert(i, new SequenceFiller(this));
              sequenceOk = false;
              break;
            }

            if ((prevChild instanceof SequenceFiller && child instanceof SequenceFiller)) {
              this.removeChild(i);
              sequenceOk = false;
              break;
            }
          }
          prevChild = child;
        }
      }

      ElementContainer.prototype.update.call(this);
    }
    ;

    SequenceContainer.prototype.getPathQuery = function () {
      if (this.children.length === 0) {
        return new g.PathQuery();
      } else if (this.children.length === 1) {
        return this.children[0].getPathQuery();
      }

      var prevQuery = 0;
      var prevChild = 0;

      for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];
        if (!(child instanceof SequenceFiller)) {
          var currentQuery = child.getPathQuery();

          if (prevQuery != 0) {

            if (prevChild instanceof SequenceFiller) {
              prevQuery = new q.QueryMatchRegionRelation(prevQuery, currentQuery, q.MatchRegionRelations.greater);
            } else {
              if (prevChild instanceof NodeContainer && child instanceof EdgeContainer) {
                prevQuery = new q.QueryMatchRegionRelation(prevQuery, currentQuery, q.MatchRegionRelations.max1EqualsMin2);
              } else {
                prevQuery = new q.QueryMatchRegionRelation(prevQuery, currentQuery, q.MatchRegionRelations.subsequent);
              }
            }
          } else {
            prevQuery = currentQuery;
          }
        }

        prevChild = child;

      }

      return prevQuery;
    };


    function QueryView(selector) {
      View.call(this, selector);
      this.grabHSpace = false;
      this.grabVSpace = false;
    }

    QueryView.prototype = Object.create(View.prototype);

    QueryView.prototype.getMinSize = function () {
      return {width: 800, height: 200};
    };

    QueryView.prototype.init = function () {
      View.prototype.init.call(this);
      var svg = d3.select(this.parentSelector + " svg");
      d3.select(this.parentSelector).append("button")
        .text("Update")
        .on("click", function () {
          var pathQuery = container.getPathQuery();
          pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getPathQueryStrategy(pathQuery));
          listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
          listeners.notify(listeners.updateType.QUERY_UPDATE, pathQuery);
        });

      var container = new SequenceContainer();
      container.init(svg);
      container.update();

      svg.append("g")
        .attr("id", "queryOverlay")
    };

    return QueryView;

  }
)
;
