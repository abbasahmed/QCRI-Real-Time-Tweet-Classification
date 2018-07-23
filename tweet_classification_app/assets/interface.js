var packet = {
  collection_code: '',
  class_labels: '',
  damage_labels: '',
  sentiment_labels: '',
  image_existence_labels: '',
  total_labels: 0,
};

var locals = {
  display_sentiment: '',
  display_aidr: '',
  display_severity: '',
  query_code: '',
};

var slider_values = {
  damage: 0,
  class: 0,
  sentiment: 0,
}

var active_flag = 1;

var socket = io.sails.connect();


var icons = {
  'relevant_information': 'fa-thumbs-up',
  'personal': 'fa-user',
  'injured_or_dead_people': 'fa-medkit',
  'infrastructure_and_utilities_damage': 'fa-building',
  'caution_and_advice': 'fa-exclamation-triangle',
  'affected_individual': 'fa-diagnoses',
  'not_related_or_irrelevant': 'fa-question-circle',
  'donation_and_volunteering': 'fa-people-carry',
  'sympathy_and_support': 'fa-hands-helping',
}

var colors = {
  'neutral': 'yellow',
  'positive': 'green',
  'negative': 'red',
}

var mbAttr = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
  '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
  'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
  mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
// street and satellite view from mapbox
var streets = L.tileLayer(mbUrl, {
    id: 'mapbox.streets',
    attribution: mbAttr
  }),
  satellite = L.tileLayer(mbUrl, {
    id: 'mapbox.streets-satellite',
    attribution: mbAttr
  });
var baseLayers = {
  "Streets": streets,
  "Satellite": satellite
};

var mcg = L.markerClusterGroup();

var overlays = {
  "Markers": mcg
};

var map = L.map('map', {
  center: [20.0, 5.0],
  minZoom: 2,
  zoom: 2,
  zoomControl: true,
  worldCopyJump: true,
  layers: [streets, mcg]
});

map.zoomControl.setPosition('topright');

// setting the map with diffrent properties + different layers
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdomains: ['a', 'b', 'c']
}).addTo(map);

L.control.layers(baseLayers, overlays, {position: 'bottomleft'}).addTo(map);
map.invalidateSize();
//Accordions are the collapsable and expandable categories in green
$(document).ready(function () {
    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggleClass('active');
        $(this).toggleClass('active');
    });
});

// Start button enables the simulator

var windoww = "";

function localizer(sentiment_tag, severity_tag, aidr_tag) {
  locals.display_sentiment = sentiment_tag;
  locals.display_aidr = aidr_tag;
  locals.display_severity = severity_tag;
}


function data(collection_code, class_labels, damage_labels, sentiment_labels, image_existence_labels) {
  packet.collection_code = collection_code;
  packet.class_labels = class_labels;
  packet.damage_labels = damage_labels;
  packet.sentiment_labels = sentiment_labels;
  packet.image_existence_labels = image_existence_labels;
  packet.total_labels = class_labels.length + damage_labels.length + sentiment_labels.length + image_existence_labels.length;
}

function Action(el) {
  my_window = window.open('http://localhost:1337/sim/add', '', 'width=,height=,resizable=no');
  windoww = my_window;
  my_window.focus();
  active_flag = 0;
  task(event);
  if (el.value === "Start")
    el.value = "Stop";
  else
    el.value = "Start";
}



//  <!-- This takes the labels from the database which have underscores and removes them, and capitalizes the first character -->

// open the navigation bar
function openNav() {
  $("#SpanHeader").toggleClass("Black");
  $("#SpanHeader2").toggleClass("Black");
  document.getElementById("myNav").style.width = "30%";
}
// close the navigation bar
function closeNav() {
  $("#SpanHeader").removeClass("Black");
  $("#SpanHeader2").toggleClass("Black");
  document.getElementById("myNav").style.width = "0%";
}


function tweet_loader(tQuery, flag) {
  //1 for not active
  //0 for active
  var timer = 5000;

  if(flag == 1){
    timer = 0;
  }

  var loader = setInterval(
    function() {
      socket.get(tQuery, function(tweets) {
        mcg.clearLayers();
        map.addLayer(mcg);
        for (i in tweets.sim) {
          let latitude = tweets.sim[i].latitude;
          let longitude = tweets.sim[i].longitude;
          let tweet_text = tweets.sim[i].tweet_text;
          let img_src = tweets.sim[i].image_physical_location;
          let class_label = labelize(tweets.sim[i].aidr_class_label);
          let sentiment_label = tweets.sim[i].sentiment;
          let severity_label = tweets.sim[i].image_damage_class;

          var tweet_link = linkify(tweet_text);

          let marker_icon = iconMaker(class_label, sentiment_label);

          var marker = new L.marker([longitude, latitude], {
            icon: marker_icon
          }).addTo(mcg);

          // in the database, the records that are null for severity, we set it to unknown, and those which say None we set it to Zero
          if (severity_label == '') {
            severity_label = "Unknown";
          }
          if (severity_label == 'None') {
            severity_label = "Zero";
          }

          if(img_src != ''){
            marker.bindPopup('<p>' + tweet_link + '</p>' + "<a target='" + '_blank' + "' href='" + img_src + "'><img class='size'  src='" + img_src + "'/></a>" + '<p>' + '<b>' + locals.display_aidr + '</b>' + class_label + '</p>' + '<p>' + '<b>' +
              locals.display_sentiment + '</b>' + sentiment_label + '</p>' + '<p>' + '<b>' + locals.display_severity + '</b>' + severity_label + '</p>');
          } else {
            marker.bindPopup('<p>' + tweet_link + '</p>' + '<p>' + '<b>' + locals.display_aidr + '</b>' + class_label + '</p>' + '<p>' + '<b>' + locals.display_sentiment + '</b>' + sentiment_label + '</p>' + '<p>' + '<b>' +
              locals.display_severity + '</b>' + severity_label + '</p>');
          }
        }
        // this is to ensure the querying is done for new markers only
        if (tweets.sim.length != 0) {
          let new_time = tweets.sim[0].createtime;
          let curr_query = query_code;
          var index = curr_query.indexOf("q8");
          var new_query = curr_query.replace(curr_query.substring(index + 3), new_time);
          query_code = new_query;
        }
      });
      if(flag == 1){
        clearInterval(loader);
      }
    }, timer
  );

}

function dyrender(s1, s2, s3) {
  var num = document.getElementById(s1);
  var td = document.createElement('td');
  var tr = document.createElement('tr');
  var h4 = document.createElement('h4');
  var div = document.createElement('div');
  div.id = s2;
  var txt = document.createTextNode(s3);
  h4.appendChild(txt);
  td.appendChild(h4);
  tr.appendChild(td);
  num.appendChild(tr);
  td = document.createElement('td');
  tr = document.createElement('tr');
  td.appendChild(div);
  tr.appendChild(td);
  num.appendChild(tr);
  td = document.createElement('td');
  tr = document.createElement('tr');
  td.appendChild(document.createTextNode('\u00A0'));
  tr.appendChild(td);
  num.appendChild(tr);
}

// function filler(){
//
//     var acc = document.getElementsByClassName("accordion");
//     var i;
//     for (i = 0; i < acc.length; i++) {
//       acc[i].addEventListener("click", function() {
//         this.classList.toggle("active");
//         var panel = this.nextElementSibling;
//         if (panel.style.display === "block") {
//           panel.style.display = "none";
//         } else {
//           panel.style.display = "block";
//         }
//       });
//     }
//
//     if(packet.total_labels != 0){
//       if(packet.damage_labels.length != 0){
//         for(i in packet.damage_labels){
//           var check_val = 'damage_check'+i;
//           var nice_label = packet.damage_labels[i];
//           if (nice_label == 'null') {
//             nice_label = 'Unknown';
//           } else if (nice_label == 'None') {
//             nice_label = 'Zero';
//           } else if (nice_label == 'Severe') {
//             nice_label = 'High';
//           }
//           $('#severity').html($('#severity').html()
//           +'<div class="form-check">'
//           +'<input class="form-check-input" type="checkbox" class = "severity" value="'+packet.damage_labels[i]+'" id="'+check_val+'" onclick="task(event);">'
//           +'  <label align = "left" class="form-check-label" for="'+check_val+'"> '+nice_label+' </label>'
//           +"</div>");
//         }
//
//       }
//     }
// }

function fillupAccordions() {

  var acc = document.getElementsByClassName("accordion");
  var i;
  for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var panel = this.nextElementSibling;
      if (panel.style.display === "block") {
        panel.style.display = "none";
      } else {
        panel.style.display = "block";
      }
    });
  }

  if (packet.total_labels != 0) {
    if (packet.damage_labels.length != 0) {
      //<!-- severitymaster is the id of the div tag under the Severity category button.-->
      dyrender('severitymaster', 'severity', '');

      for (i in packet.damage_labels) {
        //<!-- Creating the checkboxes and labels dynamically for severity -->

        var slc1 = document.getElementById('severity');
        var ele = packet.damage_labels[i];
        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.align = "left";
        checkbox.className = "severity";
        checkbox.value = ele;
        slc1.appendChild(checkbox);
        var label = document.createElement('label')
        label.htmlFor = ele;
        label.align = "left";
        label.setAttribute('style', 'color:#000000;');
        var te = ele;
        // if there is no severity, do not display anything
        if ((ele == "null" || ele == '') && packet.damage_labels.length == 1) {
          te = "";
          checkbox.style.display = 'none';
          var x = document.getElementById("damage_accordion");
          x.innerHTML = "";
        }
        if (ele == 'null') {
          te = 'Unknown';
        } else if (ele == 'None') {
          te = 'Zero';
        } else if (ele == 'Severe') {
          te = 'High';
        }
        label.appendChild(document.createTextNode(te + ' ' + 'Severity'));
        slc1.appendChild(label);
        slc1.appendChild(document.createElement("br"));
        checkbox.setAttribute("onClick", "task(event);");

      }

      var slid1 = document.getElementById('slidecontainer1');
      var slid1in = document.createElement('input');
      slid1in.type = "range"
      slid1in.className = "slider";
      slid1in.id = "myRange";
      slid1in.min = "0";
      slid1in.max = "1";
      slid1in.step = "0.0001";
      slid1in.value = "0"
      var slid1inp = document.createElement('p');
      slid1inp.className = "paralign";
      var slid1inspan = document.createElement('span');
      slid1inspan.className = "smallbutton";
      slid1inspan.id = "damage_slider";
      slid1inp.appendChild(slid1inspan);
      slid1.appendChild(slid1in);
      slid1.appendChild(slid1inp);

    }
    if (packet.class_labels.length != 0) {
      //  <!-- aidrmaster is the id of the div tag under the AIDR Label category button.-->
      dyrender('aidrmaster', 'aidr', '');
      for (i in packet.class_labels) {
        //  <!-- Creating the checkboxes and labels dynamically for aidr-->
        var slc2 = document.getElementById('aidr');
        var ele = packet.class_labels[i];
        var check = ele.charAt(0).toUpperCase() + ele.slice(1);
        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "aidr";
        checkbox.value = ele;
        slc2.appendChild(checkbox);
        var label = document.createElement('label')
        label.setAttribute('style', 'color:#000000;');
        label.htmlFor = ele;
        // if there is no aidr, do not display anything
        if ((ele == "null" || ele == '') && packet.class_labels.length == 1) {
          checkbox.style.display = 'none';
          var x = document.getElementById("class_accordion");
          x.innerHTML = "";
        }
        label.appendChild(document.createTextNode(check.replace(/_/g, ' ')));
        slc2.appendChild(label);
        slc2.appendChild(document.createElement("br"));
        checkbox.setAttribute("onClick", "task(event);");

      }

      var slid2 = document.getElementById('slidecontainer2');
      var slid2in = document.createElement('input');
      slid2in.type = "range"
      slid2in.className = "slider";
      slid2in.id = "myRange1";
      slid2in.min = "0";
      slid2in.max = "1";
      slid2in.step = "0.0001";
      slid2in.value = "0"
      var slid2inp = document.createElement('p');
      slid2inp.className = "paralign";
      var slid2inspan = document.createElement('span');
      slid2inspan.className = "smallbutton";
      slid2inspan.id = "class_slider";
      slid2inp.appendChild(slid2inspan);
      slid2.appendChild(slid2in);
      slid2.appendChild(slid2inp);

    }
    if (packet.sentiment_labels.length != 0) {
      //  <!-- sentimentmaster is the id of the div tag under the Sentiment category button.-->

      dyrender('sentimentmaster', 'sentiment', '');

      for (i in packet.sentiment_labels) {
        // <!-- Creating the checkboxes and labels dynamically for sentiment -->

        var slc3 = document.getElementById('sentiment');
        var ele = packet.sentiment_labels[i];
        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "sentiment";
        checkbox.value = ele;
        slc3.appendChild(checkbox);
        var label = document.createElement('label')
        label.htmlFor = ele;
        label.setAttribute('style', 'color:#000000;');
        te = ele;
        // if there is no aidr, do not display anything
        if ((ele == "null" || ele == '') && packet.sentiment_labels.length == 1) {
          te = "";
          checkbox.style.display = 'none';
          var x = document.getElementById("sentiment_accordion");
          x.innerHTML = "";
        }
        label.appendChild(document.createTextNode(te));
        slc3.appendChild(label);
        slc3.appendChild(document.createElement("br"));
        checkbox.setAttribute("onClick", "task(event);");

      }
      var slid3 = document.getElementById('slidecontainer3');
      var slid3in = document.createElement('input');
      slid3in.type = "range"
      slid3in.className = "slider";
      slid3in.id = "myRange2";
      slid3in.min = "0";
      slid3in.max = "1";
      slid3in.step = "0.0001";
      slid3in.value = "0"
      var slid3inp = document.createElement('p');
      slid3inp.className = "paralign";
      var slid3inspan = document.createElement('span');
      slid3inspan.className = "smallbutton";
      slid3inspan.id = "sentiment_slider";
      slid3inp.appendChild(slid3inspan);
      slid3.appendChild(slid3in);
      slid3.appendChild(slid3inp);
    }
    if (packet.image_existence_labels.length != 0) {
      //  <!-- imagemaster is the id of the div tag under the Image category button.-->

      dyrender('imagemaster', 'image', '');

      for (i in packet.image_existence_labels) {
        //<!-- Creating the checkboxes and labels dynamically for sentiment -->

        var slc4 = document.getElementById("image");
        var ele = packet.image_existence_labels[i];
        var check = ele.charAt(0).toUpperCase() + ele.slice(1);
        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "image";
        checkbox.value = ele;
        slc4.appendChild(checkbox);
        var label = document.createElement('label')
        label.htmlFor = ele;
        label.setAttribute('style', 'color:#000000;');
        label.appendChild(document.createTextNode(check));
        slc4.appendChild(label);
        slc4.appendChild(document.createElement("br"));
        checkbox.setAttribute("onClick", "task(event);");

      }
    }
  }
  //<!-- Slider  -->
  var slider = document.getElementById("myRange");
  var output = document.getElementById("damage_slider");
  output.innerHTML = slider.value;
  slider.oninput = function() {
    output.innerHTML = this.value;
  }
  slider.onmouseup = function() {
    task(event);
  }
  var slider1 = document.getElementById("myRange1");
  var output1 = document.getElementById("class_slider");
  output1.innerHTML = slider1.value;
  slider1.oninput = function() {
    output1.innerHTML = this.value;
  }
  slider1.onmouseup = function() {
    task(event);
  }
  var slider2 = document.getElementById("myRange2");
  var output2 = document.getElementById("sentiment_slider");
  output2.innerHTML = slider2.value;
  slider2.oninput = function() {
    output2.innerHTML = this.value;
  }
  slider2.onmouseup = function() {
    task(event);
  }
}

// <!-- For aidr, sentiment and image damage class, we find which checboxes are checked so that we can query appropriately -->
// <!-- These are stored in str, str2, str3 -->
// <!-- Then an appropriate query is written - query1, query2 and query3 -->
// <!-- for image, query4 is written directly -->

function task(e) {
  var checks = document.getElementsByClassName('severity');
  var str = '';
  if (locals.display_severity == "Severity: " || locals.display_severity == " ") {
    for (i = 0; i < packet.damage_labels.length; i++) {
      if (checks[i].checked === true) {
        str += checks[i].value + " ";
      }
    }
  }
  if (str != '') {
    str = str.trim();
    str = str.split(' ');
  }
  var checks2 = document.getElementsByClassName('aidr');
  var str2 = '';
  if (locals.display_aidr == "Humanitarian Category: " || locals.display_aidr == " ") {
    for (j = 0; j < packet.class_labels.length; j++) {
      if (checks2[j].checked === true) {
        str2 += checks2[j].value + " ";
      }
    }
  }
  if (str2 != '') {
    str2 = str2.trim();
    str2 = str2.split(' ');
  }
  var checks3 = document.getElementsByClassName('sentiment');
  var str3 = '';
  if (locals.display_sentiment == "Sentiment: " || locals.display_sentiment == " ") {
    for (k = 0; k < packet.sentiment_labels.length; k++) {
      if (checks3[k].checked === true) {
        str3 += checks3[k].value + " ";
      }
    }
  }
  if (str3 != '') {
    str3 = str3.trim();
    str3 = str3.split(' ');
  }
  query4 = '';
  var checks4 = document.getElementsByClassName('image');
  if (checks4[0].checked == true && checks4[1].checked == false) {
    query4 = "no";
  } else if (checks4[1].checked == true && checks4[0].checked == false) {
    query4 = "yes";
  } else if (checks4[1].checked == true && checks4[0].checked == true) {
    query4 = "both1";
  } else if (checks4[1].checked == false && checks4[0].checked == false) {
    query4 = "both2";
  }
  var idc = {
    'null': false,
    'None': false,
    'Mild': false,
    'Severe': false
  };
  query = '';
  query1 = '';
  query2 = '';
  query3 = '';
  for (l = 0; l < str.length; l++) {
    if (str[l] == "null") {
      idc[str[l]] = true;
      query += '{image_damage_class:' + '\"' + '\"' + '}';
      query1 += '{image_damage_class:' + '\"' + '\"' + '}';
    } else {
      idc[str[l]] = true;
      query += '{image_damage_class:' + '\"' + str[l] + '\"' + '}';
      query1 += '{image_damage_class:' + '\"' + str[l] + '\"' + '}';
    }
  }
  for (m = 0; m < str2.length; m++) {
    query += '{aidr_class_label:' + '\"' + str2[m] + '\"' + '}';
    query2 += '{aidr_class_label:' + '\"' + str2[m] + '\"' + '}';
  }
  var sen = {
    'Positive': false,
    'Negative': false,
    'Neutral': false
  };
  for (n = 0; n < str3.length; n++) {
    query += '{sentiment:' + '\"' + str3[n] + '\"' + '}';
    query3 += '{sentiment:' + '\"' + str3[n] + '\"' + '}';
  }
  // Then all the querying are combined and sent to the controller.
  // Remember: Across different categories it is an "AND" cosntion, and within a category it is an "OR" condition
  var qu = '/tweets/filteror?q1=' + query1 + '&q2=' + query2 + '&q3=' + query3 + '&q4=' + query4 + '&q5=' + 0 + '&q7=' + 0 + '&q9=' + packet.collection_code + '&q10=' + document.getElementById("damage_slider").innerHTML + '&q11=' + document.getElementById(
    "class_slider").innerHTML + '&q12=' + document.getElementById("sentiment_slider").innerHTML + '&q8=' + 'xyz';
  query_code = '/tweets/filteror?q1=' + query1 + '&q2=' + query2 + '&q3=' + query3 + '&q4=' + query4 + '&q5=' + 1 + '&q7=' + 1 + '&q9=' + packet.collection_code + '&q10=' + document.getElementById("damage_slider").innerHTML + '&q11=' + document.getElementById(
    "class_slider").innerHTML + '&q12=' + document.getElementById("sentiment_slider").innerHTML + '&q8=' + 'xyz';
  tweet_loader(qu, active_flag);
}
//<!-- Load the slider  -->
window.onload = function() {
  tweet_loader('/tweets/filteror?q1=' + '' + '&q2=' + '' + '&q3=' + '' + '&q4=' + '' + '&q5=' + 0 + '&q7=' + 0 + '&q9=' + packet.collection_code + '&q10=' + document.getElementById("damage_slider").innerHTML + '&q11=' + document.getElementById("class_slider").innerHTML +
    '&q12=' + document.getElementById("sentiment_slider").innerHTML + '&q8=' + 'xyz', active_flag);
}


function labelize(str) {
  str = str.split("_").join(" ");
  var splitStr = str.toLowerCase().split(" ");
  for (var i = 0; i < splitStr.length; i++) {
    if (splitStr[i] != "and" && splitStr[i] != "or") {
      splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
    }
  }
  return splitStr.join(' ');
}

function unlabelize(str) {
  str = str.split(" ").join("_");
  return str.toLowerCase();
}


function linkify(tweet) {
  var link_index = tweet.lastIndexOf('https://');
  var tweet_words = tweet.substring(link_index);
  tweet_words = tweet_words.split(" ");
  var link = tweet_words[0].replace(/['"]+/g, '');
  return link;
}

function iconMaker(class_label, sentiment_label) {
  var awesome_icon = 'fa-circle-o';
  var awesome_color = 'dimgray';
  if (icons.hasOwnProperty(unlabelize(class_label))) {
    awesome_icon = icons[unlabelize(class_label)];
  }
  if (colors.hasOwnProperty(unlabelize(sentiment_label))) {
    awesome_color = colors[unlabelize(sentiment_label)];
  }
  //marker
  var lazyIcon = L.ExtraMarkers.icon({
    icon: awesome_icon,
    iconShape: 'circle',
    markerColor: awesome_color,
    prefix: 'fa'
  });
  return lazyIcon;
}
