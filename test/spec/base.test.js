/**
 * @fileOverview Base API Surface tests.
 */
const chai = require('chai');
const expect = chai.expect;

const KafkaAvroStub = require('../..');

describe('Base API Surface', function() {
  it('should expose expected methods', function(){
    expect(KafkaAvroStub).to.be.a('function');
  });
});
