const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {    
    const testsArray = Array.from(tests);
    
    const sequence = [];
    // service request
    sequence.push(...testsArray.filter(obj => {
      return obj.path.includes('indexer/events/service-request-events.spec.ts');
    }));

    // labs
    sequence.push(...testsArray.filter(obj => {
      return obj.path.includes('indexer/events/labs-events.spec.ts');
    }));

    // certification
    sequence.push(...testsArray.filter(obj => {
      return obj.path.includes('indexer/events/certification-events.spec.ts');
    }));

    // service
    sequence.push(...testsArray.filter(obj => {
      return obj.path.includes('indexer/events/service-events.spec.ts');
    }));

    return sequence;
  }
}

module.exports = CustomSequencer;