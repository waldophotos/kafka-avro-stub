/**
 * @fileOverview Schema Registry fixture as expected by the library.
 */

var schemaFix = require('./schema.fix');

module.exports = function() {
  return [{
    subject: 'testKafkaAvroStub',
    version: 1,
    id: 1,
    schema: JSON.stringify(schemaFix),
  }];
};
