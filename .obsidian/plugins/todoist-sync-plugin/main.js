'use strict';

var obsidian = require('obsidian');

function noop() { }
const identity = x => x;
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}
function get_all_dirty_from_scope($$scope) {
    if ($$scope.ctx.length > 32) {
        const dirty = [];
        const length = $$scope.ctx.length / 32;
        for (let i = 0; i < length; i++) {
            dirty[i] = -1;
        }
        return dirty;
    }
    return -1;
}
function compute_slots(slots) {
    const result = {};
    for (const key in slots) {
        result[key] = true;
    }
    return result;
}
function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
}

const is_client = typeof window !== 'undefined';
let now = is_client
    ? () => window.performance.now()
    : () => Date.now();
let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

const tasks = new Set();
function run_tasks(now) {
    tasks.forEach(task => {
        if (!task.c(now)) {
            tasks.delete(task);
            task.f();
        }
    });
    if (tasks.size !== 0)
        raf(run_tasks);
}
/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 */
function loop(callback) {
    let task;
    if (tasks.size === 0)
        raf(run_tasks);
    return {
        promise: new Promise(fulfill => {
            tasks.add(task = { c: callback, f: fulfill });
        }),
        abort() {
            tasks.delete(task);
        }
    };
}
function append(target, node) {
    target.appendChild(node);
}
function append_styles(target, style_sheet_id, styles) {
    const append_styles_to = get_root_for_style(target);
    if (!append_styles_to.getElementById(style_sheet_id)) {
        const style = element('style');
        style.id = style_sheet_id;
        style.textContent = styles;
        append_stylesheet(append_styles_to, style);
    }
}
function get_root_for_style(node) {
    if (!node)
        return document;
    const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    if (root && root.host) {
        return root;
    }
    return node.ownerDocument;
}
function append_empty_stylesheet(node) {
    const style_element = element('style');
    append_stylesheet(get_root_for_style(node), style_element);
    return style_element.sheet;
}
function append_stylesheet(node, style) {
    append(node.head || node, style);
    return style.sheet;
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function stop_propagation(fn) {
    return function (event) {
        event.stopPropagation();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function set_attributes(node, attributes) {
    // @ts-ignore
    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
    for (const key in attributes) {
        if (attributes[key] == null) {
            node.removeAttribute(key);
        }
        else if (key === 'style') {
            node.style.cssText = attributes[key];
        }
        else if (key === '__value') {
            node.value = node[key] = attributes[key];
        }
        else if (descriptors[key] && descriptors[key].set) {
            node[key] = attributes[key];
        }
        else {
            attr(node, key, attributes[key]);
        }
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data === data)
        return;
    text.data = data;
}
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function set_style(node, key, value, important) {
    if (value === null) {
        node.style.removeProperty(key);
    }
    else {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
}

// we need to store the information for multiple documents because a Svelte application could also contain iframes
// https://github.com/sveltejs/svelte/issues/3624
const managed_styles = new Map();
let active = 0;
// https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
    let hash = 5381;
    let i = str.length;
    while (i--)
        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return hash >>> 0;
}
function create_style_information(doc, node) {
    const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
    managed_styles.set(doc, info);
    return info;
}
function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
    const step = 16.666 / duration;
    let keyframes = '{\n';
    for (let p = 0; p <= 1; p += step) {
        const t = a + (b - a) * ease(p);
        keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
    }
    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
    const name = `__svelte_${hash(rule)}_${uid}`;
    const doc = get_root_for_style(node);
    const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
    if (!rules[name]) {
        rules[name] = true;
        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
    }
    const animation = node.style.animation || '';
    node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
    active += 1;
    return name;
}
function delete_rule(node, name) {
    const previous = (node.style.animation || '').split(', ');
    const next = previous.filter(name
        ? anim => anim.indexOf(name) < 0 // remove specific animation
        : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
    );
    const deleted = previous.length - next.length;
    if (deleted) {
        node.style.animation = next.join(', ');
        active -= deleted;
        if (!active)
            clear_rules();
    }
}
function clear_rules() {
    raf(() => {
        if (active)
            return;
        managed_styles.forEach(info => {
            const { ownerNode } = info.stylesheet;
            // there is no ownerNode if it runs on jsdom.
            if (ownerNode)
                detach(ownerNode);
        });
        managed_styles.clear();
    });
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
/**
 * Schedules a callback to run immediately before the component is updated after any state change.
 *
 * The first time the callback runs will be before the initial `onMount`
 *
 * https://svelte.dev/docs#run-time-svelte-beforeupdate
 */
function beforeUpdate(fn) {
    get_current_component().$$.before_update.push(fn);
}
/**
 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
 * it can be called from an external module).
 *
 * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
 *
 * https://svelte.dev/docs#run-time-svelte-onmount
 */
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * https://svelte.dev/docs#run-time-svelte-ondestroy
 */
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}
/**
 * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
 */
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail, { cancelable = false } = {}) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail, { cancelable });
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
            return !event.defaultPrevented;
        }
        return true;
    };
}
/**
 * Associates an arbitrary `context` object with the current component and the specified `key`
 * and returns that object. The context is then available to children of the component
 * (including slotted content) with `getContext`.
 *
 * Like lifecycle functions, this must be called during component initialisation.
 *
 * https://svelte.dev/docs#run-time-svelte-setcontext
 */
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
    return context;
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        // @ts-ignore
        callbacks.slice().forEach(fn => fn.call(this, event));
    }
}

const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function tick() {
    schedule_update();
    return resolved_promise;
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    // Do not reenter flush while dirty components are updated, as this can
    // result in an infinite loop. Instead, let the inner flush handle it.
    // Reentrancy is ok afterwards for bindings etc.
    if (flushidx !== 0) {
        return;
    }
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        try {
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
        }
        catch (e) {
            // reset dirty state to not end up in a deadlocked state and then rethrow
            dirty_components.length = 0;
            flushidx = 0;
            throw e;
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 */
function flush_render_callbacks(fns) {
    const filtered = [];
    const targets = [];
    render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
    targets.forEach((c) => c());
    render_callbacks = filtered;
}

let promise;
function wait() {
    if (!promise) {
        promise = Promise.resolve();
        promise.then(() => {
            promise = null;
        });
    }
    return promise;
}
function dispatch(node, direction, kind) {
    node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
    else if (callback) {
        callback();
    }
}
const null_transition = { duration: 0 };
function create_bidirectional_transition(node, fn, params, intro) {
    const options = { direction: 'both' };
    let config = fn(node, params, options);
    let t = intro ? 0 : 1;
    let running_program = null;
    let pending_program = null;
    let animation_name = null;
    function clear_animation() {
        if (animation_name)
            delete_rule(node, animation_name);
    }
    function init(program, duration) {
        const d = (program.b - t);
        duration *= Math.abs(d);
        return {
            a: t,
            b: program.b,
            d,
            duration,
            start: program.start,
            end: program.start + duration,
            group: program.group
        };
    }
    function go(b) {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        const program = {
            start: now() + delay,
            b
        };
        if (!b) {
            // @ts-ignore todo: improve typings
            program.group = outros;
            outros.r += 1;
        }
        if (running_program || pending_program) {
            pending_program = program;
        }
        else {
            // if this is an intro, and there's a delay, we need to do
            // an initial tick and/or apply CSS animation immediately
            if (css) {
                clear_animation();
                animation_name = create_rule(node, t, b, duration, delay, easing, css);
            }
            if (b)
                tick(0, 1);
            running_program = init(program, duration);
            add_render_callback(() => dispatch(node, b, 'start'));
            loop(now => {
                if (pending_program && now > pending_program.start) {
                    running_program = init(pending_program, duration);
                    pending_program = null;
                    dispatch(node, running_program.b, 'start');
                    if (css) {
                        clear_animation();
                        animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                    }
                }
                if (running_program) {
                    if (now >= running_program.end) {
                        tick(t = running_program.b, 1 - t);
                        dispatch(node, running_program.b, 'end');
                        if (!pending_program) {
                            // we're done
                            if (running_program.b) {
                                // intro — we can tidy up immediately
                                clear_animation();
                            }
                            else {
                                // outro — needs to be coordinated
                                if (!--running_program.group.r)
                                    run_all(running_program.group.c);
                            }
                        }
                        running_program = null;
                    }
                    else if (now >= running_program.start) {
                        const p = now - running_program.start;
                        t = running_program.a + running_program.d * easing(p / running_program.duration);
                        tick(t, 1 - t);
                    }
                }
                return !!(running_program || pending_program);
            });
        }
    }
    return {
        run(b) {
            if (is_function(config)) {
                wait().then(() => {
                    // @ts-ignore
                    config = config(options);
                    go(b);
                });
            }
            else {
                go(b);
            }
        },
        end() {
            clear_animation();
            running_program = pending_program = null;
        }
    };
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
function outro_and_destroy_block(block, lookup) {
    transition_out(block, 1, 1, () => {
        lookup.delete(block.key);
    });
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
    let o = old_blocks.length;
    let n = list.length;
    let i = o;
    const old_indexes = {};
    while (i--)
        old_indexes[old_blocks[i].key] = i;
    const new_blocks = [];
    const new_lookup = new Map();
    const deltas = new Map();
    const updates = [];
    i = n;
    while (i--) {
        const child_ctx = get_context(ctx, list, i);
        const key = get_key(child_ctx);
        let block = lookup.get(key);
        if (!block) {
            block = create_each_block(key, child_ctx);
            block.c();
        }
        else if (dynamic) {
            // defer updates until all the DOM shuffling is done
            updates.push(() => block.p(child_ctx, dirty));
        }
        new_lookup.set(key, new_blocks[i] = block);
        if (key in old_indexes)
            deltas.set(key, Math.abs(i - old_indexes[key]));
    }
    const will_move = new Set();
    const did_move = new Set();
    function insert(block) {
        transition_in(block, 1);
        block.m(node, next);
        lookup.set(block.key, block);
        next = block.first;
        n--;
    }
    while (o && n) {
        const new_block = new_blocks[n - 1];
        const old_block = old_blocks[o - 1];
        const new_key = new_block.key;
        const old_key = old_block.key;
        if (new_block === old_block) {
            // do nothing
            next = new_block.first;
            o--;
            n--;
        }
        else if (!new_lookup.has(old_key)) {
            // remove old block
            destroy(old_block, lookup);
            o--;
        }
        else if (!lookup.has(new_key) || will_move.has(new_key)) {
            insert(new_block);
        }
        else if (did_move.has(old_key)) {
            o--;
        }
        else if (deltas.get(new_key) > deltas.get(old_key)) {
            did_move.add(new_key);
            insert(new_block);
        }
        else {
            will_move.add(old_key);
            o--;
        }
    }
    while (o--) {
        const old_block = old_blocks[o];
        if (!new_lookup.has(old_block.key))
            destroy(old_block, lookup);
    }
    while (n)
        insert(new_blocks[n - 1]);
    run_all(updates);
    return new_blocks;
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}

function bind(component, name, callback) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        callback(component.$$.ctx[index]);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
            // if the component was destroyed immediately
            // it will update the `$$.on_destroy` reference to `null`.
            // the destructured on_destroy may still reference to the old array
            if (component.$$.on_destroy) {
                component.$$.on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        flush_render_callbacks($$.after_update);
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: [],
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        if (!is_function(callback)) {
            return noop;
        }
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = new Set();
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (const subscriber of subscribers) {
                    subscriber[1]();
                    subscriber_queue.push(subscriber, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.add(subscriber);
        if (subscribers.size === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            subscribers.delete(subscriber);
            if (subscribers.size === 0 && stop) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

function isPositiveInteger(str) {
    const num = toInt(str);
    return num != Infinity && String(num) === str && num > 0;
}
function toInt(str) {
    return Math.floor(Number(str));
}
class ExtendedMap extends Map {
    get_or_default(key, defaultValue) {
        if (this.has(key)) {
            return this.get(key);
        }
        return defaultValue;
    }
    get_or_maybe_insert(key, newValue) {
        if (this.has(key)) {
            return this.get(key);
        }
        const value = newValue();
        if (value) {
            this.set(key, value);
        }
        return value;
    }
}
const APP_CONTEXT_KEY = "obsidian_app";

function getTokenPath(vault) {
    return `${vault.configDir}/todoist-token`;
}

const SettingsInstance = writable({
    fadeToggle: true,
    autoRefreshToggle: false,
    autoRefreshInterval: 60,
    renderDate: true,
    renderDateIcon: true,
    renderProject: true,
    renderProjectIcon: true,
    renderLabels: true,
    renderLabelsIcon: true,
    debugLogging: false,
});
class SettingsTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        this.containerEl.empty();
        this.pluginMetadata();
        this.apiToken();
        this.fadeAnimationSettings();
        this.autoRefreshSettings();
        this.dateSettings();
        this.projectSettings();
        this.labelsSettings();
        this.debugLogging();
    }
    pluginMetadata() {
        const desc = document.createDocumentFragment();
        const span = document.createElement("span");
        span.innerText = "Read the ";
        const changelogLink = document.createElement("a");
        changelogLink.href =
            "https://github.com/jamiebrynes7/obsidian-todoist-plugin/releases";
        changelogLink.innerText = "changelog!";
        span.appendChild(changelogLink);
        desc.appendChild(span);
    }
    apiToken() {
        const desc = document.createDocumentFragment();
        desc.createEl("span", null, (span) => {
            span.innerText =
                "The Todoist API token to use when fetching tasks. You will need to restart Obsidian after setting this. You can find this token ";
            span.createEl("a", null, (link) => {
                link.href = "https://todoist.com/prefs/integrations";
                link.innerText = "here!";
            });
        });
        new obsidian.Setting(this.containerEl)
            .setName("Todoist API token")
            .setDesc(desc)
            .addTextArea(async (text) => {
            try {
                text.setValue(await this.app.vault.adapter.read(getTokenPath(this.app.vault)));
            }
            catch (e) {
                /* Throw away read error if file does not exist. */
            }
            text.onChange(async (value) => {
                await this.app.vault.adapter.write(getTokenPath(this.app.vault), value);
            });
        });
    }
    fadeAnimationSettings() {
        new obsidian.Setting(this.containerEl)
            .setName("Task fade animation")
            .setDesc("Whether tasks should fade in and out when added or removed.")
            .addToggle((toggle) => {
            toggle.setValue(this.plugin.options.fadeToggle);
            toggle.onChange(async (value) => {
                this.plugin.writeOptions((old) => (old.fadeToggle = value));
            });
        });
    }
    autoRefreshSettings() {
        new obsidian.Setting(this.containerEl)
            .setName("Auto-refresh")
            .setDesc("Whether queries should auto-refresh at a set interval")
            .addToggle((toggle) => {
            toggle.setValue(this.plugin.options.autoRefreshToggle);
            toggle.onChange((value) => {
                this.plugin.writeOptions((old) => (old.autoRefreshToggle = value));
            });
        });
        new obsidian.Setting(this.containerEl)
            .setName("Auto-refresh interval")
            .setDesc("The interval (in seconds) that queries should auto-refresh by default. Integer numbers only.")
            .addText((setting) => {
            setting.setValue(`${this.plugin.options.autoRefreshInterval}`);
            setting.onChange(async (value) => {
                const newSetting = value.trim();
                if (newSetting.length == 0) {
                    return;
                }
                if (isPositiveInteger(newSetting)) {
                    await this.plugin.writeOptions((old) => (old.autoRefreshInterval = toInt(newSetting)));
                }
                else {
                    setting.setValue(`${this.plugin.options.autoRefreshInterval}`);
                }
            });
        });
    }
    dateSettings() {
        new obsidian.Setting(this.containerEl)
            .setName("Render dates")
            .setDesc("Whether dates should be rendered with tasks.")
            .addToggle((toggle) => {
            toggle.setValue(this.plugin.options.renderDate);
            toggle.onChange(async (value) => {
                await this.plugin.writeOptions((old) => (old.renderDate = value));
            });
        });
        new obsidian.Setting(this.containerEl)
            .setName("Render date icon")
            .setDesc("Whether rendered dates should include an icon.")
            .addToggle((setting) => {
            setting.setValue(this.plugin.options.renderDateIcon);
            setting.onChange(async (value) => {
                await this.plugin.writeOptions((old) => (old.renderDateIcon = value));
            });
        });
    }
    projectSettings() {
        new obsidian.Setting(this.containerEl)
            .setName("Render project & section")
            .setDesc("Whether projects & sections should be rendered with tasks.")
            .addToggle((setting) => {
            setting.setValue(this.plugin.options.renderProject);
            setting.onChange(async (value) => {
                await this.plugin.writeOptions((old) => (old.renderProject = value));
            });
        });
        new obsidian.Setting(this.containerEl)
            .setName("Render project & section icon")
            .setDesc("Whether rendered projects & sections should include an icon.")
            .addToggle((setting) => {
            setting.setValue(this.plugin.options.renderProjectIcon);
            setting.onChange(async (value) => {
                await this.plugin.writeOptions((old) => (old.renderProjectIcon = value));
            });
        });
    }
    labelsSettings() {
        new obsidian.Setting(this.containerEl)
            .setName("Render labels")
            .setDesc("Whether labels should be rendered with tasks.")
            .addToggle((setting) => {
            setting.setValue(this.plugin.options.renderLabels);
            setting.onChange(async (value) => {
                await this.plugin.writeOptions((old) => (old.renderLabels = value));
            });
        });
        new obsidian.Setting(this.containerEl)
            .setName("Render labels icon")
            .setDesc("Whether rendered labels should include an icon.")
            .addToggle((setting) => {
            setting.setValue(this.plugin.options.renderLabelsIcon);
            setting.onChange(async (value) => {
                await this.plugin.writeOptions((old) => (old.renderLabelsIcon = value));
            });
        });
    }
    debugLogging() {
        new obsidian.Setting(this.containerEl)
            .setName("Debug logging")
            .setDesc("Whether debug logging should be on or off.")
            .addToggle((toggle) => {
            toggle.setValue(this.plugin.options.debugLogging);
            toggle.onChange(async (value) => {
                await this.plugin.writeOptions((old) => (old.debugLogging = value));
            });
        });
    }
}

let settings = null;
SettingsInstance.subscribe((value) => (settings = value));
function debug(log) {
    if (!settings.debugLogging) {
        return;
    }
    if (isComplexLog(log)) {
        console.log(log.msg);
        console.log(log.context);
    }
    else {
        console.log(log);
    }
}
function isComplexLog(log) {
    return log.msg !== undefined;
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function commonjsRequire(path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var momentExports = {};
var moment = {
  get exports(){ return momentExports; },
  set exports(v){ momentExports = v; },
};

(function (module, exports) {
(function (global, factory) {
	    module.exports = factory() ;
	}(commonjsGlobal, (function () {
	    var hookCallback;

	    function hooks() {
	        return hookCallback.apply(null, arguments);
	    }

	    // This is done to register the method called with moment()
	    // without creating circular dependencies.
	    function setHookCallback(callback) {
	        hookCallback = callback;
	    }

	    function isArray(input) {
	        return (
	            input instanceof Array ||
	            Object.prototype.toString.call(input) === '[object Array]'
	        );
	    }

	    function isObject(input) {
	        // IE8 will treat undefined and null as object if it wasn't for
	        // input != null
	        return (
	            input != null &&
	            Object.prototype.toString.call(input) === '[object Object]'
	        );
	    }

	    function hasOwnProp(a, b) {
	        return Object.prototype.hasOwnProperty.call(a, b);
	    }

	    function isObjectEmpty(obj) {
	        if (Object.getOwnPropertyNames) {
	            return Object.getOwnPropertyNames(obj).length === 0;
	        } else {
	            var k;
	            for (k in obj) {
	                if (hasOwnProp(obj, k)) {
	                    return false;
	                }
	            }
	            return true;
	        }
	    }

	    function isUndefined(input) {
	        return input === void 0;
	    }

	    function isNumber(input) {
	        return (
	            typeof input === 'number' ||
	            Object.prototype.toString.call(input) === '[object Number]'
	        );
	    }

	    function isDate(input) {
	        return (
	            input instanceof Date ||
	            Object.prototype.toString.call(input) === '[object Date]'
	        );
	    }

	    function map(arr, fn) {
	        var res = [],
	            i,
	            arrLen = arr.length;
	        for (i = 0; i < arrLen; ++i) {
	            res.push(fn(arr[i], i));
	        }
	        return res;
	    }

	    function extend(a, b) {
	        for (var i in b) {
	            if (hasOwnProp(b, i)) {
	                a[i] = b[i];
	            }
	        }

	        if (hasOwnProp(b, 'toString')) {
	            a.toString = b.toString;
	        }

	        if (hasOwnProp(b, 'valueOf')) {
	            a.valueOf = b.valueOf;
	        }

	        return a;
	    }

	    function createUTC(input, format, locale, strict) {
	        return createLocalOrUTC(input, format, locale, strict, true).utc();
	    }

	    function defaultParsingFlags() {
	        // We need to deep clone this object.
	        return {
	            empty: false,
	            unusedTokens: [],
	            unusedInput: [],
	            overflow: -2,
	            charsLeftOver: 0,
	            nullInput: false,
	            invalidEra: null,
	            invalidMonth: null,
	            invalidFormat: false,
	            userInvalidated: false,
	            iso: false,
	            parsedDateParts: [],
	            era: null,
	            meridiem: null,
	            rfc2822: false,
	            weekdayMismatch: false,
	        };
	    }

	    function getParsingFlags(m) {
	        if (m._pf == null) {
	            m._pf = defaultParsingFlags();
	        }
	        return m._pf;
	    }

	    var some;
	    if (Array.prototype.some) {
	        some = Array.prototype.some;
	    } else {
	        some = function (fun) {
	            var t = Object(this),
	                len = t.length >>> 0,
	                i;

	            for (i = 0; i < len; i++) {
	                if (i in t && fun.call(this, t[i], i, t)) {
	                    return true;
	                }
	            }

	            return false;
	        };
	    }

	    function isValid(m) {
	        if (m._isValid == null) {
	            var flags = getParsingFlags(m),
	                parsedParts = some.call(flags.parsedDateParts, function (i) {
	                    return i != null;
	                }),
	                isNowValid =
	                    !isNaN(m._d.getTime()) &&
	                    flags.overflow < 0 &&
	                    !flags.empty &&
	                    !flags.invalidEra &&
	                    !flags.invalidMonth &&
	                    !flags.invalidWeekday &&
	                    !flags.weekdayMismatch &&
	                    !flags.nullInput &&
	                    !flags.invalidFormat &&
	                    !flags.userInvalidated &&
	                    (!flags.meridiem || (flags.meridiem && parsedParts));

	            if (m._strict) {
	                isNowValid =
	                    isNowValid &&
	                    flags.charsLeftOver === 0 &&
	                    flags.unusedTokens.length === 0 &&
	                    flags.bigHour === undefined;
	            }

	            if (Object.isFrozen == null || !Object.isFrozen(m)) {
	                m._isValid = isNowValid;
	            } else {
	                return isNowValid;
	            }
	        }
	        return m._isValid;
	    }

	    function createInvalid(flags) {
	        var m = createUTC(NaN);
	        if (flags != null) {
	            extend(getParsingFlags(m), flags);
	        } else {
	            getParsingFlags(m).userInvalidated = true;
	        }

	        return m;
	    }

	    // Plugins that add properties should also add the key here (null value),
	    // so we can properly clone ourselves.
	    var momentProperties = (hooks.momentProperties = []),
	        updateInProgress = false;

	    function copyConfig(to, from) {
	        var i,
	            prop,
	            val,
	            momentPropertiesLen = momentProperties.length;

	        if (!isUndefined(from._isAMomentObject)) {
	            to._isAMomentObject = from._isAMomentObject;
	        }
	        if (!isUndefined(from._i)) {
	            to._i = from._i;
	        }
	        if (!isUndefined(from._f)) {
	            to._f = from._f;
	        }
	        if (!isUndefined(from._l)) {
	            to._l = from._l;
	        }
	        if (!isUndefined(from._strict)) {
	            to._strict = from._strict;
	        }
	        if (!isUndefined(from._tzm)) {
	            to._tzm = from._tzm;
	        }
	        if (!isUndefined(from._isUTC)) {
	            to._isUTC = from._isUTC;
	        }
	        if (!isUndefined(from._offset)) {
	            to._offset = from._offset;
	        }
	        if (!isUndefined(from._pf)) {
	            to._pf = getParsingFlags(from);
	        }
	        if (!isUndefined(from._locale)) {
	            to._locale = from._locale;
	        }

	        if (momentPropertiesLen > 0) {
	            for (i = 0; i < momentPropertiesLen; i++) {
	                prop = momentProperties[i];
	                val = from[prop];
	                if (!isUndefined(val)) {
	                    to[prop] = val;
	                }
	            }
	        }

	        return to;
	    }

	    // Moment prototype object
	    function Moment(config) {
	        copyConfig(this, config);
	        this._d = new Date(config._d != null ? config._d.getTime() : NaN);
	        if (!this.isValid()) {
	            this._d = new Date(NaN);
	        }
	        // Prevent infinite loop in case updateOffset creates new moment
	        // objects.
	        if (updateInProgress === false) {
	            updateInProgress = true;
	            hooks.updateOffset(this);
	            updateInProgress = false;
	        }
	    }

	    function isMoment(obj) {
	        return (
	            obj instanceof Moment || (obj != null && obj._isAMomentObject != null)
	        );
	    }

	    function warn(msg) {
	        if (
	            hooks.suppressDeprecationWarnings === false &&
	            typeof console !== 'undefined' &&
	            console.warn
	        ) {
	            console.warn('Deprecation warning: ' + msg);
	        }
	    }

	    function deprecate(msg, fn) {
	        var firstTime = true;

	        return extend(function () {
	            if (hooks.deprecationHandler != null) {
	                hooks.deprecationHandler(null, msg);
	            }
	            if (firstTime) {
	                var args = [],
	                    arg,
	                    i,
	                    key,
	                    argLen = arguments.length;
	                for (i = 0; i < argLen; i++) {
	                    arg = '';
	                    if (typeof arguments[i] === 'object') {
	                        arg += '\n[' + i + '] ';
	                        for (key in arguments[0]) {
	                            if (hasOwnProp(arguments[0], key)) {
	                                arg += key + ': ' + arguments[0][key] + ', ';
	                            }
	                        }
	                        arg = arg.slice(0, -2); // Remove trailing comma and space
	                    } else {
	                        arg = arguments[i];
	                    }
	                    args.push(arg);
	                }
	                warn(
	                    msg +
	                        '\nArguments: ' +
	                        Array.prototype.slice.call(args).join('') +
	                        '\n' +
	                        new Error().stack
	                );
	                firstTime = false;
	            }
	            return fn.apply(this, arguments);
	        }, fn);
	    }

	    var deprecations = {};

	    function deprecateSimple(name, msg) {
	        if (hooks.deprecationHandler != null) {
	            hooks.deprecationHandler(name, msg);
	        }
	        if (!deprecations[name]) {
	            warn(msg);
	            deprecations[name] = true;
	        }
	    }

	    hooks.suppressDeprecationWarnings = false;
	    hooks.deprecationHandler = null;

	    function isFunction(input) {
	        return (
	            (typeof Function !== 'undefined' && input instanceof Function) ||
	            Object.prototype.toString.call(input) === '[object Function]'
	        );
	    }

	    function set(config) {
	        var prop, i;
	        for (i in config) {
	            if (hasOwnProp(config, i)) {
	                prop = config[i];
	                if (isFunction(prop)) {
	                    this[i] = prop;
	                } else {
	                    this['_' + i] = prop;
	                }
	            }
	        }
	        this._config = config;
	        // Lenient ordinal parsing accepts just a number in addition to
	        // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
	        // TODO: Remove "ordinalParse" fallback in next major release.
	        this._dayOfMonthOrdinalParseLenient = new RegExp(
	            (this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
	                '|' +
	                /\d{1,2}/.source
	        );
	    }

	    function mergeConfigs(parentConfig, childConfig) {
	        var res = extend({}, parentConfig),
	            prop;
	        for (prop in childConfig) {
	            if (hasOwnProp(childConfig, prop)) {
	                if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
	                    res[prop] = {};
	                    extend(res[prop], parentConfig[prop]);
	                    extend(res[prop], childConfig[prop]);
	                } else if (childConfig[prop] != null) {
	                    res[prop] = childConfig[prop];
	                } else {
	                    delete res[prop];
	                }
	            }
	        }
	        for (prop in parentConfig) {
	            if (
	                hasOwnProp(parentConfig, prop) &&
	                !hasOwnProp(childConfig, prop) &&
	                isObject(parentConfig[prop])
	            ) {
	                // make sure changes to properties don't modify parent config
	                res[prop] = extend({}, res[prop]);
	            }
	        }
	        return res;
	    }

	    function Locale(config) {
	        if (config != null) {
	            this.set(config);
	        }
	    }

	    var keys;

	    if (Object.keys) {
	        keys = Object.keys;
	    } else {
	        keys = function (obj) {
	            var i,
	                res = [];
	            for (i in obj) {
	                if (hasOwnProp(obj, i)) {
	                    res.push(i);
	                }
	            }
	            return res;
	        };
	    }

	    var defaultCalendar = {
	        sameDay: '[Today at] LT',
	        nextDay: '[Tomorrow at] LT',
	        nextWeek: 'dddd [at] LT',
	        lastDay: '[Yesterday at] LT',
	        lastWeek: '[Last] dddd [at] LT',
	        sameElse: 'L',
	    };

	    function calendar(key, mom, now) {
	        var output = this._calendar[key] || this._calendar['sameElse'];
	        return isFunction(output) ? output.call(mom, now) : output;
	    }

	    function zeroFill(number, targetLength, forceSign) {
	        var absNumber = '' + Math.abs(number),
	            zerosToFill = targetLength - absNumber.length,
	            sign = number >= 0;
	        return (
	            (sign ? (forceSign ? '+' : '') : '-') +
	            Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) +
	            absNumber
	        );
	    }

	    var formattingTokens =
	            /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,
	        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,
	        formatFunctions = {},
	        formatTokenFunctions = {};

	    // token:    'M'
	    // padded:   ['MM', 2]
	    // ordinal:  'Mo'
	    // callback: function () { this.month() + 1 }
	    function addFormatToken(token, padded, ordinal, callback) {
	        var func = callback;
	        if (typeof callback === 'string') {
	            func = function () {
	                return this[callback]();
	            };
	        }
	        if (token) {
	            formatTokenFunctions[token] = func;
	        }
	        if (padded) {
	            formatTokenFunctions[padded[0]] = function () {
	                return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
	            };
	        }
	        if (ordinal) {
	            formatTokenFunctions[ordinal] = function () {
	                return this.localeData().ordinal(
	                    func.apply(this, arguments),
	                    token
	                );
	            };
	        }
	    }

	    function removeFormattingTokens(input) {
	        if (input.match(/\[[\s\S]/)) {
	            return input.replace(/^\[|\]$/g, '');
	        }
	        return input.replace(/\\/g, '');
	    }

	    function makeFormatFunction(format) {
	        var array = format.match(formattingTokens),
	            i,
	            length;

	        for (i = 0, length = array.length; i < length; i++) {
	            if (formatTokenFunctions[array[i]]) {
	                array[i] = formatTokenFunctions[array[i]];
	            } else {
	                array[i] = removeFormattingTokens(array[i]);
	            }
	        }

	        return function (mom) {
	            var output = '',
	                i;
	            for (i = 0; i < length; i++) {
	                output += isFunction(array[i])
	                    ? array[i].call(mom, format)
	                    : array[i];
	            }
	            return output;
	        };
	    }

	    // format date using native date object
	    function formatMoment(m, format) {
	        if (!m.isValid()) {
	            return m.localeData().invalidDate();
	        }

	        format = expandFormat(format, m.localeData());
	        formatFunctions[format] =
	            formatFunctions[format] || makeFormatFunction(format);

	        return formatFunctions[format](m);
	    }

	    function expandFormat(format, locale) {
	        var i = 5;

	        function replaceLongDateFormatTokens(input) {
	            return locale.longDateFormat(input) || input;
	        }

	        localFormattingTokens.lastIndex = 0;
	        while (i >= 0 && localFormattingTokens.test(format)) {
	            format = format.replace(
	                localFormattingTokens,
	                replaceLongDateFormatTokens
	            );
	            localFormattingTokens.lastIndex = 0;
	            i -= 1;
	        }

	        return format;
	    }

	    var defaultLongDateFormat = {
	        LTS: 'h:mm:ss A',
	        LT: 'h:mm A',
	        L: 'MM/DD/YYYY',
	        LL: 'MMMM D, YYYY',
	        LLL: 'MMMM D, YYYY h:mm A',
	        LLLL: 'dddd, MMMM D, YYYY h:mm A',
	    };

	    function longDateFormat(key) {
	        var format = this._longDateFormat[key],
	            formatUpper = this._longDateFormat[key.toUpperCase()];

	        if (format || !formatUpper) {
	            return format;
	        }

	        this._longDateFormat[key] = formatUpper
	            .match(formattingTokens)
	            .map(function (tok) {
	                if (
	                    tok === 'MMMM' ||
	                    tok === 'MM' ||
	                    tok === 'DD' ||
	                    tok === 'dddd'
	                ) {
	                    return tok.slice(1);
	                }
	                return tok;
	            })
	            .join('');

	        return this._longDateFormat[key];
	    }

	    var defaultInvalidDate = 'Invalid date';

	    function invalidDate() {
	        return this._invalidDate;
	    }

	    var defaultOrdinal = '%d',
	        defaultDayOfMonthOrdinalParse = /\d{1,2}/;

	    function ordinal(number) {
	        return this._ordinal.replace('%d', number);
	    }

	    var defaultRelativeTime = {
	        future: 'in %s',
	        past: '%s ago',
	        s: 'a few seconds',
	        ss: '%d seconds',
	        m: 'a minute',
	        mm: '%d minutes',
	        h: 'an hour',
	        hh: '%d hours',
	        d: 'a day',
	        dd: '%d days',
	        w: 'a week',
	        ww: '%d weeks',
	        M: 'a month',
	        MM: '%d months',
	        y: 'a year',
	        yy: '%d years',
	    };

	    function relativeTime(number, withoutSuffix, string, isFuture) {
	        var output = this._relativeTime[string];
	        return isFunction(output)
	            ? output(number, withoutSuffix, string, isFuture)
	            : output.replace(/%d/i, number);
	    }

	    function pastFuture(diff, output) {
	        var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
	        return isFunction(format) ? format(output) : format.replace(/%s/i, output);
	    }

	    var aliases = {};

	    function addUnitAlias(unit, shorthand) {
	        var lowerCase = unit.toLowerCase();
	        aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
	    }

	    function normalizeUnits(units) {
	        return typeof units === 'string'
	            ? aliases[units] || aliases[units.toLowerCase()]
	            : undefined;
	    }

	    function normalizeObjectUnits(inputObject) {
	        var normalizedInput = {},
	            normalizedProp,
	            prop;

	        for (prop in inputObject) {
	            if (hasOwnProp(inputObject, prop)) {
	                normalizedProp = normalizeUnits(prop);
	                if (normalizedProp) {
	                    normalizedInput[normalizedProp] = inputObject[prop];
	                }
	            }
	        }

	        return normalizedInput;
	    }

	    var priorities = {};

	    function addUnitPriority(unit, priority) {
	        priorities[unit] = priority;
	    }

	    function getPrioritizedUnits(unitsObj) {
	        var units = [],
	            u;
	        for (u in unitsObj) {
	            if (hasOwnProp(unitsObj, u)) {
	                units.push({ unit: u, priority: priorities[u] });
	            }
	        }
	        units.sort(function (a, b) {
	            return a.priority - b.priority;
	        });
	        return units;
	    }

	    function isLeapYear(year) {
	        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	    }

	    function absFloor(number) {
	        if (number < 0) {
	            // -0 -> 0
	            return Math.ceil(number) || 0;
	        } else {
	            return Math.floor(number);
	        }
	    }

	    function toInt(argumentForCoercion) {
	        var coercedNumber = +argumentForCoercion,
	            value = 0;

	        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
	            value = absFloor(coercedNumber);
	        }

	        return value;
	    }

	    function makeGetSet(unit, keepTime) {
	        return function (value) {
	            if (value != null) {
	                set$1(this, unit, value);
	                hooks.updateOffset(this, keepTime);
	                return this;
	            } else {
	                return get(this, unit);
	            }
	        };
	    }

	    function get(mom, unit) {
	        return mom.isValid()
	            ? mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]()
	            : NaN;
	    }

	    function set$1(mom, unit, value) {
	        if (mom.isValid() && !isNaN(value)) {
	            if (
	                unit === 'FullYear' &&
	                isLeapYear(mom.year()) &&
	                mom.month() === 1 &&
	                mom.date() === 29
	            ) {
	                value = toInt(value);
	                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](
	                    value,
	                    mom.month(),
	                    daysInMonth(value, mom.month())
	                );
	            } else {
	                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
	            }
	        }
	    }

	    // MOMENTS

	    function stringGet(units) {
	        units = normalizeUnits(units);
	        if (isFunction(this[units])) {
	            return this[units]();
	        }
	        return this;
	    }

	    function stringSet(units, value) {
	        if (typeof units === 'object') {
	            units = normalizeObjectUnits(units);
	            var prioritized = getPrioritizedUnits(units),
	                i,
	                prioritizedLen = prioritized.length;
	            for (i = 0; i < prioritizedLen; i++) {
	                this[prioritized[i].unit](units[prioritized[i].unit]);
	            }
	        } else {
	            units = normalizeUnits(units);
	            if (isFunction(this[units])) {
	                return this[units](value);
	            }
	        }
	        return this;
	    }

	    var match1 = /\d/, //       0 - 9
	        match2 = /\d\d/, //      00 - 99
	        match3 = /\d{3}/, //     000 - 999
	        match4 = /\d{4}/, //    0000 - 9999
	        match6 = /[+-]?\d{6}/, // -999999 - 999999
	        match1to2 = /\d\d?/, //       0 - 99
	        match3to4 = /\d\d\d\d?/, //     999 - 9999
	        match5to6 = /\d\d\d\d\d\d?/, //   99999 - 999999
	        match1to3 = /\d{1,3}/, //       0 - 999
	        match1to4 = /\d{1,4}/, //       0 - 9999
	        match1to6 = /[+-]?\d{1,6}/, // -999999 - 999999
	        matchUnsigned = /\d+/, //       0 - inf
	        matchSigned = /[+-]?\d+/, //    -inf - inf
	        matchOffset = /Z|[+-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
	        matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi, // +00 -00 +00:00 -00:00 +0000 -0000 or Z
	        matchTimestamp = /[+-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123
	        // any word (or two) characters or numbers including two/three word month in arabic.
	        // includes scottish gaelic two word and hyphenated months
	        matchWord =
	            /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i,
	        regexes;

	    regexes = {};

	    function addRegexToken(token, regex, strictRegex) {
	        regexes[token] = isFunction(regex)
	            ? regex
	            : function (isStrict, localeData) {
	                  return isStrict && strictRegex ? strictRegex : regex;
	              };
	    }

	    function getParseRegexForToken(token, config) {
	        if (!hasOwnProp(regexes, token)) {
	            return new RegExp(unescapeFormat(token));
	        }

	        return regexes[token](config._strict, config._locale);
	    }

	    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
	    function unescapeFormat(s) {
	        return regexEscape(
	            s
	                .replace('\\', '')
	                .replace(
	                    /\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,
	                    function (matched, p1, p2, p3, p4) {
	                        return p1 || p2 || p3 || p4;
	                    }
	                )
	        );
	    }

	    function regexEscape(s) {
	        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	    }

	    var tokens = {};

	    function addParseToken(token, callback) {
	        var i,
	            func = callback,
	            tokenLen;
	        if (typeof token === 'string') {
	            token = [token];
	        }
	        if (isNumber(callback)) {
	            func = function (input, array) {
	                array[callback] = toInt(input);
	            };
	        }
	        tokenLen = token.length;
	        for (i = 0; i < tokenLen; i++) {
	            tokens[token[i]] = func;
	        }
	    }

	    function addWeekParseToken(token, callback) {
	        addParseToken(token, function (input, array, config, token) {
	            config._w = config._w || {};
	            callback(input, config._w, config, token);
	        });
	    }

	    function addTimeToArrayFromToken(token, input, config) {
	        if (input != null && hasOwnProp(tokens, token)) {
	            tokens[token](input, config._a, config, token);
	        }
	    }

	    var YEAR = 0,
	        MONTH = 1,
	        DATE = 2,
	        HOUR = 3,
	        MINUTE = 4,
	        SECOND = 5,
	        MILLISECOND = 6,
	        WEEK = 7,
	        WEEKDAY = 8;

	    function mod(n, x) {
	        return ((n % x) + x) % x;
	    }

	    var indexOf;

	    if (Array.prototype.indexOf) {
	        indexOf = Array.prototype.indexOf;
	    } else {
	        indexOf = function (o) {
	            // I know
	            var i;
	            for (i = 0; i < this.length; ++i) {
	                if (this[i] === o) {
	                    return i;
	                }
	            }
	            return -1;
	        };
	    }

	    function daysInMonth(year, month) {
	        if (isNaN(year) || isNaN(month)) {
	            return NaN;
	        }
	        var modMonth = mod(month, 12);
	        year += (month - modMonth) / 12;
	        return modMonth === 1
	            ? isLeapYear(year)
	                ? 29
	                : 28
	            : 31 - ((modMonth % 7) % 2);
	    }

	    // FORMATTING

	    addFormatToken('M', ['MM', 2], 'Mo', function () {
	        return this.month() + 1;
	    });

	    addFormatToken('MMM', 0, 0, function (format) {
	        return this.localeData().monthsShort(this, format);
	    });

	    addFormatToken('MMMM', 0, 0, function (format) {
	        return this.localeData().months(this, format);
	    });

	    // ALIASES

	    addUnitAlias('month', 'M');

	    // PRIORITY

	    addUnitPriority('month', 8);

	    // PARSING

	    addRegexToken('M', match1to2);
	    addRegexToken('MM', match1to2, match2);
	    addRegexToken('MMM', function (isStrict, locale) {
	        return locale.monthsShortRegex(isStrict);
	    });
	    addRegexToken('MMMM', function (isStrict, locale) {
	        return locale.monthsRegex(isStrict);
	    });

	    addParseToken(['M', 'MM'], function (input, array) {
	        array[MONTH] = toInt(input) - 1;
	    });

	    addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
	        var month = config._locale.monthsParse(input, token, config._strict);
	        // if we didn't find a month name, mark the date as invalid.
	        if (month != null) {
	            array[MONTH] = month;
	        } else {
	            getParsingFlags(config).invalidMonth = input;
	        }
	    });

	    // LOCALES

	    var defaultLocaleMonths =
	            'January_February_March_April_May_June_July_August_September_October_November_December'.split(
	                '_'
	            ),
	        defaultLocaleMonthsShort =
	            'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
	        MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/,
	        defaultMonthsShortRegex = matchWord,
	        defaultMonthsRegex = matchWord;

	    function localeMonths(m, format) {
	        if (!m) {
	            return isArray(this._months)
	                ? this._months
	                : this._months['standalone'];
	        }
	        return isArray(this._months)
	            ? this._months[m.month()]
	            : this._months[
	                  (this._months.isFormat || MONTHS_IN_FORMAT).test(format)
	                      ? 'format'
	                      : 'standalone'
	              ][m.month()];
	    }

	    function localeMonthsShort(m, format) {
	        if (!m) {
	            return isArray(this._monthsShort)
	                ? this._monthsShort
	                : this._monthsShort['standalone'];
	        }
	        return isArray(this._monthsShort)
	            ? this._monthsShort[m.month()]
	            : this._monthsShort[
	                  MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'
	              ][m.month()];
	    }

	    function handleStrictParse(monthName, format, strict) {
	        var i,
	            ii,
	            mom,
	            llc = monthName.toLocaleLowerCase();
	        if (!this._monthsParse) {
	            // this is not used
	            this._monthsParse = [];
	            this._longMonthsParse = [];
	            this._shortMonthsParse = [];
	            for (i = 0; i < 12; ++i) {
	                mom = createUTC([2000, i]);
	                this._shortMonthsParse[i] = this.monthsShort(
	                    mom,
	                    ''
	                ).toLocaleLowerCase();
	                this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
	            }
	        }

	        if (strict) {
	            if (format === 'MMM') {
	                ii = indexOf.call(this._shortMonthsParse, llc);
	                return ii !== -1 ? ii : null;
	            } else {
	                ii = indexOf.call(this._longMonthsParse, llc);
	                return ii !== -1 ? ii : null;
	            }
	        } else {
	            if (format === 'MMM') {
	                ii = indexOf.call(this._shortMonthsParse, llc);
	                if (ii !== -1) {
	                    return ii;
	                }
	                ii = indexOf.call(this._longMonthsParse, llc);
	                return ii !== -1 ? ii : null;
	            } else {
	                ii = indexOf.call(this._longMonthsParse, llc);
	                if (ii !== -1) {
	                    return ii;
	                }
	                ii = indexOf.call(this._shortMonthsParse, llc);
	                return ii !== -1 ? ii : null;
	            }
	        }
	    }

	    function localeMonthsParse(monthName, format, strict) {
	        var i, mom, regex;

	        if (this._monthsParseExact) {
	            return handleStrictParse.call(this, monthName, format, strict);
	        }

	        if (!this._monthsParse) {
	            this._monthsParse = [];
	            this._longMonthsParse = [];
	            this._shortMonthsParse = [];
	        }

	        // TODO: add sorting
	        // Sorting makes sure if one month (or abbr) is a prefix of another
	        // see sorting in computeMonthsParse
	        for (i = 0; i < 12; i++) {
	            // make the regex if we don't have it already
	            mom = createUTC([2000, i]);
	            if (strict && !this._longMonthsParse[i]) {
	                this._longMonthsParse[i] = new RegExp(
	                    '^' + this.months(mom, '').replace('.', '') + '$',
	                    'i'
	                );
	                this._shortMonthsParse[i] = new RegExp(
	                    '^' + this.monthsShort(mom, '').replace('.', '') + '$',
	                    'i'
	                );
	            }
	            if (!strict && !this._monthsParse[i]) {
	                regex =
	                    '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
	                this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
	            }
	            // test the regex
	            if (
	                strict &&
	                format === 'MMMM' &&
	                this._longMonthsParse[i].test(monthName)
	            ) {
	                return i;
	            } else if (
	                strict &&
	                format === 'MMM' &&
	                this._shortMonthsParse[i].test(monthName)
	            ) {
	                return i;
	            } else if (!strict && this._monthsParse[i].test(monthName)) {
	                return i;
	            }
	        }
	    }

	    // MOMENTS

	    function setMonth(mom, value) {
	        var dayOfMonth;

	        if (!mom.isValid()) {
	            // No op
	            return mom;
	        }

	        if (typeof value === 'string') {
	            if (/^\d+$/.test(value)) {
	                value = toInt(value);
	            } else {
	                value = mom.localeData().monthsParse(value);
	                // TODO: Another silent failure?
	                if (!isNumber(value)) {
	                    return mom;
	                }
	            }
	        }

	        dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
	        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
	        return mom;
	    }

	    function getSetMonth(value) {
	        if (value != null) {
	            setMonth(this, value);
	            hooks.updateOffset(this, true);
	            return this;
	        } else {
	            return get(this, 'Month');
	        }
	    }

	    function getDaysInMonth() {
	        return daysInMonth(this.year(), this.month());
	    }

	    function monthsShortRegex(isStrict) {
	        if (this._monthsParseExact) {
	            if (!hasOwnProp(this, '_monthsRegex')) {
	                computeMonthsParse.call(this);
	            }
	            if (isStrict) {
	                return this._monthsShortStrictRegex;
	            } else {
	                return this._monthsShortRegex;
	            }
	        } else {
	            if (!hasOwnProp(this, '_monthsShortRegex')) {
	                this._monthsShortRegex = defaultMonthsShortRegex;
	            }
	            return this._monthsShortStrictRegex && isStrict
	                ? this._monthsShortStrictRegex
	                : this._monthsShortRegex;
	        }
	    }

	    function monthsRegex(isStrict) {
	        if (this._monthsParseExact) {
	            if (!hasOwnProp(this, '_monthsRegex')) {
	                computeMonthsParse.call(this);
	            }
	            if (isStrict) {
	                return this._monthsStrictRegex;
	            } else {
	                return this._monthsRegex;
	            }
	        } else {
	            if (!hasOwnProp(this, '_monthsRegex')) {
	                this._monthsRegex = defaultMonthsRegex;
	            }
	            return this._monthsStrictRegex && isStrict
	                ? this._monthsStrictRegex
	                : this._monthsRegex;
	        }
	    }

	    function computeMonthsParse() {
	        function cmpLenRev(a, b) {
	            return b.length - a.length;
	        }

	        var shortPieces = [],
	            longPieces = [],
	            mixedPieces = [],
	            i,
	            mom;
	        for (i = 0; i < 12; i++) {
	            // make the regex if we don't have it already
	            mom = createUTC([2000, i]);
	            shortPieces.push(this.monthsShort(mom, ''));
	            longPieces.push(this.months(mom, ''));
	            mixedPieces.push(this.months(mom, ''));
	            mixedPieces.push(this.monthsShort(mom, ''));
	        }
	        // Sorting makes sure if one month (or abbr) is a prefix of another it
	        // will match the longer piece.
	        shortPieces.sort(cmpLenRev);
	        longPieces.sort(cmpLenRev);
	        mixedPieces.sort(cmpLenRev);
	        for (i = 0; i < 12; i++) {
	            shortPieces[i] = regexEscape(shortPieces[i]);
	            longPieces[i] = regexEscape(longPieces[i]);
	        }
	        for (i = 0; i < 24; i++) {
	            mixedPieces[i] = regexEscape(mixedPieces[i]);
	        }

	        this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
	        this._monthsShortRegex = this._monthsRegex;
	        this._monthsStrictRegex = new RegExp(
	            '^(' + longPieces.join('|') + ')',
	            'i'
	        );
	        this._monthsShortStrictRegex = new RegExp(
	            '^(' + shortPieces.join('|') + ')',
	            'i'
	        );
	    }

	    // FORMATTING

	    addFormatToken('Y', 0, 0, function () {
	        var y = this.year();
	        return y <= 9999 ? zeroFill(y, 4) : '+' + y;
	    });

	    addFormatToken(0, ['YY', 2], 0, function () {
	        return this.year() % 100;
	    });

	    addFormatToken(0, ['YYYY', 4], 0, 'year');
	    addFormatToken(0, ['YYYYY', 5], 0, 'year');
	    addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

	    // ALIASES

	    addUnitAlias('year', 'y');

	    // PRIORITIES

	    addUnitPriority('year', 1);

	    // PARSING

	    addRegexToken('Y', matchSigned);
	    addRegexToken('YY', match1to2, match2);
	    addRegexToken('YYYY', match1to4, match4);
	    addRegexToken('YYYYY', match1to6, match6);
	    addRegexToken('YYYYYY', match1to6, match6);

	    addParseToken(['YYYYY', 'YYYYYY'], YEAR);
	    addParseToken('YYYY', function (input, array) {
	        array[YEAR] =
	            input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
	    });
	    addParseToken('YY', function (input, array) {
	        array[YEAR] = hooks.parseTwoDigitYear(input);
	    });
	    addParseToken('Y', function (input, array) {
	        array[YEAR] = parseInt(input, 10);
	    });

	    // HELPERS

	    function daysInYear(year) {
	        return isLeapYear(year) ? 366 : 365;
	    }

	    // HOOKS

	    hooks.parseTwoDigitYear = function (input) {
	        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
	    };

	    // MOMENTS

	    var getSetYear = makeGetSet('FullYear', true);

	    function getIsLeapYear() {
	        return isLeapYear(this.year());
	    }

	    function createDate(y, m, d, h, M, s, ms) {
	        // can't just apply() to create a date:
	        // https://stackoverflow.com/q/181348
	        var date;
	        // the date constructor remaps years 0-99 to 1900-1999
	        if (y < 100 && y >= 0) {
	            // preserve leap years using a full 400 year cycle, then reset
	            date = new Date(y + 400, m, d, h, M, s, ms);
	            if (isFinite(date.getFullYear())) {
	                date.setFullYear(y);
	            }
	        } else {
	            date = new Date(y, m, d, h, M, s, ms);
	        }

	        return date;
	    }

	    function createUTCDate(y) {
	        var date, args;
	        // the Date.UTC function remaps years 0-99 to 1900-1999
	        if (y < 100 && y >= 0) {
	            args = Array.prototype.slice.call(arguments);
	            // preserve leap years using a full 400 year cycle, then reset
	            args[0] = y + 400;
	            date = new Date(Date.UTC.apply(null, args));
	            if (isFinite(date.getUTCFullYear())) {
	                date.setUTCFullYear(y);
	            }
	        } else {
	            date = new Date(Date.UTC.apply(null, arguments));
	        }

	        return date;
	    }

	    // start-of-first-week - start-of-year
	    function firstWeekOffset(year, dow, doy) {
	        var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
	            fwd = 7 + dow - doy,
	            // first-week day local weekday -- which local weekday is fwd
	            fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

	        return -fwdlw + fwd - 1;
	    }

	    // https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
	    function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
	        var localWeekday = (7 + weekday - dow) % 7,
	            weekOffset = firstWeekOffset(year, dow, doy),
	            dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
	            resYear,
	            resDayOfYear;

	        if (dayOfYear <= 0) {
	            resYear = year - 1;
	            resDayOfYear = daysInYear(resYear) + dayOfYear;
	        } else if (dayOfYear > daysInYear(year)) {
	            resYear = year + 1;
	            resDayOfYear = dayOfYear - daysInYear(year);
	        } else {
	            resYear = year;
	            resDayOfYear = dayOfYear;
	        }

	        return {
	            year: resYear,
	            dayOfYear: resDayOfYear,
	        };
	    }

	    function weekOfYear(mom, dow, doy) {
	        var weekOffset = firstWeekOffset(mom.year(), dow, doy),
	            week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
	            resWeek,
	            resYear;

	        if (week < 1) {
	            resYear = mom.year() - 1;
	            resWeek = week + weeksInYear(resYear, dow, doy);
	        } else if (week > weeksInYear(mom.year(), dow, doy)) {
	            resWeek = week - weeksInYear(mom.year(), dow, doy);
	            resYear = mom.year() + 1;
	        } else {
	            resYear = mom.year();
	            resWeek = week;
	        }

	        return {
	            week: resWeek,
	            year: resYear,
	        };
	    }

	    function weeksInYear(year, dow, doy) {
	        var weekOffset = firstWeekOffset(year, dow, doy),
	            weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
	        return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
	    }

	    // FORMATTING

	    addFormatToken('w', ['ww', 2], 'wo', 'week');
	    addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

	    // ALIASES

	    addUnitAlias('week', 'w');
	    addUnitAlias('isoWeek', 'W');

	    // PRIORITIES

	    addUnitPriority('week', 5);
	    addUnitPriority('isoWeek', 5);

	    // PARSING

	    addRegexToken('w', match1to2);
	    addRegexToken('ww', match1to2, match2);
	    addRegexToken('W', match1to2);
	    addRegexToken('WW', match1to2, match2);

	    addWeekParseToken(
	        ['w', 'ww', 'W', 'WW'],
	        function (input, week, config, token) {
	            week[token.substr(0, 1)] = toInt(input);
	        }
	    );

	    // HELPERS

	    // LOCALES

	    function localeWeek(mom) {
	        return weekOfYear(mom, this._week.dow, this._week.doy).week;
	    }

	    var defaultLocaleWeek = {
	        dow: 0, // Sunday is the first day of the week.
	        doy: 6, // The week that contains Jan 6th is the first week of the year.
	    };

	    function localeFirstDayOfWeek() {
	        return this._week.dow;
	    }

	    function localeFirstDayOfYear() {
	        return this._week.doy;
	    }

	    // MOMENTS

	    function getSetWeek(input) {
	        var week = this.localeData().week(this);
	        return input == null ? week : this.add((input - week) * 7, 'd');
	    }

	    function getSetISOWeek(input) {
	        var week = weekOfYear(this, 1, 4).week;
	        return input == null ? week : this.add((input - week) * 7, 'd');
	    }

	    // FORMATTING

	    addFormatToken('d', 0, 'do', 'day');

	    addFormatToken('dd', 0, 0, function (format) {
	        return this.localeData().weekdaysMin(this, format);
	    });

	    addFormatToken('ddd', 0, 0, function (format) {
	        return this.localeData().weekdaysShort(this, format);
	    });

	    addFormatToken('dddd', 0, 0, function (format) {
	        return this.localeData().weekdays(this, format);
	    });

	    addFormatToken('e', 0, 0, 'weekday');
	    addFormatToken('E', 0, 0, 'isoWeekday');

	    // ALIASES

	    addUnitAlias('day', 'd');
	    addUnitAlias('weekday', 'e');
	    addUnitAlias('isoWeekday', 'E');

	    // PRIORITY
	    addUnitPriority('day', 11);
	    addUnitPriority('weekday', 11);
	    addUnitPriority('isoWeekday', 11);

	    // PARSING

	    addRegexToken('d', match1to2);
	    addRegexToken('e', match1to2);
	    addRegexToken('E', match1to2);
	    addRegexToken('dd', function (isStrict, locale) {
	        return locale.weekdaysMinRegex(isStrict);
	    });
	    addRegexToken('ddd', function (isStrict, locale) {
	        return locale.weekdaysShortRegex(isStrict);
	    });
	    addRegexToken('dddd', function (isStrict, locale) {
	        return locale.weekdaysRegex(isStrict);
	    });

	    addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
	        var weekday = config._locale.weekdaysParse(input, token, config._strict);
	        // if we didn't get a weekday name, mark the date as invalid
	        if (weekday != null) {
	            week.d = weekday;
	        } else {
	            getParsingFlags(config).invalidWeekday = input;
	        }
	    });

	    addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
	        week[token] = toInt(input);
	    });

	    // HELPERS

	    function parseWeekday(input, locale) {
	        if (typeof input !== 'string') {
	            return input;
	        }

	        if (!isNaN(input)) {
	            return parseInt(input, 10);
	        }

	        input = locale.weekdaysParse(input);
	        if (typeof input === 'number') {
	            return input;
	        }

	        return null;
	    }

	    function parseIsoWeekday(input, locale) {
	        if (typeof input === 'string') {
	            return locale.weekdaysParse(input) % 7 || 7;
	        }
	        return isNaN(input) ? null : input;
	    }

	    // LOCALES
	    function shiftWeekdays(ws, n) {
	        return ws.slice(n, 7).concat(ws.slice(0, n));
	    }

	    var defaultLocaleWeekdays =
	            'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
	        defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
	        defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
	        defaultWeekdaysRegex = matchWord,
	        defaultWeekdaysShortRegex = matchWord,
	        defaultWeekdaysMinRegex = matchWord;

	    function localeWeekdays(m, format) {
	        var weekdays = isArray(this._weekdays)
	            ? this._weekdays
	            : this._weekdays[
	                  m && m !== true && this._weekdays.isFormat.test(format)
	                      ? 'format'
	                      : 'standalone'
	              ];
	        return m === true
	            ? shiftWeekdays(weekdays, this._week.dow)
	            : m
	            ? weekdays[m.day()]
	            : weekdays;
	    }

	    function localeWeekdaysShort(m) {
	        return m === true
	            ? shiftWeekdays(this._weekdaysShort, this._week.dow)
	            : m
	            ? this._weekdaysShort[m.day()]
	            : this._weekdaysShort;
	    }

	    function localeWeekdaysMin(m) {
	        return m === true
	            ? shiftWeekdays(this._weekdaysMin, this._week.dow)
	            : m
	            ? this._weekdaysMin[m.day()]
	            : this._weekdaysMin;
	    }

	    function handleStrictParse$1(weekdayName, format, strict) {
	        var i,
	            ii,
	            mom,
	            llc = weekdayName.toLocaleLowerCase();
	        if (!this._weekdaysParse) {
	            this._weekdaysParse = [];
	            this._shortWeekdaysParse = [];
	            this._minWeekdaysParse = [];

	            for (i = 0; i < 7; ++i) {
	                mom = createUTC([2000, 1]).day(i);
	                this._minWeekdaysParse[i] = this.weekdaysMin(
	                    mom,
	                    ''
	                ).toLocaleLowerCase();
	                this._shortWeekdaysParse[i] = this.weekdaysShort(
	                    mom,
	                    ''
	                ).toLocaleLowerCase();
	                this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
	            }
	        }

	        if (strict) {
	            if (format === 'dddd') {
	                ii = indexOf.call(this._weekdaysParse, llc);
	                return ii !== -1 ? ii : null;
	            } else if (format === 'ddd') {
	                ii = indexOf.call(this._shortWeekdaysParse, llc);
	                return ii !== -1 ? ii : null;
	            } else {
	                ii = indexOf.call(this._minWeekdaysParse, llc);
	                return ii !== -1 ? ii : null;
	            }
	        } else {
	            if (format === 'dddd') {
	                ii = indexOf.call(this._weekdaysParse, llc);
	                if (ii !== -1) {
	                    return ii;
	                }
	                ii = indexOf.call(this._shortWeekdaysParse, llc);
	                if (ii !== -1) {
	                    return ii;
	                }
	                ii = indexOf.call(this._minWeekdaysParse, llc);
	                return ii !== -1 ? ii : null;
	            } else if (format === 'ddd') {
	                ii = indexOf.call(this._shortWeekdaysParse, llc);
	                if (ii !== -1) {
	                    return ii;
	                }
	                ii = indexOf.call(this._weekdaysParse, llc);
	                if (ii !== -1) {
	                    return ii;
	                }
	                ii = indexOf.call(this._minWeekdaysParse, llc);
	                return ii !== -1 ? ii : null;
	            } else {
	                ii = indexOf.call(this._minWeekdaysParse, llc);
	                if (ii !== -1) {
	                    return ii;
	                }
	                ii = indexOf.call(this._weekdaysParse, llc);
	                if (ii !== -1) {
	                    return ii;
	                }
	                ii = indexOf.call(this._shortWeekdaysParse, llc);
	                return ii !== -1 ? ii : null;
	            }
	        }
	    }

	    function localeWeekdaysParse(weekdayName, format, strict) {
	        var i, mom, regex;

	        if (this._weekdaysParseExact) {
	            return handleStrictParse$1.call(this, weekdayName, format, strict);
	        }

	        if (!this._weekdaysParse) {
	            this._weekdaysParse = [];
	            this._minWeekdaysParse = [];
	            this._shortWeekdaysParse = [];
	            this._fullWeekdaysParse = [];
	        }

	        for (i = 0; i < 7; i++) {
	            // make the regex if we don't have it already

	            mom = createUTC([2000, 1]).day(i);
	            if (strict && !this._fullWeekdaysParse[i]) {
	                this._fullWeekdaysParse[i] = new RegExp(
	                    '^' + this.weekdays(mom, '').replace('.', '\\.?') + '$',
	                    'i'
	                );
	                this._shortWeekdaysParse[i] = new RegExp(
	                    '^' + this.weekdaysShort(mom, '').replace('.', '\\.?') + '$',
	                    'i'
	                );
	                this._minWeekdaysParse[i] = new RegExp(
	                    '^' + this.weekdaysMin(mom, '').replace('.', '\\.?') + '$',
	                    'i'
	                );
	            }
	            if (!this._weekdaysParse[i]) {
	                regex =
	                    '^' +
	                    this.weekdays(mom, '') +
	                    '|^' +
	                    this.weekdaysShort(mom, '') +
	                    '|^' +
	                    this.weekdaysMin(mom, '');
	                this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
	            }
	            // test the regex
	            if (
	                strict &&
	                format === 'dddd' &&
	                this._fullWeekdaysParse[i].test(weekdayName)
	            ) {
	                return i;
	            } else if (
	                strict &&
	                format === 'ddd' &&
	                this._shortWeekdaysParse[i].test(weekdayName)
	            ) {
	                return i;
	            } else if (
	                strict &&
	                format === 'dd' &&
	                this._minWeekdaysParse[i].test(weekdayName)
	            ) {
	                return i;
	            } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
	                return i;
	            }
	        }
	    }

	    // MOMENTS

	    function getSetDayOfWeek(input) {
	        if (!this.isValid()) {
	            return input != null ? this : NaN;
	        }
	        var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
	        if (input != null) {
	            input = parseWeekday(input, this.localeData());
	            return this.add(input - day, 'd');
	        } else {
	            return day;
	        }
	    }

	    function getSetLocaleDayOfWeek(input) {
	        if (!this.isValid()) {
	            return input != null ? this : NaN;
	        }
	        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
	        return input == null ? weekday : this.add(input - weekday, 'd');
	    }

	    function getSetISODayOfWeek(input) {
	        if (!this.isValid()) {
	            return input != null ? this : NaN;
	        }

	        // behaves the same as moment#day except
	        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
	        // as a setter, sunday should belong to the previous week.

	        if (input != null) {
	            var weekday = parseIsoWeekday(input, this.localeData());
	            return this.day(this.day() % 7 ? weekday : weekday - 7);
	        } else {
	            return this.day() || 7;
	        }
	    }

	    function weekdaysRegex(isStrict) {
	        if (this._weekdaysParseExact) {
	            if (!hasOwnProp(this, '_weekdaysRegex')) {
	                computeWeekdaysParse.call(this);
	            }
	            if (isStrict) {
	                return this._weekdaysStrictRegex;
	            } else {
	                return this._weekdaysRegex;
	            }
	        } else {
	            if (!hasOwnProp(this, '_weekdaysRegex')) {
	                this._weekdaysRegex = defaultWeekdaysRegex;
	            }
	            return this._weekdaysStrictRegex && isStrict
	                ? this._weekdaysStrictRegex
	                : this._weekdaysRegex;
	        }
	    }

	    function weekdaysShortRegex(isStrict) {
	        if (this._weekdaysParseExact) {
	            if (!hasOwnProp(this, '_weekdaysRegex')) {
	                computeWeekdaysParse.call(this);
	            }
	            if (isStrict) {
	                return this._weekdaysShortStrictRegex;
	            } else {
	                return this._weekdaysShortRegex;
	            }
	        } else {
	            if (!hasOwnProp(this, '_weekdaysShortRegex')) {
	                this._weekdaysShortRegex = defaultWeekdaysShortRegex;
	            }
	            return this._weekdaysShortStrictRegex && isStrict
	                ? this._weekdaysShortStrictRegex
	                : this._weekdaysShortRegex;
	        }
	    }

	    function weekdaysMinRegex(isStrict) {
	        if (this._weekdaysParseExact) {
	            if (!hasOwnProp(this, '_weekdaysRegex')) {
	                computeWeekdaysParse.call(this);
	            }
	            if (isStrict) {
	                return this._weekdaysMinStrictRegex;
	            } else {
	                return this._weekdaysMinRegex;
	            }
	        } else {
	            if (!hasOwnProp(this, '_weekdaysMinRegex')) {
	                this._weekdaysMinRegex = defaultWeekdaysMinRegex;
	            }
	            return this._weekdaysMinStrictRegex && isStrict
	                ? this._weekdaysMinStrictRegex
	                : this._weekdaysMinRegex;
	        }
	    }

	    function computeWeekdaysParse() {
	        function cmpLenRev(a, b) {
	            return b.length - a.length;
	        }

	        var minPieces = [],
	            shortPieces = [],
	            longPieces = [],
	            mixedPieces = [],
	            i,
	            mom,
	            minp,
	            shortp,
	            longp;
	        for (i = 0; i < 7; i++) {
	            // make the regex if we don't have it already
	            mom = createUTC([2000, 1]).day(i);
	            minp = regexEscape(this.weekdaysMin(mom, ''));
	            shortp = regexEscape(this.weekdaysShort(mom, ''));
	            longp = regexEscape(this.weekdays(mom, ''));
	            minPieces.push(minp);
	            shortPieces.push(shortp);
	            longPieces.push(longp);
	            mixedPieces.push(minp);
	            mixedPieces.push(shortp);
	            mixedPieces.push(longp);
	        }
	        // Sorting makes sure if one weekday (or abbr) is a prefix of another it
	        // will match the longer piece.
	        minPieces.sort(cmpLenRev);
	        shortPieces.sort(cmpLenRev);
	        longPieces.sort(cmpLenRev);
	        mixedPieces.sort(cmpLenRev);

	        this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
	        this._weekdaysShortRegex = this._weekdaysRegex;
	        this._weekdaysMinRegex = this._weekdaysRegex;

	        this._weekdaysStrictRegex = new RegExp(
	            '^(' + longPieces.join('|') + ')',
	            'i'
	        );
	        this._weekdaysShortStrictRegex = new RegExp(
	            '^(' + shortPieces.join('|') + ')',
	            'i'
	        );
	        this._weekdaysMinStrictRegex = new RegExp(
	            '^(' + minPieces.join('|') + ')',
	            'i'
	        );
	    }

	    // FORMATTING

	    function hFormat() {
	        return this.hours() % 12 || 12;
	    }

	    function kFormat() {
	        return this.hours() || 24;
	    }

	    addFormatToken('H', ['HH', 2], 0, 'hour');
	    addFormatToken('h', ['hh', 2], 0, hFormat);
	    addFormatToken('k', ['kk', 2], 0, kFormat);

	    addFormatToken('hmm', 0, 0, function () {
	        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
	    });

	    addFormatToken('hmmss', 0, 0, function () {
	        return (
	            '' +
	            hFormat.apply(this) +
	            zeroFill(this.minutes(), 2) +
	            zeroFill(this.seconds(), 2)
	        );
	    });

	    addFormatToken('Hmm', 0, 0, function () {
	        return '' + this.hours() + zeroFill(this.minutes(), 2);
	    });

	    addFormatToken('Hmmss', 0, 0, function () {
	        return (
	            '' +
	            this.hours() +
	            zeroFill(this.minutes(), 2) +
	            zeroFill(this.seconds(), 2)
	        );
	    });

	    function meridiem(token, lowercase) {
	        addFormatToken(token, 0, 0, function () {
	            return this.localeData().meridiem(
	                this.hours(),
	                this.minutes(),
	                lowercase
	            );
	        });
	    }

	    meridiem('a', true);
	    meridiem('A', false);

	    // ALIASES

	    addUnitAlias('hour', 'h');

	    // PRIORITY
	    addUnitPriority('hour', 13);

	    // PARSING

	    function matchMeridiem(isStrict, locale) {
	        return locale._meridiemParse;
	    }

	    addRegexToken('a', matchMeridiem);
	    addRegexToken('A', matchMeridiem);
	    addRegexToken('H', match1to2);
	    addRegexToken('h', match1to2);
	    addRegexToken('k', match1to2);
	    addRegexToken('HH', match1to2, match2);
	    addRegexToken('hh', match1to2, match2);
	    addRegexToken('kk', match1to2, match2);

	    addRegexToken('hmm', match3to4);
	    addRegexToken('hmmss', match5to6);
	    addRegexToken('Hmm', match3to4);
	    addRegexToken('Hmmss', match5to6);

	    addParseToken(['H', 'HH'], HOUR);
	    addParseToken(['k', 'kk'], function (input, array, config) {
	        var kInput = toInt(input);
	        array[HOUR] = kInput === 24 ? 0 : kInput;
	    });
	    addParseToken(['a', 'A'], function (input, array, config) {
	        config._isPm = config._locale.isPM(input);
	        config._meridiem = input;
	    });
	    addParseToken(['h', 'hh'], function (input, array, config) {
	        array[HOUR] = toInt(input);
	        getParsingFlags(config).bigHour = true;
	    });
	    addParseToken('hmm', function (input, array, config) {
	        var pos = input.length - 2;
	        array[HOUR] = toInt(input.substr(0, pos));
	        array[MINUTE] = toInt(input.substr(pos));
	        getParsingFlags(config).bigHour = true;
	    });
	    addParseToken('hmmss', function (input, array, config) {
	        var pos1 = input.length - 4,
	            pos2 = input.length - 2;
	        array[HOUR] = toInt(input.substr(0, pos1));
	        array[MINUTE] = toInt(input.substr(pos1, 2));
	        array[SECOND] = toInt(input.substr(pos2));
	        getParsingFlags(config).bigHour = true;
	    });
	    addParseToken('Hmm', function (input, array, config) {
	        var pos = input.length - 2;
	        array[HOUR] = toInt(input.substr(0, pos));
	        array[MINUTE] = toInt(input.substr(pos));
	    });
	    addParseToken('Hmmss', function (input, array, config) {
	        var pos1 = input.length - 4,
	            pos2 = input.length - 2;
	        array[HOUR] = toInt(input.substr(0, pos1));
	        array[MINUTE] = toInt(input.substr(pos1, 2));
	        array[SECOND] = toInt(input.substr(pos2));
	    });

	    // LOCALES

	    function localeIsPM(input) {
	        // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
	        // Using charAt should be more compatible.
	        return (input + '').toLowerCase().charAt(0) === 'p';
	    }

	    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i,
	        // Setting the hour should keep the time, because the user explicitly
	        // specified which hour they want. So trying to maintain the same hour (in
	        // a new timezone) makes sense. Adding/subtracting hours does not follow
	        // this rule.
	        getSetHour = makeGetSet('Hours', true);

	    function localeMeridiem(hours, minutes, isLower) {
	        if (hours > 11) {
	            return isLower ? 'pm' : 'PM';
	        } else {
	            return isLower ? 'am' : 'AM';
	        }
	    }

	    var baseConfig = {
	        calendar: defaultCalendar,
	        longDateFormat: defaultLongDateFormat,
	        invalidDate: defaultInvalidDate,
	        ordinal: defaultOrdinal,
	        dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
	        relativeTime: defaultRelativeTime,

	        months: defaultLocaleMonths,
	        monthsShort: defaultLocaleMonthsShort,

	        week: defaultLocaleWeek,

	        weekdays: defaultLocaleWeekdays,
	        weekdaysMin: defaultLocaleWeekdaysMin,
	        weekdaysShort: defaultLocaleWeekdaysShort,

	        meridiemParse: defaultLocaleMeridiemParse,
	    };

	    // internal storage for locale config files
	    var locales = {},
	        localeFamilies = {},
	        globalLocale;

	    function commonPrefix(arr1, arr2) {
	        var i,
	            minl = Math.min(arr1.length, arr2.length);
	        for (i = 0; i < minl; i += 1) {
	            if (arr1[i] !== arr2[i]) {
	                return i;
	            }
	        }
	        return minl;
	    }

	    function normalizeLocale(key) {
	        return key ? key.toLowerCase().replace('_', '-') : key;
	    }

	    // pick the locale from the array
	    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
	    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
	    function chooseLocale(names) {
	        var i = 0,
	            j,
	            next,
	            locale,
	            split;

	        while (i < names.length) {
	            split = normalizeLocale(names[i]).split('-');
	            j = split.length;
	            next = normalizeLocale(names[i + 1]);
	            next = next ? next.split('-') : null;
	            while (j > 0) {
	                locale = loadLocale(split.slice(0, j).join('-'));
	                if (locale) {
	                    return locale;
	                }
	                if (
	                    next &&
	                    next.length >= j &&
	                    commonPrefix(split, next) >= j - 1
	                ) {
	                    //the next array item is better than a shallower substring of this one
	                    break;
	                }
	                j--;
	            }
	            i++;
	        }
	        return globalLocale;
	    }

	    function isLocaleNameSane(name) {
	        // Prevent names that look like filesystem paths, i.e contain '/' or '\'
	        return name.match('^[^/\\\\]*$') != null;
	    }

	    function loadLocale(name) {
	        var oldLocale = null,
	            aliasedRequire;
	        // TODO: Find a better way to register and load all the locales in Node
	        if (
	            locales[name] === undefined &&
	            'object' !== 'undefined' &&
	            module &&
	            module.exports &&
	            isLocaleNameSane(name)
	        ) {
	            try {
	                oldLocale = globalLocale._abbr;
	                aliasedRequire = commonjsRequire;
	                aliasedRequire('./locale/' + name);
	                getSetGlobalLocale(oldLocale);
	            } catch (e) {
	                // mark as not found to avoid repeating expensive file require call causing high CPU
	                // when trying to find en-US, en_US, en-us for every format call
	                locales[name] = null; // null means not found
	            }
	        }
	        return locales[name];
	    }

	    // This function will load locale and then set the global locale.  If
	    // no arguments are passed in, it will simply return the current global
	    // locale key.
	    function getSetGlobalLocale(key, values) {
	        var data;
	        if (key) {
	            if (isUndefined(values)) {
	                data = getLocale(key);
	            } else {
	                data = defineLocale(key, values);
	            }

	            if (data) {
	                // moment.duration._locale = moment._locale = data;
	                globalLocale = data;
	            } else {
	                if (typeof console !== 'undefined' && console.warn) {
	                    //warn user if arguments are passed but the locale could not be set
	                    console.warn(
	                        'Locale ' + key + ' not found. Did you forget to load it?'
	                    );
	                }
	            }
	        }

	        return globalLocale._abbr;
	    }

	    function defineLocale(name, config) {
	        if (config !== null) {
	            var locale,
	                parentConfig = baseConfig;
	            config.abbr = name;
	            if (locales[name] != null) {
	                deprecateSimple(
	                    'defineLocaleOverride',
	                    'use moment.updateLocale(localeName, config) to change ' +
	                        'an existing locale. moment.defineLocale(localeName, ' +
	                        'config) should only be used for creating a new locale ' +
	                        'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.'
	                );
	                parentConfig = locales[name]._config;
	            } else if (config.parentLocale != null) {
	                if (locales[config.parentLocale] != null) {
	                    parentConfig = locales[config.parentLocale]._config;
	                } else {
	                    locale = loadLocale(config.parentLocale);
	                    if (locale != null) {
	                        parentConfig = locale._config;
	                    } else {
	                        if (!localeFamilies[config.parentLocale]) {
	                            localeFamilies[config.parentLocale] = [];
	                        }
	                        localeFamilies[config.parentLocale].push({
	                            name: name,
	                            config: config,
	                        });
	                        return null;
	                    }
	                }
	            }
	            locales[name] = new Locale(mergeConfigs(parentConfig, config));

	            if (localeFamilies[name]) {
	                localeFamilies[name].forEach(function (x) {
	                    defineLocale(x.name, x.config);
	                });
	            }

	            // backwards compat for now: also set the locale
	            // make sure we set the locale AFTER all child locales have been
	            // created, so we won't end up with the child locale set.
	            getSetGlobalLocale(name);

	            return locales[name];
	        } else {
	            // useful for testing
	            delete locales[name];
	            return null;
	        }
	    }

	    function updateLocale(name, config) {
	        if (config != null) {
	            var locale,
	                tmpLocale,
	                parentConfig = baseConfig;

	            if (locales[name] != null && locales[name].parentLocale != null) {
	                // Update existing child locale in-place to avoid memory-leaks
	                locales[name].set(mergeConfigs(locales[name]._config, config));
	            } else {
	                // MERGE
	                tmpLocale = loadLocale(name);
	                if (tmpLocale != null) {
	                    parentConfig = tmpLocale._config;
	                }
	                config = mergeConfigs(parentConfig, config);
	                if (tmpLocale == null) {
	                    // updateLocale is called for creating a new locale
	                    // Set abbr so it will have a name (getters return
	                    // undefined otherwise).
	                    config.abbr = name;
	                }
	                locale = new Locale(config);
	                locale.parentLocale = locales[name];
	                locales[name] = locale;
	            }

	            // backwards compat for now: also set the locale
	            getSetGlobalLocale(name);
	        } else {
	            // pass null for config to unupdate, useful for tests
	            if (locales[name] != null) {
	                if (locales[name].parentLocale != null) {
	                    locales[name] = locales[name].parentLocale;
	                    if (name === getSetGlobalLocale()) {
	                        getSetGlobalLocale(name);
	                    }
	                } else if (locales[name] != null) {
	                    delete locales[name];
	                }
	            }
	        }
	        return locales[name];
	    }

	    // returns locale data
	    function getLocale(key) {
	        var locale;

	        if (key && key._locale && key._locale._abbr) {
	            key = key._locale._abbr;
	        }

	        if (!key) {
	            return globalLocale;
	        }

	        if (!isArray(key)) {
	            //short-circuit everything else
	            locale = loadLocale(key);
	            if (locale) {
	                return locale;
	            }
	            key = [key];
	        }

	        return chooseLocale(key);
	    }

	    function listLocales() {
	        return keys(locales);
	    }

	    function checkOverflow(m) {
	        var overflow,
	            a = m._a;

	        if (a && getParsingFlags(m).overflow === -2) {
	            overflow =
	                a[MONTH] < 0 || a[MONTH] > 11
	                    ? MONTH
	                    : a[DATE] < 1 || a[DATE] > daysInMonth(a[YEAR], a[MONTH])
	                    ? DATE
	                    : a[HOUR] < 0 ||
	                      a[HOUR] > 24 ||
	                      (a[HOUR] === 24 &&
	                          (a[MINUTE] !== 0 ||
	                              a[SECOND] !== 0 ||
	                              a[MILLISECOND] !== 0))
	                    ? HOUR
	                    : a[MINUTE] < 0 || a[MINUTE] > 59
	                    ? MINUTE
	                    : a[SECOND] < 0 || a[SECOND] > 59
	                    ? SECOND
	                    : a[MILLISECOND] < 0 || a[MILLISECOND] > 999
	                    ? MILLISECOND
	                    : -1;

	            if (
	                getParsingFlags(m)._overflowDayOfYear &&
	                (overflow < YEAR || overflow > DATE)
	            ) {
	                overflow = DATE;
	            }
	            if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
	                overflow = WEEK;
	            }
	            if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
	                overflow = WEEKDAY;
	            }

	            getParsingFlags(m).overflow = overflow;
	        }

	        return m;
	    }

	    // iso 8601 regex
	    // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
	    var extendedIsoRegex =
	            /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
	        basicIsoRegex =
	            /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d|))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
	        tzRegex = /Z|[+-]\d\d(?::?\d\d)?/,
	        isoDates = [
	            ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
	            ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
	            ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
	            ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
	            ['YYYY-DDD', /\d{4}-\d{3}/],
	            ['YYYY-MM', /\d{4}-\d\d/, false],
	            ['YYYYYYMMDD', /[+-]\d{10}/],
	            ['YYYYMMDD', /\d{8}/],
	            ['GGGG[W]WWE', /\d{4}W\d{3}/],
	            ['GGGG[W]WW', /\d{4}W\d{2}/, false],
	            ['YYYYDDD', /\d{7}/],
	            ['YYYYMM', /\d{6}/, false],
	            ['YYYY', /\d{4}/, false],
	        ],
	        // iso time formats and regexes
	        isoTimes = [
	            ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
	            ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
	            ['HH:mm:ss', /\d\d:\d\d:\d\d/],
	            ['HH:mm', /\d\d:\d\d/],
	            ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
	            ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
	            ['HHmmss', /\d\d\d\d\d\d/],
	            ['HHmm', /\d\d\d\d/],
	            ['HH', /\d\d/],
	        ],
	        aspNetJsonRegex = /^\/?Date\((-?\d+)/i,
	        // RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
	        rfc2822 =
	            /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/,
	        obsOffsets = {
	            UT: 0,
	            GMT: 0,
	            EDT: -4 * 60,
	            EST: -5 * 60,
	            CDT: -5 * 60,
	            CST: -6 * 60,
	            MDT: -6 * 60,
	            MST: -7 * 60,
	            PDT: -7 * 60,
	            PST: -8 * 60,
	        };

	    // date from iso format
	    function configFromISO(config) {
	        var i,
	            l,
	            string = config._i,
	            match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
	            allowTime,
	            dateFormat,
	            timeFormat,
	            tzFormat,
	            isoDatesLen = isoDates.length,
	            isoTimesLen = isoTimes.length;

	        if (match) {
	            getParsingFlags(config).iso = true;
	            for (i = 0, l = isoDatesLen; i < l; i++) {
	                if (isoDates[i][1].exec(match[1])) {
	                    dateFormat = isoDates[i][0];
	                    allowTime = isoDates[i][2] !== false;
	                    break;
	                }
	            }
	            if (dateFormat == null) {
	                config._isValid = false;
	                return;
	            }
	            if (match[3]) {
	                for (i = 0, l = isoTimesLen; i < l; i++) {
	                    if (isoTimes[i][1].exec(match[3])) {
	                        // match[2] should be 'T' or space
	                        timeFormat = (match[2] || ' ') + isoTimes[i][0];
	                        break;
	                    }
	                }
	                if (timeFormat == null) {
	                    config._isValid = false;
	                    return;
	                }
	            }
	            if (!allowTime && timeFormat != null) {
	                config._isValid = false;
	                return;
	            }
	            if (match[4]) {
	                if (tzRegex.exec(match[4])) {
	                    tzFormat = 'Z';
	                } else {
	                    config._isValid = false;
	                    return;
	                }
	            }
	            config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
	            configFromStringAndFormat(config);
	        } else {
	            config._isValid = false;
	        }
	    }

	    function extractFromRFC2822Strings(
	        yearStr,
	        monthStr,
	        dayStr,
	        hourStr,
	        minuteStr,
	        secondStr
	    ) {
	        var result = [
	            untruncateYear(yearStr),
	            defaultLocaleMonthsShort.indexOf(monthStr),
	            parseInt(dayStr, 10),
	            parseInt(hourStr, 10),
	            parseInt(minuteStr, 10),
	        ];

	        if (secondStr) {
	            result.push(parseInt(secondStr, 10));
	        }

	        return result;
	    }

	    function untruncateYear(yearStr) {
	        var year = parseInt(yearStr, 10);
	        if (year <= 49) {
	            return 2000 + year;
	        } else if (year <= 999) {
	            return 1900 + year;
	        }
	        return year;
	    }

	    function preprocessRFC2822(s) {
	        // Remove comments and folding whitespace and replace multiple-spaces with a single space
	        return s
	            .replace(/\([^()]*\)|[\n\t]/g, ' ')
	            .replace(/(\s\s+)/g, ' ')
	            .replace(/^\s\s*/, '')
	            .replace(/\s\s*$/, '');
	    }

	    function checkWeekday(weekdayStr, parsedInput, config) {
	        if (weekdayStr) {
	            // TODO: Replace the vanilla JS Date object with an independent day-of-week check.
	            var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
	                weekdayActual = new Date(
	                    parsedInput[0],
	                    parsedInput[1],
	                    parsedInput[2]
	                ).getDay();
	            if (weekdayProvided !== weekdayActual) {
	                getParsingFlags(config).weekdayMismatch = true;
	                config._isValid = false;
	                return false;
	            }
	        }
	        return true;
	    }

	    function calculateOffset(obsOffset, militaryOffset, numOffset) {
	        if (obsOffset) {
	            return obsOffsets[obsOffset];
	        } else if (militaryOffset) {
	            // the only allowed military tz is Z
	            return 0;
	        } else {
	            var hm = parseInt(numOffset, 10),
	                m = hm % 100,
	                h = (hm - m) / 100;
	            return h * 60 + m;
	        }
	    }

	    // date and time from ref 2822 format
	    function configFromRFC2822(config) {
	        var match = rfc2822.exec(preprocessRFC2822(config._i)),
	            parsedArray;
	        if (match) {
	            parsedArray = extractFromRFC2822Strings(
	                match[4],
	                match[3],
	                match[2],
	                match[5],
	                match[6],
	                match[7]
	            );
	            if (!checkWeekday(match[1], parsedArray, config)) {
	                return;
	            }

	            config._a = parsedArray;
	            config._tzm = calculateOffset(match[8], match[9], match[10]);

	            config._d = createUTCDate.apply(null, config._a);
	            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);

	            getParsingFlags(config).rfc2822 = true;
	        } else {
	            config._isValid = false;
	        }
	    }

	    // date from 1) ASP.NET, 2) ISO, 3) RFC 2822 formats, or 4) optional fallback if parsing isn't strict
	    function configFromString(config) {
	        var matched = aspNetJsonRegex.exec(config._i);
	        if (matched !== null) {
	            config._d = new Date(+matched[1]);
	            return;
	        }

	        configFromISO(config);
	        if (config._isValid === false) {
	            delete config._isValid;
	        } else {
	            return;
	        }

	        configFromRFC2822(config);
	        if (config._isValid === false) {
	            delete config._isValid;
	        } else {
	            return;
	        }

	        if (config._strict) {
	            config._isValid = false;
	        } else {
	            // Final attempt, use Input Fallback
	            hooks.createFromInputFallback(config);
	        }
	    }

	    hooks.createFromInputFallback = deprecate(
	        'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' +
	            'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' +
	            'discouraged. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.',
	        function (config) {
	            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
	        }
	    );

	    // Pick the first defined of two or three arguments.
	    function defaults(a, b, c) {
	        if (a != null) {
	            return a;
	        }
	        if (b != null) {
	            return b;
	        }
	        return c;
	    }

	    function currentDateArray(config) {
	        // hooks is actually the exported moment object
	        var nowValue = new Date(hooks.now());
	        if (config._useUTC) {
	            return [
	                nowValue.getUTCFullYear(),
	                nowValue.getUTCMonth(),
	                nowValue.getUTCDate(),
	            ];
	        }
	        return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
	    }

	    // convert an array to a date.
	    // the array should mirror the parameters below
	    // note: all values past the year are optional and will default to the lowest possible value.
	    // [year, month, day , hour, minute, second, millisecond]
	    function configFromArray(config) {
	        var i,
	            date,
	            input = [],
	            currentDate,
	            expectedWeekday,
	            yearToUse;

	        if (config._d) {
	            return;
	        }

	        currentDate = currentDateArray(config);

	        //compute day of the year from weeks and weekdays
	        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
	            dayOfYearFromWeekInfo(config);
	        }

	        //if the day of the year is set, figure out what it is
	        if (config._dayOfYear != null) {
	            yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

	            if (
	                config._dayOfYear > daysInYear(yearToUse) ||
	                config._dayOfYear === 0
	            ) {
	                getParsingFlags(config)._overflowDayOfYear = true;
	            }

	            date = createUTCDate(yearToUse, 0, config._dayOfYear);
	            config._a[MONTH] = date.getUTCMonth();
	            config._a[DATE] = date.getUTCDate();
	        }

	        // Default to current date.
	        // * if no year, month, day of month are given, default to today
	        // * if day of month is given, default month and year
	        // * if month is given, default only year
	        // * if year is given, don't default anything
	        for (i = 0; i < 3 && config._a[i] == null; ++i) {
	            config._a[i] = input[i] = currentDate[i];
	        }

	        // Zero out whatever was not defaulted, including time
	        for (; i < 7; i++) {
	            config._a[i] = input[i] =
	                config._a[i] == null ? (i === 2 ? 1 : 0) : config._a[i];
	        }

	        // Check for 24:00:00.000
	        if (
	            config._a[HOUR] === 24 &&
	            config._a[MINUTE] === 0 &&
	            config._a[SECOND] === 0 &&
	            config._a[MILLISECOND] === 0
	        ) {
	            config._nextDay = true;
	            config._a[HOUR] = 0;
	        }

	        config._d = (config._useUTC ? createUTCDate : createDate).apply(
	            null,
	            input
	        );
	        expectedWeekday = config._useUTC
	            ? config._d.getUTCDay()
	            : config._d.getDay();

	        // Apply timezone offset from input. The actual utcOffset can be changed
	        // with parseZone.
	        if (config._tzm != null) {
	            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
	        }

	        if (config._nextDay) {
	            config._a[HOUR] = 24;
	        }

	        // check for mismatching day of week
	        if (
	            config._w &&
	            typeof config._w.d !== 'undefined' &&
	            config._w.d !== expectedWeekday
	        ) {
	            getParsingFlags(config).weekdayMismatch = true;
	        }
	    }

	    function dayOfYearFromWeekInfo(config) {
	        var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow, curWeek;

	        w = config._w;
	        if (w.GG != null || w.W != null || w.E != null) {
	            dow = 1;
	            doy = 4;

	            // TODO: We need to take the current isoWeekYear, but that depends on
	            // how we interpret now (local, utc, fixed offset). So create
	            // a now version of current config (take local/utc/offset flags, and
	            // create now).
	            weekYear = defaults(
	                w.GG,
	                config._a[YEAR],
	                weekOfYear(createLocal(), 1, 4).year
	            );
	            week = defaults(w.W, 1);
	            weekday = defaults(w.E, 1);
	            if (weekday < 1 || weekday > 7) {
	                weekdayOverflow = true;
	            }
	        } else {
	            dow = config._locale._week.dow;
	            doy = config._locale._week.doy;

	            curWeek = weekOfYear(createLocal(), dow, doy);

	            weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

	            // Default to current week.
	            week = defaults(w.w, curWeek.week);

	            if (w.d != null) {
	                // weekday -- low day numbers are considered next week
	                weekday = w.d;
	                if (weekday < 0 || weekday > 6) {
	                    weekdayOverflow = true;
	                }
	            } else if (w.e != null) {
	                // local weekday -- counting starts from beginning of week
	                weekday = w.e + dow;
	                if (w.e < 0 || w.e > 6) {
	                    weekdayOverflow = true;
	                }
	            } else {
	                // default to beginning of week
	                weekday = dow;
	            }
	        }
	        if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
	            getParsingFlags(config)._overflowWeeks = true;
	        } else if (weekdayOverflow != null) {
	            getParsingFlags(config)._overflowWeekday = true;
	        } else {
	            temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
	            config._a[YEAR] = temp.year;
	            config._dayOfYear = temp.dayOfYear;
	        }
	    }

	    // constant that refers to the ISO standard
	    hooks.ISO_8601 = function () {};

	    // constant that refers to the RFC 2822 form
	    hooks.RFC_2822 = function () {};

	    // date from string and format string
	    function configFromStringAndFormat(config) {
	        // TODO: Move this to another part of the creation flow to prevent circular deps
	        if (config._f === hooks.ISO_8601) {
	            configFromISO(config);
	            return;
	        }
	        if (config._f === hooks.RFC_2822) {
	            configFromRFC2822(config);
	            return;
	        }
	        config._a = [];
	        getParsingFlags(config).empty = true;

	        // This array is used to make a Date, either with `new Date` or `Date.UTC`
	        var string = '' + config._i,
	            i,
	            parsedInput,
	            tokens,
	            token,
	            skipped,
	            stringLength = string.length,
	            totalParsedInputLength = 0,
	            era,
	            tokenLen;

	        tokens =
	            expandFormat(config._f, config._locale).match(formattingTokens) || [];
	        tokenLen = tokens.length;
	        for (i = 0; i < tokenLen; i++) {
	            token = tokens[i];
	            parsedInput = (string.match(getParseRegexForToken(token, config)) ||
	                [])[0];
	            if (parsedInput) {
	                skipped = string.substr(0, string.indexOf(parsedInput));
	                if (skipped.length > 0) {
	                    getParsingFlags(config).unusedInput.push(skipped);
	                }
	                string = string.slice(
	                    string.indexOf(parsedInput) + parsedInput.length
	                );
	                totalParsedInputLength += parsedInput.length;
	            }
	            // don't parse if it's not a known token
	            if (formatTokenFunctions[token]) {
	                if (parsedInput) {
	                    getParsingFlags(config).empty = false;
	                } else {
	                    getParsingFlags(config).unusedTokens.push(token);
	                }
	                addTimeToArrayFromToken(token, parsedInput, config);
	            } else if (config._strict && !parsedInput) {
	                getParsingFlags(config).unusedTokens.push(token);
	            }
	        }

	        // add remaining unparsed input length to the string
	        getParsingFlags(config).charsLeftOver =
	            stringLength - totalParsedInputLength;
	        if (string.length > 0) {
	            getParsingFlags(config).unusedInput.push(string);
	        }

	        // clear _12h flag if hour is <= 12
	        if (
	            config._a[HOUR] <= 12 &&
	            getParsingFlags(config).bigHour === true &&
	            config._a[HOUR] > 0
	        ) {
	            getParsingFlags(config).bigHour = undefined;
	        }

	        getParsingFlags(config).parsedDateParts = config._a.slice(0);
	        getParsingFlags(config).meridiem = config._meridiem;
	        // handle meridiem
	        config._a[HOUR] = meridiemFixWrap(
	            config._locale,
	            config._a[HOUR],
	            config._meridiem
	        );

	        // handle era
	        era = getParsingFlags(config).era;
	        if (era !== null) {
	            config._a[YEAR] = config._locale.erasConvertYear(era, config._a[YEAR]);
	        }

	        configFromArray(config);
	        checkOverflow(config);
	    }

	    function meridiemFixWrap(locale, hour, meridiem) {
	        var isPm;

	        if (meridiem == null) {
	            // nothing to do
	            return hour;
	        }
	        if (locale.meridiemHour != null) {
	            return locale.meridiemHour(hour, meridiem);
	        } else if (locale.isPM != null) {
	            // Fallback
	            isPm = locale.isPM(meridiem);
	            if (isPm && hour < 12) {
	                hour += 12;
	            }
	            if (!isPm && hour === 12) {
	                hour = 0;
	            }
	            return hour;
	        } else {
	            // this is not supposed to happen
	            return hour;
	        }
	    }

	    // date from string and array of format strings
	    function configFromStringAndArray(config) {
	        var tempConfig,
	            bestMoment,
	            scoreToBeat,
	            i,
	            currentScore,
	            validFormatFound,
	            bestFormatIsValid = false,
	            configfLen = config._f.length;

	        if (configfLen === 0) {
	            getParsingFlags(config).invalidFormat = true;
	            config._d = new Date(NaN);
	            return;
	        }

	        for (i = 0; i < configfLen; i++) {
	            currentScore = 0;
	            validFormatFound = false;
	            tempConfig = copyConfig({}, config);
	            if (config._useUTC != null) {
	                tempConfig._useUTC = config._useUTC;
	            }
	            tempConfig._f = config._f[i];
	            configFromStringAndFormat(tempConfig);

	            if (isValid(tempConfig)) {
	                validFormatFound = true;
	            }

	            // if there is any input that was not parsed add a penalty for that format
	            currentScore += getParsingFlags(tempConfig).charsLeftOver;

	            //or tokens
	            currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

	            getParsingFlags(tempConfig).score = currentScore;

	            if (!bestFormatIsValid) {
	                if (
	                    scoreToBeat == null ||
	                    currentScore < scoreToBeat ||
	                    validFormatFound
	                ) {
	                    scoreToBeat = currentScore;
	                    bestMoment = tempConfig;
	                    if (validFormatFound) {
	                        bestFormatIsValid = true;
	                    }
	                }
	            } else {
	                if (currentScore < scoreToBeat) {
	                    scoreToBeat = currentScore;
	                    bestMoment = tempConfig;
	                }
	            }
	        }

	        extend(config, bestMoment || tempConfig);
	    }

	    function configFromObject(config) {
	        if (config._d) {
	            return;
	        }

	        var i = normalizeObjectUnits(config._i),
	            dayOrDate = i.day === undefined ? i.date : i.day;
	        config._a = map(
	            [i.year, i.month, dayOrDate, i.hour, i.minute, i.second, i.millisecond],
	            function (obj) {
	                return obj && parseInt(obj, 10);
	            }
	        );

	        configFromArray(config);
	    }

	    function createFromConfig(config) {
	        var res = new Moment(checkOverflow(prepareConfig(config)));
	        if (res._nextDay) {
	            // Adding is smart enough around DST
	            res.add(1, 'd');
	            res._nextDay = undefined;
	        }

	        return res;
	    }

	    function prepareConfig(config) {
	        var input = config._i,
	            format = config._f;

	        config._locale = config._locale || getLocale(config._l);

	        if (input === null || (format === undefined && input === '')) {
	            return createInvalid({ nullInput: true });
	        }

	        if (typeof input === 'string') {
	            config._i = input = config._locale.preparse(input);
	        }

	        if (isMoment(input)) {
	            return new Moment(checkOverflow(input));
	        } else if (isDate(input)) {
	            config._d = input;
	        } else if (isArray(format)) {
	            configFromStringAndArray(config);
	        } else if (format) {
	            configFromStringAndFormat(config);
	        } else {
	            configFromInput(config);
	        }

	        if (!isValid(config)) {
	            config._d = null;
	        }

	        return config;
	    }

	    function configFromInput(config) {
	        var input = config._i;
	        if (isUndefined(input)) {
	            config._d = new Date(hooks.now());
	        } else if (isDate(input)) {
	            config._d = new Date(input.valueOf());
	        } else if (typeof input === 'string') {
	            configFromString(config);
	        } else if (isArray(input)) {
	            config._a = map(input.slice(0), function (obj) {
	                return parseInt(obj, 10);
	            });
	            configFromArray(config);
	        } else if (isObject(input)) {
	            configFromObject(config);
	        } else if (isNumber(input)) {
	            // from milliseconds
	            config._d = new Date(input);
	        } else {
	            hooks.createFromInputFallback(config);
	        }
	    }

	    function createLocalOrUTC(input, format, locale, strict, isUTC) {
	        var c = {};

	        if (format === true || format === false) {
	            strict = format;
	            format = undefined;
	        }

	        if (locale === true || locale === false) {
	            strict = locale;
	            locale = undefined;
	        }

	        if (
	            (isObject(input) && isObjectEmpty(input)) ||
	            (isArray(input) && input.length === 0)
	        ) {
	            input = undefined;
	        }
	        // object construction must be done this way.
	        // https://github.com/moment/moment/issues/1423
	        c._isAMomentObject = true;
	        c._useUTC = c._isUTC = isUTC;
	        c._l = locale;
	        c._i = input;
	        c._f = format;
	        c._strict = strict;

	        return createFromConfig(c);
	    }

	    function createLocal(input, format, locale, strict) {
	        return createLocalOrUTC(input, format, locale, strict, false);
	    }

	    var prototypeMin = deprecate(
	            'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
	            function () {
	                var other = createLocal.apply(null, arguments);
	                if (this.isValid() && other.isValid()) {
	                    return other < this ? this : other;
	                } else {
	                    return createInvalid();
	                }
	            }
	        ),
	        prototypeMax = deprecate(
	            'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
	            function () {
	                var other = createLocal.apply(null, arguments);
	                if (this.isValid() && other.isValid()) {
	                    return other > this ? this : other;
	                } else {
	                    return createInvalid();
	                }
	            }
	        );

	    // Pick a moment m from moments so that m[fn](other) is true for all
	    // other. This relies on the function fn to be transitive.
	    //
	    // moments should either be an array of moment objects or an array, whose
	    // first element is an array of moment objects.
	    function pickBy(fn, moments) {
	        var res, i;
	        if (moments.length === 1 && isArray(moments[0])) {
	            moments = moments[0];
	        }
	        if (!moments.length) {
	            return createLocal();
	        }
	        res = moments[0];
	        for (i = 1; i < moments.length; ++i) {
	            if (!moments[i].isValid() || moments[i][fn](res)) {
	                res = moments[i];
	            }
	        }
	        return res;
	    }

	    // TODO: Use [].sort instead?
	    function min() {
	        var args = [].slice.call(arguments, 0);

	        return pickBy('isBefore', args);
	    }

	    function max() {
	        var args = [].slice.call(arguments, 0);

	        return pickBy('isAfter', args);
	    }

	    var now = function () {
	        return Date.now ? Date.now() : +new Date();
	    };

	    var ordering = [
	        'year',
	        'quarter',
	        'month',
	        'week',
	        'day',
	        'hour',
	        'minute',
	        'second',
	        'millisecond',
	    ];

	    function isDurationValid(m) {
	        var key,
	            unitHasDecimal = false,
	            i,
	            orderLen = ordering.length;
	        for (key in m) {
	            if (
	                hasOwnProp(m, key) &&
	                !(
	                    indexOf.call(ordering, key) !== -1 &&
	                    (m[key] == null || !isNaN(m[key]))
	                )
	            ) {
	                return false;
	            }
	        }

	        for (i = 0; i < orderLen; ++i) {
	            if (m[ordering[i]]) {
	                if (unitHasDecimal) {
	                    return false; // only allow non-integers for smallest unit
	                }
	                if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
	                    unitHasDecimal = true;
	                }
	            }
	        }

	        return true;
	    }

	    function isValid$1() {
	        return this._isValid;
	    }

	    function createInvalid$1() {
	        return createDuration(NaN);
	    }

	    function Duration(duration) {
	        var normalizedInput = normalizeObjectUnits(duration),
	            years = normalizedInput.year || 0,
	            quarters = normalizedInput.quarter || 0,
	            months = normalizedInput.month || 0,
	            weeks = normalizedInput.week || normalizedInput.isoWeek || 0,
	            days = normalizedInput.day || 0,
	            hours = normalizedInput.hour || 0,
	            minutes = normalizedInput.minute || 0,
	            seconds = normalizedInput.second || 0,
	            milliseconds = normalizedInput.millisecond || 0;

	        this._isValid = isDurationValid(normalizedInput);

	        // representation for dateAddRemove
	        this._milliseconds =
	            +milliseconds +
	            seconds * 1e3 + // 1000
	            minutes * 6e4 + // 1000 * 60
	            hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
	        // Because of dateAddRemove treats 24 hours as different from a
	        // day when working around DST, we need to store them separately
	        this._days = +days + weeks * 7;
	        // It is impossible to translate months into days without knowing
	        // which months you are are talking about, so we have to store
	        // it separately.
	        this._months = +months + quarters * 3 + years * 12;

	        this._data = {};

	        this._locale = getLocale();

	        this._bubble();
	    }

	    function isDuration(obj) {
	        return obj instanceof Duration;
	    }

	    function absRound(number) {
	        if (number < 0) {
	            return Math.round(-1 * number) * -1;
	        } else {
	            return Math.round(number);
	        }
	    }

	    // compare two arrays, return the number of differences
	    function compareArrays(array1, array2, dontConvert) {
	        var len = Math.min(array1.length, array2.length),
	            lengthDiff = Math.abs(array1.length - array2.length),
	            diffs = 0,
	            i;
	        for (i = 0; i < len; i++) {
	            if (
	                (dontConvert && array1[i] !== array2[i]) ||
	                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))
	            ) {
	                diffs++;
	            }
	        }
	        return diffs + lengthDiff;
	    }

	    // FORMATTING

	    function offset(token, separator) {
	        addFormatToken(token, 0, 0, function () {
	            var offset = this.utcOffset(),
	                sign = '+';
	            if (offset < 0) {
	                offset = -offset;
	                sign = '-';
	            }
	            return (
	                sign +
	                zeroFill(~~(offset / 60), 2) +
	                separator +
	                zeroFill(~~offset % 60, 2)
	            );
	        });
	    }

	    offset('Z', ':');
	    offset('ZZ', '');

	    // PARSING

	    addRegexToken('Z', matchShortOffset);
	    addRegexToken('ZZ', matchShortOffset);
	    addParseToken(['Z', 'ZZ'], function (input, array, config) {
	        config._useUTC = true;
	        config._tzm = offsetFromString(matchShortOffset, input);
	    });

	    // HELPERS

	    // timezone chunker
	    // '+10:00' > ['10',  '00']
	    // '-1530'  > ['-15', '30']
	    var chunkOffset = /([\+\-]|\d\d)/gi;

	    function offsetFromString(matcher, string) {
	        var matches = (string || '').match(matcher),
	            chunk,
	            parts,
	            minutes;

	        if (matches === null) {
	            return null;
	        }

	        chunk = matches[matches.length - 1] || [];
	        parts = (chunk + '').match(chunkOffset) || ['-', 0, 0];
	        minutes = +(parts[1] * 60) + toInt(parts[2]);

	        return minutes === 0 ? 0 : parts[0] === '+' ? minutes : -minutes;
	    }

	    // Return a moment from input, that is local/utc/zone equivalent to model.
	    function cloneWithOffset(input, model) {
	        var res, diff;
	        if (model._isUTC) {
	            res = model.clone();
	            diff =
	                (isMoment(input) || isDate(input)
	                    ? input.valueOf()
	                    : createLocal(input).valueOf()) - res.valueOf();
	            // Use low-level api, because this fn is low-level api.
	            res._d.setTime(res._d.valueOf() + diff);
	            hooks.updateOffset(res, false);
	            return res;
	        } else {
	            return createLocal(input).local();
	        }
	    }

	    function getDateOffset(m) {
	        // On Firefox.24 Date#getTimezoneOffset returns a floating point.
	        // https://github.com/moment/moment/pull/1871
	        return -Math.round(m._d.getTimezoneOffset());
	    }

	    // HOOKS

	    // This function will be called whenever a moment is mutated.
	    // It is intended to keep the offset in sync with the timezone.
	    hooks.updateOffset = function () {};

	    // MOMENTS

	    // keepLocalTime = true means only change the timezone, without
	    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
	    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
	    // +0200, so we adjust the time as needed, to be valid.
	    //
	    // Keeping the time actually adds/subtracts (one hour)
	    // from the actual represented time. That is why we call updateOffset
	    // a second time. In case it wants us to change the offset again
	    // _changeInProgress == true case, then we have to adjust, because
	    // there is no such time in the given timezone.
	    function getSetOffset(input, keepLocalTime, keepMinutes) {
	        var offset = this._offset || 0,
	            localAdjust;
	        if (!this.isValid()) {
	            return input != null ? this : NaN;
	        }
	        if (input != null) {
	            if (typeof input === 'string') {
	                input = offsetFromString(matchShortOffset, input);
	                if (input === null) {
	                    return this;
	                }
	            } else if (Math.abs(input) < 16 && !keepMinutes) {
	                input = input * 60;
	            }
	            if (!this._isUTC && keepLocalTime) {
	                localAdjust = getDateOffset(this);
	            }
	            this._offset = input;
	            this._isUTC = true;
	            if (localAdjust != null) {
	                this.add(localAdjust, 'm');
	            }
	            if (offset !== input) {
	                if (!keepLocalTime || this._changeInProgress) {
	                    addSubtract(
	                        this,
	                        createDuration(input - offset, 'm'),
	                        1,
	                        false
	                    );
	                } else if (!this._changeInProgress) {
	                    this._changeInProgress = true;
	                    hooks.updateOffset(this, true);
	                    this._changeInProgress = null;
	                }
	            }
	            return this;
	        } else {
	            return this._isUTC ? offset : getDateOffset(this);
	        }
	    }

	    function getSetZone(input, keepLocalTime) {
	        if (input != null) {
	            if (typeof input !== 'string') {
	                input = -input;
	            }

	            this.utcOffset(input, keepLocalTime);

	            return this;
	        } else {
	            return -this.utcOffset();
	        }
	    }

	    function setOffsetToUTC(keepLocalTime) {
	        return this.utcOffset(0, keepLocalTime);
	    }

	    function setOffsetToLocal(keepLocalTime) {
	        if (this._isUTC) {
	            this.utcOffset(0, keepLocalTime);
	            this._isUTC = false;

	            if (keepLocalTime) {
	                this.subtract(getDateOffset(this), 'm');
	            }
	        }
	        return this;
	    }

	    function setOffsetToParsedOffset() {
	        if (this._tzm != null) {
	            this.utcOffset(this._tzm, false, true);
	        } else if (typeof this._i === 'string') {
	            var tZone = offsetFromString(matchOffset, this._i);
	            if (tZone != null) {
	                this.utcOffset(tZone);
	            } else {
	                this.utcOffset(0, true);
	            }
	        }
	        return this;
	    }

	    function hasAlignedHourOffset(input) {
	        if (!this.isValid()) {
	            return false;
	        }
	        input = input ? createLocal(input).utcOffset() : 0;

	        return (this.utcOffset() - input) % 60 === 0;
	    }

	    function isDaylightSavingTime() {
	        return (
	            this.utcOffset() > this.clone().month(0).utcOffset() ||
	            this.utcOffset() > this.clone().month(5).utcOffset()
	        );
	    }

	    function isDaylightSavingTimeShifted() {
	        if (!isUndefined(this._isDSTShifted)) {
	            return this._isDSTShifted;
	        }

	        var c = {},
	            other;

	        copyConfig(c, this);
	        c = prepareConfig(c);

	        if (c._a) {
	            other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
	            this._isDSTShifted =
	                this.isValid() && compareArrays(c._a, other.toArray()) > 0;
	        } else {
	            this._isDSTShifted = false;
	        }

	        return this._isDSTShifted;
	    }

	    function isLocal() {
	        return this.isValid() ? !this._isUTC : false;
	    }

	    function isUtcOffset() {
	        return this.isValid() ? this._isUTC : false;
	    }

	    function isUtc() {
	        return this.isValid() ? this._isUTC && this._offset === 0 : false;
	    }

	    // ASP.NET json date format regex
	    var aspNetRegex = /^(-|\+)?(?:(\d*)[. ])?(\d+):(\d+)(?::(\d+)(\.\d*)?)?$/,
	        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
	        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
	        // and further modified to allow for strings containing both week and day
	        isoRegex =
	            /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

	    function createDuration(input, key) {
	        var duration = input,
	            // matching against regexp is expensive, do it on demand
	            match = null,
	            sign,
	            ret,
	            diffRes;

	        if (isDuration(input)) {
	            duration = {
	                ms: input._milliseconds,
	                d: input._days,
	                M: input._months,
	            };
	        } else if (isNumber(input) || !isNaN(+input)) {
	            duration = {};
	            if (key) {
	                duration[key] = +input;
	            } else {
	                duration.milliseconds = +input;
	            }
	        } else if ((match = aspNetRegex.exec(input))) {
	            sign = match[1] === '-' ? -1 : 1;
	            duration = {
	                y: 0,
	                d: toInt(match[DATE]) * sign,
	                h: toInt(match[HOUR]) * sign,
	                m: toInt(match[MINUTE]) * sign,
	                s: toInt(match[SECOND]) * sign,
	                ms: toInt(absRound(match[MILLISECOND] * 1000)) * sign, // the millisecond decimal point is included in the match
	            };
	        } else if ((match = isoRegex.exec(input))) {
	            sign = match[1] === '-' ? -1 : 1;
	            duration = {
	                y: parseIso(match[2], sign),
	                M: parseIso(match[3], sign),
	                w: parseIso(match[4], sign),
	                d: parseIso(match[5], sign),
	                h: parseIso(match[6], sign),
	                m: parseIso(match[7], sign),
	                s: parseIso(match[8], sign),
	            };
	        } else if (duration == null) {
	            // checks for null or undefined
	            duration = {};
	        } else if (
	            typeof duration === 'object' &&
	            ('from' in duration || 'to' in duration)
	        ) {
	            diffRes = momentsDifference(
	                createLocal(duration.from),
	                createLocal(duration.to)
	            );

	            duration = {};
	            duration.ms = diffRes.milliseconds;
	            duration.M = diffRes.months;
	        }

	        ret = new Duration(duration);

	        if (isDuration(input) && hasOwnProp(input, '_locale')) {
	            ret._locale = input._locale;
	        }

	        if (isDuration(input) && hasOwnProp(input, '_isValid')) {
	            ret._isValid = input._isValid;
	        }

	        return ret;
	    }

	    createDuration.fn = Duration.prototype;
	    createDuration.invalid = createInvalid$1;

	    function parseIso(inp, sign) {
	        // We'd normally use ~~inp for this, but unfortunately it also
	        // converts floats to ints.
	        // inp may be undefined, so careful calling replace on it.
	        var res = inp && parseFloat(inp.replace(',', '.'));
	        // apply sign while we're at it
	        return (isNaN(res) ? 0 : res) * sign;
	    }

	    function positiveMomentsDifference(base, other) {
	        var res = {};

	        res.months =
	            other.month() - base.month() + (other.year() - base.year()) * 12;
	        if (base.clone().add(res.months, 'M').isAfter(other)) {
	            --res.months;
	        }

	        res.milliseconds = +other - +base.clone().add(res.months, 'M');

	        return res;
	    }

	    function momentsDifference(base, other) {
	        var res;
	        if (!(base.isValid() && other.isValid())) {
	            return { milliseconds: 0, months: 0 };
	        }

	        other = cloneWithOffset(other, base);
	        if (base.isBefore(other)) {
	            res = positiveMomentsDifference(base, other);
	        } else {
	            res = positiveMomentsDifference(other, base);
	            res.milliseconds = -res.milliseconds;
	            res.months = -res.months;
	        }

	        return res;
	    }

	    // TODO: remove 'name' arg after deprecation is removed
	    function createAdder(direction, name) {
	        return function (val, period) {
	            var dur, tmp;
	            //invert the arguments, but complain about it
	            if (period !== null && !isNaN(+period)) {
	                deprecateSimple(
	                    name,
	                    'moment().' +
	                        name +
	                        '(period, number) is deprecated. Please use moment().' +
	                        name +
	                        '(number, period). ' +
	                        'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.'
	                );
	                tmp = val;
	                val = period;
	                period = tmp;
	            }

	            dur = createDuration(val, period);
	            addSubtract(this, dur, direction);
	            return this;
	        };
	    }

	    function addSubtract(mom, duration, isAdding, updateOffset) {
	        var milliseconds = duration._milliseconds,
	            days = absRound(duration._days),
	            months = absRound(duration._months);

	        if (!mom.isValid()) {
	            // No op
	            return;
	        }

	        updateOffset = updateOffset == null ? true : updateOffset;

	        if (months) {
	            setMonth(mom, get(mom, 'Month') + months * isAdding);
	        }
	        if (days) {
	            set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
	        }
	        if (milliseconds) {
	            mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
	        }
	        if (updateOffset) {
	            hooks.updateOffset(mom, days || months);
	        }
	    }

	    var add = createAdder(1, 'add'),
	        subtract = createAdder(-1, 'subtract');

	    function isString(input) {
	        return typeof input === 'string' || input instanceof String;
	    }

	    // type MomentInput = Moment | Date | string | number | (number | string)[] | MomentInputObject | void; // null | undefined
	    function isMomentInput(input) {
	        return (
	            isMoment(input) ||
	            isDate(input) ||
	            isString(input) ||
	            isNumber(input) ||
	            isNumberOrStringArray(input) ||
	            isMomentInputObject(input) ||
	            input === null ||
	            input === undefined
	        );
	    }

	    function isMomentInputObject(input) {
	        var objectTest = isObject(input) && !isObjectEmpty(input),
	            propertyTest = false,
	            properties = [
	                'years',
	                'year',
	                'y',
	                'months',
	                'month',
	                'M',
	                'days',
	                'day',
	                'd',
	                'dates',
	                'date',
	                'D',
	                'hours',
	                'hour',
	                'h',
	                'minutes',
	                'minute',
	                'm',
	                'seconds',
	                'second',
	                's',
	                'milliseconds',
	                'millisecond',
	                'ms',
	            ],
	            i,
	            property,
	            propertyLen = properties.length;

	        for (i = 0; i < propertyLen; i += 1) {
	            property = properties[i];
	            propertyTest = propertyTest || hasOwnProp(input, property);
	        }

	        return objectTest && propertyTest;
	    }

	    function isNumberOrStringArray(input) {
	        var arrayTest = isArray(input),
	            dataTypeTest = false;
	        if (arrayTest) {
	            dataTypeTest =
	                input.filter(function (item) {
	                    return !isNumber(item) && isString(input);
	                }).length === 0;
	        }
	        return arrayTest && dataTypeTest;
	    }

	    function isCalendarSpec(input) {
	        var objectTest = isObject(input) && !isObjectEmpty(input),
	            propertyTest = false,
	            properties = [
	                'sameDay',
	                'nextDay',
	                'lastDay',
	                'nextWeek',
	                'lastWeek',
	                'sameElse',
	            ],
	            i,
	            property;

	        for (i = 0; i < properties.length; i += 1) {
	            property = properties[i];
	            propertyTest = propertyTest || hasOwnProp(input, property);
	        }

	        return objectTest && propertyTest;
	    }

	    function getCalendarFormat(myMoment, now) {
	        var diff = myMoment.diff(now, 'days', true);
	        return diff < -6
	            ? 'sameElse'
	            : diff < -1
	            ? 'lastWeek'
	            : diff < 0
	            ? 'lastDay'
	            : diff < 1
	            ? 'sameDay'
	            : diff < 2
	            ? 'nextDay'
	            : diff < 7
	            ? 'nextWeek'
	            : 'sameElse';
	    }

	    function calendar$1(time, formats) {
	        // Support for single parameter, formats only overload to the calendar function
	        if (arguments.length === 1) {
	            if (!arguments[0]) {
	                time = undefined;
	                formats = undefined;
	            } else if (isMomentInput(arguments[0])) {
	                time = arguments[0];
	                formats = undefined;
	            } else if (isCalendarSpec(arguments[0])) {
	                formats = arguments[0];
	                time = undefined;
	            }
	        }
	        // We want to compare the start of today, vs this.
	        // Getting start-of-today depends on whether we're local/utc/offset or not.
	        var now = time || createLocal(),
	            sod = cloneWithOffset(now, this).startOf('day'),
	            format = hooks.calendarFormat(this, sod) || 'sameElse',
	            output =
	                formats &&
	                (isFunction(formats[format])
	                    ? formats[format].call(this, now)
	                    : formats[format]);

	        return this.format(
	            output || this.localeData().calendar(format, this, createLocal(now))
	        );
	    }

	    function clone() {
	        return new Moment(this);
	    }

	    function isAfter(input, units) {
	        var localInput = isMoment(input) ? input : createLocal(input);
	        if (!(this.isValid() && localInput.isValid())) {
	            return false;
	        }
	        units = normalizeUnits(units) || 'millisecond';
	        if (units === 'millisecond') {
	            return this.valueOf() > localInput.valueOf();
	        } else {
	            return localInput.valueOf() < this.clone().startOf(units).valueOf();
	        }
	    }

	    function isBefore(input, units) {
	        var localInput = isMoment(input) ? input : createLocal(input);
	        if (!(this.isValid() && localInput.isValid())) {
	            return false;
	        }
	        units = normalizeUnits(units) || 'millisecond';
	        if (units === 'millisecond') {
	            return this.valueOf() < localInput.valueOf();
	        } else {
	            return this.clone().endOf(units).valueOf() < localInput.valueOf();
	        }
	    }

	    function isBetween(from, to, units, inclusivity) {
	        var localFrom = isMoment(from) ? from : createLocal(from),
	            localTo = isMoment(to) ? to : createLocal(to);
	        if (!(this.isValid() && localFrom.isValid() && localTo.isValid())) {
	            return false;
	        }
	        inclusivity = inclusivity || '()';
	        return (
	            (inclusivity[0] === '('
	                ? this.isAfter(localFrom, units)
	                : !this.isBefore(localFrom, units)) &&
	            (inclusivity[1] === ')'
	                ? this.isBefore(localTo, units)
	                : !this.isAfter(localTo, units))
	        );
	    }

	    function isSame(input, units) {
	        var localInput = isMoment(input) ? input : createLocal(input),
	            inputMs;
	        if (!(this.isValid() && localInput.isValid())) {
	            return false;
	        }
	        units = normalizeUnits(units) || 'millisecond';
	        if (units === 'millisecond') {
	            return this.valueOf() === localInput.valueOf();
	        } else {
	            inputMs = localInput.valueOf();
	            return (
	                this.clone().startOf(units).valueOf() <= inputMs &&
	                inputMs <= this.clone().endOf(units).valueOf()
	            );
	        }
	    }

	    function isSameOrAfter(input, units) {
	        return this.isSame(input, units) || this.isAfter(input, units);
	    }

	    function isSameOrBefore(input, units) {
	        return this.isSame(input, units) || this.isBefore(input, units);
	    }

	    function diff(input, units, asFloat) {
	        var that, zoneDelta, output;

	        if (!this.isValid()) {
	            return NaN;
	        }

	        that = cloneWithOffset(input, this);

	        if (!that.isValid()) {
	            return NaN;
	        }

	        zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

	        units = normalizeUnits(units);

	        switch (units) {
	            case 'year':
	                output = monthDiff(this, that) / 12;
	                break;
	            case 'month':
	                output = monthDiff(this, that);
	                break;
	            case 'quarter':
	                output = monthDiff(this, that) / 3;
	                break;
	            case 'second':
	                output = (this - that) / 1e3;
	                break; // 1000
	            case 'minute':
	                output = (this - that) / 6e4;
	                break; // 1000 * 60
	            case 'hour':
	                output = (this - that) / 36e5;
	                break; // 1000 * 60 * 60
	            case 'day':
	                output = (this - that - zoneDelta) / 864e5;
	                break; // 1000 * 60 * 60 * 24, negate dst
	            case 'week':
	                output = (this - that - zoneDelta) / 6048e5;
	                break; // 1000 * 60 * 60 * 24 * 7, negate dst
	            default:
	                output = this - that;
	        }

	        return asFloat ? output : absFloor(output);
	    }

	    function monthDiff(a, b) {
	        if (a.date() < b.date()) {
	            // end-of-month calculations work correct when the start month has more
	            // days than the end month.
	            return -monthDiff(b, a);
	        }
	        // difference in months
	        var wholeMonthDiff = (b.year() - a.year()) * 12 + (b.month() - a.month()),
	            // b is in (anchor - 1 month, anchor + 1 month)
	            anchor = a.clone().add(wholeMonthDiff, 'months'),
	            anchor2,
	            adjust;

	        if (b - anchor < 0) {
	            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
	            // linear across the month
	            adjust = (b - anchor) / (anchor - anchor2);
	        } else {
	            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
	            // linear across the month
	            adjust = (b - anchor) / (anchor2 - anchor);
	        }

	        //check for negative zero, return zero if negative zero
	        return -(wholeMonthDiff + adjust) || 0;
	    }

	    hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
	    hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

	    function toString() {
	        return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
	    }

	    function toISOString(keepOffset) {
	        if (!this.isValid()) {
	            return null;
	        }
	        var utc = keepOffset !== true,
	            m = utc ? this.clone().utc() : this;
	        if (m.year() < 0 || m.year() > 9999) {
	            return formatMoment(
	                m,
	                utc
	                    ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]'
	                    : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ'
	            );
	        }
	        if (isFunction(Date.prototype.toISOString)) {
	            // native implementation is ~50x faster, use it when we can
	            if (utc) {
	                return this.toDate().toISOString();
	            } else {
	                return new Date(this.valueOf() + this.utcOffset() * 60 * 1000)
	                    .toISOString()
	                    .replace('Z', formatMoment(m, 'Z'));
	            }
	        }
	        return formatMoment(
	            m,
	            utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ'
	        );
	    }

	    /**
	     * Return a human readable representation of a moment that can
	     * also be evaluated to get a new moment which is the same
	     *
	     * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
	     */
	    function inspect() {
	        if (!this.isValid()) {
	            return 'moment.invalid(/* ' + this._i + ' */)';
	        }
	        var func = 'moment',
	            zone = '',
	            prefix,
	            year,
	            datetime,
	            suffix;
	        if (!this.isLocal()) {
	            func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
	            zone = 'Z';
	        }
	        prefix = '[' + func + '("]';
	        year = 0 <= this.year() && this.year() <= 9999 ? 'YYYY' : 'YYYYYY';
	        datetime = '-MM-DD[T]HH:mm:ss.SSS';
	        suffix = zone + '[")]';

	        return this.format(prefix + year + datetime + suffix);
	    }

	    function format(inputString) {
	        if (!inputString) {
	            inputString = this.isUtc()
	                ? hooks.defaultFormatUtc
	                : hooks.defaultFormat;
	        }
	        var output = formatMoment(this, inputString);
	        return this.localeData().postformat(output);
	    }

	    function from(time, withoutSuffix) {
	        if (
	            this.isValid() &&
	            ((isMoment(time) && time.isValid()) || createLocal(time).isValid())
	        ) {
	            return createDuration({ to: this, from: time })
	                .locale(this.locale())
	                .humanize(!withoutSuffix);
	        } else {
	            return this.localeData().invalidDate();
	        }
	    }

	    function fromNow(withoutSuffix) {
	        return this.from(createLocal(), withoutSuffix);
	    }

	    function to(time, withoutSuffix) {
	        if (
	            this.isValid() &&
	            ((isMoment(time) && time.isValid()) || createLocal(time).isValid())
	        ) {
	            return createDuration({ from: this, to: time })
	                .locale(this.locale())
	                .humanize(!withoutSuffix);
	        } else {
	            return this.localeData().invalidDate();
	        }
	    }

	    function toNow(withoutSuffix) {
	        return this.to(createLocal(), withoutSuffix);
	    }

	    // If passed a locale key, it will set the locale for this
	    // instance.  Otherwise, it will return the locale configuration
	    // variables for this instance.
	    function locale(key) {
	        var newLocaleData;

	        if (key === undefined) {
	            return this._locale._abbr;
	        } else {
	            newLocaleData = getLocale(key);
	            if (newLocaleData != null) {
	                this._locale = newLocaleData;
	            }
	            return this;
	        }
	    }

	    var lang = deprecate(
	        'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
	        function (key) {
	            if (key === undefined) {
	                return this.localeData();
	            } else {
	                return this.locale(key);
	            }
	        }
	    );

	    function localeData() {
	        return this._locale;
	    }

	    var MS_PER_SECOND = 1000,
	        MS_PER_MINUTE = 60 * MS_PER_SECOND,
	        MS_PER_HOUR = 60 * MS_PER_MINUTE,
	        MS_PER_400_YEARS = (365 * 400 + 97) * 24 * MS_PER_HOUR;

	    // actual modulo - handles negative numbers (for dates before 1970):
	    function mod$1(dividend, divisor) {
	        return ((dividend % divisor) + divisor) % divisor;
	    }

	    function localStartOfDate(y, m, d) {
	        // the date constructor remaps years 0-99 to 1900-1999
	        if (y < 100 && y >= 0) {
	            // preserve leap years using a full 400 year cycle, then reset
	            return new Date(y + 400, m, d) - MS_PER_400_YEARS;
	        } else {
	            return new Date(y, m, d).valueOf();
	        }
	    }

	    function utcStartOfDate(y, m, d) {
	        // Date.UTC remaps years 0-99 to 1900-1999
	        if (y < 100 && y >= 0) {
	            // preserve leap years using a full 400 year cycle, then reset
	            return Date.UTC(y + 400, m, d) - MS_PER_400_YEARS;
	        } else {
	            return Date.UTC(y, m, d);
	        }
	    }

	    function startOf(units) {
	        var time, startOfDate;
	        units = normalizeUnits(units);
	        if (units === undefined || units === 'millisecond' || !this.isValid()) {
	            return this;
	        }

	        startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

	        switch (units) {
	            case 'year':
	                time = startOfDate(this.year(), 0, 1);
	                break;
	            case 'quarter':
	                time = startOfDate(
	                    this.year(),
	                    this.month() - (this.month() % 3),
	                    1
	                );
	                break;
	            case 'month':
	                time = startOfDate(this.year(), this.month(), 1);
	                break;
	            case 'week':
	                time = startOfDate(
	                    this.year(),
	                    this.month(),
	                    this.date() - this.weekday()
	                );
	                break;
	            case 'isoWeek':
	                time = startOfDate(
	                    this.year(),
	                    this.month(),
	                    this.date() - (this.isoWeekday() - 1)
	                );
	                break;
	            case 'day':
	            case 'date':
	                time = startOfDate(this.year(), this.month(), this.date());
	                break;
	            case 'hour':
	                time = this._d.valueOf();
	                time -= mod$1(
	                    time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE),
	                    MS_PER_HOUR
	                );
	                break;
	            case 'minute':
	                time = this._d.valueOf();
	                time -= mod$1(time, MS_PER_MINUTE);
	                break;
	            case 'second':
	                time = this._d.valueOf();
	                time -= mod$1(time, MS_PER_SECOND);
	                break;
	        }

	        this._d.setTime(time);
	        hooks.updateOffset(this, true);
	        return this;
	    }

	    function endOf(units) {
	        var time, startOfDate;
	        units = normalizeUnits(units);
	        if (units === undefined || units === 'millisecond' || !this.isValid()) {
	            return this;
	        }

	        startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

	        switch (units) {
	            case 'year':
	                time = startOfDate(this.year() + 1, 0, 1) - 1;
	                break;
	            case 'quarter':
	                time =
	                    startOfDate(
	                        this.year(),
	                        this.month() - (this.month() % 3) + 3,
	                        1
	                    ) - 1;
	                break;
	            case 'month':
	                time = startOfDate(this.year(), this.month() + 1, 1) - 1;
	                break;
	            case 'week':
	                time =
	                    startOfDate(
	                        this.year(),
	                        this.month(),
	                        this.date() - this.weekday() + 7
	                    ) - 1;
	                break;
	            case 'isoWeek':
	                time =
	                    startOfDate(
	                        this.year(),
	                        this.month(),
	                        this.date() - (this.isoWeekday() - 1) + 7
	                    ) - 1;
	                break;
	            case 'day':
	            case 'date':
	                time = startOfDate(this.year(), this.month(), this.date() + 1) - 1;
	                break;
	            case 'hour':
	                time = this._d.valueOf();
	                time +=
	                    MS_PER_HOUR -
	                    mod$1(
	                        time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE),
	                        MS_PER_HOUR
	                    ) -
	                    1;
	                break;
	            case 'minute':
	                time = this._d.valueOf();
	                time += MS_PER_MINUTE - mod$1(time, MS_PER_MINUTE) - 1;
	                break;
	            case 'second':
	                time = this._d.valueOf();
	                time += MS_PER_SECOND - mod$1(time, MS_PER_SECOND) - 1;
	                break;
	        }

	        this._d.setTime(time);
	        hooks.updateOffset(this, true);
	        return this;
	    }

	    function valueOf() {
	        return this._d.valueOf() - (this._offset || 0) * 60000;
	    }

	    function unix() {
	        return Math.floor(this.valueOf() / 1000);
	    }

	    function toDate() {
	        return new Date(this.valueOf());
	    }

	    function toArray() {
	        var m = this;
	        return [
	            m.year(),
	            m.month(),
	            m.date(),
	            m.hour(),
	            m.minute(),
	            m.second(),
	            m.millisecond(),
	        ];
	    }

	    function toObject() {
	        var m = this;
	        return {
	            years: m.year(),
	            months: m.month(),
	            date: m.date(),
	            hours: m.hours(),
	            minutes: m.minutes(),
	            seconds: m.seconds(),
	            milliseconds: m.milliseconds(),
	        };
	    }

	    function toJSON() {
	        // new Date(NaN).toJSON() === null
	        return this.isValid() ? this.toISOString() : null;
	    }

	    function isValid$2() {
	        return isValid(this);
	    }

	    function parsingFlags() {
	        return extend({}, getParsingFlags(this));
	    }

	    function invalidAt() {
	        return getParsingFlags(this).overflow;
	    }

	    function creationData() {
	        return {
	            input: this._i,
	            format: this._f,
	            locale: this._locale,
	            isUTC: this._isUTC,
	            strict: this._strict,
	        };
	    }

	    addFormatToken('N', 0, 0, 'eraAbbr');
	    addFormatToken('NN', 0, 0, 'eraAbbr');
	    addFormatToken('NNN', 0, 0, 'eraAbbr');
	    addFormatToken('NNNN', 0, 0, 'eraName');
	    addFormatToken('NNNNN', 0, 0, 'eraNarrow');

	    addFormatToken('y', ['y', 1], 'yo', 'eraYear');
	    addFormatToken('y', ['yy', 2], 0, 'eraYear');
	    addFormatToken('y', ['yyy', 3], 0, 'eraYear');
	    addFormatToken('y', ['yyyy', 4], 0, 'eraYear');

	    addRegexToken('N', matchEraAbbr);
	    addRegexToken('NN', matchEraAbbr);
	    addRegexToken('NNN', matchEraAbbr);
	    addRegexToken('NNNN', matchEraName);
	    addRegexToken('NNNNN', matchEraNarrow);

	    addParseToken(
	        ['N', 'NN', 'NNN', 'NNNN', 'NNNNN'],
	        function (input, array, config, token) {
	            var era = config._locale.erasParse(input, token, config._strict);
	            if (era) {
	                getParsingFlags(config).era = era;
	            } else {
	                getParsingFlags(config).invalidEra = input;
	            }
	        }
	    );

	    addRegexToken('y', matchUnsigned);
	    addRegexToken('yy', matchUnsigned);
	    addRegexToken('yyy', matchUnsigned);
	    addRegexToken('yyyy', matchUnsigned);
	    addRegexToken('yo', matchEraYearOrdinal);

	    addParseToken(['y', 'yy', 'yyy', 'yyyy'], YEAR);
	    addParseToken(['yo'], function (input, array, config, token) {
	        var match;
	        if (config._locale._eraYearOrdinalRegex) {
	            match = input.match(config._locale._eraYearOrdinalRegex);
	        }

	        if (config._locale.eraYearOrdinalParse) {
	            array[YEAR] = config._locale.eraYearOrdinalParse(input, match);
	        } else {
	            array[YEAR] = parseInt(input, 10);
	        }
	    });

	    function localeEras(m, format) {
	        var i,
	            l,
	            date,
	            eras = this._eras || getLocale('en')._eras;
	        for (i = 0, l = eras.length; i < l; ++i) {
	            switch (typeof eras[i].since) {
	                case 'string':
	                    // truncate time
	                    date = hooks(eras[i].since).startOf('day');
	                    eras[i].since = date.valueOf();
	                    break;
	            }

	            switch (typeof eras[i].until) {
	                case 'undefined':
	                    eras[i].until = +Infinity;
	                    break;
	                case 'string':
	                    // truncate time
	                    date = hooks(eras[i].until).startOf('day').valueOf();
	                    eras[i].until = date.valueOf();
	                    break;
	            }
	        }
	        return eras;
	    }

	    function localeErasParse(eraName, format, strict) {
	        var i,
	            l,
	            eras = this.eras(),
	            name,
	            abbr,
	            narrow;
	        eraName = eraName.toUpperCase();

	        for (i = 0, l = eras.length; i < l; ++i) {
	            name = eras[i].name.toUpperCase();
	            abbr = eras[i].abbr.toUpperCase();
	            narrow = eras[i].narrow.toUpperCase();

	            if (strict) {
	                switch (format) {
	                    case 'N':
	                    case 'NN':
	                    case 'NNN':
	                        if (abbr === eraName) {
	                            return eras[i];
	                        }
	                        break;

	                    case 'NNNN':
	                        if (name === eraName) {
	                            return eras[i];
	                        }
	                        break;

	                    case 'NNNNN':
	                        if (narrow === eraName) {
	                            return eras[i];
	                        }
	                        break;
	                }
	            } else if ([name, abbr, narrow].indexOf(eraName) >= 0) {
	                return eras[i];
	            }
	        }
	    }

	    function localeErasConvertYear(era, year) {
	        var dir = era.since <= era.until ? +1 : -1;
	        if (year === undefined) {
	            return hooks(era.since).year();
	        } else {
	            return hooks(era.since).year() + (year - era.offset) * dir;
	        }
	    }

	    function getEraName() {
	        var i,
	            l,
	            val,
	            eras = this.localeData().eras();
	        for (i = 0, l = eras.length; i < l; ++i) {
	            // truncate time
	            val = this.clone().startOf('day').valueOf();

	            if (eras[i].since <= val && val <= eras[i].until) {
	                return eras[i].name;
	            }
	            if (eras[i].until <= val && val <= eras[i].since) {
	                return eras[i].name;
	            }
	        }

	        return '';
	    }

	    function getEraNarrow() {
	        var i,
	            l,
	            val,
	            eras = this.localeData().eras();
	        for (i = 0, l = eras.length; i < l; ++i) {
	            // truncate time
	            val = this.clone().startOf('day').valueOf();

	            if (eras[i].since <= val && val <= eras[i].until) {
	                return eras[i].narrow;
	            }
	            if (eras[i].until <= val && val <= eras[i].since) {
	                return eras[i].narrow;
	            }
	        }

	        return '';
	    }

	    function getEraAbbr() {
	        var i,
	            l,
	            val,
	            eras = this.localeData().eras();
	        for (i = 0, l = eras.length; i < l; ++i) {
	            // truncate time
	            val = this.clone().startOf('day').valueOf();

	            if (eras[i].since <= val && val <= eras[i].until) {
	                return eras[i].abbr;
	            }
	            if (eras[i].until <= val && val <= eras[i].since) {
	                return eras[i].abbr;
	            }
	        }

	        return '';
	    }

	    function getEraYear() {
	        var i,
	            l,
	            dir,
	            val,
	            eras = this.localeData().eras();
	        for (i = 0, l = eras.length; i < l; ++i) {
	            dir = eras[i].since <= eras[i].until ? +1 : -1;

	            // truncate time
	            val = this.clone().startOf('day').valueOf();

	            if (
	                (eras[i].since <= val && val <= eras[i].until) ||
	                (eras[i].until <= val && val <= eras[i].since)
	            ) {
	                return (
	                    (this.year() - hooks(eras[i].since).year()) * dir +
	                    eras[i].offset
	                );
	            }
	        }

	        return this.year();
	    }

	    function erasNameRegex(isStrict) {
	        if (!hasOwnProp(this, '_erasNameRegex')) {
	            computeErasParse.call(this);
	        }
	        return isStrict ? this._erasNameRegex : this._erasRegex;
	    }

	    function erasAbbrRegex(isStrict) {
	        if (!hasOwnProp(this, '_erasAbbrRegex')) {
	            computeErasParse.call(this);
	        }
	        return isStrict ? this._erasAbbrRegex : this._erasRegex;
	    }

	    function erasNarrowRegex(isStrict) {
	        if (!hasOwnProp(this, '_erasNarrowRegex')) {
	            computeErasParse.call(this);
	        }
	        return isStrict ? this._erasNarrowRegex : this._erasRegex;
	    }

	    function matchEraAbbr(isStrict, locale) {
	        return locale.erasAbbrRegex(isStrict);
	    }

	    function matchEraName(isStrict, locale) {
	        return locale.erasNameRegex(isStrict);
	    }

	    function matchEraNarrow(isStrict, locale) {
	        return locale.erasNarrowRegex(isStrict);
	    }

	    function matchEraYearOrdinal(isStrict, locale) {
	        return locale._eraYearOrdinalRegex || matchUnsigned;
	    }

	    function computeErasParse() {
	        var abbrPieces = [],
	            namePieces = [],
	            narrowPieces = [],
	            mixedPieces = [],
	            i,
	            l,
	            eras = this.eras();

	        for (i = 0, l = eras.length; i < l; ++i) {
	            namePieces.push(regexEscape(eras[i].name));
	            abbrPieces.push(regexEscape(eras[i].abbr));
	            narrowPieces.push(regexEscape(eras[i].narrow));

	            mixedPieces.push(regexEscape(eras[i].name));
	            mixedPieces.push(regexEscape(eras[i].abbr));
	            mixedPieces.push(regexEscape(eras[i].narrow));
	        }

	        this._erasRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
	        this._erasNameRegex = new RegExp('^(' + namePieces.join('|') + ')', 'i');
	        this._erasAbbrRegex = new RegExp('^(' + abbrPieces.join('|') + ')', 'i');
	        this._erasNarrowRegex = new RegExp(
	            '^(' + narrowPieces.join('|') + ')',
	            'i'
	        );
	    }

	    // FORMATTING

	    addFormatToken(0, ['gg', 2], 0, function () {
	        return this.weekYear() % 100;
	    });

	    addFormatToken(0, ['GG', 2], 0, function () {
	        return this.isoWeekYear() % 100;
	    });

	    function addWeekYearFormatToken(token, getter) {
	        addFormatToken(0, [token, token.length], 0, getter);
	    }

	    addWeekYearFormatToken('gggg', 'weekYear');
	    addWeekYearFormatToken('ggggg', 'weekYear');
	    addWeekYearFormatToken('GGGG', 'isoWeekYear');
	    addWeekYearFormatToken('GGGGG', 'isoWeekYear');

	    // ALIASES

	    addUnitAlias('weekYear', 'gg');
	    addUnitAlias('isoWeekYear', 'GG');

	    // PRIORITY

	    addUnitPriority('weekYear', 1);
	    addUnitPriority('isoWeekYear', 1);

	    // PARSING

	    addRegexToken('G', matchSigned);
	    addRegexToken('g', matchSigned);
	    addRegexToken('GG', match1to2, match2);
	    addRegexToken('gg', match1to2, match2);
	    addRegexToken('GGGG', match1to4, match4);
	    addRegexToken('gggg', match1to4, match4);
	    addRegexToken('GGGGG', match1to6, match6);
	    addRegexToken('ggggg', match1to6, match6);

	    addWeekParseToken(
	        ['gggg', 'ggggg', 'GGGG', 'GGGGG'],
	        function (input, week, config, token) {
	            week[token.substr(0, 2)] = toInt(input);
	        }
	    );

	    addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
	        week[token] = hooks.parseTwoDigitYear(input);
	    });

	    // MOMENTS

	    function getSetWeekYear(input) {
	        return getSetWeekYearHelper.call(
	            this,
	            input,
	            this.week(),
	            this.weekday(),
	            this.localeData()._week.dow,
	            this.localeData()._week.doy
	        );
	    }

	    function getSetISOWeekYear(input) {
	        return getSetWeekYearHelper.call(
	            this,
	            input,
	            this.isoWeek(),
	            this.isoWeekday(),
	            1,
	            4
	        );
	    }

	    function getISOWeeksInYear() {
	        return weeksInYear(this.year(), 1, 4);
	    }

	    function getISOWeeksInISOWeekYear() {
	        return weeksInYear(this.isoWeekYear(), 1, 4);
	    }

	    function getWeeksInYear() {
	        var weekInfo = this.localeData()._week;
	        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
	    }

	    function getWeeksInWeekYear() {
	        var weekInfo = this.localeData()._week;
	        return weeksInYear(this.weekYear(), weekInfo.dow, weekInfo.doy);
	    }

	    function getSetWeekYearHelper(input, week, weekday, dow, doy) {
	        var weeksTarget;
	        if (input == null) {
	            return weekOfYear(this, dow, doy).year;
	        } else {
	            weeksTarget = weeksInYear(input, dow, doy);
	            if (week > weeksTarget) {
	                week = weeksTarget;
	            }
	            return setWeekAll.call(this, input, week, weekday, dow, doy);
	        }
	    }

	    function setWeekAll(weekYear, week, weekday, dow, doy) {
	        var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
	            date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

	        this.year(date.getUTCFullYear());
	        this.month(date.getUTCMonth());
	        this.date(date.getUTCDate());
	        return this;
	    }

	    // FORMATTING

	    addFormatToken('Q', 0, 'Qo', 'quarter');

	    // ALIASES

	    addUnitAlias('quarter', 'Q');

	    // PRIORITY

	    addUnitPriority('quarter', 7);

	    // PARSING

	    addRegexToken('Q', match1);
	    addParseToken('Q', function (input, array) {
	        array[MONTH] = (toInt(input) - 1) * 3;
	    });

	    // MOMENTS

	    function getSetQuarter(input) {
	        return input == null
	            ? Math.ceil((this.month() + 1) / 3)
	            : this.month((input - 1) * 3 + (this.month() % 3));
	    }

	    // FORMATTING

	    addFormatToken('D', ['DD', 2], 'Do', 'date');

	    // ALIASES

	    addUnitAlias('date', 'D');

	    // PRIORITY
	    addUnitPriority('date', 9);

	    // PARSING

	    addRegexToken('D', match1to2);
	    addRegexToken('DD', match1to2, match2);
	    addRegexToken('Do', function (isStrict, locale) {
	        // TODO: Remove "ordinalParse" fallback in next major release.
	        return isStrict
	            ? locale._dayOfMonthOrdinalParse || locale._ordinalParse
	            : locale._dayOfMonthOrdinalParseLenient;
	    });

	    addParseToken(['D', 'DD'], DATE);
	    addParseToken('Do', function (input, array) {
	        array[DATE] = toInt(input.match(match1to2)[0]);
	    });

	    // MOMENTS

	    var getSetDayOfMonth = makeGetSet('Date', true);

	    // FORMATTING

	    addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

	    // ALIASES

	    addUnitAlias('dayOfYear', 'DDD');

	    // PRIORITY
	    addUnitPriority('dayOfYear', 4);

	    // PARSING

	    addRegexToken('DDD', match1to3);
	    addRegexToken('DDDD', match3);
	    addParseToken(['DDD', 'DDDD'], function (input, array, config) {
	        config._dayOfYear = toInt(input);
	    });

	    // HELPERS

	    // MOMENTS

	    function getSetDayOfYear(input) {
	        var dayOfYear =
	            Math.round(
	                (this.clone().startOf('day') - this.clone().startOf('year')) / 864e5
	            ) + 1;
	        return input == null ? dayOfYear : this.add(input - dayOfYear, 'd');
	    }

	    // FORMATTING

	    addFormatToken('m', ['mm', 2], 0, 'minute');

	    // ALIASES

	    addUnitAlias('minute', 'm');

	    // PRIORITY

	    addUnitPriority('minute', 14);

	    // PARSING

	    addRegexToken('m', match1to2);
	    addRegexToken('mm', match1to2, match2);
	    addParseToken(['m', 'mm'], MINUTE);

	    // MOMENTS

	    var getSetMinute = makeGetSet('Minutes', false);

	    // FORMATTING

	    addFormatToken('s', ['ss', 2], 0, 'second');

	    // ALIASES

	    addUnitAlias('second', 's');

	    // PRIORITY

	    addUnitPriority('second', 15);

	    // PARSING

	    addRegexToken('s', match1to2);
	    addRegexToken('ss', match1to2, match2);
	    addParseToken(['s', 'ss'], SECOND);

	    // MOMENTS

	    var getSetSecond = makeGetSet('Seconds', false);

	    // FORMATTING

	    addFormatToken('S', 0, 0, function () {
	        return ~~(this.millisecond() / 100);
	    });

	    addFormatToken(0, ['SS', 2], 0, function () {
	        return ~~(this.millisecond() / 10);
	    });

	    addFormatToken(0, ['SSS', 3], 0, 'millisecond');
	    addFormatToken(0, ['SSSS', 4], 0, function () {
	        return this.millisecond() * 10;
	    });
	    addFormatToken(0, ['SSSSS', 5], 0, function () {
	        return this.millisecond() * 100;
	    });
	    addFormatToken(0, ['SSSSSS', 6], 0, function () {
	        return this.millisecond() * 1000;
	    });
	    addFormatToken(0, ['SSSSSSS', 7], 0, function () {
	        return this.millisecond() * 10000;
	    });
	    addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
	        return this.millisecond() * 100000;
	    });
	    addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
	        return this.millisecond() * 1000000;
	    });

	    // ALIASES

	    addUnitAlias('millisecond', 'ms');

	    // PRIORITY

	    addUnitPriority('millisecond', 16);

	    // PARSING

	    addRegexToken('S', match1to3, match1);
	    addRegexToken('SS', match1to3, match2);
	    addRegexToken('SSS', match1to3, match3);

	    var token, getSetMillisecond;
	    for (token = 'SSSS'; token.length <= 9; token += 'S') {
	        addRegexToken(token, matchUnsigned);
	    }

	    function parseMs(input, array) {
	        array[MILLISECOND] = toInt(('0.' + input) * 1000);
	    }

	    for (token = 'S'; token.length <= 9; token += 'S') {
	        addParseToken(token, parseMs);
	    }

	    getSetMillisecond = makeGetSet('Milliseconds', false);

	    // FORMATTING

	    addFormatToken('z', 0, 0, 'zoneAbbr');
	    addFormatToken('zz', 0, 0, 'zoneName');

	    // MOMENTS

	    function getZoneAbbr() {
	        return this._isUTC ? 'UTC' : '';
	    }

	    function getZoneName() {
	        return this._isUTC ? 'Coordinated Universal Time' : '';
	    }

	    var proto = Moment.prototype;

	    proto.add = add;
	    proto.calendar = calendar$1;
	    proto.clone = clone;
	    proto.diff = diff;
	    proto.endOf = endOf;
	    proto.format = format;
	    proto.from = from;
	    proto.fromNow = fromNow;
	    proto.to = to;
	    proto.toNow = toNow;
	    proto.get = stringGet;
	    proto.invalidAt = invalidAt;
	    proto.isAfter = isAfter;
	    proto.isBefore = isBefore;
	    proto.isBetween = isBetween;
	    proto.isSame = isSame;
	    proto.isSameOrAfter = isSameOrAfter;
	    proto.isSameOrBefore = isSameOrBefore;
	    proto.isValid = isValid$2;
	    proto.lang = lang;
	    proto.locale = locale;
	    proto.localeData = localeData;
	    proto.max = prototypeMax;
	    proto.min = prototypeMin;
	    proto.parsingFlags = parsingFlags;
	    proto.set = stringSet;
	    proto.startOf = startOf;
	    proto.subtract = subtract;
	    proto.toArray = toArray;
	    proto.toObject = toObject;
	    proto.toDate = toDate;
	    proto.toISOString = toISOString;
	    proto.inspect = inspect;
	    if (typeof Symbol !== 'undefined' && Symbol.for != null) {
	        proto[Symbol.for('nodejs.util.inspect.custom')] = function () {
	            return 'Moment<' + this.format() + '>';
	        };
	    }
	    proto.toJSON = toJSON;
	    proto.toString = toString;
	    proto.unix = unix;
	    proto.valueOf = valueOf;
	    proto.creationData = creationData;
	    proto.eraName = getEraName;
	    proto.eraNarrow = getEraNarrow;
	    proto.eraAbbr = getEraAbbr;
	    proto.eraYear = getEraYear;
	    proto.year = getSetYear;
	    proto.isLeapYear = getIsLeapYear;
	    proto.weekYear = getSetWeekYear;
	    proto.isoWeekYear = getSetISOWeekYear;
	    proto.quarter = proto.quarters = getSetQuarter;
	    proto.month = getSetMonth;
	    proto.daysInMonth = getDaysInMonth;
	    proto.week = proto.weeks = getSetWeek;
	    proto.isoWeek = proto.isoWeeks = getSetISOWeek;
	    proto.weeksInYear = getWeeksInYear;
	    proto.weeksInWeekYear = getWeeksInWeekYear;
	    proto.isoWeeksInYear = getISOWeeksInYear;
	    proto.isoWeeksInISOWeekYear = getISOWeeksInISOWeekYear;
	    proto.date = getSetDayOfMonth;
	    proto.day = proto.days = getSetDayOfWeek;
	    proto.weekday = getSetLocaleDayOfWeek;
	    proto.isoWeekday = getSetISODayOfWeek;
	    proto.dayOfYear = getSetDayOfYear;
	    proto.hour = proto.hours = getSetHour;
	    proto.minute = proto.minutes = getSetMinute;
	    proto.second = proto.seconds = getSetSecond;
	    proto.millisecond = proto.milliseconds = getSetMillisecond;
	    proto.utcOffset = getSetOffset;
	    proto.utc = setOffsetToUTC;
	    proto.local = setOffsetToLocal;
	    proto.parseZone = setOffsetToParsedOffset;
	    proto.hasAlignedHourOffset = hasAlignedHourOffset;
	    proto.isDST = isDaylightSavingTime;
	    proto.isLocal = isLocal;
	    proto.isUtcOffset = isUtcOffset;
	    proto.isUtc = isUtc;
	    proto.isUTC = isUtc;
	    proto.zoneAbbr = getZoneAbbr;
	    proto.zoneName = getZoneName;
	    proto.dates = deprecate(
	        'dates accessor is deprecated. Use date instead.',
	        getSetDayOfMonth
	    );
	    proto.months = deprecate(
	        'months accessor is deprecated. Use month instead',
	        getSetMonth
	    );
	    proto.years = deprecate(
	        'years accessor is deprecated. Use year instead',
	        getSetYear
	    );
	    proto.zone = deprecate(
	        'moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/',
	        getSetZone
	    );
	    proto.isDSTShifted = deprecate(
	        'isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information',
	        isDaylightSavingTimeShifted
	    );

	    function createUnix(input) {
	        return createLocal(input * 1000);
	    }

	    function createInZone() {
	        return createLocal.apply(null, arguments).parseZone();
	    }

	    function preParsePostFormat(string) {
	        return string;
	    }

	    var proto$1 = Locale.prototype;

	    proto$1.calendar = calendar;
	    proto$1.longDateFormat = longDateFormat;
	    proto$1.invalidDate = invalidDate;
	    proto$1.ordinal = ordinal;
	    proto$1.preparse = preParsePostFormat;
	    proto$1.postformat = preParsePostFormat;
	    proto$1.relativeTime = relativeTime;
	    proto$1.pastFuture = pastFuture;
	    proto$1.set = set;
	    proto$1.eras = localeEras;
	    proto$1.erasParse = localeErasParse;
	    proto$1.erasConvertYear = localeErasConvertYear;
	    proto$1.erasAbbrRegex = erasAbbrRegex;
	    proto$1.erasNameRegex = erasNameRegex;
	    proto$1.erasNarrowRegex = erasNarrowRegex;

	    proto$1.months = localeMonths;
	    proto$1.monthsShort = localeMonthsShort;
	    proto$1.monthsParse = localeMonthsParse;
	    proto$1.monthsRegex = monthsRegex;
	    proto$1.monthsShortRegex = monthsShortRegex;
	    proto$1.week = localeWeek;
	    proto$1.firstDayOfYear = localeFirstDayOfYear;
	    proto$1.firstDayOfWeek = localeFirstDayOfWeek;

	    proto$1.weekdays = localeWeekdays;
	    proto$1.weekdaysMin = localeWeekdaysMin;
	    proto$1.weekdaysShort = localeWeekdaysShort;
	    proto$1.weekdaysParse = localeWeekdaysParse;

	    proto$1.weekdaysRegex = weekdaysRegex;
	    proto$1.weekdaysShortRegex = weekdaysShortRegex;
	    proto$1.weekdaysMinRegex = weekdaysMinRegex;

	    proto$1.isPM = localeIsPM;
	    proto$1.meridiem = localeMeridiem;

	    function get$1(format, index, field, setter) {
	        var locale = getLocale(),
	            utc = createUTC().set(setter, index);
	        return locale[field](utc, format);
	    }

	    function listMonthsImpl(format, index, field) {
	        if (isNumber(format)) {
	            index = format;
	            format = undefined;
	        }

	        format = format || '';

	        if (index != null) {
	            return get$1(format, index, field, 'month');
	        }

	        var i,
	            out = [];
	        for (i = 0; i < 12; i++) {
	            out[i] = get$1(format, i, field, 'month');
	        }
	        return out;
	    }

	    // ()
	    // (5)
	    // (fmt, 5)
	    // (fmt)
	    // (true)
	    // (true, 5)
	    // (true, fmt, 5)
	    // (true, fmt)
	    function listWeekdaysImpl(localeSorted, format, index, field) {
	        if (typeof localeSorted === 'boolean') {
	            if (isNumber(format)) {
	                index = format;
	                format = undefined;
	            }

	            format = format || '';
	        } else {
	            format = localeSorted;
	            index = format;
	            localeSorted = false;

	            if (isNumber(format)) {
	                index = format;
	                format = undefined;
	            }

	            format = format || '';
	        }

	        var locale = getLocale(),
	            shift = localeSorted ? locale._week.dow : 0,
	            i,
	            out = [];

	        if (index != null) {
	            return get$1(format, (index + shift) % 7, field, 'day');
	        }

	        for (i = 0; i < 7; i++) {
	            out[i] = get$1(format, (i + shift) % 7, field, 'day');
	        }
	        return out;
	    }

	    function listMonths(format, index) {
	        return listMonthsImpl(format, index, 'months');
	    }

	    function listMonthsShort(format, index) {
	        return listMonthsImpl(format, index, 'monthsShort');
	    }

	    function listWeekdays(localeSorted, format, index) {
	        return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
	    }

	    function listWeekdaysShort(localeSorted, format, index) {
	        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
	    }

	    function listWeekdaysMin(localeSorted, format, index) {
	        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
	    }

	    getSetGlobalLocale('en', {
	        eras: [
	            {
	                since: '0001-01-01',
	                until: +Infinity,
	                offset: 1,
	                name: 'Anno Domini',
	                narrow: 'AD',
	                abbr: 'AD',
	            },
	            {
	                since: '0000-12-31',
	                until: -Infinity,
	                offset: 1,
	                name: 'Before Christ',
	                narrow: 'BC',
	                abbr: 'BC',
	            },
	        ],
	        dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
	        ordinal: function (number) {
	            var b = number % 10,
	                output =
	                    toInt((number % 100) / 10) === 1
	                        ? 'th'
	                        : b === 1
	                        ? 'st'
	                        : b === 2
	                        ? 'nd'
	                        : b === 3
	                        ? 'rd'
	                        : 'th';
	            return number + output;
	        },
	    });

	    // Side effect imports

	    hooks.lang = deprecate(
	        'moment.lang is deprecated. Use moment.locale instead.',
	        getSetGlobalLocale
	    );
	    hooks.langData = deprecate(
	        'moment.langData is deprecated. Use moment.localeData instead.',
	        getLocale
	    );

	    var mathAbs = Math.abs;

	    function abs() {
	        var data = this._data;

	        this._milliseconds = mathAbs(this._milliseconds);
	        this._days = mathAbs(this._days);
	        this._months = mathAbs(this._months);

	        data.milliseconds = mathAbs(data.milliseconds);
	        data.seconds = mathAbs(data.seconds);
	        data.minutes = mathAbs(data.minutes);
	        data.hours = mathAbs(data.hours);
	        data.months = mathAbs(data.months);
	        data.years = mathAbs(data.years);

	        return this;
	    }

	    function addSubtract$1(duration, input, value, direction) {
	        var other = createDuration(input, value);

	        duration._milliseconds += direction * other._milliseconds;
	        duration._days += direction * other._days;
	        duration._months += direction * other._months;

	        return duration._bubble();
	    }

	    // supports only 2.0-style add(1, 's') or add(duration)
	    function add$1(input, value) {
	        return addSubtract$1(this, input, value, 1);
	    }

	    // supports only 2.0-style subtract(1, 's') or subtract(duration)
	    function subtract$1(input, value) {
	        return addSubtract$1(this, input, value, -1);
	    }

	    function absCeil(number) {
	        if (number < 0) {
	            return Math.floor(number);
	        } else {
	            return Math.ceil(number);
	        }
	    }

	    function bubble() {
	        var milliseconds = this._milliseconds,
	            days = this._days,
	            months = this._months,
	            data = this._data,
	            seconds,
	            minutes,
	            hours,
	            years,
	            monthsFromDays;

	        // if we have a mix of positive and negative values, bubble down first
	        // check: https://github.com/moment/moment/issues/2166
	        if (
	            !(
	                (milliseconds >= 0 && days >= 0 && months >= 0) ||
	                (milliseconds <= 0 && days <= 0 && months <= 0)
	            )
	        ) {
	            milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
	            days = 0;
	            months = 0;
	        }

	        // The following code bubbles up values, see the tests for
	        // examples of what that means.
	        data.milliseconds = milliseconds % 1000;

	        seconds = absFloor(milliseconds / 1000);
	        data.seconds = seconds % 60;

	        minutes = absFloor(seconds / 60);
	        data.minutes = minutes % 60;

	        hours = absFloor(minutes / 60);
	        data.hours = hours % 24;

	        days += absFloor(hours / 24);

	        // convert days to months
	        monthsFromDays = absFloor(daysToMonths(days));
	        months += monthsFromDays;
	        days -= absCeil(monthsToDays(monthsFromDays));

	        // 12 months -> 1 year
	        years = absFloor(months / 12);
	        months %= 12;

	        data.days = days;
	        data.months = months;
	        data.years = years;

	        return this;
	    }

	    function daysToMonths(days) {
	        // 400 years have 146097 days (taking into account leap year rules)
	        // 400 years have 12 months === 4800
	        return (days * 4800) / 146097;
	    }

	    function monthsToDays(months) {
	        // the reverse of daysToMonths
	        return (months * 146097) / 4800;
	    }

	    function as(units) {
	        if (!this.isValid()) {
	            return NaN;
	        }
	        var days,
	            months,
	            milliseconds = this._milliseconds;

	        units = normalizeUnits(units);

	        if (units === 'month' || units === 'quarter' || units === 'year') {
	            days = this._days + milliseconds / 864e5;
	            months = this._months + daysToMonths(days);
	            switch (units) {
	                case 'month':
	                    return months;
	                case 'quarter':
	                    return months / 3;
	                case 'year':
	                    return months / 12;
	            }
	        } else {
	            // handle milliseconds separately because of floating point math errors (issue #1867)
	            days = this._days + Math.round(monthsToDays(this._months));
	            switch (units) {
	                case 'week':
	                    return days / 7 + milliseconds / 6048e5;
	                case 'day':
	                    return days + milliseconds / 864e5;
	                case 'hour':
	                    return days * 24 + milliseconds / 36e5;
	                case 'minute':
	                    return days * 1440 + milliseconds / 6e4;
	                case 'second':
	                    return days * 86400 + milliseconds / 1000;
	                // Math.floor prevents floating point math errors here
	                case 'millisecond':
	                    return Math.floor(days * 864e5) + milliseconds;
	                default:
	                    throw new Error('Unknown unit ' + units);
	            }
	        }
	    }

	    // TODO: Use this.as('ms')?
	    function valueOf$1() {
	        if (!this.isValid()) {
	            return NaN;
	        }
	        return (
	            this._milliseconds +
	            this._days * 864e5 +
	            (this._months % 12) * 2592e6 +
	            toInt(this._months / 12) * 31536e6
	        );
	    }

	    function makeAs(alias) {
	        return function () {
	            return this.as(alias);
	        };
	    }

	    var asMilliseconds = makeAs('ms'),
	        asSeconds = makeAs('s'),
	        asMinutes = makeAs('m'),
	        asHours = makeAs('h'),
	        asDays = makeAs('d'),
	        asWeeks = makeAs('w'),
	        asMonths = makeAs('M'),
	        asQuarters = makeAs('Q'),
	        asYears = makeAs('y');

	    function clone$1() {
	        return createDuration(this);
	    }

	    function get$2(units) {
	        units = normalizeUnits(units);
	        return this.isValid() ? this[units + 's']() : NaN;
	    }

	    function makeGetter(name) {
	        return function () {
	            return this.isValid() ? this._data[name] : NaN;
	        };
	    }

	    var milliseconds = makeGetter('milliseconds'),
	        seconds = makeGetter('seconds'),
	        minutes = makeGetter('minutes'),
	        hours = makeGetter('hours'),
	        days = makeGetter('days'),
	        months = makeGetter('months'),
	        years = makeGetter('years');

	    function weeks() {
	        return absFloor(this.days() / 7);
	    }

	    var round = Math.round,
	        thresholds = {
	            ss: 44, // a few seconds to seconds
	            s: 45, // seconds to minute
	            m: 45, // minutes to hour
	            h: 22, // hours to day
	            d: 26, // days to month/week
	            w: null, // weeks to month
	            M: 11, // months to year
	        };

	    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
	    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
	        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
	    }

	    function relativeTime$1(posNegDuration, withoutSuffix, thresholds, locale) {
	        var duration = createDuration(posNegDuration).abs(),
	            seconds = round(duration.as('s')),
	            minutes = round(duration.as('m')),
	            hours = round(duration.as('h')),
	            days = round(duration.as('d')),
	            months = round(duration.as('M')),
	            weeks = round(duration.as('w')),
	            years = round(duration.as('y')),
	            a =
	                (seconds <= thresholds.ss && ['s', seconds]) ||
	                (seconds < thresholds.s && ['ss', seconds]) ||
	                (minutes <= 1 && ['m']) ||
	                (minutes < thresholds.m && ['mm', minutes]) ||
	                (hours <= 1 && ['h']) ||
	                (hours < thresholds.h && ['hh', hours]) ||
	                (days <= 1 && ['d']) ||
	                (days < thresholds.d && ['dd', days]);

	        if (thresholds.w != null) {
	            a =
	                a ||
	                (weeks <= 1 && ['w']) ||
	                (weeks < thresholds.w && ['ww', weeks]);
	        }
	        a = a ||
	            (months <= 1 && ['M']) ||
	            (months < thresholds.M && ['MM', months]) ||
	            (years <= 1 && ['y']) || ['yy', years];

	        a[2] = withoutSuffix;
	        a[3] = +posNegDuration > 0;
	        a[4] = locale;
	        return substituteTimeAgo.apply(null, a);
	    }

	    // This function allows you to set the rounding function for relative time strings
	    function getSetRelativeTimeRounding(roundingFunction) {
	        if (roundingFunction === undefined) {
	            return round;
	        }
	        if (typeof roundingFunction === 'function') {
	            round = roundingFunction;
	            return true;
	        }
	        return false;
	    }

	    // This function allows you to set a threshold for relative time strings
	    function getSetRelativeTimeThreshold(threshold, limit) {
	        if (thresholds[threshold] === undefined) {
	            return false;
	        }
	        if (limit === undefined) {
	            return thresholds[threshold];
	        }
	        thresholds[threshold] = limit;
	        if (threshold === 's') {
	            thresholds.ss = limit - 1;
	        }
	        return true;
	    }

	    function humanize(argWithSuffix, argThresholds) {
	        if (!this.isValid()) {
	            return this.localeData().invalidDate();
	        }

	        var withSuffix = false,
	            th = thresholds,
	            locale,
	            output;

	        if (typeof argWithSuffix === 'object') {
	            argThresholds = argWithSuffix;
	            argWithSuffix = false;
	        }
	        if (typeof argWithSuffix === 'boolean') {
	            withSuffix = argWithSuffix;
	        }
	        if (typeof argThresholds === 'object') {
	            th = Object.assign({}, thresholds, argThresholds);
	            if (argThresholds.s != null && argThresholds.ss == null) {
	                th.ss = argThresholds.s - 1;
	            }
	        }

	        locale = this.localeData();
	        output = relativeTime$1(this, !withSuffix, th, locale);

	        if (withSuffix) {
	            output = locale.pastFuture(+this, output);
	        }

	        return locale.postformat(output);
	    }

	    var abs$1 = Math.abs;

	    function sign(x) {
	        return (x > 0) - (x < 0) || +x;
	    }

	    function toISOString$1() {
	        // for ISO strings we do not use the normal bubbling rules:
	        //  * milliseconds bubble up until they become hours
	        //  * days do not bubble at all
	        //  * months bubble up until they become years
	        // This is because there is no context-free conversion between hours and days
	        // (think of clock changes)
	        // and also not between days and months (28-31 days per month)
	        if (!this.isValid()) {
	            return this.localeData().invalidDate();
	        }

	        var seconds = abs$1(this._milliseconds) / 1000,
	            days = abs$1(this._days),
	            months = abs$1(this._months),
	            minutes,
	            hours,
	            years,
	            s,
	            total = this.asSeconds(),
	            totalSign,
	            ymSign,
	            daysSign,
	            hmsSign;

	        if (!total) {
	            // this is the same as C#'s (Noda) and python (isodate)...
	            // but not other JS (goog.date)
	            return 'P0D';
	        }

	        // 3600 seconds -> 60 minutes -> 1 hour
	        minutes = absFloor(seconds / 60);
	        hours = absFloor(minutes / 60);
	        seconds %= 60;
	        minutes %= 60;

	        // 12 months -> 1 year
	        years = absFloor(months / 12);
	        months %= 12;

	        // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
	        s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';

	        totalSign = total < 0 ? '-' : '';
	        ymSign = sign(this._months) !== sign(total) ? '-' : '';
	        daysSign = sign(this._days) !== sign(total) ? '-' : '';
	        hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';

	        return (
	            totalSign +
	            'P' +
	            (years ? ymSign + years + 'Y' : '') +
	            (months ? ymSign + months + 'M' : '') +
	            (days ? daysSign + days + 'D' : '') +
	            (hours || minutes || seconds ? 'T' : '') +
	            (hours ? hmsSign + hours + 'H' : '') +
	            (minutes ? hmsSign + minutes + 'M' : '') +
	            (seconds ? hmsSign + s + 'S' : '')
	        );
	    }

	    var proto$2 = Duration.prototype;

	    proto$2.isValid = isValid$1;
	    proto$2.abs = abs;
	    proto$2.add = add$1;
	    proto$2.subtract = subtract$1;
	    proto$2.as = as;
	    proto$2.asMilliseconds = asMilliseconds;
	    proto$2.asSeconds = asSeconds;
	    proto$2.asMinutes = asMinutes;
	    proto$2.asHours = asHours;
	    proto$2.asDays = asDays;
	    proto$2.asWeeks = asWeeks;
	    proto$2.asMonths = asMonths;
	    proto$2.asQuarters = asQuarters;
	    proto$2.asYears = asYears;
	    proto$2.valueOf = valueOf$1;
	    proto$2._bubble = bubble;
	    proto$2.clone = clone$1;
	    proto$2.get = get$2;
	    proto$2.milliseconds = milliseconds;
	    proto$2.seconds = seconds;
	    proto$2.minutes = minutes;
	    proto$2.hours = hours;
	    proto$2.days = days;
	    proto$2.weeks = weeks;
	    proto$2.months = months;
	    proto$2.years = years;
	    proto$2.humanize = humanize;
	    proto$2.toISOString = toISOString$1;
	    proto$2.toString = toISOString$1;
	    proto$2.toJSON = toISOString$1;
	    proto$2.locale = locale;
	    proto$2.localeData = localeData;

	    proto$2.toIsoString = deprecate(
	        'toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)',
	        toISOString$1
	    );
	    proto$2.lang = lang;

	    // FORMATTING

	    addFormatToken('X', 0, 0, 'unix');
	    addFormatToken('x', 0, 0, 'valueOf');

	    // PARSING

	    addRegexToken('x', matchSigned);
	    addRegexToken('X', matchTimestamp);
	    addParseToken('X', function (input, array, config) {
	        config._d = new Date(parseFloat(input) * 1000);
	    });
	    addParseToken('x', function (input, array, config) {
	        config._d = new Date(toInt(input));
	    });

	    //! moment.js

	    hooks.version = '2.29.4';

	    setHookCallback(createLocal);

	    hooks.fn = proto;
	    hooks.min = min;
	    hooks.max = max;
	    hooks.now = now;
	    hooks.utc = createUTC;
	    hooks.unix = createUnix;
	    hooks.months = listMonths;
	    hooks.isDate = isDate;
	    hooks.locale = getSetGlobalLocale;
	    hooks.invalid = createInvalid;
	    hooks.duration = createDuration;
	    hooks.isMoment = isMoment;
	    hooks.weekdays = listWeekdays;
	    hooks.parseZone = createInZone;
	    hooks.localeData = getLocale;
	    hooks.isDuration = isDuration;
	    hooks.monthsShort = listMonthsShort;
	    hooks.weekdaysMin = listWeekdaysMin;
	    hooks.defineLocale = defineLocale;
	    hooks.updateLocale = updateLocale;
	    hooks.locales = listLocales;
	    hooks.weekdaysShort = listWeekdaysShort;
	    hooks.normalizeUnits = normalizeUnits;
	    hooks.relativeTimeRounding = getSetRelativeTimeRounding;
	    hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
	    hooks.calendarFormat = getCalendarFormat;
	    hooks.prototype = proto;

	    // currently HTML5 input type only supports 24-hour formats
	    hooks.HTML5_FMT = {
	        DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm', // <input type="datetime-local" />
	        DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss', // <input type="datetime-local" step="1" />
	        DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS', // <input type="datetime-local" step="0.001" />
	        DATE: 'YYYY-MM-DD', // <input type="date" />
	        TIME: 'HH:mm', // <input type="time" />
	        TIME_SECONDS: 'HH:mm:ss', // <input type="time" step="1" />
	        TIME_MS: 'HH:mm:ss.SSS', // <input type="time" step="0.001" />
	        WEEK: 'GGGG-[W]WW', // <input type="week" />
	        MONTH: 'YYYY-MM', // <input type="month" />
	    };

	    return hooks;

	})));
} (moment));

const UnknownProject = {
    id: "-1",
    parent_id: null,
    order: -1,
    name: "Unknown project",
};
const UnknownSection = {
    id: "-1",
    project_id: "-1",
    order: -1,
    name: "Unknown section",
};

class Task {
    constructor(raw) {
        this.id = raw.id;
        this.priority = raw.priority;
        this.content = raw.content;
        this.description = raw.description;
        this.order = raw.order;
        this.projectID = raw.project_id;
        this.sectionID = raw.section_id != null ? raw.section_id : null;
        this.labels = raw.labels;
        this.children = [];
        if (raw.due) {
            if (raw.due.datetime) {
                this.hasTime = true;
                this.rawDatetime = momentExports(raw.due.datetime);
                this.date = this.rawDatetime.calendar();
            }
            else {
                this.hasTime = false;
                this.rawDatetime = momentExports(raw.due.date);
                this.date = this.rawDatetime.calendar(Task.dateOnlyCalendarSpec);
            }
        }
    }
    count() {
        return 1 + this.children.reduce((sum, task) => sum + task.count(), 0);
    }
    isOverdue() {
        if (!this.rawDatetime) {
            return false;
        }
        if (this.hasTime) {
            return this.rawDatetime.isBefore();
        }
        return this.rawDatetime.clone().add(1, "day").isBefore();
    }
    isToday() {
        if (!this.rawDatetime) {
            return false;
        }
        return this.rawDatetime.isSame(new Date(), "day");
    }
    compareTo(other, sorting_options) {
        /* Compares the dates of this to 'other'. Returns :
         *   1 if this is after the other
         *   0 if this is equal to the other.
         *   -1 if this is before the 'other'
         */
        const compareDate = () => {
            // We want to sort using the following criteria:
            // 1. Any items without a datetime always are sorted after those with.
            // 2. Any items on the same day without time always are sorted after those with.
            if (this.rawDatetime && !other.rawDatetime) {
                return -1;
            }
            else if (!this.rawDatetime && other.rawDatetime) {
                return 1;
            }
            else if (!this.rawDatetime && !other.rawDatetime) {
                return 0;
            }
            // Now compare dates.
            if (this.rawDatetime.isAfter(other.rawDatetime, "day")) {
                return 1;
            }
            else if (this.rawDatetime.isBefore(other.rawDatetime, "day")) {
                return -1;
            }
            // We are the same day, lets look at time.
            if (this.hasTime && !other.hasTime) {
                return -1;
            }
            else if (!this.hasTime && other.hasTime) {
                return 1;
            }
            else if (!this.hasTime && !this.hasTime) {
                return 0;
            }
            return this.rawDatetime.isBefore(other.rawDatetime) ? -1 : 1;
        };
        const dateComparison = compareDate();
        for (let sort of sorting_options) {
            switch (sort) {
                case "priority":
                    // Higher priority comes first.
                    const diff = other.priority - this.priority;
                    if (diff == 0) {
                        continue;
                    }
                    return diff;
                case "date":
                case "dateAscending":
                    if (dateComparison == 0) {
                        continue;
                    }
                    return dateComparison;
                case "dateDescending":
                    if (dateComparison == 0) {
                        continue;
                    }
                    return -dateComparison;
            }
        }
        return this.order - other.order;
    }
    static buildTree(tasks) {
        const mapping = new Map();
        tasks.forEach((task) => mapping.set(task.id, new Task(task)));
        tasks.forEach((task) => {
            if (task.parent_id == null || !mapping.has(task.parent_id)) {
                return;
            }
            const self = mapping.get(task.id);
            const parent = mapping.get(task.parent_id);
            self.parent = parent;
            parent.children.push(self);
        });
        return Array.from(mapping.values()).filter((task) => task.parent == null);
    }
}
Task.dateOnlyCalendarSpec = {
    sameDay: "[Today]",
    nextDay: "[Tomorrow]",
    nextWeek: "dddd",
    lastDay: "[Yesterday]",
    lastWeek: "[Last] dddd",
    sameElse: "MMM Do",
};
class Project {
    constructor(raw) {
        this.projectID = raw.id;
        this.parentID = raw.parent_id;
        this.order = raw.order;
        this.tasks = [];
        this.subProjects = [];
        this.sections = [];
    }
    count() {
        return (this.tasks.reduce((sum, task) => sum + task.count(), 0) +
            this.subProjects.reduce((sum, prj) => sum + prj.count(), 0) +
            this.sections.reduce((sum, section) => sum + section.count(), 0));
    }
    sort() {
        this.subProjects = this.subProjects.sort((first, second) => first.order - second.order);
        this.sections = this.sections.sort((first, second) => first.order - second.order);
    }
    static buildProjectTree(tasks, metadata) {
        const projects = new ExtendedMap();
        const sections = new ExtendedMap();
        const unknownProject = {
            result: new Project(UnknownProject),
            tasks: [],
        };
        const unknownSection = {
            result: new Section(UnknownSection),
            tasks: [],
        };
        tasks.forEach((task) => {
            var _a, _b;
            const project = (_a = projects.get_or_maybe_insert(task.project_id, () => {
                const project = metadata.projects.get(task.project_id);
                if (project) {
                    return {
                        result: new Project(project),
                        tasks: [],
                    };
                }
                else {
                    return null;
                }
            })) !== null && _a !== void 0 ? _a : unknownProject;
            if (task.section_id != null) {
                // The task has an associated section, so we file it under there.
                const section = (_b = sections.get_or_maybe_insert(task.section_id, () => {
                    const section = metadata.sections.get(task.section_id);
                    if (section) {
                        return {
                            result: new Section(section),
                            tasks: [],
                        };
                    }
                    else {
                        return null;
                    }
                })) !== null && _b !== void 0 ? _b : unknownSection;
                section.tasks.push(task);
                return;
            }
            project.tasks.push(task);
        });
        if (unknownProject.tasks.length > 0) {
            projects.set(unknownProject.result.projectID, unknownProject);
        }
        if (unknownSection.tasks.length > 0) {
            projects.set(unknownProject.result.projectID, unknownProject);
            sections.set(unknownSection.result.sectionID, unknownSection);
        }
        // Attach parents for projects.
        for (let project of projects.values()) {
            project.result.tasks = Task.buildTree(project.tasks);
            if (!project.result.parentID) {
                continue;
            }
            const parent = projects.get(project.result.parentID);
            if (parent) {
                parent.result.subProjects.push(project.result);
                project.result.parent = parent.result;
            }
        }
        // Attach parents for sections.
        for (let section of sections.values()) {
            section.result.tasks = Task.buildTree(section.tasks);
            const project = projects.get(section.result.projectID);
            project.result.sections.push(section.result);
        }
        projects.forEach((prj) => prj.result.sort());
        return Array.from(projects.values())
            .map((prj) => prj.result)
            .filter((prj) => prj.parent == null);
    }
}
class Section {
    constructor(raw) {
        this.sectionID = raw.id;
        this.projectID = raw.project_id;
        this.order = raw.order;
    }
    count() {
        return this.tasks.reduce((sum, task) => sum + task.count(), 0);
    }
}

class Result {
    static Capture(closure) {
        try {
            return Result.Ok(closure());
        }
        catch (e) {
            return Result.Err(e);
        }
    }
    static Ok(value) {
        let result = new Result();
        result.ok = value;
        return result;
    }
    static Err(err) {
        let result = new Result();
        result.error = err;
        return result;
    }
    static All(first, second, third) {
        if (first.isErr()) {
            return first.intoErr();
        }
        if (second.isErr()) {
            return second.intoErr();
        }
        if (third.isErr()) {
            return third.intoErr();
        }
        return Result.Ok([first.unwrap(), second.unwrap(), third.unwrap()]);
    }
    isOk() {
        return this.ok != null;
    }
    isErr() {
        return this.error != null;
    }
    unwrap() {
        if (!this.isOk()) {
            throw new Error("Called 'unwrap' on a Result with an error.");
        }
        return this.ok;
    }
    unwrapErr() {
        if (!this.isErr()) {
            throw new Error("Called 'unwrapErr' on a Result with a value.");
        }
        return this.error;
    }
    map(func) {
        if (this.isOk()) {
            return Result.Ok(func(this.ok));
        }
        else {
            return this.intoErr();
        }
    }
    unwrapOr(val) {
        return this.isOk() ? this.ok : val;
    }
    intoErr() {
        return Result.Err(this.error);
    }
}

class TodoistApi {
    constructor(token) {
        this.token = token;
        this.metadataInstance = {
            projects: new ExtendedMap(),
            sections: new ExtendedMap(),
            labels: new ExtendedMap(),
        };
        this.metadata = writable(this.metadataInstance);
        this.metadata.subscribe((value) => (this.metadataInstance = value));
    }
    async createTask(content, options) {
        const data = Object.assign({ content: content }, (options !== null && options !== void 0 ? options : {}));
        try {
            const result = await this.makeRequest({
                method: "POST",
                path: "/tasks",
                jsonBody: data,
            });
            if (result.status == 200) {
                return Result.Ok({});
            }
            else {
                return Result.Err(new Error("Failed to create task"));
            }
        }
        catch (e) {
            return Result.Err(e);
        }
    }
    async getTasks(filter) {
        let url = "/tasks";
        if (filter) {
            url += `?filter=${encodeURIComponent(filter)}`;
        }
        try {
            const result = await this.makeRequest({
                method: "GET",
                path: url,
            });
            if (result.status == 200) {
                const tasks = result.json;
                const tree = Task.buildTree(tasks);
                debug({
                    msg: "Built task tree",
                    context: tree,
                });
                return Result.Ok(tree);
            }
            else {
                return Result.Err(new Error(result.text));
            }
        }
        catch (e) {
            return Result.Err(e);
        }
    }
    async getTasksGroupedByProject(filter) {
        let url = "/tasks";
        if (filter) {
            url += `?filter=${encodeURIComponent(filter)}`;
        }
        try {
            const result = await this.makeRequest({
                method: "GET",
                path: url,
            });
            if (result.status == 200) {
                // Force the metadata to update.
                const metadataResult = await this.fetchMetadata();
                if (metadataResult.isErr()) {
                    return Result.Err(metadataResult.unwrapErr());
                }
                const tasks = result.json;
                const tree = Project.buildProjectTree(tasks, this.metadataInstance);
                debug({
                    msg: "Built project tree",
                    context: tree,
                });
                return Result.Ok(tree);
            }
            else {
                return Result.Err(new Error(result.text));
            }
        }
        catch (e) {
            return Result.Err(e);
        }
    }
    async closeTask(id) {
        const result = await this.makeRequest({
            method: "POST",
            path: `/tasks/${id}/close`,
        });
        return result.status == 204;
    }
    async fetchMetadata() {
        const projectResult = await this.getProjects();
        const sectionResult = await this.getSections();
        const labelResult = await this.getLabels();
        const merged = Result.All(projectResult, sectionResult, labelResult);
        if (merged.isErr()) {
            return merged.intoErr();
        }
        const [projects, sections, labels] = merged.unwrap();
        this.metadata.update((metadata) => {
            metadata.projects.clear();
            metadata.sections.clear();
            metadata.labels.clear();
            projects.forEach((prj) => metadata.projects.set(prj.id, prj));
            sections.forEach((sect) => metadata.sections.set(sect.id, sect));
            labels.forEach((label) => metadata.labels.set(label.id, label.name));
            return metadata;
        });
        return Result.Ok({});
    }
    async getProjects() {
        try {
            const result = await this.makeRequest({
                method: "GET",
                path: "/projects",
            });
            return result.status == 200
                ? Result.Ok(result.json)
                : Result.Err(new Error(result.text));
        }
        catch (e) {
            return Result.Err(e);
        }
    }
    async getSections() {
        try {
            const result = await this.makeRequest({
                method: "GET",
                path: "/sections",
            });
            return result.status == 200
                ? Result.Ok(result.json)
                : Result.Err(new Error(result.text));
        }
        catch (e) {
            return Result.Err(e);
        }
    }
    async getLabels() {
        try {
            const result = await this.makeRequest({
                method: "GET",
                path: "/labels",
            });
            return result.status == 200
                ? Result.Ok(result.json)
                : Result.Err(new Error(result.text));
        }
        catch (e) {
            return Result.Err(e);
        }
    }
    async makeRequest(params) {
        const requestParams = {
            url: `https://api.todoist.com/rest/v2${params.path}`,
            method: params.method,
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        };
        debug(`[Todoist API]: ${requestParams.method} ${requestParams.url}`);
        if (params.jsonBody) {
            requestParams.body = JSON.stringify(params.jsonBody);
            requestParams.headers = Object.assign(Object.assign({}, requestParams.headers), {
                "Content-Type": "application/json",
            });
        }
        const response = await obsidian.requestUrl(requestParams);
        if (response.status >= 400) {
            console.error(`[Todoist API]: ${requestParams.method} ${requestParams.url} returned error '[${response.status}]: ${response.text}`);
        }
        return response;
    }
}

/* src/modals/enterToken/EnterTokenModalContent.svelte generated by Svelte v3.58.0 */

function create_fragment$m(ctx) {
	let div4;
	let div2;
	let t4;
	let div3;
	let input;
	let t5;
	let button;
	let mounted;
	let dispose;

	return {
		c() {
			div4 = element("div");
			div2 = element("div");

			div2.innerHTML = `<div class="setting-item-name">Todoist token</div> 
    <div class="setting-item-description"><span>You can find the token
        <a href="https://todoist.com/prefs/integrations">here!</a></span></div>`;

			t4 = space();
			div3 = element("div");
			input = element("input");
			t5 = space();
			button = element("button");
			button.textContent = "Submit";
			attr(div2, "class", "setting-item-info");
			attr(input, "type", "text");
			attr(input, "placeholder", "API token");
			attr(div3, "class", "setting-item-control");
			attr(div4, "class", "setting-item");
			attr(button, "class", "mod-cta");
			set_style(button, "float", "right");
		},
		m(target, anchor) {
			insert(target, div4, anchor);
			append(div4, div2);
			append(div4, t4);
			append(div4, div3);
			append(div3, input);
			/*input_binding*/ ctx[2](input);
			insert(target, t5, anchor);
			insert(target, button, anchor);

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler*/ ctx[3]);
				mounted = true;
			}
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div4);
			/*input_binding*/ ctx[2](null);
			if (detaching) detach(t5);
			if (detaching) detach(button);
			mounted = false;
			dispose();
		}
	};
}

function instance$h($$self, $$props, $$invalidate) {
	let { onSubmit } = $$props;
	let tokenInput;

	function input_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			tokenInput = $$value;
			$$invalidate(1, tokenInput);
		});
	}

	const click_handler = () => onSubmit(tokenInput.value);

	$$self.$$set = $$props => {
		if ('onSubmit' in $$props) $$invalidate(0, onSubmit = $$props.onSubmit);
	};

	return [onSubmit, tokenInput, input_binding, click_handler];
}

class EnterTokenModalContent extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$h, create_fragment$m, safe_not_equal, { onSubmit: 0 });
	}
}

class TodoistApiTokenModal extends obsidian.Modal {
    constructor(app) {
        super(app);
        this.token = "";
        this.waitForClose = new Promise((resolve) => (this.resolvePromise = resolve));
        this.titleEl.innerText = "Setup Todoist API token";
        this.modalContent = new EnterTokenModalContent({
            target: this.contentEl,
            props: {
                onSubmit: (value) => {
                    this.token = value;
                    this.close();
                },
            },
        });
        this.open();
    }
    onClose() {
        super.onClose();
        this.modalContent.$destroy();
        this.resolvePromise();
    }
}

/* src/modals/createTask/CalendarPicker.svelte generated by Svelte v3.58.0 */

function add_css$7(target) {
	append_styles(target, "svelte-pcqw36", ".week.svelte-pcqw36.svelte-pcqw36{display:flex}.week-header.svelte-pcqw36.svelte-pcqw36{border-bottom:1px solid var(--background-modifier-border)}.day.svelte-pcqw36.svelte-pcqw36{width:14.28%;text-align:center;height:1.5em}.past-day.svelte-pcqw36.svelte-pcqw36{color:var(--text-muted)}.selected-day.svelte-pcqw36.svelte-pcqw36{background-color:var(--background-secondary);color:var(--text-accent)}.day.svelte-pcqw36.svelte-pcqw36:not(:empty):hover{background-color:var(--background-secondary)}.month-controls.svelte-pcqw36.svelte-pcqw36{display:flex;justify-content:center;width:100%;margin-bottom:10px}.control-button.svelte-pcqw36.svelte-pcqw36{color:var(--text-muted)}.control-button.svelte-pcqw36>svg.svelte-pcqw36{height:20px;width:20px}.current-month.svelte-pcqw36.svelte-pcqw36{margin:0 10px}");
}

function get_each_context$5(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[12] = list[i];
	return child_ctx;
}

function get_each_context_1$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[15] = list[i];
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[18] = list[i];
	return child_ctx;
}

// (90:4) {#each daysOfWeek as dow}
function create_each_block_2(ctx) {
	let div;
	let t_value = /*dow*/ ctx[18] + "";
	let t;

	return {
		c() {
			div = element("div");
			t = text(t_value);
			attr(div, "class", "day svelte-pcqw36");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (106:8) {:else}
function create_else_block$4(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "class", "day svelte-pcqw36");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (97:8) {#if day}
function create_if_block$7(ctx) {
	let div;
	let t_value = /*day*/ ctx[15].date() + "";
	let t;
	let div_class_value;
	let mounted;
	let dispose;

	function click_handler() {
		return /*click_handler*/ ctx[10](/*day*/ ctx[15]);
	}

	return {
		c() {
			div = element("div");
			t = text(t_value);

			attr(div, "class", div_class_value = "day " + ((/*selected*/ ctx[0]?.isSame(/*day*/ ctx[15], 'day'))
			? 'selected-day'
			: '') + " " + (momentExports().isAfter(/*day*/ ctx[15], 'day')
			? 'past-day'
			: '') + " svelte-pcqw36");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);

			if (!mounted) {
				dispose = listen(div, "click", click_handler);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*monthData*/ 8 && t_value !== (t_value = /*day*/ ctx[15].date() + "")) set_data(t, t_value);

			if (dirty & /*selected, monthData*/ 9 && div_class_value !== (div_class_value = "day " + ((/*selected*/ ctx[0]?.isSame(/*day*/ ctx[15], 'day'))
			? 'selected-day'
			: '') + " " + (momentExports().isAfter(/*day*/ ctx[15], 'day')
			? 'past-day'
			: '') + " svelte-pcqw36")) {
				attr(div, "class", div_class_value);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

// (96:6) {#each week as day}
function create_each_block_1$2(ctx) {
	let if_block_anchor;

	function select_block_type(ctx, dirty) {
		if (/*day*/ ctx[15]) return create_if_block$7;
		return create_else_block$4;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},
		d(detaching) {
			if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (94:2) {#each monthData as week}
function create_each_block$5(ctx) {
	let div;
	let t;
	let each_value_1 = /*week*/ ctx[12];
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();
			attr(div, "class", "week svelte-pcqw36");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}

			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty & /*selected, monthData, moment, dispatch*/ 41) {
				each_value_1 = /*week*/ ctx[12];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_1$2(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, t);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_1.length;
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

function create_fragment$l(ctx) {
	let div0;
	let span0;
	let t0;
	let span1;
	let t1_value = momentExports(`${/*year*/ ctx[1]}-${/*month*/ ctx[2] + 1}-01 00:00:00`).format("MMM YYYY") + "";
	let t1;
	let t2;
	let span2;
	let t3;
	let div2;
	let div1;
	let t4;
	let mounted;
	let dispose;
	let each_value_2 = /*daysOfWeek*/ ctx[4];
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	let each_value = /*monthData*/ ctx[3];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
	}

	return {
		c() {
			div0 = element("div");
			span0 = element("span");
			span0.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="svelte-pcqw36"><path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"></path></svg>`;
			t0 = space();
			span1 = element("span");
			t1 = text(t1_value);
			t2 = space();
			span2 = element("span");
			span2.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="svelte-pcqw36"><path fill-rule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clip-rule="evenodd"></path><path fill-rule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>`;
			t3 = space();
			div2 = element("div");
			div1 = element("div");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t4 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(span0, "class", "control-button svelte-pcqw36");
			attr(span1, "class", "current-month svelte-pcqw36");
			attr(span2, "class", "control-button svelte-pcqw36");
			attr(div0, "class", "month-controls svelte-pcqw36");
			attr(div1, "class", "week week-header svelte-pcqw36");
			attr(div2, "class", "month-display");
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			append(div0, span0);
			append(div0, t0);
			append(div0, span1);
			append(span1, t1);
			append(div0, t2);
			append(div0, span2);
			insert(target, t3, anchor);
			insert(target, div2, anchor);
			append(div2, div1);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				if (each_blocks_1[i]) {
					each_blocks_1[i].m(div1, null);
				}
			}

			append(div2, t4);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div2, null);
				}
			}

			if (!mounted) {
				dispose = [
					listen(span0, "click", /*decrementMonth*/ ctx[6]),
					listen(span2, "click", /*incrementMonth*/ ctx[7])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*year, month*/ 6 && t1_value !== (t1_value = momentExports(`${/*year*/ ctx[1]}-${/*month*/ ctx[2] + 1}-01 00:00:00`).format("MMM YYYY") + "")) set_data(t1, t1_value);

			if (dirty & /*daysOfWeek*/ 16) {
				each_value_2 = /*daysOfWeek*/ ctx[4];
				let i;

				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_2(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(div1, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_2.length;
			}

			if (dirty & /*monthData, selected, moment, dispatch*/ 41) {
				each_value = /*monthData*/ ctx[3];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$5(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$5(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div2, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div0);
			if (detaching) detach(t3);
			if (detaching) detach(div2);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$g($$self, $$props, $$invalidate) {
	let year;
	let month;
	let monthData;
	var _a, _b;
	const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];
	let { selected } = $$props;
	const dispatch = createEventDispatcher();

	function getMonthData(month, year) {
		let monthData = [];
		let day = momentExports(`${year}-${month + 1}-01 00:00:00`);
		let week = [];

		// Pad the front of the data with empty days in a week before the 1st of the month.
		for (let i = 0; i < day.day(); i++) {
			week.push(null);
		}

		// Fill in the weeks.
		while (day.month() == month) {
			week.push(day);
			day = day.clone().add(1, "day");

			if (week.length == 7) {
				monthData.push(week);
				week = [];
			}
		}

		// Now pad the end of the month such that the week is full.
		if (week.length != 0) {
			while (week.length != 7) {
				week.push(null);
			}

			monthData.push(week);
		}

		return monthData;
	}

	function decrementMonth() {
		$$invalidate(2, month -= 1);

		if (month == -1) {
			$$invalidate(2, month = 11);
			$$invalidate(1, year -= 1);
		}
	}

	function incrementMonth() {
		$$invalidate(2, month += 1);

		if (month == 12) {
			$$invalidate(2, month = 0);
			$$invalidate(1, year += 1);
		}
	}

	const click_handler = day => dispatch("selectDate", day);

	$$self.$$set = $$props => {
		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*selected, _a*/ 257) {
			$$invalidate(1, year = $$invalidate(8, _a = selected === null || selected === void 0
			? void 0
			: selected.year()) !== null && _a !== void 0
			? _a
			: momentExports().year());
		}

		if ($$self.$$.dirty & /*selected, _b*/ 513) {
			$$invalidate(2, month = $$invalidate(9, _b = selected === null || selected === void 0
			? void 0
			: selected.month()) !== null && _b !== void 0
			? _b
			: momentExports().month());
		}

		if ($$self.$$.dirty & /*month, year*/ 6) {
			$$invalidate(3, monthData = getMonthData(month, year));
		}
	};

	return [
		selected,
		year,
		month,
		monthData,
		daysOfWeek,
		dispatch,
		decrementMonth,
		incrementMonth,
		_a,
		_b,
		click_handler
	];
}

class CalendarPicker extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$g, create_fragment$l, safe_not_equal, { selected: 0 }, add_css$7);
	}
}

/* src/modals/createTask/DateSelector.svelte generated by Svelte v3.58.0 */

const { window: window_1 } = globals;

function add_css$6(target) {
	append_styles(target, "svelte-1b0zzbj", ".date-input.svelte-1b0zzbj{border:1px solid var(--background-primary-alt);background-color:var(--background-modifier-form-field);line-height:42px}.date-input.svelte-1b0zzbj:hover{border:1px solid var(--interactive-accent);background-color:var(--background-modifier-form-highlighted)}.date-preview.svelte-1b0zzbj{margin-left:1em}.reset-date-button.svelte-1b0zzbj{float:right;height:42px;width:20px;margin-right:10px}.date-placeholder.svelte-1b0zzbj{margin-left:1em;color:var(--text-muted)}.drawer-target.svelte-1b0zzbj{position:fixed;z-index:2;height:auto;background-color:var(--background-primary)}.specific-date-option.svelte-1b0zzbj{height:42px;line-height:42px;padding:0 20px}.specific-date-option.svelte-1b0zzbj:hover{background-color:var(--background-secondary)}.calendar-container.svelte-1b0zzbj{padding:20px;border-top:2px solid var(--background-modifier-border)}");
}

// (90:2) {:else}
function create_else_block$3(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "No date selected.";
			attr(span, "class", "date-placeholder svelte-1b0zzbj");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (70:2) {#if selected}
function create_if_block_1$5(ctx) {
	let span0;
	let t0_value = /*selected*/ ctx[0].format("MMM D, YYYY") + "";
	let t0;
	let t1;
	let span1;
	let mounted;
	let dispose;

	return {
		c() {
			span0 = element("span");
			t0 = text(t0_value);
			t1 = space();
			span1 = element("span");

			span1.innerHTML = `<svg width="100%" height="100%" viewBox="-2 -2 50 50" focusable="false" role="presentation"><path fill="currentColor" d="M34.923,37.251L24,26.328L13.077,37.251L9.436,33.61l10.923-10.923L9.436,11.765l3.641-3.641L24,19.047L34.923,8.124
          l3.641,3.641L27.641,22.688L38.564,33.61L34.923,37.251z"></path></svg>`;

			attr(span0, "class", "date-preview svelte-1b0zzbj");
			attr(span1, "class", "reset-date-button svelte-1b0zzbj");
		},
		m(target, anchor) {
			insert(target, span0, anchor);
			append(span0, t0);
			insert(target, t1, anchor);
			insert(target, span1, anchor);

			if (!mounted) {
				dispose = listen(span1, "click", stop_propagation(/*click_handler*/ ctx[8]));
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*selected*/ 1 && t0_value !== (t0_value = /*selected*/ ctx[0].format("MMM D, YYYY") + "")) set_data(t0, t0_value);
		},
		d(detaching) {
			if (detaching) detach(span0);
			if (detaching) detach(t1);
			if (detaching) detach(span1);
			mounted = false;
			dispose();
		}
	};
}

// (93:2) {#if drawerOpen}
function create_if_block$6(ctx) {
	let div3;
	let div0;
	let t1;
	let div1;
	let t3;
	let div2;
	let calendarpicker;
	let current;
	let mounted;
	let dispose;
	calendarpicker = new CalendarPicker({ props: { selected: /*selected*/ ctx[0] } });
	calendarpicker.$on("selectDate", /*selectDate_handler*/ ctx[12]);

	return {
		c() {
			div3 = element("div");
			div0 = element("div");
			div0.textContent = "Today";
			t1 = space();
			div1 = element("div");
			div1.textContent = "Tomorrow";
			t3 = space();
			div2 = element("div");
			create_component(calendarpicker.$$.fragment);
			attr(div0, "class", "specific-date-option svelte-1b0zzbj");
			attr(div1, "class", "specific-date-option svelte-1b0zzbj");
			attr(div2, "class", "calendar-container svelte-1b0zzbj");
			attr(div3, "class", "drawer-target svelte-1b0zzbj");
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div0);
			append(div3, t1);
			append(div3, div1);
			append(div3, t3);
			append(div3, div2);
			mount_component(calendarpicker, div2, null);
			/*div3_binding*/ ctx[13](div3);
			current = true;

			if (!mounted) {
				dispose = [
					listen(div0, "click", /*click_handler_2*/ ctx[10]),
					listen(div1, "click", /*click_handler_3*/ ctx[11]),
					action_destroyer(/*resizeDrawer*/ ctx[7].call(null, div3))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			const calendarpicker_changes = {};
			if (dirty & /*selected*/ 1) calendarpicker_changes.selected = /*selected*/ ctx[0];
			calendarpicker.$set(calendarpicker_changes);
		},
		i(local) {
			if (current) return;
			transition_in(calendarpicker.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(calendarpicker.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div3);
			destroy_component(calendarpicker);
			/*div3_binding*/ ctx[13](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment$k(ctx) {
	let div0;
	let t;
	let div1;
	let current;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*selected*/ ctx[0]) return create_if_block_1$5;
		return create_else_block$3;
	}

	let current_block_type = select_block_type(ctx);
	let if_block0 = current_block_type(ctx);
	let if_block1 = /*drawerOpen*/ ctx[3] && create_if_block$6(ctx);

	return {
		c() {
			div0 = element("div");
			if_block0.c();
			t = space();
			div1 = element("div");
			if (if_block1) if_block1.c();
			attr(div0, "class", "date-input svelte-1b0zzbj");
			attr(div1, "class", "drawer-container");
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			if_block0.m(div0, null);
			insert(target, t, anchor);
			insert(target, div1, anchor);
			if (if_block1) if_block1.m(div1, null);
			/*div1_binding*/ ctx[14](div1);
			current = true;

			if (!mounted) {
				dispose = [
					listen(window_1, "resize", /*trackPosition*/ ctx[6]),
					listen(window_1, "click", /*handleWindowClick*/ ctx[5]),
					listen(div0, "click", /*click_handler_1*/ ctx[9])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
				if_block0.p(ctx, dirty);
			} else {
				if_block0.d(1);
				if_block0 = current_block_type(ctx);

				if (if_block0) {
					if_block0.c();
					if_block0.m(div0, null);
				}
			}

			if (/*drawerOpen*/ ctx[3]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*drawerOpen*/ 8) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block$6(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(div1, null);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div0);
			if_block0.d();
			if (detaching) detach(t);
			if (detaching) detach(div1);
			if (if_block1) if_block1.d();
			/*div1_binding*/ ctx[14](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function isOutOfViewport(elem) {
	const bounding = elem.getBoundingClientRect();

	const out = {
		top: false,
		left: false,
		bottom: false,
		right: false,
		any: false
	};

	out.top = bounding.top < 0;
	out.left = bounding.left < 0;
	out.bottom = bounding.bottom > (window.innerHeight || document.documentElement.clientHeight);
	out.right = bounding.right > (window.innerWidth || document.documentElement.clientWidth);
	out.any = out.top || out.left || out.bottom || out.right;
	return out;
}

function instance$f($$self, $$props, $$invalidate) {
	let { selected = null } = $$props;
	let container = null;
	let target = null;
	let drawerOpen = false;

	function setDate(date) {
		$$invalidate(0, selected = date);
		$$invalidate(3, drawerOpen = false);
	}

	function handleWindowClick(ev) {
		if (!drawerOpen || !target) {
			return;
		}

		const eventPath = ev.composedPath();
		const eventTarget = eventPath.length > 0 ? eventPath[0] : ev.target;

		if (target.contains(eventTarget)) {
			return;
		}

		$$invalidate(3, drawerOpen = false);
	}

	function trackPosition() {
		if (!target || !container) {
			return;
		}

		const { height, width } = container.getBoundingClientRect();
		$$invalidate(2, target.style.minWidth = `${width}px`, target);
		$$invalidate(2, target.style.width = "auto", target);

		if (isOutOfViewport(target).bottom) {
			$$invalidate(2, target.style.bottom = `${height + 5}px`, target);
		}
	}

	const resizeDrawer = element => {
		$$invalidate(2, target = element);
		trackPosition();
	};

	const click_handler = () => {
		setDate(null);
	};

	const click_handler_1 = ev => {
		if (!drawerOpen) {
			ev.stopPropagation();
			$$invalidate(3, drawerOpen = true);
		}
	};

	const click_handler_2 = () => {
		setDate(momentExports());
	};

	const click_handler_3 = () => {
		setDate(momentExports().add(1, "day"));
	};

	const selectDate_handler = ev => setDate(ev.detail);

	function div3_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			target = $$value;
			$$invalidate(2, target);
		});
	}

	function div1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			container = $$value;
			$$invalidate(1, container);
		});
	}

	$$self.$$set = $$props => {
		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
	};

	return [
		selected,
		container,
		target,
		drawerOpen,
		setDate,
		handleWindowClick,
		trackPosition,
		resizeDrawer,
		click_handler,
		click_handler_1,
		click_handler_2,
		click_handler_3,
		selectDate_handler,
		div3_binding,
		div1_binding
	];
}

class DateSelector extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$f, create_fragment$k, safe_not_equal, { selected: 0 }, add_css$6);
	}
}

function t(t){return t.split("-")[1]}function e(t){return "y"===t?"height":"width"}function n$1(t){return t.split("-")[0]}function o$1(t){return ["top","bottom"].includes(n$1(t))?"x":"y"}function i$1(i,r,a){let{reference:l,floating:s}=i;const c=l.x+l.width/2-s.width/2,f=l.y+l.height/2-s.height/2,m=o$1(r),u=e(m),g=l[u]/2-s[u]/2,d="x"===m;let p;switch(n$1(r)){case"top":p={x:c,y:l.y-s.height};break;case"bottom":p={x:c,y:l.y+l.height};break;case"right":p={x:l.x+l.width,y:f};break;case"left":p={x:l.x-s.width,y:f};break;default:p={x:l.x,y:l.y};}switch(t(r)){case"start":p[m]-=g*(a&&d?-1:1);break;case"end":p[m]+=g*(a&&d?-1:1);}return p}const r$1=async(t,e,n)=>{const{placement:o="bottom",strategy:r="absolute",middleware:a=[],platform:l}=n,s=a.filter(Boolean),c=await(null==l.isRTL?void 0:l.isRTL(e));let f=await l.getElementRects({reference:t,floating:e,strategy:r}),{x:m,y:u}=i$1(f,o,c),g=o,d={},p=0;for(let n=0;n<s.length;n++){const{name:a,fn:h}=s[n],{x:y,y:x,data:w,reset:v}=await h({x:m,y:u,initialPlacement:o,placement:g,strategy:r,middlewareData:d,rects:f,platform:l,elements:{reference:t,floating:e}});m=null!=y?y:m,u=null!=x?x:u,d={...d,[a]:{...d[a],...w}},v&&p<=50&&(p++,"object"==typeof v&&(v.placement&&(g=v.placement),v.rects&&(f=!0===v.rects?await l.getElementRects({reference:t,floating:e,strategy:r}):v.rects),({x:m,y:u}=i$1(f,g,c))),n=-1);}return {x:m,y:u,placement:g,strategy:r,middlewareData:d}};function a$1(t){return "number"!=typeof t?function(t){return {top:0,right:0,bottom:0,left:0,...t}}(t):{top:t,right:t,bottom:t,left:t}}function l$1(t){return {...t,top:t.y,left:t.x,right:t.x+t.width,bottom:t.y+t.height}}async function s$1(t,e){var n;void 0===e&&(e={});const{x:o,y:i,platform:r,rects:s,elements:c,strategy:f}=t,{boundary:m="clippingAncestors",rootBoundary:u="viewport",elementContext:g="floating",altBoundary:d=!1,padding:p=0}=e,h=a$1(p),y=c[d?"floating"===g?"reference":"floating":g],x=l$1(await r.getClippingRect({element:null==(n=await(null==r.isElement?void 0:r.isElement(y)))||n?y:y.contextElement||await(null==r.getDocumentElement?void 0:r.getDocumentElement(c.floating)),boundary:m,rootBoundary:u,strategy:f})),w="floating"===g?{...s.floating,x:o,y:i}:s.reference,v=await(null==r.getOffsetParent?void 0:r.getOffsetParent(c.floating)),b=await(null==r.isElement?void 0:r.isElement(v))&&await(null==r.getScale?void 0:r.getScale(v))||{x:1,y:1},A=l$1(r.convertOffsetParentRelativeRectToViewportRelativeRect?await r.convertOffsetParentRelativeRectToViewportRelativeRect({rect:w,offsetParent:v,strategy:f}):w);return {top:(x.top-A.top+h.top)/b.y,bottom:(A.bottom-x.bottom+h.bottom)/b.y,left:(x.left-A.left+h.left)/b.x,right:(A.right-x.right+h.right)/b.x}}const c$1=Math.min,f$1=Math.max;function m$1(t,e,n){return f$1(t,c$1(e,n))}const g$1=["top","right","bottom","left"];g$1.reduce(((t,e)=>t.concat(e,e+"-start",e+"-end")),[]);const p$1={left:"right",right:"left",bottom:"top",top:"bottom"};function h$1(t){return t.replace(/left|right|bottom|top/g,(t=>p$1[t]))}function y$1(n,i,r){void 0===r&&(r=!1);const a=t(n),l=o$1(n),s=e(l);let c="x"===l?a===(r?"end":"start")?"right":"left":"start"===a?"bottom":"top";return i.reference[s]>i.floating[s]&&(c=h$1(c)),{main:c,cross:h$1(c)}}const x$1={start:"end",end:"start"};function w$1(t){return t.replace(/start|end/g,(t=>x$1[t]))}const b$1=function(e){return void 0===e&&(e={}),{name:"flip",options:e,async fn(o){var i;const{placement:r,middlewareData:a,rects:l,initialPlacement:c,platform:f,elements:m}=o,{mainAxis:u=!0,crossAxis:g=!0,fallbackPlacements:d,fallbackStrategy:p="bestFit",fallbackAxisSideDirection:x="none",flipAlignment:v=!0,...b}=e,A=n$1(r),R=n$1(c)===c,P=await(null==f.isRTL?void 0:f.isRTL(m.floating)),E=d||(R||!v?[h$1(c)]:function(t){const e=h$1(t);return [w$1(t),e,w$1(e)]}(c));d||"none"===x||E.push(...function(e,o,i,r){const a=t(e);let l=function(t,e,n){const o=["left","right"],i=["right","left"],r=["top","bottom"],a=["bottom","top"];switch(t){case"top":case"bottom":return n?e?i:o:e?o:i;case"left":case"right":return e?r:a;default:return []}}(n$1(e),"start"===i,r);return a&&(l=l.map((t=>t+"-"+a)),o&&(l=l.concat(l.map(w$1)))),l}(c,v,x,P));const T=[c,...E],D=await s$1(o,b),L=[];let k=(null==(i=a.flip)?void 0:i.overflows)||[];if(u&&L.push(D[A]),g){const{main:t,cross:e}=y$1(r,l,P);L.push(D[t],D[e]);}if(k=[...k,{placement:r,overflows:L}],!L.every((t=>t<=0))){var O,B;const t=((null==(O=a.flip)?void 0:O.index)||0)+1,e=T[t];if(e)return {data:{index:t,overflows:k},reset:{placement:e}};let n=null==(B=k.filter((t=>t.overflows[0]<=0)).sort(((t,e)=>t.overflows[1]-e.overflows[1]))[0])?void 0:B.placement;if(!n)switch(p){case"bestFit":{var C;const t=null==(C=k.map((t=>[t.placement,t.overflows.filter((t=>t>0)).reduce(((t,e)=>t+e),0)])).sort(((t,e)=>t[1]-e[1]))[0])?void 0:C[0];t&&(n=t);break}case"initialPlacement":n=c;}if(r!==n)return {reset:{placement:n}}}return {}}}};const D$1=function(e){return void 0===e&&(e=0),{name:"offset",options:e,async fn(i){const{x:r,y:a}=i,l=await async function(e,i){const{placement:r,platform:a,elements:l}=e,s=await(null==a.isRTL?void 0:a.isRTL(l.floating)),c=n$1(r),f=t(r),m="x"===o$1(r),u=["left","top"].includes(c)?-1:1,g=s&&m?-1:1,d="function"==typeof i?i(e):i;let{mainAxis:p,crossAxis:h,alignmentAxis:y}="number"==typeof d?{mainAxis:d,crossAxis:0,alignmentAxis:null}:{mainAxis:0,crossAxis:0,alignmentAxis:null,...d};return f&&"number"==typeof y&&(h="end"===f?-1*y:y),m?{x:h*g,y:p*u}:{x:p*u,y:h*g}}(i,e);return {x:r+l.x,y:a+l.y,data:l}}}};function L$1(t){return "x"===t?"y":"x"}const k=function(t){return void 0===t&&(t={}),{name:"shift",options:t,async fn(e){const{x:i,y:r,placement:a}=e,{mainAxis:l=!0,crossAxis:c=!1,limiter:f={fn:t=>{let{x:e,y:n}=t;return {x:e,y:n}}},...u}=t,g={x:i,y:r},d=await s$1(e,u),p=o$1(n$1(a)),h=L$1(p);let y=g[p],x=g[h];if(l){const t="y"===p?"bottom":"right";y=m$1(y+d["y"===p?"top":"left"],y,y-d[t]);}if(c){const t="y"===h?"bottom":"right";x=m$1(x+d["y"===h?"top":"left"],x,x-d[t]);}const w=f.fn({...e,[p]:y,[h]:x});return {...w,data:{x:w.x-i,y:w.y-r}}}}};

function n(t){var e;return (null==(e=t.ownerDocument)?void 0:e.defaultView)||window}function o(t){return n(t).getComputedStyle(t)}function i(t){return t instanceof n(t).Node}function r(t){return i(t)?(t.nodeName||"").toLowerCase():""}let l;function c(){if(l)return l;const t=navigator.userAgentData;return t&&Array.isArray(t.brands)?(l=t.brands.map((t=>t.brand+"/"+t.version)).join(" "),l):navigator.userAgent}function s(t){return t instanceof n(t).HTMLElement}function f(t){return t instanceof n(t).Element}function u(t){if("undefined"==typeof ShadowRoot)return !1;return t instanceof n(t).ShadowRoot||t instanceof ShadowRoot}function a(t){const{overflow:e,overflowX:n,overflowY:i,display:r}=o(t);return /auto|scroll|overlay|hidden|clip/.test(e+i+n)&&!["inline","contents"].includes(r)}function d(t){return ["table","td","th"].includes(r(t))}function h(t){const e=/firefox/i.test(c()),n=o(t),i=n.backdropFilter||n.WebkitBackdropFilter;return "none"!==n.transform||"none"!==n.perspective||!!i&&"none"!==i||e&&"filter"===n.willChange||e&&!!n.filter&&"none"!==n.filter||["transform","perspective"].some((t=>n.willChange.includes(t)))||["paint","layout","strict","content"].some((t=>{const e=n.contain;return null!=e&&e.includes(t)}))}function p(){return /^((?!chrome|android).)*safari/i.test(c())}function g(t){return ["html","body","#document"].includes(r(t))}const m=Math.min,y=Math.max,x=Math.round;function w(t){const e=o(t);let n=parseFloat(e.width),i=parseFloat(e.height);const r=s(t),l=r?t.offsetWidth:n,c=r?t.offsetHeight:i,f=x(n)!==l||x(i)!==c;return f&&(n=l,i=c),{width:n,height:i,fallback:f}}function v(t){return f(t)?t:t.contextElement}const b={x:1,y:1};function L(t){const e=v(t);if(!s(e))return b;const n=e.getBoundingClientRect(),{width:o,height:i,fallback:r}=w(e);let l=(r?x(n.width):n.width)/o,c=(r?x(n.height):n.height)/i;return l&&Number.isFinite(l)||(l=1),c&&Number.isFinite(c)||(c=1),{x:l,y:c}}function E(e,o,i,r){var l,c;void 0===o&&(o=!1),void 0===i&&(i=!1);const s=e.getBoundingClientRect(),u=v(e);let a=b;o&&(r?f(r)&&(a=L(r)):a=L(e));const d=u?n(u):window,h=p()&&i;let g=(s.left+(h&&(null==(l=d.visualViewport)?void 0:l.offsetLeft)||0))/a.x,m=(s.top+(h&&(null==(c=d.visualViewport)?void 0:c.offsetTop)||0))/a.y,y=s.width/a.x,x=s.height/a.y;if(u){const t=n(u),e=r&&f(r)?n(r):r;let o=t.frameElement;for(;o&&r&&e!==t;){const t=L(o),e=o.getBoundingClientRect(),i=getComputedStyle(o);e.x+=(o.clientLeft+parseFloat(i.paddingLeft))*t.x,e.y+=(o.clientTop+parseFloat(i.paddingTop))*t.y,g*=t.x,m*=t.y,y*=t.x,x*=t.y,g+=e.x,m+=e.y,o=n(o).frameElement;}}return l$1({width:y,height:x,x:g,y:m})}function T(t){return ((i(t)?t.ownerDocument:t.document)||window.document).documentElement}function R(t){return f(t)?{scrollLeft:t.scrollLeft,scrollTop:t.scrollTop}:{scrollLeft:t.pageXOffset,scrollTop:t.pageYOffset}}function C(t){return E(T(t)).left+R(t).scrollLeft}function F(t){if("html"===r(t))return t;const e=t.assignedSlot||t.parentNode||u(t)&&t.host||T(t);return u(e)?e.host:e}function W(t){const e=F(t);return g(e)?e.ownerDocument.body:s(e)&&a(e)?e:W(e)}function D(t,e){var o;void 0===e&&(e=[]);const i=W(t),r=i===(null==(o=t.ownerDocument)?void 0:o.body),l=n(i);return r?e.concat(l,l.visualViewport||[],a(i)?i:[]):e.concat(i,D(i))}function S(e,i,r){let l;if("viewport"===i)l=function(t,e){const o=n(t),i=T(t),r=o.visualViewport;let l=i.clientWidth,c=i.clientHeight,s=0,f=0;if(r){l=r.width,c=r.height;const t=p();(!t||t&&"fixed"===e)&&(s=r.offsetLeft,f=r.offsetTop);}return {width:l,height:c,x:s,y:f}}(e,r);else if("document"===i)l=function(t){const e=T(t),n=R(t),i=t.ownerDocument.body,r=y(e.scrollWidth,e.clientWidth,i.scrollWidth,i.clientWidth),l=y(e.scrollHeight,e.clientHeight,i.scrollHeight,i.clientHeight);let c=-n.scrollLeft+C(t);const s=-n.scrollTop;return "rtl"===o(i).direction&&(c+=y(e.clientWidth,i.clientWidth)-r),{width:r,height:l,x:c,y:s}}(T(e));else if(f(i))l=function(t,e){const n=E(t,!0,"fixed"===e),o=n.top+t.clientTop,i=n.left+t.clientLeft,r=s(t)?L(t):{x:1,y:1};return {width:t.clientWidth*r.x,height:t.clientHeight*r.y,x:i*r.x,y:o*r.y}}(i,r);else {const t={...i};if(p()){var c,u;const o=n(e);t.x-=(null==(c=o.visualViewport)?void 0:c.offsetLeft)||0,t.y-=(null==(u=o.visualViewport)?void 0:u.offsetTop)||0;}l=t;}return l$1(l)}function A(t,e){return s(t)&&"fixed"!==o(t).position?e?e(t):t.offsetParent:null}function H(t,e){const i=n(t);if(!s(t))return i;let l=A(t,e);for(;l&&d(l)&&"static"===o(l).position;)l=A(l,e);return l&&("html"===r(l)||"body"===r(l)&&"static"===o(l).position&&!h(l))?i:l||function(t){let e=F(t);for(;s(e)&&!g(e);){if(h(e))return e;e=F(e);}return null}(t)||i}function V(t,e,n){const o=s(e),i=T(e),l=E(t,!0,"fixed"===n,e);let c={scrollLeft:0,scrollTop:0};const f={x:0,y:0};if(o||!o&&"fixed"!==n)if(("body"!==r(e)||a(i))&&(c=R(e)),s(e)){const t=E(e,!0);f.x=t.x+e.clientLeft,f.y=t.y+e.clientTop;}else i&&(f.x=C(i));return {x:l.left+c.scrollLeft-f.x,y:l.top+c.scrollTop-f.y,width:l.width,height:l.height}}const O={getClippingRect:function(t){let{element:e,boundary:n,rootBoundary:i,strategy:l}=t;const c="clippingAncestors"===n?function(t,e){const n=e.get(t);if(n)return n;let i=D(t).filter((t=>f(t)&&"body"!==r(t))),l=null;const c="fixed"===o(t).position;let s=c?F(t):t;for(;f(s)&&!g(s);){const t=o(s),e=h(s);"fixed"===t.position&&(l=null),(c?e||l:e||"static"!==t.position||!l||!["absolute","fixed"].includes(l.position))?l=t:i=i.filter((t=>t!==s)),s=F(s);}return e.set(t,i),i}(e,this._c):[].concat(n),s=[...c,i],u=s[0],a=s.reduce(((t,n)=>{const o=S(e,n,l);return t.top=y(o.top,t.top),t.right=m(o.right,t.right),t.bottom=m(o.bottom,t.bottom),t.left=y(o.left,t.left),t}),S(e,u,l));return {width:a.right-a.left,height:a.bottom-a.top,x:a.left,y:a.top}},convertOffsetParentRelativeRectToViewportRelativeRect:function(t){let{rect:e,offsetParent:n,strategy:o}=t;const i=s(n),l=T(n);if(n===l)return e;let c={scrollLeft:0,scrollTop:0},f={x:1,y:1};const u={x:0,y:0};if((i||!i&&"fixed"!==o)&&(("body"!==r(n)||a(l))&&(c=R(n)),s(n))){const t=E(n);f=L(n),u.x=t.x+n.clientLeft,u.y=t.y+n.clientTop;}return {width:e.width*f.x,height:e.height*f.y,x:e.x*f.x-c.scrollLeft*f.x+u.x,y:e.y*f.y-c.scrollTop*f.y+u.y}},isElement:f,getDimensions:function(t){return w(t)},getOffsetParent:H,getDocumentElement:T,getScale:L,async getElementRects(t){let{reference:e,floating:n,strategy:o}=t;const i=this.getOffsetParent||H,r=this.getDimensions;return {reference:V(e,await i(n),o),floating:{x:0,y:0,...await r(n)}}},getClientRects:t=>Array.from(t.getClientRects()),isRTL:t=>"rtl"===o(t).direction};function P(t,e,n,o){void 0===o&&(o={});const{ancestorScroll:i=!0,ancestorResize:r=!0,elementResize:l=!0,animationFrame:c=!1}=o,s=i&&!c,u=s||r?[...f(t)?D(t):t.contextElement?D(t.contextElement):[],...D(e)]:[];u.forEach((t=>{s&&t.addEventListener("scroll",n,{passive:!0}),r&&t.addEventListener("resize",n);}));let a,d=null;l&&(d=new ResizeObserver((()=>{n();})),f(t)&&!c&&d.observe(t),f(t)||!t.contextElement||c||d.observe(t.contextElement),d.observe(e));let h=c?E(t):null;return c&&function e(){const o=E(t);!h||o.x===h.x&&o.y===h.y&&o.width===h.width&&o.height===h.height||n();h=o,a=requestAnimationFrame(e);}(),n(),()=>{var t;u.forEach((t=>{s&&t.removeEventListener("scroll",n),r&&t.removeEventListener("resize",n);})),null==(t=d)||t.disconnect(),d=null,c&&cancelAnimationFrame(a);}}const z=(t,n,o)=>{const i=new Map,r={platform:O,...o},l={...r.platform,_c:i};return r$1(t,n,{...r,platform:l})};

//@ts-ignore
function createFloatingActions(initOptions) {
    let referenceElement;
    let floatingElement;
    const defaultOptions = {
        autoUpdate: true
    };
    let options = initOptions;
    const getOptions = (mixin) => {
        return { ...defaultOptions, ...(initOptions || {}), ...(mixin || {}) };
    };
    const updatePosition = (updateOptions) => {
        if (referenceElement && floatingElement) {
            options = getOptions(updateOptions);
            z(referenceElement, floatingElement, options)
                .then(v => {
                Object.assign(floatingElement.style, {
                    position: v.strategy,
                    left: `${v.x}px`,
                    top: `${v.y}px`,
                });
                options?.onComputed && options.onComputed(v);
            });
        }
    };
    const referenceAction = node => {
        if ('subscribe' in node) {
            setupVirtualElementObserver(node);
            return {};
        }
        else {
            referenceElement = node;
            updatePosition();
        }
    };
    const contentAction = (node, contentOptions) => {
        let autoUpdateDestroy;
        floatingElement = node;
        options = getOptions(contentOptions);
        setTimeout(() => updatePosition(contentOptions), 0); //tick doesn't work
        updatePosition(contentOptions);
        const destroyAutoUpdate = () => {
            if (autoUpdateDestroy) {
                autoUpdateDestroy();
                autoUpdateDestroy = undefined;
            }
        };
        const initAutoUpdate = ({ autoUpdate } = options || {}) => {
            destroyAutoUpdate();
            if (autoUpdate !== false) {
                return P(referenceElement, floatingElement, () => updatePosition(options), (autoUpdate === true ? {} : autoUpdate));
            }
            return;
        };
        autoUpdateDestroy = initAutoUpdate();
        return {
            update(contentOptions) {
                updatePosition(contentOptions);
                autoUpdateDestroy = initAutoUpdate(contentOptions);
            },
            destroy() {
                destroyAutoUpdate();
            }
        };
    };
    const setupVirtualElementObserver = (node) => {
        const unsubscribe = node.subscribe(($node) => {
            if (referenceElement === undefined) {
                referenceElement = $node;
                updatePosition();
            }
            else {
                // Preserve the reference to the virtual element.
                Object.assign(referenceElement, $node);
                updatePosition();
            }
        });
        onDestroy(unsubscribe);
    };
    return [
        referenceAction,
        contentAction,
        updatePosition
    ];
}

function filter({
    loadOptions,
    filterText,
    items,
    multiple,
    value,
    itemId,
    groupBy,
    filterSelectedItems,
    itemFilter,
    convertStringItemsToObjects,
    filterGroupedItems,
    label,
}) {
    if (items && loadOptions) return items;
    if (!items) return [];

    if (items && items.length > 0 && typeof items[0] !== 'object') {
        items = convertStringItemsToObjects(items);
    }

    let filterResults = items.filter((item) => {
        let matchesFilter = itemFilter(item[label], filterText, item);
        if (matchesFilter && multiple && value?.length) {
            matchesFilter = !value.some((x) => {
                return filterSelectedItems ? x[itemId] === item[itemId] : false;
            });
        }

        return matchesFilter;
    });

    if (groupBy) {
        filterResults = filterGroupedItems(filterResults);
    }

    return filterResults;
}

async function getItems({ dispatch, loadOptions, convertStringItemsToObjects, filterText }) {
    let res = await loadOptions(filterText).catch((err) => {
        console.warn('svelte-select loadOptions error :>> ', err);
        dispatch('error', { type: 'loadOptions', details: err });
    });

    if (res && !res.cancelled) {        
        if (res) {
            if (res && res.length > 0 && typeof res[0] !== 'object') {
                res = convertStringItemsToObjects(res);
            }
            
            dispatch('loaded', { items: res });
        } else {
            res = [];
        }

        return {
            filteredItems: res,
            loading: false,
            focused: true,
            listOpen: true,
        };
    }
}

/* node_modules/svelte-select/ChevronIcon.svelte generated by Svelte v3.58.0 */

function add_css$5(target) {
	append_styles(target, "svelte-qbd276", "svg.svelte-qbd276{width:var(--chevron-icon-width, 20px);height:var(--chevron-icon-width, 20px);color:var(--chevron-icon-colour, currentColor)}");
}

function create_fragment$j(ctx) {
	let svg;
	let path;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr(path, "fill", "currentColor");
			attr(path, "d", "M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747\n          3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0\n          1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502\n          0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0\n          0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z");
			attr(svg, "width", "100%");
			attr(svg, "height", "100%");
			attr(svg, "viewBox", "0 0 20 20");
			attr(svg, "focusable", "false");
			attr(svg, "aria-hidden", "true");
			attr(svg, "class", "svelte-qbd276");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

class ChevronIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$j, safe_not_equal, {}, add_css$5);
	}
}

/* node_modules/svelte-select/ClearIcon.svelte generated by Svelte v3.58.0 */

function add_css$4(target) {
	append_styles(target, "svelte-whdbu1", "svg.svelte-whdbu1{width:var(--clear-icon-width, 20px);height:var(--clear-icon-width, 20px);color:var(--clear-icon-color, currentColor)}");
}

function create_fragment$i(ctx) {
	let svg;
	let path;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr(path, "fill", "currentColor");
			attr(path, "d", "M34.923,37.251L24,26.328L13.077,37.251L9.436,33.61l10.923-10.923L9.436,11.765l3.641-3.641L24,19.047L34.923,8.124\n    l3.641,3.641L27.641,22.688L38.564,33.61L34.923,37.251z");
			attr(svg, "width", "100%");
			attr(svg, "height", "100%");
			attr(svg, "viewBox", "-2 -2 50 50");
			attr(svg, "focusable", "false");
			attr(svg, "aria-hidden", "true");
			attr(svg, "role", "presentation");
			attr(svg, "class", "svelte-whdbu1");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

class ClearIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$i, safe_not_equal, {}, add_css$4);
	}
}

/* node_modules/svelte-select/LoadingIcon.svelte generated by Svelte v3.58.0 */

function add_css$3(target) {
	append_styles(target, "svelte-1p3nqvd", ".loading.svelte-1p3nqvd{width:var(--spinner-width, 20px);height:var(--spinner-height, 20px);color:var(--spinner-color, var(--icons-color));animation:svelte-1p3nqvd-rotate 0.75s linear infinite;transform-origin:center center;transform:none}.circle_path.svelte-1p3nqvd{stroke-dasharray:90;stroke-linecap:round}@keyframes svelte-1p3nqvd-rotate{100%{transform:rotate(360deg)}}");
}

function create_fragment$h(ctx) {
	let svg;
	let circle;

	return {
		c() {
			svg = svg_element("svg");
			circle = svg_element("circle");
			attr(circle, "class", "circle_path svelte-1p3nqvd");
			attr(circle, "cx", "50");
			attr(circle, "cy", "50");
			attr(circle, "r", "20");
			attr(circle, "fill", "none");
			attr(circle, "stroke", "currentColor");
			attr(circle, "stroke-width", "5");
			attr(circle, "stroke-miterlimit", "10");
			attr(svg, "class", "loading svelte-1p3nqvd");
			attr(svg, "viewBox", "25 25 50 50");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, circle);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

class LoadingIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$h, safe_not_equal, {}, add_css$3);
	}
}

/* node_modules/svelte-select/Select.svelte generated by Svelte v3.58.0 */

function add_css$2(target) {
	append_styles(target, "svelte-apvs86", ".svelte-select.svelte-apvs86.svelte-apvs86.svelte-apvs86{--borderRadius:var(--border-radius);--clearSelectColor:var(--clear-select-color);--clearSelectWidth:var(--clear-select-width);--disabledBackground:var(--disabled-background);--disabledBorderColor:var(--disabled-border-color);--disabledColor:var(--disabled-color);--disabledPlaceholderColor:var(--disabled-placeholder-color);--disabledPlaceholderOpacity:var(--disabled-placeholder-opacity);--errorBackground:var(--error-background);--errorBorder:var(--error-border);--groupItemPaddingLeft:var(--group-item-padding-left);--groupTitleColor:var(--group-title-color);--groupTitleFontSize:var(--group-title-font-size);--groupTitleFontWeight:var(--group-title-font-weight);--groupTitlePadding:var(--group-title-padding);--groupTitleTextTransform:var(--group-title-text-transform);--indicatorColor:var(--chevron-color);--indicatorHeight:var(--chevron-height);--indicatorWidth:var(--chevron-width);--inputColor:var(--input-color);--inputLeft:var(--input-left);--inputLetterSpacing:var(--input-letter-spacing);--inputMargin:var(--input-margin);--inputPadding:var(--input-padding);--itemActiveBackground:var(--item-active-background);--itemColor:var(--item-color);--itemFirstBorderRadius:var(--item-first-border-radius);--itemHoverBG:var(--item-hover-bg);--itemHoverColor:var(--item-hover-color);--itemIsActiveBG:var(--item-is-active-bg);--itemIsActiveColor:var(--item-is-active-color);--itemIsNotSelectableColor:var(--item-is-not-selectable-color);--itemPadding:var(--item-padding);--listBackground:var(--list-background);--listBorder:var(--list-border);--listBorderRadius:var(--list-border-radius);--listEmptyColor:var(--list-empty-color);--listEmptyPadding:var(--list-empty-padding);--listEmptyTextAlign:var(--list-empty-text-align);--listMaxHeight:var(--list-max-height);--listPosition:var(--list-position);--listShadow:var(--list-shadow);--listZIndex:var(--list-z-index);--multiItemBG:var(--multi-item-bg);--multiItemBorderRadius:var(--multi-item-border-radius);--multiItemDisabledHoverBg:var(--multi-item-disabled-hover-bg);--multiItemDisabledHoverColor:var(--multi-item-disabled-hover-color);--multiItemHeight:var(--multi-item-height);--multiItemMargin:var(--multi-item-margin);--multiItemPadding:var(--multi-item-padding);--multiSelectInputMargin:var(--multi-select-input-margin);--multiSelectInputPadding:var(--multi-select-input-padding);--multiSelectPadding:var(--multi-select-padding);--placeholderColor:var(--placeholder-color);--placeholderOpacity:var(--placeholder-opacity);--selectedItemPadding:var(--selected-item-padding);--spinnerColor:var(--spinner-color);--spinnerHeight:var(--spinner-height);--spinnerWidth:var(--spinner-width);--internal-padding:0 0 0 16px;border:var(--border, 1px solid #d8dbdf);border-radius:var(--border-radius, 6px);min-height:var(--height, 42px);position:relative;display:flex;align-items:stretch;padding:var(--padding, var(--internal-padding));background:var(--background, #fff);margin:var(--margin, 0);width:var(--width, 100%);font-size:var(--font-size, 16px);max-height:var(--max-height)}.svelte-apvs86.svelte-apvs86.svelte-apvs86{box-sizing:var(--box-sizing, border-box)}.svelte-select.svelte-apvs86.svelte-apvs86.svelte-apvs86:hover{border:var(--border-hover, 1px solid #b2b8bf)}.value-container.svelte-apvs86.svelte-apvs86.svelte-apvs86{display:flex;flex:1 1 0%;flex-wrap:wrap;align-items:center;gap:5px 10px;padding:var(--value-container-padding, 5px 0);position:relative;overflow:var(--value-container-overflow, hidden);align-self:stretch}.prepend.svelte-apvs86.svelte-apvs86.svelte-apvs86,.indicators.svelte-apvs86.svelte-apvs86.svelte-apvs86{display:flex;flex-shrink:0;align-items:center}.indicators.svelte-apvs86.svelte-apvs86.svelte-apvs86{position:var(--indicators-position);top:var(--indicators-top);right:var(--indicators-right);bottom:var(--indicators-bottom)}input.svelte-apvs86.svelte-apvs86.svelte-apvs86{position:absolute;cursor:default;border:none;color:var(--input-color, var(--item-color));padding:var(--input-padding, 0);letter-spacing:var(--input-letter-spacing, inherit);margin:var(--input-margin, 0);min-width:10px;top:0;right:0;bottom:0;left:0;background:transparent;font-size:var(--font-size, 16px)}.svelte-apvs86:not(.multi)>.value-container.svelte-apvs86>input.svelte-apvs86{width:100%;height:100%}input.svelte-apvs86.svelte-apvs86.svelte-apvs86::placeholder{color:var(--placeholder-color, #78848f);opacity:var(--placeholder-opacity, 1)}input.svelte-apvs86.svelte-apvs86.svelte-apvs86:focus{outline:none}.svelte-select.focused.svelte-apvs86.svelte-apvs86.svelte-apvs86{border:var(--border-focused, 1px solid #006fe8);border-radius:var(--border-radius-focused, var(--border-radius, 6px))}.disabled.svelte-apvs86.svelte-apvs86.svelte-apvs86{background:var(--disabled-background, #ebedef);border-color:var(--disabled-border-color, #ebedef);color:var(--disabled-color, #c1c6cc)}.disabled.svelte-apvs86 input.svelte-apvs86.svelte-apvs86::placeholder{color:var(--disabled-placeholder-color, #c1c6cc);opacity:var(--disabled-placeholder-opacity, 1)}.selected-item.svelte-apvs86.svelte-apvs86.svelte-apvs86{position:relative;overflow:var(--selected-item-overflow, hidden);padding:var(--selected-item-padding, 0 20px 0 0);text-overflow:ellipsis;white-space:nowrap;color:var(--selected-item-color, inherit);font-size:var(--font-size, 16px)}.multi.svelte-apvs86 .selected-item.svelte-apvs86.svelte-apvs86{position:absolute;line-height:var(--height, 42px);height:var(--height, 42px)}.selected-item.svelte-apvs86.svelte-apvs86.svelte-apvs86:focus{outline:none}.hide-selected-item.svelte-apvs86.svelte-apvs86.svelte-apvs86{opacity:0}.icon.svelte-apvs86.svelte-apvs86.svelte-apvs86{display:flex;align-items:center;justify-content:center}.clear-select.svelte-apvs86.svelte-apvs86.svelte-apvs86{all:unset;display:flex;align-items:center;justify-content:center;width:var(--clear-select-width, 40px);height:var(--clear-select-height, 100%);color:var(--clear-select-color, var(--icons-color));margin:var(--clear-select-margin, 0);pointer-events:all;flex-shrink:0}.clear-select.svelte-apvs86.svelte-apvs86.svelte-apvs86:focus{outline:var(--clear-select-focus-outline, 1px solid #006fe8)}.loading.svelte-apvs86.svelte-apvs86.svelte-apvs86{width:var(--loading-width, 40px);height:var(--loading-height);color:var(--loading-color, var(--icons-color));margin:var(--loading--margin, 0);flex-shrink:0}.chevron.svelte-apvs86.svelte-apvs86.svelte-apvs86{width:var(--chevron-width, 40px);height:var(--chevron-height, 40px);background:var(--chevron-background, transparent);pointer-events:var(--chevron-pointer-events, none);color:var(--chevron-color, var(--icons-color));border:var(--chevron-border, 0 0 0 1px solid #d8dbdf);flex-shrink:0}.multi.svelte-apvs86.svelte-apvs86.svelte-apvs86{padding:var(--multi-select-padding, var(--internal-padding))}.multi.svelte-apvs86 input.svelte-apvs86.svelte-apvs86{padding:var(--multi-select-input-padding, 0);position:relative;margin:var(--multi-select-input-margin, 5px 0);flex:1 1 40px}.svelte-select.error.svelte-apvs86.svelte-apvs86.svelte-apvs86{border:var(--error-border, 1px solid #ff2d55);background:var(--error-background, #fff)}.a11y-text.svelte-apvs86.svelte-apvs86.svelte-apvs86{z-index:9999;border:0px;clip:rect(1px, 1px, 1px, 1px);height:1px;width:1px;position:absolute;overflow:hidden;padding:0px;white-space:nowrap}.multi-item.svelte-apvs86.svelte-apvs86.svelte-apvs86{background:var(--multi-item-bg, #ebedef);margin:var(--multi-item-margin, 0);outline:var(--multi-item-outline, 1px solid #ddd);border-radius:var(--multi-item-border-radius, 4px);height:var(--multi-item-height, 25px);line-height:var(--multi-item-height, 25px);display:flex;cursor:default;padding:var(--multi-item-padding, 0 5px);overflow:hidden;gap:var(--multi-item-gap, 4px);outline-offset:-1px;max-width:var(--multi-max-width, none);color:var(--multi-item-color, var(--item-color))}.multi-item.disabled.svelte-apvs86.svelte-apvs86.svelte-apvs86:hover{background:var(--multi-item-disabled-hover-bg, #ebedef);color:var(--multi-item-disabled-hover-color, #c1c6cc)}.multi-item-text.svelte-apvs86.svelte-apvs86.svelte-apvs86{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.multi-item-clear.svelte-apvs86.svelte-apvs86.svelte-apvs86{display:flex;align-items:center;justify-content:center;--clear-icon-color:var(--multi-item-clear-icon-color, #000)}.multi-item.active.svelte-apvs86.svelte-apvs86.svelte-apvs86{outline:var(--multi-item-active-outline, 1px solid #006fe8)}.svelte-select-list.svelte-apvs86.svelte-apvs86.svelte-apvs86{box-shadow:var(--list-shadow, 0 2px 3px 0 rgba(44, 62, 80, 0.24));border-radius:var(--list-border-radius, 4px);max-height:var(--list-max-height, 252px);overflow-y:auto;background:var(--list-background, #fff);position:var(--list-position, absolute);z-index:var(--list-z-index, 2);border:var(--list-border)}.prefloat.svelte-apvs86.svelte-apvs86.svelte-apvs86{opacity:0;pointer-events:none}.list-group-title.svelte-apvs86.svelte-apvs86.svelte-apvs86{color:var(--group-title-color, #8f8f8f);cursor:default;font-size:var(--group-title-font-size, 16px);font-weight:var(--group-title-font-weight, 600);height:var(--height, 42px);line-height:var(--height, 42px);padding:var(--group-title-padding, 0 20px);text-overflow:ellipsis;overflow-x:hidden;white-space:nowrap;text-transform:var(--group-title-text-transform, uppercase)}.empty.svelte-apvs86.svelte-apvs86.svelte-apvs86{text-align:var(--list-empty-text-align, center);padding:var(--list-empty-padding, 20px 0);color:var(--list-empty-color, #78848f)}.item.svelte-apvs86.svelte-apvs86.svelte-apvs86{cursor:default;height:var(--item-height, var(--height, 42px));line-height:var(--item-line-height, var(--height, 42px));padding:var(--item-padding, 0 20px);color:var(--item-color, inherit);text-overflow:ellipsis;overflow:hidden;white-space:nowrap;transition:var(--item-transition, all 0.2s);align-items:center;width:100%}.item.group-item.svelte-apvs86.svelte-apvs86.svelte-apvs86{padding-left:var(--group-item-padding-left, 40px)}.item.svelte-apvs86.svelte-apvs86.svelte-apvs86:active{background:var(--item-active-background, #b9daff)}.item.active.svelte-apvs86.svelte-apvs86.svelte-apvs86{background:var(--item-is-active-bg, #007aff);color:var(--item-is-active-color, #fff)}.item.first.svelte-apvs86.svelte-apvs86.svelte-apvs86{border-radius:var(--item-first-border-radius, 4px 4px 0 0)}.item.hover.svelte-apvs86.svelte-apvs86.svelte-apvs86:not(.active){background:var(--item-hover-bg, #e7f2ff);color:var(--item-hover-color, inherit)}.item.not-selectable.svelte-apvs86.svelte-apvs86.svelte-apvs86,.item.hover.item.not-selectable.svelte-apvs86.svelte-apvs86.svelte-apvs86,.item.active.item.not-selectable.svelte-apvs86.svelte-apvs86.svelte-apvs86,.item.not-selectable.svelte-apvs86.svelte-apvs86.svelte-apvs86:active{color:var(--item-is-not-selectable-color, #999);background:transparent}.required.svelte-apvs86.svelte-apvs86.svelte-apvs86{opacity:0;z-index:-1;position:absolute;top:0;left:0;bottom:0;right:0}");
}

const get_required_slot_changes = dirty => ({ value: dirty[0] & /*value*/ 8 });
const get_required_slot_context = ctx => ({ value: /*value*/ ctx[3] });
const get_chevron_icon_slot_changes = dirty => ({ listOpen: dirty[0] & /*listOpen*/ 64 });
const get_chevron_icon_slot_context = ctx => ({ listOpen: /*listOpen*/ ctx[6] });
const get_clear_icon_slot_changes = dirty => ({});
const get_clear_icon_slot_context = ctx => ({});
const get_loading_icon_slot_changes = dirty => ({});
const get_loading_icon_slot_context = ctx => ({});
const get_selection_slot_changes_1 = dirty => ({ selection: dirty[0] & /*value*/ 8 });
const get_selection_slot_context_1 = ctx => ({ selection: /*value*/ ctx[3] });

function get_each_context$4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[125] = list[i];
	child_ctx[127] = i;
	return child_ctx;
}

const get_multi_clear_icon_slot_changes = dirty => ({});
const get_multi_clear_icon_slot_context = ctx => ({});
const get_selection_slot_changes = dirty => ({ selection: dirty[0] & /*value*/ 8 });

const get_selection_slot_context = ctx => ({
	selection: /*item*/ ctx[125],
	index: /*i*/ ctx[127]
});

const get_prepend_slot_changes = dirty => ({});
const get_prepend_slot_context = ctx => ({});
const get_list_append_slot_changes = dirty => ({});
const get_list_append_slot_context = ctx => ({});
const get_empty_slot_changes = dirty => ({});
const get_empty_slot_context = ctx => ({});

function get_each_context_1$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[125] = list[i];
	child_ctx[127] = i;
	return child_ctx;
}

const get_item_slot_changes = dirty => ({
	item: dirty[0] & /*filteredItems*/ 16777216
});

const get_item_slot_context = ctx => ({
	item: /*item*/ ctx[125],
	index: /*i*/ ctx[127]
});

const get_list_slot_changes = dirty => ({
	filteredItems: dirty[0] & /*filteredItems*/ 16777216
});

const get_list_slot_context = ctx => ({ filteredItems: /*filteredItems*/ ctx[24] });
const get_list_prepend_slot_changes = dirty => ({});
const get_list_prepend_slot_context = ctx => ({});

// (682:4) {#if listOpen}
function create_if_block_8(ctx) {
	let div;
	let t0;
	let current_block_type_index;
	let if_block1;
	let t1;
	let current;
	let mounted;
	let dispose;
	let if_block0 = /*$$slots*/ ctx[50]['list-prepend'] && create_if_block_13(ctx);
	const if_block_creators = [create_if_block_10, create_if_block_11, create_if_block_12];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*$$slots*/ ctx[50].list) return 0;
		if (/*filteredItems*/ ctx[24].length > 0) return 1;
		if (!/*hideEmptyState*/ ctx[19]) return 2;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	let if_block2 = /*$$slots*/ ctx[50]['list-append'] && create_if_block_9(ctx);

	return {
		c() {
			div = element("div");
			if (if_block0) if_block0.c();
			t0 = space();
			if (if_block1) if_block1.c();
			t1 = space();
			if (if_block2) if_block2.c();
			attr(div, "class", "svelte-select-list svelte-apvs86");
			toggle_class(div, "prefloat", /*prefloat*/ ctx[28]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append(div, t0);

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(div, null);
			}

			append(div, t1);
			if (if_block2) if_block2.m(div, null);
			/*div_binding*/ ctx[90](div);
			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(/*floatingContent*/ ctx[49].call(null, div)),
					listen(div, "scroll", /*handleListScroll*/ ctx[41]),
					listen(div, "pointerup", stop_propagation(prevent_default(/*pointerup_handler*/ ctx[85])))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (/*$$slots*/ ctx[50]['list-prepend']) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty[1] & /*$$slots*/ 524288) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_13(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(div, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if (~current_block_type_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				}
			} else {
				if (if_block1) {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
				}

				if (~current_block_type_index) {
					if_block1 = if_blocks[current_block_type_index];

					if (!if_block1) {
						if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block1.c();
					} else {
						if_block1.p(ctx, dirty);
					}

					transition_in(if_block1, 1);
					if_block1.m(div, t1);
				} else {
					if_block1 = null;
				}
			}

			if (/*$$slots*/ ctx[50]['list-append']) {
				if (if_block2) {
					if_block2.p(ctx, dirty);

					if (dirty[1] & /*$$slots*/ 524288) {
						transition_in(if_block2, 1);
					}
				} else {
					if_block2 = create_if_block_9(ctx);
					if_block2.c();
					transition_in(if_block2, 1);
					if_block2.m(div, null);
				}
			} else if (if_block2) {
				group_outros();

				transition_out(if_block2, 1, 1, () => {
					if_block2 = null;
				});

				check_outros();
			}

			if (!current || dirty[0] & /*prefloat*/ 268435456) {
				toggle_class(div, "prefloat", /*prefloat*/ ctx[28]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(if_block1);
			transition_in(if_block2);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(if_block1);
			transition_out(if_block2);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block0) if_block0.d();

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d();
			}

			if (if_block2) if_block2.d();
			/*div_binding*/ ctx[90](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (690:12) {#if $$slots['list-prepend']}
function create_if_block_13(ctx) {
	let current;
	const list_prepend_slot_template = /*#slots*/ ctx[82]["list-prepend"];
	const list_prepend_slot = create_slot(list_prepend_slot_template, ctx, /*$$scope*/ ctx[81], get_list_prepend_slot_context);

	return {
		c() {
			if (list_prepend_slot) list_prepend_slot.c();
		},
		m(target, anchor) {
			if (list_prepend_slot) {
				list_prepend_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (list_prepend_slot) {
				if (list_prepend_slot.p && (!current || dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						list_prepend_slot,
						list_prepend_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(list_prepend_slot_template, /*$$scope*/ ctx[81], dirty, get_list_prepend_slot_changes),
						get_list_prepend_slot_context
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(list_prepend_slot, local);
			current = true;
		},
		o(local) {
			transition_out(list_prepend_slot, local);
			current = false;
		},
		d(detaching) {
			if (list_prepend_slot) list_prepend_slot.d(detaching);
		}
	};
}

// (717:38) 
function create_if_block_12(ctx) {
	let current;
	const empty_slot_template = /*#slots*/ ctx[82].empty;
	const empty_slot = create_slot(empty_slot_template, ctx, /*$$scope*/ ctx[81], get_empty_slot_context);
	const empty_slot_or_fallback = empty_slot || fallback_block_8();

	return {
		c() {
			if (empty_slot_or_fallback) empty_slot_or_fallback.c();
		},
		m(target, anchor) {
			if (empty_slot_or_fallback) {
				empty_slot_or_fallback.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (empty_slot) {
				if (empty_slot.p && (!current || dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						empty_slot,
						empty_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(empty_slot_template, /*$$scope*/ ctx[81], dirty, get_empty_slot_changes),
						get_empty_slot_context
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(empty_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(empty_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (empty_slot_or_fallback) empty_slot_or_fallback.d(detaching);
		}
	};
}

// (692:47) 
function create_if_block_11(ctx) {
	let each_1_anchor;
	let current;
	let each_value_1 = /*filteredItems*/ ctx[24];
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty[0] & /*filteredItems, value, itemId, listDom, scrollToHoverItem, hoverItemIndex, label*/ 1627402376 | dirty[1] & /*handleHover, handleItemClick, isItemActive*/ 28672 | dirty[2] & /*$$scope*/ 524288) {
				each_value_1 = /*filteredItems*/ ctx[24];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block_1$1(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				group_outros();

				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value_1.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (691:12) {#if $$slots.list}
function create_if_block_10(ctx) {
	let current;
	const list_slot_template = /*#slots*/ ctx[82].list;
	const list_slot = create_slot(list_slot_template, ctx, /*$$scope*/ ctx[81], get_list_slot_context);

	return {
		c() {
			if (list_slot) list_slot.c();
		},
		m(target, anchor) {
			if (list_slot) {
				list_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (list_slot) {
				if (list_slot.p && (!current || dirty[0] & /*filteredItems*/ 16777216 | dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						list_slot,
						list_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(list_slot_template, /*$$scope*/ ctx[81], dirty, get_list_slot_changes),
						get_list_slot_context
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(list_slot, local);
			current = true;
		},
		o(local) {
			transition_out(list_slot, local);
			current = false;
		},
		d(detaching) {
			if (list_slot) list_slot.d(detaching);
		}
	};
}

// (718:35)                      
function fallback_block_8(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = "No options";
			attr(div, "class", "empty svelte-apvs86");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (711:63)                                  
function fallback_block_7(ctx) {
	let t_value = /*item*/ ctx[125]?.[/*label*/ ctx[12]] + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*filteredItems, label*/ 16781312 && t_value !== (t_value = /*item*/ ctx[125]?.[/*label*/ ctx[12]] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (693:16) {#each filteredItems as item, i}
function create_each_block_1$1(ctx) {
	let div1;
	let div0;
	let activeScroll_action;
	let hoverScroll_action;
	let t;
	let current;
	let mounted;
	let dispose;
	const item_slot_template = /*#slots*/ ctx[82].item;
	const item_slot = create_slot(item_slot_template, ctx, /*$$scope*/ ctx[81], get_item_slot_context);
	const item_slot_or_fallback = item_slot || fallback_block_7(ctx);

	function mouseover_handler() {
		return /*mouseover_handler*/ ctx[87](/*i*/ ctx[127]);
	}

	function focus_handler() {
		return /*focus_handler*/ ctx[88](/*i*/ ctx[127]);
	}

	function click_handler() {
		return /*click_handler*/ ctx[89](/*item*/ ctx[125], /*i*/ ctx[127]);
	}

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			if (item_slot_or_fallback) item_slot_or_fallback.c();
			t = space();
			attr(div0, "class", "item svelte-apvs86");
			toggle_class(div0, "list-group-title", /*item*/ ctx[125].groupHeader);
			toggle_class(div0, "active", /*isItemActive*/ ctx[45](/*item*/ ctx[125], /*value*/ ctx[3], /*itemId*/ ctx[13]));
			toggle_class(div0, "first", isItemFirst(/*i*/ ctx[127]));
			toggle_class(div0, "hover", /*hoverItemIndex*/ ctx[7] === /*i*/ ctx[127]);
			toggle_class(div0, "group-item", /*item*/ ctx[125].groupItem);
			toggle_class(div0, "not-selectable", /*item*/ ctx[125]?.selectable === false);
			attr(div1, "class", "list-item svelte-apvs86");
			attr(div1, "tabindex", "-1");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);

			if (item_slot_or_fallback) {
				item_slot_or_fallback.m(div0, null);
			}

			append(div1, t);
			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(activeScroll_action = /*activeScroll*/ ctx[46].call(null, div0, {
						scroll: /*isItemActive*/ ctx[45](/*item*/ ctx[125], /*value*/ ctx[3], /*itemId*/ ctx[13]),
						listDom: /*listDom*/ ctx[30]
					})),
					action_destroyer(hoverScroll_action = /*hoverScroll*/ ctx[47].call(null, div0, {
						scroll: /*scrollToHoverItem*/ ctx[29] === /*i*/ ctx[127],
						listDom: /*listDom*/ ctx[30]
					})),
					listen(div1, "mouseover", mouseover_handler),
					listen(div1, "focus", focus_handler),
					listen(div1, "click", stop_propagation(click_handler)),
					listen(div1, "keydown", stop_propagation(prevent_default(/*keydown_handler*/ ctx[86])))
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (item_slot) {
				if (item_slot.p && (!current || dirty[0] & /*filteredItems*/ 16777216 | dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						item_slot,
						item_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(item_slot_template, /*$$scope*/ ctx[81], dirty, get_item_slot_changes),
						get_item_slot_context
					);
				}
			} else {
				if (item_slot_or_fallback && item_slot_or_fallback.p && (!current || dirty[0] & /*filteredItems, label*/ 16781312)) {
					item_slot_or_fallback.p(ctx, !current ? [-1, -1, -1, -1, -1] : dirty);
				}
			}

			if (activeScroll_action && is_function(activeScroll_action.update) && dirty[0] & /*filteredItems, value, itemId, listDom*/ 1090527240) activeScroll_action.update.call(null, {
				scroll: /*isItemActive*/ ctx[45](/*item*/ ctx[125], /*value*/ ctx[3], /*itemId*/ ctx[13]),
				listDom: /*listDom*/ ctx[30]
			});

			if (hoverScroll_action && is_function(hoverScroll_action.update) && dirty[0] & /*scrollToHoverItem, listDom*/ 1610612736) hoverScroll_action.update.call(null, {
				scroll: /*scrollToHoverItem*/ ctx[29] === /*i*/ ctx[127],
				listDom: /*listDom*/ ctx[30]
			});

			if (!current || dirty[0] & /*filteredItems*/ 16777216) {
				toggle_class(div0, "list-group-title", /*item*/ ctx[125].groupHeader);
			}

			if (!current || dirty[0] & /*filteredItems, value, itemId*/ 16785416 | dirty[1] & /*isItemActive*/ 16384) {
				toggle_class(div0, "active", /*isItemActive*/ ctx[45](/*item*/ ctx[125], /*value*/ ctx[3], /*itemId*/ ctx[13]));
			}

			if (!current || dirty[0] & /*hoverItemIndex*/ 128) {
				toggle_class(div0, "hover", /*hoverItemIndex*/ ctx[7] === /*i*/ ctx[127]);
			}

			if (!current || dirty[0] & /*filteredItems*/ 16777216) {
				toggle_class(div0, "group-item", /*item*/ ctx[125].groupItem);
			}

			if (!current || dirty[0] & /*filteredItems*/ 16777216) {
				toggle_class(div0, "not-selectable", /*item*/ ctx[125]?.selectable === false);
			}
		},
		i(local) {
			if (current) return;
			transition_in(item_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(item_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			if (item_slot_or_fallback) item_slot_or_fallback.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (722:12) {#if $$slots['list-append']}
function create_if_block_9(ctx) {
	let current;
	const list_append_slot_template = /*#slots*/ ctx[82]["list-append"];
	const list_append_slot = create_slot(list_append_slot_template, ctx, /*$$scope*/ ctx[81], get_list_append_slot_context);

	return {
		c() {
			if (list_append_slot) list_append_slot.c();
		},
		m(target, anchor) {
			if (list_append_slot) {
				list_append_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (list_append_slot) {
				if (list_append_slot.p && (!current || dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						list_append_slot,
						list_append_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(list_append_slot_template, /*$$scope*/ ctx[81], dirty, get_list_append_slot_changes),
						get_list_append_slot_context
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(list_append_slot, local);
			current = true;
		},
		o(local) {
			transition_out(list_append_slot, local);
			current = false;
		},
		d(detaching) {
			if (list_append_slot) list_append_slot.d(detaching);
		}
	};
}

// (727:8) {#if focused}
function create_if_block_7$1(ctx) {
	let span0;
	let t0;
	let t1;
	let span1;
	let t2;

	return {
		c() {
			span0 = element("span");
			t0 = text(/*ariaSelection*/ ctx[32]);
			t1 = space();
			span1 = element("span");
			t2 = text(/*ariaContext*/ ctx[31]);
			attr(span0, "id", "aria-selection");
			attr(span0, "class", "svelte-apvs86");
			attr(span1, "id", "aria-context");
			attr(span1, "class", "svelte-apvs86");
		},
		m(target, anchor) {
			insert(target, span0, anchor);
			append(span0, t0);
			insert(target, t1, anchor);
			insert(target, span1, anchor);
			append(span1, t2);
		},
		p(ctx, dirty) {
			if (dirty[1] & /*ariaSelection*/ 2) set_data(t0, /*ariaSelection*/ ctx[32]);
			if (dirty[1] & /*ariaContext*/ 1) set_data(t2, /*ariaContext*/ ctx[31]);
		},
		d(detaching) {
			if (detaching) detach(span0);
			if (detaching) detach(t1);
			if (detaching) detach(span1);
		}
	};
}

// (740:8) {#if hasValue}
function create_if_block_4$2(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_5$1, create_else_block$2];
	const if_blocks = [];

	function select_block_type_1(ctx, dirty) {
		if (/*multiple*/ ctx[9]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type_1(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type_1(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (766:12) {:else}
function create_else_block$2(ctx) {
	let div;
	let current;
	const selection_slot_template = /*#slots*/ ctx[82].selection;
	const selection_slot = create_slot(selection_slot_template, ctx, /*$$scope*/ ctx[81], get_selection_slot_context_1);
	const selection_slot_or_fallback = selection_slot || fallback_block_6(ctx);

	return {
		c() {
			div = element("div");
			if (selection_slot_or_fallback) selection_slot_or_fallback.c();
			attr(div, "class", "selected-item svelte-apvs86");
			toggle_class(div, "hide-selected-item", /*hideSelectedItem*/ ctx[35]);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (selection_slot_or_fallback) {
				selection_slot_or_fallback.m(div, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (selection_slot) {
				if (selection_slot.p && (!current || dirty[0] & /*value*/ 8 | dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						selection_slot,
						selection_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(selection_slot_template, /*$$scope*/ ctx[81], dirty, get_selection_slot_changes_1),
						get_selection_slot_context_1
					);
				}
			} else {
				if (selection_slot_or_fallback && selection_slot_or_fallback.p && (!current || dirty[0] & /*value, label*/ 4104)) {
					selection_slot_or_fallback.p(ctx, !current ? [-1, -1, -1, -1, -1] : dirty);
				}
			}

			if (!current || dirty[1] & /*hideSelectedItem*/ 16) {
				toggle_class(div, "hide-selected-item", /*hideSelectedItem*/ ctx[35]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(selection_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(selection_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (selection_slot_or_fallback) selection_slot_or_fallback.d(detaching);
		}
	};
}

// (741:12) {#if multiple}
function create_if_block_5$1(ctx) {
	let each_1_anchor;
	let current;
	let each_value = /*value*/ ctx[3];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty[0] & /*activeValue, disabled, multiFullItemClearable, value, label*/ 67116040 | dirty[1] & /*handleMultiItemClear*/ 32 | dirty[2] & /*$$scope*/ 524288) {
				each_value = /*value*/ ctx[3];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$4(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$4(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (768:61)                          
function fallback_block_6(ctx) {
	let t_value = /*value*/ ctx[3][/*label*/ ctx[12]] + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*value, label*/ 4104 && t_value !== (t_value = /*value*/ ctx[3][/*label*/ ctx[12]] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (750:78)                                  
function fallback_block_5(ctx) {
	let t_value = /*item*/ ctx[125][/*label*/ ctx[12]] + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*value, label*/ 4104 && t_value !== (t_value = /*item*/ ctx[125][/*label*/ ctx[12]] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (755:24) {#if !disabled && !multiFullItemClearable && ClearIcon}
function create_if_block_6$1(ctx) {
	let div;
	let current;
	let mounted;
	let dispose;
	const multi_clear_icon_slot_template = /*#slots*/ ctx[82]["multi-clear-icon"];
	const multi_clear_icon_slot = create_slot(multi_clear_icon_slot_template, ctx, /*$$scope*/ ctx[81], get_multi_clear_icon_slot_context);
	const multi_clear_icon_slot_or_fallback = multi_clear_icon_slot || fallback_block_4();

	function pointerup_handler_1() {
		return /*pointerup_handler_1*/ ctx[91](/*i*/ ctx[127]);
	}

	return {
		c() {
			div = element("div");
			if (multi_clear_icon_slot_or_fallback) multi_clear_icon_slot_or_fallback.c();
			attr(div, "class", "multi-item-clear svelte-apvs86");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (multi_clear_icon_slot_or_fallback) {
				multi_clear_icon_slot_or_fallback.m(div, null);
			}

			current = true;

			if (!mounted) {
				dispose = listen(div, "pointerup", stop_propagation(prevent_default(pointerup_handler_1)));
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (multi_clear_icon_slot) {
				if (multi_clear_icon_slot.p && (!current || dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						multi_clear_icon_slot,
						multi_clear_icon_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(multi_clear_icon_slot_template, /*$$scope*/ ctx[81], dirty, get_multi_clear_icon_slot_changes),
						get_multi_clear_icon_slot_context
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(multi_clear_icon_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(multi_clear_icon_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (multi_clear_icon_slot_or_fallback) multi_clear_icon_slot_or_fallback.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

// (759:62)                                      
function fallback_block_4(ctx) {
	let clearicon;
	let current;
	clearicon = new ClearIcon({});

	return {
		c() {
			create_component(clearicon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(clearicon, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(clearicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(clearicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(clearicon, detaching);
		}
	};
}

// (742:16) {#each value as item, i}
function create_each_block$4(ctx) {
	let div;
	let span;
	let t0;
	let t1;
	let current;
	let mounted;
	let dispose;
	const selection_slot_template = /*#slots*/ ctx[82].selection;
	const selection_slot = create_slot(selection_slot_template, ctx, /*$$scope*/ ctx[81], get_selection_slot_context);
	const selection_slot_or_fallback = selection_slot || fallback_block_5(ctx);
	let if_block = !/*disabled*/ ctx[11] && !/*multiFullItemClearable*/ ctx[10] && ClearIcon && create_if_block_6$1(ctx);

	function click_handler_1() {
		return /*click_handler_1*/ ctx[92](/*i*/ ctx[127]);
	}

	return {
		c() {
			div = element("div");
			span = element("span");
			if (selection_slot_or_fallback) selection_slot_or_fallback.c();
			t0 = space();
			if (if_block) if_block.c();
			t1 = space();
			attr(span, "class", "multi-item-text svelte-apvs86");
			attr(div, "class", "multi-item svelte-apvs86");
			toggle_class(div, "active", /*activeValue*/ ctx[26] === /*i*/ ctx[127]);
			toggle_class(div, "disabled", /*disabled*/ ctx[11]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span);

			if (selection_slot_or_fallback) {
				selection_slot_or_fallback.m(span, null);
			}

			append(div, t0);
			if (if_block) if_block.m(div, null);
			append(div, t1);
			current = true;

			if (!mounted) {
				dispose = [
					listen(div, "click", prevent_default(click_handler_1)),
					listen(div, "keydown", stop_propagation(prevent_default(/*keydown_handler_1*/ ctx[84])))
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (selection_slot) {
				if (selection_slot.p && (!current || dirty[0] & /*value*/ 8 | dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						selection_slot,
						selection_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(selection_slot_template, /*$$scope*/ ctx[81], dirty, get_selection_slot_changes),
						get_selection_slot_context
					);
				}
			} else {
				if (selection_slot_or_fallback && selection_slot_or_fallback.p && (!current || dirty[0] & /*value, label*/ 4104)) {
					selection_slot_or_fallback.p(ctx, !current ? [-1, -1, -1, -1, -1] : dirty);
				}
			}

			if (!/*disabled*/ ctx[11] && !/*multiFullItemClearable*/ ctx[10] && ClearIcon) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty[0] & /*disabled, multiFullItemClearable*/ 3072) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_6$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div, t1);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (!current || dirty[0] & /*activeValue*/ 67108864) {
				toggle_class(div, "active", /*activeValue*/ ctx[26] === /*i*/ ctx[127]);
			}

			if (!current || dirty[0] & /*disabled*/ 2048) {
				toggle_class(div, "disabled", /*disabled*/ ctx[11]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(selection_slot_or_fallback, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(selection_slot_or_fallback, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (selection_slot_or_fallback) selection_slot_or_fallback.d(detaching);
			if (if_block) if_block.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

// (789:8) {#if loading}
function create_if_block_3$2(ctx) {
	let div;
	let current;
	const loading_icon_slot_template = /*#slots*/ ctx[82]["loading-icon"];
	const loading_icon_slot = create_slot(loading_icon_slot_template, ctx, /*$$scope*/ ctx[81], get_loading_icon_slot_context);
	const loading_icon_slot_or_fallback = loading_icon_slot || fallback_block_3();

	return {
		c() {
			div = element("div");
			if (loading_icon_slot_or_fallback) loading_icon_slot_or_fallback.c();
			attr(div, "class", "icon loading svelte-apvs86");
			attr(div, "aria-hidden", "true");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (loading_icon_slot_or_fallback) {
				loading_icon_slot_or_fallback.m(div, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (loading_icon_slot) {
				if (loading_icon_slot.p && (!current || dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						loading_icon_slot,
						loading_icon_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(loading_icon_slot_template, /*$$scope*/ ctx[81], dirty, get_loading_icon_slot_changes),
						get_loading_icon_slot_context
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(loading_icon_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(loading_icon_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (loading_icon_slot_or_fallback) loading_icon_slot_or_fallback.d(detaching);
		}
	};
}

// (791:42)                      
function fallback_block_3(ctx) {
	let loadingicon;
	let current;
	loadingicon = new LoadingIcon({});

	return {
		c() {
			create_component(loadingicon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(loadingicon, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(loadingicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(loadingicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(loadingicon, detaching);
		}
	};
}

// (797:8) {#if showClear}
function create_if_block_2$2(ctx) {
	let button;
	let current;
	let mounted;
	let dispose;
	const clear_icon_slot_template = /*#slots*/ ctx[82]["clear-icon"];
	const clear_icon_slot = create_slot(clear_icon_slot_template, ctx, /*$$scope*/ ctx[81], get_clear_icon_slot_context);
	const clear_icon_slot_or_fallback = clear_icon_slot || fallback_block_2();

	return {
		c() {
			button = element("button");
			if (clear_icon_slot_or_fallback) clear_icon_slot_or_fallback.c();
			attr(button, "class", "icon clear-select svelte-apvs86");
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (clear_icon_slot_or_fallback) {
				clear_icon_slot_or_fallback.m(button, null);
			}

			current = true;

			if (!mounted) {
				dispose = listen(button, "pointerup", stop_propagation(prevent_default(/*handleClear*/ ctx[22])));
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (clear_icon_slot) {
				if (clear_icon_slot.p && (!current || dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						clear_icon_slot,
						clear_icon_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(clear_icon_slot_template, /*$$scope*/ ctx[81], dirty, get_clear_icon_slot_changes),
						get_clear_icon_slot_context
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(clear_icon_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(clear_icon_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(button);
			if (clear_icon_slot_or_fallback) clear_icon_slot_or_fallback.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

// (799:40)                      
function fallback_block_2(ctx) {
	let clearicon;
	let current;
	clearicon = new ClearIcon({});

	return {
		c() {
			create_component(clearicon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(clearicon, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(clearicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(clearicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(clearicon, detaching);
		}
	};
}

// (805:8) {#if showChevron}
function create_if_block_1$4(ctx) {
	let div;
	let current;
	const chevron_icon_slot_template = /*#slots*/ ctx[82]["chevron-icon"];
	const chevron_icon_slot = create_slot(chevron_icon_slot_template, ctx, /*$$scope*/ ctx[81], get_chevron_icon_slot_context);
	const chevron_icon_slot_or_fallback = chevron_icon_slot || fallback_block_1();

	return {
		c() {
			div = element("div");
			if (chevron_icon_slot_or_fallback) chevron_icon_slot_or_fallback.c();
			attr(div, "class", "icon chevron svelte-apvs86");
			attr(div, "aria-hidden", "true");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (chevron_icon_slot_or_fallback) {
				chevron_icon_slot_or_fallback.m(div, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (chevron_icon_slot) {
				if (chevron_icon_slot.p && (!current || dirty[0] & /*listOpen*/ 64 | dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						chevron_icon_slot,
						chevron_icon_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(chevron_icon_slot_template, /*$$scope*/ ctx[81], dirty, get_chevron_icon_slot_changes),
						get_chevron_icon_slot_context
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(chevron_icon_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(chevron_icon_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (chevron_icon_slot_or_fallback) chevron_icon_slot_or_fallback.d(detaching);
		}
	};
}

// (807:53)                      
function fallback_block_1(ctx) {
	let chevronicon;
	let current;
	chevronicon = new ChevronIcon({});

	return {
		c() {
			create_component(chevronicon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(chevronicon, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(chevronicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(chevronicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(chevronicon, detaching);
		}
	};
}

// (816:4) {#if required && (!value || value.length === 0)}
function create_if_block$5(ctx) {
	let current;
	const required_slot_template = /*#slots*/ ctx[82].required;
	const required_slot = create_slot(required_slot_template, ctx, /*$$scope*/ ctx[81], get_required_slot_context);
	const required_slot_or_fallback = required_slot || fallback_block();

	return {
		c() {
			if (required_slot_or_fallback) required_slot_or_fallback.c();
		},
		m(target, anchor) {
			if (required_slot_or_fallback) {
				required_slot_or_fallback.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (required_slot) {
				if (required_slot.p && (!current || dirty[0] & /*value*/ 8 | dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						required_slot,
						required_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(required_slot_template, /*$$scope*/ ctx[81], dirty, get_required_slot_changes),
						get_required_slot_context
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(required_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(required_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (required_slot_or_fallback) required_slot_or_fallback.d(detaching);
		}
	};
}

// (817:38)              
function fallback_block(ctx) {
	let select;

	return {
		c() {
			select = element("select");
			attr(select, "class", "required svelte-apvs86");
			select.required = true;
			attr(select, "tabindex", "-1");
			attr(select, "aria-hidden", "true");
		},
		m(target, anchor) {
			insert(target, select, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(select);
		}
	};
}

function create_fragment$g(ctx) {
	let div3;
	let t0;
	let span;
	let t1;
	let div0;
	let t2;
	let div1;
	let t3;
	let input0;
	let input0_readonly_value;
	let t4;
	let div2;
	let t5;
	let t6;
	let t7;
	let input1;
	let input1_value_value;
	let t8;
	let div3_class_value;
	let current;
	let mounted;
	let dispose;
	let if_block0 = /*listOpen*/ ctx[6] && create_if_block_8(ctx);
	let if_block1 = /*focused*/ ctx[2] && create_if_block_7$1(ctx);
	const prepend_slot_template = /*#slots*/ ctx[82].prepend;
	const prepend_slot = create_slot(prepend_slot_template, ctx, /*$$scope*/ ctx[81], get_prepend_slot_context);
	let if_block2 = /*hasValue*/ ctx[25] && create_if_block_4$2(ctx);

	let input0_levels = [
		{
			readOnly: input0_readonly_value = !/*searchable*/ ctx[17]
		},
		/*_inputAttributes*/ ctx[27],
		{ placeholder: /*placeholderText*/ ctx[33] },
		{ style: /*inputStyles*/ ctx[18] },
		{ disabled: /*disabled*/ ctx[11] }
	];

	let input_data_1 = {};

	for (let i = 0; i < input0_levels.length; i += 1) {
		input_data_1 = assign(input_data_1, input0_levels[i]);
	}

	let if_block3 = /*loading*/ ctx[5] && create_if_block_3$2(ctx);
	let if_block4 = /*showClear*/ ctx[34] && create_if_block_2$2(ctx);
	let if_block5 = /*showChevron*/ ctx[20] && create_if_block_1$4(ctx);
	let if_block6 = /*required*/ ctx[16] && (!/*value*/ ctx[3] || /*value*/ ctx[3].length === 0) && create_if_block$5(ctx);

	return {
		c() {
			div3 = element("div");
			if (if_block0) if_block0.c();
			t0 = space();
			span = element("span");
			if (if_block1) if_block1.c();
			t1 = space();
			div0 = element("div");
			if (prepend_slot) prepend_slot.c();
			t2 = space();
			div1 = element("div");
			if (if_block2) if_block2.c();
			t3 = space();
			input0 = element("input");
			t4 = space();
			div2 = element("div");
			if (if_block3) if_block3.c();
			t5 = space();
			if (if_block4) if_block4.c();
			t6 = space();
			if (if_block5) if_block5.c();
			t7 = space();
			input1 = element("input");
			t8 = space();
			if (if_block6) if_block6.c();
			attr(span, "aria-live", "polite");
			attr(span, "aria-atomic", "false");
			attr(span, "aria-relevant", "additions text");
			attr(span, "class", "a11y-text svelte-apvs86");
			attr(div0, "class", "prepend svelte-apvs86");
			set_attributes(input0, input_data_1);
			toggle_class(input0, "svelte-apvs86", true);
			attr(div1, "class", "value-container svelte-apvs86");
			attr(div2, "class", "indicators svelte-apvs86");
			attr(input1, "name", /*name*/ ctx[8]);
			attr(input1, "type", "hidden");

			input1.value = input1_value_value = /*value*/ ctx[3]
			? JSON.stringify(/*value*/ ctx[3])
			: null;

			attr(input1, "class", "svelte-apvs86");
			attr(div3, "class", div3_class_value = "svelte-select " + /*containerClasses*/ ctx[21] + " svelte-apvs86");
			attr(div3, "style", /*containerStyles*/ ctx[14]);
			toggle_class(div3, "multi", /*multiple*/ ctx[9]);
			toggle_class(div3, "disabled", /*disabled*/ ctx[11]);
			toggle_class(div3, "focused", /*focused*/ ctx[2]);
			toggle_class(div3, "list-open", /*listOpen*/ ctx[6]);
			toggle_class(div3, "show-chevron", /*showChevron*/ ctx[20]);
			toggle_class(div3, "error", /*hasError*/ ctx[15]);
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			if (if_block0) if_block0.m(div3, null);
			append(div3, t0);
			append(div3, span);
			if (if_block1) if_block1.m(span, null);
			append(div3, t1);
			append(div3, div0);

			if (prepend_slot) {
				prepend_slot.m(div0, null);
			}

			append(div3, t2);
			append(div3, div1);
			if (if_block2) if_block2.m(div1, null);
			append(div1, t3);
			append(div1, input0);
			if (input0.autofocus) input0.focus();
			/*input0_binding*/ ctx[93](input0);
			set_input_value(input0, /*filterText*/ ctx[4]);
			append(div3, t4);
			append(div3, div2);
			if (if_block3) if_block3.m(div2, null);
			append(div2, t5);
			if (if_block4) if_block4.m(div2, null);
			append(div2, t6);
			if (if_block5) if_block5.m(div2, null);
			append(div3, t7);
			append(div3, input1);
			append(div3, t8);
			if (if_block6) if_block6.m(div3, null);
			/*div3_binding*/ ctx[95](div3);
			current = true;

			if (!mounted) {
				dispose = [
					listen(window, "click", /*handleClickOutside*/ ctx[42]),
					listen(window, "keydown", /*handleKeyDown*/ ctx[37]),
					listen(input0, "keydown", /*handleKeyDown*/ ctx[37]),
					listen(input0, "blur", /*handleBlur*/ ctx[39]),
					listen(input0, "focus", /*handleFocus*/ ctx[38]),
					listen(input0, "input", /*input0_input_handler*/ ctx[94]),
					listen(div3, "pointerup", prevent_default(/*handleClick*/ ctx[40])),
					listen(div3, "mousedown", prevent_default(/*mousedown_handler*/ ctx[83])),
					action_destroyer(/*floatingRef*/ ctx[48].call(null, div3))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (/*listOpen*/ ctx[6]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty[0] & /*listOpen*/ 64) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_8(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(div3, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*focused*/ ctx[2]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_7$1(ctx);
					if_block1.c();
					if_block1.m(span, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (prepend_slot) {
				if (prepend_slot.p && (!current || dirty[2] & /*$$scope*/ 524288)) {
					update_slot_base(
						prepend_slot,
						prepend_slot_template,
						ctx,
						/*$$scope*/ ctx[81],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[81])
						: get_slot_changes(prepend_slot_template, /*$$scope*/ ctx[81], dirty, get_prepend_slot_changes),
						get_prepend_slot_context
					);
				}
			}

			if (/*hasValue*/ ctx[25]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);

					if (dirty[0] & /*hasValue*/ 33554432) {
						transition_in(if_block2, 1);
					}
				} else {
					if_block2 = create_if_block_4$2(ctx);
					if_block2.c();
					transition_in(if_block2, 1);
					if_block2.m(div1, t3);
				}
			} else if (if_block2) {
				group_outros();

				transition_out(if_block2, 1, 1, () => {
					if_block2 = null;
				});

				check_outros();
			}

			set_attributes(input0, input_data_1 = get_spread_update(input0_levels, [
				(!current || dirty[0] & /*searchable*/ 131072 && input0_readonly_value !== (input0_readonly_value = !/*searchable*/ ctx[17])) && { readOnly: input0_readonly_value },
				dirty[0] & /*_inputAttributes*/ 134217728 && /*_inputAttributes*/ ctx[27],
				(!current || dirty[1] & /*placeholderText*/ 4) && { placeholder: /*placeholderText*/ ctx[33] },
				(!current || dirty[0] & /*inputStyles*/ 262144) && { style: /*inputStyles*/ ctx[18] },
				(!current || dirty[0] & /*disabled*/ 2048) && { disabled: /*disabled*/ ctx[11] }
			]));

			if (dirty[0] & /*filterText*/ 16 && input0.value !== /*filterText*/ ctx[4]) {
				set_input_value(input0, /*filterText*/ ctx[4]);
			}

			toggle_class(input0, "svelte-apvs86", true);

			if (/*loading*/ ctx[5]) {
				if (if_block3) {
					if_block3.p(ctx, dirty);

					if (dirty[0] & /*loading*/ 32) {
						transition_in(if_block3, 1);
					}
				} else {
					if_block3 = create_if_block_3$2(ctx);
					if_block3.c();
					transition_in(if_block3, 1);
					if_block3.m(div2, t5);
				}
			} else if (if_block3) {
				group_outros();

				transition_out(if_block3, 1, 1, () => {
					if_block3 = null;
				});

				check_outros();
			}

			if (/*showClear*/ ctx[34]) {
				if (if_block4) {
					if_block4.p(ctx, dirty);

					if (dirty[1] & /*showClear*/ 8) {
						transition_in(if_block4, 1);
					}
				} else {
					if_block4 = create_if_block_2$2(ctx);
					if_block4.c();
					transition_in(if_block4, 1);
					if_block4.m(div2, t6);
				}
			} else if (if_block4) {
				group_outros();

				transition_out(if_block4, 1, 1, () => {
					if_block4 = null;
				});

				check_outros();
			}

			if (/*showChevron*/ ctx[20]) {
				if (if_block5) {
					if_block5.p(ctx, dirty);

					if (dirty[0] & /*showChevron*/ 1048576) {
						transition_in(if_block5, 1);
					}
				} else {
					if_block5 = create_if_block_1$4(ctx);
					if_block5.c();
					transition_in(if_block5, 1);
					if_block5.m(div2, null);
				}
			} else if (if_block5) {
				group_outros();

				transition_out(if_block5, 1, 1, () => {
					if_block5 = null;
				});

				check_outros();
			}

			if (!current || dirty[0] & /*name*/ 256) {
				attr(input1, "name", /*name*/ ctx[8]);
			}

			if (!current || dirty[0] & /*value*/ 8 && input1_value_value !== (input1_value_value = /*value*/ ctx[3]
			? JSON.stringify(/*value*/ ctx[3])
			: null)) {
				input1.value = input1_value_value;
			}

			if (/*required*/ ctx[16] && (!/*value*/ ctx[3] || /*value*/ ctx[3].length === 0)) {
				if (if_block6) {
					if_block6.p(ctx, dirty);

					if (dirty[0] & /*required, value*/ 65544) {
						transition_in(if_block6, 1);
					}
				} else {
					if_block6 = create_if_block$5(ctx);
					if_block6.c();
					transition_in(if_block6, 1);
					if_block6.m(div3, null);
				}
			} else if (if_block6) {
				group_outros();

				transition_out(if_block6, 1, 1, () => {
					if_block6 = null;
				});

				check_outros();
			}

			if (!current || dirty[0] & /*containerClasses*/ 2097152 && div3_class_value !== (div3_class_value = "svelte-select " + /*containerClasses*/ ctx[21] + " svelte-apvs86")) {
				attr(div3, "class", div3_class_value);
			}

			if (!current || dirty[0] & /*containerStyles*/ 16384) {
				attr(div3, "style", /*containerStyles*/ ctx[14]);
			}

			if (!current || dirty[0] & /*containerClasses, multiple*/ 2097664) {
				toggle_class(div3, "multi", /*multiple*/ ctx[9]);
			}

			if (!current || dirty[0] & /*containerClasses, disabled*/ 2099200) {
				toggle_class(div3, "disabled", /*disabled*/ ctx[11]);
			}

			if (!current || dirty[0] & /*containerClasses, focused*/ 2097156) {
				toggle_class(div3, "focused", /*focused*/ ctx[2]);
			}

			if (!current || dirty[0] & /*containerClasses, listOpen*/ 2097216) {
				toggle_class(div3, "list-open", /*listOpen*/ ctx[6]);
			}

			if (!current || dirty[0] & /*containerClasses, showChevron*/ 3145728) {
				toggle_class(div3, "show-chevron", /*showChevron*/ ctx[20]);
			}

			if (!current || dirty[0] & /*containerClasses, hasError*/ 2129920) {
				toggle_class(div3, "error", /*hasError*/ ctx[15]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(prepend_slot, local);
			transition_in(if_block2);
			transition_in(if_block3);
			transition_in(if_block4);
			transition_in(if_block5);
			transition_in(if_block6);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(prepend_slot, local);
			transition_out(if_block2);
			transition_out(if_block3);
			transition_out(if_block4);
			transition_out(if_block5);
			transition_out(if_block6);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div3);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (prepend_slot) prepend_slot.d(detaching);
			if (if_block2) if_block2.d();
			/*input0_binding*/ ctx[93](null);
			if (if_block3) if_block3.d();
			if (if_block4) if_block4.d();
			if (if_block5) if_block5.d();
			if (if_block6) if_block6.d();
			/*div3_binding*/ ctx[95](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function convertStringItemsToObjects(_items) {
	return _items.map((item, index) => {
		return { index, value: item, label: `${item}` };
	});
}

function isItemFirst(itemIndex) {
	return itemIndex === 0;
}

function isItemSelectable(item) {
	return item.groupHeader && item.selectable || item.selectable || !item.hasOwnProperty('selectable');
}

function instance$e($$self, $$props, $$invalidate) {
	let hasValue;
	let hideSelectedItem;
	let showClear;
	let placeholderText;
	let ariaSelection;
	let ariaContext;
	let filteredItems;
	let listDom;
	let scrollToHoverItem;
	let { $$slots: slots = {}, $$scope } = $$props;
	const $$slots = compute_slots(slots);
	const dispatch = createEventDispatcher();
	let { justValue = null } = $$props;
	let { filter: filter$1 = filter } = $$props;
	let { getItems: getItems$1 = getItems } = $$props;
	let { id = null } = $$props;
	let { name = null } = $$props;
	let { container = undefined } = $$props;
	let { input = undefined } = $$props;
	let { multiple = false } = $$props;
	let { multiFullItemClearable = false } = $$props;
	let { disabled = false } = $$props;
	let { focused = false } = $$props;
	let { value = null } = $$props;
	let { filterText = '' } = $$props;
	let { placeholder = 'Please select' } = $$props;
	let { placeholderAlwaysShow = false } = $$props;
	let { items = null } = $$props;
	let { label = 'label' } = $$props;
	let { itemFilter = (label, filterText, option) => `${label}`.toLowerCase().includes(filterText.toLowerCase()) } = $$props;
	let { groupBy = undefined } = $$props;
	let { groupFilter = groups => groups } = $$props;
	let { groupHeaderSelectable = false } = $$props;
	let { itemId = 'value' } = $$props;
	let { loadOptions = undefined } = $$props;
	let { containerStyles = '' } = $$props;
	let { hasError = false } = $$props;
	let { filterSelectedItems = true } = $$props;
	let { required = false } = $$props;
	let { closeListOnChange = true } = $$props;

	let { createGroupHeaderItem = (groupValue, item) => {
		return { value: groupValue, [label]: groupValue };
	} } = $$props;

	const getFilteredItems = () => {
		return filteredItems;
	};

	let { searchable = true } = $$props;
	let { inputStyles = '' } = $$props;
	let { clearable = true } = $$props;
	let { loading = false } = $$props;
	let { listOpen = false } = $$props;
	let timeout;

	let { debounce = (fn, wait = 1) => {
		clearTimeout(timeout);
		timeout = setTimeout(fn, wait);
	} } = $$props;

	let { debounceWait = 300 } = $$props;
	let { hideEmptyState = false } = $$props;
	let { inputAttributes = {} } = $$props;
	let { listAutoWidth = true } = $$props;
	let { showChevron = false } = $$props;
	let { listOffset = 5 } = $$props;
	let { hoverItemIndex = 0 } = $$props;
	let { floatingConfig = {} } = $$props;
	let { class: containerClasses = '' } = $$props;
	let activeValue;
	let prev_value;
	let prev_filterText;
	let prev_multiple;

	function setValue() {
		if (typeof value === 'string') {
			let item = (items || []).find(item => item[itemId] === value);
			$$invalidate(3, value = item || { [itemId]: value, label: value });
		} else if (multiple && Array.isArray(value) && value.length > 0) {
			$$invalidate(3, value = value.map(item => typeof item === 'string'
			? { value: item, label: item }
			: item));
		}
	}

	let _inputAttributes;

	function assignInputAttributes() {
		$$invalidate(27, _inputAttributes = Object.assign(
			{
				autocapitalize: 'none',
				autocomplete: 'off',
				autocorrect: 'off',
				spellcheck: false,
				tabindex: 0,
				type: 'text',
				'aria-autocomplete': 'list'
			},
			inputAttributes
		));

		if (id) {
			$$invalidate(27, _inputAttributes['id'] = id, _inputAttributes);
		}

		if (!searchable) {
			$$invalidate(27, _inputAttributes['readonly'] = true, _inputAttributes);
		}
	}

	function filterGroupedItems(_items) {
		const groupValues = [];
		const groups = {};

		_items.forEach(item => {
			const groupValue = groupBy(item);

			if (!groupValues.includes(groupValue)) {
				groupValues.push(groupValue);
				groups[groupValue] = [];

				if (groupValue) {
					groups[groupValue].push(Object.assign(createGroupHeaderItem(groupValue, item), {
						id: groupValue,
						groupHeader: true,
						selectable: groupHeaderSelectable
					}));
				}
			}

			groups[groupValue].push(Object.assign({ groupItem: !!groupValue }, item));
		});

		const sortedGroupedItems = [];

		groupFilter(groupValues).forEach(groupValue => {
			if (groups[groupValue]) sortedGroupedItems.push(...groups[groupValue]);
		});

		return sortedGroupedItems;
	}

	function dispatchSelectedItem() {
		if (multiple) {
			if (JSON.stringify(value) !== JSON.stringify(prev_value)) {
				if (checkValueForDuplicates()) {
					dispatch('input', value);
				}
			}

			return;
		}

		if (!prev_value || JSON.stringify(value[itemId]) !== JSON.stringify(prev_value[itemId])) {
			dispatch('input', value);
		}
	}

	function setupMulti() {
		if (value) {
			if (Array.isArray(value)) {
				$$invalidate(3, value = [...value]);
			} else {
				$$invalidate(3, value = [value]);
			}
		}
	}

	function setupSingle() {
		if (value) $$invalidate(3, value = null);
	}

	function setValueIndexAsHoverIndex() {
		const valueIndex = filteredItems.findIndex(i => {
			return i[itemId] === value[itemId];
		});

		checkHoverSelectable(valueIndex, true);
	}

	function dispatchHover(i) {
		dispatch('hoverItem', i);
	}

	function checkHoverSelectable(startingIndex = 0, ignoreGroup) {
		$$invalidate(7, hoverItemIndex = startingIndex < 0 ? 0 : startingIndex);

		if (!ignoreGroup && groupBy && filteredItems[hoverItemIndex] && !filteredItems[hoverItemIndex].selectable) {
			setHoverIndex(1);
		}
	}

	function setupFilterText() {
		if (!loadOptions && filterText.length === 0) return;

		if (loadOptions) {
			debounce(
				async function () {
					$$invalidate(5, loading = true);

					let res = await getItems$1({
						dispatch,
						loadOptions,
						convertStringItemsToObjects,
						filterText
					});

					if (res) {
						$$invalidate(5, loading = res.loading);

						$$invalidate(6, listOpen = listOpen
						? res.listOpen
						: filterText.length > 0 ? true : false);

						$$invalidate(2, focused = listOpen && res.focused);

						$$invalidate(51, items = groupBy
						? filterGroupedItems(res.filteredItems)
						: res.filteredItems);
					} else {
						$$invalidate(5, loading = false);
						$$invalidate(2, focused = true);
						$$invalidate(6, listOpen = true);
					}
				},
				debounceWait
			);
		} else {
			$$invalidate(6, listOpen = true);

			if (multiple) {
				$$invalidate(26, activeValue = undefined);
			}
		}
	}

	function handleFilterEvent(items) {
		if (listOpen) dispatch('filter', items);
	}

	beforeUpdate(async () => {
		$$invalidate(77, prev_value = value);
		$$invalidate(78, prev_filterText = filterText);
		$$invalidate(79, prev_multiple = multiple);
	});

	function computeJustValue() {
		if (multiple) return value ? value.map(item => item[itemId]) : null;
		return value ? value[itemId] : value;
	}

	function checkValueForDuplicates() {
		let noDuplicates = true;

		if (value) {
			const ids = [];
			const uniqueValues = [];

			value.forEach(val => {
				if (!ids.includes(val[itemId])) {
					ids.push(val[itemId]);
					uniqueValues.push(val);
				} else {
					noDuplicates = false;
				}
			});

			if (!noDuplicates) $$invalidate(3, value = uniqueValues);
		}

		return noDuplicates;
	}

	function findItem(selection) {
		let matchTo = selection ? selection[itemId] : value[itemId];
		return items.find(item => item[itemId] === matchTo);
	}

	function updateValueDisplay(items) {
		if (!items || items.length === 0 || items.some(item => typeof item !== 'object')) return;

		if (!value || (multiple
		? value.some(selection => !selection || !selection[itemId])
		: !value[itemId])) return;

		if (Array.isArray(value)) {
			$$invalidate(3, value = value.map(selection => findItem(selection) || selection));
		} else {
			$$invalidate(3, value = findItem() || value);
		}
	}

	async function handleMultiItemClear(i) {
		const itemToRemove = value[i];

		if (value.length === 1) {
			$$invalidate(3, value = undefined);
		} else {
			$$invalidate(3, value = value.filter(item => {
				return item !== itemToRemove;
			}));
		}

		dispatch('clear', itemToRemove);
	}

	function handleKeyDown(e) {
		if (!focused) return;
		e.stopPropagation();

		switch (e.key) {
			case 'Escape':
				e.preventDefault();
				closeList();
				break;
			case 'Enter':
				e.preventDefault();
				if (listOpen) {
					if (filteredItems.length === 0) break;
					const hoverItem = filteredItems[hoverItemIndex];

					if (value && !multiple && value[itemId] === hoverItem[itemId]) {
						closeList();
						break;
					} else {
						handleSelect(filteredItems[hoverItemIndex]);
					}
				}
				break;
			case 'ArrowDown':
				e.preventDefault();
				if (listOpen) {
					setHoverIndex(1);
				} else {
					$$invalidate(6, listOpen = true);
					$$invalidate(26, activeValue = undefined);
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (listOpen) {
					setHoverIndex(-1);
				} else {
					$$invalidate(6, listOpen = true);
					$$invalidate(26, activeValue = undefined);
				}
				break;
			case 'Tab':
				if (listOpen && focused) {
					if (filteredItems.length === 0 || value && value[itemId] === filteredItems[hoverItemIndex][itemId]) return closeList();
					e.preventDefault();
					handleSelect(filteredItems[hoverItemIndex]);
					closeList();
				}
				break;
			case 'Backspace':
				if (!multiple || filterText.length > 0) return;
				if (multiple && value && value.length > 0) {
					handleMultiItemClear(activeValue !== undefined
					? activeValue
					: value.length - 1);

					if (activeValue === 0 || activeValue === undefined) break;
					$$invalidate(26, activeValue = value.length > activeValue ? activeValue - 1 : undefined);
				}
				break;
			case 'ArrowLeft':
				if (!value || !multiple || filterText.length > 0) return;
				if (activeValue === undefined) {
					$$invalidate(26, activeValue = value.length - 1);
				} else if (value.length > activeValue && activeValue !== 0) {
					$$invalidate(26, activeValue -= 1);
				}
				break;
			case 'ArrowRight':
				if (!value || !multiple || filterText.length > 0 || activeValue === undefined) return;
				if (activeValue === value.length - 1) {
					$$invalidate(26, activeValue = undefined);
				} else if (activeValue < value.length - 1) {
					$$invalidate(26, activeValue += 1);
				}
				break;
		}
	}

	function handleFocus(e) {
		if (focused && input === document?.activeElement) return;
		if (e) dispatch('focus', e);
		input.focus();
		$$invalidate(2, focused = true);
	}

	async function handleBlur(e) {
		if (isScrolling) return;

		if (listOpen || focused) {
			dispatch('blur', e);
			closeList();
			$$invalidate(2, focused = false);
			$$invalidate(26, activeValue = undefined);
			input.blur();
		}
	}

	function handleClick() {
		if (disabled) return;
		$$invalidate(6, listOpen = !listOpen);
	}

	function handleClear() {
		dispatch('clear', value);
		$$invalidate(3, value = undefined);
		closeList();
		handleFocus();
	}

	onMount(() => {
		if (listOpen) $$invalidate(2, focused = true);
		if (focused && input) input.focus();
	});

	function itemSelected(selection) {
		if (selection) {
			$$invalidate(4, filterText = '');
			const item = Object.assign({}, selection);
			if (item.groupHeader && !item.selectable) return;

			$$invalidate(3, value = multiple
			? value ? value.concat([item]) : [item]
			: $$invalidate(3, value = item));

			setTimeout(() => {
				if (closeListOnChange) closeList();
				$$invalidate(26, activeValue = undefined);
				dispatch('change', value);
				dispatch('select', selection);
			});
		}
	}

	function closeList() {
		$$invalidate(4, filterText = '');
		$$invalidate(6, listOpen = false);
	}

	let { ariaValues = values => {
		return `Option ${values}, selected.`;
	} } = $$props;

	let { ariaListOpen = (label, count) => {
		return `You are currently focused on option ${label}. There are ${count} results available.`;
	} } = $$props;

	let { ariaFocused = () => {
		return `Select is focused, type to refine list, press down to open the menu.`;
	} } = $$props;

	function handleAriaSelection(_multiple) {
		let selected = undefined;

		if (_multiple && value.length > 0) {
			selected = value.map(v => v[label]).join(', ');
		} else {
			selected = value[label];
		}

		return ariaValues(selected);
	}

	function handleAriaContent() {
		if (!filteredItems || filteredItems.length === 0) return '';
		let _item = filteredItems[hoverItemIndex];

		if (listOpen && _item) {
			let count = filteredItems ? filteredItems.length : 0;
			return ariaListOpen(_item[label], count);
		} else {
			return ariaFocused();
		}
	}

	let list = null;
	let isScrollingTimer;

	function handleListScroll() {
		clearTimeout(isScrollingTimer);

		isScrollingTimer = setTimeout(
			() => {
				isScrolling = false;
			},
			100
		);
	}

	function handleClickOutside(event) {
		if (!listOpen && !focused && container && !container.contains(event.target) && !list?.contains(event.target)) {
			handleBlur();
		}
	}

	onDestroy(() => {
		list?.remove();
	});

	let isScrolling = false;

	function handleSelect(item) {
		if (!item || item.selectable === false) return;
		itemSelected(item);
	}

	function handleHover(i) {
		if (isScrolling) return;
		$$invalidate(7, hoverItemIndex = i);
	}

	function handleItemClick(args) {
		const { item, i } = args;
		if (item?.selectable === false) return;
		if (value && !multiple && value[itemId] === item[itemId]) return closeList();

		if (isItemSelectable(item)) {
			$$invalidate(7, hoverItemIndex = i);
			handleSelect(item);
		}
	}

	function setHoverIndex(increment) {
		let selectableFilteredItems = filteredItems.filter(item => !Object.hasOwn(item, 'selectable') || item.selectable === true);

		if (selectableFilteredItems.length === 0) {
			return $$invalidate(7, hoverItemIndex = 0);
		}

		if (increment > 0 && hoverItemIndex === filteredItems.length - 1) {
			$$invalidate(7, hoverItemIndex = 0);
		} else if (increment < 0 && hoverItemIndex === 0) {
			$$invalidate(7, hoverItemIndex = filteredItems.length - 1);
		} else {
			$$invalidate(7, hoverItemIndex = hoverItemIndex + increment);
		}

		const hover = filteredItems[hoverItemIndex];

		if (hover && hover.selectable === false) {
			if (increment === 1 || increment === -1) setHoverIndex(increment);
			return;
		}
	}

	function isItemActive(item, value, itemId) {
		if (multiple) return;
		return value && value[itemId] === item[itemId];
	}

	const activeScroll = scrollAction;
	const hoverScroll = scrollAction;

	function scrollAction(node) {
		return {
			update(args) {
				if (args.scroll) {
					handleListScroll();
					node.scrollIntoView({ behavior: 'auto', block: 'nearest' });
				}
			}
		};
	}

	function setListWidth() {
		const { width } = container.getBoundingClientRect();
		$$invalidate(23, list.style.width = listAutoWidth ? width + 'px' : 'auto', list);
	}

	let _floatingConfig = {
		strategy: 'absolute',
		placement: 'bottom-start',
		middleware: [D$1(listOffset), b$1(), k()],
		autoUpdate: false
	};

	const [floatingRef, floatingContent, floatingUpdate] = createFloatingActions(_floatingConfig);
	let prefloat = true;

	function listMounted(list, listOpen) {
		if (!list || !listOpen) return $$invalidate(28, prefloat = true);

		setTimeout(
			() => {
				$$invalidate(28, prefloat = false);
			},
			0
		);
	}

	function mousedown_handler(event) {
		bubble.call(this, $$self, event);
	}

	function keydown_handler_1(event) {
		bubble.call(this, $$self, event);
	}

	function pointerup_handler(event) {
		bubble.call(this, $$self, event);
	}

	function keydown_handler(event) {
		bubble.call(this, $$self, event);
	}

	const mouseover_handler = i => handleHover(i);
	const focus_handler = i => handleHover(i);
	const click_handler = (item, i) => handleItemClick({ item, i });

	function div_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			list = $$value;
			$$invalidate(23, list);
		});
	}

	const pointerup_handler_1 = i => handleMultiItemClear(i);
	const click_handler_1 = i => multiFullItemClearable ? handleMultiItemClear(i) : {};

	function input0_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			input = $$value;
			$$invalidate(1, input);
		});
	}

	function input0_input_handler() {
		filterText = this.value;
		$$invalidate(4, filterText);
	}

	function div3_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			container = $$value;
			$$invalidate(0, container);
		});
	}

	$$self.$$set = $$props => {
		if ('justValue' in $$props) $$invalidate(52, justValue = $$props.justValue);
		if ('filter' in $$props) $$invalidate(53, filter$1 = $$props.filter);
		if ('getItems' in $$props) $$invalidate(54, getItems$1 = $$props.getItems);
		if ('id' in $$props) $$invalidate(55, id = $$props.id);
		if ('name' in $$props) $$invalidate(8, name = $$props.name);
		if ('container' in $$props) $$invalidate(0, container = $$props.container);
		if ('input' in $$props) $$invalidate(1, input = $$props.input);
		if ('multiple' in $$props) $$invalidate(9, multiple = $$props.multiple);
		if ('multiFullItemClearable' in $$props) $$invalidate(10, multiFullItemClearable = $$props.multiFullItemClearable);
		if ('disabled' in $$props) $$invalidate(11, disabled = $$props.disabled);
		if ('focused' in $$props) $$invalidate(2, focused = $$props.focused);
		if ('value' in $$props) $$invalidate(3, value = $$props.value);
		if ('filterText' in $$props) $$invalidate(4, filterText = $$props.filterText);
		if ('placeholder' in $$props) $$invalidate(56, placeholder = $$props.placeholder);
		if ('placeholderAlwaysShow' in $$props) $$invalidate(57, placeholderAlwaysShow = $$props.placeholderAlwaysShow);
		if ('items' in $$props) $$invalidate(51, items = $$props.items);
		if ('label' in $$props) $$invalidate(12, label = $$props.label);
		if ('itemFilter' in $$props) $$invalidate(58, itemFilter = $$props.itemFilter);
		if ('groupBy' in $$props) $$invalidate(59, groupBy = $$props.groupBy);
		if ('groupFilter' in $$props) $$invalidate(60, groupFilter = $$props.groupFilter);
		if ('groupHeaderSelectable' in $$props) $$invalidate(61, groupHeaderSelectable = $$props.groupHeaderSelectable);
		if ('itemId' in $$props) $$invalidate(13, itemId = $$props.itemId);
		if ('loadOptions' in $$props) $$invalidate(62, loadOptions = $$props.loadOptions);
		if ('containerStyles' in $$props) $$invalidate(14, containerStyles = $$props.containerStyles);
		if ('hasError' in $$props) $$invalidate(15, hasError = $$props.hasError);
		if ('filterSelectedItems' in $$props) $$invalidate(63, filterSelectedItems = $$props.filterSelectedItems);
		if ('required' in $$props) $$invalidate(16, required = $$props.required);
		if ('closeListOnChange' in $$props) $$invalidate(64, closeListOnChange = $$props.closeListOnChange);
		if ('createGroupHeaderItem' in $$props) $$invalidate(65, createGroupHeaderItem = $$props.createGroupHeaderItem);
		if ('searchable' in $$props) $$invalidate(17, searchable = $$props.searchable);
		if ('inputStyles' in $$props) $$invalidate(18, inputStyles = $$props.inputStyles);
		if ('clearable' in $$props) $$invalidate(67, clearable = $$props.clearable);
		if ('loading' in $$props) $$invalidate(5, loading = $$props.loading);
		if ('listOpen' in $$props) $$invalidate(6, listOpen = $$props.listOpen);
		if ('debounce' in $$props) $$invalidate(68, debounce = $$props.debounce);
		if ('debounceWait' in $$props) $$invalidate(69, debounceWait = $$props.debounceWait);
		if ('hideEmptyState' in $$props) $$invalidate(19, hideEmptyState = $$props.hideEmptyState);
		if ('inputAttributes' in $$props) $$invalidate(70, inputAttributes = $$props.inputAttributes);
		if ('listAutoWidth' in $$props) $$invalidate(71, listAutoWidth = $$props.listAutoWidth);
		if ('showChevron' in $$props) $$invalidate(20, showChevron = $$props.showChevron);
		if ('listOffset' in $$props) $$invalidate(72, listOffset = $$props.listOffset);
		if ('hoverItemIndex' in $$props) $$invalidate(7, hoverItemIndex = $$props.hoverItemIndex);
		if ('floatingConfig' in $$props) $$invalidate(73, floatingConfig = $$props.floatingConfig);
		if ('class' in $$props) $$invalidate(21, containerClasses = $$props.class);
		if ('ariaValues' in $$props) $$invalidate(74, ariaValues = $$props.ariaValues);
		if ('ariaListOpen' in $$props) $$invalidate(75, ariaListOpen = $$props.ariaListOpen);
		if ('ariaFocused' in $$props) $$invalidate(76, ariaFocused = $$props.ariaFocused);
		if ('$$scope' in $$props) $$invalidate(81, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*value*/ 8 | $$self.$$.dirty[1] & /*items*/ 1048576) {
			if ((value)) setValue();
		}

		if ($$self.$$.dirty[0] & /*searchable*/ 131072 | $$self.$$.dirty[2] & /*inputAttributes*/ 256) {
			if (inputAttributes || !searchable) assignInputAttributes();
		}

		if ($$self.$$.dirty[0] & /*multiple*/ 512) {
			if (multiple) setupMulti();
		}

		if ($$self.$$.dirty[0] & /*multiple*/ 512 | $$self.$$.dirty[2] & /*prev_multiple*/ 131072) {
			if (prev_multiple && !multiple) setupSingle();
		}

		if ($$self.$$.dirty[0] & /*multiple, value*/ 520) {
			if (multiple && value && value.length > 1) checkValueForDuplicates();
		}

		if ($$self.$$.dirty[0] & /*value*/ 8) {
			if (value) dispatchSelectedItem();
		}

		if ($$self.$$.dirty[0] & /*value, multiple*/ 520 | $$self.$$.dirty[2] & /*prev_value*/ 32768) {
			if (!value && multiple && prev_value) dispatch('input', value);
		}

		if ($$self.$$.dirty[0] & /*focused, input*/ 6) {
			if (!focused && input) closeList();
		}

		if ($$self.$$.dirty[0] & /*filterText*/ 16 | $$self.$$.dirty[2] & /*prev_filterText*/ 65536) {
			if (filterText !== prev_filterText) setupFilterText();
		}

		if ($$self.$$.dirty[0] & /*filterText, multiple, value, itemId, label*/ 12824 | $$self.$$.dirty[1] & /*filter, items, groupBy, itemFilter*/ 407896064 | $$self.$$.dirty[2] & /*loadOptions, filterSelectedItems*/ 3) {
			$$invalidate(24, filteredItems = filter$1({
				loadOptions,
				filterText,
				items,
				multiple,
				value,
				itemId,
				groupBy,
				label,
				filterSelectedItems,
				itemFilter,
				convertStringItemsToObjects,
				filterGroupedItems
			}));
		}

		if ($$self.$$.dirty[0] & /*multiple, listOpen, value, filteredItems*/ 16777800) {
			if (!multiple && listOpen && value && filteredItems) setValueIndexAsHoverIndex();
		}

		if ($$self.$$.dirty[0] & /*listOpen, multiple*/ 576) {
			if (listOpen && multiple) $$invalidate(7, hoverItemIndex = 0);
		}

		if ($$self.$$.dirty[0] & /*filterText*/ 16) {
			if (filterText) $$invalidate(7, hoverItemIndex = 0);
		}

		if ($$self.$$.dirty[0] & /*hoverItemIndex*/ 128) {
			dispatchHover(hoverItemIndex);
		}

		if ($$self.$$.dirty[0] & /*multiple, value*/ 520) {
			$$invalidate(25, hasValue = multiple ? value && value.length > 0 : value);
		}

		if ($$self.$$.dirty[0] & /*hasValue, filterText*/ 33554448) {
			$$invalidate(35, hideSelectedItem = hasValue && filterText.length > 0);
		}

		if ($$self.$$.dirty[0] & /*hasValue, disabled, loading*/ 33556512 | $$self.$$.dirty[2] & /*clearable*/ 32) {
			$$invalidate(34, showClear = hasValue && clearable && !disabled && !loading);
		}

		if ($$self.$$.dirty[0] & /*multiple, value*/ 520 | $$self.$$.dirty[1] & /*placeholderAlwaysShow, placeholder*/ 100663296) {
			$$invalidate(33, placeholderText = placeholderAlwaysShow && multiple
			? placeholder
			: multiple && value?.length === 0
				? placeholder
				: value ? '' : placeholder);
		}

		if ($$self.$$.dirty[0] & /*value, multiple*/ 520) {
			$$invalidate(32, ariaSelection = value ? handleAriaSelection(multiple) : '');
		}

		if ($$self.$$.dirty[0] & /*filteredItems, hoverItemIndex, focused, listOpen*/ 16777412) {
			$$invalidate(31, ariaContext = handleAriaContent());
		}

		if ($$self.$$.dirty[1] & /*items*/ 1048576) {
			updateValueDisplay(items);
		}

		if ($$self.$$.dirty[0] & /*multiple, value, itemId*/ 8712) {
			$$invalidate(52, justValue = computeJustValue());
		}

		if ($$self.$$.dirty[0] & /*multiple, value*/ 520 | $$self.$$.dirty[2] & /*prev_value*/ 32768) {
			if (!multiple && prev_value && !value) dispatch('input', value);
		}

		if ($$self.$$.dirty[0] & /*listOpen, filteredItems, multiple, value*/ 16777800) {
			if (listOpen && filteredItems && !multiple && !value) checkHoverSelectable();
		}

		if ($$self.$$.dirty[0] & /*filteredItems*/ 16777216) {
			handleFilterEvent(filteredItems);
		}

		if ($$self.$$.dirty[0] & /*container*/ 1 | $$self.$$.dirty[2] & /*floatingConfig*/ 2048) {
			if (container && floatingConfig?.autoUpdate === undefined) {
				$$invalidate(80, _floatingConfig.autoUpdate = true, _floatingConfig);
			}
		}

		if ($$self.$$.dirty[0] & /*container*/ 1 | $$self.$$.dirty[2] & /*floatingConfig, _floatingConfig*/ 264192) {
			if (container && floatingConfig) floatingUpdate(Object.assign(_floatingConfig, floatingConfig));
		}

		if ($$self.$$.dirty[0] & /*list*/ 8388608) {
			$$invalidate(30, listDom = !!list);
		}

		if ($$self.$$.dirty[0] & /*list, listOpen*/ 8388672) {
			listMounted(list, listOpen);
		}

		if ($$self.$$.dirty[0] & /*listOpen, container, list*/ 8388673) {
			if (listOpen && container && list) setListWidth();
		}

		if ($$self.$$.dirty[0] & /*hoverItemIndex*/ 128) {
			$$invalidate(29, scrollToHoverItem = hoverItemIndex);
		}

		if ($$self.$$.dirty[0] & /*input, listOpen, focused*/ 70) {
			if (input && listOpen && !focused) handleFocus();
		}
	};

	return [
		container,
		input,
		focused,
		value,
		filterText,
		loading,
		listOpen,
		hoverItemIndex,
		name,
		multiple,
		multiFullItemClearable,
		disabled,
		label,
		itemId,
		containerStyles,
		hasError,
		required,
		searchable,
		inputStyles,
		hideEmptyState,
		showChevron,
		containerClasses,
		handleClear,
		list,
		filteredItems,
		hasValue,
		activeValue,
		_inputAttributes,
		prefloat,
		scrollToHoverItem,
		listDom,
		ariaContext,
		ariaSelection,
		placeholderText,
		showClear,
		hideSelectedItem,
		handleMultiItemClear,
		handleKeyDown,
		handleFocus,
		handleBlur,
		handleClick,
		handleListScroll,
		handleClickOutside,
		handleHover,
		handleItemClick,
		isItemActive,
		activeScroll,
		hoverScroll,
		floatingRef,
		floatingContent,
		$$slots,
		items,
		justValue,
		filter$1,
		getItems$1,
		id,
		placeholder,
		placeholderAlwaysShow,
		itemFilter,
		groupBy,
		groupFilter,
		groupHeaderSelectable,
		loadOptions,
		filterSelectedItems,
		closeListOnChange,
		createGroupHeaderItem,
		getFilteredItems,
		clearable,
		debounce,
		debounceWait,
		inputAttributes,
		listAutoWidth,
		listOffset,
		floatingConfig,
		ariaValues,
		ariaListOpen,
		ariaFocused,
		prev_value,
		prev_filterText,
		prev_multiple,
		_floatingConfig,
		$$scope,
		slots,
		mousedown_handler,
		keydown_handler_1,
		pointerup_handler,
		keydown_handler,
		mouseover_handler,
		focus_handler,
		click_handler,
		div_binding,
		pointerup_handler_1,
		click_handler_1,
		input0_binding,
		input0_input_handler,
		div3_binding
	];
}

class Select extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$e,
			create_fragment$g,
			safe_not_equal,
			{
				justValue: 52,
				filter: 53,
				getItems: 54,
				id: 55,
				name: 8,
				container: 0,
				input: 1,
				multiple: 9,
				multiFullItemClearable: 10,
				disabled: 11,
				focused: 2,
				value: 3,
				filterText: 4,
				placeholder: 56,
				placeholderAlwaysShow: 57,
				items: 51,
				label: 12,
				itemFilter: 58,
				groupBy: 59,
				groupFilter: 60,
				groupHeaderSelectable: 61,
				itemId: 13,
				loadOptions: 62,
				containerStyles: 14,
				hasError: 15,
				filterSelectedItems: 63,
				required: 16,
				closeListOnChange: 64,
				createGroupHeaderItem: 65,
				getFilteredItems: 66,
				searchable: 17,
				inputStyles: 18,
				clearable: 67,
				loading: 5,
				listOpen: 6,
				debounce: 68,
				debounceWait: 69,
				hideEmptyState: 19,
				inputAttributes: 70,
				listAutoWidth: 71,
				showChevron: 20,
				listOffset: 72,
				hoverItemIndex: 7,
				floatingConfig: 73,
				class: 21,
				handleClear: 22,
				ariaValues: 74,
				ariaListOpen: 75,
				ariaFocused: 76
			},
			add_css$2,
			[-1, -1, -1, -1, -1]
		);
	}

	get getFilteredItems() {
		return this.$$.ctx[66];
	}

	get handleClear() {
		return this.$$.ctx[22];
	}
}

/* src/modals/createTask/LabelSelector.svelte generated by Svelte v3.58.0 */

function create_fragment$f(ctx) {
	let select;
	let updating_value;
	let current;

	function select_value_binding(value) {
		/*select_value_binding*/ ctx[3](value);
	}

	let select_props = {
		items: /*labels*/ ctx[1],
		multiple: true,
		placeholder: "Select labels..."
	};

	if (/*selected*/ ctx[0] !== void 0) {
		select_props.value = /*selected*/ ctx[0];
	}

	select = new Select({ props: select_props });
	binding_callbacks.push(() => bind(select, 'value', select_value_binding));

	return {
		c() {
			create_component(select.$$.fragment);
		},
		m(target, anchor) {
			mount_component(select, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const select_changes = {};
			if (dirty & /*labels*/ 2) select_changes.items = /*labels*/ ctx[1];

			if (!updating_value && dirty & /*selected*/ 1) {
				updating_value = true;
				select_changes.value = /*selected*/ ctx[0];
				add_flush_callback(() => updating_value = false);
			}

			select.$set(select_changes);
		},
		i(local) {
			if (current) return;
			transition_in(select.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(select.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(select, detaching);
		}
	};
}

function createLabelOptions(metadata) {
	return Array.from(metadata.labels).sort(([,first_name], [,second_name]) => first_name.localeCompare(second_name)).map(([id, label]) => {
		return { value: id, label };
	});
}

function instance$d($$self, $$props, $$invalidate) {
	let labels;
	let { selected } = $$props;
	let { metadata } = $$props;

	function select_value_binding(value) {
		selected = value;
		$$invalidate(0, selected);
	}

	$$self.$$set = $$props => {
		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
		if ('metadata' in $$props) $$invalidate(2, metadata = $$props.metadata);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*metadata*/ 4) {
			$$invalidate(1, labels = createLabelOptions(metadata));
		}
	};

	return [selected, labels, metadata, select_value_binding];
}

class LabelSelector extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$d, create_fragment$f, safe_not_equal, { selected: 0, metadata: 2 });
	}
}

/* src/modals/createTask/PriorityPicker.svelte generated by Svelte v3.58.0 */

function add_css$1(target) {
	append_styles(target, "svelte-wz2flg", ".priority-container.svelte-wz2flg.svelte-wz2flg{display:flex;height:42px}.priority-option.svelte-wz2flg.svelte-wz2flg{width:25%;height:42px;text-align:center;border:1px solid var(--background-modifier-border);background:var(--background-modifier-form-field)}.priority-option.svelte-wz2flg>span.svelte-wz2flg{line-height:42px}.priority-selected.svelte-wz2flg.svelte-wz2flg{border:1px solid var(--interactive-accent);background:var(--background-modifier-form-field-highlighted)}.priority-container.svelte-wz2flg .priority-option.svelte-wz2flg:first-child{border-radius:10px 0 0 10px}.priority-container.svelte-wz2flg .priority-option.svelte-wz2flg:last-child{border-radius:0 10px 10px 0}");
}

function get_each_context$3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[3] = list[i];
	return child_ctx;
}

// (25:2) {#each options as option}
function create_each_block$3(ctx) {
	let div;
	let span;
	let t0_value = /*option*/ ctx[3].label + "";
	let t0;
	let t1;
	let div_class_value;
	let mounted;
	let dispose;

	function click_handler() {
		return /*click_handler*/ ctx[2](/*option*/ ctx[3]);
	}

	return {
		c() {
			div = element("div");
			span = element("span");
			t0 = text(t0_value);
			t1 = space();
			attr(span, "class", "svelte-wz2flg");

			attr(div, "class", div_class_value = "priority-option " + (/*option*/ ctx[3].value == /*selected*/ ctx[0]
			? 'priority-selected'
			: '') + " priority-" + /*option*/ ctx[3].label + " svelte-wz2flg");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span);
			append(span, t0);
			append(div, t1);

			if (!mounted) {
				dispose = listen(div, "click", click_handler);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty & /*selected*/ 1 && div_class_value !== (div_class_value = "priority-option " + (/*option*/ ctx[3].value == /*selected*/ ctx[0]
			? 'priority-selected'
			: '') + " priority-" + /*option*/ ctx[3].label + " svelte-wz2flg")) {
				attr(div, "class", div_class_value);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$e(ctx) {
	let div;
	let each_value = /*options*/ ctx[1];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", "priority-container svelte-wz2flg");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*options, selected*/ 3) {
				each_value = /*options*/ ctx[1];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$3(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$3(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$c($$self, $$props, $$invalidate) {
	let { selected } = $$props;

	// Note: Priority is defined in the Todoist API opposite to that in the UI.
	// In the UI priority 4 = lowest, in the API 1 is the lowest.
	const options = [
		{ label: "4", value: 1 },
		{ label: "3", value: 2 },
		{ label: "2", value: 3 },
		{ label: "1", value: 4 }
	];

	const click_handler = option => {
		$$invalidate(0, selected = option.value);
	};

	$$self.$$set = $$props => {
		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
	};

	return [selected, options, click_handler];
}

class PriorityPicker extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$c, create_fragment$e, safe_not_equal, { selected: 0 }, add_css$1);
	}
}

/* src/modals/createTask/ProjectSelector.svelte generated by Svelte v3.58.0 */

function create_fragment$d(ctx) {
	let select;
	let updating_value;
	let current;

	function select_value_binding(value) {
		/*select_value_binding*/ ctx[3](value);
	}

	let select_props = {
		items: /*projectTree*/ ctx[1],
		clearable: false,
		placeholder: "Select project or section"
	};

	if (/*selected*/ ctx[0] !== void 0) {
		select_props.value = /*selected*/ ctx[0];
	}

	select = new Select({ props: select_props });
	binding_callbacks.push(() => bind(select, 'value', select_value_binding));

	return {
		c() {
			create_component(select.$$.fragment);
		},
		m(target, anchor) {
			mount_component(select, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const select_changes = {};
			if (dirty & /*projectTree*/ 2) select_changes.items = /*projectTree*/ ctx[1];

			if (!updating_value && dirty & /*selected*/ 1) {
				updating_value = true;
				select_changes.value = /*selected*/ ctx[0];
				add_flush_callback(() => updating_value = false);
			}

			select.$set(select_changes);
		},
		i(local) {
			if (current) return;
			transition_in(select.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(select.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(select, detaching);
		}
	};
}

function instance$b($$self, $$props, $$invalidate) {
	let projectTree;
	let { selected } = $$props;
	let { metadata } = $$props;

	function createProjectTree(metadata) {
		const projects = new Map();

		for (const project of metadata.projects.values()) {
			if (!projects.has(project.id)) {
				projects.set(project.id, { subProjects: [], sections: [] });
			}

			if (project.parent_id) {
				if (projects.has(project.parent_id)) {
					const data = projects.get(project.parent_id);
					data.subProjects.push(project.id);
				} else {
					projects.set(project.parent_id, { subProjects: [project.id], sections: [] });
				}
			}
		}

		for (const section of metadata.sections.values()) {
			const data = projects.get(section.project_id);

			if (data === undefined) {
				debug(`Could not find data for project ${section.project_id}`);
				continue;
			}

			data.sections.push(section.id);
		}

		// Now generate the value/label combos
		const topLevelProjects = Array.from(metadata.projects.values()).filter(prj => prj.parent_id == null).sort((prj1, prj2) => prj1.order - prj2.order);

		const options = [];

		function descendPrjTree(id, depth, chain) {
			let prjName = metadata.projects.get(id).name;
			let nextChain = chain + prjName + " > ";

			options.push({
				value: { type: "Project", id },
				label: chain + " " + prjName
			});

			let children = projects.get(id);

			if (children === null || children === void 0
			? void 0
			: children.sections) {
				for (const sectionId of children.sections) {
					let section = metadata.sections.get(sectionId);

					options.push({
						value: { type: "Section", id: section.id },
						label: nextChain + section.name
					});
				}
			}

			if (children === null || children === void 0
			? void 0
			: children.subProjects) {
				for (const childProject of children.subProjects) {
					descendPrjTree(childProject, depth + 1, nextChain);
				}
			}
		}

		for (const prj of topLevelProjects) {
			descendPrjTree(prj.id, 0, "");
		}

		if (selected == null) {
			$$invalidate(0, selected = options.find(opt => opt.label == " Inbox" && opt.value.type == "Project"));
		}

		return options;
	}

	function select_value_binding(value) {
		selected = value;
		$$invalidate(0, selected);
	}

	$$self.$$set = $$props => {
		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
		if ('metadata' in $$props) $$invalidate(2, metadata = $$props.metadata);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*metadata*/ 4) {
			$$invalidate(1, projectTree = createProjectTree(metadata));
		}
	};

	return [selected, projectTree, metadata, select_value_binding];
}

class ProjectSelector extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$b, create_fragment$d, safe_not_equal, { selected: 0, metadata: 2 });
	}
}

/* src/modals/createTask/CreateTaskModalContent.svelte generated by Svelte v3.58.0 */

function add_css(target) {
	append_styles(target, "svelte-4x8kmm", "button.svelte-4x8kmm.svelte-4x8kmm{float:right;margin-top:20px}.select.svelte-4x8kmm.svelte-4x8kmm{--border:1px solid var(--background-primary-alt);--border-hover:var(--interactive-accent);--border-focus:var(--interactive-accent);--background:var(--background-modifier-form-field);--list-background:var(--background-primary);--item-is-active-bg:var(--background-secondary);--item-is-active-color:var(--text-normal);--item-hover-bg:var(--background-secondary);--item-color:var(--text-normal);--multi-item-bg:var(--background-secondary);--multi-item-active-color:var(--text-normal);--multi-item-active-bg:var(--background-secondary-alt);margin-top:0.5em;display:flex;align-items:center}.select.svelte-4x8kmm>span.svelte-4x8kmm{width:4em}.select.svelte-4x8kmm>div.svelte-4x8kmm{flex-grow:1}input.svelte-4x8kmm.svelte-4x8kmm{width:100%;margin-bottom:0.5em;line-height:42px}");
}

function create_fragment$c(ctx) {
	let input0;
	let t0;
	let input1;
	let t1;
	let div8;
	let div1;
	let span0;
	let t3;
	let div0;
	let projectselector;
	let updating_selected;
	let updating_metadata;
	let t4;
	let div3;
	let span1;
	let t6;
	let div2;
	let labelselector;
	let updating_selected_1;
	let updating_metadata_1;
	let t7;
	let div5;
	let span2;
	let t9;
	let div4;
	let dateselector;
	let updating_selected_2;
	let t10;
	let div7;
	let span3;
	let t12;
	let div6;
	let prioritypicker;
	let updating_selected_3;
	let t13;
	let button;
	let t14;
	let button_disabled_value;
	let current;
	let mounted;
	let dispose;

	function projectselector_selected_binding(value) {
		/*projectselector_selected_binding*/ ctx[16](value);
	}

	function projectselector_metadata_binding(value) {
		/*projectselector_metadata_binding*/ ctx[17](value);
	}

	let projectselector_props = {};

	if (/*activeProject*/ ctx[3] !== void 0) {
		projectselector_props.selected = /*activeProject*/ ctx[3];
	}

	if (/*metadata*/ ctx[7] !== void 0) {
		projectselector_props.metadata = /*metadata*/ ctx[7];
	}

	projectselector = new ProjectSelector({ props: projectselector_props });
	binding_callbacks.push(() => bind(projectselector, 'selected', projectselector_selected_binding));
	binding_callbacks.push(() => bind(projectselector, 'metadata', projectselector_metadata_binding));

	function labelselector_selected_binding(value) {
		/*labelselector_selected_binding*/ ctx[18](value);
	}

	function labelselector_metadata_binding(value) {
		/*labelselector_metadata_binding*/ ctx[19](value);
	}

	let labelselector_props = {};

	if (/*activeLabels*/ ctx[2] !== void 0) {
		labelselector_props.selected = /*activeLabels*/ ctx[2];
	}

	if (/*metadata*/ ctx[7] !== void 0) {
		labelselector_props.metadata = /*metadata*/ ctx[7];
	}

	labelselector = new LabelSelector({ props: labelselector_props });
	binding_callbacks.push(() => bind(labelselector, 'selected', labelselector_selected_binding));
	binding_callbacks.push(() => bind(labelselector, 'metadata', labelselector_metadata_binding));

	function dateselector_selected_binding(value) {
		/*dateselector_selected_binding*/ ctx[20](value);
	}

	let dateselector_props = {};

	if (/*date*/ ctx[4] !== void 0) {
		dateselector_props.selected = /*date*/ ctx[4];
	}

	dateselector = new DateSelector({ props: dateselector_props });
	binding_callbacks.push(() => bind(dateselector, 'selected', dateselector_selected_binding));

	function prioritypicker_selected_binding(value) {
		/*prioritypicker_selected_binding*/ ctx[21](value);
	}

	let prioritypicker_props = {};

	if (/*priority*/ ctx[5] !== void 0) {
		prioritypicker_props.selected = /*priority*/ ctx[5];
	}

	prioritypicker = new PriorityPicker({ props: prioritypicker_props });
	binding_callbacks.push(() => bind(prioritypicker, 'selected', prioritypicker_selected_binding));

	return {
		c() {
			input0 = element("input");
			t0 = space();
			input1 = element("input");
			t1 = space();
			div8 = element("div");
			div1 = element("div");
			span0 = element("span");
			span0.textContent = "Project";
			t3 = space();
			div0 = element("div");
			create_component(projectselector.$$.fragment);
			t4 = space();
			div3 = element("div");
			span1 = element("span");
			span1.textContent = "Labels";
			t6 = space();
			div2 = element("div");
			create_component(labelselector.$$.fragment);
			t7 = space();
			div5 = element("div");
			span2 = element("span");
			span2.textContent = "Date";
			t9 = space();
			div4 = element("div");
			create_component(dateselector.$$.fragment);
			t10 = space();
			div7 = element("div");
			span3 = element("span");
			span3.textContent = "Priority";
			t12 = space();
			div6 = element("div");
			create_component(prioritypicker.$$.fragment);
			t13 = space();
			button = element("button");
			t14 = text("Add");
			attr(input0, "type", "text");
			attr(input0, "placeholder", "What to do?");
			attr(input0, "class", "svelte-4x8kmm");
			attr(input1, "type", "text");
			attr(input1, "placeholder", "Description...");
			attr(input1, "class", "svelte-4x8kmm");
			attr(span0, "class", "svelte-4x8kmm");
			attr(div0, "class", "svelte-4x8kmm");
			attr(div1, "class", "select svelte-4x8kmm");
			attr(span1, "class", "svelte-4x8kmm");
			attr(div2, "class", "svelte-4x8kmm");
			attr(div3, "class", "select svelte-4x8kmm");
			attr(span2, "class", "svelte-4x8kmm");
			attr(div4, "class", "svelte-4x8kmm");
			attr(div5, "class", "select svelte-4x8kmm");
			attr(span3, "class", "svelte-4x8kmm");
			attr(div6, "class", "svelte-4x8kmm");
			attr(div7, "class", "select svelte-4x8kmm");
			button.disabled = button_disabled_value = (/*value*/ ctx[0]?.length ?? 0) == 0;
			attr(button, "class", "svelte-4x8kmm");
		},
		m(target, anchor) {
			insert(target, input0, anchor);
			/*input0_binding*/ ctx[13](input0);
			set_input_value(input0, /*value*/ ctx[0]);
			insert(target, t0, anchor);
			insert(target, input1, anchor);
			set_input_value(input1, /*description*/ ctx[1]);
			insert(target, t1, anchor);
			insert(target, div8, anchor);
			append(div8, div1);
			append(div1, span0);
			append(div1, t3);
			append(div1, div0);
			mount_component(projectselector, div0, null);
			append(div8, t4);
			append(div8, div3);
			append(div3, span1);
			append(div3, t6);
			append(div3, div2);
			mount_component(labelselector, div2, null);
			append(div8, t7);
			append(div8, div5);
			append(div5, span2);
			append(div5, t9);
			append(div5, div4);
			mount_component(dateselector, div4, null);
			append(div8, t10);
			append(div8, div7);
			append(div7, span3);
			append(div7, t12);
			append(div7, div6);
			mount_component(prioritypicker, div6, null);
			insert(target, t13, anchor);
			insert(target, button, anchor);
			append(button, t14);
			current = true;

			if (!mounted) {
				dispose = [
					listen(window, "keydown", /*onKeyDown*/ ctx[9]),
					listen(input0, "input", /*input0_input_handler*/ ctx[14]),
					listen(input1, "input", /*input1_input_handler*/ ctx[15]),
					listen(button, "click", /*triggerClose*/ ctx[8])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*value*/ 1 && input0.value !== /*value*/ ctx[0]) {
				set_input_value(input0, /*value*/ ctx[0]);
			}

			if (dirty & /*description*/ 2 && input1.value !== /*description*/ ctx[1]) {
				set_input_value(input1, /*description*/ ctx[1]);
			}

			const projectselector_changes = {};

			if (!updating_selected && dirty & /*activeProject*/ 8) {
				updating_selected = true;
				projectselector_changes.selected = /*activeProject*/ ctx[3];
				add_flush_callback(() => updating_selected = false);
			}

			if (!updating_metadata && dirty & /*metadata*/ 128) {
				updating_metadata = true;
				projectselector_changes.metadata = /*metadata*/ ctx[7];
				add_flush_callback(() => updating_metadata = false);
			}

			projectselector.$set(projectselector_changes);
			const labelselector_changes = {};

			if (!updating_selected_1 && dirty & /*activeLabels*/ 4) {
				updating_selected_1 = true;
				labelselector_changes.selected = /*activeLabels*/ ctx[2];
				add_flush_callback(() => updating_selected_1 = false);
			}

			if (!updating_metadata_1 && dirty & /*metadata*/ 128) {
				updating_metadata_1 = true;
				labelselector_changes.metadata = /*metadata*/ ctx[7];
				add_flush_callback(() => updating_metadata_1 = false);
			}

			labelselector.$set(labelselector_changes);
			const dateselector_changes = {};

			if (!updating_selected_2 && dirty & /*date*/ 16) {
				updating_selected_2 = true;
				dateselector_changes.selected = /*date*/ ctx[4];
				add_flush_callback(() => updating_selected_2 = false);
			}

			dateselector.$set(dateselector_changes);
			const prioritypicker_changes = {};

			if (!updating_selected_3 && dirty & /*priority*/ 32) {
				updating_selected_3 = true;
				prioritypicker_changes.selected = /*priority*/ ctx[5];
				add_flush_callback(() => updating_selected_3 = false);
			}

			prioritypicker.$set(prioritypicker_changes);

			if (!current || dirty & /*value*/ 1 && button_disabled_value !== (button_disabled_value = (/*value*/ ctx[0]?.length ?? 0) == 0)) {
				button.disabled = button_disabled_value;
			}
		},
		i(local) {
			if (current) return;
			transition_in(projectselector.$$.fragment, local);
			transition_in(labelselector.$$.fragment, local);
			transition_in(dateselector.$$.fragment, local);
			transition_in(prioritypicker.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(projectselector.$$.fragment, local);
			transition_out(labelselector.$$.fragment, local);
			transition_out(dateselector.$$.fragment, local);
			transition_out(prioritypicker.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(input0);
			/*input0_binding*/ ctx[13](null);
			if (detaching) detach(t0);
			if (detaching) detach(input1);
			if (detaching) detach(t1);
			if (detaching) detach(div8);
			destroy_component(projectselector);
			destroy_component(labelselector);
			destroy_component(dateselector);
			destroy_component(prioritypicker);
			if (detaching) detach(t13);
			if (detaching) detach(button);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$a($$self, $$props, $$invalidate) {
	let { api } = $$props;
	let { close } = $$props;
	let { value } = $$props;
	let { initialCursorPosition } = $$props;
	let description = "";
	let activeLabels = null;
	let activeProject = null;
	let date = null;
	let priority = 1;
	let inputEl;
	let metadata;
	api.metadata.subscribe(value => $$invalidate(7, metadata = value));
	let isBeingCreated = false;

	onMount(async () => {
		await tick();
		inputEl.focus();

		if (typeof initialCursorPosition != "undefined") {
			inputEl.setSelectionRange(initialCursorPosition, initialCursorPosition);
			$$invalidate(6, inputEl.scrollLeft = 0, inputEl);
		}
	});

	async function triggerClose() {
		if (isBeingCreated) {
			return;
		}

		isBeingCreated = true;
		let opts = { description, priority };

		if (activeLabels) {
			opts.labels = activeLabels.map(({ label }) => label);
		}

		if (activeProject) {
			if (activeProject.value.type == "Project") {
				opts.project_id = activeProject.value.id;
			} else {
				opts.section_id = activeProject.value.id;
			}
		}

		if (date) {
			opts.due_date = date.format("YYYY-MM-DD");
		}

		const result = await api.createTask(value, opts);

		if (result.isOk()) {
			close();
			new obsidian.Notice("Task created successfully.");
		} else {
			new obsidian.Notice(`Failed to create task: '${result.unwrapErr().message}'`);
		}

		isBeingCreated = false;
	}

	function onKeyDown(event) {
		if (event.key == "Enter") {
			triggerClose();
		}
	}

	function input0_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			inputEl = $$value;
			$$invalidate(6, inputEl);
		});
	}

	function input0_input_handler() {
		value = this.value;
		$$invalidate(0, value);
	}

	function input1_input_handler() {
		description = this.value;
		$$invalidate(1, description);
	}

	function projectselector_selected_binding(value) {
		activeProject = value;
		$$invalidate(3, activeProject);
	}

	function projectselector_metadata_binding(value) {
		metadata = value;
		$$invalidate(7, metadata);
	}

	function labelselector_selected_binding(value) {
		activeLabels = value;
		$$invalidate(2, activeLabels);
	}

	function labelselector_metadata_binding(value) {
		metadata = value;
		$$invalidate(7, metadata);
	}

	function dateselector_selected_binding(value) {
		date = value;
		$$invalidate(4, date);
	}

	function prioritypicker_selected_binding(value) {
		priority = value;
		$$invalidate(5, priority);
	}

	$$self.$$set = $$props => {
		if ('api' in $$props) $$invalidate(10, api = $$props.api);
		if ('close' in $$props) $$invalidate(11, close = $$props.close);
		if ('value' in $$props) $$invalidate(0, value = $$props.value);
		if ('initialCursorPosition' in $$props) $$invalidate(12, initialCursorPosition = $$props.initialCursorPosition);
	};

	return [
		value,
		description,
		activeLabels,
		activeProject,
		date,
		priority,
		inputEl,
		metadata,
		triggerClose,
		onKeyDown,
		api,
		close,
		initialCursorPosition,
		input0_binding,
		input0_input_handler,
		input1_input_handler,
		projectselector_selected_binding,
		projectselector_metadata_binding,
		labelselector_selected_binding,
		labelselector_metadata_binding,
		dateselector_selected_binding,
		prioritypicker_selected_binding
	];
}

class CreateTaskModalContent extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$a,
			create_fragment$c,
			safe_not_equal,
			{
				api: 10,
				close: 11,
				value: 0,
				initialCursorPosition: 12
			},
			add_css
		);
	}
}

class CreateTaskModal extends obsidian.Modal {
    constructor(app, api, withPageLink) {
        super(app);
        this.titleEl.innerText = "Create new Todoist task";
        const [initialValue, initialCursorPosition] = this.getInitialContent(withPageLink);
        this.modalContent = new CreateTaskModalContent({
            target: this.contentEl,
            props: {
                api: api,
                close: () => this.close(),
                value: initialValue,
                initialCursorPosition: initialCursorPosition,
            },
        });
        this.open();
    }
    onClose() {
        super.onClose();
        this.modalContent.$destroy();
    }
    getInitialContent(withPageLink) {
        var _a, _b;
        let selection = (_b = (_a = this.app.workspace
            .getActiveViewOfType(obsidian.MarkdownView)) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.getSelection();
        if (selection == null || selection === "") {
            selection = window.getSelection().toString();
        }
        if (!withPageLink) {
            return [selection, 0];
        }
        const file = this.app.workspace.getActiveFile();
        if (file == null) {
            return [selection, 0];
        }
        const vaultName = file.vault.getName();
        const filePath = file.path;
        const link = `[${filePath}](obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)})`;
        return [`${selection} ${link}`, selection.length];
    }
}

const sortingOptions = [
    "date",
    "dateAscending",
    "dateDescending",
    "priority",
];
function isSortingOption(value) {
    return sortingOptions.includes(value);
}

const ALIAS = Symbol.for('yaml.alias');
const DOC = Symbol.for('yaml.document');
const MAP = Symbol.for('yaml.map');
const PAIR = Symbol.for('yaml.pair');
const SCALAR$1 = Symbol.for('yaml.scalar');
const SEQ = Symbol.for('yaml.seq');
const NODE_TYPE = Symbol.for('yaml.node.type');
const isAlias = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === ALIAS;
const isDocument = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === DOC;
const isMap = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === MAP;
const isPair = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === PAIR;
const isScalar$1 = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === SCALAR$1;
const isSeq = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === SEQ;
function isCollection$1(node) {
    if (node && typeof node === 'object')
        switch (node[NODE_TYPE]) {
            case MAP:
            case SEQ:
                return true;
        }
    return false;
}
function isNode(node) {
    if (node && typeof node === 'object')
        switch (node[NODE_TYPE]) {
            case ALIAS:
            case MAP:
            case SCALAR$1:
            case SEQ:
                return true;
        }
    return false;
}
const hasAnchor = (node) => (isScalar$1(node) || isCollection$1(node)) && !!node.anchor;
class NodeBase {
    constructor(type) {
        Object.defineProperty(this, NODE_TYPE, { value: type });
    }
    /** Create a copy of this node.  */
    clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
            copy.range = this.range.slice();
        return copy;
    }
}

const BREAK$1 = Symbol('break visit');
const SKIP$1 = Symbol('skip children');
const REMOVE$1 = Symbol('remove node');
/**
 * Apply a visitor to an AST node or document.
 *
 * Walks through the tree (depth-first) starting from `node`, calling a
 * `visitor` function with three arguments:
 *   - `key`: For sequence values and map `Pair`, the node's index in the
 *     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
 *     `null` for the root node.
 *   - `node`: The current node.
 *   - `path`: The ancestry of the current node.
 *
 * The return value of the visitor may be used to control the traversal:
 *   - `undefined` (default): Do nothing and continue
 *   - `visit.SKIP`: Do not visit the children of this node, continue with next
 *     sibling
 *   - `visit.BREAK`: Terminate traversal completely
 *   - `visit.REMOVE`: Remove the current node, then continue with the next one
 *   - `Node`: Replace the current node, then continue by visiting it
 *   - `number`: While iterating the items of a sequence or map, set the index
 *     of the next step. This is useful especially if the index of the current
 *     node has changed.
 *
 * If `visitor` is a single function, it will be called with all values
 * encountered in the tree, including e.g. `null` values. Alternatively,
 * separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
 * `Alias` and `Scalar` node. To define the same visitor function for more than
 * one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
 * and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
 * specific defined one will be used for each node.
 */
function visit$1(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE$1)
            node.contents = null;
    }
    else
        visit_(null, node, visitor_, Object.freeze([]));
}
// Without the `as symbol` casts, TS declares these in the `visit`
// namespace using `var`, but then complains about that because
// `unique symbol` must be `const`.
/** Terminate visit traversal completely */
visit$1.BREAK = BREAK$1;
/** Do not visit the children of the current node */
visit$1.SKIP = SKIP$1;
/** Remove the current node */
visit$1.REMOVE = REMOVE$1;
function visit_(key, node, visitor, path) {
    const ctrl = callVisitor(key, node, visitor, path);
    if (isNode(ctrl) || isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visit_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== 'symbol') {
        if (isCollection$1(node)) {
            path = Object.freeze(path.concat(node));
            for (let i = 0; i < node.items.length; ++i) {
                const ci = visit_(i, node.items[i], visitor, path);
                if (typeof ci === 'number')
                    i = ci - 1;
                else if (ci === BREAK$1)
                    return BREAK$1;
                else if (ci === REMOVE$1) {
                    node.items.splice(i, 1);
                    i -= 1;
                }
            }
        }
        else if (isPair(node)) {
            path = Object.freeze(path.concat(node));
            const ck = visit_('key', node.key, visitor, path);
            if (ck === BREAK$1)
                return BREAK$1;
            else if (ck === REMOVE$1)
                node.key = null;
            const cv = visit_('value', node.value, visitor, path);
            if (cv === BREAK$1)
                return BREAK$1;
            else if (cv === REMOVE$1)
                node.value = null;
        }
    }
    return ctrl;
}
/**
 * Apply an async visitor to an AST node or document.
 *
 * Walks through the tree (depth-first) starting from `node`, calling a
 * `visitor` function with three arguments:
 *   - `key`: For sequence values and map `Pair`, the node's index in the
 *     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
 *     `null` for the root node.
 *   - `node`: The current node.
 *   - `path`: The ancestry of the current node.
 *
 * The return value of the visitor may be used to control the traversal:
 *   - `Promise`: Must resolve to one of the following values
 *   - `undefined` (default): Do nothing and continue
 *   - `visit.SKIP`: Do not visit the children of this node, continue with next
 *     sibling
 *   - `visit.BREAK`: Terminate traversal completely
 *   - `visit.REMOVE`: Remove the current node, then continue with the next one
 *   - `Node`: Replace the current node, then continue by visiting it
 *   - `number`: While iterating the items of a sequence or map, set the index
 *     of the next step. This is useful especially if the index of the current
 *     node has changed.
 *
 * If `visitor` is a single function, it will be called with all values
 * encountered in the tree, including e.g. `null` values. Alternatively,
 * separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
 * `Alias` and `Scalar` node. To define the same visitor function for more than
 * one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
 * and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
 * specific defined one will be used for each node.
 */
async function visitAsync(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE$1)
            node.contents = null;
    }
    else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
}
// Without the `as symbol` casts, TS declares these in the `visit`
// namespace using `var`, but then complains about that because
// `unique symbol` must be `const`.
/** Terminate visit traversal completely */
visitAsync.BREAK = BREAK$1;
/** Do not visit the children of the current node */
visitAsync.SKIP = SKIP$1;
/** Remove the current node */
visitAsync.REMOVE = REMOVE$1;
async function visitAsync_(key, node, visitor, path) {
    const ctrl = await callVisitor(key, node, visitor, path);
    if (isNode(ctrl) || isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visitAsync_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== 'symbol') {
        if (isCollection$1(node)) {
            path = Object.freeze(path.concat(node));
            for (let i = 0; i < node.items.length; ++i) {
                const ci = await visitAsync_(i, node.items[i], visitor, path);
                if (typeof ci === 'number')
                    i = ci - 1;
                else if (ci === BREAK$1)
                    return BREAK$1;
                else if (ci === REMOVE$1) {
                    node.items.splice(i, 1);
                    i -= 1;
                }
            }
        }
        else if (isPair(node)) {
            path = Object.freeze(path.concat(node));
            const ck = await visitAsync_('key', node.key, visitor, path);
            if (ck === BREAK$1)
                return BREAK$1;
            else if (ck === REMOVE$1)
                node.key = null;
            const cv = await visitAsync_('value', node.value, visitor, path);
            if (cv === BREAK$1)
                return BREAK$1;
            else if (cv === REMOVE$1)
                node.value = null;
        }
    }
    return ctrl;
}
function initVisitor(visitor) {
    if (typeof visitor === 'object' &&
        (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
            Alias: visitor.Node,
            Map: visitor.Node,
            Scalar: visitor.Node,
            Seq: visitor.Node
        }, visitor.Value && {
            Map: visitor.Value,
            Scalar: visitor.Value,
            Seq: visitor.Value
        }, visitor.Collection && {
            Map: visitor.Collection,
            Seq: visitor.Collection
        }, visitor);
    }
    return visitor;
}
function callVisitor(key, node, visitor, path) {
    if (typeof visitor === 'function')
        return visitor(key, node, path);
    if (isMap(node))
        return visitor.Map?.(key, node, path);
    if (isSeq(node))
        return visitor.Seq?.(key, node, path);
    if (isPair(node))
        return visitor.Pair?.(key, node, path);
    if (isScalar$1(node))
        return visitor.Scalar?.(key, node, path);
    if (isAlias(node))
        return visitor.Alias?.(key, node, path);
    return undefined;
}
function replaceNode(key, path, node) {
    const parent = path[path.length - 1];
    if (isCollection$1(parent)) {
        parent.items[key] = node;
    }
    else if (isPair(parent)) {
        if (key === 'key')
            parent.key = node;
        else
            parent.value = node;
    }
    else if (isDocument(parent)) {
        parent.contents = node;
    }
    else {
        const pt = isAlias(parent) ? 'alias' : 'scalar';
        throw new Error(`Cannot replace node with ${pt} parent`);
    }
}

const escapeChars = {
    '!': '%21',
    ',': '%2C',
    '[': '%5B',
    ']': '%5D',
    '{': '%7B',
    '}': '%7D'
};
const escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, ch => escapeChars[ch]);
class Directives {
    constructor(yaml, tags) {
        /**
         * The directives-end/doc-start marker `---`. If `null`, a marker may still be
         * included in the document's stringified representation.
         */
        this.docStart = null;
        /** The doc-end marker `...`.  */
        this.docEnd = false;
        this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, Directives.defaultTags, tags);
    }
    clone() {
        const copy = new Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
    }
    /**
     * During parsing, get a Directives instance for the current document and
     * update the stream state according to the current version's spec.
     */
    atDocument() {
        const res = new Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
            case '1.1':
                this.atNextDocument = true;
                break;
            case '1.2':
                this.atNextDocument = false;
                this.yaml = {
                    explicit: Directives.defaultYaml.explicit,
                    version: '1.2'
                };
                this.tags = Object.assign({}, Directives.defaultTags);
                break;
        }
        return res;
    }
    /**
     * @param onError - May be called even if the action was successful
     * @returns `true` on success
     */
    add(line, onError) {
        if (this.atNextDocument) {
            this.yaml = { explicit: Directives.defaultYaml.explicit, version: '1.1' };
            this.tags = Object.assign({}, Directives.defaultTags);
            this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
            case '%TAG': {
                if (parts.length !== 2) {
                    onError(0, '%TAG directive should contain exactly two parts');
                    if (parts.length < 2)
                        return false;
                }
                const [handle, prefix] = parts;
                this.tags[handle] = prefix;
                return true;
            }
            case '%YAML': {
                this.yaml.explicit = true;
                if (parts.length !== 1) {
                    onError(0, '%YAML directive should contain exactly one part');
                    return false;
                }
                const [version] = parts;
                if (version === '1.1' || version === '1.2') {
                    this.yaml.version = version;
                    return true;
                }
                else {
                    const isValid = /^\d+\.\d+$/.test(version);
                    onError(6, `Unsupported YAML version ${version}`, isValid);
                    return false;
                }
            }
            default:
                onError(0, `Unknown directive ${name}`, true);
                return false;
        }
    }
    /**
     * Resolves a tag, matching handles to those defined in %TAG directives.
     *
     * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
     *   `'!local'` tag, or `null` if unresolvable.
     */
    tagName(source, onError) {
        if (source === '!')
            return '!'; // non-specific tag
        if (source[0] !== '!') {
            onError(`Not a valid tag: ${source}`);
            return null;
        }
        if (source[1] === '<') {
            const verbatim = source.slice(2, -1);
            if (verbatim === '!' || verbatim === '!!') {
                onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
                return null;
            }
            if (source[source.length - 1] !== '>')
                onError('Verbatim tags must end with a >');
            return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/);
        if (!suffix)
            onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix)
            return prefix + decodeURIComponent(suffix);
        if (handle === '!')
            return source; // local tag
        onError(`Could not resolve tag: ${source}`);
        return null;
    }
    /**
     * Given a fully resolved tag, returns its printable string form,
     * taking into account current tag prefixes and defaults.
     */
    tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
            if (tag.startsWith(prefix))
                return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === '!' ? tag : `!<${tag}>`;
    }
    toString(doc) {
        const lines = this.yaml.explicit
            ? [`%YAML ${this.yaml.version || '1.2'}`]
            : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && isNode(doc.contents)) {
            const tags = {};
            visit$1(doc.contents, (_key, node) => {
                if (isNode(node) && node.tag)
                    tags[node.tag] = true;
            });
            tagNames = Object.keys(tags);
        }
        else
            tagNames = [];
        for (const [handle, prefix] of tagEntries) {
            if (handle === '!!' && prefix === 'tag:yaml.org,2002:')
                continue;
            if (!doc || tagNames.some(tn => tn.startsWith(prefix)))
                lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join('\n');
    }
}
Directives.defaultYaml = { explicit: false, version: '1.2' };
Directives.defaultTags = { '!!': 'tag:yaml.org,2002:' };

/**
 * Verify that the input string is a valid anchor.
 *
 * Will throw on errors.
 */
function anchorIsValid(anchor) {
    if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
    }
    return true;
}
function anchorNames(root) {
    const anchors = new Set();
    visit$1(root, {
        Value(_key, node) {
            if (node.anchor)
                anchors.add(node.anchor);
        }
    });
    return anchors;
}
/** Find a new anchor name with the given `prefix` and a one-indexed suffix. */
function findNewAnchor(prefix, exclude) {
    for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
            return name;
    }
}
function createNodeAnchors(doc, prefix) {
    const aliasObjects = [];
    const sourceObjects = new Map();
    let prevAnchors = null;
    return {
        onAnchor: (source) => {
            aliasObjects.push(source);
            if (!prevAnchors)
                prevAnchors = anchorNames(doc);
            const anchor = findNewAnchor(prefix, prevAnchors);
            prevAnchors.add(anchor);
            return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
            for (const source of aliasObjects) {
                const ref = sourceObjects.get(source);
                if (typeof ref === 'object' &&
                    ref.anchor &&
                    (isScalar$1(ref.node) || isCollection$1(ref.node))) {
                    ref.node.anchor = ref.anchor;
                }
                else {
                    const error = new Error('Failed to resolve repeated object (this should not happen)');
                    error.source = source;
                    throw error;
                }
            }
        },
        sourceObjects
    };
}

class Alias extends NodeBase {
    constructor(source) {
        super(ALIAS);
        this.source = source;
        Object.defineProperty(this, 'tag', {
            set() {
                throw new Error('Alias nodes cannot have tags');
            }
        });
    }
    /**
     * Resolve the value of this alias within `doc`, finding the last
     * instance of the `source` anchor before this node.
     */
    resolve(doc) {
        let found = undefined;
        visit$1(doc, {
            Node: (_key, node) => {
                if (node === this)
                    return visit$1.BREAK;
                if (node.anchor === this.source)
                    found = node;
            }
        });
        return found;
    }
    toJSON(_arg, ctx) {
        if (!ctx)
            return { source: this.source };
        const { anchors, doc, maxAliasCount } = ctx;
        const source = this.resolve(doc);
        if (!source) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new ReferenceError(msg);
        }
        const data = anchors.get(source);
        /* istanbul ignore if */
        if (!data || data.res === undefined) {
            const msg = 'This should not happen: Alias anchor was not resolved?';
            throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
            data.count += 1;
            if (data.aliasCount === 0)
                data.aliasCount = getAliasCount(doc, source, anchors);
            if (data.count * data.aliasCount > maxAliasCount) {
                const msg = 'Excessive alias count indicates a resource exhaustion attack';
                throw new ReferenceError(msg);
            }
        }
        return data.res;
    }
    toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
            anchorIsValid(this.source);
            if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
                const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
                throw new Error(msg);
            }
            if (ctx.implicitKey)
                return `${src} `;
        }
        return src;
    }
}
function getAliasCount(doc, node, anchors) {
    if (isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors && source && anchors.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
    }
    else if (isCollection$1(node)) {
        let count = 0;
        for (const item of node.items) {
            const c = getAliasCount(doc, item, anchors);
            if (c > count)
                count = c;
        }
        return count;
    }
    else if (isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors);
        const vc = getAliasCount(doc, node.value, anchors);
        return Math.max(kc, vc);
    }
    return 1;
}

/**
 * Recursively convert any node or its contents to native JavaScript
 *
 * @param value - The input value
 * @param arg - If `value` defines a `toJSON()` method, use this
 *   as its first argument
 * @param ctx - Conversion context, originally set in Document#toJS(). If
 *   `{ keep: true }` is not set, output should be suitable for JSON
 *   stringification.
 */
function toJS(value, arg, ctx) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
    if (value && typeof value.toJSON === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (!ctx || !hasAnchor(value))
            return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: undefined };
        ctx.anchors.set(value, data);
        ctx.onCreate = res => {
            data.res = res;
            delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
            ctx.onCreate(res);
        return res;
    }
    if (typeof value === 'bigint' && !ctx?.keep)
        return Number(value);
    return value;
}

const isScalarValue = (value) => !value || (typeof value !== 'function' && typeof value !== 'object');
class Scalar extends NodeBase {
    constructor(value) {
        super(SCALAR$1);
        this.value = value;
    }
    toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS(this.value, arg, ctx);
    }
    toString() {
        return String(this.value);
    }
}
Scalar.BLOCK_FOLDED = 'BLOCK_FOLDED';
Scalar.BLOCK_LITERAL = 'BLOCK_LITERAL';
Scalar.PLAIN = 'PLAIN';
Scalar.QUOTE_DOUBLE = 'QUOTE_DOUBLE';
Scalar.QUOTE_SINGLE = 'QUOTE_SINGLE';

const defaultTagPrefix = 'tag:yaml.org,2002:';
function findTagObject(value, tagName, tags) {
    if (tagName) {
        const match = tags.filter(t => t.tag === tagName);
        const tagObj = match.find(t => !t.format) ?? match[0];
        if (!tagObj)
            throw new Error(`Tag ${tagName} not found`);
        return tagObj;
    }
    return tags.find(t => t.identify?.(value) && !t.format);
}
function createNode(value, tagName, ctx) {
    if (isDocument(value))
        value = value.contents;
    if (isNode(value))
        return value;
    if (isPair(value)) {
        const map = ctx.schema[MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
    }
    if (value instanceof String ||
        value instanceof Number ||
        value instanceof Boolean ||
        (typeof BigInt !== 'undefined' && value instanceof BigInt) // not supported everywhere
    ) {
        // https://tc39.es/ecma262/#sec-serializejsonproperty
        value = value.valueOf();
    }
    const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
    // Detect duplicate references to the same object & use Alias nodes for all
    // after first. The `ref` wrapper allows for circular references to resolve.
    let ref = undefined;
    if (aliasDuplicateObjects && value && typeof value === 'object') {
        ref = sourceObjects.get(value);
        if (ref) {
            if (!ref.anchor)
                ref.anchor = onAnchor(value);
            return new Alias(ref.anchor);
        }
        else {
            ref = { anchor: null, node: null };
            sourceObjects.set(value, ref);
        }
    }
    if (tagName?.startsWith('!!'))
        tagName = defaultTagPrefix + tagName.slice(2);
    let tagObj = findTagObject(value, tagName, schema.tags);
    if (!tagObj) {
        if (value && typeof value.toJSON === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            value = value.toJSON();
        }
        if (!value || typeof value !== 'object') {
            const node = new Scalar(value);
            if (ref)
                ref.node = node;
            return node;
        }
        tagObj =
            value instanceof Map
                ? schema[MAP]
                : Symbol.iterator in Object(value)
                    ? schema[SEQ]
                    : schema[MAP];
    }
    if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
    }
    const node = tagObj?.createNode
        ? tagObj.createNode(ctx.schema, value, ctx)
        : new Scalar(value);
    if (tagName)
        node.tag = tagName;
    if (ref)
        ref.node = node;
    return node;
}

function collectionFromPath(schema, path, value) {
    let v = value;
    for (let i = path.length - 1; i >= 0; --i) {
        const k = path[i];
        if (typeof k === 'number' && Number.isInteger(k) && k >= 0) {
            const a = [];
            a[k] = v;
            v = a;
        }
        else {
            v = new Map([[k, v]]);
        }
    }
    return createNode(v, undefined, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
            throw new Error('This should not happen, please report a bug.');
        },
        schema,
        sourceObjects: new Map()
    });
}
// Type guard is intentionally a little wrong so as to be more useful,
// as it does not cover untypable empty non-string iterables (e.g. []).
const isEmptyPath = (path) => path == null ||
    (typeof path === 'object' && !!path[Symbol.iterator]().next().done);
class Collection extends NodeBase {
    constructor(type, schema) {
        super(type);
        Object.defineProperty(this, 'schema', {
            value: schema,
            configurable: true,
            enumerable: false,
            writable: true
        });
    }
    /**
     * Create a copy of this collection.
     *
     * @param schema - If defined, overwrites the original's schema
     */
    clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
            copy.schema = schema;
        copy.items = copy.items.map(it => isNode(it) || isPair(it) ? it.clone(schema) : it);
        if (this.range)
            copy.range = this.range.slice();
        return copy;
    }
    /**
     * Adds a value to the collection. For `!!map` and `!!omap` the value must
     * be a Pair instance or a `{ key, value }` object, which may not have a key
     * that already exists in the map.
     */
    addIn(path, value) {
        if (isEmptyPath(path))
            this.add(value);
        else {
            const [key, ...rest] = path;
            const node = this.get(key, true);
            if (isCollection$1(node))
                node.addIn(rest, value);
            else if (node === undefined && this.schema)
                this.set(key, collectionFromPath(this.schema, rest, value));
            else
                throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
    }
    /**
     * Removes a value from the collection.
     * @returns `true` if the item was found and removed.
     */
    deleteIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
            return this.delete(key);
        const node = this.get(key, true);
        if (isCollection$1(node))
            return node.deleteIn(rest);
        else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
    /**
     * Returns item at `key`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    getIn(path, keepScalar) {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (rest.length === 0)
            return !keepScalar && isScalar$1(node) ? node.value : node;
        else
            return isCollection$1(node) ? node.getIn(rest, keepScalar) : undefined;
    }
    hasAllNullValues(allowScalar) {
        return this.items.every(node => {
            if (!isPair(node))
                return false;
            const n = node.value;
            return (n == null ||
                (allowScalar &&
                    isScalar$1(n) &&
                    n.value == null &&
                    !n.commentBefore &&
                    !n.comment &&
                    !n.tag));
        });
    }
    /**
     * Checks if the collection includes a value with the key `key`.
     */
    hasIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
            return this.has(key);
        const node = this.get(key, true);
        return isCollection$1(node) ? node.hasIn(rest) : false;
    }
    /**
     * Sets a value in this collection. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    setIn(path, value) {
        const [key, ...rest] = path;
        if (rest.length === 0) {
            this.set(key, value);
        }
        else {
            const node = this.get(key, true);
            if (isCollection$1(node))
                node.setIn(rest, value);
            else if (node === undefined && this.schema)
                this.set(key, collectionFromPath(this.schema, rest, value));
            else
                throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
    }
}
Collection.maxFlowStringSingleLineLength = 60;

/**
 * Stringifies a comment.
 *
 * Empty comment lines are left empty,
 * lines consisting of a single space are replaced by `#`,
 * and all other lines are prefixed with a `#`.
 */
const stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, '#');
function indentComment(comment, indent) {
    if (/^\n+$/.test(comment))
        return comment.substring(1);
    return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
}
const lineComment = (str, indent, comment) => str.endsWith('\n')
    ? indentComment(comment, indent)
    : comment.includes('\n')
        ? '\n' + indentComment(comment, indent)
        : (str.endsWith(' ') ? '' : ' ') + comment;

const FOLD_FLOW = 'flow';
const FOLD_BLOCK = 'block';
const FOLD_QUOTED = 'quoted';
/**
 * Tries to keep input at up to `lineWidth` characters, splitting only on spaces
 * not followed by newlines or spaces unless `mode` is `'quoted'`. Lines are
 * terminated with `\n` and started with `indent`.
 */
function foldFlowLines(text, indent, mode = 'flow', { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
    if (!lineWidth || lineWidth < 0)
        return text;
    const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
    if (text.length <= endStep)
        return text;
    const folds = [];
    const escapedFolds = {};
    let end = lineWidth - indent.length;
    if (typeof indentAtStart === 'number') {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
            folds.push(0);
        else
            end = lineWidth - indentAtStart;
    }
    let split = undefined;
    let prev = undefined;
    let overflow = false;
    let i = -1;
    let escStart = -1;
    let escEnd = -1;
    if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i);
        if (i !== -1)
            end = i + endStep;
    }
    for (let ch; (ch = text[(i += 1)]);) {
        if (mode === FOLD_QUOTED && ch === '\\') {
            escStart = i;
            switch (text[i + 1]) {
                case 'x':
                    i += 3;
                    break;
                case 'u':
                    i += 5;
                    break;
                case 'U':
                    i += 9;
                    break;
                default:
                    i += 1;
            }
            escEnd = i;
        }
        if (ch === '\n') {
            if (mode === FOLD_BLOCK)
                i = consumeMoreIndentedLines(text, i);
            end = i + endStep;
            split = undefined;
        }
        else {
            if (ch === ' ' &&
                prev &&
                prev !== ' ' &&
                prev !== '\n' &&
                prev !== '\t') {
                // space surrounded by non-space can be replaced with newline + indent
                const next = text[i + 1];
                if (next && next !== ' ' && next !== '\n' && next !== '\t')
                    split = i;
            }
            if (i >= end) {
                if (split) {
                    folds.push(split);
                    end = split + endStep;
                    split = undefined;
                }
                else if (mode === FOLD_QUOTED) {
                    // white-space collected at end may stretch past lineWidth
                    while (prev === ' ' || prev === '\t') {
                        prev = ch;
                        ch = text[(i += 1)];
                        overflow = true;
                    }
                    // Account for newline escape, but don't break preceding escape
                    const j = i > escEnd + 1 ? i - 2 : escStart - 1;
                    // Bail out if lineWidth & minContentWidth are shorter than an escape string
                    if (escapedFolds[j])
                        return text;
                    folds.push(j);
                    escapedFolds[j] = true;
                    end = j + endStep;
                    split = undefined;
                }
                else {
                    overflow = true;
                }
            }
        }
        prev = ch;
    }
    if (overflow && onOverflow)
        onOverflow();
    if (folds.length === 0)
        return text;
    if (onFold)
        onFold();
    let res = text.slice(0, folds[0]);
    for (let i = 0; i < folds.length; ++i) {
        const fold = folds[i];
        const end = folds[i + 1] || text.length;
        if (fold === 0)
            res = `\n${indent}${text.slice(0, end)}`;
        else {
            if (mode === FOLD_QUOTED && escapedFolds[fold])
                res += `${text[fold]}\\`;
            res += `\n${indent}${text.slice(fold + 1, end)}`;
        }
    }
    return res;
}
/**
 * Presumes `i + 1` is at the start of a line
 * @returns index of last newline in more-indented block
 */
function consumeMoreIndentedLines(text, i) {
    let ch = text[i + 1];
    while (ch === ' ' || ch === '\t') {
        do {
            ch = text[(i += 1)];
        } while (ch && ch !== '\n');
        ch = text[i + 1];
    }
    return i;
}

const getFoldOptions = (ctx) => ({
    indentAtStart: ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth
});
// Also checks for lines starting with %, as parsing the output as YAML 1.1 will
// presume that's starting a new document.
const containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
function lineLengthOverLimit(str, lineWidth, indentLength) {
    if (!lineWidth || lineWidth < 0)
        return false;
    const limit = lineWidth - indentLength;
    const strLen = str.length;
    if (strLen <= limit)
        return false;
    for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === '\n') {
            if (i - start > limit)
                return true;
            start = i + 1;
            if (strLen - start <= limit)
                return false;
        }
    }
    return true;
}
function doubleQuotedString(value, ctx) {
    const json = JSON.stringify(value);
    if (ctx.options.doubleQuotedAsJSON)
        return json;
    const { implicitKey } = ctx;
    const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
    const indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
    let str = '';
    let start = 0;
    for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === ' ' && json[i + 1] === '\\' && json[i + 2] === 'n') {
            // space before newline needs to be escaped to not be folded
            str += json.slice(start, i) + '\\ ';
            i += 1;
            start = i;
            ch = '\\';
        }
        if (ch === '\\')
            switch (json[i + 1]) {
                case 'u':
                    {
                        str += json.slice(start, i);
                        const code = json.substr(i + 2, 4);
                        switch (code) {
                            case '0000':
                                str += '\\0';
                                break;
                            case '0007':
                                str += '\\a';
                                break;
                            case '000b':
                                str += '\\v';
                                break;
                            case '001b':
                                str += '\\e';
                                break;
                            case '0085':
                                str += '\\N';
                                break;
                            case '00a0':
                                str += '\\_';
                                break;
                            case '2028':
                                str += '\\L';
                                break;
                            case '2029':
                                str += '\\P';
                                break;
                            default:
                                if (code.substr(0, 2) === '00')
                                    str += '\\x' + code.substr(2);
                                else
                                    str += json.substr(i, 6);
                        }
                        i += 5;
                        start = i + 1;
                    }
                    break;
                case 'n':
                    if (implicitKey ||
                        json[i + 2] === '"' ||
                        json.length < minMultiLineLength) {
                        i += 1;
                    }
                    else {
                        // folding will eat first newline
                        str += json.slice(start, i) + '\n\n';
                        while (json[i + 2] === '\\' &&
                            json[i + 3] === 'n' &&
                            json[i + 4] !== '"') {
                            str += '\n';
                            i += 2;
                        }
                        str += indent;
                        // space after newline needs to be escaped to not be folded
                        if (json[i + 2] === ' ')
                            str += '\\';
                        i += 1;
                        start = i + 1;
                    }
                    break;
                default:
                    i += 1;
            }
    }
    str = start ? str + json.slice(start) : json;
    return implicitKey
        ? str
        : foldFlowLines(str, indent, FOLD_QUOTED, getFoldOptions(ctx));
}
function singleQuotedString(value, ctx) {
    if (ctx.options.singleQuote === false ||
        (ctx.implicitKey && value.includes('\n')) ||
        /[ \t]\n|\n[ \t]/.test(value) // single quoted string can't have leading or trailing whitespace around newline
    )
        return doubleQuotedString(value, ctx);
    const indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
    const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&\n${indent}`) + "'";
    return ctx.implicitKey
        ? res
        : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx));
}
function quotedString(value, ctx) {
    const { singleQuote } = ctx.options;
    let qs;
    if (singleQuote === false)
        qs = doubleQuotedString;
    else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
            qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
            qs = doubleQuotedString;
        else
            qs = singleQuote ? singleQuotedString : doubleQuotedString;
    }
    return qs(value, ctx);
}
function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
    const { blockQuote, commentString, lineWidth } = ctx.options;
    // 1. Block can't end in whitespace unless the last line is non-empty.
    // 2. Strings consisting of only whitespace are best rendered explicitly.
    if (!blockQuote || /\n[\t ]+$/.test(value) || /^\s*$/.test(value)) {
        return quotedString(value, ctx);
    }
    const indent = ctx.indent ||
        (ctx.forceBlockIndent || containsDocumentMarker(value) ? '  ' : '');
    const literal = blockQuote === 'literal'
        ? true
        : blockQuote === 'folded' || type === Scalar.BLOCK_FOLDED
            ? false
            : type === Scalar.BLOCK_LITERAL
                ? true
                : !lineLengthOverLimit(value, lineWidth, indent.length);
    if (!value)
        return literal ? '|\n' : '>\n';
    // determine chomping from whitespace at value end
    let chomp;
    let endStart;
    for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== '\n' && ch !== '\t' && ch !== ' ')
            break;
    }
    let end = value.substring(endStart);
    const endNlPos = end.indexOf('\n');
    if (endNlPos === -1) {
        chomp = '-'; // strip
    }
    else if (value === end || endNlPos !== end.length - 1) {
        chomp = '+'; // keep
        if (onChompKeep)
            onChompKeep();
    }
    else {
        chomp = ''; // clip
    }
    if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === '\n')
            end = end.slice(0, -1);
        end = end.replace(/\n+(?!\n|$)/g, `$&${indent}`);
    }
    // determine indent indicator from whitespace at value start
    let startWithSpace = false;
    let startEnd;
    let startNlPos = -1;
    for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === ' ')
            startWithSpace = true;
        else if (ch === '\n')
            startNlPos = startEnd;
        else
            break;
    }
    let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
    if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
    }
    const indentSize = indent ? '2' : '1'; // root is at -1
    let header = (literal ? '|' : '>') + (startWithSpace ? indentSize : '') + chomp;
    if (comment) {
        header += ' ' + commentString(comment.replace(/ ?[\r\n]+/g, ' '));
        if (onComment)
            onComment();
    }
    if (literal) {
        value = value.replace(/\n+/g, `$&${indent}`);
        return `${header}\n${indent}${start}${value}${end}`;
    }
    value = value
        .replace(/\n+/g, '\n$&')
        .replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, '$1$2') // more-indented lines aren't folded
        //                ^ more-ind. ^ empty     ^ capture next empty lines only at end of indent
        .replace(/\n+/g, `$&${indent}`);
    const body = foldFlowLines(`${start}${value}${end}`, indent, FOLD_BLOCK, getFoldOptions(ctx));
    return `${header}\n${indent}${body}`;
}
function plainString(item, ctx, onComment, onChompKeep) {
    const { type, value } = item;
    const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
    if ((implicitKey && /[\n[\]{},]/.test(value)) ||
        (inFlow && /[[\]{},]/.test(value))) {
        return quotedString(value, ctx);
    }
    if (!value ||
        /^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        // not allowed:
        // - empty string, '-' or '?'
        // - start with an indicator character (except [?:-]) or /[?-] /
        // - '\n ', ': ' or ' \n' anywhere
        // - '#' not preceded by a non-space char
        // - end with ' ' or ':'
        return implicitKey || inFlow || !value.includes('\n')
            ? quotedString(value, ctx)
            : blockString(item, ctx, onComment, onChompKeep);
    }
    if (!implicitKey &&
        !inFlow &&
        type !== Scalar.PLAIN &&
        value.includes('\n')) {
        // Where allowed & type not set explicitly, prefer block style for multiline strings
        return blockString(item, ctx, onComment, onChompKeep);
    }
    if (containsDocumentMarker(value)) {
        if (indent === '') {
            ctx.forceBlockIndent = true;
            return blockString(item, ctx, onComment, onChompKeep);
        }
        else if (implicitKey && indent === indentStep) {
            return quotedString(value, ctx);
        }
    }
    const str = value.replace(/\n+/g, `$&\n${indent}`);
    // Verify that output will be parsed as a string, as e.g. plain numbers and
    // booleans get parsed with those types in v1.2 (e.g. '42', 'true' & '0.9e-3'),
    // and others in v1.1.
    if (actualString) {
        const test = (tag) => tag.default && tag.tag !== 'tag:yaml.org,2002:str' && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
            return quotedString(value, ctx);
    }
    return implicitKey
        ? str
        : foldFlowLines(str, indent, FOLD_FLOW, getFoldOptions(ctx));
}
function stringifyString(item, ctx, onComment, onChompKeep) {
    const { implicitKey, inFlow } = ctx;
    const ss = typeof item.value === 'string'
        ? item
        : Object.assign({}, item, { value: String(item.value) });
    let { type } = item;
    if (type !== Scalar.QUOTE_DOUBLE) {
        // force double quotes on control characters & unpaired surrogates
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
            type = Scalar.QUOTE_DOUBLE;
    }
    const _stringify = (_type) => {
        switch (_type) {
            case Scalar.BLOCK_FOLDED:
            case Scalar.BLOCK_LITERAL:
                return implicitKey || inFlow
                    ? quotedString(ss.value, ctx) // blocks are not valid inside flow containers
                    : blockString(ss, ctx, onComment, onChompKeep);
            case Scalar.QUOTE_DOUBLE:
                return doubleQuotedString(ss.value, ctx);
            case Scalar.QUOTE_SINGLE:
                return singleQuotedString(ss.value, ctx);
            case Scalar.PLAIN:
                return plainString(ss, ctx, onComment, onChompKeep);
            default:
                return null;
        }
    };
    let res = _stringify(type);
    if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = (implicitKey && defaultKeyType) || defaultStringType;
        res = _stringify(t);
        if (res === null)
            throw new Error(`Unsupported default string type ${t}`);
    }
    return res;
}

function createStringifyContext(doc, options) {
    const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment,
        defaultKeyType: null,
        defaultStringType: 'PLAIN',
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: 'false',
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: 'null',
        simpleKeys: false,
        singleQuote: null,
        trueStr: 'true',
        verifyAliasOrder: true
    }, doc.schema.toStringOptions, options);
    let inFlow;
    switch (opt.collectionStyle) {
        case 'block':
            inFlow = false;
            break;
        case 'flow':
            inFlow = true;
            break;
        default:
            inFlow = null;
    }
    return {
        anchors: new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? ' ' : '',
        indent: '',
        indentStep: typeof opt.indent === 'number' ? ' '.repeat(opt.indent) : '  ',
        inFlow,
        options: opt
    };
}
function getTagObject(tags, item) {
    if (item.tag) {
        const match = tags.filter(t => t.tag === item.tag);
        if (match.length > 0)
            return match.find(t => t.format === item.format) ?? match[0];
    }
    let tagObj = undefined;
    let obj;
    if (isScalar$1(item)) {
        obj = item.value;
        const match = tags.filter(t => t.identify?.(obj));
        tagObj =
            match.find(t => t.format === item.format) ?? match.find(t => !t.format);
    }
    else {
        obj = item;
        tagObj = tags.find(t => t.nodeClass && obj instanceof t.nodeClass);
    }
    if (!tagObj) {
        const name = obj?.constructor?.name ?? typeof obj;
        throw new Error(`Tag not resolved for ${name} value`);
    }
    return tagObj;
}
// needs to be called before value stringifier to allow for circular anchor refs
function stringifyProps(node, tagObj, { anchors, doc }) {
    if (!doc.directives)
        return '';
    const props = [];
    const anchor = (isScalar$1(node) || isCollection$1(node)) && node.anchor;
    if (anchor && anchorIsValid(anchor)) {
        anchors.add(anchor);
        props.push(`&${anchor}`);
    }
    const tag = node.tag ? node.tag : tagObj.default ? null : tagObj.tag;
    if (tag)
        props.push(doc.directives.tagString(tag));
    return props.join(' ');
}
function stringify$2(item, ctx, onComment, onChompKeep) {
    if (isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
    if (isAlias(item)) {
        if (ctx.doc.directives)
            return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
            throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        }
        else {
            if (ctx.resolvedAliases)
                ctx.resolvedAliases.add(item);
            else
                ctx.resolvedAliases = new Set([item]);
            item = item.resolve(ctx.doc);
        }
    }
    let tagObj = undefined;
    const node = isNode(item)
        ? item
        : ctx.doc.createNode(item, { onTagObj: o => (tagObj = o) });
    if (!tagObj)
        tagObj = getTagObject(ctx.doc.schema.tags, node);
    const props = stringifyProps(node, tagObj, ctx);
    if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
    const str = typeof tagObj.stringify === 'function'
        ? tagObj.stringify(node, ctx, onComment, onChompKeep)
        : isScalar$1(node)
            ? stringifyString(node, ctx, onComment, onChompKeep)
            : node.toString(ctx, onComment, onChompKeep);
    if (!props)
        return str;
    return isScalar$1(node) || str[0] === '{' || str[0] === '['
        ? `${props} ${str}`
        : `${props}\n${ctx.indent}${str}`;
}

function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
    const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
    let keyComment = (isNode(key) && key.comment) || null;
    if (simpleKeys) {
        if (keyComment) {
            throw new Error('With simple keys, key nodes cannot have comments');
        }
        if (isCollection$1(key)) {
            const msg = 'With simple keys, collection cannot be used as a key value';
            throw new Error(msg);
        }
    }
    let explicitKey = !simpleKeys &&
        (!key ||
            (keyComment && value == null && !ctx.inFlow) ||
            isCollection$1(key) ||
            (isScalar$1(key)
                ? key.type === Scalar.BLOCK_FOLDED || key.type === Scalar.BLOCK_LITERAL
                : typeof key === 'object'));
    ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
    });
    let keyCommentDone = false;
    let chompKeep = false;
    let str = stringify$2(key, ctx, () => (keyCommentDone = true), () => (chompKeep = true));
    if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
            throw new Error('With simple keys, single line scalar must not span more than 1024 characters');
        explicitKey = true;
    }
    if (ctx.inFlow) {
        if (allNullValues || value == null) {
            if (keyCommentDone && onComment)
                onComment();
            return str === '' ? '?' : explicitKey ? `? ${str}` : str;
        }
    }
    else if ((allNullValues && !simpleKeys) || (value == null && explicitKey)) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
            str += lineComment(str, ctx.indent, commentString(keyComment));
        }
        else if (chompKeep && onChompKeep)
            onChompKeep();
        return str;
    }
    if (keyCommentDone)
        keyComment = null;
    if (explicitKey) {
        if (keyComment)
            str += lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}\n${indent}:`;
    }
    else {
        str = `${str}:`;
        if (keyComment)
            str += lineComment(str, ctx.indent, commentString(keyComment));
    }
    let vsb, vcb, valueComment;
    if (isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
    }
    else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === 'object')
            value = doc.createNode(value);
    }
    ctx.implicitKey = false;
    if (!explicitKey && !keyComment && isScalar$1(value))
        ctx.indentAtStart = str.length + 1;
    chompKeep = false;
    if (!indentSeq &&
        indentStep.length >= 2 &&
        !ctx.inFlow &&
        !explicitKey &&
        isSeq(value) &&
        !value.flow &&
        !value.tag &&
        !value.anchor) {
        // If indentSeq === false, consider '- ' as part of indentation where possible
        ctx.indent = ctx.indent.substring(2);
    }
    let valueCommentDone = false;
    const valueStr = stringify$2(value, ctx, () => (valueCommentDone = true), () => (chompKeep = true));
    let ws = ' ';
    if (keyComment || vsb || vcb) {
        ws = vsb ? '\n' : '';
        if (vcb) {
            const cs = commentString(vcb);
            ws += `\n${indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === '' && !ctx.inFlow) {
            if (ws === '\n')
                ws = '\n\n';
        }
        else {
            ws += `\n${ctx.indent}`;
        }
    }
    else if (!explicitKey && isCollection$1(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf('\n');
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
            let hasPropsLine = false;
            if (hasNewline && (vs0 === '&' || vs0 === '!')) {
                let sp0 = valueStr.indexOf(' ');
                if (vs0 === '&' &&
                    sp0 !== -1 &&
                    sp0 < nl0 &&
                    valueStr[sp0 + 1] === '!') {
                    sp0 = valueStr.indexOf(' ', sp0 + 1);
                }
                if (sp0 === -1 || nl0 < sp0)
                    hasPropsLine = true;
            }
            if (!hasPropsLine)
                ws = `\n${ctx.indent}`;
        }
    }
    else if (valueStr === '' || valueStr[0] === '\n') {
        ws = '';
    }
    str += ws + valueStr;
    if (ctx.inFlow) {
        if (valueCommentDone && onComment)
            onComment();
    }
    else if (valueComment && !valueCommentDone) {
        str += lineComment(str, ctx.indent, commentString(valueComment));
    }
    else if (chompKeep && onChompKeep) {
        onChompKeep();
    }
    return str;
}

function warn(logLevel, warning) {
    if (logLevel === 'debug' || logLevel === 'warn') {
        if (typeof process !== 'undefined' && process.emitWarning)
            process.emitWarning(warning);
        else
            console.warn(warning);
    }
}

const MERGE_KEY = '<<';
function addPairToJSMap(ctx, map, { key, value }) {
    if (ctx?.doc.schema.merge && isMergeKey(key)) {
        value = isAlias(value) ? value.resolve(ctx.doc) : value;
        if (isSeq(value))
            for (const it of value.items)
                mergeToJSMap(ctx, map, it);
        else if (Array.isArray(value))
            for (const it of value)
                mergeToJSMap(ctx, map, it);
        else
            mergeToJSMap(ctx, map, value);
    }
    else {
        const jsKey = toJS(key, '', ctx);
        if (map instanceof Map) {
            map.set(jsKey, toJS(value, jsKey, ctx));
        }
        else if (map instanceof Set) {
            map.add(jsKey);
        }
        else {
            const stringKey = stringifyKey(key, jsKey, ctx);
            const jsValue = toJS(value, stringKey, ctx);
            if (stringKey in map)
                Object.defineProperty(map, stringKey, {
                    value: jsValue,
                    writable: true,
                    enumerable: true,
                    configurable: true
                });
            else
                map[stringKey] = jsValue;
        }
    }
    return map;
}
const isMergeKey = (key) => key === MERGE_KEY ||
    (isScalar$1(key) &&
        key.value === MERGE_KEY &&
        (!key.type || key.type === Scalar.PLAIN));
// If the value associated with a merge key is a single mapping node, each of
// its key/value pairs is inserted into the current mapping, unless the key
// already exists in it. If the value associated with the merge key is a
// sequence, then this sequence is expected to contain mapping nodes and each
// of these nodes is merged in turn according to its order in the sequence.
// Keys in mapping nodes earlier in the sequence override keys specified in
// later mapping nodes. -- http://yaml.org/type/merge.html
function mergeToJSMap(ctx, map, value) {
    const source = ctx && isAlias(value) ? value.resolve(ctx.doc) : value;
    if (!isMap(source))
        throw new Error('Merge sources must be maps or map aliases');
    const srcMap = source.toJSON(null, ctx, Map);
    for (const [key, value] of srcMap) {
        if (map instanceof Map) {
            if (!map.has(key))
                map.set(key, value);
        }
        else if (map instanceof Set) {
            map.add(key);
        }
        else if (!Object.prototype.hasOwnProperty.call(map, key)) {
            Object.defineProperty(map, key, {
                value,
                writable: true,
                enumerable: true,
                configurable: true
            });
        }
    }
    return map;
}
function stringifyKey(key, jsKey, ctx) {
    if (jsKey === null)
        return '';
    if (typeof jsKey !== 'object')
        return String(jsKey);
    if (isNode(key) && ctx && ctx.doc) {
        const strCtx = createStringifyContext(ctx.doc, {});
        strCtx.anchors = new Set();
        for (const node of ctx.anchors.keys())
            strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
            let jsonStr = JSON.stringify(strKey);
            if (jsonStr.length > 40)
                jsonStr = jsonStr.substring(0, 36) + '..."';
            warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
            ctx.mapKeyWarned = true;
        }
        return strKey;
    }
    return JSON.stringify(jsKey);
}

function createPair(key, value, ctx) {
    const k = createNode(key, undefined, ctx);
    const v = createNode(value, undefined, ctx);
    return new Pair(k, v);
}
class Pair {
    constructor(key, value = null) {
        Object.defineProperty(this, NODE_TYPE, { value: PAIR });
        this.key = key;
        this.value = value;
    }
    clone(schema) {
        let { key, value } = this;
        if (isNode(key))
            key = key.clone(schema);
        if (isNode(value))
            value = value.clone(schema);
        return new Pair(key, value);
    }
    toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? new Map() : {};
        return addPairToJSMap(ctx, pair, this);
    }
    toString(ctx, onComment, onChompKeep) {
        return ctx?.doc
            ? stringifyPair(this, ctx, onComment, onChompKeep)
            : JSON.stringify(this);
    }
}

function stringifyCollection(collection, ctx, options) {
    const flow = ctx.inFlow ?? collection.flow;
    const stringify = flow ? stringifyFlowCollection : stringifyBlockCollection;
    return stringify(collection, ctx, options);
}
function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
    const { indent, options: { commentString } } = ctx;
    const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
    let chompKeep = false; // flag for the preceding node's status
    const lines = [];
    for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (isNode(item)) {
            if (!chompKeep && item.spaceBefore)
                lines.push('');
            addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
            if (item.comment)
                comment = item.comment;
        }
        else if (isPair(item)) {
            const ik = isNode(item.key) ? item.key : null;
            if (ik) {
                if (!chompKeep && ik.spaceBefore)
                    lines.push('');
                addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
            }
        }
        chompKeep = false;
        let str = stringify$2(item, itemCtx, () => (comment = null), () => (chompKeep = true));
        if (comment)
            str += lineComment(str, itemIndent, commentString(comment));
        if (chompKeep && comment)
            chompKeep = false;
        lines.push(blockItemPrefix + str);
    }
    let str;
    if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
    }
    else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
            const line = lines[i];
            str += line ? `\n${indent}${line}` : '\n';
        }
    }
    if (comment) {
        str += '\n' + indentComment(commentString(comment), indent);
        if (onComment)
            onComment();
    }
    else if (chompKeep && onChompKeep)
        onChompKeep();
    return str;
}
function stringifyFlowCollection({ comment, items }, ctx, { flowChars, itemIndent, onComment }) {
    const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
    itemIndent += indentStep;
    const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
    });
    let reqNewline = false;
    let linesAtValue = 0;
    const lines = [];
    for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (isNode(item)) {
            if (item.spaceBefore)
                lines.push('');
            addCommentBefore(ctx, lines, item.commentBefore, false);
            if (item.comment)
                comment = item.comment;
        }
        else if (isPair(item)) {
            const ik = isNode(item.key) ? item.key : null;
            if (ik) {
                if (ik.spaceBefore)
                    lines.push('');
                addCommentBefore(ctx, lines, ik.commentBefore, false);
                if (ik.comment)
                    reqNewline = true;
            }
            const iv = isNode(item.value) ? item.value : null;
            if (iv) {
                if (iv.comment)
                    comment = iv.comment;
                if (iv.commentBefore)
                    reqNewline = true;
            }
            else if (item.value == null && ik && ik.comment) {
                comment = ik.comment;
            }
        }
        if (comment)
            reqNewline = true;
        let str = stringify$2(item, itemCtx, () => (comment = null));
        if (i < items.length - 1)
            str += ',';
        if (comment)
            str += lineComment(str, itemIndent, commentString(comment));
        if (!reqNewline && (lines.length > linesAtValue || str.includes('\n')))
            reqNewline = true;
        lines.push(str);
        linesAtValue = lines.length;
    }
    let str;
    const { start, end } = flowChars;
    if (lines.length === 0) {
        str = start + end;
    }
    else {
        if (!reqNewline) {
            const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
            reqNewline = len > Collection.maxFlowStringSingleLineLength;
        }
        if (reqNewline) {
            str = start;
            for (const line of lines)
                str += line ? `\n${indentStep}${indent}${line}` : '\n';
            str += `\n${indent}${end}`;
        }
        else {
            str = `${start}${fcPadding}${lines.join(' ')}${fcPadding}${end}`;
        }
    }
    if (comment) {
        str += lineComment(str, commentString(comment), indent);
        if (onComment)
            onComment();
    }
    return str;
}
function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
    if (comment && chompKeep)
        comment = comment.replace(/^\n+/, '');
    if (comment) {
        const ic = indentComment(commentString(comment), indent);
        lines.push(ic.trimStart()); // Avoid double indent on first line
    }
}

function findPair(items, key) {
    const k = isScalar$1(key) ? key.value : key;
    for (const it of items) {
        if (isPair(it)) {
            if (it.key === key || it.key === k)
                return it;
            if (isScalar$1(it.key) && it.key.value === k)
                return it;
        }
    }
    return undefined;
}
class YAMLMap extends Collection {
    static get tagName() {
        return 'tag:yaml.org,2002:map';
    }
    constructor(schema) {
        super(MAP, schema);
        this.items = [];
    }
    /**
     * Adds a value to the collection.
     *
     * @param overwrite - If not set `true`, using a key that is already in the
     *   collection will throw. Otherwise, overwrites the previous value.
     */
    add(pair, overwrite) {
        let _pair;
        if (isPair(pair))
            _pair = pair;
        else if (!pair || typeof pair !== 'object' || !('key' in pair)) {
            // In TypeScript, this never happens.
            _pair = new Pair(pair, pair?.value);
        }
        else
            _pair = new Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
            if (!overwrite)
                throw new Error(`Key ${_pair.key} already set`);
            // For scalars, keep the old node & its comments and anchors
            if (isScalar$1(prev.value) && isScalarValue(_pair.value))
                prev.value.value = _pair.value;
            else
                prev.value = _pair.value;
        }
        else if (sortEntries) {
            const i = this.items.findIndex(item => sortEntries(_pair, item) < 0);
            if (i === -1)
                this.items.push(_pair);
            else
                this.items.splice(i, 0, _pair);
        }
        else {
            this.items.push(_pair);
        }
    }
    delete(key) {
        const it = findPair(this.items, key);
        if (!it)
            return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
    }
    get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && isScalar$1(node) ? node.value : node) ?? undefined;
    }
    has(key) {
        return !!findPair(this.items, key);
    }
    set(key, value) {
        this.add(new Pair(key, value), true);
    }
    /**
     * @param ctx - Conversion context, originally set in Document#toJS()
     * @param {Class} Type - If set, forces the returned collection type
     * @returns Instance of Type, Map, or Object
     */
    toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? new Map() : {};
        if (ctx?.onCreate)
            ctx.onCreate(map);
        for (const item of this.items)
            addPairToJSMap(ctx, map, item);
        return map;
    }
    toString(ctx, onComment, onChompKeep) {
        if (!ctx)
            return JSON.stringify(this);
        for (const item of this.items) {
            if (!isPair(item))
                throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
            ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection(this, ctx, {
            blockItemPrefix: '',
            flowChars: { start: '{', end: '}' },
            itemIndent: ctx.indent || '',
            onChompKeep,
            onComment
        });
    }
}

function createMap(schema, obj, ctx) {
    const { keepUndefined, replacer } = ctx;
    const map = new YAMLMap(schema);
    const add = (key, value) => {
        if (typeof replacer === 'function')
            value = replacer.call(obj, key, value);
        else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
        if (value !== undefined || keepUndefined)
            map.items.push(createPair(key, value, ctx));
    };
    if (obj instanceof Map) {
        for (const [key, value] of obj)
            add(key, value);
    }
    else if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj))
            add(key, obj[key]);
    }
    if (typeof schema.sortMapEntries === 'function') {
        map.items.sort(schema.sortMapEntries);
    }
    return map;
}
const map = {
    collection: 'map',
    createNode: createMap,
    default: true,
    nodeClass: YAMLMap,
    tag: 'tag:yaml.org,2002:map',
    resolve(map, onError) {
        if (!isMap(map))
            onError('Expected a mapping for this tag');
        return map;
    }
};

class YAMLSeq extends Collection {
    static get tagName() {
        return 'tag:yaml.org,2002:seq';
    }
    constructor(schema) {
        super(SEQ, schema);
        this.items = [];
    }
    add(value) {
        this.items.push(value);
    }
    /**
     * Removes a value from the collection.
     *
     * `key` must contain a representation of an integer for this to succeed.
     * It may be wrapped in a `Scalar`.
     *
     * @returns `true` if the item was found and removed.
     */
    delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== 'number')
            return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
    }
    get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== 'number')
            return undefined;
        const it = this.items[idx];
        return !keepScalar && isScalar$1(it) ? it.value : it;
    }
    /**
     * Checks if the collection includes a value with the key `key`.
     *
     * `key` must contain a representation of an integer for this to succeed.
     * It may be wrapped in a `Scalar`.
     */
    has(key) {
        const idx = asItemIndex(key);
        return typeof idx === 'number' && idx < this.items.length;
    }
    /**
     * Sets a value in this collection. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     *
     * If `key` does not contain a representation of an integer, this will throw.
     * It may be wrapped in a `Scalar`.
     */
    set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== 'number')
            throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (isScalar$1(prev) && isScalarValue(value))
            prev.value = value;
        else
            this.items[idx] = value;
    }
    toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
            ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
            seq.push(toJS(item, String(i++), ctx));
        return seq;
    }
    toString(ctx, onComment, onChompKeep) {
        if (!ctx)
            return JSON.stringify(this);
        return stringifyCollection(this, ctx, {
            blockItemPrefix: '- ',
            flowChars: { start: '[', end: ']' },
            itemIndent: (ctx.indent || '') + '  ',
            onChompKeep,
            onComment
        });
    }
}
function asItemIndex(key) {
    let idx = isScalar$1(key) ? key.value : key;
    if (idx && typeof idx === 'string')
        idx = Number(idx);
    return typeof idx === 'number' && Number.isInteger(idx) && idx >= 0
        ? idx
        : null;
}

function createSeq(schema, obj, ctx) {
    const { replacer } = ctx;
    const seq = new YAMLSeq(schema);
    if (obj && Symbol.iterator in Object(obj)) {
        let i = 0;
        for (let it of obj) {
            if (typeof replacer === 'function') {
                const key = obj instanceof Set ? it : String(i++);
                it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode(it, undefined, ctx));
        }
    }
    return seq;
}
const seq = {
    collection: 'seq',
    createNode: createSeq,
    default: true,
    nodeClass: YAMLSeq,
    tag: 'tag:yaml.org,2002:seq',
    resolve(seq, onError) {
        if (!isSeq(seq))
            onError('Expected a sequence for this tag');
        return seq;
    }
};

const string = {
    identify: value => typeof value === 'string',
    default: true,
    tag: 'tag:yaml.org,2002:str',
    resolve: str => str,
    stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString(item, ctx, onComment, onChompKeep);
    }
};

const nullTag = {
    identify: value => value == null,
    createNode: () => new Scalar(null),
    default: true,
    tag: 'tag:yaml.org,2002:null',
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new Scalar(null),
    stringify: ({ source }, ctx) => typeof source === 'string' && nullTag.test.test(source)
        ? source
        : ctx.options.nullStr
};

const boolTag = {
    identify: value => typeof value === 'boolean',
    default: true,
    tag: 'tag:yaml.org,2002:bool',
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: str => new Scalar(str[0] === 't' || str[0] === 'T'),
    stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
            const sv = source[0] === 't' || source[0] === 'T';
            if (value === sv)
                return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
};

function stringifyNumber({ format, minFractionDigits, tag, value }) {
    if (typeof value === 'bigint')
        return String(value);
    const num = typeof value === 'number' ? value : Number(value);
    if (!isFinite(num))
        return isNaN(num) ? '.nan' : num < 0 ? '-.inf' : '.inf';
    let n = JSON.stringify(value);
    if (!format &&
        minFractionDigits &&
        (!tag || tag === 'tag:yaml.org,2002:float') &&
        /^\d/.test(n)) {
        let i = n.indexOf('.');
        if (i < 0) {
            i = n.length;
            n += '.';
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
            n += '0';
    }
    return n;
}

const floatNaN$1 = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^(?:[-+]?\.(?:inf|Inf|INF|nan|NaN|NAN))$/,
    resolve: str => str.slice(-3).toLowerCase() === 'nan'
        ? NaN
        : str[0] === '-'
            ? Number.NEGATIVE_INFINITY
            : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber
};
const floatExp$1 = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    format: 'EXP',
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: str => parseFloat(str),
    stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber(node);
    }
};
const float$1 = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(str) {
        const node = new Scalar(parseFloat(str));
        const dot = str.indexOf('.');
        if (dot !== -1 && str[str.length - 1] === '0')
            node.minFractionDigits = str.length - dot - 1;
        return node;
    },
    stringify: stringifyNumber
};

const intIdentify$2 = (value) => typeof value === 'bigint' || Number.isInteger(value);
const intResolve$1 = (str, offset, radix, { intAsBigInt }) => (intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix));
function intStringify$1(node, radix, prefix) {
    const { value } = node;
    if (intIdentify$2(value) && value >= 0)
        return prefix + value.toString(radix);
    return stringifyNumber(node);
}
const intOct$1 = {
    identify: value => intIdentify$2(value) && value >= 0,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'OCT',
    test: /^0o[0-7]+$/,
    resolve: (str, _onError, opt) => intResolve$1(str, 2, 8, opt),
    stringify: node => intStringify$1(node, 8, '0o')
};
const int$1 = {
    identify: intIdentify$2,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    test: /^[-+]?[0-9]+$/,
    resolve: (str, _onError, opt) => intResolve$1(str, 0, 10, opt),
    stringify: stringifyNumber
};
const intHex$1 = {
    identify: value => intIdentify$2(value) && value >= 0,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'HEX',
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (str, _onError, opt) => intResolve$1(str, 2, 16, opt),
    stringify: node => intStringify$1(node, 16, '0x')
};

const schema$2 = [
    map,
    seq,
    string,
    nullTag,
    boolTag,
    intOct$1,
    int$1,
    intHex$1,
    floatNaN$1,
    floatExp$1,
    float$1
];

function intIdentify$1(value) {
    return typeof value === 'bigint' || Number.isInteger(value);
}
const stringifyJSON = ({ value }) => JSON.stringify(value);
const jsonScalars = [
    {
        identify: value => typeof value === 'string',
        default: true,
        tag: 'tag:yaml.org,2002:str',
        resolve: str => str,
        stringify: stringifyJSON
    },
    {
        identify: value => value == null,
        createNode: () => new Scalar(null),
        default: true,
        tag: 'tag:yaml.org,2002:null',
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
    },
    {
        identify: value => typeof value === 'boolean',
        default: true,
        tag: 'tag:yaml.org,2002:bool',
        test: /^true|false$/,
        resolve: str => str === 'true',
        stringify: stringifyJSON
    },
    {
        identify: intIdentify$1,
        default: true,
        tag: 'tag:yaml.org,2002:int',
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify$1(value) ? value.toString() : JSON.stringify(value)
    },
    {
        identify: value => typeof value === 'number',
        default: true,
        tag: 'tag:yaml.org,2002:float',
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: str => parseFloat(str),
        stringify: stringifyJSON
    }
];
const jsonError = {
    default: true,
    tag: '',
    test: /^/,
    resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
    }
};
const schema$1 = [map, seq].concat(jsonScalars, jsonError);

const binary = {
    identify: value => value instanceof Uint8Array,
    default: false,
    tag: 'tag:yaml.org,2002:binary',
    /**
     * Returns a Buffer in node and an Uint8Array in browsers
     *
     * To use the resulting buffer as an image, you'll want to do something like:
     *
     *   const blob = new Blob([buffer], { type: 'image/jpeg' })
     *   document.querySelector('#photo').src = URL.createObjectURL(blob)
     */
    resolve(src, onError) {
        if (typeof Buffer === 'function') {
            return Buffer.from(src, 'base64');
        }
        else if (typeof atob === 'function') {
            // On IE 11, atob() can't handle newlines
            const str = atob(src.replace(/[\n\r]/g, ''));
            const buffer = new Uint8Array(str.length);
            for (let i = 0; i < str.length; ++i)
                buffer[i] = str.charCodeAt(i);
            return buffer;
        }
        else {
            onError('This environment does not support reading binary tags; either Buffer or atob is required');
            return src;
        }
    },
    stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        const buf = value; // checked earlier by binary.identify()
        let str;
        if (typeof Buffer === 'function') {
            str =
                buf instanceof Buffer
                    ? buf.toString('base64')
                    : Buffer.from(buf.buffer).toString('base64');
        }
        else if (typeof btoa === 'function') {
            let s = '';
            for (let i = 0; i < buf.length; ++i)
                s += String.fromCharCode(buf[i]);
            str = btoa(s);
        }
        else {
            throw new Error('This environment does not support writing binary tags; either Buffer or btoa is required');
        }
        if (!type)
            type = Scalar.BLOCK_LITERAL;
        if (type !== Scalar.QUOTE_DOUBLE) {
            const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
            const n = Math.ceil(str.length / lineWidth);
            const lines = new Array(n);
            for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
                lines[i] = str.substr(o, lineWidth);
            }
            str = lines.join(type === Scalar.BLOCK_LITERAL ? '\n' : ' ');
        }
        return stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
    }
};

function resolvePairs(seq, onError) {
    if (isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
            let item = seq.items[i];
            if (isPair(item))
                continue;
            else if (isMap(item)) {
                if (item.items.length > 1)
                    onError('Each pair must have its own sequence indicator');
                const pair = item.items[0] || new Pair(new Scalar(null));
                if (item.commentBefore)
                    pair.key.commentBefore = pair.key.commentBefore
                        ? `${item.commentBefore}\n${pair.key.commentBefore}`
                        : item.commentBefore;
                if (item.comment) {
                    const cn = pair.value ?? pair.key;
                    cn.comment = cn.comment
                        ? `${item.comment}\n${cn.comment}`
                        : item.comment;
                }
                item = pair;
            }
            seq.items[i] = isPair(item) ? item : new Pair(item);
        }
    }
    else
        onError('Expected a sequence for this tag');
    return seq;
}
function createPairs(schema, iterable, ctx) {
    const { replacer } = ctx;
    const pairs = new YAMLSeq(schema);
    pairs.tag = 'tag:yaml.org,2002:pairs';
    let i = 0;
    if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
            if (typeof replacer === 'function')
                it = replacer.call(iterable, String(i++), it);
            let key, value;
            if (Array.isArray(it)) {
                if (it.length === 2) {
                    key = it[0];
                    value = it[1];
                }
                else
                    throw new TypeError(`Expected [key, value] tuple: ${it}`);
            }
            else if (it && it instanceof Object) {
                const keys = Object.keys(it);
                if (keys.length === 1) {
                    key = keys[0];
                    value = it[key];
                }
                else
                    throw new TypeError(`Expected { key: value } tuple: ${it}`);
            }
            else {
                key = it;
            }
            pairs.items.push(createPair(key, value, ctx));
        }
    return pairs;
}
const pairs = {
    collection: 'seq',
    default: false,
    tag: 'tag:yaml.org,2002:pairs',
    resolve: resolvePairs,
    createNode: createPairs
};

class YAMLOMap extends YAMLSeq {
    constructor() {
        super();
        this.add = YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.prototype.set.bind(this);
        this.tag = YAMLOMap.tag;
    }
    /**
     * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
     * but TypeScript won't allow widening the signature of a child method.
     */
    toJSON(_, ctx) {
        if (!ctx)
            return super.toJSON(_);
        const map = new Map();
        if (ctx?.onCreate)
            ctx.onCreate(map);
        for (const pair of this.items) {
            let key, value;
            if (isPair(pair)) {
                key = toJS(pair.key, '', ctx);
                value = toJS(pair.value, key, ctx);
            }
            else {
                key = toJS(pair, '', ctx);
            }
            if (map.has(key))
                throw new Error('Ordered maps must not include duplicate keys');
            map.set(key, value);
        }
        return map;
    }
}
YAMLOMap.tag = 'tag:yaml.org,2002:omap';
const omap = {
    collection: 'seq',
    identify: value => value instanceof Map,
    nodeClass: YAMLOMap,
    default: false,
    tag: 'tag:yaml.org,2002:omap',
    resolve(seq, onError) {
        const pairs = resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs.items) {
            if (isScalar$1(key)) {
                if (seenKeys.includes(key.value)) {
                    onError(`Ordered maps must not include duplicate keys: ${key.value}`);
                }
                else {
                    seenKeys.push(key.value);
                }
            }
        }
        return Object.assign(new YAMLOMap(), pairs);
    },
    createNode(schema, iterable, ctx) {
        const pairs = createPairs(schema, iterable, ctx);
        const omap = new YAMLOMap();
        omap.items = pairs.items;
        return omap;
    }
};

function boolStringify({ value, source }, ctx) {
    const boolObj = value ? trueTag : falseTag;
    if (source && boolObj.test.test(source))
        return source;
    return value ? ctx.options.trueStr : ctx.options.falseStr;
}
const trueTag = {
    identify: value => value === true,
    default: true,
    tag: 'tag:yaml.org,2002:bool',
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new Scalar(true),
    stringify: boolStringify
};
const falseTag = {
    identify: value => value === false,
    default: true,
    tag: 'tag:yaml.org,2002:bool',
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/i,
    resolve: () => new Scalar(false),
    stringify: boolStringify
};

const floatNaN = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^[-+]?\.(?:inf|Inf|INF|nan|NaN|NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === 'nan'
        ? NaN
        : str[0] === '-'
            ? Number.NEGATIVE_INFINITY
            : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber
};
const floatExp = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    format: 'EXP',
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str.replace(/_/g, '')),
    stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber(node);
    }
};
const float = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(str) {
        const node = new Scalar(parseFloat(str.replace(/_/g, '')));
        const dot = str.indexOf('.');
        if (dot !== -1) {
            const f = str.substring(dot + 1).replace(/_/g, '');
            if (f[f.length - 1] === '0')
                node.minFractionDigits = f.length;
        }
        return node;
    },
    stringify: stringifyNumber
};

const intIdentify = (value) => typeof value === 'bigint' || Number.isInteger(value);
function intResolve(str, offset, radix, { intAsBigInt }) {
    const sign = str[0];
    if (sign === '-' || sign === '+')
        offset += 1;
    str = str.substring(offset).replace(/_/g, '');
    if (intAsBigInt) {
        switch (radix) {
            case 2:
                str = `0b${str}`;
                break;
            case 8:
                str = `0o${str}`;
                break;
            case 16:
                str = `0x${str}`;
                break;
        }
        const n = BigInt(str);
        return sign === '-' ? BigInt(-1) * n : n;
    }
    const n = parseInt(str, radix);
    return sign === '-' ? -1 * n : n;
}
function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? '-' + prefix + str.substr(1) : prefix + str;
    }
    return stringifyNumber(node);
}
const intBin = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'BIN',
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
    stringify: node => intStringify(node, 2, '0b')
};
const intOct = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'OCT',
    test: /^[-+]?0[0-7_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
    stringify: node => intStringify(node, 8, '0')
};
const int = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber
};
const intHex = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'HEX',
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: node => intStringify(node, 16, '0x')
};

class YAMLSet extends YAMLMap {
    constructor(schema) {
        super(schema);
        this.tag = YAMLSet.tag;
    }
    add(key) {
        let pair;
        if (isPair(key))
            pair = key;
        else if (key &&
            typeof key === 'object' &&
            'key' in key &&
            'value' in key &&
            key.value === null)
            pair = new Pair(key.key, null);
        else
            pair = new Pair(key, null);
        const prev = findPair(this.items, pair.key);
        if (!prev)
            this.items.push(pair);
    }
    /**
     * If `keepPair` is `true`, returns the Pair matching `key`.
     * Otherwise, returns the value of that Pair's key.
     */
    get(key, keepPair) {
        const pair = findPair(this.items, key);
        return !keepPair && isPair(pair)
            ? isScalar$1(pair.key)
                ? pair.key.value
                : pair.key
            : pair;
    }
    set(key, value) {
        if (typeof value !== 'boolean')
            throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = findPair(this.items, key);
        if (prev && !value) {
            this.items.splice(this.items.indexOf(prev), 1);
        }
        else if (!prev && value) {
            this.items.push(new Pair(key));
        }
    }
    toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
    }
    toString(ctx, onComment, onChompKeep) {
        if (!ctx)
            return JSON.stringify(this);
        if (this.hasAllNullValues(true))
            return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
            throw new Error('Set items must all have null values');
    }
}
YAMLSet.tag = 'tag:yaml.org,2002:set';
const set = {
    collection: 'map',
    identify: value => value instanceof Set,
    nodeClass: YAMLSet,
    default: false,
    tag: 'tag:yaml.org,2002:set',
    resolve(map, onError) {
        if (isMap(map)) {
            if (map.hasAllNullValues(true))
                return Object.assign(new YAMLSet(), map);
            else
                onError('Set items must all have null values');
        }
        else
            onError('Expected a mapping for this tag');
        return map;
    },
    createNode(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set = new YAMLSet(schema);
        if (iterable && Symbol.iterator in Object(iterable))
            for (let value of iterable) {
                if (typeof replacer === 'function')
                    value = replacer.call(iterable, value, value);
                set.items.push(createPair(value, null, ctx));
            }
        return set;
    }
};

/** Internal types handle bigint as number, because TS can't figure it out. */
function parseSexagesimal(str, asBigInt) {
    const sign = str[0];
    const parts = sign === '-' || sign === '+' ? str.substring(1) : str;
    const num = (n) => asBigInt ? BigInt(n) : Number(n);
    const res = parts
        .replace(/_/g, '')
        .split(':')
        .reduce((res, p) => res * num(60) + num(p), num(0));
    return (sign === '-' ? num(-1) * res : res);
}
/**
 * hhhh:mm:ss.sss
 *
 * Internal types handle bigint as number, because TS can't figure it out.
 */
function stringifySexagesimal(node) {
    let { value } = node;
    let num = (n) => n;
    if (typeof value === 'bigint')
        num = n => BigInt(n);
    else if (isNaN(value) || !isFinite(value))
        return stringifyNumber(node);
    let sign = '';
    if (value < 0) {
        sign = '-';
        value *= num(-1);
    }
    const _60 = num(60);
    const parts = [value % _60]; // seconds, including ms
    if (value < 60) {
        parts.unshift(0); // at least one : is required
    }
    else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60); // minutes
        if (value >= 60) {
            value = (value - parts[0]) / _60;
            parts.unshift(value); // hours
        }
    }
    return (sign +
        parts
            .map(n => (n < 10 ? '0' + String(n) : String(n)))
            .join(':')
            .replace(/000000\d*$/, '') // % 60 may introduce error
    );
}
const intTime = {
    identify: value => typeof value === 'bigint' || Number.isInteger(value),
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'TIME',
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
    stringify: stringifySexagesimal
};
const floatTime = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    format: 'TIME',
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: str => parseSexagesimal(str, false),
    stringify: stringifySexagesimal
};
const timestamp = {
    identify: value => value instanceof Date,
    default: true,
    tag: 'tag:yaml.org,2002:timestamp',
    // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
    // may be omitted altogether, resulting in a date format. In such a case, the time part is
    // assumed to be 00:00:00Z (start of day, UTC).
    test: RegExp('^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})' + // YYYY-Mm-Dd
        '(?:' + // time is optional
        '(?:t|T|[ \\t]+)' + // t | T | whitespace
        '([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)' + // Hh:Mm:Ss(.ss)?
        '(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?' + // Z | +5 | -03:30
        ')?$'),
    resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
            throw new Error('!!timestamp expects a date, starting with yyyy-mm-dd');
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + '00').substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== 'Z') {
            let d = parseSexagesimal(tz, false);
            if (Math.abs(d) < 30)
                d *= 60;
            date -= 60000 * d;
        }
        return new Date(date);
    },
    stringify: ({ value }) => value.toISOString().replace(/((T00:00)?:00)?\.000Z$/, '')
};

const schema = [
    map,
    seq,
    string,
    nullTag,
    trueTag,
    falseTag,
    intBin,
    intOct,
    int,
    intHex,
    floatNaN,
    floatExp,
    float,
    binary,
    omap,
    pairs,
    set,
    intTime,
    floatTime,
    timestamp
];

const schemas = new Map([
    ['core', schema$2],
    ['failsafe', [map, seq, string]],
    ['json', schema$1],
    ['yaml11', schema],
    ['yaml-1.1', schema]
]);
const tagsByName = {
    binary,
    bool: boolTag,
    float: float$1,
    floatExp: floatExp$1,
    floatNaN: floatNaN$1,
    floatTime,
    int: int$1,
    intHex: intHex$1,
    intOct: intOct$1,
    intTime,
    map,
    null: nullTag,
    omap,
    pairs,
    seq,
    set,
    timestamp
};
const coreKnownTags = {
    'tag:yaml.org,2002:binary': binary,
    'tag:yaml.org,2002:omap': omap,
    'tag:yaml.org,2002:pairs': pairs,
    'tag:yaml.org,2002:set': set,
    'tag:yaml.org,2002:timestamp': timestamp
};
function getTags(customTags, schemaName) {
    let tags = schemas.get(schemaName);
    if (!tags) {
        if (Array.isArray(customTags))
            tags = [];
        else {
            const keys = Array.from(schemas.keys())
                .filter(key => key !== 'yaml11')
                .map(key => JSON.stringify(key))
                .join(', ');
            throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
    }
    if (Array.isArray(customTags)) {
        for (const tag of customTags)
            tags = tags.concat(tag);
    }
    else if (typeof customTags === 'function') {
        tags = customTags(tags.slice());
    }
    return tags.map(tag => {
        if (typeof tag !== 'string')
            return tag;
        const tagObj = tagsByName[tag];
        if (tagObj)
            return tagObj;
        const keys = Object.keys(tagsByName)
            .map(key => JSON.stringify(key))
            .join(', ');
        throw new Error(`Unknown custom tag "${tag}"; use one of ${keys}`);
    });
}

const sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
class Schema {
    constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat)
            ? getTags(compat, 'compat')
            : compat
                ? getTags(null, compat)
                : null;
        this.merge = !!merge;
        this.name = (typeof schema === 'string' && schema) || 'core';
        this.knownTags = resolveKnownTags ? coreKnownTags : {};
        this.tags = getTags(customTags, this.name);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, MAP, { value: map });
        Object.defineProperty(this, SCALAR$1, { value: string });
        Object.defineProperty(this, SEQ, { value: seq });
        // Used by createMap()
        this.sortMapEntries =
            typeof sortMapEntries === 'function'
                ? sortMapEntries
                : sortMapEntries === true
                    ? sortMapEntriesByKey
                    : null;
    }
    clone() {
        const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
    }
}

function stringifyDocument(doc, options) {
    const lines = [];
    let hasDirectives = options.directives === true;
    if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
            lines.push(dir);
            hasDirectives = true;
        }
        else if (doc.directives.docStart)
            hasDirectives = true;
    }
    if (hasDirectives)
        lines.push('---');
    const ctx = createStringifyContext(doc, options);
    const { commentString } = ctx.options;
    if (doc.commentBefore) {
        if (lines.length !== 1)
            lines.unshift('');
        const cs = commentString(doc.commentBefore);
        lines.unshift(indentComment(cs, ''));
    }
    let chompKeep = false;
    let contentComment = null;
    if (doc.contents) {
        if (isNode(doc.contents)) {
            if (doc.contents.spaceBefore && hasDirectives)
                lines.push('');
            if (doc.contents.commentBefore) {
                const cs = commentString(doc.contents.commentBefore);
                lines.push(indentComment(cs, ''));
            }
            // top-level block scalars need to be indented if followed by a comment
            ctx.forceBlockIndent = !!doc.comment;
            contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? undefined : () => (chompKeep = true);
        let body = stringify$2(doc.contents, ctx, () => (contentComment = null), onChompKeep);
        if (contentComment)
            body += lineComment(body, '', commentString(contentComment));
        if ((body[0] === '|' || body[0] === '>') &&
            lines[lines.length - 1] === '---') {
            // Top-level block scalars with a preceding doc marker ought to use the
            // same line for their header.
            lines[lines.length - 1] = `--- ${body}`;
        }
        else
            lines.push(body);
    }
    else {
        lines.push(stringify$2(doc.contents, ctx));
    }
    if (doc.directives?.docEnd) {
        if (doc.comment) {
            const cs = commentString(doc.comment);
            if (cs.includes('\n')) {
                lines.push('...');
                lines.push(indentComment(cs, ''));
            }
            else {
                lines.push(`... ${cs}`);
            }
        }
        else {
            lines.push('...');
        }
    }
    else {
        let dc = doc.comment;
        if (dc && chompKeep)
            dc = dc.replace(/^\n+/, '');
        if (dc) {
            if ((!chompKeep || contentComment) && lines[lines.length - 1] !== '')
                lines.push('');
            lines.push(indentComment(commentString(dc), ''));
        }
    }
    return lines.join('\n') + '\n';
}

/**
 * Applies the JSON.parse reviver algorithm as defined in the ECMA-262 spec,
 * in section 24.5.1.1 "Runtime Semantics: InternalizeJSONProperty" of the
 * 2021 edition: https://tc39.es/ecma262/#sec-json.parse
 *
 * Includes extensions for handling Map and Set objects.
 */
function applyReviver(reviver, obj, key, val) {
    if (val && typeof val === 'object') {
        if (Array.isArray(val)) {
            for (let i = 0, len = val.length; i < len; ++i) {
                const v0 = val[i];
                const v1 = applyReviver(reviver, val, String(i), v0);
                if (v1 === undefined)
                    delete val[i];
                else if (v1 !== v0)
                    val[i] = v1;
            }
        }
        else if (val instanceof Map) {
            for (const k of Array.from(val.keys())) {
                const v0 = val.get(k);
                const v1 = applyReviver(reviver, val, k, v0);
                if (v1 === undefined)
                    val.delete(k);
                else if (v1 !== v0)
                    val.set(k, v1);
            }
        }
        else if (val instanceof Set) {
            for (const v0 of Array.from(val)) {
                const v1 = applyReviver(reviver, val, v0, v0);
                if (v1 === undefined)
                    val.delete(v0);
                else if (v1 !== v0) {
                    val.delete(v0);
                    val.add(v1);
                }
            }
        }
        else {
            for (const [k, v0] of Object.entries(val)) {
                const v1 = applyReviver(reviver, val, k, v0);
                if (v1 === undefined)
                    delete val[k];
                else if (v1 !== v0)
                    val[k] = v1;
            }
        }
    }
    return reviver.call(obj, key, val);
}

class Document {
    constructor(value, replacer, options) {
        /** A comment before this Document */
        this.commentBefore = null;
        /** A comment immediately after this Document */
        this.comment = null;
        /** Errors encountered during parsing. */
        this.errors = [];
        /** Warnings encountered during parsing. */
        this.warnings = [];
        Object.defineProperty(this, NODE_TYPE, { value: DOC });
        let _replacer = null;
        if (typeof replacer === 'function' || Array.isArray(replacer)) {
            _replacer = replacer;
        }
        else if (options === undefined && replacer) {
            options = replacer;
            replacer = undefined;
        }
        const opt = Object.assign({
            intAsBigInt: false,
            keepSourceTokens: false,
            logLevel: 'warn',
            prettyErrors: true,
            strict: true,
            uniqueKeys: true,
            version: '1.2'
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
            this.directives = options._directives.atDocument();
            if (this.directives.yaml.explicit)
                version = this.directives.yaml.version;
        }
        else
            this.directives = new Directives({ version });
        this.setSchema(version, options);
        if (value === undefined)
            this.contents = null;
        else {
            this.contents = this.createNode(value, _replacer, options);
        }
    }
    /**
     * Create a deep copy of this Document and its contents.
     *
     * Custom Node values that inherit from `Object` still refer to their original instances.
     */
    clone() {
        const copy = Object.create(Document.prototype, {
            [NODE_TYPE]: { value: DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
            copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = isNode(this.contents)
            ? this.contents.clone(copy.schema)
            : this.contents;
        if (this.range)
            copy.range = this.range.slice();
        return copy;
    }
    /** Adds a value to the document. */
    add(value) {
        if (assertCollection(this.contents))
            this.contents.add(value);
    }
    /** Adds a value to the document. */
    addIn(path, value) {
        if (assertCollection(this.contents))
            this.contents.addIn(path, value);
    }
    /**
     * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
     *
     * If `node` already has an anchor, `name` is ignored.
     * Otherwise, the `node.anchor` value will be set to `name`,
     * or if an anchor with that name is already present in the document,
     * `name` will be used as a prefix for a new unique anchor.
     * If `name` is undefined, the generated anchor will use 'a' as a prefix.
     */
    createAlias(node, name) {
        if (!node.anchor) {
            const prev = anchorNames(this);
            node.anchor =
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                !name || prev.has(name) ? findNewAnchor(name || 'a', prev) : name;
        }
        return new Alias(node.anchor);
    }
    createNode(value, replacer, options) {
        let _replacer = undefined;
        if (typeof replacer === 'function') {
            value = replacer.call({ '': value }, '', value);
            _replacer = replacer;
        }
        else if (Array.isArray(replacer)) {
            const keyToStr = (v) => typeof v === 'number' || v instanceof String || v instanceof Number;
            const asStr = replacer.filter(keyToStr).map(String);
            if (asStr.length > 0)
                replacer = replacer.concat(asStr);
            _replacer = replacer;
        }
        else if (options === undefined && replacer) {
            options = replacer;
            replacer = undefined;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = createNodeAnchors(this, 
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        anchorPrefix || 'a');
        const ctx = {
            aliasDuplicateObjects: aliasDuplicateObjects ?? true,
            keepUndefined: keepUndefined ?? false,
            onAnchor,
            onTagObj,
            replacer: _replacer,
            schema: this.schema,
            sourceObjects
        };
        const node = createNode(value, tag, ctx);
        if (flow && isCollection$1(node))
            node.flow = true;
        setAnchors();
        return node;
    }
    /**
     * Convert a key and a value into a `Pair` using the current schema,
     * recursively wrapping all values as `Scalar` or `Collection` nodes.
     */
    createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair(k, v);
    }
    /**
     * Removes a value from the document.
     * @returns `true` if the item was found and removed.
     */
    delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
    }
    /**
     * Removes a value from the document.
     * @returns `true` if the item was found and removed.
     */
    deleteIn(path) {
        if (isEmptyPath(path)) {
            if (this.contents == null)
                return false;
            this.contents = null;
            return true;
        }
        return assertCollection(this.contents)
            ? this.contents.deleteIn(path)
            : false;
    }
    /**
     * Returns item at `key`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    get(key, keepScalar) {
        return isCollection$1(this.contents)
            ? this.contents.get(key, keepScalar)
            : undefined;
    }
    /**
     * Returns item at `path`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    getIn(path, keepScalar) {
        if (isEmptyPath(path))
            return !keepScalar && isScalar$1(this.contents)
                ? this.contents.value
                : this.contents;
        return isCollection$1(this.contents)
            ? this.contents.getIn(path, keepScalar)
            : undefined;
    }
    /**
     * Checks if the document includes a value with the key `key`.
     */
    has(key) {
        return isCollection$1(this.contents) ? this.contents.has(key) : false;
    }
    /**
     * Checks if the document includes a value at `path`.
     */
    hasIn(path) {
        if (isEmptyPath(path))
            return this.contents !== undefined;
        return isCollection$1(this.contents) ? this.contents.hasIn(path) : false;
    }
    /**
     * Sets a value in this document. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    set(key, value) {
        if (this.contents == null) {
            this.contents = collectionFromPath(this.schema, [key], value);
        }
        else if (assertCollection(this.contents)) {
            this.contents.set(key, value);
        }
    }
    /**
     * Sets a value in this document. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    setIn(path, value) {
        if (isEmptyPath(path))
            this.contents = value;
        else if (this.contents == null) {
            this.contents = collectionFromPath(this.schema, Array.from(path), value);
        }
        else if (assertCollection(this.contents)) {
            this.contents.setIn(path, value);
        }
    }
    /**
     * Change the YAML version and schema used by the document.
     * A `null` version disables support for directives, explicit tags, anchors, and aliases.
     * It also requires the `schema` option to be given as a `Schema` instance value.
     *
     * Overrides all previously set schema options.
     */
    setSchema(version, options = {}) {
        if (typeof version === 'number')
            version = String(version);
        let opt;
        switch (version) {
            case '1.1':
                if (this.directives)
                    this.directives.yaml.version = '1.1';
                else
                    this.directives = new Directives({ version: '1.1' });
                opt = { merge: true, resolveKnownTags: false, schema: 'yaml-1.1' };
                break;
            case '1.2':
            case 'next':
                if (this.directives)
                    this.directives.yaml.version = version;
                else
                    this.directives = new Directives({ version });
                opt = { merge: false, resolveKnownTags: true, schema: 'core' };
                break;
            case null:
                if (this.directives)
                    delete this.directives;
                opt = null;
                break;
            default: {
                const sv = JSON.stringify(version);
                throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
            }
        }
        // Not using `instanceof Schema` to allow for duck typing
        if (options.schema instanceof Object)
            this.schema = options.schema;
        else if (opt)
            this.schema = new Schema(Object.assign(opt, options));
        else
            throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
    }
    // json & jsonArg are only used from toJSON()
    toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
            anchors: new Map(),
            doc: this,
            keep: !json,
            mapAsMap: mapAsMap === true,
            mapKeyWarned: false,
            maxAliasCount: typeof maxAliasCount === 'number' ? maxAliasCount : 100,
            stringify: stringify$2
        };
        const res = toJS(this.contents, jsonArg ?? '', ctx);
        if (typeof onAnchor === 'function')
            for (const { count, res } of ctx.anchors.values())
                onAnchor(res, count);
        return typeof reviver === 'function'
            ? applyReviver(reviver, { '': res }, '', res)
            : res;
    }
    /**
     * A JSON representation of the document `contents`.
     *
     * @param jsonArg Used by `JSON.stringify` to indicate the array index or
     *   property name.
     */
    toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
    }
    /** A YAML representation of the document. */
    toString(options = {}) {
        if (this.errors.length > 0)
            throw new Error('Document with errors cannot be stringified');
        if ('indent' in options &&
            (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
            const s = JSON.stringify(options.indent);
            throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument(this, options);
    }
}
function assertCollection(contents) {
    if (isCollection$1(contents))
        return true;
    throw new Error('Expected a YAML collection as document contents');
}

class YAMLError extends Error {
    constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
    }
}
class YAMLParseError extends YAMLError {
    constructor(pos, code, message) {
        super('YAMLParseError', pos, code, message);
    }
}
class YAMLWarning extends YAMLError {
    constructor(pos, code, message) {
        super('YAMLWarning', pos, code, message);
    }
}
const prettifyError = (src, lc) => (error) => {
    if (error.pos[0] === -1)
        return;
    error.linePos = error.pos.map(pos => lc.linePos(pos));
    const { line, col } = error.linePos[0];
    error.message += ` at line ${line}, column ${col}`;
    let ci = col - 1;
    let lineStr = src
        .substring(lc.lineStarts[line - 1], lc.lineStarts[line])
        .replace(/[\n\r]+$/, '');
    // Trim to max 80 chars, keeping col position near the middle
    if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = '…' + lineStr.substring(trimStart);
        ci -= trimStart - 1;
    }
    if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + '…';
    // Include previous line in context if pointing at line start
    if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        // Regexp won't match if start is trimmed
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
            prev = prev.substring(0, 79) + '…\n';
        lineStr = prev + lineStr;
    }
    if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end && end.line === line && end.col > col) {
            count = Math.min(end.col - col, 80 - ci);
        }
        const pointer = ' '.repeat(ci) + '^'.repeat(count);
        error.message += `:\n\n${lineStr}\n${pointer}\n`;
    }
};

function resolveProps(tokens, { flow, indicator, next, offset, onError, startOnNewline }) {
    let spaceBefore = false;
    let atNewline = startOnNewline;
    let hasSpace = startOnNewline;
    let comment = '';
    let commentSep = '';
    let hasNewline = false;
    let hasNewlineAfterProp = false;
    let reqSpace = false;
    let anchor = null;
    let tag = null;
    let comma = null;
    let found = null;
    let start = null;
    for (const token of tokens) {
        if (reqSpace) {
            if (token.type !== 'space' &&
                token.type !== 'newline' &&
                token.type !== 'comma')
                onError(token.offset, 'MISSING_CHAR', 'Tags and anchors must be separated from the next token by white space');
            reqSpace = false;
        }
        switch (token.type) {
            case 'space':
                // At the doc level, tabs at line start may be parsed
                // as leading white space rather than indentation.
                // In a flow collection, only the parser handles indent.
                if (!flow &&
                    atNewline &&
                    indicator !== 'doc-start' &&
                    token.source[0] === '\t')
                    onError(token, 'TAB_AS_INDENT', 'Tabs are not allowed as indentation');
                hasSpace = true;
                break;
            case 'comment': {
                if (!hasSpace)
                    onError(token, 'MISSING_CHAR', 'Comments must be separated from other tokens by white space characters');
                const cb = token.source.substring(1) || ' ';
                if (!comment)
                    comment = cb;
                else
                    comment += commentSep + cb;
                commentSep = '';
                atNewline = false;
                break;
            }
            case 'newline':
                if (atNewline) {
                    if (comment)
                        comment += token.source;
                    else
                        spaceBefore = true;
                }
                else
                    commentSep += token.source;
                atNewline = true;
                hasNewline = true;
                if (anchor || tag)
                    hasNewlineAfterProp = true;
                hasSpace = true;
                break;
            case 'anchor':
                if (anchor)
                    onError(token, 'MULTIPLE_ANCHORS', 'A node can have at most one anchor');
                if (token.source.endsWith(':'))
                    onError(token.offset + token.source.length - 1, 'BAD_ALIAS', 'Anchor ending in : is ambiguous', true);
                anchor = token;
                if (start === null)
                    start = token.offset;
                atNewline = false;
                hasSpace = false;
                reqSpace = true;
                break;
            case 'tag': {
                if (tag)
                    onError(token, 'MULTIPLE_TAGS', 'A node can have at most one tag');
                tag = token;
                if (start === null)
                    start = token.offset;
                atNewline = false;
                hasSpace = false;
                reqSpace = true;
                break;
            }
            case indicator:
                // Could here handle preceding comments differently
                if (anchor || tag)
                    onError(token, 'BAD_PROP_ORDER', `Anchors and tags must be after the ${token.source} indicator`);
                if (found)
                    onError(token, 'UNEXPECTED_TOKEN', `Unexpected ${token.source} in ${flow ?? 'collection'}`);
                found = token;
                atNewline = false;
                hasSpace = false;
                break;
            case 'comma':
                if (flow) {
                    if (comma)
                        onError(token, 'UNEXPECTED_TOKEN', `Unexpected , in ${flow}`);
                    comma = token;
                    atNewline = false;
                    hasSpace = false;
                    break;
                }
            // else fallthrough
            default:
                onError(token, 'UNEXPECTED_TOKEN', `Unexpected ${token.type} token`);
                atNewline = false;
                hasSpace = false;
        }
    }
    const last = tokens[tokens.length - 1];
    const end = last ? last.offset + last.source.length : offset;
    if (reqSpace &&
        next &&
        next.type !== 'space' &&
        next.type !== 'newline' &&
        next.type !== 'comma' &&
        (next.type !== 'scalar' || next.source !== ''))
        onError(next.offset, 'MISSING_CHAR', 'Tags and anchors must be separated from the next token by white space');
    return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        hasNewlineAfterProp,
        anchor,
        tag,
        end,
        start: start ?? end
    };
}

function containsNewline(key) {
    if (!key)
        return null;
    switch (key.type) {
        case 'alias':
        case 'scalar':
        case 'double-quoted-scalar':
        case 'single-quoted-scalar':
            if (key.source.includes('\n'))
                return true;
            if (key.end)
                for (const st of key.end)
                    if (st.type === 'newline')
                        return true;
            return false;
        case 'flow-collection':
            for (const it of key.items) {
                for (const st of it.start)
                    if (st.type === 'newline')
                        return true;
                if (it.sep)
                    for (const st of it.sep)
                        if (st.type === 'newline')
                            return true;
                if (containsNewline(it.key) || containsNewline(it.value))
                    return true;
            }
            return false;
        default:
            return true;
    }
}

function flowIndentCheck(indent, fc, onError) {
    if (fc?.type === 'flow-collection') {
        const end = fc.end[0];
        if (end.indent === indent &&
            (end.source === ']' || end.source === '}') &&
            containsNewline(fc)) {
            const msg = 'Flow end indicator should be more indented than parent';
            onError(end, 'BAD_INDENT', msg, true);
        }
    }
}

function mapIncludes(ctx, items, search) {
    const { uniqueKeys } = ctx.options;
    if (uniqueKeys === false)
        return false;
    const isEqual = typeof uniqueKeys === 'function'
        ? uniqueKeys
        : (a, b) => a === b ||
            (isScalar$1(a) &&
                isScalar$1(b) &&
                a.value === b.value &&
                !(a.value === '<<' && ctx.schema.merge));
    return items.some(pair => isEqual(pair.key, search));
}

const startColMsg = 'All mapping items must start at the same column';
function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError) {
    const map = new YAMLMap(ctx.schema);
    if (ctx.atRoot)
        ctx.atRoot = false;
    let offset = bm.offset;
    let commentEnd = null;
    for (const collItem of bm.items) {
        const { start, key, sep, value } = collItem;
        // key properties
        const keyProps = resolveProps(start, {
            indicator: 'explicit-key-ind',
            next: key ?? sep?.[0],
            offset,
            onError,
            startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
            if (key) {
                if (key.type === 'block-seq')
                    onError(offset, 'BLOCK_AS_IMPLICIT_KEY', 'A block sequence may not be used as an implicit map key');
                else if ('indent' in key && key.indent !== bm.indent)
                    onError(offset, 'BAD_INDENT', startColMsg);
            }
            if (!keyProps.anchor && !keyProps.tag && !sep) {
                commentEnd = keyProps.end;
                if (keyProps.comment) {
                    if (map.comment)
                        map.comment += '\n' + keyProps.comment;
                    else
                        map.comment = keyProps.comment;
                }
                continue;
            }
            if (keyProps.hasNewlineAfterProp || containsNewline(key)) {
                onError(key ?? start[start.length - 1], 'MULTILINE_IMPLICIT_KEY', 'Implicit keys need to be on a single line');
            }
        }
        else if (keyProps.found?.indent !== bm.indent) {
            onError(offset, 'BAD_INDENT', startColMsg);
        }
        // key value
        const keyStart = keyProps.end;
        const keyNode = key
            ? composeNode(ctx, key, keyProps, onError)
            : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
            flowIndentCheck(bm.indent, key, onError);
        if (mapIncludes(ctx, map.items, keyNode))
            onError(keyStart, 'DUPLICATE_KEY', 'Map keys must be unique');
        // value properties
        const valueProps = resolveProps(sep ?? [], {
            indicator: 'map-value-ind',
            next: value,
            offset: keyNode.range[2],
            onError,
            startOnNewline: !key || key.type === 'block-scalar'
        });
        offset = valueProps.end;
        if (valueProps.found) {
            if (implicitKey) {
                if (value?.type === 'block-map' && !valueProps.hasNewline)
                    onError(offset, 'BLOCK_AS_IMPLICIT_KEY', 'Nested mappings are not allowed in compact mappings');
                if (ctx.options.strict &&
                    keyProps.start < valueProps.found.offset - 1024)
                    onError(keyNode.range, 'KEY_OVER_1024_CHARS', 'The : indicator must be at most 1024 chars after the start of an implicit block mapping key');
            }
            // value value
            const valueNode = value
                ? composeNode(ctx, value, valueProps, onError)
                : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
            if (ctx.schema.compat)
                flowIndentCheck(bm.indent, value, onError);
            offset = valueNode.range[2];
            const pair = new Pair(keyNode, valueNode);
            if (ctx.options.keepSourceTokens)
                pair.srcToken = collItem;
            map.items.push(pair);
        }
        else {
            // key with no value
            if (implicitKey)
                onError(keyNode.range, 'MISSING_CHAR', 'Implicit map keys need to be followed by map values');
            if (valueProps.comment) {
                if (keyNode.comment)
                    keyNode.comment += '\n' + valueProps.comment;
                else
                    keyNode.comment = valueProps.comment;
            }
            const pair = new Pair(keyNode);
            if (ctx.options.keepSourceTokens)
                pair.srcToken = collItem;
            map.items.push(pair);
        }
    }
    if (commentEnd && commentEnd < offset)
        onError(commentEnd, 'IMPOSSIBLE', 'Map comment with trailing content');
    map.range = [bm.offset, offset, commentEnd ?? offset];
    return map;
}

function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError) {
    const seq = new YAMLSeq(ctx.schema);
    if (ctx.atRoot)
        ctx.atRoot = false;
    let offset = bs.offset;
    let commentEnd = null;
    for (const { start, value } of bs.items) {
        const props = resolveProps(start, {
            indicator: 'seq-item-ind',
            next: value,
            offset,
            onError,
            startOnNewline: true
        });
        if (!props.found) {
            if (props.anchor || props.tag || value) {
                if (value && value.type === 'block-seq')
                    onError(props.end, 'BAD_INDENT', 'All sequence items must start at the same column');
                else
                    onError(offset, 'MISSING_CHAR', 'Sequence item without - indicator');
            }
            else {
                commentEnd = props.end;
                if (props.comment)
                    seq.comment = props.comment;
                continue;
            }
        }
        const node = value
            ? composeNode(ctx, value, props, onError)
            : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
            flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
    }
    seq.range = [bs.offset, offset, commentEnd ?? offset];
    return seq;
}

function resolveEnd(end, offset, reqSpace, onError) {
    let comment = '';
    if (end) {
        let hasSpace = false;
        let sep = '';
        for (const token of end) {
            const { source, type } = token;
            switch (type) {
                case 'space':
                    hasSpace = true;
                    break;
                case 'comment': {
                    if (reqSpace && !hasSpace)
                        onError(token, 'MISSING_CHAR', 'Comments must be separated from other tokens by white space characters');
                    const cb = source.substring(1) || ' ';
                    if (!comment)
                        comment = cb;
                    else
                        comment += sep + cb;
                    sep = '';
                    break;
                }
                case 'newline':
                    if (comment)
                        sep += source;
                    hasSpace = true;
                    break;
                default:
                    onError(token, 'UNEXPECTED_TOKEN', `Unexpected ${type} at node end`);
            }
            offset += source.length;
        }
    }
    return { comment, offset };
}

const blockMsg = 'Block collections are not allowed within flow collections';
const isBlock = (token) => token && (token.type === 'block-map' || token.type === 'block-seq');
function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError) {
    const isMap = fc.start.source === '{';
    const fcName = isMap ? 'flow map' : 'flow sequence';
    const coll = isMap
        ? new YAMLMap(ctx.schema)
        : new YAMLSeq(ctx.schema);
    coll.flow = true;
    const atRoot = ctx.atRoot;
    if (atRoot)
        ctx.atRoot = false;
    let offset = fc.offset + fc.start.source.length;
    for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep, value } = collItem;
        const props = resolveProps(start, {
            flow: fcName,
            indicator: 'explicit-key-ind',
            next: key ?? sep?.[0],
            offset,
            onError,
            startOnNewline: false
        });
        if (!props.found) {
            if (!props.anchor && !props.tag && !sep && !value) {
                if (i === 0 && props.comma)
                    onError(props.comma, 'UNEXPECTED_TOKEN', `Unexpected , in ${fcName}`);
                else if (i < fc.items.length - 1)
                    onError(props.start, 'UNEXPECTED_TOKEN', `Unexpected empty item in ${fcName}`);
                if (props.comment) {
                    if (coll.comment)
                        coll.comment += '\n' + props.comment;
                    else
                        coll.comment = props.comment;
                }
                offset = props.end;
                continue;
            }
            if (!isMap && ctx.options.strict && containsNewline(key))
                onError(key, // checked by containsNewline()
                'MULTILINE_IMPLICIT_KEY', 'Implicit keys of flow sequence pairs need to be on a single line');
        }
        if (i === 0) {
            if (props.comma)
                onError(props.comma, 'UNEXPECTED_TOKEN', `Unexpected , in ${fcName}`);
        }
        else {
            if (!props.comma)
                onError(props.start, 'MISSING_CHAR', `Missing , between ${fcName} items`);
            if (props.comment) {
                let prevItemComment = '';
                loop: for (const st of start) {
                    switch (st.type) {
                        case 'comma':
                        case 'space':
                            break;
                        case 'comment':
                            prevItemComment = st.source.substring(1);
                            break loop;
                        default:
                            break loop;
                    }
                }
                if (prevItemComment) {
                    let prev = coll.items[coll.items.length - 1];
                    if (isPair(prev))
                        prev = prev.value ?? prev.key;
                    if (prev.comment)
                        prev.comment += '\n' + prevItemComment;
                    else
                        prev.comment = prevItemComment;
                    props.comment = props.comment.substring(prevItemComment.length + 1);
                }
            }
        }
        if (!isMap && !sep && !props.found) {
            // item is a value in a seq
            // → key & sep are empty, start does not include ? or :
            const valueNode = value
                ? composeNode(ctx, value, props, onError)
                : composeEmptyNode(ctx, props.end, sep, null, props, onError);
            coll.items.push(valueNode);
            offset = valueNode.range[2];
            if (isBlock(value))
                onError(valueNode.range, 'BLOCK_IN_FLOW', blockMsg);
        }
        else {
            // item is a key+value pair
            // key value
            const keyStart = props.end;
            const keyNode = key
                ? composeNode(ctx, key, props, onError)
                : composeEmptyNode(ctx, keyStart, start, null, props, onError);
            if (isBlock(key))
                onError(keyNode.range, 'BLOCK_IN_FLOW', blockMsg);
            // value properties
            const valueProps = resolveProps(sep ?? [], {
                flow: fcName,
                indicator: 'map-value-ind',
                next: value,
                offset: keyNode.range[2],
                onError,
                startOnNewline: false
            });
            if (valueProps.found) {
                if (!isMap && !props.found && ctx.options.strict) {
                    if (sep)
                        for (const st of sep) {
                            if (st === valueProps.found)
                                break;
                            if (st.type === 'newline') {
                                onError(st, 'MULTILINE_IMPLICIT_KEY', 'Implicit keys of flow sequence pairs need to be on a single line');
                                break;
                            }
                        }
                    if (props.start < valueProps.found.offset - 1024)
                        onError(valueProps.found, 'KEY_OVER_1024_CHARS', 'The : indicator must be at most 1024 chars after the start of an implicit flow sequence key');
                }
            }
            else if (value) {
                if ('source' in value && value.source && value.source[0] === ':')
                    onError(value, 'MISSING_CHAR', `Missing space after : in ${fcName}`);
                else
                    onError(valueProps.start, 'MISSING_CHAR', `Missing , or : between ${fcName} items`);
            }
            // value value
            const valueNode = value
                ? composeNode(ctx, value, valueProps, onError)
                : valueProps.found
                    ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError)
                    : null;
            if (valueNode) {
                if (isBlock(value))
                    onError(valueNode.range, 'BLOCK_IN_FLOW', blockMsg);
            }
            else if (valueProps.comment) {
                if (keyNode.comment)
                    keyNode.comment += '\n' + valueProps.comment;
                else
                    keyNode.comment = valueProps.comment;
            }
            const pair = new Pair(keyNode, valueNode);
            if (ctx.options.keepSourceTokens)
                pair.srcToken = collItem;
            if (isMap) {
                const map = coll;
                if (mapIncludes(ctx, map.items, keyNode))
                    onError(keyStart, 'DUPLICATE_KEY', 'Map keys must be unique');
                map.items.push(pair);
            }
            else {
                const map = new YAMLMap(ctx.schema);
                map.flow = true;
                map.items.push(pair);
                coll.items.push(map);
            }
            offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
    }
    const expectedEnd = isMap ? '}' : ']';
    const [ce, ...ee] = fc.end;
    let cePos = offset;
    if (ce && ce.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
    else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot
            ? `${name} must end with a ${expectedEnd}`
            : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? 'MISSING_CHAR' : 'BAD_INDENT', msg);
        if (ce && ce.source.length !== 1)
            ee.unshift(ce);
    }
    if (ee.length > 0) {
        const end = resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
            if (coll.comment)
                coll.comment += '\n' + end.comment;
            else
                coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
    }
    else {
        coll.range = [fc.offset, cePos, cePos];
    }
    return coll;
}

function composeCollection(CN, ctx, token, tagToken, onError) {
    let coll;
    switch (token.type) {
        case 'block-map': {
            coll = resolveBlockMap(CN, ctx, token, onError);
            break;
        }
        case 'block-seq': {
            coll = resolveBlockSeq(CN, ctx, token, onError);
            break;
        }
        case 'flow-collection': {
            coll = resolveFlowCollection(CN, ctx, token, onError);
            break;
        }
    }
    if (!tagToken)
        return coll;
    const tagName = ctx.directives.tagName(tagToken.source, msg => onError(tagToken, 'TAG_RESOLVE_FAILED', msg));
    if (!tagName)
        return coll;
    // Cast needed due to: https://github.com/Microsoft/TypeScript/issues/3841
    const Coll = coll.constructor;
    if (tagName === '!' || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
    }
    const expType = isMap(coll) ? 'map' : 'seq';
    let tag = ctx.schema.tags.find(t => t.collection === expType && t.tag === tagName);
    if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt && kt.collection === expType) {
            ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
            tag = kt;
        }
        else {
            onError(tagToken, 'TAG_RESOLVE_FAILED', `Unresolved tag: ${tagName}`, true);
            coll.tag = tagName;
            return coll;
        }
    }
    const res = tag.resolve(coll, msg => onError(tagToken, 'TAG_RESOLVE_FAILED', msg), ctx.options);
    const node = isNode(res)
        ? res
        : new Scalar(res);
    node.range = coll.range;
    node.tag = tagName;
    if (tag?.format)
        node.format = tag.format;
    return node;
}

function resolveBlockScalar(scalar, strict, onError) {
    const start = scalar.offset;
    const header = parseBlockScalarHeader(scalar, strict, onError);
    if (!header)
        return { value: '', type: null, comment: '', range: [start, start, start] };
    const type = header.mode === '>' ? Scalar.BLOCK_FOLDED : Scalar.BLOCK_LITERAL;
    const lines = scalar.source ? splitLines(scalar.source) : [];
    // determine the end of content & start of chomping
    let chompStart = lines.length;
    for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === '' || content === '\r')
            chompStart = i;
        else
            break;
    }
    // shortcut for empty contents
    if (chompStart === 0) {
        const value = header.chomp === '+' && lines.length > 0
            ? '\n'.repeat(Math.max(1, lines.length - 1))
            : '';
        let end = start + header.length;
        if (scalar.source)
            end += scalar.source.length;
        return { value, type, comment: header.comment, range: [start, end, end] };
    }
    // find the indentation level to trim from start
    let trimIndent = scalar.indent + header.indent;
    let offset = scalar.offset + header.length;
    let contentStart = 0;
    for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === '' || content === '\r') {
            if (header.indent === 0 && indent.length > trimIndent)
                trimIndent = indent.length;
        }
        else {
            if (indent.length < trimIndent) {
                const message = 'Block scalars with more-indented leading empty lines must use an explicit indentation indicator';
                onError(offset + indent.length, 'MISSING_CHAR', message);
            }
            if (header.indent === 0)
                trimIndent = indent.length;
            contentStart = i;
            break;
        }
        offset += indent.length + content.length + 1;
    }
    // include trailing more-indented empty lines in content
    for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
            chompStart = i + 1;
    }
    let value = '';
    let sep = '';
    let prevMoreIndented = false;
    // leading whitespace is kept intact
    for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + '\n';
    for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === '\r';
        if (crlf)
            content = content.slice(0, -1);
        /* istanbul ignore if already caught in lexer */
        if (content && indent.length < trimIndent) {
            const src = header.indent
                ? 'explicit indentation indicator'
                : 'first line';
            const message = `Block scalar lines must not be less indented than their ${src}`;
            onError(offset - content.length - (crlf ? 2 : 1), 'BAD_INDENT', message);
            indent = '';
        }
        if (type === Scalar.BLOCK_LITERAL) {
            value += sep + indent.slice(trimIndent) + content;
            sep = '\n';
        }
        else if (indent.length > trimIndent || content[0] === '\t') {
            // more-indented content within a folded block
            if (sep === ' ')
                sep = '\n';
            else if (!prevMoreIndented && sep === '\n')
                sep = '\n\n';
            value += sep + indent.slice(trimIndent) + content;
            sep = '\n';
            prevMoreIndented = true;
        }
        else if (content === '') {
            // empty line
            if (sep === '\n')
                value += '\n';
            else
                sep = '\n';
        }
        else {
            value += sep + content;
            sep = ' ';
            prevMoreIndented = false;
        }
    }
    switch (header.chomp) {
        case '-':
            break;
        case '+':
            for (let i = chompStart; i < lines.length; ++i)
                value += '\n' + lines[i][0].slice(trimIndent);
            if (value[value.length - 1] !== '\n')
                value += '\n';
            break;
        default:
            value += '\n';
    }
    const end = start + header.length + scalar.source.length;
    return { value, type, comment: header.comment, range: [start, end, end] };
}
function parseBlockScalarHeader({ offset, props }, strict, onError) {
    /* istanbul ignore if should not happen */
    if (props[0].type !== 'block-scalar-header') {
        onError(props[0], 'IMPOSSIBLE', 'Block scalar header not found');
        return null;
    }
    const { source } = props[0];
    const mode = source[0];
    let indent = 0;
    let chomp = '';
    let error = -1;
    for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === '-' || ch === '+'))
            chomp = ch;
        else {
            const n = Number(ch);
            if (!indent && n)
                indent = n;
            else if (error === -1)
                error = offset + i;
        }
    }
    if (error !== -1)
        onError(error, 'UNEXPECTED_TOKEN', `Block scalar header includes extra characters: ${source}`);
    let hasSpace = false;
    let comment = '';
    let length = source.length;
    for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
            case 'space':
                hasSpace = true;
            // fallthrough
            case 'newline':
                length += token.source.length;
                break;
            case 'comment':
                if (strict && !hasSpace) {
                    const message = 'Comments must be separated from other tokens by white space characters';
                    onError(token, 'MISSING_CHAR', message);
                }
                length += token.source.length;
                comment = token.source.substring(1);
                break;
            case 'error':
                onError(token, 'UNEXPECTED_TOKEN', token.message);
                length += token.source.length;
                break;
            /* istanbul ignore next should not happen */
            default: {
                const message = `Unexpected token in block scalar header: ${token.type}`;
                onError(token, 'UNEXPECTED_TOKEN', message);
                const ts = token.source;
                if (ts && typeof ts === 'string')
                    length += ts.length;
            }
        }
    }
    return { mode, indent, chomp, comment, length };
}
/** @returns Array of lines split up as `[indent, content]` */
function splitLines(source) {
    const split = source.split(/\n( *)/);
    const first = split[0];
    const m = first.match(/^( *)/);
    const line0 = m?.[1]
        ? [m[1], first.slice(m[1].length)]
        : ['', first];
    const lines = [line0];
    for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
    return lines;
}

function resolveFlowScalar(scalar, strict, onError) {
    const { offset, type, source, end } = scalar;
    let _type;
    let value;
    const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
    switch (type) {
        case 'scalar':
            _type = Scalar.PLAIN;
            value = plainValue(source, _onError);
            break;
        case 'single-quoted-scalar':
            _type = Scalar.QUOTE_SINGLE;
            value = singleQuotedValue(source, _onError);
            break;
        case 'double-quoted-scalar':
            _type = Scalar.QUOTE_DOUBLE;
            value = doubleQuotedValue(source, _onError);
            break;
        /* istanbul ignore next should not happen */
        default:
            onError(scalar, 'UNEXPECTED_TOKEN', `Expected a flow scalar value, but found: ${type}`);
            return {
                value: '',
                type: null,
                comment: '',
                range: [offset, offset + source.length, offset + source.length]
            };
    }
    const valueEnd = offset + source.length;
    const re = resolveEnd(end, valueEnd, strict, onError);
    return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
    };
}
function plainValue(source, onError) {
    let badChar = '';
    switch (source[0]) {
        /* istanbul ignore next should not happen */
        case '\t':
            badChar = 'a tab character';
            break;
        case ',':
            badChar = 'flow indicator character ,';
            break;
        case '%':
            badChar = 'directive indicator character %';
            break;
        case '|':
        case '>': {
            badChar = `block scalar indicator ${source[0]}`;
            break;
        }
        case '@':
        case '`': {
            badChar = `reserved character ${source[0]}`;
            break;
        }
    }
    if (badChar)
        onError(0, 'BAD_SCALAR_START', `Plain value cannot start with ${badChar}`);
    return foldLines(source);
}
function singleQuotedValue(source, onError) {
    if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, 'MISSING_CHAR', "Missing closing 'quote");
    return foldLines(source.slice(1, -1)).replace(/''/g, "'");
}
function foldLines(source) {
    /**
     * The negative lookbehind here and in the `re` RegExp is to
     * prevent causing a polynomial search time in certain cases.
     *
     * The try-catch is for Safari, which doesn't support this yet:
     * https://caniuse.com/js-regexp-lookbehind
     */
    let first, line;
    try {
        first = new RegExp('(.*?)(?<![ \t])[ \t]*\r?\n', 'sy');
        line = new RegExp('[ \t]*(.*?)(?:(?<![ \t])[ \t]*)?\r?\n', 'sy');
    }
    catch (_) {
        first = /(.*?)[ \t]*\r?\n/sy;
        line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
    }
    let match = first.exec(source);
    if (!match)
        return source;
    let res = match[1];
    let sep = ' ';
    let pos = first.lastIndex;
    line.lastIndex = pos;
    while ((match = line.exec(source))) {
        if (match[1] === '') {
            if (sep === '\n')
                res += sep;
            else
                sep = '\n';
        }
        else {
            res += sep + match[1];
            sep = ' ';
        }
        pos = line.lastIndex;
    }
    const last = /[ \t]*(.*)/sy;
    last.lastIndex = pos;
    match = last.exec(source);
    return res + sep + (match?.[1] ?? '');
}
function doubleQuotedValue(source, onError) {
    let res = '';
    for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === '\r' && source[i + 1] === '\n')
            continue;
        if (ch === '\n') {
            const { fold, offset } = foldNewline(source, i);
            res += fold;
            i = offset;
        }
        else if (ch === '\\') {
            let next = source[++i];
            const cc = escapeCodes[next];
            if (cc)
                res += cc;
            else if (next === '\n') {
                // skip escaped newlines, but still trim the following line
                next = source[i + 1];
                while (next === ' ' || next === '\t')
                    next = source[++i + 1];
            }
            else if (next === '\r' && source[i + 1] === '\n') {
                // skip escaped CRLF newlines, but still trim the following line
                next = source[++i + 1];
                while (next === ' ' || next === '\t')
                    next = source[++i + 1];
            }
            else if (next === 'x' || next === 'u' || next === 'U') {
                const length = { x: 2, u: 4, U: 8 }[next];
                res += parseCharCode(source, i + 1, length, onError);
                i += length;
            }
            else {
                const raw = source.substr(i - 1, 2);
                onError(i - 1, 'BAD_DQ_ESCAPE', `Invalid escape sequence ${raw}`);
                res += raw;
            }
        }
        else if (ch === ' ' || ch === '\t') {
            // trim trailing whitespace
            const wsStart = i;
            let next = source[i + 1];
            while (next === ' ' || next === '\t')
                next = source[++i + 1];
            if (next !== '\n' && !(next === '\r' && source[i + 2] === '\n'))
                res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        }
        else {
            res += ch;
        }
    }
    if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, 'MISSING_CHAR', 'Missing closing "quote');
    return res;
}
/**
 * Fold a single newline into a space, multiple newlines to N - 1 newlines.
 * Presumes `source[offset] === '\n'`
 */
function foldNewline(source, offset) {
    let fold = '';
    let ch = source[offset + 1];
    while (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        if (ch === '\r' && source[offset + 2] !== '\n')
            break;
        if (ch === '\n')
            fold += '\n';
        offset += 1;
        ch = source[offset + 1];
    }
    if (!fold)
        fold = ' ';
    return { fold, offset };
}
const escapeCodes = {
    '0': '\0',
    a: '\x07',
    b: '\b',
    e: '\x1b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
    v: '\v',
    N: '\u0085',
    _: '\u00a0',
    L: '\u2028',
    P: '\u2029',
    ' ': ' ',
    '"': '"',
    '/': '/',
    '\\': '\\',
    '\t': '\t'
};
function parseCharCode(source, offset, length, onError) {
    const cc = source.substr(offset, length);
    const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok ? parseInt(cc, 16) : NaN;
    if (isNaN(code)) {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, 'BAD_DQ_ESCAPE', `Invalid escape sequence ${raw}`);
        return raw;
    }
    return String.fromCodePoint(code);
}

function composeScalar(ctx, token, tagToken, onError) {
    const { value, type, comment, range } = token.type === 'block-scalar'
        ? resolveBlockScalar(token, ctx.options.strict, onError)
        : resolveFlowScalar(token, ctx.options.strict, onError);
    const tagName = tagToken
        ? ctx.directives.tagName(tagToken.source, msg => onError(tagToken, 'TAG_RESOLVE_FAILED', msg))
        : null;
    const tag = tagToken && tagName
        ? findScalarTagByName(ctx.schema, value, tagName, tagToken, onError)
        : token.type === 'scalar'
            ? findScalarTagByTest(ctx, value, token, onError)
            : ctx.schema[SCALAR$1];
    let scalar;
    try {
        const res = tag.resolve(value, msg => onError(tagToken ?? token, 'TAG_RESOLVE_FAILED', msg), ctx.options);
        scalar = isScalar$1(res) ? res : new Scalar(res);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, 'TAG_RESOLVE_FAILED', msg);
        scalar = new Scalar(value);
    }
    scalar.range = range;
    scalar.source = value;
    if (type)
        scalar.type = type;
    if (tagName)
        scalar.tag = tagName;
    if (tag.format)
        scalar.format = tag.format;
    if (comment)
        scalar.comment = comment;
    return scalar;
}
function findScalarTagByName(schema, value, tagName, tagToken, onError) {
    if (tagName === '!')
        return schema[SCALAR$1]; // non-specific tag
    const matchWithTest = [];
    for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
            if (tag.default && tag.test)
                matchWithTest.push(tag);
            else
                return tag;
        }
    }
    for (const tag of matchWithTest)
        if (tag.test?.test(value))
            return tag;
    const kt = schema.knownTags[tagName];
    if (kt && !kt.collection) {
        // Ensure that the known tag is available for stringifying,
        // but does not get used by default.
        schema.tags.push(Object.assign({}, kt, { default: false, test: undefined }));
        return kt;
    }
    onError(tagToken, 'TAG_RESOLVE_FAILED', `Unresolved tag: ${tagName}`, tagName !== 'tag:yaml.org,2002:str');
    return schema[SCALAR$1];
}
function findScalarTagByTest({ directives, schema }, value, token, onError) {
    const tag = schema.tags.find(tag => tag.default && tag.test?.test(value)) || schema[SCALAR$1];
    if (schema.compat) {
        const compat = schema.compat.find(tag => tag.default && tag.test?.test(value)) ??
            schema[SCALAR$1];
        if (tag.tag !== compat.tag) {
            const ts = directives.tagString(tag.tag);
            const cs = directives.tagString(compat.tag);
            const msg = `Value may be parsed as either ${ts} or ${cs}`;
            onError(token, 'TAG_RESOLVE_FAILED', msg, true);
        }
    }
    return tag;
}

function emptyScalarPosition(offset, before, pos) {
    if (before) {
        if (pos === null)
            pos = before.length;
        for (let i = pos - 1; i >= 0; --i) {
            let st = before[i];
            switch (st.type) {
                case 'space':
                case 'comment':
                case 'newline':
                    offset -= st.source.length;
                    continue;
            }
            // Technically, an empty scalar is immediately after the last non-empty
            // node, but it's more useful to place it after any whitespace.
            st = before[++i];
            while (st?.type === 'space') {
                offset += st.source.length;
                st = before[++i];
            }
            break;
        }
    }
    return offset;
}

const CN = { composeNode, composeEmptyNode };
function composeNode(ctx, token, props, onError) {
    const { spaceBefore, comment, anchor, tag } = props;
    let node;
    let isSrcToken = true;
    switch (token.type) {
        case 'alias':
            node = composeAlias(ctx, token, onError);
            if (anchor || tag)
                onError(token, 'ALIAS_PROPS', 'An alias node must not specify any properties');
            break;
        case 'scalar':
        case 'single-quoted-scalar':
        case 'double-quoted-scalar':
        case 'block-scalar':
            node = composeScalar(ctx, token, tag, onError);
            if (anchor)
                node.anchor = anchor.source.substring(1);
            break;
        case 'block-map':
        case 'block-seq':
        case 'flow-collection':
            node = composeCollection(CN, ctx, token, tag, onError);
            if (anchor)
                node.anchor = anchor.source.substring(1);
            break;
        default: {
            const message = token.type === 'error'
                ? token.message
                : `Unsupported token (type: ${token.type})`;
            onError(token, 'UNEXPECTED_TOKEN', message);
            node = composeEmptyNode(ctx, token.offset, undefined, null, props, onError);
            isSrcToken = false;
        }
    }
    if (anchor && node.anchor === '')
        onError(anchor, 'BAD_ALIAS', 'Anchor cannot be an empty string');
    if (spaceBefore)
        node.spaceBefore = true;
    if (comment) {
        if (token.type === 'scalar' && token.source === '')
            node.comment = comment;
        else
            node.commentBefore = comment;
    }
    // @ts-expect-error Type checking misses meaning of isSrcToken
    if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
    return node;
}
function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
    const token = {
        type: 'scalar',
        offset: emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ''
    };
    const node = composeScalar(ctx, token, tag, onError);
    if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === '')
            onError(anchor, 'BAD_ALIAS', 'Anchor cannot be an empty string');
    }
    if (spaceBefore)
        node.spaceBefore = true;
    if (comment) {
        node.comment = comment;
        node.range[2] = end;
    }
    return node;
}
function composeAlias({ options }, { offset, source, end }, onError) {
    const alias = new Alias(source.substring(1));
    if (alias.source === '')
        onError(offset, 'BAD_ALIAS', 'Alias cannot be an empty string');
    if (alias.source.endsWith(':'))
        onError(offset + source.length - 1, 'BAD_ALIAS', 'Alias ending in : is ambiguous', true);
    const valueEnd = offset + source.length;
    const re = resolveEnd(end, valueEnd, options.strict, onError);
    alias.range = [offset, valueEnd, re.offset];
    if (re.comment)
        alias.comment = re.comment;
    return alias;
}

function composeDoc(options, directives, { offset, start, value, end }, onError) {
    const opts = Object.assign({ _directives: directives }, options);
    const doc = new Document(undefined, opts);
    const ctx = {
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
    };
    const props = resolveProps(start, {
        indicator: 'doc-start',
        next: value ?? end?.[0],
        offset,
        onError,
        startOnNewline: true
    });
    if (props.found) {
        doc.directives.docStart = true;
        if (value &&
            (value.type === 'block-map' || value.type === 'block-seq') &&
            !props.hasNewline)
            onError(props.end, 'MISSING_CHAR', 'Block collection cannot start on same line with directives-end marker');
    }
    doc.contents = value
        ? composeNode(ctx, value, props, onError)
        : composeEmptyNode(ctx, props.end, start, null, props, onError);
    const contentEnd = doc.contents.range[2];
    const re = resolveEnd(end, contentEnd, false, onError);
    if (re.comment)
        doc.comment = re.comment;
    doc.range = [offset, contentEnd, re.offset];
    return doc;
}

function getErrorPos(src) {
    if (typeof src === 'number')
        return [src, src + 1];
    if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
    const { offset, source } = src;
    return [offset, offset + (typeof source === 'string' ? source.length : 1)];
}
function parsePrelude(prelude) {
    let comment = '';
    let atComment = false;
    let afterEmptyLine = false;
    for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
            case '#':
                comment +=
                    (comment === '' ? '' : afterEmptyLine ? '\n\n' : '\n') +
                        (source.substring(1) || ' ');
                atComment = true;
                afterEmptyLine = false;
                break;
            case '%':
                if (prelude[i + 1]?.[0] !== '#')
                    i += 1;
                atComment = false;
                break;
            default:
                // This may be wrong after doc-end, but in that case it doesn't matter
                if (!atComment)
                    afterEmptyLine = true;
                atComment = false;
        }
    }
    return { comment, afterEmptyLine };
}
/**
 * Compose a stream of CST nodes into a stream of YAML Documents.
 *
 * ```ts
 * import { Composer, Parser } from 'yaml'
 *
 * const src: string = ...
 * const tokens = new Parser().parse(src)
 * const docs = new Composer().compose(tokens)
 * ```
 */
class Composer {
    constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
            const pos = getErrorPos(source);
            if (warning)
                this.warnings.push(new YAMLWarning(pos, code, message));
            else
                this.errors.push(new YAMLParseError(pos, code, message));
        };
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        this.directives = new Directives({ version: options.version || '1.2' });
        this.options = options;
    }
    decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        //console.log({ dc: doc.comment, prelude, comment })
        if (comment) {
            const dc = doc.contents;
            if (afterDoc) {
                doc.comment = doc.comment ? `${doc.comment}\n${comment}` : comment;
            }
            else if (afterEmptyLine || doc.directives.docStart || !dc) {
                doc.commentBefore = comment;
            }
            else if (isCollection$1(dc) && !dc.flow && dc.items.length > 0) {
                let it = dc.items[0];
                if (isPair(it))
                    it = it.key;
                const cb = it.commentBefore;
                it.commentBefore = cb ? `${comment}\n${cb}` : comment;
            }
            else {
                const cb = dc.commentBefore;
                dc.commentBefore = cb ? `${comment}\n${cb}` : comment;
            }
        }
        if (afterDoc) {
            Array.prototype.push.apply(doc.errors, this.errors);
            Array.prototype.push.apply(doc.warnings, this.warnings);
        }
        else {
            doc.errors = this.errors;
            doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
    }
    /**
     * Current stream status information.
     *
     * Mostly useful at the end of input for an empty stream.
     */
    streamInfo() {
        return {
            comment: parsePrelude(this.prelude).comment,
            directives: this.directives,
            errors: this.errors,
            warnings: this.warnings
        };
    }
    /**
     * Compose tokens into documents.
     *
     * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
     * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
     */
    *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
            yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
    }
    /** Advance the composer by one CST token. */
    *next(token) {
        switch (token.type) {
            case 'directive':
                this.directives.add(token.source, (offset, message, warning) => {
                    const pos = getErrorPos(token);
                    pos[0] += offset;
                    this.onError(pos, 'BAD_DIRECTIVE', message, warning);
                });
                this.prelude.push(token.source);
                this.atDirectives = true;
                break;
            case 'document': {
                const doc = composeDoc(this.options, this.directives, token, this.onError);
                if (this.atDirectives && !doc.directives.docStart)
                    this.onError(token, 'MISSING_CHAR', 'Missing directives-end/doc-start indicator line');
                this.decorate(doc, false);
                if (this.doc)
                    yield this.doc;
                this.doc = doc;
                this.atDirectives = false;
                break;
            }
            case 'byte-order-mark':
            case 'space':
                break;
            case 'comment':
            case 'newline':
                this.prelude.push(token.source);
                break;
            case 'error': {
                const msg = token.source
                    ? `${token.message}: ${JSON.stringify(token.source)}`
                    : token.message;
                const error = new YAMLParseError(getErrorPos(token), 'UNEXPECTED_TOKEN', msg);
                if (this.atDirectives || !this.doc)
                    this.errors.push(error);
                else
                    this.doc.errors.push(error);
                break;
            }
            case 'doc-end': {
                if (!this.doc) {
                    const msg = 'Unexpected doc-end without preceding document';
                    this.errors.push(new YAMLParseError(getErrorPos(token), 'UNEXPECTED_TOKEN', msg));
                    break;
                }
                this.doc.directives.docEnd = true;
                const end = resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
                this.decorate(this.doc, true);
                if (end.comment) {
                    const dc = this.doc.comment;
                    this.doc.comment = dc ? `${dc}\n${end.comment}` : end.comment;
                }
                this.doc.range[2] = end.offset;
                break;
            }
            default:
                this.errors.push(new YAMLParseError(getErrorPos(token), 'UNEXPECTED_TOKEN', `Unsupported token ${token.type}`));
        }
    }
    /**
     * Call at end of input to yield any remaining document.
     *
     * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
     * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
     */
    *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
            this.decorate(this.doc, true);
            yield this.doc;
            this.doc = null;
        }
        else if (forceDoc) {
            const opts = Object.assign({ _directives: this.directives }, this.options);
            const doc = new Document(undefined, opts);
            if (this.atDirectives)
                this.onError(endOffset, 'MISSING_CHAR', 'Missing directives-end indicator line');
            doc.range = [0, endOffset, endOffset];
            this.decorate(doc, false);
            yield doc;
        }
    }
}

function resolveAsScalar(token, strict = true, onError) {
    if (token) {
        const _onError = (pos, code, message) => {
            const offset = typeof pos === 'number' ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
            if (onError)
                onError(offset, code, message);
            else
                throw new YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
            case 'scalar':
            case 'single-quoted-scalar':
            case 'double-quoted-scalar':
                return resolveFlowScalar(token, strict, _onError);
            case 'block-scalar':
                return resolveBlockScalar(token, strict, _onError);
        }
    }
    return null;
}
/**
 * Create a new scalar token with `value`
 *
 * Values that represent an actual string but may be parsed as a different type should use a `type` other than `'PLAIN'`,
 * as this function does not support any schema operations and won't check for such conflicts.
 *
 * @param value The string representation of the value, which will have its content properly indented.
 * @param context.end Comments and whitespace after the end of the value, or after the block scalar header. If undefined, a newline will be added.
 * @param context.implicitKey Being within an implicit key may affect the resolved type of the token's value.
 * @param context.indent The indent level of the token.
 * @param context.inFlow Is this scalar within a flow collection? This may affect the resolved type of the token's value.
 * @param context.offset The offset position of the token.
 * @param context.type The preferred type of the scalar token. If undefined, the previous type of the `token` will be used, defaulting to `'PLAIN'`.
 */
function createScalarToken(value, context) {
    const { implicitKey = false, indent, inFlow = false, offset = -1, type = 'PLAIN' } = context;
    const source = stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? ' '.repeat(indent) : '',
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
    });
    const end = context.end ?? [
        { type: 'newline', offset: -1, indent, source: '\n' }
    ];
    switch (source[0]) {
        case '|':
        case '>': {
            const he = source.indexOf('\n');
            const head = source.substring(0, he);
            const body = source.substring(he + 1) + '\n';
            const props = [
                { type: 'block-scalar-header', offset, indent, source: head }
            ];
            if (!addEndtoBlockProps(props, end))
                props.push({ type: 'newline', offset: -1, indent, source: '\n' });
            return { type: 'block-scalar', offset, indent, props, source: body };
        }
        case '"':
            return { type: 'double-quoted-scalar', offset, indent, source, end };
        case "'":
            return { type: 'single-quoted-scalar', offset, indent, source, end };
        default:
            return { type: 'scalar', offset, indent, source, end };
    }
}
/**
 * Set the value of `token` to the given string `value`, overwriting any previous contents and type that it may have.
 *
 * Best efforts are made to retain any comments previously associated with the `token`,
 * though all contents within a collection's `items` will be overwritten.
 *
 * Values that represent an actual string but may be parsed as a different type should use a `type` other than `'PLAIN'`,
 * as this function does not support any schema operations and won't check for such conflicts.
 *
 * @param token Any token. If it does not include an `indent` value, the value will be stringified as if it were an implicit key.
 * @param value The string representation of the value, which will have its content properly indented.
 * @param context.afterKey In most cases, values after a key should have an additional level of indentation.
 * @param context.implicitKey Being within an implicit key may affect the resolved type of the token's value.
 * @param context.inFlow Being within a flow collection may affect the resolved type of the token's value.
 * @param context.type The preferred type of the scalar token. If undefined, the previous type of the `token` will be used, defaulting to `'PLAIN'`.
 */
function setScalarValue(token, value, context = {}) {
    let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
    let indent = 'indent' in token ? token.indent : null;
    if (afterKey && typeof indent === 'number')
        indent += 2;
    if (!type)
        switch (token.type) {
            case 'single-quoted-scalar':
                type = 'QUOTE_SINGLE';
                break;
            case 'double-quoted-scalar':
                type = 'QUOTE_DOUBLE';
                break;
            case 'block-scalar': {
                const header = token.props[0];
                if (header.type !== 'block-scalar-header')
                    throw new Error('Invalid block scalar header');
                type = header.source[0] === '>' ? 'BLOCK_FOLDED' : 'BLOCK_LITERAL';
                break;
            }
            default:
                type = 'PLAIN';
        }
    const source = stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? ' '.repeat(indent) : '',
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
    });
    switch (source[0]) {
        case '|':
        case '>':
            setBlockScalarValue(token, source);
            break;
        case '"':
            setFlowScalarValue(token, source, 'double-quoted-scalar');
            break;
        case "'":
            setFlowScalarValue(token, source, 'single-quoted-scalar');
            break;
        default:
            setFlowScalarValue(token, source, 'scalar');
    }
}
function setBlockScalarValue(token, source) {
    const he = source.indexOf('\n');
    const head = source.substring(0, he);
    const body = source.substring(he + 1) + '\n';
    if (token.type === 'block-scalar') {
        const header = token.props[0];
        if (header.type !== 'block-scalar-header')
            throw new Error('Invalid block scalar header');
        header.source = head;
        token.source = body;
    }
    else {
        const { offset } = token;
        const indent = 'indent' in token ? token.indent : -1;
        const props = [
            { type: 'block-scalar-header', offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, 'end' in token ? token.end : undefined))
            props.push({ type: 'newline', offset: -1, indent, source: '\n' });
        for (const key of Object.keys(token))
            if (key !== 'type' && key !== 'offset')
                delete token[key];
        Object.assign(token, { type: 'block-scalar', indent, props, source: body });
    }
}
/** @returns `true` if last token is a newline */
function addEndtoBlockProps(props, end) {
    if (end)
        for (const st of end)
            switch (st.type) {
                case 'space':
                case 'comment':
                    props.push(st);
                    break;
                case 'newline':
                    props.push(st);
                    return true;
            }
    return false;
}
function setFlowScalarValue(token, source, type) {
    switch (token.type) {
        case 'scalar':
        case 'double-quoted-scalar':
        case 'single-quoted-scalar':
            token.type = type;
            token.source = source;
            break;
        case 'block-scalar': {
            const end = token.props.slice(1);
            let oa = source.length;
            if (token.props[0].type === 'block-scalar-header')
                oa -= token.props[0].source.length;
            for (const tok of end)
                tok.offset += oa;
            delete token.props;
            Object.assign(token, { type, source, end });
            break;
        }
        case 'block-map':
        case 'block-seq': {
            const offset = token.offset + source.length;
            const nl = { type: 'newline', offset, indent: token.indent, source: '\n' };
            delete token.items;
            Object.assign(token, { type, source, end: [nl] });
            break;
        }
        default: {
            const indent = 'indent' in token ? token.indent : -1;
            const end = 'end' in token && Array.isArray(token.end)
                ? token.end.filter(st => st.type === 'space' ||
                    st.type === 'comment' ||
                    st.type === 'newline')
                : [];
            for (const key of Object.keys(token))
                if (key !== 'type' && key !== 'offset')
                    delete token[key];
            Object.assign(token, { type, indent, source, end });
        }
    }
}

/**
 * Stringify a CST document, token, or collection item
 *
 * Fair warning: This applies no validation whatsoever, and
 * simply concatenates the sources in their logical order.
 */
const stringify$1 = (cst) => 'type' in cst ? stringifyToken(cst) : stringifyItem(cst);
function stringifyToken(token) {
    switch (token.type) {
        case 'block-scalar': {
            let res = '';
            for (const tok of token.props)
                res += stringifyToken(tok);
            return res + token.source;
        }
        case 'block-map':
        case 'block-seq': {
            let res = '';
            for (const item of token.items)
                res += stringifyItem(item);
            return res;
        }
        case 'flow-collection': {
            let res = token.start.source;
            for (const item of token.items)
                res += stringifyItem(item);
            for (const st of token.end)
                res += st.source;
            return res;
        }
        case 'document': {
            let res = stringifyItem(token);
            if (token.end)
                for (const st of token.end)
                    res += st.source;
            return res;
        }
        default: {
            let res = token.source;
            if ('end' in token && token.end)
                for (const st of token.end)
                    res += st.source;
            return res;
        }
    }
}
function stringifyItem({ start, key, sep, value }) {
    let res = '';
    for (const st of start)
        res += st.source;
    if (key)
        res += stringifyToken(key);
    if (sep)
        for (const st of sep)
            res += st.source;
    if (value)
        res += stringifyToken(value);
    return res;
}

const BREAK = Symbol('break visit');
const SKIP = Symbol('skip children');
const REMOVE = Symbol('remove item');
/**
 * Apply a visitor to a CST document or item.
 *
 * Walks through the tree (depth-first) starting from the root, calling a
 * `visitor` function with two arguments when entering each item:
 *   - `item`: The current item, which included the following members:
 *     - `start: SourceToken[]` – Source tokens before the key or value,
 *       possibly including its anchor or tag.
 *     - `key?: Token | null` – Set for pair values. May then be `null`, if
 *       the key before the `:` separator is empty.
 *     - `sep?: SourceToken[]` – Source tokens between the key and the value,
 *       which should include the `:` map value indicator if `value` is set.
 *     - `value?: Token` – The value of a sequence item, or of a map pair.
 *   - `path`: The steps from the root to the current node, as an array of
 *     `['key' | 'value', number]` tuples.
 *
 * The return value of the visitor may be used to control the traversal:
 *   - `undefined` (default): Do nothing and continue
 *   - `visit.SKIP`: Do not visit the children of this token, continue with
 *      next sibling
 *   - `visit.BREAK`: Terminate traversal completely
 *   - `visit.REMOVE`: Remove the current item, then continue with the next one
 *   - `number`: Set the index of the next step. This is useful especially if
 *     the index of the current token has changed.
 *   - `function`: Define the next visitor for this item. After the original
 *     visitor is called on item entry, next visitors are called after handling
 *     a non-empty `key` and when exiting the item.
 */
function visit(cst, visitor) {
    if ('type' in cst && cst.type === 'document')
        cst = { start: cst.start, value: cst.value };
    _visit(Object.freeze([]), cst, visitor);
}
// Without the `as symbol` casts, TS declares these in the `visit`
// namespace using `var`, but then complains about that because
// `unique symbol` must be `const`.
/** Terminate visit traversal completely */
visit.BREAK = BREAK;
/** Do not visit the children of the current item */
visit.SKIP = SKIP;
/** Remove the current item */
visit.REMOVE = REMOVE;
/** Find the item at `path` from `cst` as the root */
visit.itemAtPath = (cst, path) => {
    let item = cst;
    for (const [field, index] of path) {
        const tok = item?.[field];
        if (tok && 'items' in tok) {
            item = tok.items[index];
        }
        else
            return undefined;
    }
    return item;
};
/**
 * Get the immediate parent collection of the item at `path` from `cst` as the root.
 *
 * Throws an error if the collection is not found, which should never happen if the item itself exists.
 */
visit.parentCollection = (cst, path) => {
    const parent = visit.itemAtPath(cst, path.slice(0, -1));
    const field = path[path.length - 1][0];
    const coll = parent?.[field];
    if (coll && 'items' in coll)
        return coll;
    throw new Error('Parent collection not found');
};
function _visit(path, item, visitor) {
    let ctrl = visitor(item, path);
    if (typeof ctrl === 'symbol')
        return ctrl;
    for (const field of ['key', 'value']) {
        const token = item[field];
        if (token && 'items' in token) {
            for (let i = 0; i < token.items.length; ++i) {
                const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
                if (typeof ci === 'number')
                    i = ci - 1;
                else if (ci === BREAK)
                    return BREAK;
                else if (ci === REMOVE) {
                    token.items.splice(i, 1);
                    i -= 1;
                }
            }
            if (typeof ctrl === 'function' && field === 'key')
                ctrl = ctrl(item, path);
        }
    }
    return typeof ctrl === 'function' ? ctrl(item, path) : ctrl;
}

/** The byte order mark */
const BOM = '\u{FEFF}';
/** Start of doc-mode */
const DOCUMENT = '\x02'; // C0: Start of Text
/** Unexpected end of flow-mode */
const FLOW_END = '\x18'; // C0: Cancel
/** Next token is a scalar value */
const SCALAR = '\x1f'; // C0: Unit Separator
/** @returns `true` if `token` is a flow or block collection */
const isCollection = (token) => !!token && 'items' in token;
/** @returns `true` if `token` is a flow or block scalar; not an alias */
const isScalar = (token) => !!token &&
    (token.type === 'scalar' ||
        token.type === 'single-quoted-scalar' ||
        token.type === 'double-quoted-scalar' ||
        token.type === 'block-scalar');
/* istanbul ignore next */
/** Get a printable representation of a lexer token */
function prettyToken(token) {
    switch (token) {
        case BOM:
            return '<BOM>';
        case DOCUMENT:
            return '<DOC>';
        case FLOW_END:
            return '<FLOW_END>';
        case SCALAR:
            return '<SCALAR>';
        default:
            return JSON.stringify(token);
    }
}
/** Identify the type of a lexer token. May return `null` for unknown tokens. */
function tokenType(source) {
    switch (source) {
        case BOM:
            return 'byte-order-mark';
        case DOCUMENT:
            return 'doc-mode';
        case FLOW_END:
            return 'flow-error-end';
        case SCALAR:
            return 'scalar';
        case '---':
            return 'doc-start';
        case '...':
            return 'doc-end';
        case '':
        case '\n':
        case '\r\n':
            return 'newline';
        case '-':
            return 'seq-item-ind';
        case '?':
            return 'explicit-key-ind';
        case ':':
            return 'map-value-ind';
        case '{':
            return 'flow-map-start';
        case '}':
            return 'flow-map-end';
        case '[':
            return 'flow-seq-start';
        case ']':
            return 'flow-seq-end';
        case ',':
            return 'comma';
    }
    switch (source[0]) {
        case ' ':
        case '\t':
            return 'space';
        case '#':
            return 'comment';
        case '%':
            return 'directive-line';
        case '*':
            return 'alias';
        case '&':
            return 'anchor';
        case '!':
            return 'tag';
        case "'":
            return 'single-quoted-scalar';
        case '"':
            return 'double-quoted-scalar';
        case '|':
        case '>':
            return 'block-scalar-header';
    }
    return null;
}

var cst = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BOM: BOM,
    DOCUMENT: DOCUMENT,
    FLOW_END: FLOW_END,
    SCALAR: SCALAR,
    createScalarToken: createScalarToken,
    isCollection: isCollection,
    isScalar: isScalar,
    prettyToken: prettyToken,
    resolveAsScalar: resolveAsScalar,
    setScalarValue: setScalarValue,
    stringify: stringify$1,
    tokenType: tokenType,
    visit: visit
});

/*
START -> stream

stream
  directive -> line-end -> stream
  indent + line-end -> stream
  [else] -> line-start

line-end
  comment -> line-end
  newline -> .
  input-end -> END

line-start
  doc-start -> doc
  doc-end -> stream
  [else] -> indent -> block-start

block-start
  seq-item-start -> block-start
  explicit-key-start -> block-start
  map-value-start -> block-start
  [else] -> doc

doc
  line-end -> line-start
  spaces -> doc
  anchor -> doc
  tag -> doc
  flow-start -> flow -> doc
  flow-end -> error -> doc
  seq-item-start -> error -> doc
  explicit-key-start -> error -> doc
  map-value-start -> doc
  alias -> doc
  quote-start -> quoted-scalar -> doc
  block-scalar-header -> line-end -> block-scalar(min) -> line-start
  [else] -> plain-scalar(false, min) -> doc

flow
  line-end -> flow
  spaces -> flow
  anchor -> flow
  tag -> flow
  flow-start -> flow -> flow
  flow-end -> .
  seq-item-start -> error -> flow
  explicit-key-start -> flow
  map-value-start -> flow
  alias -> flow
  quote-start -> quoted-scalar -> flow
  comma -> flow
  [else] -> plain-scalar(true, 0) -> flow

quoted-scalar
  quote-end -> .
  [else] -> quoted-scalar

block-scalar(min)
  newline + peek(indent < min) -> .
  [else] -> block-scalar(min)

plain-scalar(is-flow, min)
  scalar-end(is-flow) -> .
  peek(newline + (indent < min)) -> .
  [else] -> plain-scalar(min)
*/
function isEmpty(ch) {
    switch (ch) {
        case undefined:
        case ' ':
        case '\n':
        case '\r':
        case '\t':
            return true;
        default:
            return false;
    }
}
const hexDigits = '0123456789ABCDEFabcdef'.split('');
const tagChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()".split('');
const invalidFlowScalarChars = ',[]{}'.split('');
const invalidAnchorChars = ' ,[]{}\n\r\t'.split('');
const isNotAnchorChar = (ch) => !ch || invalidAnchorChars.includes(ch);
/**
 * Splits an input string into lexical tokens, i.e. smaller strings that are
 * easily identifiable by `tokens.tokenType()`.
 *
 * Lexing starts always in a "stream" context. Incomplete input may be buffered
 * until a complete token can be emitted.
 *
 * In addition to slices of the original input, the following control characters
 * may also be emitted:
 *
 * - `\x02` (Start of Text): A document starts with the next token
 * - `\x18` (Cancel): Unexpected end of flow-mode (indicates an error)
 * - `\x1f` (Unit Separator): Next token is a scalar value
 * - `\u{FEFF}` (Byte order mark): Emitted separately outside documents
 */
class Lexer {
    constructor() {
        /**
         * Flag indicating whether the end of the current buffer marks the end of
         * all input
         */
        this.atEnd = false;
        /**
         * Explicit indent set in block scalar header, as an offset from the current
         * minimum indent, so e.g. set to 1 from a header `|2+`. Set to -1 if not
         * explicitly set.
         */
        this.blockScalarIndent = -1;
        /**
         * Block scalars that include a + (keep) chomping indicator in their header
         * include trailing empty lines, which are otherwise excluded from the
         * scalar's contents.
         */
        this.blockScalarKeep = false;
        /** Current input */
        this.buffer = '';
        /**
         * Flag noting whether the map value indicator : can immediately follow this
         * node within a flow context.
         */
        this.flowKey = false;
        /** Count of surrounding flow collection levels. */
        this.flowLevel = 0;
        /**
         * Minimum level of indentation required for next lines to be parsed as a
         * part of the current scalar value.
         */
        this.indentNext = 0;
        /** Indentation level of the current line. */
        this.indentValue = 0;
        /** Position of the next \n character. */
        this.lineEndPos = null;
        /** Stores the state of the lexer if reaching the end of incpomplete input */
        this.next = null;
        /** A pointer to `buffer`; the current position of the lexer. */
        this.pos = 0;
    }
    /**
     * Generate YAML tokens from the `source` string. If `incomplete`,
     * a part of the last line may be left as a buffer for the next call.
     *
     * @returns A generator of lexical tokens
     */
    *lex(source, incomplete = false) {
        if (source) {
            this.buffer = this.buffer ? this.buffer + source : source;
            this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? 'stream';
        while (next && (incomplete || this.hasChars(1)))
            next = yield* this.parseNext(next);
    }
    atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === ' ' || ch === '\t')
            ch = this.buffer[++i];
        if (!ch || ch === '#' || ch === '\n')
            return true;
        if (ch === '\r')
            return this.buffer[i + 1] === '\n';
        return false;
    }
    charAt(n) {
        return this.buffer[this.pos + n];
    }
    continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
            let indent = 0;
            while (ch === ' ')
                ch = this.buffer[++indent + offset];
            if (ch === '\r') {
                const next = this.buffer[indent + offset + 1];
                if (next === '\n' || (!next && !this.atEnd))
                    return offset + indent + 1;
            }
            return ch === '\n' || indent >= this.indentNext || (!ch && !this.atEnd)
                ? offset + indent
                : -1;
        }
        if (ch === '-' || ch === '.') {
            const dt = this.buffer.substr(offset, 3);
            if ((dt === '---' || dt === '...') && isEmpty(this.buffer[offset + 3]))
                return -1;
        }
        return offset;
    }
    getLine() {
        let end = this.lineEndPos;
        if (typeof end !== 'number' || (end !== -1 && end < this.pos)) {
            end = this.buffer.indexOf('\n', this.pos);
            this.lineEndPos = end;
        }
        if (end === -1)
            return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === '\r')
            end -= 1;
        return this.buffer.substring(this.pos, end);
    }
    hasChars(n) {
        return this.pos + n <= this.buffer.length;
    }
    setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
    }
    peek(n) {
        return this.buffer.substr(this.pos, n);
    }
    *parseNext(next) {
        switch (next) {
            case 'stream':
                return yield* this.parseStream();
            case 'line-start':
                return yield* this.parseLineStart();
            case 'block-start':
                return yield* this.parseBlockStart();
            case 'doc':
                return yield* this.parseDocument();
            case 'flow':
                return yield* this.parseFlowCollection();
            case 'quoted-scalar':
                return yield* this.parseQuotedScalar();
            case 'block-scalar':
                return yield* this.parseBlockScalar();
            case 'plain-scalar':
                return yield* this.parsePlainScalar();
        }
    }
    *parseStream() {
        let line = this.getLine();
        if (line === null)
            return this.setNext('stream');
        if (line[0] === BOM) {
            yield* this.pushCount(1);
            line = line.substring(1);
        }
        if (line[0] === '%') {
            let dirEnd = line.length;
            const cs = line.indexOf('#');
            if (cs !== -1) {
                const ch = line[cs - 1];
                if (ch === ' ' || ch === '\t')
                    dirEnd = cs - 1;
            }
            while (true) {
                const ch = line[dirEnd - 1];
                if (ch === ' ' || ch === '\t')
                    dirEnd -= 1;
                else
                    break;
            }
            const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
            yield* this.pushCount(line.length - n); // possible comment
            this.pushNewline();
            return 'stream';
        }
        if (this.atLineEnd()) {
            const sp = yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - sp);
            yield* this.pushNewline();
            return 'stream';
        }
        yield DOCUMENT;
        return yield* this.parseLineStart();
    }
    *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
            return this.setNext('line-start');
        if (ch === '-' || ch === '.') {
            if (!this.atEnd && !this.hasChars(4))
                return this.setNext('line-start');
            const s = this.peek(3);
            if (s === '---' && isEmpty(this.charAt(3))) {
                yield* this.pushCount(3);
                this.indentValue = 0;
                this.indentNext = 0;
                return 'doc';
            }
            else if (s === '...' && isEmpty(this.charAt(3))) {
                yield* this.pushCount(3);
                return 'stream';
            }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
            this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
    }
    *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
            return this.setNext('block-start');
        if ((ch0 === '-' || ch0 === '?' || ch0 === ':') && isEmpty(ch1)) {
            const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
            this.indentNext = this.indentValue + 1;
            this.indentValue += n;
            return yield* this.parseBlockStart();
        }
        return 'doc';
    }
    *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
            return this.setNext('doc');
        let n = yield* this.pushIndicators();
        switch (line[n]) {
            case '#':
                yield* this.pushCount(line.length - n);
            // fallthrough
            case undefined:
                yield* this.pushNewline();
                return yield* this.parseLineStart();
            case '{':
            case '[':
                yield* this.pushCount(1);
                this.flowKey = false;
                this.flowLevel = 1;
                return 'flow';
            case '}':
            case ']':
                // this is an error
                yield* this.pushCount(1);
                return 'doc';
            case '*':
                yield* this.pushUntil(isNotAnchorChar);
                return 'doc';
            case '"':
            case "'":
                return yield* this.parseQuotedScalar();
            case '|':
            case '>':
                n += yield* this.parseBlockScalarHeader();
                n += yield* this.pushSpaces(true);
                yield* this.pushCount(line.length - n);
                yield* this.pushNewline();
                return yield* this.parseBlockScalar();
            default:
                return yield* this.parsePlainScalar();
        }
    }
    *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
            nl = yield* this.pushNewline();
            if (nl > 0) {
                sp = yield* this.pushSpaces(false);
                this.indentValue = indent = sp;
            }
            else {
                sp = 0;
            }
            sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
            return this.setNext('flow');
        if ((indent !== -1 && indent < this.indentNext && line[0] !== '#') ||
            (indent === 0 &&
                (line.startsWith('---') || line.startsWith('...')) &&
                isEmpty(line[3]))) {
            // Allowing for the terminal ] or } at the same (rather than greater)
            // indent level as the initial [ or { is technically invalid, but
            // failing here would be surprising to users.
            const atFlowEndMarker = indent === this.indentNext - 1 &&
                this.flowLevel === 1 &&
                (line[0] === ']' || line[0] === '}');
            if (!atFlowEndMarker) {
                // this is an error
                this.flowLevel = 0;
                yield FLOW_END;
                return yield* this.parseLineStart();
            }
        }
        let n = 0;
        while (line[n] === ',') {
            n += yield* this.pushCount(1);
            n += yield* this.pushSpaces(true);
            this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
            case undefined:
                return 'flow';
            case '#':
                yield* this.pushCount(line.length - n);
                return 'flow';
            case '{':
            case '[':
                yield* this.pushCount(1);
                this.flowKey = false;
                this.flowLevel += 1;
                return 'flow';
            case '}':
            case ']':
                yield* this.pushCount(1);
                this.flowKey = true;
                this.flowLevel -= 1;
                return this.flowLevel ? 'flow' : 'doc';
            case '*':
                yield* this.pushUntil(isNotAnchorChar);
                return 'flow';
            case '"':
            case "'":
                this.flowKey = true;
                return yield* this.parseQuotedScalar();
            case ':': {
                const next = this.charAt(1);
                if (this.flowKey || isEmpty(next) || next === ',') {
                    this.flowKey = false;
                    yield* this.pushCount(1);
                    yield* this.pushSpaces(true);
                    return 'flow';
                }
            }
            // fallthrough
            default:
                this.flowKey = false;
                return yield* this.parsePlainScalar();
        }
    }
    *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
            while (end !== -1 && this.buffer[end + 1] === "'")
                end = this.buffer.indexOf("'", end + 2);
        }
        else {
            // double-quote
            while (end !== -1) {
                let n = 0;
                while (this.buffer[end - 1 - n] === '\\')
                    n += 1;
                if (n % 2 === 0)
                    break;
                end = this.buffer.indexOf('"', end + 1);
            }
        }
        // Only looking for newlines within the quotes
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf('\n', this.pos);
        if (nl !== -1) {
            while (nl !== -1) {
                const cs = this.continueScalar(nl + 1);
                if (cs === -1)
                    break;
                nl = qb.indexOf('\n', cs);
            }
            if (nl !== -1) {
                // this is an error caused by an unexpected unindent
                end = nl - (qb[nl - 1] === '\r' ? 2 : 1);
            }
        }
        if (end === -1) {
            if (!this.atEnd)
                return this.setNext('quoted-scalar');
            end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? 'flow' : 'doc';
    }
    *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
            const ch = this.buffer[++i];
            if (ch === '+')
                this.blockScalarKeep = true;
            else if (ch > '0' && ch <= '9')
                this.blockScalarIndent = Number(ch) - 1;
            else if (ch !== '-')
                break;
        }
        return yield* this.pushUntil(ch => isEmpty(ch) || ch === '#');
    }
    *parseBlockScalar() {
        let nl = this.pos - 1; // may be -1 if this.pos === 0
        let indent = 0;
        let ch;
        loop: for (let i = this.pos; (ch = this.buffer[i]); ++i) {
            switch (ch) {
                case ' ':
                    indent += 1;
                    break;
                case '\n':
                    nl = i;
                    indent = 0;
                    break;
                case '\r': {
                    const next = this.buffer[i + 1];
                    if (!next && !this.atEnd)
                        return this.setNext('block-scalar');
                    if (next === '\n')
                        break;
                } // fallthrough
                default:
                    break loop;
            }
        }
        if (!ch && !this.atEnd)
            return this.setNext('block-scalar');
        if (indent >= this.indentNext) {
            if (this.blockScalarIndent === -1)
                this.indentNext = indent;
            else
                this.indentNext += this.blockScalarIndent;
            do {
                const cs = this.continueScalar(nl + 1);
                if (cs === -1)
                    break;
                nl = this.buffer.indexOf('\n', cs);
            } while (nl !== -1);
            if (nl === -1) {
                if (!this.atEnd)
                    return this.setNext('block-scalar');
                nl = this.buffer.length;
            }
        }
        if (!this.blockScalarKeep) {
            do {
                let i = nl - 1;
                let ch = this.buffer[i];
                if (ch === '\r')
                    ch = this.buffer[--i];
                const lastChar = i; // Drop the line if last char not more indented
                while (ch === ' ' || ch === '\t')
                    ch = this.buffer[--i];
                if (ch === '\n' && i >= this.pos && i + 1 + indent > lastChar)
                    nl = i;
                else
                    break;
            } while (true);
        }
        yield SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
    }
    *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while ((ch = this.buffer[++i])) {
            if (ch === ':') {
                const next = this.buffer[i + 1];
                if (isEmpty(next) || (inFlow && next === ','))
                    break;
                end = i;
            }
            else if (isEmpty(ch)) {
                let next = this.buffer[i + 1];
                if (ch === '\r') {
                    if (next === '\n') {
                        i += 1;
                        ch = '\n';
                        next = this.buffer[i + 1];
                    }
                    else
                        end = i;
                }
                if (next === '#' || (inFlow && invalidFlowScalarChars.includes(next)))
                    break;
                if (ch === '\n') {
                    const cs = this.continueScalar(i + 1);
                    if (cs === -1)
                        break;
                    i = Math.max(i, cs - 2); // to advance, but still account for ' #'
                }
            }
            else {
                if (inFlow && invalidFlowScalarChars.includes(ch))
                    break;
                end = i;
            }
        }
        if (!ch && !this.atEnd)
            return this.setNext('plain-scalar');
        yield SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? 'flow' : 'doc';
    }
    *pushCount(n) {
        if (n > 0) {
            yield this.buffer.substr(this.pos, n);
            this.pos += n;
            return n;
        }
        return 0;
    }
    *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
            yield s;
            this.pos += s.length;
            return s.length;
        }
        else if (allowEmpty)
            yield '';
        return 0;
    }
    *pushIndicators() {
        switch (this.charAt(0)) {
            case '!':
                return ((yield* this.pushTag()) +
                    (yield* this.pushSpaces(true)) +
                    (yield* this.pushIndicators()));
            case '&':
                return ((yield* this.pushUntil(isNotAnchorChar)) +
                    (yield* this.pushSpaces(true)) +
                    (yield* this.pushIndicators()));
            case '-': // this is an error
            case '?': // this is an error outside flow collections
            case ':': {
                const inFlow = this.flowLevel > 0;
                const ch1 = this.charAt(1);
                if (isEmpty(ch1) || (inFlow && invalidFlowScalarChars.includes(ch1))) {
                    if (!inFlow)
                        this.indentNext = this.indentValue + 1;
                    else if (this.flowKey)
                        this.flowKey = false;
                    return ((yield* this.pushCount(1)) +
                        (yield* this.pushSpaces(true)) +
                        (yield* this.pushIndicators()));
                }
            }
        }
        return 0;
    }
    *pushTag() {
        if (this.charAt(1) === '<') {
            let i = this.pos + 2;
            let ch = this.buffer[i];
            while (!isEmpty(ch) && ch !== '>')
                ch = this.buffer[++i];
            return yield* this.pushToIndex(ch === '>' ? i + 1 : i, false);
        }
        else {
            let i = this.pos + 1;
            let ch = this.buffer[i];
            while (ch) {
                if (tagChars.includes(ch))
                    ch = this.buffer[++i];
                else if (ch === '%' &&
                    hexDigits.includes(this.buffer[i + 1]) &&
                    hexDigits.includes(this.buffer[i + 2])) {
                    ch = this.buffer[(i += 3)];
                }
                else
                    break;
            }
            return yield* this.pushToIndex(i, false);
        }
    }
    *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === '\n')
            return yield* this.pushCount(1);
        else if (ch === '\r' && this.charAt(1) === '\n')
            return yield* this.pushCount(2);
        else
            return 0;
    }
    *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
            ch = this.buffer[++i];
        } while (ch === ' ' || (allowTabs && ch === '\t'));
        const n = i - this.pos;
        if (n > 0) {
            yield this.buffer.substr(this.pos, n);
            this.pos = i;
        }
        return n;
    }
    *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
            ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
    }
}

/**
 * Tracks newlines during parsing in order to provide an efficient API for
 * determining the one-indexed `{ line, col }` position for any offset
 * within the input.
 */
class LineCounter {
    constructor() {
        this.lineStarts = [];
        /**
         * Should be called in ascending order. Otherwise, call
         * `lineCounter.lineStarts.sort()` before calling `linePos()`.
         */
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        /**
         * Performs a binary search and returns the 1-indexed { line, col }
         * position of `offset`. If `line === 0`, `addNewLine` has never been
         * called or `offset` is before the first known newline.
         */
        this.linePos = (offset) => {
            let low = 0;
            let high = this.lineStarts.length;
            while (low < high) {
                const mid = (low + high) >> 1; // Math.floor((low + high) / 2)
                if (this.lineStarts[mid] < offset)
                    low = mid + 1;
                else
                    high = mid;
            }
            if (this.lineStarts[low] === offset)
                return { line: low + 1, col: 1 };
            if (low === 0)
                return { line: 0, col: offset };
            const start = this.lineStarts[low - 1];
            return { line: low, col: offset - start + 1 };
        };
    }
}

function includesToken(list, type) {
    for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
            return true;
    return false;
}
function findNonEmptyIndex(list) {
    for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
            case 'space':
            case 'comment':
            case 'newline':
                break;
            default:
                return i;
        }
    }
    return -1;
}
function isFlowToken(token) {
    switch (token?.type) {
        case 'alias':
        case 'scalar':
        case 'single-quoted-scalar':
        case 'double-quoted-scalar':
        case 'flow-collection':
            return true;
        default:
            return false;
    }
}
function getPrevProps(parent) {
    switch (parent.type) {
        case 'document':
            return parent.start;
        case 'block-map': {
            const it = parent.items[parent.items.length - 1];
            return it.sep ?? it.start;
        }
        case 'block-seq':
            return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
            return [];
    }
}
/** Note: May modify input array */
function getFirstKeyStartProps(prev) {
    if (prev.length === 0)
        return [];
    let i = prev.length;
    loop: while (--i >= 0) {
        switch (prev[i].type) {
            case 'doc-start':
            case 'explicit-key-ind':
            case 'map-value-ind':
            case 'seq-item-ind':
            case 'newline':
                break loop;
        }
    }
    while (prev[++i]?.type === 'space') {
        /* loop */
    }
    return prev.splice(i, prev.length);
}
function fixFlowSeqItems(fc) {
    if (fc.start.type === 'flow-seq-start') {
        for (const it of fc.items) {
            if (it.sep &&
                !it.value &&
                !includesToken(it.start, 'explicit-key-ind') &&
                !includesToken(it.sep, 'map-value-ind')) {
                if (it.key)
                    it.value = it.key;
                delete it.key;
                if (isFlowToken(it.value)) {
                    if (it.value.end)
                        Array.prototype.push.apply(it.value.end, it.sep);
                    else
                        it.value.end = it.sep;
                }
                else
                    Array.prototype.push.apply(it.start, it.sep);
                delete it.sep;
            }
        }
    }
}
/**
 * A YAML concrete syntax tree (CST) parser
 *
 * ```ts
 * const src: string = ...
 * for (const token of new Parser().parse(src)) {
 *   // token: Token
 * }
 * ```
 *
 * To use the parser with a user-provided lexer:
 *
 * ```ts
 * function* parse(source: string, lexer: Lexer) {
 *   const parser = new Parser()
 *   for (const lexeme of lexer.lex(source))
 *     yield* parser.next(lexeme)
 *   yield* parser.end()
 * }
 *
 * const src: string = ...
 * const lexer = new Lexer()
 * for (const token of parse(src, lexer)) {
 *   // token: Token
 * }
 * ```
 */
class Parser {
    /**
     * @param onNewLine - If defined, called separately with the start position of
     *   each new line (in `parse()`, including the start of input).
     */
    constructor(onNewLine) {
        /** If true, space and sequence indicators count as indentation */
        this.atNewLine = true;
        /** If true, next token is a scalar value */
        this.atScalar = false;
        /** Current indentation level */
        this.indent = 0;
        /** Current offset since the start of parsing */
        this.offset = 0;
        /** On the same line with a block map key */
        this.onKeyLine = false;
        /** Top indicates the node that's currently being built */
        this.stack = [];
        /** The source of the current token, set in parse() */
        this.source = '';
        /** The type of the current token, set in parse() */
        this.type = '';
        // Must be defined after `next()`
        this.lexer = new Lexer();
        this.onNewLine = onNewLine;
    }
    /**
     * Parse `source` as a YAML stream.
     * If `incomplete`, a part of the last line may be left as a buffer for the next call.
     *
     * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
     *
     * @returns A generator of tokens representing each directive, document, and other structure.
     */
    *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
            this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
            yield* this.next(lexeme);
        if (!incomplete)
            yield* this.end();
    }
    /**
     * Advance the parser by the `source` of one lexical token.
     */
    *next(source) {
        this.source = source;
        if (this.atScalar) {
            this.atScalar = false;
            yield* this.step();
            this.offset += source.length;
            return;
        }
        const type = tokenType(source);
        if (!type) {
            const message = `Not a YAML token: ${source}`;
            yield* this.pop({ type: 'error', offset: this.offset, message, source });
            this.offset += source.length;
        }
        else if (type === 'scalar') {
            this.atNewLine = false;
            this.atScalar = true;
            this.type = 'scalar';
        }
        else {
            this.type = type;
            yield* this.step();
            switch (type) {
                case 'newline':
                    this.atNewLine = true;
                    this.indent = 0;
                    if (this.onNewLine)
                        this.onNewLine(this.offset + source.length);
                    break;
                case 'space':
                    if (this.atNewLine && source[0] === ' ')
                        this.indent += source.length;
                    break;
                case 'explicit-key-ind':
                case 'map-value-ind':
                case 'seq-item-ind':
                    if (this.atNewLine)
                        this.indent += source.length;
                    break;
                case 'doc-mode':
                case 'flow-error-end':
                    return;
                default:
                    this.atNewLine = false;
            }
            this.offset += source.length;
        }
    }
    /** Call at end of input to push out any remaining constructions */
    *end() {
        while (this.stack.length > 0)
            yield* this.pop();
    }
    get sourceToken() {
        const st = {
            type: this.type,
            offset: this.offset,
            indent: this.indent,
            source: this.source
        };
        return st;
    }
    *step() {
        const top = this.peek(1);
        if (this.type === 'doc-end' && (!top || top.type !== 'doc-end')) {
            while (this.stack.length > 0)
                yield* this.pop();
            this.stack.push({
                type: 'doc-end',
                offset: this.offset,
                source: this.source
            });
            return;
        }
        if (!top)
            return yield* this.stream();
        switch (top.type) {
            case 'document':
                return yield* this.document(top);
            case 'alias':
            case 'scalar':
            case 'single-quoted-scalar':
            case 'double-quoted-scalar':
                return yield* this.scalar(top);
            case 'block-scalar':
                return yield* this.blockScalar(top);
            case 'block-map':
                return yield* this.blockMap(top);
            case 'block-seq':
                return yield* this.blockSequence(top);
            case 'flow-collection':
                return yield* this.flowCollection(top);
            case 'doc-end':
                return yield* this.documentEnd(top);
        }
        /* istanbul ignore next should not happen */
        yield* this.pop();
    }
    peek(n) {
        return this.stack[this.stack.length - n];
    }
    *pop(error) {
        const token = error ?? this.stack.pop();
        /* istanbul ignore if should not happen */
        if (!token) {
            const message = 'Tried to pop an empty stack';
            yield { type: 'error', offset: this.offset, source: '', message };
        }
        else if (this.stack.length === 0) {
            yield token;
        }
        else {
            const top = this.peek(1);
            if (token.type === 'block-scalar') {
                // Block scalars use their parent rather than header indent
                token.indent = 'indent' in top ? top.indent : 0;
            }
            else if (token.type === 'flow-collection' && top.type === 'document') {
                // Ignore all indent for top-level flow collections
                token.indent = 0;
            }
            if (token.type === 'flow-collection')
                fixFlowSeqItems(token);
            switch (top.type) {
                case 'document':
                    top.value = token;
                    break;
                case 'block-scalar':
                    top.props.push(token); // error
                    break;
                case 'block-map': {
                    const it = top.items[top.items.length - 1];
                    if (it.value) {
                        top.items.push({ start: [], key: token, sep: [] });
                        this.onKeyLine = true;
                        return;
                    }
                    else if (it.sep) {
                        it.value = token;
                    }
                    else {
                        Object.assign(it, { key: token, sep: [] });
                        this.onKeyLine = !includesToken(it.start, 'explicit-key-ind');
                        return;
                    }
                    break;
                }
                case 'block-seq': {
                    const it = top.items[top.items.length - 1];
                    if (it.value)
                        top.items.push({ start: [], value: token });
                    else
                        it.value = token;
                    break;
                }
                case 'flow-collection': {
                    const it = top.items[top.items.length - 1];
                    if (!it || it.value)
                        top.items.push({ start: [], key: token, sep: [] });
                    else if (it.sep)
                        it.value = token;
                    else
                        Object.assign(it, { key: token, sep: [] });
                    return;
                }
                /* istanbul ignore next should not happen */
                default:
                    yield* this.pop();
                    yield* this.pop(token);
            }
            if ((top.type === 'document' ||
                top.type === 'block-map' ||
                top.type === 'block-seq') &&
                (token.type === 'block-map' || token.type === 'block-seq')) {
                const last = token.items[token.items.length - 1];
                if (last &&
                    !last.sep &&
                    !last.value &&
                    last.start.length > 0 &&
                    findNonEmptyIndex(last.start) === -1 &&
                    (token.indent === 0 ||
                        last.start.every(st => st.type !== 'comment' || st.indent < token.indent))) {
                    if (top.type === 'document')
                        top.end = last.start;
                    else
                        top.items.push({ start: last.start });
                    token.items.splice(-1, 1);
                }
            }
        }
    }
    *stream() {
        switch (this.type) {
            case 'directive-line':
                yield { type: 'directive', offset: this.offset, source: this.source };
                return;
            case 'byte-order-mark':
            case 'space':
            case 'comment':
            case 'newline':
                yield this.sourceToken;
                return;
            case 'doc-mode':
            case 'doc-start': {
                const doc = {
                    type: 'document',
                    offset: this.offset,
                    start: []
                };
                if (this.type === 'doc-start')
                    doc.start.push(this.sourceToken);
                this.stack.push(doc);
                return;
            }
        }
        yield {
            type: 'error',
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML stream`,
            source: this.source
        };
    }
    *document(doc) {
        if (doc.value)
            return yield* this.lineEnd(doc);
        switch (this.type) {
            case 'doc-start': {
                if (findNonEmptyIndex(doc.start) !== -1) {
                    yield* this.pop();
                    yield* this.step();
                }
                else
                    doc.start.push(this.sourceToken);
                return;
            }
            case 'anchor':
            case 'tag':
            case 'space':
            case 'comment':
            case 'newline':
                doc.start.push(this.sourceToken);
                return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
            this.stack.push(bv);
        else {
            yield {
                type: 'error',
                offset: this.offset,
                message: `Unexpected ${this.type} token in YAML document`,
                source: this.source
            };
        }
    }
    *scalar(scalar) {
        if (this.type === 'map-value-ind') {
            const prev = getPrevProps(this.peek(2));
            const start = getFirstKeyStartProps(prev);
            let sep;
            if (scalar.end) {
                sep = scalar.end;
                sep.push(this.sourceToken);
                delete scalar.end;
            }
            else
                sep = [this.sourceToken];
            const map = {
                type: 'block-map',
                offset: scalar.offset,
                indent: scalar.indent,
                items: [{ start, key: scalar, sep }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
        }
        else
            yield* this.lineEnd(scalar);
    }
    *blockScalar(scalar) {
        switch (this.type) {
            case 'space':
            case 'comment':
            case 'newline':
                scalar.props.push(this.sourceToken);
                return;
            case 'scalar':
                scalar.source = this.source;
                // block-scalar source includes trailing newline
                this.atNewLine = true;
                this.indent = 0;
                if (this.onNewLine) {
                    let nl = this.source.indexOf('\n') + 1;
                    while (nl !== 0) {
                        this.onNewLine(this.offset + nl);
                        nl = this.source.indexOf('\n', nl) + 1;
                    }
                }
                yield* this.pop();
                break;
            /* istanbul ignore next should not happen */
            default:
                yield* this.pop();
                yield* this.step();
        }
    }
    *blockMap(map) {
        const it = map.items[map.items.length - 1];
        // it.sep is true-ish if pair already has key or : separator
        switch (this.type) {
            case 'newline':
                this.onKeyLine = false;
                if (it.value) {
                    const end = 'end' in it.value ? it.value.end : undefined;
                    const last = Array.isArray(end) ? end[end.length - 1] : undefined;
                    if (last?.type === 'comment')
                        end?.push(this.sourceToken);
                    else
                        map.items.push({ start: [this.sourceToken] });
                }
                else if (it.sep) {
                    it.sep.push(this.sourceToken);
                }
                else {
                    it.start.push(this.sourceToken);
                }
                return;
            case 'space':
            case 'comment':
                if (it.value) {
                    map.items.push({ start: [this.sourceToken] });
                }
                else if (it.sep) {
                    it.sep.push(this.sourceToken);
                }
                else {
                    if (this.atIndentedComment(it.start, map.indent)) {
                        const prev = map.items[map.items.length - 2];
                        const end = prev?.value?.end;
                        if (Array.isArray(end)) {
                            Array.prototype.push.apply(end, it.start);
                            end.push(this.sourceToken);
                            map.items.pop();
                            return;
                        }
                    }
                    it.start.push(this.sourceToken);
                }
                return;
        }
        if (this.indent >= map.indent) {
            const atNextItem = !this.onKeyLine && this.indent === map.indent && it.sep;
            // For empty nodes, assign newline-separated not indented empty tokens to following node
            let start = [];
            if (atNextItem && it.sep && !it.value) {
                const nl = [];
                for (let i = 0; i < it.sep.length; ++i) {
                    const st = it.sep[i];
                    switch (st.type) {
                        case 'newline':
                            nl.push(i);
                            break;
                        case 'space':
                            break;
                        case 'comment':
                            if (st.indent > map.indent)
                                nl.length = 0;
                            break;
                        default:
                            nl.length = 0;
                    }
                }
                if (nl.length >= 2)
                    start = it.sep.splice(nl[1]);
            }
            switch (this.type) {
                case 'anchor':
                case 'tag':
                    if (atNextItem || it.value) {
                        start.push(this.sourceToken);
                        map.items.push({ start });
                        this.onKeyLine = true;
                    }
                    else if (it.sep) {
                        it.sep.push(this.sourceToken);
                    }
                    else {
                        it.start.push(this.sourceToken);
                    }
                    return;
                case 'explicit-key-ind':
                    if (!it.sep && !includesToken(it.start, 'explicit-key-ind')) {
                        it.start.push(this.sourceToken);
                    }
                    else if (atNextItem || it.value) {
                        start.push(this.sourceToken);
                        map.items.push({ start });
                    }
                    else {
                        this.stack.push({
                            type: 'block-map',
                            offset: this.offset,
                            indent: this.indent,
                            items: [{ start: [this.sourceToken] }]
                        });
                    }
                    this.onKeyLine = true;
                    return;
                case 'map-value-ind':
                    if (includesToken(it.start, 'explicit-key-ind')) {
                        if (!it.sep) {
                            if (includesToken(it.start, 'newline')) {
                                Object.assign(it, { key: null, sep: [this.sourceToken] });
                            }
                            else {
                                const start = getFirstKeyStartProps(it.start);
                                this.stack.push({
                                    type: 'block-map',
                                    offset: this.offset,
                                    indent: this.indent,
                                    items: [{ start, key: null, sep: [this.sourceToken] }]
                                });
                            }
                        }
                        else if (it.value) {
                            map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                        }
                        else if (includesToken(it.sep, 'map-value-ind')) {
                            this.stack.push({
                                type: 'block-map',
                                offset: this.offset,
                                indent: this.indent,
                                items: [{ start, key: null, sep: [this.sourceToken] }]
                            });
                        }
                        else if (isFlowToken(it.key) &&
                            !includesToken(it.sep, 'newline')) {
                            const start = getFirstKeyStartProps(it.start);
                            const key = it.key;
                            const sep = it.sep;
                            sep.push(this.sourceToken);
                            // @ts-expect-error type guard is wrong here
                            delete it.key, delete it.sep;
                            this.stack.push({
                                type: 'block-map',
                                offset: this.offset,
                                indent: this.indent,
                                items: [{ start, key, sep }]
                            });
                        }
                        else if (start.length > 0) {
                            // Not actually at next item
                            it.sep = it.sep.concat(start, this.sourceToken);
                        }
                        else {
                            it.sep.push(this.sourceToken);
                        }
                    }
                    else {
                        if (!it.sep) {
                            Object.assign(it, { key: null, sep: [this.sourceToken] });
                        }
                        else if (it.value || atNextItem) {
                            map.items.push({ start, key: null, sep: [this.sourceToken] });
                        }
                        else if (includesToken(it.sep, 'map-value-ind')) {
                            this.stack.push({
                                type: 'block-map',
                                offset: this.offset,
                                indent: this.indent,
                                items: [{ start: [], key: null, sep: [this.sourceToken] }]
                            });
                        }
                        else {
                            it.sep.push(this.sourceToken);
                        }
                    }
                    this.onKeyLine = true;
                    return;
                case 'alias':
                case 'scalar':
                case 'single-quoted-scalar':
                case 'double-quoted-scalar': {
                    const fs = this.flowScalar(this.type);
                    if (atNextItem || it.value) {
                        map.items.push({ start, key: fs, sep: [] });
                        this.onKeyLine = true;
                    }
                    else if (it.sep) {
                        this.stack.push(fs);
                    }
                    else {
                        Object.assign(it, { key: fs, sep: [] });
                        this.onKeyLine = true;
                    }
                    return;
                }
                default: {
                    const bv = this.startBlockValue(map);
                    if (bv) {
                        if (atNextItem &&
                            bv.type !== 'block-seq' &&
                            includesToken(it.start, 'explicit-key-ind')) {
                            map.items.push({ start });
                        }
                        this.stack.push(bv);
                        return;
                    }
                }
            }
        }
        yield* this.pop();
        yield* this.step();
    }
    *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
            case 'newline':
                if (it.value) {
                    const end = 'end' in it.value ? it.value.end : undefined;
                    const last = Array.isArray(end) ? end[end.length - 1] : undefined;
                    if (last?.type === 'comment')
                        end?.push(this.sourceToken);
                    else
                        seq.items.push({ start: [this.sourceToken] });
                }
                else
                    it.start.push(this.sourceToken);
                return;
            case 'space':
            case 'comment':
                if (it.value)
                    seq.items.push({ start: [this.sourceToken] });
                else {
                    if (this.atIndentedComment(it.start, seq.indent)) {
                        const prev = seq.items[seq.items.length - 2];
                        const end = prev?.value?.end;
                        if (Array.isArray(end)) {
                            Array.prototype.push.apply(end, it.start);
                            end.push(this.sourceToken);
                            seq.items.pop();
                            return;
                        }
                    }
                    it.start.push(this.sourceToken);
                }
                return;
            case 'anchor':
            case 'tag':
                if (it.value || this.indent <= seq.indent)
                    break;
                it.start.push(this.sourceToken);
                return;
            case 'seq-item-ind':
                if (this.indent !== seq.indent)
                    break;
                if (it.value || includesToken(it.start, 'seq-item-ind'))
                    seq.items.push({ start: [this.sourceToken] });
                else
                    it.start.push(this.sourceToken);
                return;
        }
        if (this.indent > seq.indent) {
            const bv = this.startBlockValue(seq);
            if (bv) {
                this.stack.push(bv);
                return;
            }
        }
        yield* this.pop();
        yield* this.step();
    }
    *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === 'flow-error-end') {
            let top;
            do {
                yield* this.pop();
                top = this.peek(1);
            } while (top && top.type === 'flow-collection');
        }
        else if (fc.end.length === 0) {
            switch (this.type) {
                case 'comma':
                case 'explicit-key-ind':
                    if (!it || it.sep)
                        fc.items.push({ start: [this.sourceToken] });
                    else
                        it.start.push(this.sourceToken);
                    return;
                case 'map-value-ind':
                    if (!it || it.value)
                        fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
                    else if (it.sep)
                        it.sep.push(this.sourceToken);
                    else
                        Object.assign(it, { key: null, sep: [this.sourceToken] });
                    return;
                case 'space':
                case 'comment':
                case 'newline':
                case 'anchor':
                case 'tag':
                    if (!it || it.value)
                        fc.items.push({ start: [this.sourceToken] });
                    else if (it.sep)
                        it.sep.push(this.sourceToken);
                    else
                        it.start.push(this.sourceToken);
                    return;
                case 'alias':
                case 'scalar':
                case 'single-quoted-scalar':
                case 'double-quoted-scalar': {
                    const fs = this.flowScalar(this.type);
                    if (!it || it.value)
                        fc.items.push({ start: [], key: fs, sep: [] });
                    else if (it.sep)
                        this.stack.push(fs);
                    else
                        Object.assign(it, { key: fs, sep: [] });
                    return;
                }
                case 'flow-map-end':
                case 'flow-seq-end':
                    fc.end.push(this.sourceToken);
                    return;
            }
            const bv = this.startBlockValue(fc);
            /* istanbul ignore else should not happen */
            if (bv)
                this.stack.push(bv);
            else {
                yield* this.pop();
                yield* this.step();
            }
        }
        else {
            const parent = this.peek(2);
            if (parent.type === 'block-map' &&
                ((this.type === 'map-value-ind' && parent.indent === fc.indent) ||
                    (this.type === 'newline' &&
                        !parent.items[parent.items.length - 1].sep))) {
                yield* this.pop();
                yield* this.step();
            }
            else if (this.type === 'map-value-ind' &&
                parent.type !== 'flow-collection') {
                const prev = getPrevProps(parent);
                const start = getFirstKeyStartProps(prev);
                fixFlowSeqItems(fc);
                const sep = fc.end.splice(1, fc.end.length);
                sep.push(this.sourceToken);
                const map = {
                    type: 'block-map',
                    offset: fc.offset,
                    indent: fc.indent,
                    items: [{ start, key: fc, sep }]
                };
                this.onKeyLine = true;
                this.stack[this.stack.length - 1] = map;
            }
            else {
                yield* this.lineEnd(fc);
            }
        }
    }
    flowScalar(type) {
        if (this.onNewLine) {
            let nl = this.source.indexOf('\n') + 1;
            while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf('\n', nl) + 1;
            }
        }
        return {
            type,
            offset: this.offset,
            indent: this.indent,
            source: this.source
        };
    }
    startBlockValue(parent) {
        switch (this.type) {
            case 'alias':
            case 'scalar':
            case 'single-quoted-scalar':
            case 'double-quoted-scalar':
                return this.flowScalar(this.type);
            case 'block-scalar-header':
                return {
                    type: 'block-scalar',
                    offset: this.offset,
                    indent: this.indent,
                    props: [this.sourceToken],
                    source: ''
                };
            case 'flow-map-start':
            case 'flow-seq-start':
                return {
                    type: 'flow-collection',
                    offset: this.offset,
                    indent: this.indent,
                    start: this.sourceToken,
                    items: [],
                    end: []
                };
            case 'seq-item-ind':
                return {
                    type: 'block-seq',
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [this.sourceToken] }]
                };
            case 'explicit-key-ind': {
                this.onKeyLine = true;
                const prev = getPrevProps(parent);
                const start = getFirstKeyStartProps(prev);
                start.push(this.sourceToken);
                return {
                    type: 'block-map',
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start }]
                };
            }
            case 'map-value-ind': {
                this.onKeyLine = true;
                const prev = getPrevProps(parent);
                const start = getFirstKeyStartProps(prev);
                return {
                    type: 'block-map',
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                };
            }
        }
        return null;
    }
    atIndentedComment(start, indent) {
        if (this.type !== 'comment')
            return false;
        if (this.indent <= indent)
            return false;
        return start.every(st => st.type === 'newline' || st.type === 'space');
    }
    *documentEnd(docEnd) {
        if (this.type !== 'doc-mode') {
            if (docEnd.end)
                docEnd.end.push(this.sourceToken);
            else
                docEnd.end = [this.sourceToken];
            if (this.type === 'newline')
                yield* this.pop();
        }
    }
    *lineEnd(token) {
        switch (this.type) {
            case 'comma':
            case 'doc-start':
            case 'doc-end':
            case 'flow-seq-end':
            case 'flow-map-end':
            case 'map-value-ind':
                yield* this.pop();
                yield* this.step();
                break;
            case 'newline':
                this.onKeyLine = false;
            // fallthrough
            case 'space':
            case 'comment':
            default:
                // all other values are errors
                if (token.end)
                    token.end.push(this.sourceToken);
                else
                    token.end = [this.sourceToken];
                if (this.type === 'newline')
                    yield* this.pop();
        }
    }
}

function parseOptions(options) {
    const prettyErrors = options.prettyErrors !== false;
    const lineCounter = options.lineCounter || (prettyErrors && new LineCounter()) || null;
    return { lineCounter, prettyErrors };
}
/**
 * Parse the input as a stream of YAML documents.
 *
 * Documents should be separated from each other by `...` or `---` marker lines.
 *
 * @returns If an empty `docs` array is returned, it will be of type
 *   EmptyStream and contain additional stream information. In
 *   TypeScript, you should use `'empty' in docs` as a type guard for it.
 */
function parseAllDocuments(source, options = {}) {
    const { lineCounter, prettyErrors } = parseOptions(options);
    const parser = new Parser(lineCounter?.addNewLine);
    const composer = new Composer(options);
    const docs = Array.from(composer.compose(parser.parse(source)));
    if (prettyErrors && lineCounter)
        for (const doc of docs) {
            doc.errors.forEach(prettifyError(source, lineCounter));
            doc.warnings.forEach(prettifyError(source, lineCounter));
        }
    if (docs.length > 0)
        return docs;
    return Object.assign([], { empty: true }, composer.streamInfo());
}
/** Parse an input string into a single YAML.Document */
function parseDocument(source, options = {}) {
    const { lineCounter, prettyErrors } = parseOptions(options);
    const parser = new Parser(lineCounter?.addNewLine);
    const composer = new Composer(options);
    // `doc` is always set by compose.end(true) at the very latest
    let doc = null;
    for (const _doc of composer.compose(parser.parse(source), true, source.length)) {
        if (!doc)
            doc = _doc;
        else if (doc.options.logLevel !== 'silent') {
            doc.errors.push(new YAMLParseError(_doc.range.slice(0, 2), 'MULTIPLE_DOCS', 'Source contains multiple documents; please use YAML.parseAllDocuments()'));
            break;
        }
    }
    if (prettyErrors && lineCounter) {
        doc.errors.forEach(prettifyError(source, lineCounter));
        doc.warnings.forEach(prettifyError(source, lineCounter));
    }
    return doc;
}
function parse(src, reviver, options) {
    let _reviver = undefined;
    if (typeof reviver === 'function') {
        _reviver = reviver;
    }
    else if (options === undefined && reviver && typeof reviver === 'object') {
        options = reviver;
    }
    const doc = parseDocument(src, options);
    if (!doc)
        return null;
    doc.warnings.forEach(warning => warn(doc.options.logLevel, warning));
    if (doc.errors.length > 0) {
        if (doc.options.logLevel !== 'silent')
            throw doc.errors[0];
        else
            doc.errors = [];
    }
    return doc.toJS(Object.assign({ reviver: _reviver }, options));
}
function stringify(value, replacer, options) {
    let _replacer = null;
    if (typeof replacer === 'function' || Array.isArray(replacer)) {
        _replacer = replacer;
    }
    else if (options === undefined && replacer) {
        options = replacer;
    }
    if (typeof options === 'string')
        options = options.length;
    if (typeof options === 'number') {
        const indent = Math.round(options);
        options = indent < 1 ? undefined : indent > 8 ? { indent: 8 } : { indent };
    }
    if (value === undefined) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
            return undefined;
    }
    return new Document(value, _replacer, options).toString(options);
}

var YAML = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Alias: Alias,
    CST: cst,
    Composer: Composer,
    Document: Document,
    Lexer: Lexer,
    LineCounter: LineCounter,
    Pair: Pair,
    Parser: Parser,
    Scalar: Scalar,
    Schema: Schema,
    YAMLError: YAMLError,
    YAMLMap: YAMLMap,
    YAMLParseError: YAMLParseError,
    YAMLSeq: YAMLSeq,
    YAMLWarning: YAMLWarning,
    isAlias: isAlias,
    isCollection: isCollection$1,
    isDocument: isDocument,
    isMap: isMap,
    isNode: isNode,
    isPair: isPair,
    isScalar: isScalar$1,
    isSeq: isSeq,
    parse: parse,
    parseAllDocuments: parseAllDocuments,
    parseDocument: parseDocument,
    stringify: stringify,
    visit: visit$1,
    visitAsync: visitAsync
});

class ParsingError extends Error {
    constructor(msg, inner = undefined) {
        super(msg);
        this.inner = inner;
    }
    toString() {
        if (this.inner) {
            return `${this.message}: '${this.inner}'`;
        }
        return super.toString();
    }
}
function parseQuery(raw) {
    let obj;
    try {
        obj = tryParseAsJson(raw);
    }
    catch (e) {
        try {
            obj = tryParseAsYaml(raw);
        }
        catch (e) {
            throw new ParsingError("Unable to parse as YAML or JSON");
        }
    }
    return parseObject(obj);
}
function tryParseAsJson(raw) {
    try {
        return JSON.parse(raw);
    }
    catch (e) {
        throw new ParsingError("Invalid JSON", e);
    }
}
function tryParseAsYaml(raw) {
    try {
        return YAML.parse(raw);
    }
    catch (e) {
        throw new ParsingError("Invalid YAML", e);
    }
}
function parseObject(query) {
    if (!query.hasOwnProperty("name") || query.name === null) {
        throw new ParsingError("Missing field 'name' in query");
    }
    if (!query.hasOwnProperty("filter") || query.filter === null) {
        throw new ParsingError("Missing field 'filter' in query");
    }
    if (query.hasOwnProperty("autorefresh") &&
        (isNaN(query.autorefresh) || query.autorefresh < 0)) {
        throw new ParsingError("'autorefresh' field must be a positive number.");
    }
    if (query.hasOwnProperty("sorting")) {
        if (!Array.isArray(query.sorting)) {
            throw new ParsingError(`'sorting' field must be an array of strings within the set [${formatSortingOpts()}].`);
        }
        const sorting = query.sorting;
        for (const element of sorting) {
            if (!(typeof element == "string") || !isSortingOption(element)) {
                throw new ParsingError(`'sorting' field must be an array of strings within the set [${formatSortingOpts()}].`);
            }
        }
    }
    if (query.hasOwnProperty("group") && typeof query.group != "boolean") {
        throw new ParsingError("'group' field must be a boolean.");
    }
    return query;
}
function formatSortingOpts() {
    return sortingOptions.map((e) => `'${e}'`).join(", ");
}

/* src/ui/NoTaskDisplay.svelte generated by Svelte v3.58.0 */

function create_fragment$b(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.innerHTML = `<p>Nothing to-do! Sit back and relax.</p>`;
			attr(div, "class", "todoist-success");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

class NoTaskDisplay extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$b, safe_not_equal, {});
	}
}

function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
    const o = +getComputedStyle(node).opacity;
    return {
        delay,
        duration,
        easing,
        css: t => `opacity: ${t * o}`
    };
}

/* src/components/icons/CalendarIcon.svelte generated by Svelte v3.58.0 */

function create_fragment$a(ctx) {
	let svg;
	let path;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr(path, "fill-rule", "evenodd");
			attr(path, "d", "M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z");
			attr(path, "clip-rule", "evenodd");
			attr(svg, "class", /*clazz*/ ctx[0]);
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "viewBox", "0 0 20 20");
			attr(svg, "fill", "currentColor");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);
		},
		p(ctx, [dirty]) {
			if (dirty & /*clazz*/ 1) {
				attr(svg, "class", /*clazz*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function instance$9($$self, $$props, $$invalidate) {
	let { class: clazz } = $$props;

	$$self.$$set = $$props => {
		if ('class' in $$props) $$invalidate(0, clazz = $$props.class);
	};

	return [clazz];
}

class CalendarIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$9, create_fragment$a, safe_not_equal, { class: 0 });
	}
}

/* src/components/icons/LabelIcon.svelte generated by Svelte v3.58.0 */

function create_fragment$9(ctx) {
	let svg;
	let path;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr(path, "fill-rule", "evenodd");
			attr(path, "d", "M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z");
			attr(path, "clip-rule", "evenodd");
			attr(svg, "class", /*clazz*/ ctx[0]);
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "viewBox", "0 0 20 20");
			attr(svg, "fill", "currentColor");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);
		},
		p(ctx, [dirty]) {
			if (dirty & /*clazz*/ 1) {
				attr(svg, "class", /*clazz*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function instance$8($$self, $$props, $$invalidate) {
	let { class: clazz } = $$props;

	$$self.$$set = $$props => {
		if ('class' in $$props) $$invalidate(0, clazz = $$props.class);
	};

	return [clazz];
}

class LabelIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$8, create_fragment$9, safe_not_equal, { class: 0 });
	}
}

/* src/components/icons/ProjectIcon.svelte generated by Svelte v3.58.0 */

function create_fragment$8(ctx) {
	let svg;
	let path;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr(path, "fill-rule", "evenodd");
			attr(path, "d", "M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z");
			attr(path, "clip-rule", "evenodd");
			attr(svg, "class", /*clazz*/ ctx[0]);
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "viewBox", "0 0 20 20");
			attr(svg, "fill", "currentColor");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);
		},
		p(ctx, [dirty]) {
			if (dirty & /*clazz*/ 1) {
				attr(svg, "class", /*clazz*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	let { class: clazz } = $$props;

	$$self.$$set = $$props => {
		if ('class' in $$props) $$invalidate(0, clazz = $$props.class);
	};

	return [clazz];
}

class ProjectIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$7, create_fragment$8, safe_not_equal, { class: 0 });
	}
}

/* src/components/MarkdownRenderer.svelte generated by Svelte v3.58.0 */

function create_fragment$7(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "class", /*clazz*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			/*div_binding*/ ctx[3](div);
		},
		p(ctx, [dirty]) {
			if (dirty & /*clazz*/ 1) {
				attr(div, "class", /*clazz*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*div_binding*/ ctx[3](null);
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
	let { content } = $$props;
	let { class: clazz = undefined } = $$props;
	let containerEl;

	onMount(async () => {
		await obsidian.MarkdownRenderer.renderMarkdown(content, containerEl, "", null);

		if (containerEl.childElementCount > 1) {
			return;
		}

		const markdownContent = containerEl.querySelector("p");

		if (markdownContent) {
			markdownContent.parentElement.removeChild(markdownContent);
			$$invalidate(1, containerEl.innerHTML = markdownContent.innerHTML, containerEl);
		}
	});

	function div_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			containerEl = $$value;
			$$invalidate(1, containerEl);
		});
	}

	$$self.$$set = $$props => {
		if ('content' in $$props) $$invalidate(2, content = $$props.content);
		if ('class' in $$props) $$invalidate(0, clazz = $$props.class);
	};

	return [clazz, containerEl, content, div_binding];
}

class MarkdownRenderer_1 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$6, create_fragment$7, safe_not_equal, { content: 2, class: 0 });
	}
}

function showTaskContext(taskCtx, position) {
    new obsidian.Menu()
        .addItem((menuItem) => menuItem
        .setTitle("Complete task")
        .setIcon("check-small")
        .onClick(async () => taskCtx.onClickTask(taskCtx.task)))
        .addItem((menuItem) => menuItem
        .setTitle("Open task in Todoist (app)")
        .setIcon("popup-open")
        .onClick(() => {
        openExternal(`todoist://task?id=${taskCtx.task.id}`);
    }))
        .addItem((menuItem) => menuItem
        .setTitle("Open task in Todoist (web)")
        .setIcon("popup-open")
        .onClick(() => openExternal(`https://todoist.com/app/project/${taskCtx.task.projectID}/task/${taskCtx.task.id}`)))
        .showAtPosition(position);
}
const openExternal = async (url) => {
    try {
        await getElectronOpenExternal()(url);
    }
    catch (_a) {
        new obsidian.Notice("Failed to open in external application.");
    }
};
let electronOpenExternal;
function getElectronOpenExternal() {
    if (electronOpenExternal) {
        return electronOpenExternal;
    }
    try {
        electronOpenExternal = require("electron").shell.openExternal;
    }
    catch (e) {
        electronOpenExternal = (url) => Promise.resolve();
    }
    return electronOpenExternal;
}

/* src/ui/DescriptionRenderer.svelte generated by Svelte v3.58.0 */

function create_else_block$1(ctx) {
	let span;
	let t0_value = /*description*/ ctx[0].split("\n")[0] + "";
	let t0;
	let t1;

	return {
		c() {
			span = element("span");
			t0 = text(t0_value);
			t1 = text("...");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t0);
			append(span, t1);
		},
		p(ctx, dirty) {
			if (dirty & /*description*/ 1 && t0_value !== (t0_value = /*description*/ ctx[0].split("\n")[0] + "")) set_data(t0, t0_value);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (19:2) {#if isExpandedContent}
function create_if_block$4(ctx) {
	let markdownrenderer;
	let current;

	markdownrenderer = new MarkdownRenderer_1({
			props: { content: /*description*/ ctx[0] }
		});

	return {
		c() {
			create_component(markdownrenderer.$$.fragment);
		},
		m(target, anchor) {
			mount_component(markdownrenderer, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const markdownrenderer_changes = {};
			if (dirty & /*description*/ 1) markdownrenderer_changes.content = /*description*/ ctx[0];
			markdownrenderer.$set(markdownrenderer_changes);
		},
		i(local) {
			if (current) return;
			transition_in(markdownrenderer.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(markdownrenderer.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(markdownrenderer, detaching);
		}
	};
}

function create_fragment$6(ctx) {
	let div;
	let current_block_type_index;
	let if_block;
	let current;
	let mounted;
	let dispose;
	const if_block_creators = [create_if_block$4, create_else_block$1];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*isExpandedContent*/ ctx[1]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			div = element("div");
			if_block.c();
			attr(div, "class", "todoist-task-description");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if_blocks[current_block_type_index].m(div, null);
			current = true;

			if (!mounted) {
				dispose = listen(div, "dblclick", /*toggleExpandedContent*/ ctx[2]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(div, null);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if_blocks[current_block_type_index].d();
			mounted = false;
			dispose();
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
	let isComplex;
	let isExpandedContent;
	let { description } = $$props;

	function toggleExpandedContent() {
		if (!isComplex) {
			return;
		}

		$$invalidate(1, isExpandedContent = !isExpandedContent);
	}

	$$self.$$set = $$props => {
		if ('description' in $$props) $$invalidate(0, description = $$props.description);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*description*/ 1) {
			$$invalidate(3, isComplex = description.contains("\n") || description.startsWith("#") || description.startsWith("*") || description.startsWith("-") || description.startsWith("1."));
		}

		if ($$self.$$.dirty & /*isComplex*/ 8) {
			$$invalidate(1, isExpandedContent = !isComplex);
		}
	};

	return [description, isExpandedContent, toggleExpandedContent, isComplex];
}

class DescriptionRenderer extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$5, create_fragment$6, safe_not_equal, { description: 0 });
	}
}

/* src/ui/TaskRenderer.svelte generated by Svelte v3.58.0 */

function create_if_block_7(ctx) {
	let descriptionrenderer;
	let current;

	descriptionrenderer = new DescriptionRenderer({
			props: { description: /*todo*/ ctx[5].description }
		});

	return {
		c() {
			create_component(descriptionrenderer.$$.fragment);
		},
		m(target, anchor) {
			mount_component(descriptionrenderer, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const descriptionrenderer_changes = {};
			if (dirty & /*todo*/ 32) descriptionrenderer_changes.description = /*todo*/ ctx[5].description;
			descriptionrenderer.$set(descriptionrenderer_changes);
		},
		i(local) {
			if (current) return;
			transition_in(descriptionrenderer.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(descriptionrenderer.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(descriptionrenderer, detaching);
		}
	};
}

// (106:4) {#if settings.renderProject && renderProject}
function create_if_block_5(ctx) {
	let div;
	let t0;
	let t1;
	let current;
	let if_block = /*settings*/ ctx[0].renderProjectIcon && create_if_block_6();

	return {
		c() {
			div = element("div");
			if (if_block) if_block.c();
			t0 = space();
			t1 = text(/*projectLabel*/ ctx[8]);
			attr(div, "class", "task-project");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block) if_block.m(div, null);
			append(div, t0);
			append(div, t1);
			current = true;
		},
		p(ctx, dirty) {
			if (/*settings*/ ctx[0].renderProjectIcon) {
				if (if_block) {
					if (dirty & /*settings*/ 1) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_6();
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div, t0);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (!current || dirty & /*projectLabel*/ 256) set_data(t1, /*projectLabel*/ ctx[8]);
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
		}
	};
}

// (108:8) {#if settings.renderProjectIcon}
function create_if_block_6(ctx) {
	let projecticon;
	let current;
	projecticon = new ProjectIcon({ props: { class: "task-project-icon" } });

	return {
		c() {
			create_component(projecticon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(projecticon, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(projecticon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(projecticon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(projecticon, detaching);
		}
	};
}

// (114:4) {#if settings.renderDate && todo.date}
function create_if_block_3$1(ctx) {
	let div;
	let t0;
	let t1_value = /*todo*/ ctx[5].date + "";
	let t1;
	let div_class_value;
	let current;
	let if_block = /*settings*/ ctx[0].renderDateIcon && create_if_block_4$1();

	return {
		c() {
			div = element("div");
			if (if_block) if_block.c();
			t0 = space();
			t1 = text(t1_value);
			attr(div, "class", div_class_value = "task-date " + /*dateTimeClass*/ ctx[9]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block) if_block.m(div, null);
			append(div, t0);
			append(div, t1);
			current = true;
		},
		p(ctx, dirty) {
			if (/*settings*/ ctx[0].renderDateIcon) {
				if (if_block) {
					if (dirty & /*settings*/ 1) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_4$1();
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div, t0);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if ((!current || dirty & /*todo*/ 32) && t1_value !== (t1_value = /*todo*/ ctx[5].date + "")) set_data(t1, t1_value);

			if (!current || dirty & /*dateTimeClass*/ 512 && div_class_value !== (div_class_value = "task-date " + /*dateTimeClass*/ ctx[9])) {
				attr(div, "class", div_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
		}
	};
}

// (116:8) {#if settings.renderDateIcon}
function create_if_block_4$1(ctx) {
	let calendaricon;
	let current;
	calendaricon = new CalendarIcon({ props: { class: "task-calendar-icon" } });

	return {
		c() {
			create_component(calendaricon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(calendaricon, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(calendaricon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(calendaricon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(calendaricon, detaching);
		}
	};
}

// (122:4) {#if settings.renderLabels && todo.labels.length > 0}
function create_if_block_1$3(ctx) {
	let div;
	let t0;
	let t1;
	let current;
	let if_block = /*settings*/ ctx[0].renderLabelsIcon && create_if_block_2$1();

	return {
		c() {
			div = element("div");
			if (if_block) if_block.c();
			t0 = space();
			t1 = text(/*labels*/ ctx[7]);
			attr(div, "class", "task-labels");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block) if_block.m(div, null);
			append(div, t0);
			append(div, t1);
			current = true;
		},
		p(ctx, dirty) {
			if (/*settings*/ ctx[0].renderLabelsIcon) {
				if (if_block) {
					if (dirty & /*settings*/ 1) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_2$1();
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div, t0);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (!current || dirty & /*labels*/ 128) set_data(t1, /*labels*/ ctx[7]);
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
		}
	};
}

// (124:8) {#if settings.renderLabelsIcon}
function create_if_block_2$1(ctx) {
	let labelicon;
	let current;
	labelicon = new LabelIcon({ props: { class: "task-labels-icon" } });

	return {
		c() {
			create_component(labelicon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(labelicon, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(labelicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(labelicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(labelicon, detaching);
		}
	};
}

// (131:2) {#if todo.children.length != 0}
function create_if_block$3(ctx) {
	let tasklist;
	let current;

	tasklist = new TaskList({
			props: {
				tasks: /*todo*/ ctx[5].children,
				settings: /*settings*/ ctx[0],
				api: /*api*/ ctx[1],
				sorting: /*sorting*/ ctx[2],
				renderProject: /*renderProject*/ ctx[3],
				renderNoTaskInfo: false
			}
		});

	return {
		c() {
			create_component(tasklist.$$.fragment);
		},
		m(target, anchor) {
			mount_component(tasklist, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const tasklist_changes = {};
			if (dirty & /*todo*/ 32) tasklist_changes.tasks = /*todo*/ ctx[5].children;
			if (dirty & /*settings*/ 1) tasklist_changes.settings = /*settings*/ ctx[0];
			if (dirty & /*api*/ 2) tasklist_changes.api = /*api*/ ctx[1];
			if (dirty & /*sorting*/ 4) tasklist_changes.sorting = /*sorting*/ ctx[2];
			if (dirty & /*renderProject*/ 8) tasklist_changes.renderProject = /*renderProject*/ ctx[3];
			tasklist.$set(tasklist_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tasklist.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tasklist.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(tasklist, detaching);
		}
	};
}

function create_fragment$5(ctx) {
	let li;
	let div0;
	let input;
	let input_disabled_value;
	let t0;
	let markdownrenderer;
	let t1;
	let t2;
	let div1;
	let t3;
	let t4;
	let t5;
	let li_class_value;
	let li_transition;
	let current;
	let mounted;
	let dispose;

	markdownrenderer = new MarkdownRenderer_1({
			props: {
				class: "todoist-task-content",
				content: /*sanitizedContent*/ ctx[6]
			}
		});

	let if_block0 = /*todo*/ ctx[5].description != "" && create_if_block_7(ctx);
	let if_block1 = /*settings*/ ctx[0].renderProject && /*renderProject*/ ctx[3] && create_if_block_5(ctx);
	let if_block2 = /*settings*/ ctx[0].renderDate && /*todo*/ ctx[5].date && create_if_block_3$1(ctx);
	let if_block3 = /*settings*/ ctx[0].renderLabels && /*todo*/ ctx[5].labels.length > 0 && create_if_block_1$3(ctx);
	let if_block4 = /*todo*/ ctx[5].children.length != 0 && create_if_block$3(ctx);

	return {
		c() {
			li = element("li");
			div0 = element("div");
			input = element("input");
			t0 = space();
			create_component(markdownrenderer.$$.fragment);
			t1 = space();
			if (if_block0) if_block0.c();
			t2 = space();
			div1 = element("div");
			if (if_block1) if_block1.c();
			t3 = space();
			if (if_block2) if_block2.c();
			t4 = space();
			if (if_block3) if_block3.c();
			t5 = space();
			if (if_block4) if_block4.c();
			input.disabled = input_disabled_value = !/*isCompletable*/ ctx[11];
			attr(input, "data-line", "1");
			attr(input, "class", "task-list-item-checkbox");
			attr(input, "type", "checkbox");
			attr(div1, "class", "task-metadata");
			attr(li, "class", li_class_value = "task-list-item " + /*priorityClass*/ ctx[10] + " " + /*dateTimeClass*/ ctx[9]);
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, div0);
			append(div0, input);
			append(div0, t0);
			mount_component(markdownrenderer, div0, null);
			append(li, t1);
			if (if_block0) if_block0.m(li, null);
			append(li, t2);
			append(li, div1);
			if (if_block1) if_block1.m(div1, null);
			append(div1, t3);
			if (if_block2) if_block2.m(div1, null);
			append(div1, t4);
			if (if_block3) if_block3.m(div1, null);
			append(li, t5);
			if (if_block4) if_block4.m(li, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen(input, "click", prevent_default(/*click_handler*/ ctx[14])),
					listen(li, "contextmenu", /*onClickTaskContainer*/ ctx[12])
				];

				mounted = true;
			}
		},
		p(new_ctx, [dirty]) {
			ctx = new_ctx;

			if (!current || dirty & /*isCompletable*/ 2048 && input_disabled_value !== (input_disabled_value = !/*isCompletable*/ ctx[11])) {
				input.disabled = input_disabled_value;
			}

			const markdownrenderer_changes = {};
			if (dirty & /*sanitizedContent*/ 64) markdownrenderer_changes.content = /*sanitizedContent*/ ctx[6];
			markdownrenderer.$set(markdownrenderer_changes);

			if (/*todo*/ ctx[5].description != "") {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty & /*todo*/ 32) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_7(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(li, t2);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*settings*/ ctx[0].renderProject && /*renderProject*/ ctx[3]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*settings, renderProject*/ 9) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_5(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(div1, t3);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}

			if (/*settings*/ ctx[0].renderDate && /*todo*/ ctx[5].date) {
				if (if_block2) {
					if_block2.p(ctx, dirty);

					if (dirty & /*settings, todo*/ 33) {
						transition_in(if_block2, 1);
					}
				} else {
					if_block2 = create_if_block_3$1(ctx);
					if_block2.c();
					transition_in(if_block2, 1);
					if_block2.m(div1, t4);
				}
			} else if (if_block2) {
				group_outros();

				transition_out(if_block2, 1, 1, () => {
					if_block2 = null;
				});

				check_outros();
			}

			if (/*settings*/ ctx[0].renderLabels && /*todo*/ ctx[5].labels.length > 0) {
				if (if_block3) {
					if_block3.p(ctx, dirty);

					if (dirty & /*settings, todo*/ 33) {
						transition_in(if_block3, 1);
					}
				} else {
					if_block3 = create_if_block_1$3(ctx);
					if_block3.c();
					transition_in(if_block3, 1);
					if_block3.m(div1, null);
				}
			} else if (if_block3) {
				group_outros();

				transition_out(if_block3, 1, 1, () => {
					if_block3 = null;
				});

				check_outros();
			}

			if (/*todo*/ ctx[5].children.length != 0) {
				if (if_block4) {
					if_block4.p(ctx, dirty);

					if (dirty & /*todo*/ 32) {
						transition_in(if_block4, 1);
					}
				} else {
					if_block4 = create_if_block$3(ctx);
					if_block4.c();
					transition_in(if_block4, 1);
					if_block4.m(li, null);
				}
			} else if (if_block4) {
				group_outros();

				transition_out(if_block4, 1, 1, () => {
					if_block4 = null;
				});

				check_outros();
			}

			if (!current || dirty & /*priorityClass, dateTimeClass*/ 1536 && li_class_value !== (li_class_value = "task-list-item " + /*priorityClass*/ ctx[10] + " " + /*dateTimeClass*/ ctx[9])) {
				attr(li, "class", li_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(markdownrenderer.$$.fragment, local);
			transition_in(if_block0);
			transition_in(if_block1);
			transition_in(if_block2);
			transition_in(if_block3);
			transition_in(if_block4);

			add_render_callback(() => {
				if (!current) return;

				if (!li_transition) li_transition = create_bidirectional_transition(
					li,
					fade,
					{
						duration: /*settings*/ ctx[0].fadeToggle ? 400 : 0
					},
					true
				);

				li_transition.run(1);
			});

			current = true;
		},
		o(local) {
			transition_out(markdownrenderer.$$.fragment, local);
			transition_out(if_block0);
			transition_out(if_block1);
			transition_out(if_block2);
			transition_out(if_block3);
			transition_out(if_block4);

			if (!li_transition) li_transition = create_bidirectional_transition(
				li,
				fade,
				{
					duration: /*settings*/ ctx[0].fadeToggle ? 400 : 0
				},
				false
			);

			li_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(li);
			destroy_component(markdownrenderer);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			if (if_block4) if_block4.d();
			if (detaching && li_transition) li_transition.end();
			mounted = false;
			run_all(dispose);
		}
	};
}

function sanitizeContent(content) {
	// Escape leading '#' or '-' so they aren't rendered as headers/bullets.
	if (content.startsWith("#") || content.startsWith("-")) {
		return `\\${content}`;
	}

	// A task starting with '*' signifies that it cannot be completed, so we should strip it from the front of the task.
	if (content.startsWith("*")) {
		return content.substring(1);
	}

	return content;
}

// For some reason, the Todoist API returns priority in reverse order from
// the p1/p2/p3/p4 fluent entry notation.
function getPriorityClass(priority) {
	switch (priority) {
		case 1:
			return "todoist-p4";
		case 2:
			return "todoist-p3";
		case 3:
			return "todoist-p2";
		case 4:
			return "todoist-p1";
	}
}

function getDateTimeClass(todo) {
	const parts = [];

	if (todo.hasTime) {
		parts.push("has-time");
	} else {
		parts.push("no-time");
	}

	if (todo.isOverdue()) {
		parts.push("task-overdue");
	} else if (todo.isToday()) {
		parts.push("task-today");
	}

	return parts.join(" ");
}

function instance$4($$self, $$props, $$invalidate) {
	let isCompletable;
	let priorityClass;
	let dateTimeClass;
	let projectLabel;
	let labels;
	let sanitizedContent;
	let { metadata } = $$props;
	let { settings } = $$props;
	let { api } = $$props;
	let { sorting } = $$props;
	let { renderProject } = $$props;
	let { onClickTask } = $$props;
	let { todo } = $$props;

	function getProjectLabel(todo, metadata) {
		const project = metadata.projects.get_or_default(todo.projectID, UnknownProject).name;

		if (todo.sectionID === null) {
			return project;
		}

		const section = metadata.sections.get_or_default(todo.sectionID, UnknownSection).name;
		return `${project} | ${section}`;
	}

	function onClickTaskContainer(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		showTaskContext({ task: todo, onClickTask }, { x: evt.pageX, y: evt.pageY });
	}

	const click_handler = async () => {
		await onClickTask(todo);
	};

	$$self.$$set = $$props => {
		if ('metadata' in $$props) $$invalidate(13, metadata = $$props.metadata);
		if ('settings' in $$props) $$invalidate(0, settings = $$props.settings);
		if ('api' in $$props) $$invalidate(1, api = $$props.api);
		if ('sorting' in $$props) $$invalidate(2, sorting = $$props.sorting);
		if ('renderProject' in $$props) $$invalidate(3, renderProject = $$props.renderProject);
		if ('onClickTask' in $$props) $$invalidate(4, onClickTask = $$props.onClickTask);
		if ('todo' in $$props) $$invalidate(5, todo = $$props.todo);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*todo*/ 32) {
			$$invalidate(11, isCompletable = !todo.content.startsWith("*"));
		}

		if ($$self.$$.dirty & /*todo*/ 32) {
			$$invalidate(10, priorityClass = getPriorityClass(todo.priority));
		}

		if ($$self.$$.dirty & /*todo*/ 32) {
			$$invalidate(9, dateTimeClass = getDateTimeClass(todo));
		}

		if ($$self.$$.dirty & /*todo, metadata*/ 8224) {
			$$invalidate(8, projectLabel = getProjectLabel(todo, metadata));
		}

		if ($$self.$$.dirty & /*todo*/ 32) {
			$$invalidate(7, labels = todo.labels.join(", "));
		}

		if ($$self.$$.dirty & /*todo*/ 32) {
			$$invalidate(6, sanitizedContent = sanitizeContent(todo.content));
		}
	};

	return [
		settings,
		api,
		sorting,
		renderProject,
		onClickTask,
		todo,
		sanitizedContent,
		labels,
		projectLabel,
		dateTimeClass,
		priorityClass,
		isCompletable,
		onClickTaskContainer,
		metadata,
		click_handler
	];
}

class TaskRenderer extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$4, create_fragment$5, safe_not_equal, {
			metadata: 13,
			settings: 0,
			api: 1,
			sorting: 2,
			renderProject: 3,
			onClickTask: 4,
			todo: 5
		});
	}
}

/* src/ui/TaskList.svelte generated by Svelte v3.58.0 */

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[11] = list[i];
	return child_ctx;
}

// (47:27) 
function create_if_block_1$2(ctx) {
	let notaskdisplay;
	let current;
	notaskdisplay = new NoTaskDisplay({});

	return {
		c() {
			create_component(notaskdisplay.$$.fragment);
		},
		m(target, anchor) {
			mount_component(notaskdisplay, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(notaskdisplay.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(notaskdisplay.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(notaskdisplay, detaching);
		}
	};
}

// (33:0) {#if todos.length != 0}
function create_if_block$2(ctx) {
	let ul;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let current;
	let each_value = /*todos*/ ctx[6];
	const get_key = ctx => /*todo*/ ctx[11].id;

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$2(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
	}

	return {
		c() {
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(ul, "class", "contains-task-list todoist-task-list");
		},
		m(target, anchor) {
			insert(target, ul, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(ul, null);
				}
			}

			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*onClickTask, metadata, settings, api, sorting, renderProject, todos*/ 239) {
				each_value = /*todos*/ ctx[6];
				group_outros();
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}
		}
	};
}

// (35:4) {#each todos as todo (todo.id)}
function create_each_block$2(key_1, ctx) {
	let first;
	let taskrenderer;
	let current;

	taskrenderer = new TaskRenderer({
			props: {
				onClickTask: /*onClickTask*/ ctx[7],
				metadata: /*metadata*/ ctx[5],
				settings: /*settings*/ ctx[0],
				api: /*api*/ ctx[1],
				sorting: /*sorting*/ ctx[2],
				renderProject: /*renderProject*/ ctx[3],
				todo: /*todo*/ ctx[11]
			}
		});

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();
			create_component(taskrenderer.$$.fragment);
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);
			mount_component(taskrenderer, target, anchor);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const taskrenderer_changes = {};
			if (dirty & /*metadata*/ 32) taskrenderer_changes.metadata = /*metadata*/ ctx[5];
			if (dirty & /*settings*/ 1) taskrenderer_changes.settings = /*settings*/ ctx[0];
			if (dirty & /*api*/ 2) taskrenderer_changes.api = /*api*/ ctx[1];
			if (dirty & /*sorting*/ 4) taskrenderer_changes.sorting = /*sorting*/ ctx[2];
			if (dirty & /*renderProject*/ 8) taskrenderer_changes.renderProject = /*renderProject*/ ctx[3];
			if (dirty & /*todos*/ 64) taskrenderer_changes.todo = /*todo*/ ctx[11];
			taskrenderer.$set(taskrenderer_changes);
		},
		i(local) {
			if (current) return;
			transition_in(taskrenderer.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(taskrenderer.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(first);
			destroy_component(taskrenderer, detaching);
		}
	};
}

function create_fragment$4(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block$2, create_if_block_1$2];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*todos*/ ctx[6].length != 0) return 0;
		if (/*renderNoTaskInfo*/ ctx[4]) return 1;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(target, anchor);
			}

			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if (~current_block_type_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				}
			} else {
				if (if_block) {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
				}

				if (~current_block_type_index) {
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				} else {
					if_block = null;
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d(detaching);
			}

			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let todos;
	let { tasks } = $$props;
	let { settings } = $$props;
	let { api } = $$props;
	let { sorting } = $$props;
	let { renderProject = true } = $$props;
	let { renderNoTaskInfo = true } = $$props;
	let metadata = null;
	const metadataUnsub = api.metadata.subscribe(value => $$invalidate(5, metadata = value));

	onDestroy(() => {
		metadataUnsub();
	});

	let tasksPendingClose = [];

	async function onClickTask(task) {
		tasksPendingClose.push(task.id);
		$$invalidate(9, tasksPendingClose);

		if (await api.closeTask(task.id)) {
			$$invalidate(8, tasks = tasks.filter(otherTask => otherTask.id !== task.id));
		} else {
			new obsidian.Notice("Failed to close task", 2000);
		}

		$$invalidate(9, tasksPendingClose = tasksPendingClose.filter(id => id !== task.id));
	}

	$$self.$$set = $$props => {
		if ('tasks' in $$props) $$invalidate(8, tasks = $$props.tasks);
		if ('settings' in $$props) $$invalidate(0, settings = $$props.settings);
		if ('api' in $$props) $$invalidate(1, api = $$props.api);
		if ('sorting' in $$props) $$invalidate(2, sorting = $$props.sorting);
		if ('renderProject' in $$props) $$invalidate(3, renderProject = $$props.renderProject);
		if ('renderNoTaskInfo' in $$props) $$invalidate(4, renderNoTaskInfo = $$props.renderNoTaskInfo);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*tasks, tasksPendingClose, sorting*/ 772) {
			$$invalidate(6, todos = tasks.filter(task => !tasksPendingClose.includes(task.id)).sort((first, second) => first.compareTo(second, sorting)));
		}
	};

	return [
		settings,
		api,
		sorting,
		renderProject,
		renderNoTaskInfo,
		metadata,
		todos,
		onClickTask,
		tasks,
		tasksPendingClose
	];
}

class TaskList extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$3, create_fragment$4, safe_not_equal, {
			tasks: 8,
			settings: 0,
			api: 1,
			sorting: 2,
			renderProject: 3,
			renderNoTaskInfo: 4
		});
	}
}

/* src/components/CollapseIndicator.svelte generated by Svelte v3.58.0 */

function create_fragment$3(ctx) {
	let div1;

	return {
		c() {
			div1 = element("div");

			div1.innerHTML = `<span class="hide-in-reading-view">​</span> 
  <div class="heading-collapse-indicator collapse-indicator collapse-icon"><svg viewBox="0 0 100 100" class="right-triangle" width="8" height="8"><path fill="currentColor" stroke="currentColor" d="M94.9,20.8c-1.4-2.5-4.1-4.1-7.1-4.1H12.2c-3,0-5.7,1.6-7.1,4.1c-1.3,2.4-1.2,5.2,0.2,7.6L43.1,88c1.5,2.3,4,3.7,6.9,3.7 s5.4-1.4,6.9-3.7l37.8-59.6C96.1,26,96.2,23.2,94.9,20.8L94.9,20.8z"></path></svg></div>`;

			attr(div1, "class", "cm-fold-indicator");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
		}
	};
}

class CollapseIndicator extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$3, safe_not_equal, {});
	}
}

/* src/ui/GroupedTaskList.svelte generated by Svelte v3.58.0 */

const { Map: Map_1 } = globals;

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[10] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[13] = list[i];
	return child_ctx;
}

// (35:2) {#if !foldedState.get(project.projectID)}
function create_if_block$1(ctx) {
	let tasklist;
	let t0;
	let each_blocks_1 = [];
	let each0_lookup = new Map_1();
	let t1;
	let each_blocks = [];
	let each1_lookup = new Map_1();
	let each1_anchor;
	let current;

	tasklist = new TaskList({
			props: {
				tasks: /*project*/ ctx[0].tasks,
				settings: /*settings*/ ctx[2],
				api: /*api*/ ctx[1],
				sorting: /*sorting*/ ctx[3],
				renderProject: false,
				renderNoTaskInfo: false
			}
		});

	let each_value_1 = /*project*/ ctx[0].sections;
	const get_key = ctx => /*section*/ ctx[13].sectionID;

	for (let i = 0; i < each_value_1.length; i += 1) {
		let child_ctx = get_each_context_1(ctx, each_value_1, i);
		let key = get_key(child_ctx);
		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
	}

	let each_value = /*project*/ ctx[0].subProjects;
	const get_key_1 = ctx => /*childProj*/ ctx[10].projectID;

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$1(ctx, each_value, i);
		let key = get_key_1(child_ctx);
		each1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
	}

	return {
		c() {
			create_component(tasklist.$$.fragment);
			t0 = space();

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t1 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each1_anchor = empty();
		},
		m(target, anchor) {
			mount_component(tasklist, target, anchor);
			insert(target, t0, anchor);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				if (each_blocks_1[i]) {
					each_blocks_1[i].m(target, anchor);
				}
			}

			insert(target, t1, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const tasklist_changes = {};
			if (dirty & /*project*/ 1) tasklist_changes.tasks = /*project*/ ctx[0].tasks;
			if (dirty & /*settings*/ 4) tasklist_changes.settings = /*settings*/ ctx[2];
			if (dirty & /*api*/ 2) tasklist_changes.api = /*api*/ ctx[1];
			if (dirty & /*sorting*/ 8) tasklist_changes.sorting = /*sorting*/ ctx[3];
			tasklist.$set(tasklist_changes);

			if (dirty & /*project, settings, api, sorting, foldedState, toggleFold, metadata, UnknownSection*/ 127) {
				each_value_1 = /*project*/ ctx[0].sections;
				group_outros();
				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, t1.parentNode, outro_and_destroy_block, create_each_block_1, t1, get_each_context_1);
				check_outros();
			}

			if (dirty & /*project, settings, api, sorting*/ 15) {
				each_value = /*project*/ ctx[0].subProjects;
				group_outros();
				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, each1_anchor.parentNode, outro_and_destroy_block, create_each_block$1, each1_anchor, get_each_context$1);
				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(tasklist.$$.fragment, local);

			for (let i = 0; i < each_value_1.length; i += 1) {
				transition_in(each_blocks_1[i]);
			}

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			transition_out(tasklist.$$.fragment, local);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				transition_out(each_blocks_1[i]);
			}

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			destroy_component(tasklist, detaching);
			if (detaching) detach(t0);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].d(detaching);
			}

			if (detaching) detach(t1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d(detaching);
			}

			if (detaching) detach(each1_anchor);
		}
	};
}

// (59:8) {#if !foldedState.get(section.sectionID)}
function create_if_block_1$1(ctx) {
	let tasklist;
	let current;

	tasklist = new TaskList({
			props: {
				tasks: /*section*/ ctx[13].tasks,
				settings: /*settings*/ ctx[2],
				api: /*api*/ ctx[1],
				sorting: /*sorting*/ ctx[3],
				renderProject: false,
				renderNoTaskInfo: false
			}
		});

	return {
		c() {
			create_component(tasklist.$$.fragment);
		},
		m(target, anchor) {
			mount_component(tasklist, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const tasklist_changes = {};
			if (dirty & /*project*/ 1) tasklist_changes.tasks = /*section*/ ctx[13].tasks;
			if (dirty & /*settings*/ 4) tasklist_changes.settings = /*settings*/ ctx[2];
			if (dirty & /*api*/ 2) tasklist_changes.api = /*api*/ ctx[1];
			if (dirty & /*sorting*/ 8) tasklist_changes.sorting = /*sorting*/ ctx[3];
			tasklist.$set(tasklist_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tasklist.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tasklist.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(tasklist, detaching);
		}
	};
}

// (45:4) {#each project.sections as section (section.sectionID)}
function create_each_block_1(key_1, ctx) {
	let div1;
	let div0;
	let collapseindicator;
	let t0;
	let span;
	let t1_value = /*metadata*/ ctx[4].sections.get_or_default(/*section*/ ctx[13].sectionID, UnknownSection).name + "";
	let t1;
	let div0_class_value;
	let t2;
	let show_if = !/*foldedState*/ ctx[5].get(/*section*/ ctx[13].sectionID);
	let current;
	let mounted;
	let dispose;
	collapseindicator = new CollapseIndicator({});

	function click_handler_1() {
		return /*click_handler_1*/ ctx[8](/*section*/ ctx[13]);
	}

	let if_block = show_if && create_if_block_1$1(ctx);

	return {
		key: key_1,
		first: null,
		c() {
			div1 = element("div");
			div0 = element("div");
			create_component(collapseindicator.$$.fragment);
			t0 = space();
			span = element("span");
			t1 = text(t1_value);
			t2 = space();
			if (if_block) if_block.c();

			attr(div0, "class", div0_class_value = "" + ((/*foldedState*/ ctx[5].get(/*section*/ ctx[13].sectionID)
			? 'is-collapsed'
			: '') + " todoist-section-title"));

			attr(div1, "class", "todoist-section");
			this.first = div1;
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			mount_component(collapseindicator, div0, null);
			append(div0, t0);
			append(div0, span);
			append(span, t1);
			append(div1, t2);
			if (if_block) if_block.m(div1, null);
			current = true;

			if (!mounted) {
				dispose = listen(div0, "click", click_handler_1);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if ((!current || dirty & /*metadata, project*/ 17) && t1_value !== (t1_value = /*metadata*/ ctx[4].sections.get_or_default(/*section*/ ctx[13].sectionID, UnknownSection).name + "")) set_data(t1, t1_value);

			if (!current || dirty & /*foldedState, project*/ 33 && div0_class_value !== (div0_class_value = "" + ((/*foldedState*/ ctx[5].get(/*section*/ ctx[13].sectionID)
			? 'is-collapsed'
			: '') + " todoist-section-title"))) {
				attr(div0, "class", div0_class_value);
			}

			if (dirty & /*foldedState, project*/ 33) show_if = !/*foldedState*/ ctx[5].get(/*section*/ ctx[13].sectionID);

			if (show_if) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*foldedState, project*/ 33) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_1$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div1, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(collapseindicator.$$.fragment, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(collapseindicator.$$.fragment, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			destroy_component(collapseindicator);
			if (if_block) if_block.d();
			mounted = false;
			dispose();
		}
	};
}

// (72:4) {#each project.subProjects as childProj (childProj.projectID)}
function create_each_block$1(key_1, ctx) {
	let first;
	let groupedtasklist;
	let current;

	groupedtasklist = new GroupedTaskList({
			props: {
				project: /*childProj*/ ctx[10],
				settings: /*settings*/ ctx[2],
				api: /*api*/ ctx[1],
				sorting: /*sorting*/ ctx[3]
			}
		});

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();
			create_component(groupedtasklist.$$.fragment);
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);
			mount_component(groupedtasklist, target, anchor);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const groupedtasklist_changes = {};
			if (dirty & /*project*/ 1) groupedtasklist_changes.project = /*childProj*/ ctx[10];
			if (dirty & /*settings*/ 4) groupedtasklist_changes.settings = /*settings*/ ctx[2];
			if (dirty & /*api*/ 2) groupedtasklist_changes.api = /*api*/ ctx[1];
			if (dirty & /*sorting*/ 8) groupedtasklist_changes.sorting = /*sorting*/ ctx[3];
			groupedtasklist.$set(groupedtasklist_changes);
		},
		i(local) {
			if (current) return;
			transition_in(groupedtasklist.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(groupedtasklist.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(first);
			destroy_component(groupedtasklist, detaching);
		}
	};
}

function create_fragment$2(ctx) {
	let div1;
	let div0;
	let collapseindicator;
	let t0;
	let span;
	let t1_value = /*metadata*/ ctx[4].projects.get_or_default(/*project*/ ctx[0].projectID, UnknownProject).name + "";
	let t1;
	let div0_class_value;
	let t2;
	let show_if = !/*foldedState*/ ctx[5].get(/*project*/ ctx[0].projectID);
	let current;
	let mounted;
	let dispose;
	collapseindicator = new CollapseIndicator({});
	let if_block = show_if && create_if_block$1(ctx);

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			create_component(collapseindicator.$$.fragment);
			t0 = space();
			span = element("span");
			t1 = text(t1_value);
			t2 = space();
			if (if_block) if_block.c();

			attr(div0, "class", div0_class_value = "" + ((/*foldedState*/ ctx[5].get(/*project*/ ctx[0].projectID)
			? 'is-collapsed'
			: '') + " todoist-project-title"));

			attr(div1, "class", "todoist-project");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			mount_component(collapseindicator, div0, null);
			append(div0, t0);
			append(div0, span);
			append(span, t1);
			append(div1, t2);
			if (if_block) if_block.m(div1, null);
			current = true;

			if (!mounted) {
				dispose = listen(div0, "click", /*click_handler*/ ctx[7]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if ((!current || dirty & /*metadata, project*/ 17) && t1_value !== (t1_value = /*metadata*/ ctx[4].projects.get_or_default(/*project*/ ctx[0].projectID, UnknownProject).name + "")) set_data(t1, t1_value);

			if (!current || dirty & /*foldedState, project*/ 33 && div0_class_value !== (div0_class_value = "" + ((/*foldedState*/ ctx[5].get(/*project*/ ctx[0].projectID)
			? 'is-collapsed'
			: '') + " todoist-project-title"))) {
				attr(div0, "class", div0_class_value);
			}

			if (dirty & /*foldedState, project*/ 33) show_if = !/*foldedState*/ ctx[5].get(/*project*/ ctx[0].projectID);

			if (show_if) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*foldedState, project*/ 33) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div1, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(collapseindicator.$$.fragment, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(collapseindicator.$$.fragment, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			destroy_component(collapseindicator);
			if (if_block) if_block.d();
			mounted = false;
			dispose();
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let { project } = $$props;
	let { api } = $$props;
	let { settings } = $$props;
	let { sorting } = $$props;
	let metadata = null;
	const metadataUnsub = api.metadata.subscribe(value => $$invalidate(4, metadata = value));
	let foldedState = new Map();
	foldedState.set(project.projectID, false);
	project.sections.forEach(s => foldedState.set(s.sectionID, false));

	function toggleFold(id) {
		foldedState.set(id, !foldedState.get(id));
		$$invalidate(5, foldedState);
	}

	onDestroy(() => {
		metadataUnsub();
	});

	const click_handler = () => toggleFold(project.projectID);
	const click_handler_1 = section => toggleFold(section.sectionID);

	$$self.$$set = $$props => {
		if ('project' in $$props) $$invalidate(0, project = $$props.project);
		if ('api' in $$props) $$invalidate(1, api = $$props.api);
		if ('settings' in $$props) $$invalidate(2, settings = $$props.settings);
		if ('sorting' in $$props) $$invalidate(3, sorting = $$props.sorting);
	};

	return [
		project,
		api,
		settings,
		sorting,
		metadata,
		foldedState,
		toggleFold,
		click_handler,
		click_handler_1
	];
}

class GroupedTaskList extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
			project: 0,
			api: 1,
			settings: 2,
			sorting: 3
		});
	}
}

/* src/ui/ErrorDisplay.svelte generated by Svelte v3.58.0 */

function create_fragment$1(ctx) {
	let div;
	let p;
	let t1;
	let code;
	let t2;

	return {
		c() {
			div = element("div");
			p = element("p");
			p.textContent = "Oh no, something went wrong!";
			t1 = space();
			code = element("code");
			t2 = text(/*error*/ ctx[0]);
			attr(div, "class", "todoist-error");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, p);
			append(div, t1);
			append(div, code);
			append(code, t2);
		},
		p(ctx, [dirty]) {
			if (dirty & /*error*/ 1) set_data(t2, /*error*/ ctx[0]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { error } = $$props;

	$$self.$$set = $$props => {
		if ('error' in $$props) $$invalidate(0, error = $$props.error);
	};

	return [error];
}

class ErrorDisplay extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { error: 0 });
	}
}

/* src/ui/TodoistQuery.svelte generated by Svelte v3.58.0 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[14] = list[i];
	return child_ctx;
}

// (105:0) {#if fetchedOnce}
function create_if_block(ctx) {
	let show_if;
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_1, create_if_block_4, create_else_block_2];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (dirty & /*tasks*/ 8) show_if = null;
		if (/*query*/ ctx[0].group) return 0;
		if (show_if == null) show_if = !!/*tasks*/ ctx[3].isOk();
		if (show_if) return 1;
		return 2;
	}

	current_block_type_index = select_block_type(ctx, -1);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx, dirty);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (130:2) {:else}
function create_else_block_2(ctx) {
	let errordisplay;
	let current;

	errordisplay = new ErrorDisplay({
			props: { error: /*tasks*/ ctx[3].unwrapErr() }
		});

	return {
		c() {
			create_component(errordisplay.$$.fragment);
		},
		m(target, anchor) {
			mount_component(errordisplay, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const errordisplay_changes = {};
			if (dirty & /*tasks*/ 8) errordisplay_changes.error = /*tasks*/ ctx[3].unwrapErr();
			errordisplay.$set(errordisplay_changes);
		},
		i(local) {
			if (current) return;
			transition_in(errordisplay.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(errordisplay.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(errordisplay, detaching);
		}
	};
}

// (123:25) 
function create_if_block_4(ctx) {
	let tasklist;
	let current;

	tasklist = new TaskList({
			props: {
				tasks: /*tasks*/ ctx[3].unwrap(),
				settings: /*settings*/ ctx[2],
				api: /*api*/ ctx[1],
				sorting: /*query*/ ctx[0].sorting ?? []
			}
		});

	return {
		c() {
			create_component(tasklist.$$.fragment);
		},
		m(target, anchor) {
			mount_component(tasklist, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const tasklist_changes = {};
			if (dirty & /*tasks*/ 8) tasklist_changes.tasks = /*tasks*/ ctx[3].unwrap();
			if (dirty & /*settings*/ 4) tasklist_changes.settings = /*settings*/ ctx[2];
			if (dirty & /*api*/ 2) tasklist_changes.api = /*api*/ ctx[1];
			if (dirty & /*query*/ 1) tasklist_changes.sorting = /*query*/ ctx[0].sorting ?? [];
			tasklist.$set(tasklist_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tasklist.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tasklist.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(tasklist, detaching);
		}
	};
}

// (106:2) {#if query.group}
function create_if_block_1(ctx) {
	let show_if;
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_2, create_else_block_1];
	const if_blocks = [];

	function select_block_type_1(ctx, dirty) {
		if (dirty & /*groupedTasks*/ 16) show_if = null;
		if (show_if == null) show_if = !!/*groupedTasks*/ ctx[4].isOk();
		if (show_if) return 0;
		return 1;
	}

	current_block_type_index = select_block_type_1(ctx, -1);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type_1(ctx, dirty);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (120:4) {:else}
function create_else_block_1(ctx) {
	let errordisplay;
	let current;

	errordisplay = new ErrorDisplay({
			props: {
				error: /*groupedTasks*/ ctx[4].unwrapErr()
			}
		});

	return {
		c() {
			create_component(errordisplay.$$.fragment);
		},
		m(target, anchor) {
			mount_component(errordisplay, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const errordisplay_changes = {};
			if (dirty & /*groupedTasks*/ 16) errordisplay_changes.error = /*groupedTasks*/ ctx[4].unwrapErr();
			errordisplay.$set(errordisplay_changes);
		},
		i(local) {
			if (current) return;
			transition_in(errordisplay.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(errordisplay.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(errordisplay, detaching);
		}
	};
}

// (107:4) {#if groupedTasks.isOk()}
function create_if_block_2(ctx) {
	let show_if;
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_3, create_else_block];
	const if_blocks = [];

	function select_block_type_2(ctx, dirty) {
		if (dirty & /*groupedTasks*/ 16) show_if = null;
		if (show_if == null) show_if = !!(/*groupedTasks*/ ctx[4].unwrap().length == 0);
		if (show_if) return 0;
		return 1;
	}

	current_block_type_index = select_block_type_2(ctx, -1);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type_2(ctx, dirty);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (110:6) {:else}
function create_else_block(ctx) {
	let each_blocks = [];
	let each_1_lookup = new Map();
	let each_1_anchor;
	let current;
	let each_value = /*groupedTasks*/ ctx[4].unwrap();
	const get_key = ctx => /*project*/ ctx[14].projectID;

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
	}

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*groupedTasks, settings, api, query*/ 23) {
				each_value = /*groupedTasks*/ ctx[4].unwrap();
				group_outros();
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block, each_1_anchor, get_each_context);
				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d(detaching);
			}

			if (detaching) detach(each_1_anchor);
		}
	};
}

// (108:6) {#if groupedTasks.unwrap().length == 0}
function create_if_block_3(ctx) {
	let notaskdisplay;
	let current;
	notaskdisplay = new NoTaskDisplay({});

	return {
		c() {
			create_component(notaskdisplay.$$.fragment);
		},
		m(target, anchor) {
			mount_component(notaskdisplay, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(notaskdisplay.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(notaskdisplay.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(notaskdisplay, detaching);
		}
	};
}

// (111:8) {#each groupedTasks.unwrap() as project (project.projectID)}
function create_each_block(key_1, ctx) {
	let first;
	let groupedtasklist;
	let current;

	groupedtasklist = new GroupedTaskList({
			props: {
				project: /*project*/ ctx[14],
				settings: /*settings*/ ctx[2],
				api: /*api*/ ctx[1],
				sorting: /*query*/ ctx[0].sorting ?? []
			}
		});

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();
			create_component(groupedtasklist.$$.fragment);
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);
			mount_component(groupedtasklist, target, anchor);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const groupedtasklist_changes = {};
			if (dirty & /*groupedTasks*/ 16) groupedtasklist_changes.project = /*project*/ ctx[14];
			if (dirty & /*settings*/ 4) groupedtasklist_changes.settings = /*settings*/ ctx[2];
			if (dirty & /*api*/ 2) groupedtasklist_changes.api = /*api*/ ctx[1];
			if (dirty & /*query*/ 1) groupedtasklist_changes.sorting = /*query*/ ctx[0].sorting ?? [];
			groupedtasklist.$set(groupedtasklist_changes);
		},
		i(local) {
			if (current) return;
			transition_in(groupedtasklist.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(groupedtasklist.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(first);
			destroy_component(groupedtasklist, detaching);
		}
	};
}

function create_fragment(ctx) {
	let h4;
	let t0;
	let t1;
	let button;
	let svg;
	let path;
	let svg_class_value;
	let t2;
	let br;
	let t3;
	let if_block_anchor;
	let current;
	let mounted;
	let dispose;
	let if_block = /*fetchedOnce*/ ctx[5] && create_if_block(ctx);

	return {
		c() {
			h4 = element("h4");
			t0 = text(/*title*/ ctx[7]);
			t1 = space();
			button = element("button");
			svg = svg_element("svg");
			path = svg_element("path");
			t2 = space();
			br = element("br");
			t3 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			attr(h4, "class", "todoist-query-title");
			attr(path, "fill-rule", "evenodd");
			attr(path, "d", "M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z");
			attr(path, "clip-rule", "evenodd");
			attr(svg, "class", svg_class_value = /*fetching*/ ctx[6] ? "todoist-refresh-spin" : "");
			attr(svg, "width", "20px");
			attr(svg, "height", "20px");
			attr(svg, "viewBox", "0 0 20 20");
			attr(svg, "fill", "currentColor");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(button, "class", "todoist-refresh-button");
			button.disabled = /*fetching*/ ctx[6];
		},
		m(target, anchor) {
			insert(target, h4, anchor);
			append(h4, t0);
			insert(target, t1, anchor);
			insert(target, button, anchor);
			append(button, svg);
			append(svg, path);
			insert(target, t2, anchor);
			insert(target, br, anchor);
			insert(target, t3, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler*/ ctx[12]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (!current || dirty & /*title*/ 128) set_data(t0, /*title*/ ctx[7]);

			if (!current || dirty & /*fetching*/ 64 && svg_class_value !== (svg_class_value = /*fetching*/ ctx[6] ? "todoist-refresh-spin" : "")) {
				attr(svg, "class", svg_class_value);
			}

			if (!current || dirty & /*fetching*/ 64) {
				button.disabled = /*fetching*/ ctx[6];
			}

			if (/*fetchedOnce*/ ctx[5]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*fetchedOnce*/ 32) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h4);
			if (detaching) detach(t1);
			if (detaching) detach(button);
			if (detaching) detach(t2);
			if (detaching) detach(br);
			if (detaching) detach(t3);
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
			mounted = false;
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let taskCount;
	let title;
	let { query } = $$props;
	let { api } = $$props;
	let { app } = $$props;
	setContext(APP_CONTEXT_KEY, app);
	let settings = null;
	let autoRefreshIntervalId = null;
	let fetchedOnce = false;

	const settingsUnsub = SettingsInstance.subscribe(value => {
		$$invalidate(2, settings = value);
	});

	let tasks = Result.Ok([]);
	let groupedTasks = Result.Ok([]);
	let fetching = false;

	onMount(async () => {
		await fetchTodos();
	});

	onDestroy(() => {
		settingsUnsub();

		if (autoRefreshIntervalId != null) {
			clearInterval(autoRefreshIntervalId);
		}
	});

	async function fetchTodos() {
		if (fetching) {
			return;
		}

		try {
			$$invalidate(6, fetching = true);

			if (query.group) {
				$$invalidate(4, groupedTasks = await api.getTasksGroupedByProject(query.filter));
			} else {
				$$invalidate(3, tasks = await api.getTasks(query.filter));
			}

			$$invalidate(5, fetchedOnce = true);
		} finally {
			$$invalidate(6, fetching = false);
		}
	}

	const click_handler = async () => {
		await fetchTodos();
	};

	$$self.$$set = $$props => {
		if ('query' in $$props) $$invalidate(0, query = $$props.query);
		if ('api' in $$props) $$invalidate(1, api = $$props.api);
		if ('app' in $$props) $$invalidate(9, app = $$props.app);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*query, autoRefreshIntervalId, settings*/ 1029) {
			{
				if (query === null || query === void 0
				? void 0
				: query.autorefresh) {
					// First, if query.autorefresh is set.. we always use that value.
					if (autoRefreshIntervalId == null) {
						$$invalidate(10, autoRefreshIntervalId = window.setInterval(
							async () => {
								await fetchTodos();
							},
							query.autorefresh * 1000
						));
					}
				} else {
					// Otherwise we use the settings value.
					if (autoRefreshIntervalId != null) {
						clearInterval(autoRefreshIntervalId);
						$$invalidate(10, autoRefreshIntervalId = null);
					}

					if (settings.autoRefreshToggle) {
						$$invalidate(10, autoRefreshIntervalId = window.setInterval(
							async () => {
								await fetchTodos();
							},
							settings.autoRefreshInterval * 1000
						));
					}
				}
			}
		}

		if ($$self.$$.dirty & /*query, groupedTasks, tasks*/ 25) {
			$$invalidate(11, taskCount = query.group
			? groupedTasks.map(prjs => prjs.reduce((sum, prj) => sum + prj.count(), 0)).unwrapOr(0)
			: tasks.map(tasks => tasks.reduce((sum, task) => sum + task.count(), 0)).unwrapOr(0));
		}

		if ($$self.$$.dirty & /*query, taskCount*/ 2049) {
			$$invalidate(7, title = query.name.replace("{task_count}", `${taskCount}`));
		}
	};

	return [
		query,
		api,
		settings,
		tasks,
		groupedTasks,
		fetchedOnce,
		fetching,
		title,
		fetchTodos,
		app,
		autoRefreshIntervalId,
		taskCount,
		click_handler
	];
}

class TodoistQuery extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { query: 0, api: 1, app: 9 });
	}
}

class QueryInjector {
    constructor(app) {
        this.app = app;
        this.pendingQueries = [];
    }
    onNewBlock(source, el, ctx) {
        const pendingQuery = {
            source: source,
            target: el,
            ctx: ctx,
        };
        if (typeof this.api == "undefined") {
            this.pendingQueries.push(pendingQuery);
            return;
        }
        this.injectQuery(pendingQuery);
    }
    setApi(api) {
        this.api = api;
        while (this.pendingQueries.length > 0) {
            this.injectQuery(this.pendingQueries[0]);
            this.pendingQueries.splice(0, 1);
        }
    }
    injectQuery(pendingQuery) {
        let child;
        try {
            const query = parseQuery(pendingQuery.source);
            debug({
                msg: "Parsed query",
                context: query,
            });
            child = new InjectedQuery(pendingQuery.target, (root) => {
                return new TodoistQuery({
                    target: root,
                    props: { query: query, api: this.api, app: this.app },
                });
            });
        }
        catch (e) {
            console.error(e);
            child = new InjectedQuery(pendingQuery.target, (root) => {
                return new ErrorDisplay({ target: root, props: { error: e } });
            });
        }
        pendingQuery.ctx.addChild(child);
    }
}
class InjectedQuery extends obsidian.MarkdownRenderChild {
    constructor(container, createComp) {
        super(container);
        this.createComp = createComp;
        this.containerEl = container;
    }
    onload() {
        this.component = this.createComp(this.containerEl);
    }
    onunload() {
        if (this.component) {
            this.component.$destroy();
        }
    }
}

class TodoistPlugin extends obsidian.Plugin {
    constructor(app, pluginManifest) {
        super(app, pluginManifest);
        this.options = null;
        this.api = null;
        SettingsInstance.subscribe((value) => {
            debug({
                msg: "Settings changed",
                context: value,
            });
            this.options = value;
        });
        this.queryInjector = new QueryInjector(app);
    }
    async onload() {
        this.registerMarkdownCodeBlockProcessor("todoist", this.queryInjector.onNewBlock.bind(this.queryInjector));
        this.addSettingTab(new SettingsTab(this.app, this));
        this.addCommand({
            id: "todoist-refresh-metadata",
            name: "Refresh Metadata",
            callback: async () => {
                if (this.api != null) {
                    debug("Refreshing metadata");
                    const result = await this.api.fetchMetadata();
                    if (result.isErr()) {
                        console.error(result.unwrapErr());
                    }
                }
            },
        });
        this.addCommand({
            id: "todoist-add-task",
            name: "Add Todoist task",
            callback: () => {
                new CreateTaskModal(this.app, this.api, false);
            },
        });
        this.addCommand({
            id: "todoist-add-task-current-page",
            name: "Add Todoist task with the current page",
            callback: () => {
                new CreateTaskModal(this.app, this.api, true);
            },
        });
        const tokenPath = getTokenPath(app.vault);
        try {
            const token = await this.app.vault.adapter.read(tokenPath);
            this.api = new TodoistApi(token);
        }
        catch (e) {
            const tokenModal = new TodoistApiTokenModal(this.app);
            await tokenModal.waitForClose;
            const token = tokenModal.token;
            if (token.length == 0) {
                alert("Provided token was empty, please enter it in the settings and restart Obsidian.");
                return;
            }
            await this.app.vault.adapter.write(tokenPath, token);
            this.api = new TodoistApi(token);
        }
        this.queryInjector.setApi(this.api);
        const result = await this.api.fetchMetadata();
        if (result.isErr()) {
            console.error(result.unwrapErr());
        }
        await this.loadOptions();
    }
    async loadOptions() {
        const options = await this.loadData();
        SettingsInstance.update((old) => {
            return Object.assign(Object.assign({}, old), (options || {}));
        });
        await this.saveData(this.options);
    }
    async writeOptions(changeOpts) {
        SettingsInstance.update((old) => {
            changeOpts(old);
            return old;
        });
        await this.saveData(this.options);
    }
}

module.exports = TodoistPlugin;