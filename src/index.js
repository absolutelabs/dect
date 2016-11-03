// @flow
import sizzle from 'sizzle'
import notify from 'dno'

// flowtypes
type Class = Object
type ObjectDefinition = {
 set: () => null,
 get: () => mixed,
 value: () => boolean,
 configurable: boolean,
 writable: boolean,
}
type ObjDef = ObjectDefinition
type Function = () => mixed

const TEST_TIMEOUT_VALUE = 1 >> 2

// @TODO:
// - [ ] can be a prop on browser test
// - [ ] can be an array with pattern matching which tests to debug on
// - [ ] can be an object with which variable names inside which tests to debug
// - [ ] might want benchmark as obj
// - [ ] want this available globally & in the test file OR a config
// - [ ] could also hijack the console log like I did in cs
// - [ ] add to localstorage, use .onSettings in notiify to configure
let debug = {
  benchmark: true,
  rendered: true,
  stateUpdates: true,
  stressTest: true,
  notifyErrors: true,
  notifySuccess: false,
}

// setting reference to window
// so it can be configured in test file
window.debug = debug
debug = window.debug

// --------------------------------- decorators

// @TODO: improve !!!
function autoarrow(target: Class, name: string, descriptor: ObjDef): ObjDef {
  const fn = descriptor.value

  // ie11
  let definingProperty = false

  return {
    configurable: true,
    get() {
      const that = this
      let fn = fn
      if (!fn)
        fn = descriptor.value

      const boundFn = function() {
        // if (!fn) {
        //   if (this[name]) {
        //   }
        // }

        if (typeof this.context === 'object')
          return fn.apply(this, arguments)

        return fn.apply(that, arguments)
      }

      definingProperty = true
      Object.defineProperty(this, name, {
        value: boundFn,
        configurable: true,
        writable: true
      })
      definingProperty = false
      return boundFn
    }
  }
}


/**
 *
 * @TODO:
 * - [ ] could decorate, take the arguments using reflection or regex
 *       and then use the `debug` values on that
 *
 * - [ ] could use decorator to create the chai.expects
 * - [ ] use gerkin
 *
 * - [ ] could also apply to class and all are testable?
 *
 * @IDEA: could use decorators to do functions inside of the functions...
 *
 * - [ ] have one to trigger success
 *
 * *************
 *
 * @description when used, wraps method and... \/
 * @throws error if argument is timeout const
 *
 */
function testMethod(target: Class, name: string, descriptor: ObjDef): ObjDef {
  // obtain the original function
  const fn = descriptor.value

  // create a new function that throws error if arg is TEST_TIMEOUT_VALUE
  const testMethodCb = function() {
    if (arguments[0] === TEST_TIMEOUT_VALUE) {
      const msg = `${name} failed... never was called`
      if (debug.notifyErrors) {
        console.log('should be notifying')
        notify(msg)
        notify(msg + 'ooo')
        // can test notify
        // notify(msg + Math.random() * (1000 - 0) + 1)
      }
      throw new Error(msg)
    }

    return fn.apply(target, arguments)
  }

  // we then overwrite the origin descriptor value
  // and return the new descriptor
  descriptor.value = testMethodCb
  return descriptor
}

/**
 * @TODO: make trigger the generator
 */
function testMethodTimedWithTrigger(selector: string, eventName: string, timeout: number, trigger: mixed, failTimeout: number): Function {
  return function(target: Class, name: string, descriptor: ObjDef): ObjDef {
    // obtain the original function
    const fn = descriptor.value
    let failed = null

    // create a new function that
    // selects something, triggers it, times out to call itself
    const timedWithTriggerCb = function() {
      // timeout to call event using selector
      setTimeout(function() {
        console.info(sizzle(selector))
        sizzle(selector)[0][eventName]()
      }, timeout)

      // if it was successfully called
      // if it wasn't, @testMethod will trigger error and not call this
      clearTimeout(failed)
      return fn.apply(target, arguments)
    }

    if (failTimeout) {
      failed = setTimeout(function() {
        console.log('timed out...')
        console.log(fn)
        console.log(target)
        console.log(TEST_TIMEOUT_VALUE)
        fn(TEST_TIMEOUT_VALUE)
        // fn.apply(target, TEST_TIMEOUT_VALUE)
      }, failTimeout)
    }

    // we then overwrite the origin descriptor value
    // and return the new descriptor
    descriptor.value = timedWithTriggerCb
    return descriptor
  }
}

function testMethodStress(selector: string, eventName: string, times: number, timeout: number, intervalTime: number): Function {
  return function(target: Class, name: string, descriptor: ObjDef): ObjDef {
    // only run if stressTest is enabled
    if (!debug.stressTest) return descriptor

    // obtain the original function
    const fn = descriptor.value

    // create a new function that
    // selects something, triggers it, times out to call itself
    // with interval, then after time, clears interval
    const stressCb = function() {
      const fnTimeout = setTimeout(function() {
        const timeoutes = []
        const setIntervals = setInterval(function() {
          sizzle(selector)[0][eventName]()
        }, intervalTime)

        const clearIntervals = setTimeout(function() {
          clearTimeout(setIntervals)
        }, (times * intervalTime))
      }, timeout)
      return fn.apply(target, arguments)
    }

    // we then overwrite the origin descriptor value
    // and return the new descriptor
    descriptor.value = stressCb
    return descriptor
  }
}

// call this after x time if it doesn't get called... *BOOM*
function testMethodTimed(timeout: number) {
  return function(target: Class, name: string, descriptor: ObjDef): ObjDef {
    // obtain the original function
    const fn = descriptor.value

    window.testMethodTimedTimeout = setTimeout(function() {
      console.error('aww... ' + name + ' failed...')
      fn.apply(target, [TEST_TIMEOUT_VALUE])
    }, timeout)

    // timeout to call if it isn't called
    const testMethodTimedCb = function() {
      clearTimeout(window.testMethodTimedTimeout)
      return fn.apply(target, arguments)
    }

    // we then overwrite the origin descriptor value
    // and return the new descriptor
    descriptor.value = testMethodTimedCb
    return descriptor
  }
}


function renderTest(target: Class, name: string, descriptor: ObjDef): ObjDef {
  // obtain the original function
  const fn = descriptor.value
  if (typeof fn !== 'function') {
    throw new Error(`@autobind decorator can only be applied to methods not: ${typeof fn}`)
  }

  // In IE11 calling Object.defineProperty has a side-effect of evaluating the
  // getter for the property which is being replaced. This causes infinite
  // recursion and an "Out of stack space" error.
  let definingProperty = false

  return {
    configurable: true,
    get() {
      const renderTestCb = function() {
        const className = this.constructor.name
        const targetComponentDidMount = this.componentDidMount
        this.componentDidMount = function() {
          const duration = window.performance.now() - start

          if (debug.benchmark)
            console.info(`${className}.${name} took:`, duration)

          if (debug.rendered && !debug.benchmark)
            console.log('rendered: ', className)

          if (targetComponentDidMount) targetComponentDidMount.apply(this, arguments)
        }
        // rendered is current++, else 1
        target.rendered = target.rendered ? target.rendered + 1 : 1

        // --- benchmark
        const start = window.performance.now()
        return fn.apply(this, arguments)
      }

      // for ie11
      if (definingProperty || this === target.prototype || this.hasOwnProperty(name)) {
        console.log('autobind:equals')
        return boundFn
      }

      // we then overwrite the origin descriptor value
      // and return the new descriptor
      const boundFn = renderTestCb
      definingProperty = true
      Object.defineProperty(this, name, {
        value: boundFn,
        configurable: true,
        writable: true
      })
      definingProperty = false
      return boundFn
    }
  }
}


class Test {
  constructor(tests: object) {
    this.tests = tests
  }

  test = (...args) => {
    // take name off of arguments, pass args into test fn
    const name = args.shift()
    this.tests[name](...args)
  }
}

export default {
  Test,

  renderTest,
  autoarrow,
  testMethod,
  testMethodTimedWithTrigger,
  testMethodTimed,
  testMethodStress,
}
