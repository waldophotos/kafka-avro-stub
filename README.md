# kafka-avro-stub

> Stubs for the [kafka-avro library](https://github.com/waldophotos/kafka-avro).

[![Build Status](https://travis-ci.org/waldophotos/kafka-avro-stub.svg?branch=master)](https://travis-ci.org/waldophotos/kafka-avro-stub)

## Install

Install the module using NPM:

```
npm install kafka-avro-stub --save-dev
```

## Documentation

### Quick Usage

```js
var KafkaAvro = require('kafka-avro');
var KafkaAvroStub = require('kafka-avro-stub');
var schemaRegistryFix = require('./fixtures/schema-registry.fix');

// Instantiate Kafka Avro
var kafkaAvro = new KafkaAvro(kafkaConf);

// Instantiate the Kafka Avro Stub
var kafkaAvroStub = new KafkaAvroStub(kafkaAvro);

// Before you invoke the kafkaAvro.init() method stub:
kafkaAvroStub.stub(schemaRegistryFix);

/* ... */

// Reset
kafkaAvroStub.reset();
```

### How does it work

The Kafka Avro Stub will provide complete mock objects of the Consumer and Produce node-rdkafka Constructors. It will also stub the behavior of the `kafkaAvro.init()` method.

kafka-avro-stub mocks behaviors of:

* `Producer.produce()` Typical method of producing.
* `Consumer.on('data')` Using the `consume()` and data event.
* `Consumer.getReadStream()` Using readable streams.

It will properly consume and produce messages, acting like a Kafka server. The messages produced are proper Kafka produced messages with all the expected keys:

* `topic` Topic name.
* `value` Raw value in byte code.
* `parsed` Deserialized object (as passed).
* `offset` Message offset.
* `size` Size of the message.
* `partition` Partition used.
* `key` Key used.

### kafkaAvroStub.stub(schemaRegistryFix)

You only need to invoke the `stub()` method once per runtime, not in every test. If you run `stub()` again, it will simply invoke the `reset()` method. The argument required is a fixture representing the response of the Schema Registry.

`schemaRegistryFix` is an **Array** of Objects which must have the following properties:

* `subject` {string} The full topic name. Do not include `-value` or `-key` suffixes.
* `version` {number} The version number of the schema, use `1`.
* `id` {number} The schema id, any unique number will do.
* `schema` {string} JSON serialized schema. Stringify your Avro schema objects or `.avsc` files.

### kafkaAvroStub.reset()

Run this method between your tests to reset all listeners and counters.

### Available Properties

Kafka avro stub provides the following properties after the `stub()` method is invoked:

* `kafkaAvroStub.kafkaAvroInitsStub` {sinon.Stub} [Sinon stub](http://sinonjs.org/docs/#stubs-api) of the `kafkaAvro.init()` method.
* `kafkaAvroStub.produceSpies` {Array.<sinon.Spy>} [Sinon spy](http://sinonjs.org/docs/#spies-api) on the `Producer.produce()` method, will be stored in the order they were invoked.
* `kafkaAvroStub.consumeCommitSpies` {Array.<sinon.Spy>} [Sinon spy](http://sinonjs.org/docs/#spies-api) on the `Consumer.commit()` method, will be stored in the order they were invoked.
* `kafkaAvroStub.messagesProduced` {Object.<Array>} An object with topic names as keys and values an Array of messages produced on that topic in sequence.

All of the above properties are reset when the `reset()` method is invoked.

> **WARNING** The `kafkaAvroStub.produceSpies` and `kafkaAvroStub.consumeCommitSpies` Arrays will not be emptied with the `reset()` method, however the Sinon Spies they contain will get reset.

### Known Limitations

* There are no receipts emitted through the `delivery-report` event.
* There are no events emitted other than `data`.
* If multiple consumers are instantiated they will all be treated as one. Do not expect topic separation between them, you shouldn't have more than one Consumers per runtime anyway.
* There is no manual committing, all messages is assumed are committed as they are received.
* Once you go stub you never go back.

If you need any of the above limitations lifted first step is to open an Issue and a second step, if you want to achieve awesomeness, would be to submit a pull request.

## Version Support Table

| **kafka-avro-stub** | **kafka-avro** |
|---------------------|---------------|
| From `0.3.0` | From `0.7.0`|
| Up to `0.2.1` | Up to `0.6.4`|

## Releasing

1. Update the changelog bellow.
1. Ensure you are on master.
1. Type: `grunt release`
    * `grunt release:minor` for minor number jump.
    * `grunt release:major` for major number jump.

## Release History

- **v0.3.0**, *03 Mar 2017*
    - Support kafka-avro `^0.7.0`.
- **v0.2.1**, *16 Feb 2017*
    - Support `connect()` and `ready` event which have been decoupled from `^0.6.0`.
- **v0.2.0**, *15 Feb 2017*
    - Added `subscribe` stub on Consumers, use kafka-avro `0.5.0`.
- **v0.1.0**, *02 Feb 2017*
    - Created two new arrays `kafkaAvroStub.produceSpies` and `kafkaAvroStub.consumeCommitSpies`, the first one replaced the `kafkaAvroStub.produceSpy`.
- **v0.0.3**, *02 Feb 2017*
    - Created and exposed a spy on the `producer.produce()` method.
- **v0.0.2**, *02 Feb 2017*
    - `reset()` method will not reset the registered consumers.
- **v0.0.1**, *01 Feb 2017*
    - Big Bang.

## License

Copyright Waldo, Inc. [Licensed under the MIT](/LICENSE).

[avsc]: https://github.com/mtth/avsc
[node-rdkafka]: https://github.com/Blizzard/node-rdkafka
