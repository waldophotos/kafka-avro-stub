/*
 * kafka-avro-stub
 * Stubs for the kafka-avro library.
 * https://github.com/waldophotos/kafka-avro-stub
 *
 * Copyright © Waldo, Inc.
 * Licensed under the MIT license.
 */
var Transform = require('stream').Transform;

var Promise = require('bluebird');
var cip = require('cip');
var sinon = require('sinon');
var avro = require('avsc');

function noop() {}

/**
 * @fileOverview bootstrap and master exporting module.
 */

/**
 * The master module.
 *
 * @param {Object} opts The options.
 * @constructor
 */
var KafkaAvroStub = module.exports = cip.extend(function(kafkaAvro) {

  this.kafkaAvro = kafkaAvro;

  /** @type {Array.<Sinon.Spy>} Array of sinon spies */
  this.produceSpies = [];

  /** @type {Array.<Sinon.Spy>} Array of sinon spies */
  this.consumeCommitSpies = [];

  /** @type {?sinon.Stub} kafkaavro init method stub */
  this.kafkaAvroInitsStub = null;

  /** @type {Object.<Array>} key as topics, array of produced messages */
  this.messagesProduced = {};

  /** @type {Object.<Array>} key as topics, array of readable streams as values */
  this._consumerReadables = {};

  /** @type {Array.<stream.Readable>} Consumer readable stream stubs. */
  this._readableStreams = [];

  /** @type {Array.<Function>} Consumer "data" event listener callbacks */
  this._consumerDataListeners = [];

  /** @type {Array.<string>} Topics to consume using the "consume()" method.  */
  this._consumerConsumeTopics = [];

  /** @type {Object.<number>} key as topics, tracks offsets */
  this._producerOffsets = {};
});

/**
 * Activate all kafka-avro stubs required.
 *
 * @param {Array.<Object>} schemaRegistryFix Fixtures of raw schema objects to
 *   use, each object must contain the following key/value pairs:
 *   @param {string} subject The full topic name.
 *   @param {number} version The version number of the schema.
 *   @param {number} id The schema id.
 *   @param {string} schema JSON serialized schema.
 */
KafkaAvroStub.prototype.stub = function (schemaRegistryFix) {
  if (this.kafkaAvroInitsStub) {
    return this.reset();
  }

  //
  // Stub SR
  //
  //
  this.kafkaAvroInitsStub = sinon.stub(this.kafkaAvro, 'init', Promise.method(() => {
    schemaRegistryFix.forEach((srItem) => {
      try {
        var type = avro.parse(srItem.schema, {wrapUnions: true});
      } catch(ex) {
        console.error('KafkaAvroStub :: Error parsing schema:', srItem.subject,
          'Error:', ex.message);
        throw ex;
      }

      this.kafkaAvro.valueSchemas[srItem.subject] = type;
      this.kafkaAvro.schemaMeta[srItem.subject] = srItem;
    });
  }));

  // Stub getConsumer and getProducer
  this.kafkaAvro.getConsumer = this._getConsumer.bind(this);
  this.kafkaAvro.getProducer = this._getProducer.bind(this);
};

/**
 * Reset all stub states.
 *
 */
KafkaAvroStub.prototype.reset = function () {
  this.kafkaAvroInitsStub.reset();

  this.produceSpies.forEach(function(spy) {
    spy.reset();
  });
  this.consumeCommitSpies.forEach(function(spy) {
    spy.reset();
  });

  this.messagesProduced = {};
  this._producerOffsets = {};
};

/**
 * Will return a mock consumer instance properly stabbed.
 *
 * @return {Promise(Object)} A Promise with a mock node-rdkafka Consumer instance.
 * @private
 */
KafkaAvroStub.prototype._getConsumer = Promise.method(function () {

  var self = this;
  var consumer = {
    on: function(eventName, cb) {
      if (eventName === 'data') {
        self._consumerDataListeners.push(cb);
      }
    },
    consume: function(arTopics) {
      self._consumerConsumeTopics = self._consumerConsumeTopics.concat(arTopics);
    },
    subscribe: function(arTopics) {
      self._consumerConsumeTopics = self._consumerConsumeTopics.concat(arTopics);
    },
    getReadStream: function(topic) {

      var readable = new Transform({
        objectMode: true,
        transform: function (data, encoding, callback) {
          callback(data);
        },
      });

      readable._read = noop;
      self._readableStreams.push(readable);
      self._consumerReadables[topic] = self._consumerReadables[topic] || [];
      self._consumerReadables[topic].push(readable);
      return readable;
    },
    commit: function(message, cb) {
      if (typeof cb === 'function') {
        cb(null);
      }
    }
  };

  this.consumeCommitSpies.push(sinon.spy(consumer, 'commit'));

  return consumer;
});

/**
 * Will return a mock producer instance properly stabbed.
 *
 * @return {Promise(Object)} A mock node-rdkafka Producer instance.
 * @private
 */
KafkaAvroStub.prototype._getProducer = Promise.method(function () {
  var self = this;
  var kafkaAvro = this.kafkaAvro;

  var producer = {
    on: noop,
    produce: function(kafkaTopic, partition, message, key) {
      var topicName = kafkaTopic.name();

      var type = kafkaAvro.valueSchemas[topicName];
      var schemaId = kafkaAvro.schemaMeta[topicName].id;

      self._producerOffsets[topicName] = self._producerOffsets[topicName] || 0;
      var offset = self._producerOffsets[topicName];
      self._producerOffsets[topicName]++;

      var serialized = kafkaAvro.serialize(type, schemaId, message);

      var newMessage = {
        topic: topicName,
        value: serialized,
        parsed: message,
        offset: offset,
        size: serialized.length,
        partition: partition,
        key: key,
      };

      // save internally
      self.messagesProduced[topicName] = self.messagesProduced[topicName] || [];
      self.messagesProduced[topicName].push(newMessage);

      // Produce to read stream listeners
      if (self._consumerReadables[topicName]) {
        self._consumerReadables[topicName].forEach(function(readableStream) {
          readableStream.push(newMessage);
        });
      }

      // Produce to 'data' listeners
      if (self._consumerConsumeTopics.indexOf(topicName) === -1 ) {
        return;
      }
      self._consumerDataListeners.forEach(function(cb) {
        cb(newMessage);
      });
    },
    poll: noop,
    Topic: function(topicName) {
      return {
        name: function() {
          return topicName;
        },
      };
    },
  };

  this.produceSpies.push(sinon.spy(producer, 'produce'));

  return producer;
});
