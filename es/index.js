var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

import chai, { expect } from 'chai';
import sizzle from 'sizzle';

// flowtypes


var TEST_TIMEOUT_VALUE = 1 >> 2;

// @TODO:
// - [ ] can be a prop on browser test
// - [ ] can be an array with pattern matching which tests to debug on
// - [ ] can be an object with which variable names inside which tests to debug
// - [ ] might want benchmark as obj
// - [ ] want this available globally & in the test file OR a config
// - [ ] could also hijack the console log like I did in cs
var debug = {
  benchmark: true,
  rendered: true,
  stateUpdates: true
};
window.debug = debug;

// --------------------------------- decorators

// @TODO: improve !!!
function autoarrow(target, name, descriptor) {
  var fn = descriptor.value;

  // ie11
  var definingProperty = false;

  return {
    configurable: true,
    get: function get() {
      var that = this;
      var fn = fn;
      if (!fn) fn = descriptor.value;

      var boundFn = function boundFn() {
        if (!fn) {
          if (this[name]) {}
        }

        if (_typeof(this.context) === 'object') return fn.apply(this, arguments);

        return fn.apply(that, arguments);
      };

      definingProperty = true;
      Object.defineProperty(this, name, {
        value: boundFn,
        configurable: true,
        writable: true
      });
      definingProperty = false;
      return boundFn;
    }
  };
}

// @TODO:
// - [ ] could decorate, take the arguments using reflection or regex
//       and then use the `debug` values on that
//
// - [ ] could use decorator to create the chai.expects
// - [ ] use gerkin
//
// - [ ] could also apply to class and all are testable?
//
// @IDEA: could use decorators to do functions inside of the functions...
function testMethod(target, name, descriptor) {
  // obtain the original function
  var fn = descriptor.value;

  // create a new function that throws error if arg is TEST_TIMEOUT_VALUE
  var newFn = function newFn() {
    if (arguments[0] === TEST_TIMEOUT_VALUE) {
      throw new Error(name + ' failed... never was called');
    }

    return fn.apply(target, arguments);
  };

  // we then overwrite the origin descriptor value
  // and return the new descriptor
  descriptor.value = newFn;
  return descriptor;
}

// @TODO: what was I going to do with this?
function testMethod(target, name, descriptor) {
  // obtain the original function
  var fn = descriptor.value;
  if (typeof fn !== 'function') {
    throw new Error('@autobind decorator can only be applied to methods not: ' + (typeof fn === 'undefined' ? 'undefined' : _typeof(fn)));
  }

  // In IE11 calling Object.defineProperty has a side-effect of evaluating the
  // getter for the property which is being replaced. This causes infinite
  // recursion and an "Out of stack space" error.
  var definingProperty = false;

  return {
    configurable: true,
    get: function get() {
      var newFn = function newFn() {
        var className = this.constructor.name;
        return fn.apply(this, arguments);
      };

      // for ie11
      if (definingProperty || this === target.prototype || this.hasOwnProperty(name)) {
        console.log('autobind:equals');
        return boundFn;
      }

      // we then overwrite the origin descriptor value
      // and return the new descriptor
      var boundFn = newFn;
      definingProperty = true;
      Object.defineProperty(this, name, {
        value: boundFn,
        configurable: true,
        writable: true
      });
      definingProperty = false;
      return boundFn;
    }
  };
}

/**
 * @TODO: make trigger the generator
 */
function testMethodTimedWithTrigger(selector, eventName, timeout, trigger, failTimeout) {
  return function (target, name, descriptor) {
    // obtain the original function
    var fn = descriptor.value;

    // create a new function that
    // selects something, triggers it, times out to call itself
    var newFn = function newFn() {
      // timeout to call event using selector
      setTimeout(function () {
        console.info(sizzle(selector));
        sizzle(selector)[0][eventName]();
      }, timeout);

      return fn.apply(target, arguments);
    };

    // we then overwrite the origin descriptor value
    // and return the new descriptor
    descriptor.value = newFn;
    return descriptor;
  };
}

function testMethodStress(selector, eventName, times, timeout, intervalTime) {
  return function (target, name, descriptor) {
    // obtain the original function
    var fn = descriptor.value;

    // create a new function that
    // selects something, triggers it, times out to call itself
    // with interval, then after time, clears interval
    var newFn = function newFn() {
      var fnTimeout = setTimeout(function () {
        var timeoutes = [];
        var setIntervals = setInterval(function () {
          sizzle(selector)[0][eventName]();
        }, intervalTime);

        var clearIntervals = setTimeout(function () {
          clearTimeout(setIntervals);
        }, times * intervalTime);
      }, timeout);
      return fn.apply(target, arguments);
    };

    // we then overwrite the origin descriptor value
    // and return the new descriptor
    descriptor.value = newFn;
    return descriptor;
  };
}

// call this after x time if it doesn't get called... *BOOM*
function testMethodTimed(timeout) {
  return function (target, name, descriptor) {
    // obtain the original function
    var fn = descriptor.value;

    window.testMethodTimedTimeout = setTimeout(function () {
      console.error('aww... ' + name + ' failed...');
      fn.apply(target, [TEST_TIMEOUT_VALUE]);
    }, timeout);

    // timeout to call if it isn't called
    var newFn = function newFn() {
      clearTimeout(window.testMethodTimedTimeout);
      return fn.apply(target, arguments);
    };

    // we then overwrite the origin descriptor value
    // and return the new descriptor
    descriptor.value = newFn;
    return descriptor;
  };
}

function renderTest(target, name, descriptor) {
  // obtain the original function
  var fn = descriptor.value;
  if (typeof fn !== 'function') {
    throw new Error('@autobind decorator can only be applied to methods not: ' + (typeof fn === 'undefined' ? 'undefined' : _typeof(fn)));
  }

  // In IE11 calling Object.defineProperty has a side-effect of evaluating the
  // getter for the property which is being replaced. This causes infinite
  // recursion and an "Out of stack space" error.
  var definingProperty = false;

  return {
    configurable: true,
    get: function get() {
      var newFn = function newFn() {
        var className = this.constructor.name;
        var targetComponentDidMount = this.componentDidMount;
        this.componentDidMount = function () {
          var duration = window.performance.now() - start;

          if (debug.benchmark) console.info(className + '.' + name + ' took:', duration);

          if (debug.rendered && !debug.benchmark) console.log('rendered: ', className);

          if (targetComponentDidMount) targetComponentDidMount.apply(this, arguments);
        };
        // rendered is current++, else 1
        target.rendered = target.rendered ? target.rendered + 1 : 1;

        // --- benchmark
        var start = window.performance.now();
        return fn.apply(this, arguments);
      };

      // for ie11
      if (definingProperty || this === target.prototype || this.hasOwnProperty(name)) {
        console.log('autobind:equals');
        return boundFn;
      }

      // we then overwrite the origin descriptor value
      // and return the new descriptor
      var boundFn = newFn;
      definingProperty = true;
      Object.defineProperty(this, name, {
        value: boundFn,
        configurable: true,
        writable: true
      });
      definingProperty = false;
      return boundFn;
    }
  };
}

var Test = function Test(tests) {
  var _this = this;

  _classCallCheck(this, Test);

  this.test = function () {
    var _tests;

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    // take name off of arguments, pass args into test fn
    var name = args.shift();
    (_tests = _this.tests)[name].apply(_tests, args);
  };

  this.tests = tests;
};

export default {
  Test: Test,

  renderTest: renderTest,
  autoarrow: autoarrow,
  testMethod: testMethod,
  testMethodTimedWithTrigger: testMethodTimedWithTrigger,
  testMethodTimed: testMethodTimed,
  testMethodStress: testMethodStress
};