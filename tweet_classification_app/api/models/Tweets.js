/**
 * Tweets.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  tableName: 'aidr_data_for_visualization',

  attributes: {
    tweet_text:{
      type:'string'
    },
    image_damage_class:{
      type:'string'
    },
    aidr_class_label:{
      type:'string'
    },
    sentiment:{
      type:'string'
    },
    latitude:{
      type:'float'
    },
    longitude:{
      type:'float'
    },
    image_physical_location:{
      type : 'string'
    }
  },
  connection: 'mongodb'
};
