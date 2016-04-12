/**
 * Created by Christian on 11.12.2014.
 */
require(['jquery', 'bootstrap'], function ($) {

  $(document).ready(function () {
    navigator.sayswho = (function () {
      var ua = navigator.userAgent, tem,
        M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
      if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return 'IE ' + (tem[1] || '');
      }
      if (M[1] === 'Chrome') {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
      }
      M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
      if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
      return M.join(' ');
    })();

    if (navigator.sayswho.toLowerCase().indexOf("chrome") == -1) {

      $("#whoami").text("You are currently using " +navigator.sayswho +"!");
     $("#chromeWarning").css({
       display: "block"
     });
    }


     $('body').load('landingcontent.html', function () {
        });

  });



  }
)
;
