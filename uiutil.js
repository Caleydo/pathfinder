define(function() {

  return {
    getClampedText: function (text, maxLength) {
      if (text.length > maxLength) {
        return text.substring(0, maxLength);
      }
      return text;
    },

    addOverlayButton: function(parent, x, y, width, height, buttonText, textX, textY, color, showBg) {

    var button = parent.append("g")
      .classed("overlayButton", true)
      .attr({
        transform: "translate(" + (x) + "," + (y) + ")"
      });

      if(showBg) {
        button.append("rect")
          .attr({
            x: 0,
            y: 0,
            width: width,
            height: height
          });
      }

    button.append("text")
      .attr({
        x: textX,
        y: textY
      })
      .style({
        fill: color
      })
      .text(buttonText);

    return button;
  }


  }
});
