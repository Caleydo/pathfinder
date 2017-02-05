/**
 * Created by Samuel Gratzl on 05.02.2017.
 */

import 'file-loader?name=main.html!extract-loader!html-loader!./main.html';
import 'file-loader?name=query.html!extract-loader!html-loader!./query.html';
import 'file-loader?name=list.html!extract-loader!html-loader!./list.html';
import 'file-loader?name=404.html!./404.html';
import 'file-loader?name=robots.txt!./robots.txt';
import 'phovea_ui/src/_bootstrap';
import 'phovea_ui/src/_font-awesome';
import './style.scss';
import './lib/colorbrewer.js';


import './app.js';
