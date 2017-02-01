/**
 * @fileOverview Produce / Consume integration tests.
 */
var crypto = require('crypto');

var chai = require('chai');
var expect = chai.expect;

var KafkaAvro = require('kafka-avro');
var KafkaAvroStub = require('../..');

var schemaRegistryFix = require('../fixtures/schema-registry.fix');

describe('Produce / Consume', function() {
  beforeEach(function() {
    this.kafkaAvro = new KafkaAvro({});
    this.kafkaAvroStub = new KafkaAvroStub(this.kafkaAvro);

    this.kafkaAvroStub.stub(schemaRegistryFix());

    return this.kafkaAvro.init();
  });

  beforeEach(function() {
    this.topicName = 'testKafkaAvroStub';
  });

  beforeEach(function() {
    this.consOpts = {
      'group.id': 'testKafkaAvro' + crypto.randomBytes(20).toString('hex'),
      'enable.auto.commit': true,
    };
    return this.kafkaAvro.getConsumer(this.consOpts)
      .bind(this)
      .then(function (consumer) {
        this.consumer = consumer;
      });
  });

  beforeEach(function() {
    return this.kafkaAvro.getProducer()
      .bind(this)
      .then(function (producer) {
        this.producer = producer;

        this.producerTopic = producer.Topic(this.topicName, {
          // Make the Kafka broker acknowledge our message (optional)
          'request.required.acks': 1,
        });
      });
  });

  describe('Using events', function() {
    it('should produce and consume', function(done) {
      var produceTime = 0;

      var message = {
        name: 'Thanasis',
        long: 540,
      };

      // //start consuming messages
      this.consumer.consume([this.topicName]);

      this.consumer.on('data', function(rawData) {
        var data = rawData.parsed;
        var diff = Date.now() - produceTime;
        console.log('Produce to consume time in ms:', diff);
        expect(data).to.have.keys([
          'name',
          'long',
        ]);
        expect(data.name).to.equal(message.name);
        expect(data.long).to.equal(message.long);

        done();
      }.bind(this));

      produceTime = Date.now();
      this.producer.produce(this.producerTopic, -1, message, 'key');
    });
    it('should populate the "messagesProduced" prop', function() {
      var messageProduce = {
        name: 'Thanasis',
        long: 540,
      };
      this.producer.produce(this.producerTopic, -1, messageProduce, 'key');

      var messages = this.kafkaAvroStub.messagesProduced[this.topicName];
      expect(messages).to.be.an('array');
      expect(messages).to.have.length(1);
      var message = messages[0];
      expect(message).to.have.keys([
        'topic',
        'value',
        'parsed',
        'offset',
        'size',
        'partition',
        'key',
      ]);
      expect(message.topic).to.equal(this.topicName);
      expect(message.parsed).to.deep.equal(messageProduce);
      expect(message.offset).to.equal(0);
      expect(message.partition).to.equal(-1);
      expect(message.key).to.equal('key');
    });

  });

  describe('Consume using Streams', function() {
    it('should produce and consume a message using streams', function(done) {
      var produceTime = 0;

      var message = {
        name: 'Thanasis',
        long: 540,
      };

      var stream = this.consumer.getReadStream(this.topicName, {
        waitInterval: 0
      });

      stream.on('data', function(dataRaw) {
        var data = dataRaw.parsed;
        var diff = Date.now() - produceTime;
        console.log('Produce to consume time in ms:', diff);
        expect(data).to.have.keys([
          'name',
          'long',
        ]);

        expect(data.name).to.equal(message.name);
        expect(data.long).to.equal(message.long);

        done();
      }.bind(this));

      produceTime = Date.now();
      this.producer.produce(this.producerTopic, -1, message, 'key');
    });
  });
});
