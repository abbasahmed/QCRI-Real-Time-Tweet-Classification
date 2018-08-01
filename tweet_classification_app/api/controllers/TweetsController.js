module.exports = {

  findcoll: function(req, res) { //function to find different collection codes
    Tweets.native(function(err1, coll) {
      if (err1) {
        res.send(500, {
          error: 'Database error'
        });
      } else {
        coll.distinct("code", function(err2, resu) { //achieved by using a distinct call with the particular collection code which returns all the different codes
          if (err2) {
            res.send(500, {
              error: 'Database error'
            });
          } else {
            if (resu.includes(req.param('code'))) { //only proceed if the collection code is valid
              res.redirect('/map/' + req.param('code'));
            } else {
              res.redirect('/'); //do nothing if the collection code is invalid
            }
          }
        });
      }
    });
  },


  filteror: function(req, res) { //function which queries database on each selection

    function strtodict(text) {

      var dict = {};
      var list = [];

      for (var i = 0; i < text.length; i++) { //function to convert the incoming string from view into a list of dictionaries for the purpose of forming queries
        if (text.charAt(i) == '{') { //example will convert "{key:value}{key1:value1}" ( a string ) to [{key:value},{key1:value1}] ( a list of dictionary)
          i++;
          var str = '';
          while (text.charAt(i) != ':') {
            str += text.charAt(i);
            i++;
          }
          if (text.charAt(i) == ':') {
            i++;
            if (text.charAt(i) == '\"') {
              i++;
              var str1 = '';
              while (text.charAt(i) != '\"') {
                str1 += text.charAt(i);
                i++;
              }
              dict[str] = str1;
              list = list.concat(dict);
              dict = {};
            }
          }
        }
      }
      return list;
    };

    var severity_string_query = req.param('q1'); //image_damage_class string query
    var aidr_string_query = req.param('q2'); //aidr_label string query
    var sentiment_string_query = req.param('q3'); //sentiment string query
    var image_string_query = req.param('q4'); //image string query

    var listy1 = strtodict(severity_string_query); //converts image_damage_class string query to a list of dictionaries
    var listy2 = strtodict(aidr_string_query); //converts aidr_label string query to a list of dictionaries
    var listy3 = strtodict(sentiment_string_query); //converts sentiment string query to a list of dictionaries

    var severity_dict_query = {};
    var aidr_dict_query = {};
    var sentiment_dict_query = {};
    var image_dict_query = {};

    severity_dict_query['$or'] = listy1; //makes the dict query which "ors" the entire list of dictionary
    aidr_dict_query['$or'] = listy2; //makes the dict query which "ors" the entire list of dictionary
    sentiment_dict_query['$or'] = listy3; //makes the dict query which "ors" the entire list of dictionary

    var allquery_list = [];

    if (severity_dict_query['$or'].length !== 0) {
      allquery_list.push(severity_dict_query); //push all the intermediate dictionary queries in to a single list : severity
    }
    if (aidr_dict_query['$or'].length !== 0) {
      allquery_list.push(aidr_dict_query); //push all the intermediate dictionary queries in to a single list : aidr
    }
    if (sentiment_dict_query['$or'].length !== 0) {
      allquery_list.push(sentiment_dict_query); //push all the intermediate dictionary queries in to a single list  : sentiment
    }

    if (image_string_query == "yes") { // various combinations for pushing image dict queries into single list
      image_dict_query['$or'] = [{
        "image_physical_location": {
          $nin: ['']
        }
      }];
      allquery_list.push(image_dict_query);
    } else if (image_string_query == "no") {
      image_dict_query['$or'] = [{
        "image_physical_location": ""
      }];
      allquery_list.push(image_dict_query);
    } else if (image_string_query == "both1") {
      image_dict_query['$or'] = [{
        "image_physical_location": ""
      }, {
        "image_physical_location": {
          $nin: ['']
        }
      }];
      allquery_list.push(image_dict_query);
    } else if (image_string_query == "both2") {

    }

    var code_dict_query = {};

    code_dict_query['$or'] = [{
      "code": req.param('q9') // dict query for collection code
    }];

    allquery_list.push(code_dict_query); //push all the intermediate dictionary queries in to a single list : collection code

    var allquery_dict = {};
    var dict5 = {};
    var time = {};
    var slider_severity_dict_query = {};
    var slider_aidr_dict_query = {};
    var slider_sentiment_dict_query = {};

    if (req.param('q10') != 0) {
      var k1 = parseFloat(req.param('q10'));
      slider_severity_dict_query['$or'] = [{
        "image_damage_class_conf": {
          $gt: (k1 - 0.1),
          $lt: (k1 + 0.1)
        }
      }]; //dict query for severity confidence (slider)
      allquery_list.push(slider_severity_dict_query); //push all the intermediate dictionary queries in to a single list : severity confidence (slider)
    }

    if (req.param('q11') != 0) {
      var k2 = parseFloat(req.param('q11'));
      slider_aidr_dict_query['$or'] = [{
        "aidr_class_label_conf": {
          $gt: (k2 - 0.1),
          $lt: (k2 + 0.1)
        }
      }]; //dict query for aidr confidence (slider)
      allquery_list.push(slider_aidr_dict_query); //push all the intermediate dictionary queries in to a single list : aidr confidence (slider)
    }

    if (req.param('q12') != 0) {
      var k3 = parseFloat(req.param('q12'));
      slider_sentiment_dict_query['$or'] = [{
        "sentiment_conf": {
          $gt: (k3 - 0.1),
          $lt: (k3 + 0.1)
        }
      }]; //dict query for sentiment confidence (slider)
      allquery_list.push(slider_sentiment_dict_query); //push all the intermediate dictionary queries in to a single list : sentiment confidence (slider)
    }

    allquery_dict['$and'] = allquery_list; //put the entire big list into a dictionary with an "and" connector

    if (req.param('q7') == 0) {

      Sim.find().where(allquery_dict).exec(function(err, sim) { //the actual query

        if (err) {
          res.send(500, {
            error: 'Database Error'
          });
        }

        if (sim.length != 0) {

          Sim.find({}, {
            createdAt: 1
          }).limit(1).sort({
            createdAt: -1
          }).exec(function(err, createtime) { //find latest created at time and send it back to the map

            if (err) {
              res.send(500, {
                error: 'Database error'
              });
            }

            var createtime1 = createtime[0].createdAt;
            sim[0].createtime = createtime1;
            res.send({
              sim: sim
            });
          });
        } else {
          res.send({
            sim: sim
          });
        }
      });
    } else if (req.param('q7') == 1) { // the same as prev but for real time and latest date creation is sent continiously back to map

      if (req.param('q8') != '' && req.param('q8') != 'xyz') {
        var createtime3 = new Date(req.param('q8')).toISOString();
        time['$or'] = [{
          "createdAt": {
            $gt: createtime3
          }
        }];
        allquery_list.push(time);
      }


      dict5['$and'] = allquery_list;

      Sim.find().where(dict5).exec(function(err, sim) {
        if (err) {
          res.send(500, {
            error: 'Database Error'
          });
        }
        if (sim.length != 0) {
          Sim.find({}, {
            createdAt: 1
          }).limit(1).sort({
            createdAt: -1
          }).exec(function(err, createtime) {
            if (err) {
              res.send(500, {
                error: 'Database error'
              });
            }
            var createtime2 = createtime[0].createdAt;
            sim[0].createtime = createtime2;


            res.send({
              sim: sim
            });
          });
        } else {
          res.send({
            sim: sim
          });
        }
      });
    }
  },


  mainf: function(req, res) { // finding all the labels associated with the category
    sails.config.myconf.collectioncode = req.param('code'); //get the collection code
    var packet = [];
    var distinct_damage_labels = [];
    var distinct_class_labels = [];
    var distinct_sentiment_labels = [];
    var image_existence;
    var collection_code = req.param('code');


    Sim.native(function(err, coll) {
      coll.distinct("image_damage_class", {
        "code": collection_code
      }, function(err, damage_labels) { //get all distinct values of labels for image damage class
        for (var i = 0; i < damage_labels.length; i++) {
          if (damage_labels[i] == '') {
            distinct_damage_labels.push('null');
            sails.config.myconf.displayseverity = " ";
          } else {
            distinct_damage_labels.push(damage_labels[i]);
            sails.config.myconf.displayseverity = "Severity: ";
          }
        }
        coll.distinct("aidr_class_label", {
          "code": collection_code
        }, function(err, class_labels) { //get all distinct values of labels for aidr

          for (var i = 0; i < class_labels.length; i++) {
            if (class_labels[i] == '') {
              sails.config.myconf.displayaidr = " ";
              distinct_class_labels.push('null');
            } else {
              distinct_class_labels.push(class_labels[i]);
              sails.config.myconf.displayaidr = "Humanitarian Category: ";
            }
          }
          coll.distinct("sentiment", {
            "code": collection_code
          }, function(err, sentiment_labels) { //get all distinct values of labels for sentiment
            for (var i = 0; i < sentiment_labels.length; i++) {
              if (sentiment_labels[i] == '') {
                distinct_sentiment_labels.push('null');
                sails.config.myconf.displaysentiment = " ";
              } else {
                distinct_sentiment_labels.push(sentiment_labels[i]);
                sails.config.myconf.displaysentiment = "Sentiment: ";
              }
            }
            coll.distinct("image_physical_location", {
              "code": collection_code
            }, function(err, images) { //check whether there are entries with images or not
              if (images.length == 0) {
                image_existence = 'null';
              } else {
                image_existence = ['true', 'false'];
              }

              packet = {
                code: collection_code,
                damage_labels: distinct_damage_labels,
                class_labels: distinct_class_labels,
                sentiment_labels: distinct_sentiment_labels,
                image_existence_labels: image_existence
              };
              res.view('map', { //send the label array back to map
                packet: packet,
              });
            });
          });
        });
      });
    });
  },

  list: function(req, res) { //for generating random tweets in the sim, basically prod tweets table for values and randomly allocating in sim

    const aggregateArray = [{
        $match: {
          "code": sails.config.myconf.collectioncode
        }
      },
      {
        $group: {
          "_id": {
            "tweet_text": "$tweet_text",
            "latitude": "$latitude",
            "longitude": "$longitude"
          }
        }
      },
      {
        $sample: {
          size: 1
        }
      },
      {
        $limit: 1
      }
    ];


    Tweets.native(function(err, prodCollection) {
      if (err) {
        "there is an error";
      } else {
        prodCollection
          .aggregate(aggregateArray)
          .toArray((err, results) => {
            if (err) {
              "there is an error";
            }

            var str = JSON.stringify(results[0]);
            str = str.slice(8, -2);
            var array = str.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g);
            console.log("tweet_text-->" + array[0].slice(14, -1));
            console.log("latitude--> " + array[1].slice(11)); // actually longitude
            console.log("longitude--> " + array[2].slice(12)); // actually latitude
            sails.config.myconf.tweet = array[0].slice(14, -1);
            sails.config.myconf.long = array[2].slice(12);
            sails.config.myconf.lat = array[1].slice(11);
            return str;
          });
      }
    });
  }

};
