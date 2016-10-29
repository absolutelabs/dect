// @flow
import chai, {expect} from 'chai'
import sizzle from 'sizzle'

// flowtypes
type Class = object
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

// @TODO: could set up as a cb fuunction
// request permission on page load
document.addEventListener('DOMContentLoaded', function() {
  if (!Notification) {
    alert('Desktop notifications not available in your browser. Try Chromium.')
    return
  }

  if (Notification.permission !== 'granted')
    Notification.requestPermission()
})

function notify(msg) {
  if (Notification.permission !== 'granted') {
    Notification.requestPermission()
  }

  const notification = new Notification('Notification title', {
    icon: 'https://cdn3.iconfinder.com/data/icons/line/36/beaker-512.png',
    body: msg,
  })

  // @TODO:
  // - [ ] add listener & config for url
  // - [ ] do url parsing for params
  notification.onclick = function() {
    window.location.href = window.location.href + '?testing...'
  }
}


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
        if (!fn) {
          if (this[name]) {
          }
        }

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
  const newFn = function() {
    if (arguments[0] === TEST_TIMEOUT_VALUE) {
      const msg = `${name} failed... never was called`
      if (notifyError) {
        notify(msg)
      }
      throw new Error(msg)
    }

    return fn.apply(target, arguments)
  }

  // we then overwrite the origin descriptor value
  // and return the new descriptor
  descriptor.value = newFn
  return descriptor
}


/**
 * @TODO: make trigger the generator
 */
function testMethodTimedWithTrigger(selector: string, eventName: string, timeout: number, trigger, failTimeout): Function {
  return function(target: Class, name: string, descriptor: ObjDef): ObjDef {
    // obtain the original function
    const fn = descriptor.value

    // create a new function that
    // selects something, triggers it, times out to call itself
    const newFn = function() {
      // timeout to call event using selector
      setTimeout(function() {
        console.info(sizzle(selector))
        sizzle(selector)[0][eventName]()
      }, timeout)

      return fn.apply(target, arguments)
    }

    // we then overwrite the origin descriptor value
    // and return the new descriptor
    descriptor.value = newFn
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
    const newFn = function() {
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
    descriptor.value = newFn
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
    const newFn = function() {
      clearTimeout(window.testMethodTimedTimeout)
      return fn.apply(target, arguments)
    }

    // we then overwrite the origin descriptor value
    // and return the new descriptor
    descriptor.value = newFn
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
      const newFn = function() {
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
      const boundFn = newFn
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
