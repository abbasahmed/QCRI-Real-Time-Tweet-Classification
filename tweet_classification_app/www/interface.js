var packet = {
  collection_code: '',
  class_labels: '',
  damage_labels: '',
  sentiment_labels: '',
  image_existence_labels: '',
  total_labels: 0,
};

var query_code = '';

var slider_values = {
  damage: 0,
  class: 0,
  sentiment: 0,
}

var active_flag = 1;

var loader;

var sockets = {
   outer: io.sails.connect(),
   inner: io.sails.connect(),
};

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

var mapbox_att = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>  contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/"> CC-BY-SA </a><strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>';

var mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
// street and satellite view from mapbox

var streets = L.tileLayer(mbUrl, {
    id: 'mapbox.streets',
    attribution: mapbox_att
  }),
  satellite = L.tileLayer(mbUrl, {
    id: 'mapbox.streets-satellite',
    attribution: mapbox_att
  });

var baseLayers = {
  "Streets": streets,
  "Satellite": satellite
};

var mcg = L.markerClusterGroup({chunkedLoading: true});

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

L.control.layers(baseLayers, overlays, {position: 'bottomright'}).addTo(map);
map.invalidateSize();

function data(collection_code, class_labels, damage_labels, sentiment_labels, image_existence_labels) {
  packet.collection_code = collection_code;
  packet.class_labels = class_labels;
  packet.damage_labels = damage_labels;
  packet.sentiment_labels = sentiment_labels;
  packet.image_existence_labels = image_existence_labels;
  packet.total_labels = class_labels.length + damage_labels.length + sentiment_labels.length + image_existence_labels.length;
}

function simulator(state) {
  if (state.value === "Start"){
    active_flag = 0;
    state.value = "Stop";
    state.innerHTML = "Stop";
    //var sim_socket = io.sails.connect();
    //sim_socket.get('/sim/add');
    filter();
  }
  else{
    active_flag = 1;
    state.value = "Start";
    state.innerHTML = "Start";
    filter();
  }
}

function openSideBar() {
  document.getElementById("mySidenav").style.width = "250px";
  document.getElementById("main").style.marginLeft = "250px";
  document.getElementsByClassName("leaflet-control-zoom")[0].style.marginRight = "260px";
  document.getElementsByClassName("leaflet-control-layers")[0].style.marginRight = "260px";
  document.getElementsByClassName("leaflet-control-attribution")[0].style.marginRight = "260px";
  $("#filter-toggle").attr("onclick","closeSideBar()");
  map.invalidateSize();
}

function closeSideBar() {
  document.getElementById("mySidenav").style.width = "0";
  document.getElementById("main").style.marginLeft= "0";
  document.getElementsByClassName("leaflet-control-zoom")[0].style.marginRight = "10px";
  document.getElementsByClassName("leaflet-control-layers")[0].style.marginRight = "10px";
  document.getElementsByClassName("leaflet-control-attribution")[0].style.marginRight = "0px";
  $("#filter-toggle").attr("onclick","openSideBar()");
  map.invalidateSize()
}

function sliders(){

  var class_slider = document.getElementById("class")
  var sentiment_slider = document.getElementById("sentiment")
  var damage_slider = document.getElementById("damage");

  var cs_val = document.getElementById("class_val");
  var ss_val = document.getElementById("sentiment_val");
  var ds_val = document.getElementById("damage_val");

  cs_val.innerHTML = class_slider.value;
  ss_val.innerHTML = sentiment_slider.value;
  ds_val.innerHTML = damage_slider.value;

  class_slider.oninput = function() {
    cs_val.innerHTML = this.value;
  }
  sentiment_slider.oninput = function() {
    ss_val.innerHTML = this.value;
  }
  damage_slider.oninput = function() {
    ds_val.innerHTML = this.value;
  }

  class_slider.onmouseup = function() {
    slider_values["class"] = cs_val.innerHTML;
    filter();
  }
  sentiment_slider.onmouseup = function() {
    slider_values["sentiment"] = ss_val.innerHTML;
    filter();
  }
  damage_slider.onmouseup = function() {
    slider_values["damage"] = ds_val.innerHTML;
    filter();
  }
}

function addToMap(tweets){
  for (i in tweets) {
    let latitude = tweets[i].latitude;
    let longitude = tweets[i].longitude;
    let tweet_text = tweets[i].tweet_text;
    let img_src = tweets[i].image_physical_location;
    if(img_src == undefined || img_src == null){
     img_src = '';
    }
    if(img_src.indexOf("|")!=-1){
      img_src = img_src.substring(0, img_src.indexOf("|"));
    };
    let class_label = labelize(tweets[i].aidr_class_label);
    let sentiment_label = tweets[i].sentiment;
    let severity_label = tweets[i].image_damage_class;

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
      marker.bindPopup('<a target="_blank" href="'+tweet_link+'">Click to Display Tweet</a>' + "<a target='" + '_blank' + "' href='" + img_src + "'><img id='tweet_image' style='width:100%;height:100%' src='" + img_src + "'/></a>" + '<p>' + '<b>Humanitarian Category: </b>' + class_label + '</p>' + '<p>' + '<b>Sentiment: </b>' + sentiment_label + '</p>'
      + '<p>' + '<b>Severity: </b>' + severity_label + '</p>');
    } else {
      marker.bindPopup('<a target="_blank" href="'+tweet_link+'">Click to Display Tweet</a>' + '<p>' + '<b>Humanitarian Category: </b>' + class_label + '</p>' + '<p>' + '<b>Sentiment: </b>' + sentiment_label + '</p>'
      + '<p>' + '<b>Severity: </b>' + severity_label + '</p>');
    }
  }
}

function tweet_loader(tQuery, flag) {
  sockets.outer.get(tQuery, function(tweets) {
      mcg.clearLayers();
      addToMap(tweets.sim);
      map.addLayer(mcg);
      // this is to ensure the querying is done for new markers only
      if (tweets.sim.length != 0) {
        let new_time = tweets.sim[0].createtime;
        let curr_query = query_code;
        let index = curr_query.indexOf("q8");
        let new_query = curr_query.replace(curr_query.substring(index + 3), new_time);
        query_code = new_query;
      }
    if (flag == 0) {
      clearInterval(loader);
      loader = setInterval(
        function() {
          sockets.inner.get(query_code, function(innerTweets) {
            addToMap(innerTweets.sim);
            map.addLayer(mcg);
            // ensure querying is done on new markers only
            if (innerTweets.sim.length != 0) {
              let new_inner_time = innerTweets.sim[0].createtime;
              let curr_inner_query = query_code;
              let inner_index = curr_inner_query.indexOf("q8");
              let new_inner_query = curr_inner_query.replace(curr_inner_query.substring(inner_index + 3), new_inner_time);
              query_code = new_inner_query;
            }
          });
        }, 5000);
      // every 5 seconds the realtime aspect is done (e.g. refresh page 5 seconds wihtout any blinking)
    }
  });
}

function filter(){

  var class_filters = document.getElementsByClassName('class_checks');
  var sentiment_filters = document.getElementsByClassName('sentiment_checks');
  var severity_filters = document.getElementsByClassName('severity_checks');
  var image_existence_filters = document.getElementsByClassName('image_existence_checks');


  var active_filters = {
    class: [],
    sentiment: [],
    severity: [],
    image_existence: ''
  }

  var str = '';
  for (i = 0; i < class_filters.length; i++) {
    if (class_filters[i].checked == true) {
      active_filters.class.push(class_filters[i].value);
    }
  }
  for (i = 0; i < sentiment_filters.length; i++) {
    if (sentiment_filters[i].checked == true) {
      active_filters.sentiment.push(sentiment_filters[i].value);
    }
  }
  for (i = 0; i < severity_filters.length; i++) {
    if (severity_filters[i].checked == true) {
      active_filters.severity.push(severity_filters[i].value);
    }
  }

  if (image_existence_filters[0].checked == true && image_existence_filters[1].checked == false) {
    active_filters.image_existence = 'yes';
  } else if (image_existence_filters[0].checked == false && image_existence_filters[1].checked == true){
    active_filters.image_existence = 'no';
  } else if (image_existence_filters[0].checked == false && image_existence_filters[1].checked == false){
    active_filters.image_existence = 'both2';
  }

  var filter_query = {
    class: '',
    sentiment: '',
    severity: '',
    image_existence: active_filters.image_existence
  }

  for (i in active_filters.severity) {
    if (active_filters.severity[i] == "null") {
      active_filters.severity[i] = '';
    }
      filter_query.severity += '{image_damage_class:' + '\"' + active_filters.severity[i] + '\"' + '}';
  }

  for (i in active_filters.class) {
      filter_query.class+= '{aidr_class_label:' + '\"' + active_filters.class[i] + '\"' + '}';
  }

  for (i in active_filters.sentiment) {
      filter_query.sentiment+= '{sentiment:' + '\"' + active_filters.sentiment[i] + '\"' + '}';
  }

  let query = '/tweets/filteror?q1=' + filter_query.severity
                + '&q2=' + filter_query.class
                + '&q3=' + filter_query.sentiment
                + '&q4=' + filter_query.image_existence
                + '&q5=' + 0
                + '&q7=' + 0
                + '&q9=' + packet.collection_code
                + '&q10=' + slider_values.damage
                + '&q11=' + slider_values.class
                + '&q12=' + slider_values.sentiment
                + '&q8=' + 'xyz';

  query_code = '/tweets/filteror?q1=' + filter_query.severity
                        + '&q2=' + filter_query.class
                        + '&q3=' + filter_query.sentiment
                        + '&q4=' + filter_query.image_existence
                        + '&q5=' + 1
                        + '&q7=' + 1
                        + '&q9=' + packet.collection_code
                        + '&q10=' + slider_values.damage
                        + '&q11=' + slider_values.class
                        + '&q12=' + slider_values.sentiment
                        + '&q8=' + 'xyz';

  tweet_loader(query, active_flag);
}

function render_accordion() {

  var acc = document.getElementsByClassName("accordion");
  var i;

  for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var panel = this.nextElementSibling;
      if (panel.style.maxHeight){
        panel.style.maxHeight = null;
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  }


  $("#filter-toggle").click(function() {
    $("#filter-toggle > .fa-sliders-h, #filter-toggle > .fa-times").toggleClass("fa-sliders-h fa-times");
  });

  $('#event_name').empty();
  $('#event_name').append(prettycode(packet.collection_code));

  if (packet.total_labels != 0) {

    if(packet.class_labels.length != 0){
      for(i in packet.class_labels){
        var check_val = 'class_check'+i;
        var nice_label = labelize(packet.class_labels[i]);

        $('#render_class').html($('#render_class').html()
        +'<div class="pretty p-default p-curve p-thick p-smooth">'
        +'<input type="checkbox" class = "class_checks" value="'+packet.class_labels[i]+'" onClick="filter();"/>'
        + '<div class="state p-danger-o">'
        +'  <label for="'+check_val+'"> '+nice_label+' <span><i class ="fa '+icons[packet.class_labels[i]]+'" style="font-size: 10px;"></i></span></label>'
        + '</div>'
        +'</div>'
        +'<br>'
        +'<br>');
      }
      $('#slider_class').html($('#slider_class').html()
      +'<input id="class" class="range-slider__range" type="range" min="0" max ="1" step="0.0001" value="0"/>'
      +'<p id= "class_val">'
      +'</p>');

    }

    if(packet.sentiment_labels.length != 0){
      for(i in packet.sentiment_labels){
        var check_val = 'sentiment_check'+i;
        var nice_label = packet.sentiment_labels[i];
        var pretty_class = 'p-danger-o';
        if(nice_label == 'Positive'){
          pretty_class = 'p-success-o';
        } else if(nice_label == 'Negative'){
          pretty_class = 'p-danger-o';
        } else if(nice_label == 'Neutral'){
          pretty_class = 'p-warning-o';
        } else if(nice_label == 'null'){
          continue;
        }

        $('#render_sentiment').html($('#render_sentiment').html()
        +'<div class="pretty p-default p-curve p-thick p-smooth">'
        +'<input type="checkbox" class = "sentiment_checks" value="'+packet.sentiment_labels[i]+'" onClick="filter();"/>'
        + '<div class="state ' +pretty_class+'">'
        +'  <label for="'+check_val+'"> '+nice_label+' </label>'
        + '</div>'
        +'</div>'
        +'<br>'
        +'<br>');
      }
      $('#slider_sentiment').html($('#slider_sentiment').html()
      +'<input id="sentiment" class="range-slider__range" type="range" min="0" max ="1" step="0.0001" value="0"/>'
      +'<p id= "sentiment_val">'
      +'</p>');

    }

    if(packet.damage_labels.length != 0){
      for(i in packet.damage_labels){
        var check_val = 'damage_check'+i;
        var nice_label = packet.damage_labels[i];
        if (nice_label == 'null') {
          nice_label = 'No Image';
        } else if (nice_label == 'None') {
          nice_label = 'Little to No Damage';
        } else if (nice_label == 'Severe') {
          nice_label = 'Severe';
        }
        $('#render_severity').html($('#render_severity').html()
        +'<div class="pretty p-default p-curve p-thick p-smooth">'
        +'<input type="checkbox" class = "severity_checks" value="'+packet.damage_labels[i]+'" onClick="filter();"/>'
        + '<div class="state p-danger-o">'
        +'  <label for="'+check_val+'"> '+nice_label+' </label>'
        + '</div>'
        +'</div>'
        +'<br>'
        +'<br>');
      }
      $('#slider_severity').html($('#slider_severity').html()
      +'<input id="damage" class="range-slider__range" type="range" min="0" max ="1" step="0.0001" value="0"/>'
      +'<p id= "damage_val">'
      +'</p>');

    }

    if (packet.image_existence_labels.length != 0) {
      //  <!-- imagemaster is the id of the div tag under the Image category button.-->

      for (i in packet.image_existence_labels) {
        //<!-- Creating the checkboxes and labels dynamically for sentiment -->

        var check_val = 'image_existence_check'+i;
        var nice_label = labelize(packet.image_existence_labels[i]);

        $('#render_existence').html($('#render_existence').html()
        +'<div class="pretty p-default p-curve">'
        +'<input type="radio" name="color" value="'+packet.image_existence_labels[i]+'" class = "image_existence_checks">'
        + '<div class="state p-danger-o">'
        +'  <label for="'+check_val+'"> '+nice_label+' </label>'
        + '</div>'
        +'</div>'
        +'<br>'
        +'<br>');
      }

      $("input:radio").on("click",function (e) {
          var inp=$(this); //cache the selector
          if (inp.is(".selected_radio")) { //see if it has the selected class
              inp.prop("checked",false).removeClass("selected_radio");
              filter();
              return;
          }
          $("input:radio[name='"+inp.prop("name")+"'].selected_radio").removeClass("selected_radio");
          inp.addClass("selected_radio");
          filter();
      });
    }
  }
  sliders();
}

// <!-- For aidr, sentiment and image damage class, we find which checboxes are checked so that we can query appropriately -->
// <!-- These are stored in str, str2, str3 -->
// <!-- Then an appropriate query is written - query1, query2 and query3 -->
// <!-- for image, query4 is written directly -->

//<!-- Load the slider  -->
window.onload = function() {
  tweet_loader('/tweets/filteror?q1=' + ''
                + '&q2=' + ''
                + '&q3=' + ''
                + '&q4=' + ''
                + '&q5=' + 0
                + '&q7=' + 0
                + '&q9=' + packet.collection_code
                + '&q10=' + slider_values.damage
                + '&q11=' + slider_values.class
                + '&q12=' + slider_values.sentiment
                + '&q8=' + 'xyz', active_flag
              );
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

function linkify(tweet){
  var link_index = tweet.lastIndexOf('https://t.co');
  var tweet_words = tweet.substring(link_index);
  tweet_words = tweet_words.split(" ");
  var link = tweet_words[0].replace(/['"]+/g,'');
  if((link_index == -1)){
    return null;
  }
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

function prettycode(code){
  code = code.toLowerCase();
  var code_words = code.split("_");
  var codeNum = code_words[1];
  var pretty_code = code_words.join(" ");
  var code_index = pretty_code.indexOf(codeNum);
  pretty_code = pretty_code.substring(code_index);

  return labelize(pretty_code);
}
