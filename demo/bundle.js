
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
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
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function loader (url, test, callback) {
      var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {
        async: true,
        defer: true
      };

      if (!test()) {
        var tag = document.createElement('script');
        tag.src = url;
        tag.async = options.async;
        tag.defer = options.defer;
        tag.onload = callback;
        document.body.appendChild(tag);
      } else {
        callback();
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
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
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
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    var mapsLoaded = writable(false);
    var mapsLoading = writable(false);
    var contextKey = {};

    // 百度地图API密钥
    var apiKey = "hBQnhq37Z1G8k2ByfQzQq2cnBAiYmQz1"; // export const apiKey = "your-api-key";

    /* src\components\ApiSdk.svelte generated by Svelte v3.24.1 */

    function create_fragment(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $mapsLoaded;
    	let $mapsLoading;
    	validate_store(mapsLoaded, "mapsLoaded");
    	component_subscribe($$self, mapsLoaded, $$value => $$invalidate(0, $mapsLoaded = $$value));
    	validate_store(mapsLoading, "mapsLoading");
    	component_subscribe($$self, mapsLoading, $$value => $$invalidate(1, $mapsLoading = $$value));
    	const dispatch = createEventDispatcher();

    	onMount(() => {
    		window.byBmapsReady = () => {
    			mapsLoaded.set(true);
    			delete window["byBmapsReady"];
    		};

    		if ($mapsLoaded) {
    			dispatch("ready");
    		}

    		if (!$mapsLoading) {
    			const url = [
    				"//api.map.baidu.com/api?v=2.0&",
    				 `ak=${apiKey}&` ,
    				`&callback=byBmapsReady`
    			].join("");

    			mapsLoading.set(true);

    			loader(url, () => {
    				return $mapsLoaded;
    			});
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ApiSdk> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ApiSdk", $$slots, []);

    	$$self.$capture_state = () => ({
    		loader,
    		onMount,
    		createEventDispatcher,
    		mapsLoaded,
    		mapsLoading,
    		apiKey,
    		dispatch,
    		$mapsLoaded,
    		$mapsLoading
    	});

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$mapsLoaded*/ 1) {
    			 $mapsLoaded && dispatch("ready");
    		}
    	};

    	return [];
    }

    class ApiSdk extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ApiSdk",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\components\Map.svelte generated by Svelte v3.24.1 */
    const file = "src\\components\\Map.svelte";

    // (3:1) {#if map}
    function create_if_block(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[12].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2048) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[11], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(3:1) {#if map}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let apisdk;
    	let t;
    	let div;
    	let current;
    	apisdk = new ApiSdk({ $$inline: true });
    	apisdk.$on("ready", /*initialise*/ ctx[2]);
    	let if_block = /*map*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			create_component(apisdk.$$.fragment);
    			t = space();
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "svelte-1oajubz");
    			add_location(div, file, 1, 0, 34);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(apisdk, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			/*div_binding*/ ctx[13](div);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*map*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*map*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(apisdk.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(apisdk.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(apisdk, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			/*div_binding*/ ctx[13](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	setContext(contextKey, { getMap: () => map, getBdMap: () => bdmap });
    	const dispatch = createEventDispatcher();
    	let mapElement;
    	let map;
    	let bdmap;
    	let point;
    	let { withCenterMarker = false } = $$props;
    	let { options = { zoom: 15 } } = $$props;

    	function getDomBounds() {
    		return mapElement.getBoundingClientRect();
    	}

    	function getDefaultView() {
    		return mapElement.ownerDocument.defaultView;
    	}

    	function setHeight(height) {
    		$$invalidate(0, mapElement.style.height = height, mapElement);
    	}

    	function setMaxHeight(height) {
    		$$invalidate(0, mapElement.style.maxHeight = height, mapElement);
    	}

    	function setCentre(location) {
    		map.setCenter(location);
    	}

    	function setPointsInView(pointArray) {
    		map.setViewport(pointArray);
    	}

    	function initialise() {
    		setTimeout(
    			() => {
    				bdmap = window["BMap"] = BMap;
    				$$invalidate(1, map = new bdmap.Map(mapElement, { enableBizAuthLogo: false }));
    				map.disableBizAuthLogo(); //关闭JSAPI商用授权挂件

    				// map.enableScrollWheelZoom(true);     //开启鼠标滚轮缩放
    				if (typeof options.lng !== "undefined" && typeof options.lat !== "undefined") {
    					point = new bdmap.Point(options.lng, options.lat);
    					map.centerAndZoom(point, options.zoom);

    					if (withCenterMarker) {
    						var marker = new bdmap.Marker(point); // 创建标注
    						marker.enableDragging(); //marker可拖拽
    						map.addOverlay(marker); //在地图中添加marker
    						var label = new bdmap.Label(options.label, { offset: new bdmap.Size(20, -10) });
    						label.setStyle({ color: "red", fontSize: "1.2rem" });
    						marker.setLabel(label);
    					}
    				}

    				dispatch("ready");
    			},
    			1
    		);
    	}

    	const writable_props = ["withCenterMarker", "options"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Map> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Map", $$slots, ['default']);

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			mapElement = $$value;
    			$$invalidate(0, mapElement);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("withCenterMarker" in $$props) $$invalidate(3, withCenterMarker = $$props.withCenterMarker);
    		if ("options" in $$props) $$invalidate(4, options = $$props.options);
    		if ("$$scope" in $$props) $$invalidate(11, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		setContext,
    		createEventDispatcher,
    		ApiSdk,
    		contextKey,
    		dispatch,
    		mapElement,
    		map,
    		bdmap,
    		point,
    		withCenterMarker,
    		options,
    		getDomBounds,
    		getDefaultView,
    		setHeight,
    		setMaxHeight,
    		setCentre,
    		setPointsInView,
    		initialise
    	});

    	$$self.$inject_state = $$props => {
    		if ("mapElement" in $$props) $$invalidate(0, mapElement = $$props.mapElement);
    		if ("map" in $$props) $$invalidate(1, map = $$props.map);
    		if ("bdmap" in $$props) bdmap = $$props.bdmap;
    		if ("point" in $$props) point = $$props.point;
    		if ("withCenterMarker" in $$props) $$invalidate(3, withCenterMarker = $$props.withCenterMarker);
    		if ("options" in $$props) $$invalidate(4, options = $$props.options);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		mapElement,
    		map,
    		initialise,
    		withCenterMarker,
    		options,
    		getDomBounds,
    		getDefaultView,
    		setHeight,
    		setMaxHeight,
    		setCentre,
    		setPointsInView,
    		$$scope,
    		$$slots,
    		div_binding
    	];
    }

    class Map$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			withCenterMarker: 3,
    			options: 4,
    			getDomBounds: 5,
    			getDefaultView: 6,
    			setHeight: 7,
    			setMaxHeight: 8,
    			setCentre: 9,
    			setPointsInView: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Map",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get withCenterMarker() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set withCenterMarker(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getDomBounds() {
    		return this.$$.ctx[5];
    	}

    	set getDomBounds(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getDefaultView() {
    		return this.$$.ctx[6];
    	}

    	set getDefaultView(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setHeight() {
    		return this.$$.ctx[7];
    	}

    	set setHeight(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setMaxHeight() {
    		return this.$$.ctx[8];
    	}

    	set setMaxHeight(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setCentre() {
    		return this.$$.ctx[9];
    	}

    	set setCentre(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setPointsInView() {
    		return this.$$.ctx[10];
    	}

    	set setPointsInView(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Marker.svelte generated by Svelte v3.24.1 */

    function create_fragment$2(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();
    	let { lng } = $$props;
    	let { lat } = $$props;
    	let { label } = $$props;
    	let { enableDragging = false } = $$props;
    	let point;
    	let marker;
    	let options = {};
    	let labelObject;
    	point = new bdmap.Point(lng, lat);
    	marker = new bdmap.Marker(point); // 创建标注

    	if (!enableDragging) {
    		marker.enableDragging(); //marker可拖拽
    	}

    	map.addOverlay(marker); //在地图中添加marker
    	marker.setAnimation(bdmap.BMAP_ANIMATION_BOUNCE);
    	labelObject = new bdmap.Label(label, { offset: new bdmap.Size(20, -10) });
    	labelObject.setStyle({ color: "red", fontSize: "1.2rem" });
    	marker.setLabel(labelObject);
    	const writable_props = ["lng", "lat", "label", "enableDragging"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Marker> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Marker", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("lng" in $$props) $$invalidate(0, lng = $$props.lng);
    		if ("lat" in $$props) $$invalidate(1, lat = $$props.lat);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("enableDragging" in $$props) $$invalidate(3, enableDragging = $$props.enableDragging);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		contextKey,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		lng,
    		lat,
    		label,
    		enableDragging,
    		point,
    		marker,
    		options,
    		labelObject
    	});

    	$$self.$inject_state = $$props => {
    		if ("lng" in $$props) $$invalidate(0, lng = $$props.lng);
    		if ("lat" in $$props) $$invalidate(1, lat = $$props.lat);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("enableDragging" in $$props) $$invalidate(3, enableDragging = $$props.enableDragging);
    		if ("point" in $$props) point = $$props.point;
    		if ("marker" in $$props) marker = $$props.marker;
    		if ("options" in $$props) options = $$props.options;
    		if ("labelObject" in $$props) labelObject = $$props.labelObject;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [lng, lat, label, enableDragging];
    }

    class Marker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			lng: 0,
    			lat: 1,
    			label: 2,
    			enableDragging: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Marker",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*lng*/ ctx[0] === undefined && !("lng" in props)) {
    			console.warn("<Marker> was created without expected prop 'lng'");
    		}

    		if (/*lat*/ ctx[1] === undefined && !("lat" in props)) {
    			console.warn("<Marker> was created without expected prop 'lat'");
    		}

    		if (/*label*/ ctx[2] === undefined && !("label" in props)) {
    			console.warn("<Marker> was created without expected prop 'label'");
    		}
    	}

    	get lng() {
    		throw new Error("<Marker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lng(value) {
    		throw new Error("<Marker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lat() {
    		throw new Error("<Marker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lat(value) {
    		throw new Error("<Marker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Marker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Marker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get enableDragging() {
    		throw new Error("<Marker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set enableDragging(value) {
    		throw new Error("<Marker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\MarkerList.svelte generated by Svelte v3.24.1 */

    const { console: console_1 } = globals;

    function create_fragment$3(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();
    	let { markers } = $$props;

    	function clearMarkers() {
    		for (var i = 0; i < markers.length; i++) {
    			map.removeOverlay(markers[i]);
    			$$invalidate(0, markers[i] = null, markers);
    		}

    		$$invalidate(0, markers.length = 0, markers);
    	}

    	if (document.createElement("canvas").getContext) {
    		// 判断当前浏览器是否支持绘制海量点
    		var points = []; // 添加海量点数据

    		for (var i = 0; i < markers.length; i++) {
    			// console.log(markers[i]);
    			if (typeof markers[i].lng != "undefined" && typeof markers[i].lat != "undefined") {
    				points.push(new bdmap.Point(markers[i].lng, markers[i].lat));
    			} else if (typeof markers[i][0] != "undefined" && typeof markers[i][1] != "undefined") {
    				points.push(new bdmap.Point(markers[i][0], markers[i][1]));
    			} else {
    				console.log("Error: Point data format error!");
    			}
    		}

    		var options = {
    			size: BMAP_POINT_SIZE_SMALL,
    			shape: BMAP_POINT_SHAPE_STAR,
    			color: "#d340c3"
    		};

    		var pointCollection = new bdmap.PointCollection(points, options); // 初始化PointCollection

    		pointCollection.addEventListener("click", function (e) {
    			alert("单击点的坐标为：" + e.point.lng + "。位于：" + e.point.lat); // 监听点击事件
    		});

    		map.addOverlay(pointCollection); // 添加Overlay

    		//让所有点在视野范围内
    		map.setViewport(points);
    	} else {
    		alert("请在chrome、safari、IE8+以上浏览器查看");
    	}

    	const writable_props = ["markers"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<MarkerList> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("MarkerList", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("markers" in $$props) $$invalidate(0, markers = $$props.markers);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		contextKey,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		markers,
    		clearMarkers,
    		points,
    		i,
    		options,
    		pointCollection
    	});

    	$$self.$inject_state = $$props => {
    		if ("markers" in $$props) $$invalidate(0, markers = $$props.markers);
    		if ("points" in $$props) points = $$props.points;
    		if ("i" in $$props) i = $$props.i;
    		if ("options" in $$props) options = $$props.options;
    		if ("pointCollection" in $$props) pointCollection = $$props.pointCollection;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [markers];
    }

    class MarkerList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { markers: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MarkerList",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*markers*/ ctx[0] === undefined && !("markers" in props)) {
    			console_1.warn("<MarkerList> was created without expected prop 'markers'");
    		}
    	}

    	get markers() {
    		throw new Error("<MarkerList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set markers(value) {
    		throw new Error("<MarkerList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\controls\GeolocationControl.svelte generated by Svelte v3.24.1 */

    function create_fragment$4(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();
    	let { position = "bottom-right" } = $$props;
    	let { options = {} } = $$props;

    	if (!!options) {
    		switch (position) {
    			case "top-left":
    				options.anchor = BMAP_ANCHOR_TOP_LEFT;
    				break;
    			case "top-right":
    				options.anchor = BMAP_ANCHOR_TOP_RIGHT;
    				break;
    			case "bottom-left":
    				options.anchor = BMAP_ANCHOR_BOTTOM_LEFT;
    				break;
    			case "bottom-right":
    				options.anchor = BMAP_ANCHOR_BOTTOM_RIGHT;
    				break;
    			default:
    				options.anchor = BMAP_ANCHOR_TOP_RIGHT;
    				break;
    		}
    	}

    	const geolocation = new bdmap.GeolocationControl(options);

    	geolocation.addEventListener("locationSuccess", function (e) {
    		// 定位成功事件
    		var address = "";

    		address += e.addressComponent.province;
    		address += e.addressComponent.city;
    		address += e.addressComponent.district;
    		address += e.addressComponent.street;
    		address += e.addressComponent.streetNumber;
    		alert("当前定位地址为：" + address);
    	});

    	geolocation.addEventListener("locationError", function (e) {
    		// 定位失败事件
    		alert(e.message);
    	});

    	map.addControl(geolocation);
    	const writable_props = ["position", "options"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<GeolocationControl> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("GeolocationControl", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("position" in $$props) $$invalidate(1, position = $$props.position);
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		createEventDispatcher,
    		contextKey,
    		dispatch,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		position,
    		options,
    		geolocation
    	});

    	$$self.$inject_state = $$props => {
    		if ("position" in $$props) $$invalidate(1, position = $$props.position);
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [options, position];
    }

    class GeolocationControl extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { position: 1, options: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GeolocationControl",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get position() {
    		throw new Error("<GeolocationControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set position(value) {
    		throw new Error("<GeolocationControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<GeolocationControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<GeolocationControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\controls\NavigationControl.svelte generated by Svelte v3.24.1 */

    function create_fragment$5(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();
    	let { position = "top-left" } = $$props;
    	let { ctltype = "large" } = $$props;
    	let { options = {} } = $$props;

    	if (!!options) {
    		switch (position) {
    			case "top-left":
    				options.anchor = BMAP_ANCHOR_TOP_LEFT;
    				break;
    			case "top-right":
    				options.anchor = BMAP_ANCHOR_TOP_RIGHT;
    				break;
    			case "bottom-left":
    				options.anchor = BMAP_ANCHOR_BOTTOM_LEFT;
    				break;
    			case "bottom-right":
    				options.anchor = BMAP_ANCHOR_BOTTOM_RIGHT;
    				break;
    			default:
    				options.anchor = BMAP_ANCHOR_TOP_LEFT;
    				break;
    		}

    		switch (ctltype) {
    			case "large":
    				options.type = BMAP_NAVIGATION_CONTROL_LARGE;
    				break;
    			case "small":
    				options.type = BMAP_NAVIGATION_CONTROL_SMALL;
    				break;
    			case "pan":
    				options.type = BMAP_NAVIGATION_CONTROL_PAN;
    				break;
    			case "zoom":
    				options.type = BMAP_NAVIGATION_CONTROL_ZOOM;
    				break;
    			default:
    				options.type = BMAP_NAVIGATION_CONTROL_LARGE;
    				break;
    		}
    	}

    	const navctl = new bdmap.NavigationControl(options);
    	map.addControl(navctl);
    	const writable_props = ["position", "ctltype", "options"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NavigationControl> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NavigationControl", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("position" in $$props) $$invalidate(1, position = $$props.position);
    		if ("ctltype" in $$props) $$invalidate(2, ctltype = $$props.ctltype);
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		contextKey,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		position,
    		ctltype,
    		options,
    		navctl
    	});

    	$$self.$inject_state = $$props => {
    		if ("position" in $$props) $$invalidate(1, position = $$props.position);
    		if ("ctltype" in $$props) $$invalidate(2, ctltype = $$props.ctltype);
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [options, position, ctltype];
    }

    class NavigationControl extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { position: 1, ctltype: 2, options: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NavigationControl",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get position() {
    		throw new Error("<NavigationControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set position(value) {
    		throw new Error("<NavigationControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ctltype() {
    		throw new Error("<NavigationControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ctltype(value) {
    		throw new Error("<NavigationControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<NavigationControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<NavigationControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\controls\CityListControl.svelte generated by Svelte v3.24.1 */

    function create_fragment$6(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();
    	let { position = "top-left" } = $$props;
    	let { options = {} } = $$props;

    	if (!!options) {
    		switch (position) {
    			case "top-left":
    				options.anchor = BMAP_ANCHOR_TOP_LEFT;
    				break;
    			case "top-right":
    				options.anchor = BMAP_ANCHOR_TOP_RIGHT;
    				break;
    			case "bottom-left":
    				options.anchor = BMAP_ANCHOR_BOTTOM_LEFT;
    				break;
    			case "bottom-right":
    				options.anchor = BMAP_ANCHOR_BOTTOM_RIGHT;
    				break;
    			default:
    				options.anchor = BMAP_ANCHOR_TOP_LEFT;
    				break;
    		}

    		var size = new bdmap.Size(10, 20);
    		options.offset = size;
    	}

    	// @todo 事件
    	// 切换城市之前事件
    	// onChangeBefore: function(){
    	//    alert('before');
    	// },
    	// 切换城市之后事件
    	// onChangeAfter:function(){
    	//   alert('after');
    	// }
    	const clctl = new bdmap.CityListControl(options);

    	map.addControl(clctl);
    	const writable_props = ["position", "options"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CityListControl> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("CityListControl", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("position" in $$props) $$invalidate(1, position = $$props.position);
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		contextKey,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		position,
    		options,
    		size,
    		clctl
    	});

    	$$self.$inject_state = $$props => {
    		if ("position" in $$props) $$invalidate(1, position = $$props.position);
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    		if ("size" in $$props) size = $$props.size;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [options, position];
    }

    class CityListControl extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { position: 1, options: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CityListControl",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get position() {
    		throw new Error("<CityListControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set position(value) {
    		throw new Error("<CityListControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<CityListControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<CityListControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\controls\MapTypeControl.svelte generated by Svelte v3.24.1 */

    function create_fragment$7(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();
    	let { position = "top-left" } = $$props;
    	let { mtype = "M" } = $$props;

    	let { options = {
    		mapTypes: [],
    		anchor: BMAP_ANCHOR_TOP_LEFT
    	} } = $$props;

    	if (!!options) {
    		switch (position) {
    			case "top-left":
    				options.anchor = BMAP_ANCHOR_TOP_LEFT;
    				break;
    			case "top-right":
    				options.anchor = BMAP_ANCHOR_TOP_RIGHT;
    				break;
    			case "bottom-left":
    				options.anchor = BMAP_ANCHOR_BOTTOM_LEFT;
    				break;
    			case "bottom-right":
    				options.anchor = BMAP_ANCHOR_BOTTOM_RIGHT;
    				break;
    			default:
    				options.anchor = BMAP_ANCHOR_TOP_LEFT;
    				break;
    		}

    		if (mtype.length > 0) {
    			if (mtype.toUpperCase().includes("N")) {
    				options.mapTypes.push(BMAP_NORMAL_MAP); // 此地图类型展示普通街道视图
    			}

    			if (mtype.toUpperCase().includes("S")) {
    				options.mapTypes.push(BMAP_SATELLITE_MAP); // 此地图类型展示卫星视图
    			}

    			if (mtype.toUpperCase().includes("H")) {
    				options.mapTypes.push(BMAP_HYBRID_MAP); // 此地图类型展示卫星和路网的混合视图
    			}

    			const mtctl = new bdmap.MapTypeControl(options);
    			map.addControl(mtctl);
    		}
    	}

    	const writable_props = ["position", "mtype", "options"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MapTypeControl> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("MapTypeControl", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("position" in $$props) $$invalidate(1, position = $$props.position);
    		if ("mtype" in $$props) $$invalidate(2, mtype = $$props.mtype);
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		contextKey,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		position,
    		mtype,
    		options
    	});

    	$$self.$inject_state = $$props => {
    		if ("position" in $$props) $$invalidate(1, position = $$props.position);
    		if ("mtype" in $$props) $$invalidate(2, mtype = $$props.mtype);
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [options, position, mtype];
    }

    class MapTypeControl extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { position: 1, mtype: 2, options: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MapTypeControl",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get position() {
    		throw new Error("<MapTypeControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set position(value) {
    		throw new Error("<MapTypeControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mtype() {
    		throw new Error("<MapTypeControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mtype(value) {
    		throw new Error("<MapTypeControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<MapTypeControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<MapTypeControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\controls\CopyrightControl.svelte generated by Svelte v3.24.1 */

    const { console: console_1$1 } = globals;

    function create_fragment$8(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();
    	let { id = 1 } = $$props;
    	let { content } = $$props;
    	let { position = "top-left" } = $$props;
    	let { offset } = $$props;
    	let { options = {} } = $$props;

    	if (!!options) {
    		switch (position) {
    			case "top-left":
    				options.anchor = BMAP_ANCHOR_TOP_LEFT;
    				break;
    			case "top-right":
    				options.anchor = BMAP_ANCHOR_TOP_RIGHT;
    				break;
    			case "bottom-left":
    				options.anchor = BMAP_ANCHOR_BOTTOM_LEFT;
    				break;
    			case "bottom-right":
    				options.anchor = BMAP_ANCHOR_BOTTOM_RIGHT;
    				break;
    			default:
    				options.anchor = BMAP_ANCHOR_TOP_LEFT;
    				break;
    		}
    	}

    	if (typeof offset !== "undefined") {
    		options.offset = new bdmap.Size(offset.width, offset.height);
    	}

    	const crctl = new bdmap.CopyrightControl(options);
    	map.addControl(crctl);
    	console.log(typeof id);
    	console.log("id=", id);
    	var bs = map.getBounds(); //返回地图可视区域

    	// @example {id: 1, content: "<a href='#' style='font-size:20px;background:yellow'>我是自定义版权控件呀</a>"
    	// @see http://lbsyun.baidu.com/cms/jsapi/reference/jsapi_reference.html#a2b14
    	crctl.addCopyright({ id, content, bounds: bs });

    	const writable_props = ["id", "content", "position", "offset", "options"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<CopyrightControl> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("CopyrightControl", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("content" in $$props) $$invalidate(2, content = $$props.content);
    		if ("position" in $$props) $$invalidate(3, position = $$props.position);
    		if ("offset" in $$props) $$invalidate(4, offset = $$props.offset);
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		contextKey,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		id,
    		content,
    		position,
    		offset,
    		options,
    		crctl,
    		bs
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("content" in $$props) $$invalidate(2, content = $$props.content);
    		if ("position" in $$props) $$invalidate(3, position = $$props.position);
    		if ("offset" in $$props) $$invalidate(4, offset = $$props.offset);
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    		if ("bs" in $$props) bs = $$props.bs;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [options, id, content, position, offset];
    }

    class CopyrightControl extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			id: 1,
    			content: 2,
    			position: 3,
    			offset: 4,
    			options: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CopyrightControl",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*content*/ ctx[2] === undefined && !("content" in props)) {
    			console_1$1.warn("<CopyrightControl> was created without expected prop 'content'");
    		}

    		if (/*offset*/ ctx[4] === undefined && !("offset" in props)) {
    			console_1$1.warn("<CopyrightControl> was created without expected prop 'offset'");
    		}
    	}

    	get id() {
    		throw new Error("<CopyrightControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<CopyrightControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get content() {
    		throw new Error("<CopyrightControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<CopyrightControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get position() {
    		throw new Error("<CopyrightControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set position(value) {
    		throw new Error("<CopyrightControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get offset() {
    		throw new Error("<CopyrightControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offset(value) {
    		throw new Error("<CopyrightControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<CopyrightControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<CopyrightControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function createPoint(bdmap) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var lng = options.lng,
          lat = options.lat;
      return new bdmap.Point(lng, lat);
    }
    function createBounds(bdmap) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var sw = options.sw,
          ne = options.ne;
      return new bdmap.Bounds(createPoint(bdmap, sw), createPoint(bdmap, ne));
    }

    var isPoint = function isPoint(obj) {
      return obj.lng && obj.lat;
    };
    var getPosition = function getPosition(bdmap, point) {
      return isPoint(point) ? createPoint(bdmap, point) : point;
    };

    /* src\components\search\LocalSearch.svelte generated by Svelte v3.24.1 */

    function create_fragment$9(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();
    	let { location } = $$props; // Object, String
    	let { keyword } = $$props; // Array, String
    	let { panel } = $$props; // {String|HTMLElement}
    	let { bounds } = $$props; // Object
    	let { nearby } = $$props; // Object
    	let { pageCapacity } = $$props; // Number
    	let { autoViewport } = $$props; // Boolean
    	let { selectFirstResult } = $$props; // Boolean
    	let { highlightMode } = $$props; // String
    	let el;

    	function searchNearby(local, nearby) {
    		local.searchNearby(keyword, createPoint(bdmap, nearby.center), nearby.radius);
    	}

    	function searchInBounds(local, bounds) {
    		local.searchInBounds(keyword, createBounds(bdmap, bounds));
    	}

    	function search(local) {
    		nearby
    		? searchNearby(local, nearby)
    		: bounds
    			? searchInBounds(local, bounds)
    			: local.search(keyword);
    	}

    	onMount(async () => {
    		const _location = location
    		? isPoint(location)
    			? createPoint(map, location)
    			: location
    		: map;

    		let _opts = {
    			map,
    			selectFirstResult,
    			autoViewport,
    			highlightMode
    		};

    		if (panel !== "undefined") {
    			_opts.panel = panel;
    		}

    		const local = new bdmap.LocalSearch(_location,
    		{
    				onMarkersSet(e) {
    					dispatch("markersset", e);
    				},
    				onInfoHtmlSet(e) {
    					dispatch("infohtmlset", e);
    				},
    				onResultsHtmlSet(e) {
    					dispatch("resultshtmlset", e);
    				},
    				onSearchComplete(e) {
    					dispatch("searchcomplete", e);
    				},
    				pageCapacity,
    				renderOptions: _opts
    			});

    		search(local);
    	});

    	const writable_props = [
    		"location",
    		"keyword",
    		"panel",
    		"bounds",
    		"nearby",
    		"pageCapacity",
    		"autoViewport",
    		"selectFirstResult",
    		"highlightMode"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LocalSearch> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("LocalSearch", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    		if ("keyword" in $$props) $$invalidate(1, keyword = $$props.keyword);
    		if ("panel" in $$props) $$invalidate(2, panel = $$props.panel);
    		if ("bounds" in $$props) $$invalidate(3, bounds = $$props.bounds);
    		if ("nearby" in $$props) $$invalidate(4, nearby = $$props.nearby);
    		if ("pageCapacity" in $$props) $$invalidate(5, pageCapacity = $$props.pageCapacity);
    		if ("autoViewport" in $$props) $$invalidate(6, autoViewport = $$props.autoViewport);
    		if ("selectFirstResult" in $$props) $$invalidate(7, selectFirstResult = $$props.selectFirstResult);
    		if ("highlightMode" in $$props) $$invalidate(8, highlightMode = $$props.highlightMode);
    	};

    	$$self.$capture_state = () => ({
    		createPoint,
    		createBounds,
    		isPoint,
    		onMount,
    		createEventDispatcher,
    		getContext,
    		contextKey,
    		dispatch,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		location,
    		keyword,
    		panel,
    		bounds,
    		nearby,
    		pageCapacity,
    		autoViewport,
    		selectFirstResult,
    		highlightMode,
    		el,
    		searchNearby,
    		searchInBounds,
    		search
    	});

    	$$self.$inject_state = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    		if ("keyword" in $$props) $$invalidate(1, keyword = $$props.keyword);
    		if ("panel" in $$props) $$invalidate(2, panel = $$props.panel);
    		if ("bounds" in $$props) $$invalidate(3, bounds = $$props.bounds);
    		if ("nearby" in $$props) $$invalidate(4, nearby = $$props.nearby);
    		if ("pageCapacity" in $$props) $$invalidate(5, pageCapacity = $$props.pageCapacity);
    		if ("autoViewport" in $$props) $$invalidate(6, autoViewport = $$props.autoViewport);
    		if ("selectFirstResult" in $$props) $$invalidate(7, selectFirstResult = $$props.selectFirstResult);
    		if ("highlightMode" in $$props) $$invalidate(8, highlightMode = $$props.highlightMode);
    		if ("el" in $$props) el = $$props.el;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		location,
    		keyword,
    		panel,
    		bounds,
    		nearby,
    		pageCapacity,
    		autoViewport,
    		selectFirstResult,
    		highlightMode
    	];
    }

    class LocalSearch extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
    			location: 0,
    			keyword: 1,
    			panel: 2,
    			bounds: 3,
    			nearby: 4,
    			pageCapacity: 5,
    			autoViewport: 6,
    			selectFirstResult: 7,
    			highlightMode: 8
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LocalSearch",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*location*/ ctx[0] === undefined && !("location" in props)) {
    			console.warn("<LocalSearch> was created without expected prop 'location'");
    		}

    		if (/*keyword*/ ctx[1] === undefined && !("keyword" in props)) {
    			console.warn("<LocalSearch> was created without expected prop 'keyword'");
    		}

    		if (/*panel*/ ctx[2] === undefined && !("panel" in props)) {
    			console.warn("<LocalSearch> was created without expected prop 'panel'");
    		}

    		if (/*bounds*/ ctx[3] === undefined && !("bounds" in props)) {
    			console.warn("<LocalSearch> was created without expected prop 'bounds'");
    		}

    		if (/*nearby*/ ctx[4] === undefined && !("nearby" in props)) {
    			console.warn("<LocalSearch> was created without expected prop 'nearby'");
    		}

    		if (/*pageCapacity*/ ctx[5] === undefined && !("pageCapacity" in props)) {
    			console.warn("<LocalSearch> was created without expected prop 'pageCapacity'");
    		}

    		if (/*autoViewport*/ ctx[6] === undefined && !("autoViewport" in props)) {
    			console.warn("<LocalSearch> was created without expected prop 'autoViewport'");
    		}

    		if (/*selectFirstResult*/ ctx[7] === undefined && !("selectFirstResult" in props)) {
    			console.warn("<LocalSearch> was created without expected prop 'selectFirstResult'");
    		}

    		if (/*highlightMode*/ ctx[8] === undefined && !("highlightMode" in props)) {
    			console.warn("<LocalSearch> was created without expected prop 'highlightMode'");
    		}
    	}

    	get location() {
    		throw new Error("<LocalSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<LocalSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get keyword() {
    		throw new Error("<LocalSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set keyword(value) {
    		throw new Error("<LocalSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get panel() {
    		throw new Error("<LocalSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set panel(value) {
    		throw new Error("<LocalSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bounds() {
    		throw new Error("<LocalSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bounds(value) {
    		throw new Error("<LocalSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nearby() {
    		throw new Error("<LocalSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nearby(value) {
    		throw new Error("<LocalSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pageCapacity() {
    		throw new Error("<LocalSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pageCapacity(value) {
    		throw new Error("<LocalSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get autoViewport() {
    		throw new Error("<LocalSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set autoViewport(value) {
    		throw new Error("<LocalSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selectFirstResult() {
    		throw new Error("<LocalSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectFirstResult(value) {
    		throw new Error("<LocalSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get highlightMode() {
    		throw new Error("<LocalSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set highlightMode(value) {
    		throw new Error("<LocalSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\search\Bus.svelte generated by Svelte v3.24.1 */

    function create_fragment$a(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();
    	let { location } = $$props; // {Object|String}
    	let { keyword } = $$props; // String
    	let { panel } = $$props; // {String|HTMLElement}
    	let { autoViewport } = $$props; // Boolean
    	let { selectFirstResult } = $$props; // Boolean
    	let { highlightMode } = $$props; // String
    	let busline;

    	function search(keyword) {
    		busline.getBusList(keyword);
    	}

    	onMount(async () => {
    		const _location = location
    		? isPoint(location)
    			? createPoint(bdmap, location)
    			: location
    		: map;

    		const route = busline = new bdmap.BusLineSearch(_location,
    		{
    				renderOptions: {
    					map,
    					panel,
    					selectFirstResult,
    					autoViewport,
    					highlightMode
    				},
    				onGetBusListComplete(e) {
    					if (busline && busline !== route) {
    						busline.clearResults();
    					}

    					dispatch("getbuslistcomplete", e);
    				},
    				onGetBusLineComplete(e) {
    					if (busline && busline !== route) {
    						busline.clearResults();
    					}

    					dispatch("getbuslinecomplete", e);
    				},
    				onBusListHtmlSet(e) {
    					dispatch("buslisthtmlset", e);
    				},
    				onBusLineHtmlSet(e) {
    					dispatch("buslinehtmlset", e);
    				},
    				onMarkersSet(e) {
    					dispatch("markersset", e);
    				},
    				onPolylinesSet(e) {
    					dispatch("polylinesset", e);
    				}
    			});

    		search(keyword);
    	});

    	const writable_props = [
    		"location",
    		"keyword",
    		"panel",
    		"autoViewport",
    		"selectFirstResult",
    		"highlightMode"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Bus> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Bus", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    		if ("keyword" in $$props) $$invalidate(1, keyword = $$props.keyword);
    		if ("panel" in $$props) $$invalidate(2, panel = $$props.panel);
    		if ("autoViewport" in $$props) $$invalidate(3, autoViewport = $$props.autoViewport);
    		if ("selectFirstResult" in $$props) $$invalidate(4, selectFirstResult = $$props.selectFirstResult);
    		if ("highlightMode" in $$props) $$invalidate(5, highlightMode = $$props.highlightMode);
    	};

    	$$self.$capture_state = () => ({
    		createPoint,
    		isPoint,
    		onMount,
    		createEventDispatcher,
    		getContext,
    		contextKey,
    		dispatch,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		location,
    		keyword,
    		panel,
    		autoViewport,
    		selectFirstResult,
    		highlightMode,
    		busline,
    		search
    	});

    	$$self.$inject_state = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    		if ("keyword" in $$props) $$invalidate(1, keyword = $$props.keyword);
    		if ("panel" in $$props) $$invalidate(2, panel = $$props.panel);
    		if ("autoViewport" in $$props) $$invalidate(3, autoViewport = $$props.autoViewport);
    		if ("selectFirstResult" in $$props) $$invalidate(4, selectFirstResult = $$props.selectFirstResult);
    		if ("highlightMode" in $$props) $$invalidate(5, highlightMode = $$props.highlightMode);
    		if ("busline" in $$props) busline = $$props.busline;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [location, keyword, panel, autoViewport, selectFirstResult, highlightMode];
    }

    class Bus extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			location: 0,
    			keyword: 1,
    			panel: 2,
    			autoViewport: 3,
    			selectFirstResult: 4,
    			highlightMode: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bus",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*location*/ ctx[0] === undefined && !("location" in props)) {
    			console.warn("<Bus> was created without expected prop 'location'");
    		}

    		if (/*keyword*/ ctx[1] === undefined && !("keyword" in props)) {
    			console.warn("<Bus> was created without expected prop 'keyword'");
    		}

    		if (/*panel*/ ctx[2] === undefined && !("panel" in props)) {
    			console.warn("<Bus> was created without expected prop 'panel'");
    		}

    		if (/*autoViewport*/ ctx[3] === undefined && !("autoViewport" in props)) {
    			console.warn("<Bus> was created without expected prop 'autoViewport'");
    		}

    		if (/*selectFirstResult*/ ctx[4] === undefined && !("selectFirstResult" in props)) {
    			console.warn("<Bus> was created without expected prop 'selectFirstResult'");
    		}

    		if (/*highlightMode*/ ctx[5] === undefined && !("highlightMode" in props)) {
    			console.warn("<Bus> was created without expected prop 'highlightMode'");
    		}
    	}

    	get location() {
    		throw new Error("<Bus>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<Bus>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get keyword() {
    		throw new Error("<Bus>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set keyword(value) {
    		throw new Error("<Bus>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get panel() {
    		throw new Error("<Bus>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set panel(value) {
    		throw new Error("<Bus>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get autoViewport() {
    		throw new Error("<Bus>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set autoViewport(value) {
    		throw new Error("<Bus>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selectFirstResult() {
    		throw new Error("<Bus>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectFirstResult(value) {
    		throw new Error("<Bus>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get highlightMode() {
    		throw new Error("<Bus>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set highlightMode(value) {
    		throw new Error("<Bus>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\search\Driving.svelte generated by Svelte v3.24.1 */

    function create_fragment$b(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();

    	/** 
     * DrivingPolicy
     * 此枚举类型表示驾车方案的策略配置。
     *
     * @see http://lbsyun.baidu.com/cms/jsapi/reference/jsapi_reference.html#a7b19
     */
    	const drivingRoutePolicy = [
    		bdmap_DRIVING_POLICY_LEAST_TIME,
    		bdmap_DRIVING_POLICY_LEAST_DISTANCE,
    		bdmap_DRIVING_POLICY_AVOID_HIGHWAYS
    	]; // 最少时间
    	// 最短距离
    	// 避开高速

    	let { location } = $$props; // {Object|String}
    	let { start } = $$props; // {Object|String}
    	let { end } = $$props; // {Object|String}
    	let { startCity } = $$props; // [String, Number]
    	let { endCity } = $$props; // [String, Number]
    	let { waypoints } = $$props; // Array
    	let { policy } = $$props; // String
    	let { panel } = $$props; // {String|HTMLElement}
    	let { autoViewport } = $$props; // Boolean
    	let { selectFirstResult } = $$props; // Boolean
    	let { highlightMode } = $$props; // String
    	let originInstance;

    	function search(start, end, { startCity, endCity, waypoints }) {
    		originInstance.search(start, end, {
    			startCity,
    			endCity,
    			waypoints: getWaypoints(waypoints)
    		});
    	}

    	function getWaypoints(waypoints) {
    		if (waypoints) {
    			return waypoints.map(position => getPosition(bdmap, position));
    		}
    	}

    	onMount(async () => {
    		const _location = location
    		? isPoint(location)
    			? createPoint(bdmap, location)
    			: location
    		: map;

    		const route = originInstance = new bdmap.DrivingRoute(_location,
    		{
    				renderOptions: {
    					map,
    					panel,
    					selectFirstResult,
    					autoViewport,
    					highlightMode
    				},
    				policy: drivingRoutePolicy[policy],
    				onSearchComplete(e) {
    					if (originInstance && originInstance !== route) {
    						originInstance.clearResults();
    					}

    					dispatch("searchcomplete", e);
    				},
    				onMarkersSet(e) {
    					dispatch("markersset", e);
    				},
    				onInfoHtmlSet(e) {
    					dispatch("infohtmlset", e);
    				},
    				onPolylinesSet(e) {
    					dispatch("polylinesset", e);
    				},
    				onResultsHtmlSet(e) {
    					dispatch("resultshtmlset", e);
    				}
    			});

    		search(getPosition(bdmap, start), getPosition(bdmap, end), {
    			startCity,
    			endCity,
    			waypoints: getWaypoints(waypoints)
    		});
    	});

    	const writable_props = [
    		"location",
    		"start",
    		"end",
    		"startCity",
    		"endCity",
    		"waypoints",
    		"policy",
    		"panel",
    		"autoViewport",
    		"selectFirstResult",
    		"highlightMode"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Driving> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Driving", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("location" in $$props) $$invalidate(1, location = $$props.location);
    		if ("start" in $$props) $$invalidate(2, start = $$props.start);
    		if ("end" in $$props) $$invalidate(3, end = $$props.end);
    		if ("startCity" in $$props) $$invalidate(4, startCity = $$props.startCity);
    		if ("endCity" in $$props) $$invalidate(5, endCity = $$props.endCity);
    		if ("waypoints" in $$props) $$invalidate(6, waypoints = $$props.waypoints);
    		if ("policy" in $$props) $$invalidate(0, policy = $$props.policy);
    		if ("panel" in $$props) $$invalidate(7, panel = $$props.panel);
    		if ("autoViewport" in $$props) $$invalidate(8, autoViewport = $$props.autoViewport);
    		if ("selectFirstResult" in $$props) $$invalidate(9, selectFirstResult = $$props.selectFirstResult);
    		if ("highlightMode" in $$props) $$invalidate(10, highlightMode = $$props.highlightMode);
    	};

    	$$self.$capture_state = () => ({
    		createPoint,
    		isPoint,
    		getPosition,
    		onMount,
    		createEventDispatcher,
    		getContext,
    		contextKey,
    		dispatch,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		drivingRoutePolicy,
    		location,
    		start,
    		end,
    		startCity,
    		endCity,
    		waypoints,
    		policy,
    		panel,
    		autoViewport,
    		selectFirstResult,
    		highlightMode,
    		originInstance,
    		search,
    		getWaypoints
    	});

    	$$self.$inject_state = $$props => {
    		if ("location" in $$props) $$invalidate(1, location = $$props.location);
    		if ("start" in $$props) $$invalidate(2, start = $$props.start);
    		if ("end" in $$props) $$invalidate(3, end = $$props.end);
    		if ("startCity" in $$props) $$invalidate(4, startCity = $$props.startCity);
    		if ("endCity" in $$props) $$invalidate(5, endCity = $$props.endCity);
    		if ("waypoints" in $$props) $$invalidate(6, waypoints = $$props.waypoints);
    		if ("policy" in $$props) $$invalidate(0, policy = $$props.policy);
    		if ("panel" in $$props) $$invalidate(7, panel = $$props.panel);
    		if ("autoViewport" in $$props) $$invalidate(8, autoViewport = $$props.autoViewport);
    		if ("selectFirstResult" in $$props) $$invalidate(9, selectFirstResult = $$props.selectFirstResult);
    		if ("highlightMode" in $$props) $$invalidate(10, highlightMode = $$props.highlightMode);
    		if ("originInstance" in $$props) originInstance = $$props.originInstance;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*policy*/ 1) {
    			 if (policy < 0 && policy > 2 || policy === "undefined") {
    				$$invalidate(0, policy = 0);
    			}
    		}
    	};

    	return [
    		policy,
    		location,
    		start,
    		end,
    		startCity,
    		endCity,
    		waypoints,
    		panel,
    		autoViewport,
    		selectFirstResult,
    		highlightMode
    	];
    }

    class Driving extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {
    			location: 1,
    			start: 2,
    			end: 3,
    			startCity: 4,
    			endCity: 5,
    			waypoints: 6,
    			policy: 0,
    			panel: 7,
    			autoViewport: 8,
    			selectFirstResult: 9,
    			highlightMode: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Driving",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*location*/ ctx[1] === undefined && !("location" in props)) {
    			console.warn("<Driving> was created without expected prop 'location'");
    		}

    		if (/*start*/ ctx[2] === undefined && !("start" in props)) {
    			console.warn("<Driving> was created without expected prop 'start'");
    		}

    		if (/*end*/ ctx[3] === undefined && !("end" in props)) {
    			console.warn("<Driving> was created without expected prop 'end'");
    		}

    		if (/*startCity*/ ctx[4] === undefined && !("startCity" in props)) {
    			console.warn("<Driving> was created without expected prop 'startCity'");
    		}

    		if (/*endCity*/ ctx[5] === undefined && !("endCity" in props)) {
    			console.warn("<Driving> was created without expected prop 'endCity'");
    		}

    		if (/*waypoints*/ ctx[6] === undefined && !("waypoints" in props)) {
    			console.warn("<Driving> was created without expected prop 'waypoints'");
    		}

    		if (/*policy*/ ctx[0] === undefined && !("policy" in props)) {
    			console.warn("<Driving> was created without expected prop 'policy'");
    		}

    		if (/*panel*/ ctx[7] === undefined && !("panel" in props)) {
    			console.warn("<Driving> was created without expected prop 'panel'");
    		}

    		if (/*autoViewport*/ ctx[8] === undefined && !("autoViewport" in props)) {
    			console.warn("<Driving> was created without expected prop 'autoViewport'");
    		}

    		if (/*selectFirstResult*/ ctx[9] === undefined && !("selectFirstResult" in props)) {
    			console.warn("<Driving> was created without expected prop 'selectFirstResult'");
    		}

    		if (/*highlightMode*/ ctx[10] === undefined && !("highlightMode" in props)) {
    			console.warn("<Driving> was created without expected prop 'highlightMode'");
    		}
    	}

    	get location() {
    		throw new Error("<Driving>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<Driving>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get start() {
    		throw new Error("<Driving>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set start(value) {
    		throw new Error("<Driving>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get end() {
    		throw new Error("<Driving>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set end(value) {
    		throw new Error("<Driving>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get startCity() {
    		throw new Error("<Driving>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set startCity(value) {
    		throw new Error("<Driving>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get endCity() {
    		throw new Error("<Driving>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set endCity(value) {
    		throw new Error("<Driving>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get waypoints() {
    		throw new Error("<Driving>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set waypoints(value) {
    		throw new Error("<Driving>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get policy() {
    		throw new Error("<Driving>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set policy(value) {
    		throw new Error("<Driving>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get panel() {
    		throw new Error("<Driving>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set panel(value) {
    		throw new Error("<Driving>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get autoViewport() {
    		throw new Error("<Driving>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set autoViewport(value) {
    		throw new Error("<Driving>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selectFirstResult() {
    		throw new Error("<Driving>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectFirstResult(value) {
    		throw new Error("<Driving>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get highlightMode() {
    		throw new Error("<Driving>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set highlightMode(value) {
    		throw new Error("<Driving>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\search\Transit.svelte generated by Svelte v3.24.1 */

    function create_fragment$c(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();

    	/** 
     * TransitPolicy
     * 此常量表示公交方案的策略。
     *
     * @see http://lbsyun.baidu.com/cms/jsapi/reference/jsapi_reference.html#a7b9
     */
    	const transitRoutePolicy = [
    		BMAP_TRANSIT_POLICY_LEAST_TIME,
    		BMAP_TRANSIT_POLICY_LEAST_TRANSFER,
    		BMAP_TRANSIT_POLICY_LEAST_WALKING,
    		BMAP_TRANSIT_POLICY_AVOID_SUBWAYS
    	]; // 最少时间
    	// 最少换乘
    	// 最少步行
    	// 不乘地铁

    	let { location } = $$props; // {Object|String}
    	let { start } = $$props; // {Object|String}
    	let { end } = $$props; // {Object|String}
    	let { panel } = $$props; // {String|HTMLElement}
    	let { policy } = $$props; // {Number:0|1|2|3}
    	let { pageCapacity } = $$props; // Number
    	let { autoViewport } = $$props; // Boolean
    	let { selectFirstResult } = $$props; // Boolean
    	let { highlightMode } = $$props; // String
    	let originInstance;

    	function search(start, end) {
    		originInstance.search(start, end);
    	}

    	onMount(async () => {
    		const _location = location
    		? isPoint(location)
    			? createPoint(bdmap, location)
    			: location
    		: map;

    		const route = originInstance = new bdmap.TransitRoute(_location,
    		{
    				renderOptions: {
    					map,
    					panel,
    					selectFirstResult,
    					autoViewport,
    					highlightMode
    				},
    				policy: transitRoutePolicy[policy],
    				pageCapacity,
    				onSearchComplete(e) {
    					if (originInstance && originInstance !== route) {
    						originInstance.clearResults();
    					}

    					dispatch("searchcomplete", e);
    				},
    				onMarkersSet(e) {
    					dispatch("markersset", e);
    				},
    				onInfoHtmlSet(e) {
    					dispatch("infohtmlset", e);
    				},
    				onPolylinesSet(e) {
    					dispatch("polylinesset", e);
    				},
    				onResultsHtmlSet(e) {
    					dispatch("resultshtmlset", e);
    				}
    			});

    		search(isPoint(start) ? createPoint(bdmap, start) : start, isPoint(end) ? createPoint(bdmap, end) : end);
    	});

    	const writable_props = [
    		"location",
    		"start",
    		"end",
    		"panel",
    		"policy",
    		"pageCapacity",
    		"autoViewport",
    		"selectFirstResult",
    		"highlightMode"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Transit> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Transit", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("location" in $$props) $$invalidate(1, location = $$props.location);
    		if ("start" in $$props) $$invalidate(2, start = $$props.start);
    		if ("end" in $$props) $$invalidate(3, end = $$props.end);
    		if ("panel" in $$props) $$invalidate(4, panel = $$props.panel);
    		if ("policy" in $$props) $$invalidate(0, policy = $$props.policy);
    		if ("pageCapacity" in $$props) $$invalidate(5, pageCapacity = $$props.pageCapacity);
    		if ("autoViewport" in $$props) $$invalidate(6, autoViewport = $$props.autoViewport);
    		if ("selectFirstResult" in $$props) $$invalidate(7, selectFirstResult = $$props.selectFirstResult);
    		if ("highlightMode" in $$props) $$invalidate(8, highlightMode = $$props.highlightMode);
    	};

    	$$self.$capture_state = () => ({
    		createPoint,
    		isPoint,
    		getPosition,
    		onMount,
    		createEventDispatcher,
    		getContext,
    		contextKey,
    		dispatch,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		transitRoutePolicy,
    		location,
    		start,
    		end,
    		panel,
    		policy,
    		pageCapacity,
    		autoViewport,
    		selectFirstResult,
    		highlightMode,
    		originInstance,
    		search
    	});

    	$$self.$inject_state = $$props => {
    		if ("location" in $$props) $$invalidate(1, location = $$props.location);
    		if ("start" in $$props) $$invalidate(2, start = $$props.start);
    		if ("end" in $$props) $$invalidate(3, end = $$props.end);
    		if ("panel" in $$props) $$invalidate(4, panel = $$props.panel);
    		if ("policy" in $$props) $$invalidate(0, policy = $$props.policy);
    		if ("pageCapacity" in $$props) $$invalidate(5, pageCapacity = $$props.pageCapacity);
    		if ("autoViewport" in $$props) $$invalidate(6, autoViewport = $$props.autoViewport);
    		if ("selectFirstResult" in $$props) $$invalidate(7, selectFirstResult = $$props.selectFirstResult);
    		if ("highlightMode" in $$props) $$invalidate(8, highlightMode = $$props.highlightMode);
    		if ("originInstance" in $$props) originInstance = $$props.originInstance;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*policy*/ 1) {
    			 if (policy < 0 && policy > 3 || policy === "undefined") {
    				$$invalidate(0, policy = 0);
    			}
    		}
    	};

    	return [
    		policy,
    		location,
    		start,
    		end,
    		panel,
    		pageCapacity,
    		autoViewport,
    		selectFirstResult,
    		highlightMode
    	];
    }

    class Transit extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
    			location: 1,
    			start: 2,
    			end: 3,
    			panel: 4,
    			policy: 0,
    			pageCapacity: 5,
    			autoViewport: 6,
    			selectFirstResult: 7,
    			highlightMode: 8
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Transit",
    			options,
    			id: create_fragment$c.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*location*/ ctx[1] === undefined && !("location" in props)) {
    			console.warn("<Transit> was created without expected prop 'location'");
    		}

    		if (/*start*/ ctx[2] === undefined && !("start" in props)) {
    			console.warn("<Transit> was created without expected prop 'start'");
    		}

    		if (/*end*/ ctx[3] === undefined && !("end" in props)) {
    			console.warn("<Transit> was created without expected prop 'end'");
    		}

    		if (/*panel*/ ctx[4] === undefined && !("panel" in props)) {
    			console.warn("<Transit> was created without expected prop 'panel'");
    		}

    		if (/*policy*/ ctx[0] === undefined && !("policy" in props)) {
    			console.warn("<Transit> was created without expected prop 'policy'");
    		}

    		if (/*pageCapacity*/ ctx[5] === undefined && !("pageCapacity" in props)) {
    			console.warn("<Transit> was created without expected prop 'pageCapacity'");
    		}

    		if (/*autoViewport*/ ctx[6] === undefined && !("autoViewport" in props)) {
    			console.warn("<Transit> was created without expected prop 'autoViewport'");
    		}

    		if (/*selectFirstResult*/ ctx[7] === undefined && !("selectFirstResult" in props)) {
    			console.warn("<Transit> was created without expected prop 'selectFirstResult'");
    		}

    		if (/*highlightMode*/ ctx[8] === undefined && !("highlightMode" in props)) {
    			console.warn("<Transit> was created without expected prop 'highlightMode'");
    		}
    	}

    	get location() {
    		throw new Error("<Transit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<Transit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get start() {
    		throw new Error("<Transit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set start(value) {
    		throw new Error("<Transit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get end() {
    		throw new Error("<Transit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set end(value) {
    		throw new Error("<Transit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get panel() {
    		throw new Error("<Transit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set panel(value) {
    		throw new Error("<Transit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get policy() {
    		throw new Error("<Transit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set policy(value) {
    		throw new Error("<Transit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pageCapacity() {
    		throw new Error("<Transit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pageCapacity(value) {
    		throw new Error("<Transit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get autoViewport() {
    		throw new Error("<Transit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set autoViewport(value) {
    		throw new Error("<Transit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selectFirstResult() {
    		throw new Error("<Transit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectFirstResult(value) {
    		throw new Error("<Transit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get highlightMode() {
    		throw new Error("<Transit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set highlightMode(value) {
    		throw new Error("<Transit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\search\Walking.svelte generated by Svelte v3.24.1 */

    function create_fragment$d(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	const { getMap, getBdMap } = getContext(contextKey);
    	const map = getMap();
    	const bdmap = getBdMap();
    	let { location } = $$props; // {Object|String}
    	let { start } = $$props; // {Object|String}
    	let { end } = $$props; // {Object|String}
    	let { panel } = $$props; // {String|HTMLElement}
    	let { autoViewport } = $$props; // Boolean
    	let { selectFirstResult } = $$props; // Boolean  
    	let { highlightMode } = $$props;
    	let originInstance;

    	function search(start, end) {
    		originInstance.search(start, end);
    	}

    	onMount(async () => {
    		const _location = location
    		? isPoint(location)
    			? createPoint(bdmap, location)
    			: location
    		: map;

    		const route = originInstance = new bdmap.WalkingRoute(_location,
    		{
    				renderOptions: {
    					map,
    					panel,
    					selectFirstResult,
    					autoViewport,
    					highlightMode
    				},
    				onSearchComplete(e) {
    					if (originInstance && originInstance !== route) {
    						originInstance.clearResults();
    					}

    					dispatch("searchcomplete", e);
    				},
    				onMarkersSet(e) {
    					dispatch("markersset", e);
    				},
    				onInfoHtmlSet(e) {
    					dispatch("infohtmlset", e);
    				},
    				onPolylinesSet(e) {
    					dispatch("polylinesset", e);
    				},
    				onResultsHtmlSet(e) {
    					dispatch("resultshtmlset", e);
    				}
    			});

    		search(isPoint(start) ? createPoint(bdmap, start) : start, isPoint(end) ? createPoint(bdmap, end) : end);
    	});

    	const writable_props = [
    		"location",
    		"start",
    		"end",
    		"panel",
    		"autoViewport",
    		"selectFirstResult",
    		"highlightMode"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Walking> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Walking", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    		if ("start" in $$props) $$invalidate(1, start = $$props.start);
    		if ("end" in $$props) $$invalidate(2, end = $$props.end);
    		if ("panel" in $$props) $$invalidate(3, panel = $$props.panel);
    		if ("autoViewport" in $$props) $$invalidate(4, autoViewport = $$props.autoViewport);
    		if ("selectFirstResult" in $$props) $$invalidate(5, selectFirstResult = $$props.selectFirstResult);
    		if ("highlightMode" in $$props) $$invalidate(6, highlightMode = $$props.highlightMode);
    	};

    	$$self.$capture_state = () => ({
    		createPoint,
    		isPoint,
    		getPosition,
    		onMount,
    		createEventDispatcher,
    		getContext,
    		contextKey,
    		dispatch,
    		getMap,
    		getBdMap,
    		map,
    		bdmap,
    		location,
    		start,
    		end,
    		panel,
    		autoViewport,
    		selectFirstResult,
    		highlightMode,
    		originInstance,
    		search
    	});

    	$$self.$inject_state = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    		if ("start" in $$props) $$invalidate(1, start = $$props.start);
    		if ("end" in $$props) $$invalidate(2, end = $$props.end);
    		if ("panel" in $$props) $$invalidate(3, panel = $$props.panel);
    		if ("autoViewport" in $$props) $$invalidate(4, autoViewport = $$props.autoViewport);
    		if ("selectFirstResult" in $$props) $$invalidate(5, selectFirstResult = $$props.selectFirstResult);
    		if ("highlightMode" in $$props) $$invalidate(6, highlightMode = $$props.highlightMode);
    		if ("originInstance" in $$props) originInstance = $$props.originInstance;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [location, start, end, panel, autoViewport, selectFirstResult, highlightMode];
    }

    class Walking extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {
    			location: 0,
    			start: 1,
    			end: 2,
    			panel: 3,
    			autoViewport: 4,
    			selectFirstResult: 5,
    			highlightMode: 6
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Walking",
    			options,
    			id: create_fragment$d.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*location*/ ctx[0] === undefined && !("location" in props)) {
    			console.warn("<Walking> was created without expected prop 'location'");
    		}

    		if (/*start*/ ctx[1] === undefined && !("start" in props)) {
    			console.warn("<Walking> was created without expected prop 'start'");
    		}

    		if (/*end*/ ctx[2] === undefined && !("end" in props)) {
    			console.warn("<Walking> was created without expected prop 'end'");
    		}

    		if (/*panel*/ ctx[3] === undefined && !("panel" in props)) {
    			console.warn("<Walking> was created without expected prop 'panel'");
    		}

    		if (/*autoViewport*/ ctx[4] === undefined && !("autoViewport" in props)) {
    			console.warn("<Walking> was created without expected prop 'autoViewport'");
    		}

    		if (/*selectFirstResult*/ ctx[5] === undefined && !("selectFirstResult" in props)) {
    			console.warn("<Walking> was created without expected prop 'selectFirstResult'");
    		}

    		if (/*highlightMode*/ ctx[6] === undefined && !("highlightMode" in props)) {
    			console.warn("<Walking> was created without expected prop 'highlightMode'");
    		}
    	}

    	get location() {
    		throw new Error("<Walking>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<Walking>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get start() {
    		throw new Error("<Walking>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set start(value) {
    		throw new Error("<Walking>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get end() {
    		throw new Error("<Walking>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set end(value) {
    		throw new Error("<Walking>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get panel() {
    		throw new Error("<Walking>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set panel(value) {
    		throw new Error("<Walking>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get autoViewport() {
    		throw new Error("<Walking>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set autoViewport(value) {
    		throw new Error("<Walking>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selectFirstResult() {
    		throw new Error("<Walking>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectFirstResult(value) {
    		throw new Error("<Walking>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get highlightMode() {
    		throw new Error("<Walking>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set highlightMode(value) {
    		throw new Error("<Walking>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var data = {
      "data": [[74.438, 39.006, 1], [74.932, 38.382, 1], [75.402, 37.879, 1], [75.24, 38.777, 1], [75.264, 39.656, 1], [75.547, 37.826, 1], [75.769, 39.345, 1], [76.073, 38.162, 1], [76.154, 39.673, 1], [77.139, 37.549, 1], [76.821, 39.37, 1], [77.094, 40.11, 1], [77.363, 38.011, 1], [77.201, 39.44, 1], [77.921, 37.257, 1], [77.75, 37.929, 1], [77.835, 39.3, 1], [77.718, 39.828, 1], [77.975, 40.858, 1], [78.085, 36.315, 1], [78.266, 37.584, 1], [78.558, 37.505, 1], [78.449, 40.946, 1], [79.191, 32.206, 1], [78.918, 37.314, 1], [79.066, 39.855, 1], [79.057, 40.704, 1], [79.185, 41.198, 1], [79.562, 31.931, 1], [79.317, 37.236, 1], [79.523, 37.417, 1], [79.287, 39.963, 1], [79.364, 40.476, 1], [79.312, 41.245, 1], [79.952, 33.571, 1], [79.903, 37.101, 1], [79.871, 37.181, 1], [79.855, 40.643, 1], [79.826, 41.16, 1], [79.723, 41.742, 1], [80.155, 34.754, 1], [80.003, 36.382, 1], [80.167, 37.109, 1], [80.073, 40.379, 1], [80.26, 41.402, 1], [80.725, 36.501, 1], [80.483, 37.063, 1], [80.387, 40.384, 1], [80.563, 40.696, 1], [80.622, 42.697, 1], [80.643, 43.688, 1], [80.598, 44.183, 1], [80.951, 38.439, 1], [80.956, 40.541, 1], [80.838, 41.418, 1], [80.949, 42.104, 1], [81.075, 43.135, 1], [80.912, 44.03, 1], [81.039, 44.93, 1], [81.299, 30.957, 1], [81.327, 31.105, 1], [81.149, 32.395, 1], [81.37, 36.907, 1], [81.345, 41.78, 1], [81.269, 43.106, 1], [81.302, 43.928, 1], [81.348, 44.541, 1], [81.438, 45.011, 1], [81.66, 40.655, 1], [81.643, 42.989, 1], [81.742, 43.95, 1], [81.712, 44.996, 1], [82.005, 36.441, 1], [81.98, 40.743, 1], [82.049, 41.726, 1], [82.137, 42.006, 1], [82.161, 43.474, 1], [82.078, 43.776, 1], [82.477, 30.585, 1], [82.337, 43.381, 1], [82.495, 43.712, 1], [82.421, 44.739, 1], [82.567, 45.182, 1], [82.707, 37.073, 1], [82.885, 37.518, 1], [82.894, 39.569, 1], [82.993, 42.238, 1], [82.804, 43.537, 1], [82.864, 44.608, 1], [82.801, 45.652, 1], [82.96, 46.211, 1], [82.985, 46.747, 1], [83.254, 38.49, 1], [83.063, 41.687, 1], [83.254, 43.816, 1], [83.176, 46.004, 1], [83.08, 46.734, 1], [83.61, 29.958, 1], [83.536, 32.91, 1], [83.648, 39.003, 1], [83.682, 40.807, 1], [83.581, 41.801, 1], [83.493, 43.448, 1], [83.577, 44.551, 1], [83.593, 45.906, 1], [83.625, 46.438, 1], [83.626, 46.78, 1], [84.029, 29.76, 1], [84.069, 32.307, 1], [83.83, 39.27, 1], [83.964, 41.317, 1], [84.022, 41.812, 1], [83.805, 42.925, 1], [83.91, 43.423, 1], [83.868, 45.525, 1], [83.879, 46.727, 1], [84.153, 37.76, 1], [84.251, 41.77, 1], [84.2, 42.807, 1], [84.258, 43.393, 1], [84.232, 44.387, 1], [84.343, 45.038, 1], [84.224, 46.759, 1], [84.529, 37.144, 1], [84.594, 41.999, 1], [84.683, 43.279, 1], [84.568, 44.31, 1], [84.648, 45.745, 1], [84.494, 46.242, 1], [85.084, 31.357, 1], [84.887, 32.101, 1], [84.854, 41.645, 1], [84.912, 41.998, 1], [84.969, 43.157, 1], [84.952, 43.768, 1], [84.904, 44.433, 1], [84.899, 45.583, 1], [85.113, 45.709, 1], [85.306, 28.858, 1], [85.24, 29.339, 1], [85.152, 30.578, 1], [85.275, 37.214, 1], [85.35, 40.964, 1], [85.35, 41.972, 1], [85.215, 43.246, 1], [85.302, 45.016, 1], [85.169, 45.716, 1], [85.69, 29.992, 1], [85.692, 37.746, 1], [85.544, 38.172, 1], [85.611, 41.841, 1], [85.549, 42.354, 1], [85.563, 43.251, 1], [85.635, 44.316, 1], [85.613, 44.706, 1], [85.557, 46.013, 1], [85.718, 46.368, 1], [85.654, 47.409, 1], [85.793, 47.998, 1], [85.859, 28.668, 1], [86.135, 30.734, 1], [85.988, 41.599, 1], [86.139, 41.785, 1], [85.906, 44.247, 1], [86.055, 44.326, 2], [86.081, 45.124, 1], [86.005, 46.491, 1], [85.895, 47.4, 1], [86.091, 47.896, 1], [86.322, 28.953, 1], [86.415, 30.953, 1], [86.399, 38.614, 1], [86.257, 41.386, 1], [86.197, 41.772, 1], [86.382, 42.361, 1], [86.337, 43.85, 1], [86.299, 44.342, 1], [86.28, 44.899, 1], [86.353, 46.29, 1], [86.268, 47.814, 1], [86.413, 48.08, 1], [86.617, 28.583, 1], [86.749, 31.536, 1], [86.583, 41.188, 1], [86.596, 42.049, 1], [86.578, 43.789, 1], [86.688, 44.573, 1], [86.604, 46.629, 1], [86.669, 47.166, 1], [86.653, 48.195, 1], [86.785, 48.702, 1], [87.089, 28.635, 1], [87.002, 40.877, 1], [86.967, 41.895, 1], [87.005, 42.998, 1], [86.944, 44.153, 1], [87.02, 44.491, 1], [86.881, 45.679, 1], [86.851, 47.538, 1], [86.89, 47.75, 1], [87.044, 48.645, 1], [87.272, 28.805, 1], [87.425, 29.054, 1], [87.245, 31.791, 1], [87.36, 38.693, 1], [87.211, 40.821, 1], [87.312, 42.203, 1], [87.341, 43.076, 1], [87.385, 44.177, 1], [87.42, 47.076, 1], [87.411, 47.382, 1], [87.748, 28.372, 1], [87.643, 29.091, 1], [87.618, 42.229, 1], [87.558, 42.96, 1], [87.594, 43.822, 2], [87.629, 43.985, 2], [87.675, 47.285, 1], [87.756, 48.003, 1], [87.835, 28.615, 1], [87.987, 30.238, 1], [87.831, 40.669, 1], [87.899, 42.824, 1], [87.991, 43.426, 1], [87.976, 44.144, 1], [87.896, 45.279, 1], [87.852, 47.337, 1], [87.989, 47.755, 1], [88.332, 29.187, 1], [88.24, 29.462, 1], [88.188, 39.03, 1], [88.302, 42.247, 1], [88.315, 43.201, 1], [88.259, 43.982, 1], [88.392, 44.132, 1], [88.355, 46.857, 1], [88.527, 28.278, 1], [88.686, 29.41, 1], [88.637, 30.635, 1], [88.716, 30.934, 1], [88.55, 39.03, 1], [88.546, 42.348, 1], [88.633, 42.84, 1], [88.616, 43.291, 1], [88.603, 44.128, 1], [88.505, 47.231, 1], [88.789, 28.207, 1], [88.896, 29.272, 1], [88.829, 29.976, 1], [89.02, 31.408, 1], [88.919, 39.242, 1], [89.014, 42.687, 1], [88.951, 43.07, 1], [88.985, 43.983, 1], [89.042, 44.801, 1], [89.313, 28.158, 1], [89.245, 29.313, 1], [89.199, 42.967, 1], [89.193, 44.007, 1], [89.158, 44.767, 1], [89.31, 45.129, 1], [89.676, 28.596, 1], [89.599, 28.96, 1], [89.634, 29.601, 1], [89.626, 42.858, 1], [89.58, 43.962, 1], [89.5, 45.303, 1], [89.532, 46.09, 1], [89.544, 46.349, 1], [89.878, 29.144, 1], [89.994, 29.344, 1], [90.02, 31.409, 1], [89.886, 31.964, 1], [89.999, 41.834, 1], [89.863, 42.807, 1], [89.833, 43.566, 1], [89.888, 43.958, 1], [90.218, 29.01, 1], [90.215, 29.38, 1], [90.22, 38.502, 1], [90.23, 39.047, 1], [90.135, 42.669, 1], [90.225, 42.897, 1], [90.266, 43.887, 1], [90.131, 45.207, 1], [90.41, 28.943, 1], [90.567, 29.216, 1], [90.495, 29.999, 1], [90.438, 41.498, 1], [90.455, 41.984, 1], [90.505, 43.083, 1], [90.439, 43.855, 1], [90.373, 44.557, 1], [90.426, 45.095, 1], [90.889, 28.331, 1], [90.842, 29.343, 1], [90.829, 29.872, 1], [90.907, 30.754, 1], [90.871, 38.26, 1], [90.881, 40.484, 1], [90.8, 41.935, 1], [90.765, 42.997, 1], [90.84, 43.251, 1], [90.957, 44.86, 1], [91.116, 29.661, 1], [91.091, 36.797, 1], [90.979, 38.059, 1], [91.128, 41.798, 1], [91.176, 42.701, 1], [91.132, 43.234, 1], [91.054, 44.462, 1], [90.965, 44.862, 1], [91.478, 28.445, 1], [91.342, 29.247, 1], [91.331, 29.752, 1], [91.424, 30.572, 1], [91.559, 32.042, 1], [91.491, 32.65, 1], [91.562, 34, 1], [91.352, 37.924, 1], [91.43, 38.382, 1], [91.485, 43.362, 1], [91.55, 43.737, 1], [91.755, 27.815, 1], [91.674, 29.098, 1], [91.753, 29.428, 1], [91.657, 30.586, 1], [91.743, 31.973, 1], [91.713, 32.31, 1], [91.858, 41.646, 1], [91.747, 44.183, 1], [91.97, 29.55, 1], [92.008, 30.173, 1], [92.063, 31.48, 1], [92.106, 32.225, 1], [91.953, 33.045, 1], [91.958, 42.604, 1], [92.082, 43.278, 1], [91.91, 44.36, 1], [92.243, 28.429, 1], [92.225, 29.252, 1], [92.355, 29.844, 1], [92.373, 30.67, 1], [92.361, 31.473, 1], [92.306, 32.111, 1], [92.255, 33.809, 1], [92.409, 34.167, 1], [92.244, 37.135, 1], [92.209, 43.202, 1], [92.576, 29.144, 1], [92.564, 29.889, 1], [92.565, 30.81, 1], [92.65, 32.205, 1], [92.541, 34.309, 1], [92.517, 37.265, 1], [92.611, 42.132, 1], [92.656, 43.163, 1], [92.611, 43.673, 1], [92.8, 28.429, 1], [92.813, 28.882, 1], [92.857, 29.881, 1], [92.849, 34.682, 1], [93.034, 38.576, 1], [92.943, 42.742, 1], [92.988, 43.645, 1], [92.943, 44.264, 1], [93.087, 28.983, 1], [93.251, 29.894, 1], [93.242, 30.647, 1], [93.146, 35.265, 1], [93.215, 36.604, 1], [93.037, 38.57, 1], [93.194, 42.818, 1], [93.17, 44.098, 1], [93.377, 29.013, 1], [93.458, 29.135, 1], [93.47, 29.896, 1], [93.397, 30.623, 1], [93.445, 36.668, 1], [93.345, 38.672, 1], [93.432, 42.581, 1], [93.514, 42.852, 1], [93.425, 43.706, 1], [93.765, 29.13, 1], [93.712, 29.852, 1], [93.762, 32.026, 1], [93.752, 39.616, 1], [93.811, 42.139, 1], [93.696, 42.886, 1], [93.745, 43.321, 1], [94.073, 29.234, 1], [94.002, 29.805, 1], [94.082, 31.919, 1], [94.155, 35.729, 1], [94.079, 37.446, 1], [94.123, 38.202, 1], [94.008, 41.267, 1], [94.046, 42.239, 1], [94.262, 29.247, 1], [94.367, 29.655, 1], [94.243, 31.865, 1], [94.29, 35.747, 1], [94.349, 36.249, 1], [94.314, 38.338, 1], [94.308, 39.232, 1], [94.353, 39.674, 1], [94.395, 41.91, 1], [94.236, 42.455, 1], [94.298, 43.338, 1], [94.65, 29.591, 1], [94.699, 30.934, 1], [94.5, 31.78, 1], [94.674, 35.927, 1], [94.598, 36.486, 1], [94.595, 38.031, 1], [94.686, 39.6, 1], [94.654, 40.145, 1], [94.575, 42.429, 1], [94.68, 43.251, 1], [94.867, 29.583, 1], [94.835, 29.958, 1], [94.958, 31.917, 1], [94.953, 34.854, 1], [94.91, 36.408, 1], [94.902, 38.052, 1], [94.804, 40.169, 1], [94.809, 42.242, 1], [94.822, 42.798, 1], [94.858, 43.468, 1], [95.178, 29.248, 1], [95.146, 31.594, 1], [95.275, 32.89, 1], [95.248, 33.709, 1], [95.06, 34.781, 1], [95.114, 36.414, 1], [95.224, 36.767, 1], [95.098, 37.962, 1], [95.233, 39.414, 1], [95.107, 40.674, 1], [95.165, 41.152, 1], [95.364, 29.46, 1], [95.504, 30.076, 1], [95.522, 31.455, 1], [95.327, 32.883, 1], [95.435, 33.814, 1], [95.412, 36.348, 1], [95.424, 36.804, 1], [95.398, 37.758, 1], [95.546, 40.413, 1], [95.484, 41.09, 1], [95.343, 42.596, 1], [95.36, 43.024, 1], [95.773, 29.864, 1], [95.83, 30.748, 1], [95.618, 31.405, 1], [95.594, 32.313, 1], [95.706, 37.442, 1], [95.82, 39.141, 1], [95.768, 40.473, 1], [95.777, 40.545, 1], [95.737, 42.218, 1], [95.783, 43.009, 1], [96.05, 30.123, 1], [95.98, 31.23, 1], [95.99, 32.55, 1], [95.857, 32.945, 1], [95.896, 36.266, 1], [95.891, 37.366, 1], [95.963, 40.277, 1], [95.946, 40.73, 1], [95.947, 41.416, 1], [96.067, 42.156, 1], [95.885, 42.705, 1], [96.186, 29.697, 1], [96.283, 30.86, 1], [96.295, 31.813, 1], [96.161, 32.571, 1], [96.249, 33.561, 1], [96.305, 36.413, 1], [96.354, 37.445, 1], [96.237, 40.669, 1], [96.535, 29.499, 1], [96.467, 31.103, 1], [96.609, 31.221, 1], [96.458, 32.228, 1], [96.559, 32.677, 1], [96.414, 33.819, 1], [96.529, 33.902, 1], [96.451, 36.43, 1], [96.521, 40.538, 1], [96.713, 29.792, 1], [96.861, 31.115, 1], [96.843, 32.046, 1], [96.661, 32.705, 1], [96.758, 33.776, 1], [96.767, 37.344, 1], [96.786, 39.861, 1], [96.794, 40.463, 1], [96.835, 40.766, 1], [97.024, 28.505, 1], [97.154, 30.505, 1], [97.149, 31.149, 1], [96.96, 32.063, 1], [97.064, 32.873, 1], [97.147, 33.81, 1], [96.986, 36.255, 1], [97.048, 40.293, 1], [96.981, 40.489, 1], [97.387, 28.62, 1], [97.285, 29.098, 1], [97.308, 30.324, 1], [97.197, 31.131, 1], [97.222, 31.545, 1], [97.302, 33.248, 1], [97.205, 35.54, 1], [97.435, 36.082, 1], [97.44, 36.644, 1], [97.379, 37.493, 1], [97.354, 40.085, 1], [97.349, 40.247, 1], [97.678, 24.079, 1], [97.473, 28.668, 1], [97.565, 30.755, 1], [97.497, 31.357, 1], [97.512, 33.256, 1], [97.652, 34.117, 1], [97.508, 36.345, 1], [97.578, 39.856, 1], [97.622, 40.348, 1], [97.85, 24.091, 2], [97.938, 24.529, 1], [97.804, 28.643, 1], [97.834, 29.69, 1], [97.807, 30.572, 1], [97.786, 31.366, 1], [97.89, 34.329, 1], [97.873, 36.02, 1], [97.838, 36.77, 1], [97.916, 39.485, 1], [97.795, 40.179, 1], [97.703, 41.115, 1], [98.068, 24.149, 1], [98.069, 24.686, 1], [98.161, 29.464, 1], [98.042, 29.865, 1], [97.981, 30.576, 1], [98.104, 31.374, 1], [98.056, 31.887, 1], [98.109, 32.984, 1], [98.196, 34.883, 1], [98.099, 36.277, 1], [98.119, 36.459, 1], [98.005, 39.212, 1], [98.125, 39.848, 1], [98.288, 24.21, 1], [98.353, 24.625, 1], [98.426, 25.121, 1], [98.302, 27.737, 1], [98.362, 29.632, 1], [98.278, 30.864, 1], [98.24, 31.307, 1], [98.399, 31.881, 1], [98.223, 34.923, 1], [98.276, 35.826, 1], [98.248, 36.631, 1], [98.357, 36.975, 1], [98.431, 38.812, 1], [98.297, 39.787, 1], [98.411, 42.279, 1], [98.575, 24.141, 1], [98.6, 24.47, 2], [98.532, 25.082, 2], [98.633, 25.654, 1], [98.648, 26.164, 1], [98.673, 27.799, 1], [98.628, 29.018, 1], [98.592, 29.691, 1], [98.509, 30.511, 1], [98.577, 31.289, 1], [98.59, 31.822, 1], [98.683, 32.874, 1], [98.654, 35.387, 1], [98.617, 36.516, 1], [98.488, 36.939, 1], [98.723, 37.711, 1], [98.965, 23.939, 1], [98.856, 24.48, 1], [98.865, 25.807, 1], [98.878, 26.996, 1], [98.853, 27.627, 1], [98.901, 28.418, 1], [98.983, 28.973, 1], [98.981, 29.732, 1], [98.835, 31.196, 1], [98.855, 31.724, 1], [98.883, 35.122, 1], [98.872, 37, 1], [98.859, 37.46, 1], [98.89, 39.516, 1], [98.895, 40.007, 1], [99.095, 24.301, 1], [99.174, 25.073, 2], [99.152, 25.599, 1], [99.136, 26.389, 1], [99.164, 26.865, 1], [99.085, 27.589, 1], [99.139, 28.345, 1], [99.112, 28.842, 1], [99.043, 29.719, 1], [99.118, 30.015, 1], [99.007, 31.382, 1], [99.161, 31.895, 1], [99.141, 33.902, 1], [99.133, 34.94, 1], [99.085, 36.79, 1], [99.055, 37.278, 1], [99.146, 38.129, 1], [99.161, 38.746, 1], [99.072, 39.363, 1], [99.036, 40.138, 1], [99.467, 22.695, 1], [99.404, 23.545, 1], [99.33, 24.099, 1], [99.387, 26.099, 1], [99.415, 26.571, 1], [99.323, 27.297, 1], [99.377, 28.115, 1], [99.316, 28.636, 1], [99.322, 30.284, 1], [99.29, 31.9, 1], [99.454, 33.875, 1], [99.434, 34.908, 1], [99.376, 35.409, 1], [99.305, 36.664, 1], [99.299, 37.176, 1], [99.48, 38.04, 1], [99.325, 38.38, 1], [99.444, 39.294, 1], [99.446, 40.254, 1], [99.62, 22.64, 1], [99.601, 23.587, 1], [99.626, 24.134, 1], [99.621, 24.776, 1], [99.572, 25.443, 1], [99.608, 25.997, 1], [99.574, 26.622, 1], [99.633, 27.322, 1], [99.713, 27.814, 2], [99.65, 29.108, 1], [99.554, 30.288, 1], [99.73, 32.227, 1], [99.652, 33.761, 1], [99.541, 34.862, 1], [99.621, 35.811, 1], [99.605, 36.742, 1], [99.663, 36.926, 1], [99.596, 38.04, 1], [99.616, 38.565, 1], [99.614, 39.105, 1], [99.687, 39.48, 1], [99.67, 40.398, 1], [99.548, 42.084, 1], [99.803, 22.269, 1], [99.917, 22.576, 1], [99.836, 23.399, 1], [99.875, 24.014, 1], [99.905, 24.612, 1], [99.864, 25.358, 1], [99.938, 25.97, 1], [99.919, 26.5, 1], [99.902, 27.258, 1], [99.816, 27.823, 1], [99.834, 28.621, 1], [99.834, 28.975, 1], [99.817, 30.224, 1], [99.947, 31.621, 1], [99.972, 32.371, 1], [99.913, 33.947, 1], [99.897, 34.561, 1], [99.909, 35.761, 1], [99.825, 36.384, 1], [99.8, 36.959, 1], [99.966, 37.267, 1], [99.83, 39.369, 1], [99.783, 40.413, 1], [100.14, 22.029, 1], [100.11, 22.607, 1], [100.106, 23.322, 1], [100.135, 24.46, 1], [100.169, 25.321, 1], [100.191, 25.687, 2], [100.173, 26.512, 1], [100.209, 26.91, 2], [100.072, 27.71, 1], [100.149, 28.261, 1], [100.101, 29.25, 1], [100.221, 29.763, 1], [100.104, 30.465, 1], [100.18, 30.863, 1], [100.022, 31.632, 1], [100.077, 32.996, 1], [100.127, 33.833, 1], [100.078, 34.453, 1], [100.015, 35.639, 1], [100.051, 36.119, 1], [100.2, 36.628, 1], [100.136, 37.352, 1], [100.12, 38.231, 1], [100.102, 38.966, 1], [100.15, 39.187, 1], [100.106, 40.901, 1], [100.217, 40.991, 1], [100.211, 42.082, 1], [100.364, 22.469, 1], [100.393, 23.295, 1], [100.318, 25.158, 1], [100.292, 25.612, 2], [100.323, 26.454, 1], [100.338, 27.672, 1], [100.349, 28.533, 1], [100.281, 30.006, 1], [100.315, 30.919, 1], [100.351, 32.255, 1], [100.288, 32.823, 1], [100.286, 33.763, 1], [100.256, 34.468, 1], [100.371, 36.612, 1], [100.426, 37.277, 1], [100.279, 38.14, 1], [100.367, 38.801, 1], [100.451, 38.955, 1], [100.289, 41.076, 1], [100.624, 21.768, 1], [100.596, 22.427, 1], [100.611, 23.07, 1], [100.679, 23.567, 1], [100.572, 24.374, 1], [100.524, 25.188, 1], [100.582, 25.626, 2], [100.653, 26.77, 1], [100.657, 27.67, 1], [100.653, 27.988, 1], [100.649, 30.14, 1], [100.608, 32.559, 1], [100.557, 33.33, 1], [100.61, 34.097, 1], [100.647, 34.672, 1], [100.588, 35.259, 1], [100.565, 36.073, 1], [100.615, 36.326, 1], [100.554, 37.735, 1], [100.6, 38.567, 1], [100.539, 38.935, 1], [100.497, 41.169, 1], [100.701, 41.388, 1], [100.873, 22.17, 1], [100.902, 22.775, 1], [100.85, 24.393, 1], [100.878, 24.907, 1], [100.797, 25.475, 1], [100.822, 26.078, 1], [100.77, 26.697, 1], [100.909, 28.104, 1], [100.891, 28.697, 1], [100.758, 31.585, 1], [100.823, 31.896, 1], [100.834, 32.753, 1], [100.754, 32.965, 1], [100.884, 33.804, 1], [100.864, 34.738, 1], [100.827, 35.146, 1], [100.79, 35.637, 1], [100.855, 36.305, 1], [100.892, 36.943, 1], [100.742, 37.697, 1], [100.829, 38.439, 1], [100.844, 38.817, 1], [101.035, 21.87, 1], [101.066, 22.277, 1], [101, 22.819, 2], [101.133, 23.47, 1], [101.094, 24.104, 1], [101.115, 24.79, 1], [101.123, 25.341, 1], [101.085, 25.901, 1], [101.115, 26.571, 1], [101.067, 27.401, 1], [101.086, 27.989, 1], [101.035, 30.683, 1], [101.129, 30.987, 1], [101.2, 31.815, 1], [100.985, 33.433, 1], [101.156, 34.487, 1], [101.109, 35.717, 1], [101.115, 36.44, 1], [101.109, 38.15, 1], [101.102, 38.773, 1], [100.973, 39.478, 1], [101.073, 41.967, 1], [101.307, 21.986, 1], [101.309, 22.83, 1], [101.362, 23.383, 1], [101.263, 24.698, 1], [101.293, 25.293, 1], [101.331, 25.753, 1], [101.284, 27.937, 1], [101.243, 28.546, 1], [101.341, 29.826, 1], [101.406, 30.061, 1], [101.271, 30.854, 1], [101.439, 31.764, 1], [101.293, 34.983, 1], [101.423, 36.035, 1], [101.299, 36.68, 1], [101.399, 37.421, 1], [101.34, 38.134, 1], [101.326, 38.634, 1], [101.396, 39.521, 1], [101.405, 40.662, 1], [101.324, 42.05, 1], [101.518, 22.107, 1], [101.56, 22.608, 1], [101.64, 23.422, 1], [101.587, 24.039, 1], [101.615, 24.72, 1], [101.557, 25.067, 2], [101.641, 25.955, 1], [101.522, 27.326, 1], [101.592, 27.484, 1], [101.643, 28.254, 1], [101.565, 29.848, 1], [101.522, 30.141, 1], [101.688, 30.784, 1], [101.605, 31.803, 1], [101.621, 32.99, 1], [101.492, 33.407, 1], [101.566, 34.212, 1], [101.561, 34.875, 1], [101.545, 36.061, 1], [101.583, 36.614, 1], [101.64, 37.095, 1], [101.59, 38.467, 1], [101.627, 39.58, 1], [101.864, 22.599, 1], [101.747, 23.396, 1], [101.781, 23.859, 1], [101.819, 24.607, 1], [101.811, 25.131, 1], [101.849, 25.747, 1], [101.745, 26.552, 2], [101.826, 28.259, 1], [101.802, 28.762, 1], [101.892, 30.89, 1], [101.888, 31.124, 1], [101.727, 31.919, 1], [101.714, 32.908, 1], [101.927, 33.462, 1], [101.808, 33.859, 1], [101.839, 35.204, 1], [101.833, 36.086, 1], [101.752, 36.932, 1], [101.885, 37.423, 1], [101.759, 38.912, 1], [101.85, 41.941, 1], [102.019, 23.13, 1], [102.006, 23.838, 1], [102.084, 24.549, 1], [102.083, 25.094, 1], [102.058, 25.646, 1], [102.004, 26.436, 1], [102.09, 26.891, 1], [102.102, 27.559, 1], [102.111, 28.131, 1], [102.115, 29.63, 1], [101.976, 30.053, 1], [102.052, 30.725, 1], [102.076, 31.452, 1], [102.065, 31.918, 1], [102.044, 32.774, 1], [101.962, 33.405, 1], [102.081, 33.997, 1], [102.144, 34.497, 1], [101.951, 35.429, 1], [102.03, 35.698, 1], [102.066, 36.418, 1], [101.984, 36.841, 1], [102.045, 37.593, 1], [102.035, 38.305, 1], [102.127, 38.614, 1], [102.298, 23.817, 1], [102.304, 24.93, 1], [102.295, 25.484, 1], [102.275, 26.327, 1], [102.251, 26.729, 1], [102.209, 27.516, 1], [102.338, 29.282, 1], [102.227, 29.985, 1], [102.285, 30.417, 1], [102.366, 31.002, 1], [102.231, 31.905, 1], [102.358, 32.558, 1], [102.229, 33.053, 1], [102.199, 34.028, 1], [102.241, 34.233, 1], [102.256, 35.198, 1], [102.25, 35.57, 1], [102.265, 36.166, 1], [102.373, 36.493, 1], [102.229, 37.162, 1], [102.319, 38.125, 1], [102.174, 41.904, 1], [102.461, 23.035, 1], [102.487, 23.643, 1], [102.526, 24.872, 3], [102.478, 25.45, 2], [102.557, 26.208, 1], [102.573, 26.621, 1], [102.456, 28.223, 1], [102.522, 28.614, 1], [102.545, 29.291, 1], [102.58, 29.585, 1], [102.455, 31.122, 1], [102.493, 31.797, 1], [102.556, 32.118, 1], [102.563, 32.875, 1], [102.481, 33.586, 1], [102.555, 34.728, 1], [102.525, 35.22, 1], [102.444, 36.49, 1], [102.605, 37.956, 1], [102.555, 38.361, 1], [102.433, 41.996, 1], [102.754, 23.037, 1], [102.822, 23.579, 2], [102.758, 24.176, 2], [102.737, 25.003, 3], [102.747, 25.114, 3], [102.779, 25.959, 1], [102.759, 27.08, 1], [102.824, 27.852, 1], [102.653, 28.517, 1], [102.708, 29.202, 1], [102.793, 29.743, 1], [102.796, 30.157, 1], [102.787, 30.907, 1], [102.807, 31.655, 1], [102.692, 32.912, 1], [102.856, 33.542, 1], [102.701, 34.088, 1], [102.733, 34.738, 1], [102.77, 35.274, 1], [102.791, 35.915, 1], [102.827, 36.357, 1], [102.758, 37.115, 1], [102.68, 37.895, 1], [102.749, 38.206, 1], [102.722, 39.232, 1], [102.779, 39.409, 1], [103.019, 22.819, 1], [102.945, 23.594, 1], [102.949, 24.157, 1], [102.941, 24.775, 2], [102.962, 25.828, 1], [103.004, 26.409, 1], [102.938, 27.051, 1], [103.022, 28.26, 1], [102.963, 29.198, 1], [103.034, 29.504, 1], [103.002, 30.04, 2], [102.898, 30.845, 1], [102.987, 31.454, 1], [102.973, 33.545, 1], [102.965, 33.797, 1], [102.927, 35.035, 1], [102.973, 35.626, 1], [102.944, 37.574, 1], [102.91, 38.472, 1], [103.089, 38.623, 1], [103.218, 22.831, 1], [103.215, 23.41, 2], [103.246, 23.782, 2], [103.245, 24.757, 1], [103.173, 25.084, 2], [103.226, 25.807, 2], [103.266, 26.406, 1], [103.262, 27.609, 1], [103.151, 28.328, 1], [103.226, 29.08, 1], [103.251, 29.495, 1], [103.196, 30.097, 2], [103.195, 31.451, 1], [103.237, 32.101, 1], [103.226, 34.027, 1], [103.178, 34.499, 1], [103.229, 34.812, 1], [103.215, 35.598, 2], [103.297, 36.006, 1], [103.223, 36.829, 1], [103.194, 37.595, 1], [103.214, 38.145, 1], [103.143, 38.633, 1], [103.401, 23.371, 2], [103.403, 24.002, 1], [103.436, 24.418, 2], [103.434, 25.714, 1], [103.447, 27.033, 1], [103.52, 27.309, 1], [103.514, 28.055, 1], [103.543, 28.835, 1], [103.497, 29.553, 2], [103.447, 30.026, 2], [103.499, 30.517, 2], [103.478, 31.055, 1], [103.449, 31.708, 1], [103.425, 32.53, 1], [103.418, 32.949, 1], [103.438, 34.664, 1], [103.405, 35.513, 1], [103.422, 36.613, 1], [103.358, 38.904, 1], [103.453, 38.976, 1], [103.549, 39.833, 1], [103.663, 22.803, 1], [103.691, 23.104, 1], [103.707, 23.792, 1], [103.732, 24.538, 2], [103.709, 25.51, 2], [103.656, 26.26, 1], [103.644, 28.196, 1], [103.679, 28.686, 1], [103.667, 29.437, 1], [103.718, 29.671, 3], [103.66, 30.97, 2], [103.627, 31.571, 1], [103.649, 32.492, 1], [103.773, 33.264, 1], [103.727, 33.951, 1], [103.653, 34.701, 1], [103.669, 35.428, 1], [103.664, 36.532, 1], [103.644, 38.936, 1], [103.709, 39.919, 1], [103.855, 22.724, 1], [103.872, 23.034, 1], [103.896, 23.664, 1], [103.887, 24.389, 1], [103.82, 25.511, 3], [103.932, 26.089, 1], [103.921, 26.684, 1], [103.875, 27.293, 1], [103.934, 28.582, 1], [103.906, 29.224, 2], [103.854, 29.989, 2], [103.922, 30.557, 3], [103.951, 30.784, 3], [103.879, 31.6, 1], [104.01, 32.053, 1], [103.904, 33.254, 1], [103.917, 33.994, 1], [103.924, 34.557, 1], [103.873, 35.359, 1], [103.86, 36.056, 3], [103.945, 37.159, 1], [103.898, 37.561, 1], [103.874, 40.017, 1], [104.138, 23.026, 1], [104.199, 23.447, 1], [104.164, 24.099, 1], [104.089, 24.825, 1], [104.117, 25.414, 1], [104.128, 26.639, 1], [104.144, 27.176, 1], [104.091, 27.736, 1], [104.158, 28.434, 1], [104.108, 29.677, 2], [104.083, 30.464, 3], [104.093, 30.7, 3], [104.179, 31.332, 2], [104.171, 31.972, 1], [104.182, 32.608, 1], [104.215, 33.284, 1], [104.061, 33.897, 1], [104.073, 34.464, 1], [104.176, 35.131, 1], [104.124, 35.92, 2], [104.163, 40.408, 1], [104.13, 41.252, 1], [104.388, 23.023, 1], [104.286, 23.431, 2], [104.34, 24.059, 1], [104.32, 24.874, 2], [104.321, 25.787, 1], [104.305, 26.791, 2], [104.324, 26.969, 2], [104.348, 28.42, 1], [104.374, 28.853, 2], [104.382, 29.573, 2], [104.356, 30.169, 2], [104.384, 31.185, 3], [104.43, 31.702, 1], [104.335, 32.546, 1], [104.285, 33.236, 1], [104.333, 34.277, 1], [104.381, 35.018, 1], [104.341, 37.231, 1], [104.295, 40.246, 1], [104.263, 41.113, 1], [104.595, 23.016, 1], [104.604, 23.385, 1], [104.627, 23.971, 1], [104.545, 25.812, 2], [104.564, 26.498, 1], [104.594, 26.993, 1], [104.586, 27.643, 1], [104.553, 28.268, 2], [104.614, 28.769, 3], [104.627, 30.109, 2], [104.56, 30.542, 2], [104.589, 31.679, 1], [104.552, 32.404, 1], [104.649, 32.982, 1], [104.599, 33.657, 1], [104.604, 34.112, 1], [104.624, 34.964, 1], [104.614, 35.577, 2], [104.598, 35.895, 1], [104.656, 36.605, 1], [104.526, 37.389, 1], [104.563, 40.175, 1], [104.752, 23.248, 1], [104.809, 23.882, 1], [104.793, 24.565, 1], [104.877, 25.118, 2], [104.803, 25.813, 1], [104.852, 26.575, 3], [104.758, 27.066, 2], [104.765, 28.308, 2], [104.797, 28.727, 2], [104.827, 29.832, 2], [104.792, 30.585, 1], [104.757, 31.387, 3], [104.822, 32.305, 1], [104.83, 33.471, 1], [104.824, 34.043, 1], [104.777, 34.865, 1], [104.792, 35.292, 1], [104.808, 35.876, 1], [104.793, 36.665, 1], [104.834, 36.98, 1], [104.849, 37.779, 1], [104.833, 40.166, 1], [105.03, 23.394, 1], [104.953, 25.115, 2], [105.007, 25.693, 1], [104.983, 26.501, 1], [105.033, 26.846, 1], [105.004, 27.383, 1], [105.036, 27.918, 1], [105.009, 28.698, 2], [105.001, 29.236, 2], [105.061, 29.627, 2], [105.066, 31.082, 2], [105.023, 31.598, 1], [105.064, 32.079, 1], [105.005, 32.905, 1], [104.952, 33.393, 2], [105.05, 33.944, 1], [105.032, 34.695, 1], [105.015, 35.221, 1], [105.048, 35.747, 1], [105.011, 40.074, 1], [105.204, 23.392, 1], [105.229, 23.809, 1], [105.251, 24.471, 1], [105.213, 25.562, 2], [105.259, 26.15, 1], [105.243, 26.734, 1], [105.228, 29.705, 1], [105.287, 30.351, 2], [105.257, 30.88, 1], [105.264, 32.108, 1], [105.253, 32.692, 1], [105.242, 33.358, 1], [105.247, 34.088, 1], [105.305, 34.889, 1], [105.261, 35.701, 1], [105.232, 36.873, 1], [105.161, 38.044, 1], [105.24, 38.491, 1], [105.227, 39.825, 1], [105.322, 40.36, 1], [105.182, 40.838, 1], [105.483, 23.319, 1], [105.458, 23.709, 1], [105.467, 24.262, 1], [105.456, 25.045, 1], [105.455, 25.462, 1], [105.471, 26.188, 2], [105.455, 27.73, 2], [105.433, 28.331, 2], [105.44, 28.927, 3], [105.472, 29.573, 1], [105.468, 30.239, 2], [105.473, 32.039, 1], [105.487, 32.49, 1], [105.458, 33.391, 1], [105.485, 33.711, 1], [105.469, 34.395, 1], [105.476, 35.532, 1], [105.441, 36.031, 1], [105.484, 36.646, 1], [105.476, 37.446, 1], [105.405, 37.901, 1], [105.673, 23.253, 1], [105.64, 23.627, 1], [105.688, 24.126, 1], [105.672, 24.887, 1], [105.658, 25.407, 1], [105.7, 26.025, 2], [105.759, 26.638, 3], [105.648, 27.116, 2], [105.696, 27.701, 1], [105.705, 28.506, 1], [105.668, 28.977, 2], [105.688, 29.535, 2], [105.683, 30.167, 1], [105.624, 30.568, 2], [105.665, 31.918, 1], [105.688, 32.421, 1], [105.636, 33.234, 1], [105.722, 33.717, 1], [105.69, 34.322, 1], [105.727, 35.476, 1], [105.729, 35.973, 1], [105.665, 36.566, 1], [105.689, 37.529, 1], [105.65, 38.402, 1], [105.704, 38.847, 2], [105.763, 39.716, 1], [105.875, 23.115, 1], [105.869, 23.473, 1], [105.878, 24.123, 1], [105.832, 24.959, 1], [105.892, 25.232, 1], [105.9, 27.081, 2], [105.903, 27.603, 1], [105.858, 28.114, 1], [105.854, 30.121, 2], [105.904, 30.575, 1], [105.907, 31.077, 2], [105.965, 31.655, 2], [105.857, 32.437, 2], [105.925, 32.825, 1], [105.929, 35.319, 1], [105.887, 35.815, 1], [105.923, 36.978, 1], [105.909, 37.719, 1], [105.963, 38.755, 1], [105.979, 39.216, 1], [105.845, 40.284, 1], [106.127, 23.387, 1], [106.106, 23.976, 1], [106.12, 24.584, 1], [106.102, 25.195, 1], [106.084, 26.446, 2], [106.061, 27.013, 2], [106.15, 27.455, 1], [106.184, 28.229, 2], [106.094, 28.812, 1], [106.134, 29.299, 2], [106.097, 29.837, 2], [106.091, 30.691, 2], [106.103, 32.82, 1], [106.097, 33.805, 1], [106.105, 34.611, 1], [106.111, 35.144, 1], [106.151, 36.295, 1], [106.08, 36.748, 1], [106.095, 37.443, 1], [106.159, 38.498, 2], [106.098, 39.076, 1], [106.097, 40.676, 1], [106.094, 41.376, 1], [106.413, 23.167, 2], [106.339, 24.073, 1], [106.258, 24.319, 1], [106.303, 26.395, 2], [106.323, 26.847, 1], [106.391, 27.87, 2], [106.402, 28.651, 1], [106.298, 29.336, 3], [106.336, 29.715, 3], [106.372, 31.048, 2], [106.348, 31.44, 2], [106.315, 32.157, 1], [106.285, 32.808, 1], [106.327, 33.219, 1], [106.316, 33.894, 1], [106.328, 34.582, 1], [106.337, 35.595, 1], [106.284, 36.017, 2], [106.366, 36.755, 1], [106.315, 37.403, 1], [106.307, 38.127, 2], [106.294, 38.48, 3], [106.377, 39.006, 2], [106.44, 40.716, 1], [106.586, 22.727, 1], [106.592, 23.289, 1], [106.62, 23.898, 2], [106.574, 24.373, 1], [106.561, 24.849, 1], [106.579, 25.671, 1], [106.56, 26.26, 2], [106.601, 26.638, 3], [106.571, 27.413, 1], [106.541, 28.028, 1], [106.561, 28.523, 1], [106.536, 29.576, 3], [106.56, 30.967, 2], [106.553, 31.467, 1], [106.585, 31.94, 1], [106.559, 32.552, 1], [106.574, 33.115, 1], [106.546, 33.906, 1], [106.573, 34.389, 1], [106.623, 35.37, 1], [106.623, 35.952, 1], [106.591, 36.497, 1], [106.541, 37.291, 1], [106.568, 37.912, 1], [106.53, 38.922, 1], [106.616, 39.438, 1], [106.537, 40.567, 1], [106.536, 41.492, 1], [106.824, 22.458, 1], [106.78, 23.156, 1], [106.735, 23.807, 1], [106.754, 24.408, 1], [106.749, 25.009, 1], [106.719, 26.581, 3], [106.765, 27.274, 2], [106.832, 27.622, 2], [106.81, 28.279, 2], [106.723, 29.616, 2], [106.761, 30.302, 2], [106.771, 30.735, 1], [106.767, 31.367, 1], [106.763, 31.871, 2], [106.832, 32.357, 1], [106.718, 33.135, 2], [106.725, 34.33, 1], [106.834, 34.906, 1], [106.707, 35.497, 2], [106.788, 36.584, 1], [106.774, 37.827, 1], [106.718, 39.034, 1], [106.788, 39.547, 3], [106.825, 39.785, 1], [106.767, 40.618, 1], [106.786, 41.084, 1], [107.074, 22.142, 1], [106.91, 22.459, 1], [106.959, 23.157, 1], [106.941, 23.718, 1], [107.009, 24.403, 1], [107.03, 24.687, 1], [106.964, 25.482, 1], [106.973, 25.975, 1], [106.972, 26.499, 2], [106.974, 27.099, 2], [106.952, 28.967, 2], [106.976, 29.519, 1], [106.997, 30.089, 2], [106.966, 30.744, 2], [106.997, 31.205, 1], [106.965, 31.788, 1], [106.959, 32.32, 1], [107.023, 33.074, 3], [106.961, 33.594, 1], [106.984, 34.704, 1], [106.978, 35.32, 1], [107.001, 36.343, 1], [107.016, 36.929, 1], [106.961, 37.489, 1], [107.034, 38.025, 1], [106.965, 39.408, 2], [106.906, 39.867, 1], [107.012, 40.357, 1], [107.044, 41.033, 1], [107.002, 41.448, 1], [107.147, 22.132, 1], [107.18, 22.509, 1], [107.143, 23.605, 1], [107.232, 24.153, 1], [107.189, 24.9, 1], [107.182, 25.496, 1], [107.142, 26.048, 1], [107.168, 27.019, 1], [107.195, 27.729, 1], [107.199, 28.001, 1], [107.125, 29.23, 2], [107.17, 29.896, 2], [107.176, 32.197, 1], [107.159, 33.067, 1], [107.14, 34.09, 1], [107.176, 34.382, 3], [107.214, 35.718, 1], [107.191, 36.239, 1], [107.202, 37.456, 1], [107.167, 37.969, 1], [107.231, 38.496, 1], [107.136, 39.362, 1], [107.149, 40.916, 2], [107.264, 41.218, 1], [107.397, 22.044, 1], [107.374, 22.396, 2], [107.403, 22.997, 1], [107.4, 23.486, 1], [107.399, 24.137, 1], [107.388, 24.603, 1], [107.436, 25.347, 1], [107.377, 25.854, 1], [107.433, 26.389, 1], [107.467, 27.048, 2], [107.455, 27.706, 2], [107.439, 28.588, 1], [107.372, 29.357, 1], [107.399, 29.729, 2], [107.371, 30.351, 2], [107.416, 32.118, 1], [107.402, 32.733, 1], [107.361, 33.169, 1], [107.334, 34.063, 1], [107.386, 34.417, 2], [107.386, 35.207, 1], [107.389, 35.455, 1], [107.41, 36.164, 1], [107.333, 36.607, 1], [107.403, 37.285, 1], [107.412, 37.799, 1], [107.485, 38.19, 1], [107.349, 39.206, 1], [107.417, 39.729, 1], [107.398, 41.146, 1], [107.603, 21.94, 1], [107.602, 22.367, 1], [107.612, 22.855, 1], [107.599, 23.317, 2], [107.63, 23.971, 1], [107.611, 24.788, 1], [107.568, 25.038, 1], [107.558, 25.827, 1], [107.539, 26.327, 2], [107.546, 26.837, 1], [107.596, 27.999, 1], [107.61, 28.83, 1], [107.586, 29.277, 1], [107.606, 30.331, 1], [107.602, 31.419, 1], [107.624, 31.977, 1], [107.578, 32.652, 1], [107.577, 33.203, 1], [107.559, 33.754, 1], [107.616, 34.346, 2], [107.627, 35.927, 1], [107.604, 36.552, 1], [107.6, 37.203, 1], [107.606, 37.593, 2], [107.565, 38.236, 1], [107.654, 39.986, 1], [107.541, 40.836, 1], [107.633, 41.018, 1], [107.608, 41.833, 1], [107.835, 21.741, 1], [107.881, 22.76, 1], [107.818, 24.002, 1], [107.836, 24.59, 1], [107.787, 25.128, 1], [107.865, 25.549, 1], [107.861, 26.755, 2], [107.853, 27.269, 1], [107.773, 27.982, 1], [107.884, 28.524, 1], [107.752, 29.799, 2], [107.807, 30.728, 2], [107.824, 31.927, 1], [107.894, 32.534, 1], [107.779, 33.013, 1], [107.843, 33.616, 1], [107.827, 34.306, 2], [107.828, 34.733, 1], [107.798, 35.312, 1], [107.863, 35.988, 1], [107.819, 36.46, 1], [107.838, 37.108, 1], [107.836, 37.546, 1], [107.897, 37.949, 1], [107.796, 39.382, 1], [107.848, 39.986, 1], [107.821, 40.775, 1], [107.845, 41.063, 1], [107.797, 42.017, 1], [108.048, 21.699, 1], [107.991, 22.189, 1], [108.007, 22.745, 1], [108.028, 23.302, 1], [108.06, 24.678, 2], [108.079, 24.856, 1], [108.005, 25.535, 1], [108.079, 26.286, 1], [107.989, 26.594, 2], [108.032, 27.883, 1], [108.115, 28.271, 2], [108.041, 28.969, 1], [108.031, 29.521, 1], [108.063, 30.187, 2], [108.058, 30.727, 1], [108.016, 31.344, 1], [108.04, 32.02, 2], [108.031, 32.972, 1], [107.998, 33.64, 1], [108.059, 34.258, 2], [108.061, 34.579, 1], [108.043, 35.161, 2], [108.029, 35.813, 1], [107.995, 36.438, 1], [108.041, 36.924, 1], [108.03, 37.536, 1], [108.037, 38.109, 1], [107.979, 38.803, 1], [107.992, 39.107, 1], [108.125, 39.911, 1], [108.024, 40.97, 1], [108.064, 41.285, 1], [108.239, 22.048, 1], [108.263, 23.16, 2], [108.182, 23.731, 1], [108.229, 25.389, 1], [108.212, 26.075, 1], [108.239, 26.654, 1], [108.252, 27.824, 2], [108.198, 29.332, 1], [108.178, 30.071, 1], [108.241, 30.623, 1], [108.229, 31.141, 1], [108.208, 31.747, 1], [108.253, 32.314, 1], [108.229, 34.18, 2], [108.237, 34.529, 2], [108.233, 35.142, 1], [108.219, 35.672, 1], [108.191, 36.411, 1], [108.237, 37.45, 1], [108.252, 37.853, 1], [108.203, 38.477, 1], [108.266, 38.987, 1], [108.244, 40.938, 1], [108.28, 41.106, 2], [108.256, 41.859, 1], [108.414, 21.918, 1], [108.379, 22.814, 3], [108.429, 23.084, 1], [108.434, 23.736, 1], [108.446, 24.264, 1], [108.471, 25.466, 1], [108.508, 25.956, 1], [108.403, 27.686, 1], [108.493, 28.573, 2], [108.432, 29.432, 1], [108.414, 30.738, 2], [108.401, 30.979, 3], [108.454, 31.528, 1], [108.442, 32.197, 1], [108.494, 32.796, 1], [108.403, 33.353, 1], [108.432, 34.063, 1], [108.453, 34.381, 2], [108.379, 35.488, 1], [108.407, 37.35, 1], [108.475, 37.694, 1], [108.43, 38.568, 1], [108.469, 39.047, 1], [108.515, 40.058, 1], [108.381, 40.876, 1], [108.522, 41.581, 1], [108.724, 18.67, 1], [108.703, 19.122, 1], [108.636, 21.983, 2], [108.634, 23.519, 1], [108.65, 24.172, 1], [108.612, 25.34, 1], [108.611, 25.969, 1], [108.672, 26.984, 1], [108.654, 27.573, 1], [108.642, 28.134, 1], [108.638, 29.335, 1], [108.644, 29.789, 1], [108.675, 30.429, 1], [108.635, 31.509, 1], [108.596, 32.605, 1], [108.62, 33.073, 1], [108.641, 34.002, 1], [108.684, 34.294, 3], [108.64, 34.791, 1], [108.681, 36.123, 1], [108.635, 36.725, 1], [108.662, 37.057, 1], [108.637, 37.643, 1], [108.637, 38.35, 1], [108.697, 39.488, 1], [108.734, 39.842, 1], [108.662, 40.729, 2], [108.634, 41.11, 1], [108.642, 41.568, 1], [108.82, 18.546, 2], [108.839, 19.118, 1], [108.898, 19.454, 1], [108.854, 21.95, 1], [108.86, 22.422, 1], [108.835, 23.156, 2], [108.864, 23.623, 1], [108.899, 24.006, 1], [108.881, 24.726, 1], [108.822, 25.224, 1], [108.894, 25.784, 1], [108.859, 26.451, 1], [108.816, 27.104, 1], [108.867, 27.58, 2], [108.799, 27.893, 1], [108.804, 28.761, 1], [108.803, 29.304, 1], [108.828, 30.894, 1], [108.846, 31.308, 1], [108.846, 31.892, 1], [108.842, 33.013, 1], [108.83, 33.771, 1], [108.896, 34.245, 3], [108.812, 36.635, 1], [108.786, 36.872, 1], [108.829, 38.174, 1], [108.845, 38.606, 1], [108.764, 39.825, 1], [108.828, 40.585, 1], [108.829, 40.937, 1], [108.813, 41.377, 1], [109.06, 18.514, 1], [109.042, 19.221, 2], [109.063, 19.35, 1], [109.14, 21.488, 1], [109.053, 21.698, 1], [109.041, 22.369, 1], [109.04, 22.961, 1], [109.088, 23.326, 1], [109.06, 23.997, 1], [109.046, 25.103, 1], [109.072, 25.781, 1], [109.13, 26.25, 1], [109.038, 26.865, 1], [109.038, 27.903, 1], [109.009, 28.495, 2], [109.027, 29.008, 1], [109.098, 29.673, 1], [108.989, 30.265, 1], [109.047, 30.867, 1], [109.032, 32.691, 2], [108.991, 34.271, 3], [109.028, 34.614, 3], [109.071, 36.98, 1], [109.046, 37.477, 1], [109.007, 38.053, 1], [109.079, 40.898, 1], [109.151, 42.164, 1], [109.239, 18.397, 1], [109.187, 18.93, 1], [109.256, 19.477, 2], [109.162, 21.484, 1], [109.213, 21.631, 2], [109.277, 22.367, 2], [109.272, 22.729, 2], [109.243, 23.414, 1], [109.238, 23.777, 2], [109.3, 24.433, 2], [109.238, 25.713, 1], [109.229, 26.169, 1], [109.208, 27.398, 1], [109.209, 27.752, 3], [109.218, 28.235, 2], [109.249, 28.92, 1], [109.19, 29.629, 1], [109.248, 30.069, 1], [109.227, 30.643, 1], [109.262, 31.269, 1], [109.275, 32.395, 1], [109.178, 33.439, 1], [109.28, 34.148, 2], [109.275, 34.997, 1], [109.251, 35.683, 1], [109.288, 36.235, 1], [109.262, 37.28, 1], [109.291, 37.977, 1], [109.242, 38.959, 1], [109.285, 39.502, 1], [109.243, 40.015, 1], [109.235, 40.662, 1], [109.27, 41.111, 1], [109.248, 41.652, 1], [109.503, 18.272, 3], [109.517, 18.79, 2], [109.466, 19.408, 2], [109.46, 21.688, 1], [109.459, 22.214, 1], [109.458, 22.785, 2], [109.417, 24.326, 3], [109.443, 25.602, 1], [109.464, 26.048, 1], [109.431, 26.751, 1], [109.448, 27.277, 1], [109.43, 27.848, 1], [109.49, 28.747, 1], [109.437, 29.479, 2], [109.479, 30.027, 1], [109.492, 30.325, 2], [109.466, 31.048, 2], [109.509, 31.637, 1], [109.386, 32.363, 1], [109.381, 32.828, 1], [109.434, 33.393, 1], [109.481, 34.508, 3], [109.451, 34.956, 1], [109.436, 35.702, 1], [109.445, 37.148, 1], [109.469, 37.901, 1], [109.498, 38.238, 1], [109.459, 39.559, 1], [109.424, 39.925, 1], [109.46, 40.633, 1], [109.499, 41.144, 1], [109.421, 41.425, 1], [109.645, 18.314, 2], [109.67, 18.671, 2], [109.59, 19.519, 3], [109.693, 19.902, 2], [109.678, 21.715, 1], [109.605, 22.213, 1], [109.66, 22.709, 1], [109.618, 23.114, 2], [109.676, 23.775, 2], [109.67, 24.438, 2], [109.662, 24.805, 1], [109.633, 25.503, 1], [109.691, 26.564, 1], [109.714, 26.978, 1], [109.653, 27.684, 2], [109.723, 28.29, 2], [109.657, 28.729, 1], [109.638, 29.43, 1], [109.614, 29.903, 1], [109.702, 30.569, 1], [109.654, 31.098, 1], [109.623, 31.424, 1], [109.71, 32.31, 1], [109.65, 32.7, 1], [109.683, 33.813, 1], [109.646, 34.47, 1], [109.62, 34.98, 2], [109.596, 35.902, 1], [109.635, 36.652, 1], [109.674, 37.135, 2], [109.681, 37.618, 1], [109.731, 38.286, 2], [109.669, 38.679, 1], [109.673, 39.263, 1], [109.73, 39.608, 1], [109.67, 40.623, 1], [109.705, 40.752, 1], [109.741, 41.471, 1], [109.839, 18.413, 1], [109.845, 18.876, 1], [109.883, 19.847, 1], [109.911, 20.671, 1], [109.889, 21.141, 1], [109.861, 22.099, 1], [109.856, 22.738, 1], [109.834, 23.159, 1], [109.841, 23.791, 1], [109.861, 24.727, 1], [109.816, 26.07, 1], [109.849, 26.477, 1], [109.852, 27.731, 2], [109.8, 28.258, 1], [109.907, 28.668, 1], [109.86, 29.03, 1], [109.884, 29.873, 1], [109.843, 30.495, 1], [109.8, 32.247, 1], [109.86, 32.541, 1], [109.838, 33.077, 1], [109.917, 33.761, 2], [109.79, 34.457, 1], [109.905, 34.783, 2], [109.918, 35.241, 2], [109.848, 36.023, 1], [109.871, 36.545, 1], [109.884, 37.474, 1], [109.774, 38.275, 2], [109.854, 38.54, 1], [109.858, 40.659, 3], [109.846, 41.37, 1], [109.901, 41.839, 1], [109.976, 18.422, 1], [110.091, 19.345, 2], [110.051, 19.814, 2], [110.073, 20.908, 2], [110.059, 21.458, 1], [110.013, 22.166, 2], [110.105, 22.609, 2], [110.051, 23.203, 2], [110.09, 23.432, 2], [110.013, 24.257, 1], [110.011, 24.969, 1], [110.075, 25.227, 1], [110.034, 25.785, 1], [110.077, 26.427, 1], [110.018, 27.086, 1], [109.994, 27.542, 2], [110.079, 28.047, 1], [110.046, 29.844, 1], [110.033, 30.331, 1], [110.061, 30.772, 1], [110.077, 32.002, 1], [110.041, 32.381, 1], [110.096, 32.918, 1], [110.076, 34.137, 1], [110.067, 34.637, 2], [110.086, 35.184, 1], [110.089, 35.839, 1], [110.034, 36.514, 1], [110.12, 37.056, 1], [110.059, 37.503, 1], [110.081, 37.882, 1], [110.041, 38.595, 1], [110.039, 39.125, 1], [110.027, 40.371, 2], [110.021, 40.602, 3], [110.068, 41.042, 1], [109.981, 41.779, 1], [110.249, 18.727, 2], [110.281, 19.218, 1], [110.282, 19.88, 2], [110.242, 20.92, 1], [110.207, 22.583, 3], [110.253, 23.557, 1], [110.216, 24.153, 1], [110.293, 24.552, 1], [110.294, 25.275, 3], [110.253, 25.704, 1], [110.241, 26.488, 1], [110.307, 26.788, 1], [110.205, 27.39, 1], [110.26, 28.362, 1], [110.291, 29.169, 1], [110.196, 29.434, 1], [110.224, 30.196, 1], [110.299, 30.652, 1], [110.315, 31.113, 1], [110.253, 31.831, 1], [110.233, 32.237, 1], [110.295, 32.852, 1], [110.25, 33.662, 1], [110.249, 33.929, 1], [110.271, 34.603, 2], [110.207, 35.17, 1], [110.295, 35.447, 1], [110.194, 36.088, 1], [110.203, 36.881, 1], [110.269, 37.509, 1], [110.217, 38.546, 1], [110.229, 38.891, 1], [110.236, 39.372, 2], [110.27, 41.124, 1], [110.204, 42.237, 1], [110.395, 18.798, 2], [110.474, 19.206, 3], [110.405, 19.786, 2], [110.375, 20.026, 3], [110.437, 20.865, 1], [110.406, 21.243, 3], [110.454, 21.863, 1], [110.398, 22.593, 2], [110.435, 22.928, 1], [110.424, 23.491, 2], [110.503, 24.128, 1], [110.454, 24.665, 2], [110.421, 25.169, 1], [110.463, 25.57, 1], [110.446, 26.209, 1], [110.461, 26.778, 1], [110.469, 27.367, 1], [110.429, 27.803, 1], [110.41, 28.451, 1], [110.487, 29.13, 2], [110.464, 29.438, 1], [110.442, 29.996, 1], [110.456, 30.571, 1], [110.396, 31.066, 1], [110.406, 31.53, 1], [110.49, 32.094, 1], [110.428, 32.976, 1], [110.441, 33.909, 1], [110.429, 34.539, 1], [110.454, 34.926, 2], [110.462, 35.472, 2], [110.447, 36.14, 1], [110.454, 36.688, 1], [110.476, 37.076, 1], [110.468, 37.651, 1], [110.447, 39.326, 1], [110.446, 39.785, 1], [110.513, 40.549, 2], [110.466, 40.973, 1], [110.453, 41.688, 1], [110.655, 19.581, 1], [110.67, 19.992, 1], [110.64, 21.381, 2], [110.65, 21.695, 2], [110.662, 22.29, 1], [110.599, 22.855, 2], [110.654, 24.64, 1], [110.618, 24.993, 1], [110.667, 25.606, 1], [110.643, 26.758, 2], [110.619, 27.103, 1], [110.607, 27.908, 1], [110.706, 28.254, 1], [110.585, 29.108, 1], [110.596, 29.345, 1], [110.672, 30.154, 1], [110.66, 30.542, 1], [110.657, 30.979, 1], [110.691, 32.084, 1], [110.681, 32.671, 1], [110.651, 33.36, 1], [110.635, 34.495, 1], [110.679, 35.542, 2], [110.689, 35.917, 1], [110.651, 36.707, 1], [110.654, 37.068, 1], [110.699, 37.524, 1], [110.668, 38.055, 1], [110.614, 38.84, 1], [110.639, 39.246, 1], [110.636, 39.657, 1], [110.612, 40.55, 1], [110.678, 40.698, 1], [110.686, 41.501, 1], [110.663, 41.756, 1], [110.829, 19.94, 1], [110.796, 21.435, 2], [110.891, 21.732, 3], [110.857, 22.267, 1], [110.87, 23.356, 1], [110.831, 24.017, 1], [110.844, 24.518, 1], [110.85, 24.875, 1], [110.81, 25.705, 1], [110.858, 26.498, 1], [110.843, 27.113, 1], [110.865, 27.562, 1], [110.853, 28.182, 1], [110.894, 28.632, 1], [110.811, 29.377, 1], [110.875, 29.792, 1], [110.849, 30.459, 1], [110.799, 31.031, 1], [110.766, 31.648, 2], [110.765, 32.044, 1], [110.804, 32.653, 3], [110.856, 33.115, 1], [110.815, 34.339, 1], [110.88, 34.598, 2], [110.824, 35.314, 2], [110.838, 35.844, 2], [110.786, 36.451, 1], [110.841, 36.995, 1], [110.882, 37.463, 2], [110.799, 39.177, 1], [110.881, 39.656, 1], [110.827, 40.615, 1], [110.966, 19.678, 1], [110.971, 22.315, 2], [111.019, 22.868, 2], [110.998, 23.318, 1], [111.037, 23.795, 1], [111.05, 25.005, 1], [111.067, 25.438, 1], [111.064, 25.941, 1], [111.047, 26.609, 1], [111.026, 27.126, 2], [111.019, 27.572, 1], [111.097, 28.048, 1], [111.043, 28.739, 1], [111.055, 29.406, 1], [111.039, 29.697, 1], [111.068, 30.271, 1], [111.003, 30.823, 2], [110.988, 31.836, 1], [111.052, 32.514, 1], [111.032, 33.156, 1], [111.071, 33.559, 1], [111.055, 34.075, 2], [111.058, 34.7, 2], [111.015, 35.626, 2], [111.091, 36.334, 1], [110.957, 36.706, 1], [111.07, 37.477, 1], [111.016, 37.931, 2], [111.097, 38.408, 1], [111.079, 39.029, 2], [111.023, 39.553, 1], [111.019, 40.166, 1], [110.979, 41.32, 1], [111.076, 41.549, 1], [111.221, 21.626, 2], [111.224, 22.769, 1], [111.246, 23.353, 2], [111.29, 23.497, 2], [111.264, 24.412, 1], [111.268, 24.76, 1], [111.18, 25.476, 1], [111.224, 25.927, 1], [111.286, 27.675, 2], [111.227, 27.962, 1], [111.225, 28.451, 1], [111.166, 29.363, 1], [111.231, 29.662, 1], [111.203, 30.445, 1], [111.302, 30.712, 3], [111.233, 31.264, 1], [111.25, 31.862, 1], [111.243, 32.433, 1], [111.199, 33.002, 1], [111.213, 33.459, 1], [111.207, 34.775, 3], [111.238, 35.594, 2], [111.261, 36.049, 1], [111.232, 36.845, 1], [111.161, 37.49, 2], [111.164, 38.444, 1], [111.178, 38.981, 1], [111.248, 39.897, 2], [111.194, 40.446, 2], [111.289, 40.803, 1], [111.242, 41.376, 1], [111.218, 41.875, 1], [111.281, 43.123, 1], [111.415, 21.598, 1], [111.43, 22.066, 1], [111.432, 22.607, 1], [111.429, 23.215, 1], [111.411, 23.501, 2], [111.405, 24.323, 1], [111.43, 24.624, 1], [111.376, 25.254, 1], [111.398, 25.903, 1], [111.402, 26.408, 1], [111.43, 26.941, 1], [111.452, 27.382, 3], [111.411, 28.5, 1], [111.467, 28.97, 1], [111.414, 29.592, 2], [111.463, 30.304, 1], [111.372, 30.672, 3], [111.398, 31.331, 1], [111.391, 31.671, 1], [111.488, 33.246, 2], [111.442, 33.944, 1], [111.407, 34.469, 1], [111.385, 34.965, 1], [111.404, 35.613, 3], [111.475, 36.042, 3], [111.4, 36.567, 1], [111.48, 36.992, 1], [111.381, 37.708, 1], [111.436, 38.189, 1], [111.472, 39.432, 1], [111.385, 39.974, 1], [111.388, 40.303, 1], [111.423, 41.564, 1], [111.448, 42.734, 1], [111.593, 21.633, 1], [111.625, 21.831, 2], [111.591, 22.737, 2], [111.573, 23.624, 1], [111.565, 24.376, 2], [111.582, 24.608, 1], [111.585, 25.201, 1], [111.617, 25.632, 1], [111.616, 26.375, 2], [111.633, 26.841, 1], [111.591, 27.351, 1], [111.665, 27.765, 2], [111.616, 28.431, 1], [111.682, 29.035, 2], [111.637, 29.508, 1], [111.619, 30.081, 1], [111.639, 31.078, 1], [111.612, 31.675, 1], [111.649, 32.306, 2], [111.559, 32.579, 1], [111.629, 33.797, 2], [111.653, 34.385, 2], [111.603, 34.778, 1], [111.631, 35.441, 2], [111.66, 36.375, 2], [111.667, 38.247, 1], [111.591, 38.715, 1], [111.62, 39.183, 1], [111.673, 39.918, 1], [111.623, 40.243, 1], [111.664, 40.82, 3], [111.688, 41.469, 1], [111.693, 41.568, 1], [111.564, 43.359, 1], [111.834, 21.602, 1], [111.834, 22.473, 1], [111.79, 23.041, 2], [111.799, 23.598, 1], [111.774, 24.017, 1], [111.809, 24.677, 1], [111.766, 25.189, 1], [111.758, 27.266, 2], [111.816, 27.774, 1], [111.741, 29.003, 2], [111.789, 29.622, 2], [111.786, 30.117, 2], [111.771, 30.444, 2], [111.854, 31.746, 2], [111.799, 32.182, 1], [111.801, 32.635, 1], [111.846, 33.064, 2], [111.775, 33.776, 1], [111.794, 34.28, 1], [111.825, 35.206, 1], [111.777, 35.823, 2], [111.746, 36.485, 2], [111.805, 37.272, 2], [111.785, 38.086, 1], [111.773, 38.588, 1], [111.84, 38.933, 1], [111.748, 39.728, 1], [111.749, 40.791, 3], [111.728, 41.551, 1], [111.919, 21.615, 1], [111.983, 21.871, 3], [111.959, 22.5, 1], [112.043, 22.945, 2], [112.005, 23.45, 1], [112.027, 24.58, 1], [111.957, 25.599, 1], [111.991, 26.672, 1], [111.99, 27.238, 1], [111.98, 28.24, 1], [111.974, 28.869, 1], [112.024, 29.909, 1], [112.01, 30.356, 1], [111.978, 30.882, 1], [112.011, 31.604, 1], [112.039, 32.028, 2], [112.003, 33.028, 1], [111.958, 33.737, 1], [112.041, 34.137, 1], [112.002, 35.096, 1], [111.985, 35.673, 1], [111.95, 36.281, 1], [111.93, 37.019, 2], [112.016, 37.334, 2], [111.959, 38.378, 1], [112.018, 38.908, 1], [111.995, 39.557, 1], [111.988, 39.902, 1], [112.003, 40.897, 1], [112.004, 41.641, 1], [112.048, 41.984, 1], [111.989, 43.653, 1], [112.174, 21.895, 1], [112.228, 22.188, 1], [112.202, 22.806, 2], [112.162, 23.36, 1], [112.188, 23.927, 2], [112.132, 24.504, 1], [112.188, 25.45, 1], [112.203, 25.96, 1], [112.137, 26.736, 2], [112.172, 27.118, 1], [112.199, 28.184, 1], [112.166, 28.606, 1], [112.171, 29.327, 1], [112.163, 29.82, 1], [112.227, 30.292, 3], [112.211, 31.011, 2], [112.203, 31.409, 1], [112.165, 32.037, 3], [112.136, 32.568, 2], [112.202, 33.032, 2], [112.133, 34.124, 2], [112.178, 34.601, 2], [112.203, 35.683, 1], [112.198, 36.649, 1], [112.177, 37.247, 2], [112.171, 38.35, 1], [112.169, 38.849, 1], [112.213, 39.131, 1], [112.197, 40.36, 1], [112.197, 40.974, 1], [112.154, 42.133, 1], [112.14, 43.472, 1], [112.255, 44.684, 1], [112.348, 22.226, 2], [112.396, 22.897, 2], [112.388, 24.544, 1], [112.362, 24.791, 2], [112.381, 25.584, 1], [112.396, 26.429, 1], [112.391, 27.609, 1], [112.375, 28.116, 1], [112.372, 28.639, 3], [112.394, 29.291, 1], [112.404, 29.722, 2], [112.337, 30.252, 2], [112.361, 30.741, 1], [112.345, 31.376, 1], [112.353, 31.796, 1], [112.432, 33.447, 2], [112.383, 33.996, 1], [112.412, 34.608, 3], [112.435, 34.747, 3], [112.351, 36.092, 1], [112.345, 36.53, 1], [112.335, 37.353, 1], [112.394, 37.617, 2], [112.453, 37.935, 2], [112.409, 39.319, 3], [112.391, 40.878, 1], [112.317, 41.829, 1], [112.287, 42.237, 1], [112.422, 43.15, 1], [112.334, 43.358, 1], [112.553, 21.854, 1], [112.56, 22.727, 1], [112.57, 23.72, 1], [112.577, 24.894, 1], [112.561, 25.33, 1], [112.543, 25.84, 1], [112.56, 26.523, 1], [112.601, 26.9, 3], [112.544, 27.677, 2], [112.554, 28.153, 2], [112.564, 29.582, 2], [112.585, 30.637, 1], [112.59, 31.16, 2], [112.559, 32.253, 1], [112.543, 32.977, 3], [112.583, 33.107, 2], [112.514, 34.471, 3], [112.558, 34.93, 3], [112.556, 35.391, 2], [112.593, 36.444, 1], [112.604, 36.885, 1], [112.563, 37.861, 3], [112.614, 38.557, 1], [112.524, 39.22, 1], [112.568, 39.616, 1], [112.518, 39.965, 1], [112.632, 41.252, 1], [112.635, 42.78, 1], [112.749, 22.3, 2], [112.77, 22.603, 2], [112.749, 23.254, 3], [112.719, 24.616, 1], [112.76, 25.29, 1], [112.741, 25.744, 2], [112.808, 26.357, 1], [112.7, 26.846, 2], [112.745, 27.346, 1], [112.739, 27.912, 1], [112.786, 28.376, 2], [112.727, 28.976, 1], [112.728, 29.48, 1], [112.744, 30.992, 1], [112.762, 32.117, 2], [112.734, 33.201, 2], [112.757, 33.722, 1], [112.771, 34.222, 2], [112.769, 34.776, 3], [112.78, 35.33, 2], [112.777, 35.663, 2], [112.785, 36.255, 1], [112.754, 38.817, 1], [112.799, 39.553, 1], [112.748, 40.62, 1], [112.727, 41.065, 1], [112.732, 41.659, 1], [112.753, 42.27, 1], [112.668, 42.75, 1], [112.762, 43.237, 1], [112.833, 44.286, 1], [112.957, 22.66, 3], [112.948, 23.07, 3], [112.983, 23.679, 2], [112.919, 24.586, 1], [112.945, 25.335, 1], [113.007, 25.771, 2], [112.914, 26.745, 1], [112.936, 27.872, 3], [112.978, 28.195, 3], [112.922, 28.749, 2], [112.98, 29.496, 1], [112.925, 29.895, 2], [112.909, 30.434, 2], [112.939, 30.936, 1], [112.914, 32.066, 1], [112.965, 33.137, 2], [112.924, 33.74, 2], [112.958, 34.706, 3], [112.905, 35.639, 3], [112.94, 36.26, 2], [112.924, 36.715, 1], [112.968, 37.115, 1], [112.947, 38.476, 1], [112.956, 39.012, 1], [112.921, 39.474, 1], [112.95, 39.884, 1], [112.968, 40.406, 1], [112.963, 40.93, 1], [112.901, 41.366, 1], [112.917, 42.4, 1], [112.941, 43.259, 1], [113.122, 22.594, 3], [113.131, 23.043, 3], [113.132, 24.212, 1], [113.142, 24.528, 1], [113.052, 25.795, 2], [113.114, 26.133, 1], [113.114, 27.225, 1], [113.151, 27.843, 3], [113.072, 28.204, 3], [113.109, 28.779, 2], [113.137, 29.355, 3], [113.131, 29.802, 1], [113.119, 30.391, 2], [113.138, 31.426, 1], [113.12, 31.974, 1], [113.104, 32.59, 1], [113.079, 33.087, 1], [113.127, 33.548, 1], [113.124, 33.897, 2], [113.079, 34.527, 3], [113.103, 35.752, 1], [113.116, 36.191, 3], [113.075, 36.536, 2], [113.159, 37.164, 1], [113.168, 37.897, 1], [113.116, 38.148, 1], [113.112, 38.631, 1], [113.145, 39.215, 1], [113.144, 39.827, 2], [113.167, 40.199, 2], [113.131, 41.018, 2], [113.194, 41.42, 1], [113.137, 41.762, 1], [113.154, 42.59, 1], [113.099, 44.493, 1], [113.314, 22.115, 2], [113.304, 22.556, 3], [113.291, 23.336, 3], [113.315, 24.014, 1], [113.303, 24.732, 1], [113.334, 25.579, 1], [113.254, 25.984, 2], [113.294, 26.675, 1], [113.345, 27.027, 1], [113.303, 27.689, 1], [113.29, 28.731, 1], [113.282, 29.336, 1], [113.317, 29.724, 1], [113.316, 30.273, 1], [113.305, 31.239, 1], [113.365, 31.739, 2], [113.29, 32.302, 1], [113.307, 33.798, 3], [113.339, 34.484, 3], [113.282, 35.083, 3], [113.326, 35.404, 2], [113.26, 36.078, 2], [113.31, 36.414, 2], [113.363, 37.065, 1], [113.273, 37.722, 1], [113.342, 38.047, 1], [113.289, 38.705, 1], [113.28, 39.192, 1], [113.267, 39.681, 1], [113.294, 40.082, 3], [113.24, 40.808, 1], [113.324, 41.159, 1], [113.267, 43.086, 1], [113.261, 43.542, 1], [113.271, 44.026, 1], [113.504, 22.093, 1], [113.491, 23.324, 3], [113.493, 24.475, 1], [113.498, 25.515, 1], [113.503, 26.69, 1], [113.516, 26.939, 1], [113.506, 27.647, 2], [113.519, 28.569, 1], [113.456, 29.189, 1], [113.475, 29.655, 2], [113.466, 30.347, 3], [113.488, 30.651, 1], [113.545, 31.04, 1], [113.458, 31.696, 1], [113.43, 32.366, 2], [113.481, 32.836, 1], [113.513, 33.333, 2], [113.488, 33.854, 2], [113.482, 34.284, 3], [113.509, 34.835, 3], [113.488, 35.277, 2], [113.468, 36.088, 1], [113.467, 36.928, 1], [113.567, 37.326, 1], [113.522, 37.943, 2], [113.455, 38.638, 1], [113.515, 39.116, 1], [113.548, 39.36, 1], [113.461, 40.035, 1], [113.447, 40.687, 1], [113.477, 41.063, 1], [113.563, 41.569, 1], [113.509, 42.002, 1], [113.593, 22.306, 2], [113.696, 22.924, 3], [113.652, 24.455, 1], [113.62, 24.805, 3], [113.694, 25.535, 1], [113.668, 25.962, 1], [113.651, 26.987, 1], [113.663, 28.072, 2], [113.7, 29.068, 1], [113.689, 29.581, 1], [113.683, 30.596, 1], [113.702, 31.099, 2], [113.658, 31.628, 1], [113.654, 32.286, 1], [113.687, 32.635, 1], [113.676, 33.741, 2], [113.698, 34.328, 3], [113.677, 34.766, 3], [113.676, 35.282, 2], [113.714, 35.764, 1], [113.682, 36.504, 2], [113.73, 36.622, 1], [113.658, 37.473, 1], [113.62, 37.841, 3], [113.695, 38.371, 1], [113.633, 38.963, 1], [113.656, 39.555, 1], [113.673, 39.841, 1], [113.75, 40.359, 1], [113.674, 40.94, 1], [113.599, 41.564, 1], [113.684, 42.091, 1], [113.658, 43.859, 1], [113.693, 43.888, 1], [113.902, 22.456, 1], [113.864, 22.742, 3], [113.847, 23.137, 3], [113.845, 24.327, 1], [113.844, 24.984, 1], [113.862, 25.308, 1], [113.833, 25.909, 1], [113.803, 26.487, 1], [113.893, 26.937, 1], [113.863, 27.628, 2], [113.851, 27.858, 2], [113.849, 28.393, 1], [113.846, 29.122, 1], [113.878, 29.611, 2], [113.904, 29.958, 2], [113.873, 30.638, 2], [113.915, 30.953, 2], [113.843, 31.599, 1], [113.867, 32.188, 1], [113.872, 32.545, 1], [113.892, 33.724, 2], [113.832, 34.118, 3], [113.834, 34.69, 3], [113.874, 35.305, 3], [113.873, 36.724, 1], [113.882, 37.207, 1], [113.868, 37.86, 1], [113.856, 38.885, 1], [113.838, 39.873, 1], [113.856, 40.874, 1], [113.857, 41.444, 1], [113.851, 42.254, 1], [113.807, 42.797, 1], [113.842, 43.73, 1], [113.793, 43.849, 1], [113.883, 44.677, 1], [114.042, 22.372, 1], [114.053, 22.65, 3], [114.024, 23.663, 1], [114.063, 24.288, 1], [114.06, 24.925, 1], [114.06, 25.3, 1], [113.99, 25.978, 1], [114.047, 26.247, 1], [113.994, 26.815, 1], [113.992, 27.32, 1], [114.042, 27.761, 1], [114.074, 28.274, 1], [114.025, 28.97, 1], [114.054, 29.529, 1], [114.025, 29.97, 1], [114.071, 30.502, 2], [114.001, 30.94, 2], [114.025, 31.389, 2], [114.082, 32.122, 3], [114.034, 32.999, 3], [114.035, 33.561, 3], [114.039, 34.091, 2], [114.02, 34.669, 2], [114.004, 35.166, 2], [114.061, 35.437, 2], [114.043, 37.678, 1], [114.059, 38.134, 1], [114.058, 38.68, 1], [114.033, 39.283, 1], [114.024, 39.876, 1], [114.081, 40.368, 1], [114.009, 41.145, 1], [114.025, 41.901, 1], [114.048, 42.345, 1], [114, 43.729, 1], [114.078, 44.747, 1], [114.195, 22.315, 2], [114.229, 23.074, 2], [114.189, 24.643, 1], [114.226, 25.134, 1], [114.264, 25.811, 1], [114.241, 26.227, 1], [114.234, 27.239, 1], [114.204, 27.877, 1], [114.224, 28.167, 1], [114.217, 28.98, 1], [114.197, 29.422, 1], [114.271, 29.87, 2], [114.271, 30.631, 3], [114.178, 31.492, 1], [114.166, 32.079, 2], [114.248, 33.38, 2], [114.206, 34.036, 2], [114.209, 34.439, 2], [114.246, 34.952, 2], [114.226, 35.557, 2], [114.249, 35.932, 3], [114.209, 36.563, 3], [114.202, 38.18, 2], [114.226, 38.914, 1], [114.251, 39.551, 2], [114.171, 40.122, 1], [114.217, 40.615, 1], [114.202, 41.108, 1], [114.22, 41.803, 1], [114.162, 42.64, 1], [114.176, 44.698, 1], [114.407, 23.059, 3], [114.413, 23.492, 1], [114.376, 24.182, 1], [114.415, 24.593, 1], [114.353, 25.257, 2], [114.405, 26.18, 1], [114.371, 26.729, 1], [114.398, 27.814, 2], [114.442, 28.121, 2], [114.396, 28.571, 1], [114.391, 29.119, 1], [114.35, 29.83, 2], [114.373, 30.49, 3], [114.374, 30.624, 3], [114.398, 31.875, 1], [114.404, 32.337, 1], [114.386, 32.83, 2], [114.393, 33.389, 2], [114.405, 33.929, 2], [114.444, 34.434, 2], [114.374, 34.836, 3], [114.411, 35.45, 2], [114.438, 36.52, 3], [114.456, 36.989, 3], [114.419, 37.522, 1], [114.45, 38.045, 3], [114.406, 38.355, 2], [114.404, 38.938, 1], [114.367, 39.524, 1], [114.437, 39.915, 1], [114.432, 40.947, 1], [114.421, 41.58, 1], [114.427, 41.939, 1], [114.418, 42.444, 1], [114.48, 43.119, 1], [114.329, 43.442, 1], [114.439, 44.122, 1], [114.39, 45.089, 1], [114.526, 22.669, 2], [114.573, 22.983, 2], [114.608, 23.561, 2], [114.633, 23.866, 1], [114.598, 25.195, 1], [114.567, 25.709, 2], [114.541, 26.257, 1], [114.599, 26.452, 1], [114.611, 27.472, 1], [114.585, 28.103, 1], [114.583, 28.675, 1], [114.52, 29.638, 1], [114.619, 30.195, 1], [114.568, 30.636, 2], [114.567, 31.782, 1], [114.552, 32.209, 2], [114.597, 32.84, 2], [114.601, 33.187, 2], [114.621, 33.654, 3], [114.575, 34.32, 2], [114.567, 34.788, 2], [114.589, 35.349, 3], [114.563, 35.739, 2], [114.535, 36.831, 3], [114.573, 37.326, 2], [114.55, 38.011, 3], [114.578, 38.248, 2], [114.611, 38.765, 1], [114.599, 39.301, 1], [114.589, 39.85, 1], [114.566, 40.327, 1], [114.575, 40.757, 1], [114.589, 41.392, 1], [114.604, 41.872, 1], [114.581, 42.881, 1], [114.533, 43.431, 1], [114.583, 43.99, 1], [114.764, 22.664, 1], [114.735, 22.952, 3], [114.703, 23.667, 2], [114.797, 24.425, 1], [114.803, 24.912, 2], [114.767, 25.872, 1], [114.761, 26.5, 1], [114.701, 27.756, 1], [114.761, 28.041, 1], [114.793, 28.425, 1], [114.723, 29.139, 1], [114.731, 29.573, 1], [114.765, 30.13, 1], [114.752, 30.588, 2], [114.758, 32.662, 1], [114.76, 33.181, 2], [114.724, 33.627, 2], [114.78, 34.151, 2], [114.788, 34.686, 2], [114.726, 35.209, 3], [114.752, 35.71, 2], [114.738, 36.263, 2], [114.75, 36.732, 2], [114.75, 37.258, 2], [114.747, 37.83, 2], [114.752, 38.235, 2], [114.718, 39.337, 1], [114.751, 39.933, 1], [114.755, 40.251, 1], [114.762, 40.778, 2], [114.726, 41.174, 1], [114.775, 41.849, 1], [114.777, 42.668, 1], [114.682, 43.511, 1], [114.838, 43.994, 1], [114.759, 44.606, 1], [114.684, 44.919, 1], [114.894, 22.607, 1], [114.947, 22.796, 2], [114.944, 24.435, 1], [114.939, 24.94, 1], [114.936, 25.395, 2], [114.945, 25.847, 3], [114.935, 26.402, 1], [114.96, 27.043, 2], [114.944, 27.469, 1], [114.932, 28.98, 1], [114.926, 29.572, 1], [114.968, 30.128, 2], [114.905, 30.442, 3], [114.968, 31.086, 2], [114.893, 31.625, 2], [114.924, 32.006, 2], [114.966, 32.668, 2], [114.939, 33.039, 2], [114.903, 33.577, 3], [114.9, 34.057, 2], [114.95, 34.581, 2], [114.924, 35.097, 2], [114.976, 35.67, 2], [114.926, 36.083, 2], [114.927, 37.092, 2], [114.935, 38.137, 2], [114.971, 38.587, 2], [114.93, 39.564, 1], [114.94, 40.069, 1], [114.899, 40.796, 3], [114.941, 41.265, 1], [114.98, 41.493, 1], [115.009, 42.912, 1], [114.86, 43.998, 1], [114.972, 44.028, 1], [115.116, 22.831, 1], [115.102, 23.461, 1], [115.164, 23.717, 1], [115.11, 25.379, 1], [115.127, 26.358, 1], [115.073, 27.002, 1], [115.137, 27.272, 1], [115.107, 27.906, 1], [115.12, 28.353, 1], [115.113, 28.829, 1], [115.125, 29.288, 1], [115.085, 30.25, 2], [115.1, 31.413, 1], [115.129, 32.483, 1], [115.122, 32.997, 1], [115.132, 33.502, 2], [115.115, 33.98, 2], [115.117, 34.522, 2], [115.071, 35.654, 3], [115.107, 35.885, 3], [115.101, 37.606, 1], [115.109, 38.047, 2], [115.124, 38.566, 2], [115.138, 38.9, 1], [115.15, 39.491, 1], [115.115, 40.148, 1], [115.079, 40.604, 2], [115.132, 41.189, 1], [115.144, 41.532, 1], [115.086, 42.183, 1], [115.164, 42.376, 1], [115.116, 44.598, 1], [115.173, 45.051, 1], [115.333, 22.889, 3], [115.347, 23.086, 1], [115.283, 23.766, 1], [115.268, 24.121, 2], [115.331, 25.299, 1], [115.302, 25.87, 1], [115.34, 26.311, 2], [115.276, 26.752, 1], [115.316, 27.741, 1], [115.333, 28.335, 1], [115.358, 28.846, 1], [115.289, 29.364, 1], [115.321, 30.797, 1], [115.295, 31.356, 1], [115.291, 31.881, 1], [115.289, 32.388, 1], [115.275, 33.023, 2], [115.308, 33.367, 2], [115.304, 34.012, 2], [115.305, 34.416, 2], [115.287, 35.442, 1], [115.284, 35.908, 2], [115.286, 36.933, 2], [115.281, 37.453, 1], [115.247, 37.973, 2], [115.311, 38.433, 2], [115.316, 39.357, 1], [115.335, 39.925, 1], [115.293, 41.899, 1], [115.234, 42.351, 1], [115.364, 45.02, 1], [115.43, 22.803, 1], [115.438, 23.022, 1], [115.488, 23.676, 1], [115.478, 24.157, 1], [115.409, 25.171, 1], [115.423, 25.939, 2], [115.458, 26.69, 1], [115.426, 27.826, 1], [115.452, 28.262, 2], [115.426, 28.715, 2], [115.498, 29.243, 1], [115.48, 29.843, 1], [115.447, 30.245, 2], [115.424, 30.755, 1], [115.434, 31.831, 2], [115.436, 32.403, 2], [115.462, 32.832, 1], [115.451, 33.277, 1], [115.483, 33.849, 2], [115.476, 34.313, 2], [115.509, 34.802, 2], [115.478, 35.257, 3], [115.491, 36.771, 2], [115.439, 37.313, 1], [115.503, 37.914, 2], [115.494, 38.299, 2], [115.489, 38.866, 3], [115.496, 39.288, 2], [115.446, 39.721, 1], [115.454, 40.832, 1], [115.45, 41.412, 1], [115.482, 41.874, 1], [115.499, 42.325, 1], [115.513, 42.776, 1], [115.583, 22.719, 1], [115.675, 23.633, 1], [115.685, 24.144, 2], [115.646, 24.607, 1], [115.657, 24.992, 1], [115.654, 25.679, 1], [115.622, 26.163, 1], [115.646, 26.585, 1], [115.687, 27.086, 1], [115.625, 27.642, 1], [115.632, 28.147, 2], [115.627, 28.754, 2], [115.649, 29.177, 1], [115.634, 29.761, 2], [115.641, 30.123, 1], [115.666, 30.732, 1], [115.625, 31.212, 1], [115.614, 32.669, 2], [115.648, 34.365, 3], [115.617, 35.201, 2], [115.636, 35.708, 1], [115.658, 36.221, 2], [115.675, 36.762, 2], [115.671, 37.713, 3], [115.64, 38.255, 2], [115.666, 39.166, 2], [115.671, 39.591, 1], [115.623, 40.336, 1], [115.61, 40.771, 1], [115.689, 41.689, 1], [115.691, 42.291, 1], [115.622, 43.716, 1], [115.648, 44.898, 1], [115.828, 22.8, 1], [115.825, 22.927, 1], [115.832, 23.489, 1], [115.773, 24.045, 2], [115.773, 25.145, 1], [115.804, 25.598, 2], [115.813, 26.024, 1], [115.819, 26.482, 1], [115.787, 27.088, 1], [115.833, 27.471, 1], [115.858, 28.678, 3], [115.8, 29.157, 2], [115.863, 29.594, 2], [115.825, 30.014, 1], [115.811, 30.556, 1], [115.839, 32.055, 1], [115.81, 32.649, 1], [115.83, 32.927, 3], [115.794, 33.769, 2], [115.803, 33.986, 2], [115.847, 35.094, 2], [115.82, 35.566, 2], [115.823, 36.077, 2], [115.805, 37.131, 2], [115.794, 37.65, 2], [115.817, 38.135, 1], [115.831, 39.128, 2], [115.861, 39.43, 2], [115.804, 40.134, 1], [115.85, 41.949, 1], [115.855, 42.68, 1], [115.864, 43.635, 1], [115.805, 44.744, 1], [115.826, 44.93, 1], [115.998, 23.012, 1], [116.027, 23.418, 1], [115.985, 24.037, 1], [116.013, 25.017, 1], [115.944, 25.598, 1], [116.025, 25.907, 2], [116.018, 26.458, 2], [116.035, 26.897, 1], [115.97, 27.571, 1], [116.038, 27.87, 1], [115.948, 28.643, 3], [115.998, 29.672, 3], [115.984, 29.933, 2], [115.995, 30.526, 1], [115.984, 30.982, 1], [115.96, 31.634, 1], [115.979, 32.473, 1], [115.987, 32.989, 1], [115.996, 33.493, 1], [116.006, 34.056, 1], [115.995, 34.464, 2], [115.994, 34.979, 2], [115.983, 35.531, 2], [115.995, 35.976, 2], [115.998, 36.973, 2], [116.001, 37.401, 2], [115.985, 38.021, 1], [116.007, 38.563, 2], [116.013, 39.035, 3], [116.003, 39.569, 3], [116.04, 39.85, 2], [115.996, 40.425, 2], [115.986, 40.94, 1], [116, 41.6, 1], [115.996, 42.144, 1], [116.01, 42.294, 1], [115.979, 43.501, 1], [116.062, 43.945, 1], [116.067, 45.007, 1], [116.149, 22.951, 1], [116.189, 23.794, 2], [116.136, 24.358, 3], [116.149, 25.031, 1], [116.174, 25.41, 1], [116.152, 25.965, 1], [116.21, 27.507, 1], [116.161, 28.383, 2], [116.123, 28.866, 1], [116.192, 29.358, 2], [116.164, 29.984, 2], [116.188, 30.896, 1], [116.198, 31.538, 1], [116.168, 31.939, 1], [116.166, 33.943, 1], [116.152, 34.301, 2], [116.133, 35.823, 2], [116.194, 36.435, 2], [116.212, 36.858, 2], [116.15, 37.361, 1], [116.173, 37.896, 3], [116.136, 38.394, 2], [116.138, 38.839, 3], [116.159, 39.447, 2], [116.189, 39.891, 3], [116.213, 40.22, 3], [116.158, 40.922, 1], [116.134, 41.533, 1], [116.149, 41.793, 1], [116.216, 42.327, 1], [116.204, 42.719, 1], [116.131, 43.391, 1], [116.102, 43.951, 2], [116.211, 44.981, 1], [116.148, 45.469, 1], [116.178, 48.358, 1], [116.256, 48.779, 1], [116.315, 23.026, 2], [116.352, 23.745, 1], [116.338, 24.433, 1], [116.401, 25.008, 1], [116.366, 25.836, 2], [116.347, 26.332, 1], [116.322, 27.454, 1], [116.349, 27.97, 2], [116.282, 28.32, 2], [116.364, 29.363, 1], [116.319, 29.787, 1], [116.331, 30.4, 1], [116.354, 30.844, 1], [116.344, 31.406, 1], [116.305, 32.364, 1], [116.305, 32.724, 2], [116.363, 33.881, 2], [116.354, 34.363, 2], [116.331, 34.923, 2], [116.342, 35.301, 2], [116.354, 35.784, 1], [116.297, 36.394, 2], [116.333, 37.437, 3], [116.322, 37.728, 2], [116.339, 38.328, 2], [116.348, 38.826, 2], [116.347, 39.28, 3], [116.35, 39.906, 3], [116.377, 41.746, 1], [116.365, 42.191, 1], [116.337, 42.74, 1], [116.337, 43.12, 1], [116.274, 43.934, 1], [116.382, 44.845, 1], [116.492, 23.01, 1], [116.484, 23.342, 3], [116.548, 23.638, 2], [116.525, 24.303, 1], [116.456, 24.99, 1], [116.494, 25.291, 1], [116.473, 25.715, 1], [116.494, 26.332, 1], [116.503, 26.846, 1], [116.542, 28.205, 1], [116.524, 28.72, 1], [116.517, 29.315, 1], [116.543, 29.869, 1], [116.561, 30.656, 1], [116.53, 31.317, 1], [116.515, 31.758, 2], [116.529, 32.192, 1], [116.535, 32.739, 1], [116.472, 33.877, 2], [116.506, 34.205, 1], [116.549, 34.719, 2], [116.546, 35.333, 2], [116.543, 35.58, 3], [116.491, 36.237, 2], [116.518, 36.701, 1], [116.528, 37.798, 2], [116.554, 38.134, 2], [116.497, 38.747, 2], [116.517, 39.177, 2], [116.48, 39.87, 3], [116.504, 40, 3], [116.525, 40.491, 1], [116.522, 41.218, 1], [116.491, 42.207, 1], [116.537, 42.535, 1], [116.504, 43.004, 1], [116.458, 43.852, 1], [116.484, 44.192, 1], [116.576, 44.537, 1], [116.564, 45.506, 1], [116.523, 49.109, 1], [116.705, 23.375, 3], [116.666, 23.602, 3], [116.722, 24.704, 1], [116.742, 25.687, 1], [116.672, 26.254, 1], [116.687, 26.709, 1], [116.649, 27.263, 1], [116.645, 27.589, 1], [116.659, 28.155, 2], [116.695, 28.697, 1], [116.687, 29.69, 1], [116.677, 30.655, 1], [116.684, 31.233, 1], [116.665, 31.71, 1], [116.716, 32.146, 1], [116.696, 32.72, 2], [116.684, 33.154, 1], [116.685, 33.609, 2], [116.655, 34.645, 2], [116.667, 35.092, 2], [116.645, 35.46, 3], [116.713, 36.163, 2], [116.688, 36.934, 2], [116.685, 38.065, 2], [116.675, 38.636, 2], [116.699, 39.573, 3], [116.666, 40.006, 3], [116.677, 40.378, 2], [116.652, 41.184, 1], [116.704, 41.449, 1], [116.682, 42.192, 1], [116.634, 42.377, 1], [116.668, 42.945, 1], [116.682, 43.558, 1], [116.619, 44.29, 1], [116.716, 44.661, 1], [116.687, 45.235, 1], [116.609, 48.414, 1], [116.756, 48.963, 1], [116.808, 23.516, 2], [116.859, 24.076, 1], [116.885, 24.745, 1], [116.79, 25.727, 1], [116.835, 26.194, 1], [116.907, 27.261, 1], [116.85, 27.69, 1], [116.823, 28.102, 1], [116.862, 29.014, 1], [116.854, 29.47, 1], [116.867, 30.097, 1], [116.877, 31.01, 1], [116.855, 31.981, 1], [116.873, 33, 1], [116.851, 33.528, 1], [116.823, 33.976, 3], [116.871, 34.542, 2], [116.897, 34.839, 2], [116.837, 35.561, 3], [116.871, 36.601, 3], [116.863, 36.958, 2], [116.827, 37.582, 2], [116.854, 37.966, 1], [116.854, 38.365, 3], [116.831, 39.945, 3], [116.849, 40.377, 2], [116.868, 41.33, 1], [116.903, 42.209, 1], [116.805, 43.062, 1], [116.839, 44.337, 1], [116.825, 45.363, 1], [116.837, 48.69, 1], [117.006, 23.654, 2], [117.039, 24.082, 1], [117.014, 24.636, 1], [117.036, 26.495, 1], [117.04, 27.041, 1], [117.068, 27.707, 1], [117.035, 28.226, 2], [117.06, 28.561, 2], [117.042, 29.005, 1], [117.044, 29.391, 1], [117.032, 30.105, 1], [116.984, 31.036, 2], [117.047, 31.919, 1], [117.022, 32.624, 2], [117.038, 32.933, 1], [117.044, 34.431, 2], [117.012, 34.876, 2], [116.995, 35.478, 3], [117.057, 35.943, 2], [117.013, 36.506, 3], [117.035, 36.686, 3], [117.034, 37.372, 1], [117.028, 38.32, 1], [117.021, 38.928, 2], [117.062, 39.257, 3], [117.032, 39.84, 3], [117.061, 41.662, 1], [117.025, 42.178, 1], [116.982, 45.513, 1], [116.998, 45.518, 1], [117.002, 47.659, 1], [116.962, 48.593, 1], [117.024, 49.127, 1], [117.184, 23.709, 1], [117.206, 24.091, 1], [117.207, 24.419, 1], [117.175, 24.998, 1], [117.204, 25.955, 1], [117.188, 26.913, 1], [117.179, 27.602, 1], [117.205, 28.104, 1], [117.159, 28.971, 2], [117.217, 29.306, 2], [117.191, 29.845, 1], [117.179, 30.496, 1], [117.222, 30.796, 1], [117.211, 31.38, 2], [117.233, 31.838, 3], [117.184, 32.416, 2], [117.208, 32.908, 2], [117.202, 33.843, 1], [117.2, 34.262, 3], [117.194, 34.9, 2], [117.18, 35.126, 2], [117.217, 35.749, 2], [117.172, 36.735, 3], [117.184, 37.289, 1], [117.21, 38.127, 2], [117.193, 38.809, 2], [117.2, 39.712, 2], [117.184, 41.794, 1], [117.219, 42.047, 1], [117.245, 42.512, 1], [117.203, 43.228, 1], [117.211, 43.61, 1], [117.18, 44.059, 1], [117.145, 44.465, 1], [117.191, 45.26, 1], [117.21, 45.718, 1], [117.147, 47.872, 1], [117.215, 49.467, 1], [117.285, 23.749, 1], [117.334, 24.932, 1], [117.42, 25.324, 1], [117.376, 25.974, 2], [117.362, 26.847, 1], [117.357, 27.512, 1], [117.369, 27.959, 1], [117.355, 28.857, 1], [117.338, 29.284, 1], [117.367, 29.933, 1], [117.355, 30.442, 1], [117.358, 30.823, 1], [117.322, 31.259, 2], [117.323, 31.858, 3], [117.362, 32.298, 1], [117.349, 33.266, 2], [117.361, 33.736, 1], [117.344, 34.27, 2], [117.349, 34.737, 2], [117.348, 35.73, 1], [117.384, 36.168, 1], [117.353, 36.713, 2], [117.379, 37.14, 1], [117.386, 37.745, 2], [117.349, 38.323, 2], [117.373, 38.635, 2], [117.346, 39.68, 2], [117.398, 40.033, 2], [117.356, 40.637, 1], [117.347, 40.942, 1], [117.428, 41.723, 1], [117.359, 42.075, 1], [117.335, 42.441, 1], [117.413, 43.084, 1], [117.434, 43.597, 1], [117.424, 44.105, 1], [117.358, 44.51, 1], [117.4, 44.978, 1], [117.427, 45.691, 1], [117.32, 48.03, 1], [117.371, 49.598, 1], [117.444, 49.602, 1], [117.552, 24.026, 1], [117.578, 24.354, 2], [117.556, 24.881, 1], [117.549, 25.805, 1], [117.591, 26.236, 1], [117.493, 26.74, 1], [117.501, 27.337, 1], [117.542, 27.903, 1], [117.564, 28.38, 1], [117.577, 28.889, 1], [117.532, 29.281, 1], [117.498, 30.231, 1], [117.51, 30.69, 2], [117.534, 31.249, 1], [117.493, 31.845, 2], [117.537, 32.121, 1], [117.547, 32.839, 2], [117.543, 33.119, 1], [117.523, 34.203, 2], [117.538, 34.701, 2], [117.565, 35.578, 1], [117.553, 36.118, 1], [117.532, 36.686, 2], [117.528, 37.021, 1], [117.56, 37.567, 2], [117.538, 38.036, 1], [117.51, 38.636, 2], [117.543, 39.44, 2], [117.538, 39.955, 2], [117.522, 40.441, 1], [117.528, 40.979, 1], [117.5, 41.549, 1], [117.559, 41.979, 1], [117.562, 42.445, 1], [117.592, 42.981, 1], [117.547, 43.271, 1], [117.615, 44.594, 1], [117.607, 45.946, 1], [117.548, 47.95, 1], [117.514, 49.505, 1], [117.689, 24.038, 1], [117.676, 24.478, 3], [117.725, 24.691, 2], [117.723, 25.202, 1], [117.719, 25.802, 1], [117.662, 26.277, 2], [117.714, 26.739, 1], [117.697, 27.161, 1], [117.678, 27.624, 1], [117.718, 28.303, 1], [117.703, 28.683, 1], [117.709, 29.094, 1], [117.723, 29.815, 1], [117.716, 30.191, 1], [117.714, 30.729, 1], [117.723, 31.101, 1], [117.717, 31.602, 1], [117.696, 32.54, 2], [117.695, 33.041, 1], [117.698, 33.599, 1], [117.708, 34.073, 1], [117.724, 34.531, 2], [117.7, 34.945, 1], [117.665, 35.517, 2], [117.701, 36.412, 2], [117.737, 36.903, 2], [117.697, 37.484, 1], [117.685, 37.925, 1], [117.69, 39.037, 3], [117.734, 39.34, 2], [117.73, 39.886, 2], [117.699, 40.334, 1], [117.733, 41.316, 1], [117.767, 41.935, 1], [117.704, 42.278, 1], [117.75, 43.679, 1], [117.692, 44.268, 1], [117.633, 44.592, 1], [117.675, 46.061, 1], [117.732, 47.98, 1], [117.706, 49.472, 1], [117.845, 24.42, 2], [117.89, 24.588, 2], [117.887, 25.251, 1], [117.859, 25.697, 1], [117.818, 26.347, 1], [117.864, 27.296, 1], [117.917, 27.625, 1], [117.857, 28.243, 1], [117.912, 28.471, 2], [117.862, 29.223, 1], [117.866, 29.494, 1], [117.922, 29.996, 1], [117.867, 30.607, 1], [117.839, 30.968, 2], [117.894, 31.515, 2], [117.875, 32.001, 1], [117.886, 32.521, 1], [117.891, 33.482, 2], [117.891, 34.394, 2], [117.876, 34.886, 1], [117.881, 35.383, 1], [117.862, 35.948, 2], [117.87, 36.497, 2], [117.874, 36.813, 2], [117.887, 37.298, 2], [117.83, 39.302, 2], [117.875, 39.781, 2], [117.897, 40.193, 2], [117.847, 40.925, 1], [117.935, 40.996, 2], [117.849, 41.785, 1], [117.87, 42.223, 1], [117.828, 42.782, 1], [117.924, 43.965, 1], [117.926, 44.502, 1], [117.85, 45.689, 1], [117.899, 46.064, 1], [117.846, 48.504, 1], [117.844, 49.45, 1], [118.038, 25.472, 1], [118.024, 26.171, 1], [118.012, 26.595, 1], [118.057, 27.13, 1], [118.039, 28.225, 1], [118.002, 28.464, 2], [118.045, 28.94, 1], [118.046, 29.478, 1], [118.008, 29.949, 1], [118.037, 30.451, 1], [118.027, 31.019, 1], [118.031, 31.459, 1], [118.02, 32.457, 1], [118.015, 32.825, 1], [118.041, 33.406, 1], [118.004, 33.9, 2], [117.999, 34.344, 2], [118.014, 35.277, 2], [118.009, 35.725, 1], [118.02, 36.322, 1], [118.042, 36.803, 3], [118.026, 37.344, 3], [118.075, 39.662, 2], [118.005, 40.158, 2], [117.991, 40.849, 1], [117.987, 41.034, 2], [118.072, 41.488, 1], [118.017, 42.028, 1], [118.062, 42.665, 1], [118.067, 43.005, 1], [118.062, 43.61, 1], [118.066, 44.363, 1], [118.052, 45.549, 1], [118.047, 45.824, 1], [118.094, 49.285, 1], [118.163, 24.554, 3], [118.203, 25.086, 2], [118.194, 26.172, 1], [118.191, 26.623, 2], [118.2, 27.098, 1], [118.136, 27.356, 1], [118.211, 27.893, 1], [118.203, 28.496, 2], [118.245, 28.784, 1], [118.206, 29.455, 1], [118.223, 29.877, 1], [118.171, 30.315, 1], [118.203, 31.028, 1], [118.216, 31.318, 1], [118.264, 32.156, 1], [118.21, 32.787, 1], [118.236, 33.895, 2], [118.229, 34.285, 1], [118.222, 34.776, 2], [118.241, 35.112, 3], [118.208, 35.643, 1], [118.181, 36.194, 2], [118.196, 37.102, 2], [118.21, 37.582, 2], [118.226, 37.975, 1], [118.2, 39.267, 1], [118.184, 39.657, 3], [118.202, 39.947, 2], [118.222, 40.917, 1], [118.215, 41.94, 1], [118.199, 42.387, 1], [118.178, 42.92, 1], [118.206, 43.491, 1], [118.235, 43.889, 1], [118.177, 44.289, 1], [118.158, 44.774, 1], [118.261, 45.134, 1], [118.183, 45.751, 1], [118.273, 48.222, 1], [118.403, 24.7, 2], [118.386, 24.985, 2], [118.315, 25.352, 1], [118.397, 26.086, 1], [118.372, 26.425, 1], [118.327, 27.023, 1], [118.381, 27.449, 1], [118.37, 28.928, 1], [118.41, 29.179, 1], [118.399, 30.343, 1], [118.391, 31.344, 3], [118.341, 32.284, 2], [118.42, 32.539, 1], [118.363, 33.239, 1], [118.334, 33.869, 2], [118.359, 34.642, 2], [118.347, 35.075, 3], [118.385, 36.024, 1], [118.393, 37.026, 2], [118.396, 37.53, 1], [118.37, 37.918, 1], [118.386, 39.183, 1], [118.365, 40.911, 1], [118.376, 41.507, 1], [118.394, 41.785, 1], [118.37, 42.273, 1], [118.382, 42.802, 1], [118.311, 43.97, 1], [118.375, 44.1, 1], [118.413, 44.741, 1], [118.44, 45.647, 1], [118.321, 46.006, 1], [118.343, 48.207, 1], [118.303, 49.46, 1], [118.471, 24.722, 1], [118.567, 24.904, 3], [118.576, 25.367, 1], [118.556, 25.852, 1], [118.508, 26.361, 1], [118.521, 26.948, 1], [118.525, 28.424, 1], [118.539, 29.36, 1], [118.516, 29.84, 1], [118.565, 30.179, 1], [118.511, 30.825, 1], [118.543, 31.237, 2], [118.524, 31.674, 3], [118.563, 32.123, 2], [118.548, 32.618, 1], [118.531, 33.67, 1], [118.528, 34.078, 1], [118.544, 34.524, 1], [118.528, 35.062, 2], [118.507, 35.517, 2], [118.555, 35.918, 1], [118.523, 36.606, 3], [118.53, 37.474, 3], [118.539, 37.861, 2], [118.53, 39.848, 2], [118.549, 40.282, 1], [118.514, 40.646, 1], [118.568, 41.241, 1], [118.562, 41.807, 1], [118.544, 42.212, 1], [118.529, 43.288, 1], [118.518, 44.178, 1], [118.509, 44.763, 1], [118.575, 44.926, 1], [118.502, 46.245, 1], [118.543, 48.016, 1], [118.577, 49.391, 1], [118.57, 49.807, 1], [118.656, 24.944, 2], [118.72, 25.369, 2], [118.732, 25.869, 1], [118.716, 26.224, 1], [118.751, 26.601, 1], [118.695, 27.26, 1], [118.73, 27.65, 1], [118.679, 28.056, 1], [118.648, 28.761, 2], [118.718, 29.039, 1], [118.664, 29.721, 1], [118.7, 30.095, 1], [118.694, 30.73, 1], [118.696, 31.623, 1], [118.724, 32.488, 1], [118.701, 33.699, 2], [118.741, 34.03, 2], [118.747, 34.492, 2], [118.67, 34.948, 2], [118.702, 35.415, 1], [118.667, 35.83, 2], [118.689, 36.399, 1], [118.727, 36.865, 3], [118.719, 37.754, 1], [118.685, 39.409, 1], [118.704, 39.709, 2], [118.709, 40.038, 2], [118.702, 41.033, 1], [118.731, 41.517, 1], [118.711, 41.977, 1], [118.699, 42.611, 1], [118.693, 44.956, 1], [118.672, 49.448, 1], [118.646, 49.836, 1], [118.804, 25.033, 2], [118.878, 25.248, 2], [118.874, 26.217, 1], [118.862, 26.702, 1], [118.867, 27.368, 1], [118.812, 27.572, 1], [118.91, 28.023, 1], [118.846, 28.842, 1], [118.885, 28.954, 2], [118.883, 30.053, 1], [118.9, 30.626, 1], [118.845, 31.04, 1], [118.833, 32.027, 3], [118.849, 32.913, 1], [118.876, 33.357, 2], [118.816, 34.078, 2], [118.838, 34.415, 2], [118.877, 34.8, 2], [118.849, 35.265, 2], [118.852, 35.667, 2], [118.878, 36.303, 1], [118.844, 36.785, 2], [118.846, 37.139, 3], [118.839, 37.883, 1], [118.905, 38.061, 1], [118.817, 39.332, 1], [118.882, 39.545, 2], [118.865, 40.001, 1], [118.905, 40.458, 1], [118.855, 41.079, 1], [118.875, 41.583, 1], [118.854, 42.146, 1], [118.914, 42.282, 2], [118.845, 43.523, 1], [118.919, 43.86, 1], [118.899, 44.459, 1], [118.915, 44.82, 1], [118.864, 45.401, 1], [118.846, 45.72, 1], [118.889, 47.851, 1], [118.791, 48.733, 1], [118.854, 49.298, 1], [119.053, 26.207, 1], [119.008, 26.783, 1], [119.004, 26.971, 1], [119.053, 27.63, 1], [119.046, 28.025, 1], [119.044, 28.512, 1], [118.988, 29.002, 1], [119.054, 29.584, 1], [119.003, 30.06, 1], [118.99, 30.604, 2], [119.028, 30.982, 1], [119.011, 31.941, 2], [119.03, 32.283, 2], [119.015, 32.839, 2], [119.018, 33.482, 1], [119.039, 33.624, 3], [119.031, 34.764, 2], [119.012, 35.678, 1], [119.036, 36.221, 1], [119.066, 36.717, 2], [119.008, 37.07, 1], [118.953, 38.068, 1], [118.96, 39.308, 1], [119.024, 39.564, 1], [119.033, 39.895, 1], [118.975, 40.425, 1], [119.048, 40.963, 1], [119.047, 41.431, 1], [119.031, 41.864, 1], [119.023, 42.938, 1], [119.047, 43.886, 1], [119.073, 44.84, 1], [118.971, 45.253, 1], [119.009, 45.804, 1], [119.11, 45.907, 1], [119.019, 46.442, 1], [118.996, 47.844, 1], [119.057, 48.077, 1], [119.067, 49.326, 1], [119.226, 26.072, 3], [119.152, 26.683, 1], [119.179, 27.05, 1], [119.19, 29.038, 2], [119.204, 29.424, 1], [119.201, 30.28, 1], [119.176, 30.951, 1], [119.175, 31.906, 2], [119.187, 32.281, 2], [119.198, 32.698, 1], [119.193, 33.348, 1], [119.181, 33.622, 2], [119.224, 34.239, 2], [119.181, 34.659, 3], [119.193, 35.138, 1], [119.208, 35.7, 1], [119.2, 36.088, 1], [119.167, 36.673, 3], [119.192, 36.996, 1], [119.164, 39.535, 1], [119.197, 40.398, 1], [119.16, 40.828, 1], [119.213, 41.292, 1], [119.201, 41.809, 1], [119.238, 42.156, 1], [119.204, 42.725, 1], [119.133, 43.465, 1], [119.174, 44.189, 1], [119.201, 44.496, 1], [119.15, 45.695, 1], [119.137, 45.949, 1], [119.18, 48.379, 1], [119.177, 48.858, 1], [119.215, 49.278, 1], [119.168, 50.013, 1], [119.356, 25.702, 2], [119.327, 26.068, 3], [119.366, 26.539, 1], [119.354, 27.072, 1], [119.337, 27.414, 1], [119.348, 28.05, 1], [119.315, 28.577, 1], [119.34, 29.378, 2], [119.382, 29.94, 1], [119.372, 30.24, 1], [119.407, 30.875, 1], [119.349, 31.318, 1], [119.37, 31.71, 1], [119.352, 33.226, 2], [119.303, 33.723, 2], [119.344, 34.114, 2], [119.361, 34.682, 2], [119.362, 35.443, 1], [119.398, 36.015, 2], [119.367, 36.509, 2], [119.283, 39.533, 1], [119.344, 40.23, 1], [119.357, 40.686, 1], [119.405, 41.254, 2], [119.337, 41.624, 1], [119.309, 42.13, 2], [119.32, 42.932, 1], [119.387, 43.99, 1], [119.316, 44.422, 1], [119.283, 45.245, 1], [119.413, 45.864, 1], [119.33, 46.4, 1], [119.329, 47.601, 1], [119.329, 47.729, 1], [119.312, 48.966, 1], [119.428, 49.311, 1], [119.364, 50.324, 1], [119.474, 25.66, 1], [119.519, 25.984, 2], [119.542, 26.51, 3], [119.526, 27.424, 1], [119.522, 28.021, 1], [119.5, 28.977, 1], [119.506, 29.196, 2], [119.506, 29.72, 1], [119.523, 30.231, 1], [119.509, 30.749, 1], [119.501, 31.32, 2], [119.496, 32.177, 3], [119.498, 32.518, 3], [119.495, 33.058, 1], [119.509, 33.512, 1], [119.56, 34.148, 2], [119.512, 34.436, 1], [119.517, 35.433, 3], [119.484, 36, 2], [119.526, 36.404, 1], [119.498, 36.842, 1], [119.563, 37.063, 1], [119.5, 39.852, 2], [119.559, 39.95, 3], [119.511, 40.583, 1], [119.504, 41.141, 1], [119.535, 41.539, 1], [119.516, 42.087, 1], [119.496, 42.464, 1], [119.501, 44.003, 1], [119.487, 46.179, 1], [119.565, 47.331, 1], [119.488, 47.871, 1], [119.582, 49.348, 1], [119.576, 50.227, 1], [119.478, 50.691, 1], [119.638, 25.933, 2], [119.645, 26.403, 1], [119.665, 26.981, 2], [119.695, 27.719, 1], [119.67, 28.284, 1], [119.645, 28.724, 1], [119.66, 29.104, 3], [119.68, 29.799, 2], [119.716, 30.202, 2], [119.666, 31.633, 2], [119.662, 32.453, 2], [119.674, 32.938, 1], [119.663, 34.316, 1], [119.617, 35.522, 1], [119.688, 35.752, 1], [119.71, 36.327, 1], [119.676, 36.793, 1], [119.714, 37.042, 1], [119.627, 39.956, 3], [119.682, 40.566, 1], [119.728, 41.091, 1], [119.652, 41.42, 1], [119.703, 41.923, 1], [119.658, 42.416, 1], [119.68, 42.774, 1], [119.623, 43.288, 1], [119.697, 43.862, 1], [119.693, 44.32, 1], [119.668, 44.712, 1], [119.625, 45.44, 1], [119.665, 45.542, 1], [119.679, 46.069, 1], [119.648, 47.368, 1], [119.639, 47.4, 1], [119.732, 48.604, 1], [119.747, 49.16, 1], [119.746, 49.228, 2], [119.609, 50.223, 1], [119.739, 50.339, 1], [119.835, 26.35, 1], [119.892, 27.274, 1], [119.834, 27.624, 1], [119.834, 28.383, 1], [119.858, 28.708, 2], [119.845, 29.113, 2], [119.881, 29.507, 2], [119.836, 30.132, 2], [119.836, 30.534, 1], [119.837, 31.392, 3], [119.859, 31.893, 3], [119.848, 32.911, 2], [119.81, 33.452, 2], [119.827, 33.882, 2], [119.809, 34.344, 1], [119.794, 36.349, 2], [119.835, 36.568, 1], [119.841, 37.054, 1], [119.805, 40.011, 2], [119.821, 40.47, 1], [119.805, 40.893, 1], [119.836, 41.416, 1], [119.847, 41.785, 1], [119.906, 42.293, 1], [119.819, 42.684, 1], [119.851, 43.271, 1], [119.827, 43.77, 1], [119.878, 44.751, 1], [119.915, 45.296, 1], [119.783, 45.494, 1], [119.845, 47.175, 1], [119.857, 47.299, 1], [119.786, 48.566, 1], [119.766, 49.095, 1], [119.785, 49.233, 2], [119.783, 49.659, 1], [119.824, 50.5, 1], [119.821, 50.71, 1], [119.943, 26.364, 1], [120.013, 26.862, 2], [120.004, 27.621, 1], [119.986, 28.15, 1], [119.952, 28.494, 2], [120.013, 29.03, 3], [119.972, 30.075, 2], [120.014, 30.367, 3], [119.973, 30.973, 2], [119.975, 31.557, 2], [119.976, 31.783, 3], [119.975, 32.361, 3], [120.014, 32.798, 1], [120.002, 33.309, 1], [120.013, 33.681, 1], [120.004, 34.172, 1], [119.986, 35.82, 1], [120.014, 36.11, 3], [119.96, 37.136, 2], [120.014, 37.299, 1], [119.951, 40.069, 1], [120.014, 40.159, 1], [120, 40.752, 1], [119.988, 41.311, 1], [120, 41.697, 1], [119.935, 42.287, 1], [119.98, 42.654, 1], [119.947, 43.8, 1], [120.055, 43.917, 1], [119.995, 44.589, 1], [119.983, 45.13, 1], [120, 45.501, 1], [120.026, 46.012, 1], [120.001, 46.705, 1], [119.96, 47.184, 1], [119.991, 48.274, 1], [119.961, 48.728, 1], [119.975, 49.252, 1], [119.984, 49.775, 1], [120.03, 50.078, 1], [120.056, 51.025, 1], [120.196, 27.184, 2], [120.185, 27.473, 2], [120.123, 28.6, 1], [120.133, 29.353, 3], [120.165, 29.9, 3], [120.167, 30.288, 3], [120.128, 30.851, 3], [120.116, 31.511, 2], [120.163, 31.747, 3], [120.16, 32.27, 2], [120.146, 32.624, 2], [120.151, 33.358, 3], [120.174, 33.62, 1], [120.17, 35.991, 3], [120.16, 36.435, 2], [120.162, 36.859, 1], [120.151, 40.22, 1], [120.158, 40.67, 1], [120.135, 41.128, 1], [120.177, 42.049, 1], [120.181, 42.918, 1], [120.162, 43.444, 1], [120.099, 43.883, 1], [120.185, 44.415, 1], [120.131, 44.822, 1], [120.159, 45.338, 1], [120.199, 45.696, 1], [120.178, 49.172, 1], [120.211, 49.306, 1], [120.179, 50.199, 1], [120.183, 50.279, 1], [120.331, 27.55, 2], [120.275, 28.462, 1], [120.282, 29.018, 2], [120.29, 29.248, 2], [120.28, 29.823, 3], [120.296, 30.804, 3], [120.287, 31.433, 2], [120.315, 31.647, 3], [120.293, 32.055, 3], [120.319, 32.744, 2], [120.304, 33.122, 2], [120.301, 33.965, 1], [120.352, 36.078, 3], [120.355, 36.24, 3], [120.317, 36.818, 1], [120.331, 37.367, 1], [120.378, 37.516, 1], [120.304, 40.295, 1], [120.344, 40.349, 1], [120.313, 41.086, 1], [120.343, 41.548, 1], [120.319, 41.917, 1], [120.284, 42.461, 1], [120.271, 43.374, 1], [120.357, 43.892, 1], [120.293, 44.357, 1], [120.346, 44.701, 1], [120.324, 45.096, 1], [120.322, 45.788, 1], [120.348, 46.227, 1], [120.324, 46.755, 1], [120.378, 47.308, 1], [120.357, 49.024, 1], [120.344, 50.039, 1], [120.267, 50.314, 1], [120.254, 50.679, 1], [120.468, 27.527, 3], [120.5, 27.915, 2], [120.491, 28.189, 1], [120.457, 28.929, 1], [120.445, 29.284, 1], [120.476, 30.165, 3], [120.471, 30.722, 3], [120.457, 31.613, 3], [120.483, 31.981, 3], [120.482, 32.532, 2], [120.463, 33.154, 2], [120.444, 33.493, 1], [120.429, 33.809, 1], [120.407, 36.074, 3], [120.441, 36.221, 3], [120.506, 37.57, 1], [120.471, 40.437, 1], [120.477, 40.901, 1], [120.481, 41.757, 1], [120.437, 42.492, 1], [120.478, 42.736, 1], [120.463, 43.308, 1], [120.431, 43.633, 1], [120.469, 44.321, 1], [120.51, 44.709, 1], [120.446, 45.001, 1], [120.465, 45.575, 1], [120.498, 45.967, 1], [120.521, 46.511, 1], [120.478, 47.364, 1], [120.5, 49.271, 1], [120.473, 49.543, 1], [120.469, 50.284, 1], [120.576, 27.551, 2], [120.642, 27.935, 3], [120.63, 28.778, 1], [120.637, 29.327, 1], [120.633, 29.697, 1], [120.608, 30.066, 3], [120.629, 31.205, 3], [120.638, 31.414, 3], [120.613, 31.929, 3], [120.598, 32.416, 2], [120.635, 32.927, 1], [120.638, 33.281, 1], [120.631, 36.259, 1], [120.664, 37.03, 2], [120.613, 40.504, 1], [120.648, 41.225, 1], [120.624, 41.777, 1], [120.658, 42.239, 1], [120.667, 42.837, 1], [120.664, 43.034, 1], [120.599, 44.119, 1], [120.658, 44.507, 1], [120.604, 44.921, 1], [120.634, 45.503, 1], [120.645, 46.057, 1], [120.709, 46.718, 1], [120.559, 47.418, 1], [120.598, 49.587, 1], [120.775, 27.922, 3], [120.808, 28.101, 2], [120.757, 28.857, 2], [120.769, 29.195, 1], [120.81, 30.053, 2], [120.764, 30.698, 3], [120.787, 30.976, 3], [120.811, 31.97, 3], [120.789, 32.356, 2], [120.787, 32.793, 1], [120.764, 33.213, 1], [120.727, 36.348, 1], [120.768, 36.609, 1], [120.734, 36.981, 2], [120.821, 37.381, 2], [120.839, 37.747, 1], [120.77, 41.8, 1], [120.818, 42.073, 1], [120.785, 42.613, 1], [120.803, 42.96, 1], [120.772, 43.492, 1], [120.749, 44.468, 1], [120.779, 44.857, 1], [120.833, 45.281, 1], [120.753, 46.269, 1], [120.798, 46.728, 1], [120.762, 47.583, 1], [120.817, 48.034, 1], [120.784, 51.269, 1], [120.868, 27.94, 1], [120.94, 28.075, 3], [120.967, 28.603, 1], [120.959, 29.108, 2], [120.908, 29.52, 2], [120.909, 30.051, 2], [120.942, 30.547, 2], [120.952, 30.842, 3], [120.921, 31.952, 3], [120.942, 32.298, 2], [120.97, 32.582, 1], [120.946, 36.986, 1], [120.93, 37.496, 1], [120.946, 37.717, 1], [120.898, 40.756, 2], [120.95, 41.018, 1], [120.968, 41.586, 1], [120.925, 42.032, 1], [120.94, 42.54, 1], [120.954, 42.917, 1], [120.946, 43.462, 1], [120.914, 44.552, 1], [120.953, 44.589, 1], [121, 45.239, 1], [120.921, 45.551, 1], [120.952, 47.546, 1], [120.893, 49.075, 1], [120.921, 49.225, 1], [120.876, 50.934, 1], [121.056, 27.865, 1], [121.067, 28.199, 2], [121.132, 28.461, 1], [121.116, 28.949, 2], [121.085, 29.519, 1], [121.133, 30.065, 3], [121.117, 30.296, 2], [121.089, 30.84, 2], [121.101, 31.324, 3], [121.092, 32.145, 2], [121.088, 32.516, 1], [121.049, 36.603, 1], [121.149, 36.782, 1], [121.103, 37.336, 1], [121.121, 37.615, 2], [121.165, 38.812, 1], [121.026, 40.751, 1], [121.134, 41.102, 3], [121.117, 41.451, 1], [121.075, 42.43, 1], [121.08, 42.804, 1], [121.065, 43.297, 1], [121.103, 43.633, 1], [121.11, 44.035, 1], [121.092, 44.672, 1], [121.113, 45.143, 1], [121.109, 46.037, 1], [121.121, 47.53, 1], [121.057, 49.073, 1], [121.248, 28.156, 2], [121.273, 28.546, 3], [121.246, 28.868, 2], [121.248, 29.928, 2], [121.265, 30.21, 3], [121.272, 31.206, 3], [121.229, 31.738, 2], [121.229, 32.199, 2], [121.214, 36.763, 1], [121.257, 37.278, 1], [121.265, 37.543, 3], [121.286, 38.85, 2], [121.287, 39.558, 1], [121.212, 41.081, 1], [121.265, 41.385, 1], [121.27, 41.704, 1], [121.268, 42.287, 1], [121.269, 42.714, 1], [121.311, 43.616, 1], [121.267, 43.998, 1], [121.237, 45.103, 1], [121.279, 45.549, 1], [121.29, 45.799, 1], [121.245, 46.711, 1], [121.249, 48.886, 1], [121.202, 49.084, 1], [121.262, 49.698, 1], [121.241, 50.651, 1], [121.387, 28.497, 3], [121.428, 28.694, 3], [121.427, 29.301, 2], [121.436, 29.791, 3], [121.404, 30.175, 2], [121.379, 30.793, 2], [121.427, 31.208, 3], [121.398, 32.007, 2], [121.378, 36.754, 1], [121.405, 37.133, 1], [121.403, 37.515, 3], [121.416, 38.935, 2], [121.468, 39.619, 1], [121.403, 40.991, 1], [121.378, 41.178, 1], [121.43, 41.745, 1], [121.423, 42.075, 1], [121.394, 42.576, 1], [121.378, 43.127, 1], [121.373, 43.556, 1], [121.42, 43.834, 1], [121.451, 44.475, 1], [121.424, 45.399, 1], [121.406, 45.691, 1], [121.394, 46.321, 1], [121.372, 47.415, 1], [121.411, 49.567, 1], [121.393, 49.891, 1], [121.451, 50.829, 1], [121.502, 28.542, 1], [121.536, 28.754, 2], [121.57, 29.246, 1], [121.562, 29.855, 3], [121.586, 30.003, 2], [121.541, 31.214, 3], [121.562, 31.354, 3], [121.555, 31.871, 1], [121.521, 36.784, 1], [121.548, 36.935, 2], [121.585, 37.405, 2], [121.584, 38.944, 3], [121.603, 39.188, 1], [121.563, 39.683, 1], [121.611, 40.863, 1], [121.575, 41.58, 1], [121.618, 42.005, 1], [121.597, 42.506, 1], [121.625, 42.854, 1], [121.572, 43.434, 1], [121.566, 43.763, 1], [121.503, 44.541, 1], [121.499, 45.014, 1], [121.574, 45.374, 1], [121.599, 45.644, 1], [121.574, 46.12, 1], [121.613, 46.437, 1], [121.635, 47.206, 1], [121.615, 47.632, 1], [121.542, 50.784, 1], [121.512, 51.344, 1], [121.664, 28.854, 1], [121.686, 29.772, 2], [121.716, 29.941, 3], [121.711, 31.115, 3], [121.696, 31.311, 2], [121.714, 36.884, 1], [121.694, 37.387, 1], [121.653, 38.937, 2], [121.744, 39.085, 3], [121.734, 39.668, 1], [121.747, 39.915, 1], [121.688, 41.107, 1], [121.76, 41.449, 1], [121.69, 42.033, 2], [121.727, 42.343, 1], [121.775, 42.757, 1], [121.694, 43.426, 1], [121.731, 43.761, 1], [121.709, 44.081, 1], [121.711, 44.675, 1], [121.726, 45.078, 1], [121.738, 45.562, 1], [121.711, 46.117, 1], [121.711, 46.398, 1], [121.667, 47.158, 1], [121.764, 47.297, 1], [121.684, 48.826, 1], [121.689, 50.49, 1], [121.751, 51.56, 1], [121.906, 29.205, 1], [121.884, 29.508, 2], [121.846, 29.914, 3], [121.893, 30.39, 1], [121.841, 31.013, 2], [121.884, 36.974, 1], [121.877, 37.196, 1], [121.834, 39.087, 2], [121.873, 39.535, 1], [121.893, 39.943, 1], [121.873, 41.086, 1], [121.852, 41.473, 1], [121.84, 42.75, 1], [121.865, 43.262, 1], [121.883, 43.605, 1], [121.893, 44.022, 1], [121.859, 44.964, 1], [121.901, 45.517, 1], [121.88, 45.945, 1], [121.9, 46.375, 1], [121.92, 48.762, 1], [121.801, 50.136, 1], [121.874, 51.699, 1], [121.955, 29.218, 1], [121.964, 29.48, 1], [122.031, 29.962, 2], [122.056, 30.201, 1], [122.061, 30.661, 1], [122.043, 36.943, 1], [122.061, 37.2, 2], [122.01, 39.117, 1], [122, 39.53, 2], [122.081, 40.171, 1], [122.055, 40.935, 1], [122.062, 41.159, 3], [122.025, 41.711, 1], [122.03, 42.658, 1], [122.003, 43.093, 1], [122.012, 43.517, 1], [122.017, 44.007, 1], [122.072, 44.358, 1], [122.018, 44.744, 1], [122.015, 45.387, 1], [121.975, 46.033, 1], [122.072, 46.682, 1], [122.016, 47.201, 1], [122.072, 52.05, 1], [122.154, 29.991, 2], [122.197, 30.22, 1], [122.209, 31.054, 1], [122.148, 37.151, 1], [122.114, 39.162, 1], [122.16, 39.899, 1], [122.164, 40.218, 2], [122.222, 40.685, 2], [122.153, 41.178, 1], [122.138, 41.68, 1], [122.178, 42.063, 1], [122.16, 42.512, 1], [122.174, 42.981, 1], [122.236, 43.668, 1], [122.123, 44.332, 1], [122.184, 44.756, 1], [122.237, 45.308, 1], [122.17, 45.774, 1], [122.142, 46.079, 1], [122.186, 46.693, 1], [122.204, 47.08, 1], [122.197, 47.558, 1], [122.13, 48.593, 1], [122.291, 29.96, 2], [122.301, 30.348, 1], [122.327, 30.532, 1], [122.315, 37.135, 1], [122.338, 39.413, 1], [122.325, 40.309, 1], [122.311, 40.649, 2], [122.321, 41.043, 1], [122.322, 41.983, 1], [122.339, 42.399, 1], [122.358, 42.954, 1], [122.281, 43.633, 2], [122.315, 44.117, 1], [122.312, 44.652, 1], [122.35, 45.94, 1], [122.386, 46.401, 1], [122.344, 46.916, 1], [122.367, 47.469, 1], [122.269, 47.779, 1], [122.358, 52.96, 1], [122.468, 30.723, 1], [122.418, 37.126, 1], [122.478, 39.604, 1], [122.502, 40.625, 2], [122.492, 40.933, 1], [122.456, 41.395, 1], [122.469, 41.891, 1], [122.534, 42.383, 1], [122.422, 43.218, 1], [122.458, 43.696, 1], [122.496, 44.039, 1], [122.472, 44.862, 1], [122.497, 45.484, 1], [122.477, 45.808, 1], [122.503, 47.193, 1], [122.514, 47.609, 1], [122.513, 50.657, 1], [122.54, 52.979, 1], [122.569, 30.669, 1], [122.643, 39.58, 1], [122.606, 40.578, 1], [122.639, 40.852, 2], [122.614, 42.235, 1], [122.672, 43.199, 1], [122.64, 43.703, 1], [122.629, 43.947, 1], [122.66, 44.515, 1], [122.651, 44.775, 1], [122.637, 45.407, 1], [122.654, 45.719, 1], [122.648, 46.401, 1], [122.649, 46.69, 1], [122.636, 47.189, 1], [122.657, 47.599, 1], [122.684, 48.07, 1], [122.595, 52.54, 1], [122.634, 52.97, 1], [122.773, 39.625, 1], [122.791, 39.789, 1], [122.754, 40.365, 1], [122.766, 40.861, 2], [122.813, 41.145, 1], [122.753, 41.549, 2], [122.829, 42.025, 2], [122.785, 43.026, 1], [122.747, 43.594, 1], [122.778, 43.904, 1], [122.785, 44.279, 1], [122.809, 44.804, 1], [122.796, 45.34, 1], [122.837, 45.619, 2], [122.843, 46.096, 1], [122.786, 46.632, 1], [122.763, 47.119, 1], [122.785, 47.458, 1], [122.761, 47.992, 1], [122.811, 52.931, 1], [122.973, 39.711, 2], [122.975, 41.118, 3], [122.944, 41.941, 1], [122.945, 42.445, 1], [122.951, 42.894, 1], [122.953, 44.151, 1], [122.88, 45.621, 1], [122.968, 45.951, 1], [122.909, 46.724, 1], [122.924, 46.842, 1], [122.915, 47.853, 1], [122.966, 48.183, 1], [123.082, 39.779, 1], [123.095, 40.113, 1], [123.051, 41.137, 3], [123.098, 41.844, 2], [123.089, 42.343, 1], [123.087, 42.722, 1], [123.081, 43.212, 1], [123.06, 43.747, 1], [123.068, 44.148, 1], [123.09, 44.787, 1], [123.095, 44.83, 1], [123.054, 45.477, 1], [123.049, 45.972, 1], [123.081, 46.462, 1], [123.051, 47.002, 1], [123.095, 47.255, 1], [123.101, 47.774, 1], [123.092, 48.52, 1], [123.056, 50.614, 1], [123.086, 50.644, 1], [123.158, 52.871, 1], [123.207, 39.737, 1], [123.269, 39.89, 1], [123.281, 40.312, 1], [123.2, 40.984, 1], [123.2, 41.273, 3], [123.256, 41.779, 3], [123.231, 42.268, 1], [123.23, 42.645, 1], [123.208, 43.599, 1], [123.255, 44.098, 1], [123.202, 44.418, 1], [123.241, 44.933, 1], [123.242, 45.427, 1], [123.213, 45.855, 1], [123.263, 46.222, 1], [123.245, 46.668, 1], [123.204, 47.318, 1], [123.242, 47.609, 1], [123.169, 52.864, 1], [123.379, 40.779, 1], [123.361, 41.358, 2], [123.401, 41.798, 3], [123.392, 43.044, 1], [123.373, 43.546, 1], [123.335, 44.094, 1], [123.398, 44.405, 1], [123.397, 45.307, 1], [123.4, 45.611, 1], [123.363, 46.211, 1], [123.425, 46.428, 1], [123.395, 47.081, 1], [123.407, 47.395, 1], [123.396, 47.98, 1], [123.43, 48.202, 1], [123.434, 48.698, 1], [123.367, 50.57, 1], [123.566, 39.893, 1], [123.545, 40.353, 1], [123.513, 40.644, 1], [123.487, 41.79, 3], [123.539, 41.93, 2], [123.554, 42.459, 2], [123.533, 43.769, 1], [123.507, 47.092, 1], [123.576, 47.223, 1], [123.516, 47.918, 1], [123.472, 48.138, 1], [123.467, 48.693, 1], [123.483, 49.16, 1], [123.58, 51.763, 1], [123.602, 52.04, 1], [123.653, 40.125, 1], [123.636, 40.724, 1], [123.687, 41.201, 1], [123.68, 41.899, 2], [123.687, 42.802, 1], [123.667, 43.638, 1], [123.683, 44.185, 1], [123.704, 45.997, 1], [123.698, 46.362, 1], [123.691, 46.829, 1], [123.647, 47.651, 1], [123.675, 48.144, 1], [123.686, 48.606, 1], [123.737, 49.173, 1], [123.745, 49.259, 1], [123.615, 49.836, 1], [123.639, 52.075, 1], [123.667, 53.29, 1], [123.778, 39.88, 1], [123.827, 39.999, 1], [123.849, 40.412, 1], [123.78, 41.079, 1], [123.788, 41.308, 2], [123.827, 41.863, 2], [123.848, 42.297, 2], [123.836, 42.759, 1], [123.828, 43.202, 1], [123.817, 44.537, 1], [123.868, 44.908, 1], [123.785, 45.574, 1], [123.802, 46.801, 1], [123.805, 47.21, 1], [123.833, 47.476, 1], [123.801, 48.482, 1], [123.843, 48.932, 1], [123.773, 49.218, 1], [123.884, 49.597, 1], [123.876, 50.544, 1], [123.881, 52.707, 1], [123.955, 39.946, 1], [123.99, 40.499, 1], [123.94, 40.798, 1], [123.942, 41.359, 1], [123.937, 41.873, 2], [123.979, 43.097, 1], [123.957, 43.573, 1], [123.989, 43.868, 1], [124.025, 44.994, 1], [123.976, 45.625, 1], [123.946, 46.336, 1], [123.939, 47.201, 1], [123.969, 47.35, 3], [123.97, 48.08, 1], [123.98, 49.28, 1], [124.006, 50.482, 1], [123.937, 51.173, 1], [124.137, 39.952, 1], [124.084, 40.453, 2], [124.127, 41.301, 1], [124.113, 41.982, 1], [124.111, 42.858, 2], [124.126, 43.38, 1], [124.133, 43.776, 1], [124.121, 44.319, 1], [124.101, 44.719, 1], [124.144, 45.583, 1], [124.116, 46.045, 1], [124.127, 46.462, 1], [124.123, 46.957, 1], [124.104, 47.39, 1], [124.116, 48.176, 1], [124.129, 48.745, 1], [124.133, 49.053, 1], [124.077, 49.404, 1], [124.133, 50.426, 1], [124.16, 51.628, 1], [124.242, 39.974, 1], [124.299, 40.175, 1], [124.267, 40.626, 1], [124.255, 41.015, 1], [124.238, 41.66, 1], [124.268, 42.001, 1], [124.272, 42.945, 1], [124.303, 43.327, 1], [124.255, 43.703, 1], [124.287, 44.213, 1], [124.24, 45.88, 1], [124.278, 46.469, 1], [124.237, 47.673, 1], [124.302, 48.223, 1], [124.283, 48.513, 1], [124.235, 49.544, 1], [124.311, 49.887, 1], [124.216, 50.36, 1], [124.287, 50.831, 1], [124.409, 40.56, 1], [124.425, 41.303, 1], [124.404, 42.833, 1], [124.378, 43.188, 3], [124.421, 43.699, 1], [124.428, 44.053, 1], [124.429, 44.578, 1], [124.412, 44.975, 1], [124.409, 45.726, 1], [124.433, 46.203, 1], [124.413, 47.338, 1], [124.395, 47.586, 1], [124.472, 47.806, 1], [124.427, 48.43, 1], [124.445, 49.245, 1], [124.402, 49.751, 1], [124.408, 50.378, 1], [124.511, 40.235, 1], [124.546, 40.556, 1], [124.567, 40.928, 1], [124.536, 41.364, 1], [124.563, 42.302, 1], [124.568, 42.624, 1], [124.574, 43.435, 1], [124.587, 43.918, 1], [124.552, 44.369, 1], [124.59, 46.055, 1], [124.528, 46.696, 1], [124.555, 46.856, 1], [124.572, 47.448, 1], [124.61, 49.747, 1], [124.557, 49.948, 1], [124.585, 51.88, 1], [124.6, 52.537, 1], [124.703, 40.369, 1], [124.711, 40.812, 1], [124.668, 41.775, 1], [124.729, 42.713, 1], [124.702, 43.043, 1], [124.68, 43.508, 1], [124.721, 43.838, 1], [124.666, 44.356, 1], [124.705, 44.755, 1], [124.691, 45.173, 1], [124.684, 45.956, 1], [124.722, 46.323, 1], [124.702, 47.019, 1], [124.68, 47.762, 1], [124.692, 48.317, 1], [124.7, 48.632, 1], [124.661, 49.221, 1], [124.642, 49.677, 1], [124.694, 49.807, 1], [124.713, 52.311, 1], [124.722, 52.346, 1], [124.818, 41.352, 1], [124.839, 41.682, 1], [124.868, 42.463, 1], [124.831, 43.783, 1], [124.836, 44.208, 1], [124.838, 44.634, 1], [124.848, 45.559, 1], [124.826, 46.042, 1], [124.876, 46.479, 2], [124.883, 46.633, 2], [124.876, 47.188, 1], [124.847, 47.601, 1], [124.836, 48.118, 1], [124.883, 48.488, 2], [124.856, 49.54, 1], [124.829, 49.763, 1], [124.935, 40.466, 1], [124.942, 40.703, 1], [124.999, 41.524, 1], [124.975, 41.967, 2], [124.975, 42.35, 1], [124.994, 43.27, 1], [125.002, 44.044, 1], [124.996, 44.981, 1], [124.984, 45.367, 1], [124.993, 45.862, 1], [124.981, 46.296, 1], [125.003, 46.622, 2], [125.024, 47.681, 1], [125.02, 48.13, 1], [124.955, 48.461, 1], [125.019, 48.712, 1], [124.991, 49.405, 1], [124.998, 49.52, 1], [124.941, 50.067, 1], [125.18, 40.719, 1], [125.185, 40.986, 1], [125.132, 41.373, 1], [125.108, 41.813, 1], [125.131, 42.236, 1], [125.147, 42.898, 2], [125.161, 42.962, 1], [125.174, 43.956, 2], [125.174, 44.445, 2], [125.129, 44.814, 1], [125.089, 45.515, 1], [125.102, 45.705, 1], [125.111, 46.063, 1], [125.125, 47.018, 1], [125.154, 47.493, 1], [125.104, 47.919, 1], [125.152, 48.389, 1], [125.15, 48.79, 1], [125.151, 49.429, 1], [125.271, 40.936, 1], [125.286, 41.298, 1], [125.298, 41.776, 1], [125.295, 42.661, 1], [125.264, 43.008, 1], [125.308, 43.381, 1], [125.297, 43.88, 3], [125.293, 44.67, 1], [125.294, 45.13, 1], [125.281, 45.71, 1], [125.344, 46.882, 1], [125.255, 47.425, 1], [125.291, 48.165, 1], [125.282, 48.591, 1], [125.24, 49.144, 2], [125.281, 49.496, 1], [125.423, 40.792, 1], [125.394, 41.669, 1], [125.432, 42.43, 1], [125.403, 42.874, 1], [125.415, 43.405, 1], [125.39, 43.873, 3], [125.432, 44.141, 1], [125.413, 44.653, 1], [125.416, 45.065, 1], [125.432, 45.467, 1], [125.375, 46.409, 1], [125.436, 46.706, 1], [125.386, 47.454, 1], [125.416, 47.611, 1], [125.414, 48.256, 1], [125.417, 48.546, 1], [125.435, 49.326, 1], [125.438, 50.58, 1], [125.413, 52.435, 1], [125.551, 41.121, 1], [125.537, 43.246, 1], [125.534, 43.732, 1], [125.574, 44.51, 1], [125.589, 45.434, 1], [125.579, 45.948, 1], [125.565, 46.681, 1], [125.558, 47.154, 1], [125.555, 47.62, 1], [125.513, 48.138, 1], [125.519, 48.505, 1], [125.524, 48.724, 1], [125.544, 49.574, 1], [125.507, 52.409, 1], [125.755, 41.756, 1], [125.711, 42.594, 1], [125.702, 43.184, 1], [125.673, 43.547, 2], [125.688, 44.019, 1], [125.709, 44.53, 2], [125.685, 44.891, 1], [125.709, 45.233, 1], [125.686, 45.729, 1], [125.685, 46.132, 1], [125.711, 46.571, 1], [125.695, 47.012, 1], [125.671, 47.407, 1], [125.695, 47.793, 1], [125.682, 48.412, 1], [125.703, 48.619, 1], [125.715, 49.544, 1], [125.722, 50.125, 1], [125.84, 41.391, 1], [125.805, 41.717, 1], [125.825, 42.273, 1], [125.849, 42.655, 1], [125.833, 43.564, 1], [125.842, 44.051, 1], [125.849, 44.192, 1], [125.878, 45.647, 1], [125.847, 46.07, 1], [125.829, 46.575, 1], [125.834, 46.944, 1], [125.894, 47.216, 1], [125.83, 47.811, 1], [125.874, 48.049, 1], [125.868, 48.561, 1], [125.773, 49.274, 1], [125.858, 49.828, 1], [125.814, 50.379, 1], [125.843, 51.229, 1], [125.776, 52.073, 1], [125.961, 41.737, 2], [125.989, 42.132, 1], [126.034, 42.671, 1], [126.009, 42.94, 1], [126.002, 43.329, 1], [125.993, 43.765, 1], [125.961, 44.24, 1], [125.977, 44.756, 1], [126.027, 45.021, 1], [125.98, 45.498, 1], [125.988, 46.061, 2], [126.012, 46.332, 1], [125.991, 46.858, 1], [125.921, 47.188, 1], [125.98, 47.675, 1], [125.968, 48.052, 1], [125.988, 48.479, 1], [126.025, 48.981, 1], [125.973, 49.569, 1], [125.971, 49.676, 1], [126.008, 50.174, 1], [125.985, 52.249, 1], [126.128, 41.284, 1], [126.152, 42.09, 1], [126.079, 42.612, 1], [126.077, 42.936, 1], [126.117, 43.787, 1], [126.139, 44.601, 1], [126.126, 44.935, 1], [126.095, 46.243, 1], [126.117, 46.691, 1], [126.114, 47.165, 1], [126.103, 47.606, 1], [126.128, 47.962, 1], [126.105, 48.427, 1], [126.145, 48.686, 1], [126.264, 41.604, 1], [126.276, 41.853, 1], [126.249, 43.159, 1], [126.263, 43.68, 1], [126.262, 44.032, 1], [126.283, 44.955, 1], [126.292, 45.35, 2], [126.254, 46.61, 1], [126.243, 47.131, 1], [126.259, 48.044, 1], [126.211, 48.481, 1], [126.223, 48.676, 1], [126.262, 49.184, 1], [126.259, 49.486, 1], [126.432, 41.946, 2], [126.413, 42.345, 1], [126.39, 42.588, 1], [126.442, 42.98, 1], [126.424, 43.604, 1], [126.423, 43.975, 1], [126.381, 44.411, 1], [126.397, 44.798, 1], [126.363, 45.336, 1], [126.403, 45.985, 1], [126.404, 46.558, 1], [126.431, 47.268, 1], [126.416, 47.707, 1], [126.431, 48.202, 1], [126.413, 48.415, 1], [126.386, 49.051, 1], [126.383, 49.885, 1], [126.404, 51.06, 1], [126.492, 41.926, 1], [126.589, 42.047, 1], [126.541, 43.032, 1], [126.51, 43.644, 1], [126.563, 43.857, 3], [126.54, 44.319, 1], [126.553, 44.818, 2], [126.547, 45.162, 1], [126.56, 45.697, 2], [126.57, 45.822, 3], [126.532, 46.438, 1], [126.491, 46.837, 1], [126.537, 47.261, 1], [126.549, 47.56, 1], [126.518, 48.251, 1], [126.561, 48.436, 1], [126.577, 48.796, 1], [126.479, 49.218, 1], [126.592, 50.263, 1], [126.718, 41.761, 1], [126.698, 42.378, 1], [126.733, 42.972, 1], [126.674, 43.297, 1], [126.681, 44.207, 1], [126.672, 44.623, 1], [126.683, 44.978, 1], [126.694, 46.297, 1], [126.677, 47.173, 1], [126.706, 47.537, 1], [126.714, 48.082, 1], [126.641, 48.516, 1], [126.685, 48.681, 1], [126.666, 51.733, 1], [126.828, 41.752, 1], [126.831, 42.024, 1], [126.814, 42.389, 1], [126.762, 42.978, 1], [126.814, 43.219, 1], [126.796, 43.762, 1], [126.8, 44.244, 1], [126.809, 44.939, 1], [126.826, 45.31, 1], [126.788, 45.756, 2], [126.813, 46.204, 1], [126.818, 46.616, 1], [126.803, 47.386, 1], [126.788, 47.818, 1], [126.769, 48.143, 1], [126.822, 48.7, 1], [126.873, 48.948, 1], [126.881, 50.531, 1], [126.874, 51.165, 1], [126.925, 41.845, 1], [126.941, 42.311, 1], [126.96, 42.752, 1], [126.937, 43.075, 1], [126.913, 43.722, 1], [126.94, 43.928, 1], [126.956, 44.416, 1], [126.936, 44.826, 1], [126.943, 45.223, 1], [126.975, 45.567, 2], [126.99, 46.635, 2], [126.987, 46.915, 1], [126.967, 47.458, 2], [126.936, 47.664, 1], [126.976, 48.138, 1], [127.014, 48.421, 1], [126.969, 49.681, 1], [126.94, 50.654, 1], [127.053, 41.786, 1], [127.099, 42.155, 1], [127.084, 43.046, 1], [127.093, 43.401, 1], [127.083, 44.417, 1], [127.102, 44.739, 1], [127.123, 45.029, 1], [127.067, 45.577, 1], [127.097, 46.75, 1], [127.118, 47.251, 1], [127.105, 47.696, 1], [127.093, 47.957, 1], [127.103, 48.712, 1], [127.157, 49.195, 1], [127.148, 49.54, 1], [127.033, 50.383, 1], [127.102, 50.599, 1], [127.244, 41.608, 1], [127.224, 42.205, 1], [127.279, 42.347, 1], [127.208, 43.129, 1], [127.222, 43.467, 1], [127.26, 43.796, 1], [127.24, 44.22, 1], [127.171, 44.929, 2], [127.205, 45.424, 1], [127.195, 45.797, 1], [127.205, 46.237, 1], [127.214, 48.326, 1], [127.285, 49.44, 1], [127.235, 50.1, 1], [127.348, 41.564, 1], [127.304, 42.274, 1], [127.349, 43.337, 1], [127.347, 43.739, 1], [127.342, 44.612, 1], [127.405, 46.095, 1], [127.382, 47.349, 1], [127.347, 47.939, 1], [127.399, 48.74, 1], [127.373, 49.943, 1], [127.388, 50.25, 1], [127.522, 41.519, 1], [127.509, 42.113, 1], [127.506, 42.216, 1], [127.492, 42.86, 1], [127.541, 43.617, 1], [127.492, 45.759, 2], [127.478, 46.121, 1], [127.493, 46.458, 1], [127.516, 46.888, 1], [127.503, 47.407, 1], [127.519, 48.07, 1], [127.5, 49.443, 1], [127.5, 49.975, 1], [127.65, 41.514, 1], [127.613, 42.001, 1], [127.641, 42.187, 1], [127.691, 42.528, 1], [127.619, 43.04, 1], [127.585, 43.602, 1], [127.612, 43.952, 1], [127.607, 44.876, 1], [127.634, 45.15, 1], [127.623, 45.732, 1], [127.634, 45.946, 1], [127.612, 46.453, 1], [127.642, 46.868, 1], [127.634, 47.066, 1], [127.676, 47.598, 1], [127.649, 49.357, 1], [127.594, 50.227, 1], [127.758, 41.867, 1], [127.771, 42.155, 1], [127.793, 42.552, 1], [127.805, 43, 1], [127.755, 43.616, 1], [127.721, 43.837, 1], [127.729, 44.48, 1], [127.766, 44.654, 1], [127.76, 45.137, 1], [127.832, 45.288, 1], [127.769, 45.937, 1], [127.801, 46.292, 1], [127.773, 46.972, 1], [127.777, 47.569, 1], [127.755, 48.681, 1], [127.795, 49.272, 1], [127.786, 49.574, 1], [127.957, 41.546, 1], [127.935, 41.922, 1], [127.92, 42.351, 1], [127.855, 42.788, 1], [127.863, 43.54, 1], [127.911, 44.284, 1], [127.901, 44.645, 1], [127.883, 45.153, 1], [127.96, 45.24, 1], [127.907, 45.809, 1], [127.888, 46.288, 1], [127.893, 46.969, 1], [127.849, 47.564, 1], [127.913, 47.76, 1], [127.969, 49.137, 1], [127.936, 49.47, 1], [128.074, 41.573, 1], [128.061, 42.04, 1], [128.045, 42.469, 1], [128.042, 42.859, 1], [128.056, 43.172, 1], [128.025, 43.562, 1], [128.054, 43.926, 1], [128.009, 44.688, 1], [127.999, 45.211, 1], [128.057, 45.792, 1], [128.049, 45.966, 1], [127.992, 49.173, 1], [128.079, 49.375, 1], [128.142, 42.409, 1], [128.173, 42.669, 1], [128.23, 43.387, 2], [128.216, 44.339, 1], [128.237, 44.732, 1], [128.171, 45.232, 1], [128.146, 45.509, 1], [128.16, 46.266, 1], [128.167, 46.942, 1], [128.143, 49.323, 1], [128.313, 42.621, 1], [128.328, 42.894, 1], [128.264, 43.382, 1], [128.335, 43.778, 1], [128.356, 44.225, 1], [128.36, 44.831, 1], [128.297, 45.196, 1], [128.334, 45.459, 1], [128.336, 46.237, 1], [128.437, 42.554, 1], [128.382, 43.048, 1], [128.442, 43.451, 1], [128.454, 44.318, 1], [128.413, 44.962, 1], [128.453, 45.496, 1], [128.435, 45.789, 1], [128.472, 46.013, 1], [128.389, 47.316, 1], [128.427, 48.434, 1], [128.623, 42.48, 1], [128.529, 42.965, 1], [128.528, 43.298, 1], [128.592, 43.704, 1], [128.556, 44.121, 1], [128.613, 44.941, 1], [128.58, 45.727, 1], [128.575, 46.119, 1], [128.524, 46.414, 1], [128.612, 47.031, 1], [128.54, 47.396, 1], [128.523, 47.621, 1], [128.541, 48.048, 1], [128.532, 49.357, 1], [128.706, 42.463, 1], [128.685, 43.721, 1], [128.721, 43.837, 1], [128.702, 44.889, 1], [128.769, 45.206, 1], [128.701, 45.735, 1], [128.751, 45.98, 1], [128.705, 46.983, 1], [128.714, 47.419, 1], [128.686, 47.731, 1], [128.763, 48.792, 1], [128.812, 42.05, 1], [128.791, 42.362, 1], [128.87, 42.637, 1], [128.854, 43.152, 1], [128.854, 43.814, 1], [128.884, 44.22, 1], [128.799, 44.876, 1], [128.814, 45.131, 1], [128.804, 45.5, 1], [128.836, 45.864, 1], [128.796, 46.181, 1], [128.8, 46.844, 1], [128.88, 46.959, 1], [128.852, 47.728, 1], [128.885, 47.763, 1], [129, 42.367, 1], [129.011, 42.547, 1], [128.924, 43.114, 1], [128.942, 43.806, 1], [128.971, 44.136, 1], [128.938, 44.487, 1], [128.945, 44.97, 1], [128.928, 45.386, 1], [128.969, 45.927, 1], [128.93, 47.761, 1], [128.919, 49.127, 1], [129.114, 42.673, 1], [129.133, 42.904, 1], [129.135, 43.763, 1], [129.122, 44.134, 1], [129.104, 44.476, 1], [129.09, 44.81, 1], [129.089, 45.885, 1], [129.129, 46.039, 1], [129.127, 46.632, 1], [129.061, 47.039, 1], [129.119, 47.678, 1], [129.094, 48.596, 1], [129.056, 48.95, 1], [129.218, 42.273, 1], [129.23, 42.793, 1], [129.231, 43.154, 1], [129.22, 44.119, 1], [129.21, 44.411, 1], [129.195, 44.752, 1], [129.257, 46.005, 1], [129.206, 46.29, 1], [129.188, 46.754, 1], [129.286, 47.144, 1], [129.255, 47.544, 1], [129.249, 48.115, 1], [129.3, 49.363, 1], [129.418, 42.459, 1], [129.411, 42.809, 1], [129.36, 42.965, 1], [129.381, 43.431, 1], [129.402, 43.829, 1], [129.366, 44.283, 1], [129.397, 44.585, 1], [129.373, 45.137, 1], [129.349, 45.621, 1], [129.33, 46.036, 1], [129.396, 46.186, 1], [129.324, 47.148, 1], [129.317, 47.489, 1], [129.338, 48.168, 1], [129.44, 42.783, 1], [129.512, 42.911, 3], [129.515, 43.351, 1], [129.466, 43.717, 1], [129.479, 44.352, 1], [129.518, 44.49, 1], [129.523, 45.017, 1], [129.53, 46.004, 1], [129.532, 46.5, 1], [129.443, 47.423, 1], [129.515, 47.773, 1], [129.536, 48.294, 1], [129.446, 48.596, 1], [129.451, 49.04, 1], [129.576, 42.644, 1], [129.598, 42.931, 1], [129.648, 43.375, 1], [129.638, 43.606, 1], [129.592, 44.244, 1], [129.619, 44.591, 3], [129.668, 44.814, 1], [129.574, 45.343, 1], [129.617, 45.637, 1], [129.577, 46.317, 1], [129.627, 46.624, 1], [129.66, 46.893, 1], [129.607, 47.376, 1], [129.58, 48.459, 1], [129.645, 49.286, 1], [129.747, 42.494, 1], [129.757, 42.902, 1], [129.774, 43.306, 1], [129.721, 43.692, 1], [129.704, 44.783, 1], [129.774, 45.217, 1], [129.776, 45.612, 1], [129.751, 46.155, 1], [129.764, 46.548, 1], [129.773, 46.666, 1], [129.776, 47.335, 1], [129.853, 42.974, 1], [129.863, 43.101, 1], [129.861, 43.492, 1], [129.915, 44.08, 1], [129.878, 44.561, 1], [129.915, 44.622, 1], [129.896, 45.012, 1], [129.883, 45.446, 1], [129.888, 46.075, 1], [129.879, 46.372, 1], [129.91, 46.733, 1], [129.859, 48.104, 1], [129.877, 48.667, 1], [129.885, 49.041, 1], [130.01, 43.009, 1], [130.025, 44.733, 1], [130.007, 44.975, 1], [130.012, 45.812, 1], [130.025, 46.214, 1], [130.012, 46.93, 1], [130.047, 48.895, 1], [130.175, 43.025, 1], [130.122, 43.251, 1], [130.146, 44.009, 1], [130.189, 44.522, 1], [130.165, 45.049, 1], [130.158, 45.29, 1], [130.16, 45.617, 1], [130.125, 46.146, 1], [130.137, 46.627, 1], [130.151, 47.382, 1], [130.158, 48.405, 1], [130.304, 42.886, 1], [130.272, 43.457, 1], [130.221, 44.133, 1], [130.267, 44.527, 1], [130.29, 44.991, 1], [130.281, 45.298, 1], [130.294, 45.582, 1], [130.284, 46.015, 1], [130.301, 46.821, 1], [130.284, 47.301, 2], [130.253, 48.387, 1], [130.283, 48.838, 1], [130.353, 43.732, 1], [130.341, 44.603, 1], [130.417, 44.683, 1], [130.393, 45.218, 1], [130.438, 45.433, 1], [130.423, 46.354, 1], [130.371, 47.235, 1], [130.459, 47.557, 1], [130.528, 42.95, 1], [130.495, 43.748, 1], [130.505, 44.71, 1], [130.538, 44.957, 1], [130.557, 45.47, 1], [130.571, 45.78, 1], [130.572, 46.246, 2], [130.495, 46.8, 1], [130.538, 47.448, 1], [130.547, 47.704, 1], [130.683, 45.081, 1], [130.697, 45.337, 1], [130.648, 46.568, 1], [130.672, 47.263, 1], [130.687, 47.628, 1], [130.664, 48.106, 1], [130.803, 44.273, 1], [130.798, 44.472, 1], [130.738, 45.1, 1], [130.795, 45.285, 1], [130.798, 45.791, 1], [130.779, 46.067, 1], [130.797, 46.387, 1], [130.734, 47.014, 1], [130.833, 47.144, 1], [130.797, 47.982, 1], [130.884, 43.697, 1], [130.886, 44.005, 1], [130.931, 45.284, 1], [130.908, 45.71, 1], [130.936, 45.83, 1], [130.878, 46.273, 1], [130.919, 46.896, 1], [130.912, 47.126, 1], [130.884, 47.572, 1], [131.055, 43.972, 1], [130.973, 44.58, 1], [130.988, 45.3, 2], [131.026, 45.363, 1], [131.028, 45.782, 2], [131.048, 46.74, 1], [131.057, 47.004, 1], [130.98, 47.406, 1], [131.127, 44.068, 1], [131.158, 44.314, 2], [131.192, 44.428, 1], [131.146, 45.783, 1], [131.217, 46.241, 1], [131.172, 46.992, 1], [131.275, 45.062, 1], [131.274, 45.321, 1], [131.25, 45.848, 1], [131.328, 46.611, 1], [131.272, 46.787, 1], [131.293, 47.17, 1], [131.265, 47.553, 1], [131.401, 45.55, 1], [131.401, 46.569, 1], [131.428, 46.859, 1], [131.392, 47.235, 1], [131.367, 47.71, 1], [131.57, 45.397, 1], [131.56, 45.914, 1], [131.523, 46.491, 1], [131.565, 46.698, 1], [131.542, 47.193, 1], [131.516, 47.589, 1], [131.598, 45.247, 1], [131.67, 45.341, 1], [131.668, 46.595, 1], [131.651, 47.062, 1], [131.685, 47.597, 1], [131.786, 45.445, 1], [131.799, 45.62, 1], [131.793, 46.061, 1], [131.772, 46.549, 1], [131.802, 46.802, 1], [131.796, 47.274, 1], [131.886, 45.43, 1], [131.865, 45.987, 1], [131.899, 46.52, 1], [131.935, 46.718, 1], [131.874, 47.284, 1], [131.892, 47.5, 1], [132.051, 45.798, 1], [132.031, 46.387, 1], [132.009, 46.86, 1], [132.045, 47.252, 2], [132.057, 47.338, 1], [132.15, 45.459, 1], [132.203, 46.334, 1], [132.14, 46.51, 1], [132.162, 47.106, 1], [132.137, 47.427, 1], [132.284, 45.408, 1], [132.297, 45.655, 1], [132.229, 46.324, 1], [132.266, 46.469, 1], [132.262, 47.061, 1], [132.292, 47.685, 1], [132.354, 45.385, 1], [132.422, 45.606, 1], [132.429, 46.191, 1], [132.41, 46.392, 1], [132.412, 46.82, 1], [132.371, 47.287, 1], [132.456, 47.42, 1], [132.503, 45.643, 1], [132.53, 46.33, 1], [132.519, 47.142, 1], [132.516, 47.639, 1], [132.541, 47.703, 1], [132.615, 45.316, 1], [132.679, 45.607, 1], [132.69, 46.319, 1], [132.628, 46.639, 1], [132.68, 47.039, 1], [132.641, 47.269, 1], [132.65, 47.759, 1], [132.759, 45.442, 1], [132.765, 46.222, 1], [132.809, 46.603, 1], [132.736, 47.04, 1], [132.728, 47.258, 1], [132.79, 47.878, 1], [132.919, 45.467, 1], [132.898, 45.763, 1], [132.888, 46.121, 1], [132.915, 46.43, 1], [132.887, 46.971, 1], [132.874, 47.252, 1], [132.868, 47.752, 1], [132.917, 47.884, 1], [132.978, 45.774, 1], [133.049, 46.671, 1], [132.981, 47.178, 1], [133.06, 47.374, 1], [132.971, 47.739, 1], [133.11, 45.573, 1], [133.106, 45.807, 1], [133.098, 46.213, 1], [133.117, 46.782, 1], [133.179, 46.814, 1], [133.115, 47.517, 1], [133.165, 47.818, 1], [133.269, 46.239, 1], [133.247, 46.407, 1], [133.25, 46.862, 1], [133.278, 47.309, 1], [133.223, 47.712, 1], [133.191, 47.989, 1], [133.41, 45.916, 1], [133.314, 47.08, 1], [133.416, 47.149, 1], [133.326, 47.583, 1], [133.403, 47.841, 1], [133.481, 46.13, 1], [133.539, 46.354, 1], [133.454, 47.32, 1], [133.515, 47.586, 1], [133.507, 47.816, 1], [133.563, 46.223, 1], [133.619, 47.352, 1], [133.657, 47.893, 1], [133.75, 46.891, 1], [133.683, 47.778, 1], [133.875, 47.347, 1], [133.896, 47.603, 1], [133.977, 46.867, 1], [133.943, 47.095, 1], [133.919, 47.605, 1], [134.104, 47.042, 1], [134.062, 47.479, 1], [134.126, 47.636, 1], [134.137, 48.006, 1], [134.168, 47.48, 1], [134.167, 47.747, 1], [134.309, 48.194, 1], [134.459, 48.094, 1], [134.596, 47.885, 1], [120.22, 23.014, 1], [120.218, 23.281, 1], [120.338, 22.59, 1], [120.311, 22.751, 1], [120.307, 23.27, 1], [120.341, 23.831, 1], [120.456, 22.51, 1], [120.503, 22.659, 1], [120.47, 23.444, 1], [120.458, 23.687, 1], [120.489, 24.086, 1], [120.586, 22.428, 1], [120.575, 22.611, 1], [120.65, 24.115, 1], [120.683, 24.447, 1], [120.753, 21.97, 1], [120.752, 22.022, 1], [120.712, 23.771, 1], [120.727, 24.189, 1], [120.836, 24.574, 1], [120.948, 23.934, 1], [120.981, 24.803, 1], [121.106, 22.9, 1], [121.31, 25.032, 1], [121.376, 24.916, 1], [121.448, 25.043, 1], [121.533, 23.891, 1], [121.616, 24.021, 1], [121.541, 25.044, 1], [121.708, 25.087, 1], [121.817, 25.025, 1]],
      "total": 5365,
      "rt_loc_cnt": 47764510,
      "errorno": 0,
      "NearestTime": "2014-08-29 15:20:00",
      "userTime": "2014-08-29 15:32:11"
    };

    /* src\App.svelte generated by Svelte v3.24.1 */
    const file$1 = "src\\App.svelte";

    // (86:6) <Map options={ baseMapConfig } withCenterMarker={ true } >
    function create_default_slot_4(ctx) {
    	let marker0;
    	let t0;
    	let marker1;
    	let t1;
    	let marker2;
    	let t2;
    	let navigationcontrol;
    	let t3;
    	let maptypecontrol;
    	let t4;
    	let copyrightcontrol0;
    	let t5;
    	let copyrightcontrol1;
    	let current;

    	marker0 = new Marker({
    			props: {
    				lng: 116.404113,
    				lat: 39.919852,
    				label: "西雁翅楼"
    			},
    			$$inline: true
    		});

    	marker1 = new Marker({
    			props: {
    				lng: 116.392004,
    				lat: 39.915104,
    				label: "南海"
    			},
    			$$inline: true
    		});

    	marker2 = new Marker({
    			props: {
    				lng: 116.408016,
    				lat: 39.91146,
    				label: "中国国家博物馆"
    			},
    			$$inline: true
    		});

    	navigationcontrol = new NavigationControl({ $$inline: true });

    	maptypecontrol = new MapTypeControl({
    			props: { mtype: "Ns", position: "bottom-right" },
    			$$inline: true
    		});

    	copyrightcontrol0 = new CopyrightControl({
    			props: {
    				id: 1,
    				content: /*copyrightControlContent*/ ctx[2],
    				offset: /*copyrightControlOffset*/ ctx[3],
    				position: "top-left"
    			},
    			$$inline: true
    		});

    	copyrightcontrol1 = new CopyrightControl({
    			props: {
    				id: 2,
    				content: /*copyrightControlContent1*/ ctx[4],
    				offset: /*copyrightControlOffset1*/ ctx[5],
    				position: "top-left"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(marker0.$$.fragment);
    			t0 = space();
    			create_component(marker1.$$.fragment);
    			t1 = space();
    			create_component(marker2.$$.fragment);
    			t2 = space();
    			create_component(navigationcontrol.$$.fragment);
    			t3 = space();
    			create_component(maptypecontrol.$$.fragment);
    			t4 = space();
    			create_component(copyrightcontrol0.$$.fragment);
    			t5 = space();
    			create_component(copyrightcontrol1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(marker0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(marker1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(marker2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(navigationcontrol, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(maptypecontrol, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(copyrightcontrol0, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(copyrightcontrol1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(marker0.$$.fragment, local);
    			transition_in(marker1.$$.fragment, local);
    			transition_in(marker2.$$.fragment, local);
    			transition_in(navigationcontrol.$$.fragment, local);
    			transition_in(maptypecontrol.$$.fragment, local);
    			transition_in(copyrightcontrol0.$$.fragment, local);
    			transition_in(copyrightcontrol1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(marker0.$$.fragment, local);
    			transition_out(marker1.$$.fragment, local);
    			transition_out(marker2.$$.fragment, local);
    			transition_out(navigationcontrol.$$.fragment, local);
    			transition_out(maptypecontrol.$$.fragment, local);
    			transition_out(copyrightcontrol0.$$.fragment, local);
    			transition_out(copyrightcontrol1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(marker0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(marker1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(marker2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(navigationcontrol, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(maptypecontrol, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(copyrightcontrol0, detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(copyrightcontrol1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(86:6) <Map options={ baseMapConfig } withCenterMarker={ true } >",
    		ctx
    	});

    	return block;
    }

    // (113:8) <Map options={ pointCollectionMapConfig }>
    function create_default_slot_3(ctx) {
    	let citylistcontrol;
    	let t0;
    	let navigationcontrol;
    	let t1;
    	let markerlist;
    	let t2;
    	let geolocationcontrol;
    	let current;

    	citylistcontrol = new CityListControl({
    			props: { position: "top-left" },
    			$$inline: true
    		});

    	navigationcontrol = new NavigationControl({
    			props: { position: "top-right" },
    			$$inline: true
    		});

    	markerlist = new MarkerList({
    			props: { markers: data.data },
    			$$inline: true
    		});

    	geolocationcontrol = new GeolocationControl({
    			props: { position: "bottom-right" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(citylistcontrol.$$.fragment);
    			t0 = space();
    			create_component(navigationcontrol.$$.fragment);
    			t1 = space();
    			create_component(markerlist.$$.fragment);
    			t2 = space();
    			create_component(geolocationcontrol.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(citylistcontrol, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(navigationcontrol, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(markerlist, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(geolocationcontrol, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(citylistcontrol.$$.fragment, local);
    			transition_in(navigationcontrol.$$.fragment, local);
    			transition_in(markerlist.$$.fragment, local);
    			transition_in(geolocationcontrol.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(citylistcontrol.$$.fragment, local);
    			transition_out(navigationcontrol.$$.fragment, local);
    			transition_out(markerlist.$$.fragment, local);
    			transition_out(geolocationcontrol.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(citylistcontrol, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(navigationcontrol, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(markerlist, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(geolocationcontrol, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(113:8) <Map options={ pointCollectionMapConfig }>",
    		ctx
    	});

    	return block;
    }

    // (127:8) <Map options={ baseMapConfig }>
    function create_default_slot_1(ctx) {
    	let navigationcontrol;
    	let t;
    	let localsearch;
    	let current;
    	navigationcontrol = new NavigationControl({ $$inline: true });

    	localsearch = new LocalSearch({
    			props: {
    				nearby: /*nearby1*/ ctx[6],
    				keyword: "餐馆",
    				autoViewport: "true",
    				panel: "r-result",
    				pageCapacity: 4
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(navigationcontrol.$$.fragment);
    			t = space();
    			create_component(localsearch.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(navigationcontrol, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(localsearch, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const localsearch_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				localsearch_changes.$$scope = { dirty, ctx };
    			}

    			localsearch.$set(localsearch_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navigationcontrol.$$.fragment, local);
    			transition_in(localsearch.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navigationcontrol.$$.fragment, local);
    			transition_out(localsearch.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navigationcontrol, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(localsearch, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(127:8) <Map options={ baseMapConfig }>",
    		ctx
    	});

    	return block;
    }

    // (156:8) <Map options={ baseMapConfig }>
    function create_default_slot(ctx) {
    	let navigationcontrol;
    	let t;
    	let bus;
    	let current;

    	navigationcontrol = new NavigationControl({
    			props: { position: "top-right" },
    			$$inline: true
    		});

    	bus = new Bus({
    			props: {
    				location: "广州",
    				keyword: "331",
    				autoViewport: "true",
    				panel: "d-result"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(navigationcontrol.$$.fragment);
    			t = space();
    			create_component(bus.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(navigationcontrol, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(bus, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navigationcontrol.$$.fragment, local);
    			transition_in(bus.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navigationcontrol.$$.fragment, local);
    			transition_out(bus.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navigationcontrol, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(bus, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(156:8) <Map options={ baseMapConfig }>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let main;
    	let header;
    	let h2;
    	let t1;
    	let blockquote;
    	let p0;
    	let em;
    	let t3;
    	let section0;
    	let h50;
    	let t5;
    	let p1;
    	let t7;
    	let div0;
    	let map0;
    	let t8;
    	let section1;
    	let h51;
    	let t10;
    	let p2;
    	let t12;
    	let div2;
    	let div1;
    	let map1;
    	let t13;
    	let section2;
    	let h52;
    	let t15;
    	let p3;
    	let t17;
    	let div6;
    	let div3;
    	let map2;
    	let t18;
    	let div5;
    	let div4;
    	let t19;
    	let section3;
    	let h53;
    	let t21;
    	let p4;
    	let t23;
    	let div10;
    	let div7;
    	let map3;
    	let t24;
    	let div9;
    	let div8;
    	let t25;
    	let footer;
    	let section4;
    	let p5;
    	let t26;
    	let a0;
    	let t28;
    	let a1;
    	let t30;
    	let current;

    	map0 = new Map$1({
    			props: {
    				options: /*baseMapConfig*/ ctx[0],
    				withCenterMarker: true,
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	map1 = new Map$1({
    			props: {
    				options: /*pointCollectionMapConfig*/ ctx[1],
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	map2 = new Map$1({
    			props: {
    				options: /*baseMapConfig*/ ctx[0],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	map3 = new Map$1({
    			props: {
    				options: /*baseMapConfig*/ ctx[0],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			header = element("header");
    			h2 = element("h2");
    			h2.textContent = "Svelte BaiduMaps Components Demo";
    			t1 = space();
    			blockquote = element("blockquote");
    			p0 = element("p");
    			em = element("em");
    			em.textContent = "组件测试需要打开对应组件的注释! 3、4项地图中同时只能使用一个组件。";
    			t3 = space();
    			section0 = element("section");
    			h50 = element("h5");
    			h50.textContent = "1）地图示例";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "地图展示及控件示例。";
    			t7 = space();
    			div0 = element("div");
    			create_component(map0.$$.fragment);
    			t8 = space();
    			section1 = element("section");
    			h51 = element("h5");
    			h51.textContent = "2）海量点示例";
    			t10 = space();
    			p2 = element("p");
    			p2.textContent = "调用PointCollection海量点类。目前仅适用于html5浏览器。";
    			t12 = space();
    			div2 = element("div");
    			div1 = element("div");
    			create_component(map1.$$.fragment);
    			t13 = space();
    			section2 = element("section");
    			h52 = element("h5");
    			h52.textContent = "3）本地检索示例";
    			t15 = space();
    			p3 = element("p");
    			p3.textContent = "位置检索、周边检索和范围检索。";
    			t17 = space();
    			div6 = element("div");
    			div3 = element("div");
    			create_component(map2.$$.fragment);
    			t18 = space();
    			div5 = element("div");
    			div4 = element("div");
    			t19 = space();
    			section3 = element("section");
    			h53 = element("h5");
    			h53.textContent = "4）线路规划";
    			t21 = space();
    			p4 = element("p");
    			p4.textContent = "公交路线搜索；步行规划；公交路线规划；驾车线路规划。";
    			t23 = space();
    			div10 = element("div");
    			div7 = element("div");
    			create_component(map3.$$.fragment);
    			t24 = space();
    			div9 = element("div");
    			div8 = element("div");
    			t25 = space();
    			footer = element("footer");
    			section4 = element("section");
    			p5 = element("p");
    			t26 = text("Designed with ♥ by\r\n        ");
    			a0 = element("a");
    			a0.textContent = "Vulcangz";
    			t28 = text(". Licensed under the\r\n        ");
    			a1 = element("a");
    			a1.textContent = "MIT License";
    			t30 = text(".");
    			attr_dev(h2, "class", "title text-center");
    			add_location(h2, file$1, 75, 4, 1599);
    			add_location(em, file$1, 77, 9, 1695);
    			add_location(p0, file$1, 77, 6, 1692);
    			add_location(blockquote, file$1, 76, 4, 1672);
    			attr_dev(header, "class", "container");
    			add_location(header, file$1, 74, 2, 1567);
    			attr_dev(h50, "class", "title");
    			add_location(h50, file$1, 82, 4, 1828);
    			add_location(p1, file$1, 83, 4, 1863);
    			attr_dev(div0, "class", "row map-wrap svelte-477m9");
    			add_location(div0, file$1, 84, 4, 1886);
    			attr_dev(section0, "class", "container");
    			attr_dev(section0, "id", "examples");
    			add_location(section0, file$1, 81, 2, 1781);
    			attr_dev(h51, "class", "title");
    			add_location(h51, file$1, 108, 4, 2737);
    			add_location(p2, file$1, 109, 4, 2773);
    			attr_dev(div1, "class", "column column-70");
    			add_location(div1, file$1, 111, 6, 2857);
    			attr_dev(div2, "class", "row map-wrap svelte-477m9");
    			add_location(div2, file$1, 110, 4, 2823);
    			attr_dev(section1, "class", "container");
    			attr_dev(section1, "id", "examples");
    			add_location(section1, file$1, 107, 2, 2690);
    			attr_dev(h52, "class", "title");
    			add_location(h52, file$1, 122, 4, 3253);
    			add_location(p3, file$1, 123, 4, 3290);
    			attr_dev(div3, "class", "column column-70");
    			add_location(div3, file$1, 125, 6, 3352);
    			attr_dev(div4, "id", "r-result");
    			attr_dev(div4, "class", "svelte-477m9");
    			add_location(div4, file$1, 146, 8, 4084);
    			attr_dev(div5, "class", "column column-30");
    			add_location(div5, file$1, 145, 6, 4044);
    			attr_dev(div6, "class", "row map-wrap svelte-477m9");
    			add_location(div6, file$1, 124, 4, 3318);
    			attr_dev(section2, "class", "container");
    			attr_dev(section2, "id", "examples");
    			add_location(section2, file$1, 121, 2, 3206);
    			attr_dev(h53, "class", "title");
    			add_location(h53, file$1, 151, 4, 4191);
    			add_location(p4, file$1, 152, 4, 4226);
    			attr_dev(div7, "class", "column column-70");
    			add_location(div7, file$1, 154, 6, 4299);
    			attr_dev(div8, "id", "d-result");
    			attr_dev(div8, "class", "svelte-477m9");
    			add_location(div8, file$1, 177, 8, 5352);
    			attr_dev(div9, "class", "column column-30");
    			add_location(div9, file$1, 176, 6, 5312);
    			attr_dev(div10, "class", "row map-wrap svelte-477m9");
    			add_location(div10, file$1, 153, 4, 4265);
    			attr_dev(section3, "class", "container");
    			attr_dev(section3, "id", "examples1");
    			add_location(section3, file$1, 150, 2, 4143);
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "href", "http://github.com/vulcangz");
    			attr_dev(a0, "title", "Vulcangz");
    			add_location(a0, file$1, 186, 8, 5528);
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "href", "https://github.com/vulcangz/svelte-baidumaps");
    			attr_dev(a1, "title", "MIT License");
    			add_location(a1, file$1, 192, 8, 5695);
    			add_location(p5, file$1, 184, 6, 5487);
    			attr_dev(section4, "class", "container");
    			add_location(section4, file$1, 183, 4, 5452);
    			attr_dev(footer, "class", "footer");
    			add_location(footer, file$1, 182, 2, 5423);
    			attr_dev(main, "class", "wrapper");
    			add_location(main, file$1, 73, 0, 1541);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, header);
    			append_dev(header, h2);
    			append_dev(header, t1);
    			append_dev(header, blockquote);
    			append_dev(blockquote, p0);
    			append_dev(p0, em);
    			append_dev(main, t3);
    			append_dev(main, section0);
    			append_dev(section0, h50);
    			append_dev(section0, t5);
    			append_dev(section0, p1);
    			append_dev(section0, t7);
    			append_dev(section0, div0);
    			mount_component(map0, div0, null);
    			append_dev(main, t8);
    			append_dev(main, section1);
    			append_dev(section1, h51);
    			append_dev(section1, t10);
    			append_dev(section1, p2);
    			append_dev(section1, t12);
    			append_dev(section1, div2);
    			append_dev(div2, div1);
    			mount_component(map1, div1, null);
    			append_dev(main, t13);
    			append_dev(main, section2);
    			append_dev(section2, h52);
    			append_dev(section2, t15);
    			append_dev(section2, p3);
    			append_dev(section2, t17);
    			append_dev(section2, div6);
    			append_dev(div6, div3);
    			mount_component(map2, div3, null);
    			append_dev(div6, t18);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(main, t19);
    			append_dev(main, section3);
    			append_dev(section3, h53);
    			append_dev(section3, t21);
    			append_dev(section3, p4);
    			append_dev(section3, t23);
    			append_dev(section3, div10);
    			append_dev(div10, div7);
    			mount_component(map3, div7, null);
    			append_dev(div10, t24);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(main, t25);
    			append_dev(main, footer);
    			append_dev(footer, section4);
    			append_dev(section4, p5);
    			append_dev(p5, t26);
    			append_dev(p5, a0);
    			append_dev(p5, t28);
    			append_dev(p5, a1);
    			append_dev(p5, t30);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const map0_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				map0_changes.$$scope = { dirty, ctx };
    			}

    			map0.$set(map0_changes);
    			const map1_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				map1_changes.$$scope = { dirty, ctx };
    			}

    			map1.$set(map1_changes);
    			const map2_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				map2_changes.$$scope = { dirty, ctx };
    			}

    			map2.$set(map2_changes);
    			const map3_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				map3_changes.$$scope = { dirty, ctx };
    			}

    			map3.$set(map3_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(map0.$$.fragment, local);
    			transition_in(map1.$$.fragment, local);
    			transition_in(map2.$$.fragment, local);
    			transition_in(map3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(map0.$$.fragment, local);
    			transition_out(map1.$$.fragment, local);
    			transition_out(map2.$$.fragment, local);
    			transition_out(map3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(map0);
    			destroy_component(map1);
    			destroy_component(map2);
    			destroy_component(map3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let baseMapConfig = {
    		label: "this is a map base demo",
    		address: "china beijing",
    		lng: "116.404",
    		lat: "39.915",
    		zoom: 15
    	};

    	let pointCollectionMapConfig = {
    		label: "this is map point collection demo",
    		address: "china beijing",
    		lng: "105.000",
    		lat: "38.000",
    		zoom: 12
    	};

    	let copyrightControlContent = "<a href='#' style='font-size:24px;background:yellow'>山川异域，风月同天。</a>";
    	let copyrightControlOffset = { width: 80, height: 160 };
    	let copyrightControlContent1 = "<a href='#' style='font-size:24px;background:yellow'>寄诸佛子，共结来缘。 </a>";
    	let copyrightControlOffset1 = { width: 80, height: 220 };

    	let bounds1 = {
    		sw: { lng: 116.294625, lat: 39.961627 },
    		ne: { lng: 116.357474, lat: 39.988609 }
    	};

    	let nearby1 = {
    		center: { lng: 116.404, lat: 39.915 },
    		radius: 1000
    	};

    	let waypoints = ["呼和浩特", { lng: 112.53, lat: 37.87 }, "陕西兵马俑"];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		Map: Map$1,
    		Marker,
    		MarkerList,
    		GeolocationControl,
    		NavigationControl,
    		CityListControl,
    		MapTypeControl,
    		CopyrightControl,
    		LocalSearch,
    		Bus,
    		Driving,
    		Transit,
    		Walking,
    		data,
    		baseMapConfig,
    		pointCollectionMapConfig,
    		copyrightControlContent,
    		copyrightControlOffset,
    		copyrightControlContent1,
    		copyrightControlOffset1,
    		bounds1,
    		nearby1,
    		waypoints
    	});

    	$$self.$inject_state = $$props => {
    		if ("baseMapConfig" in $$props) $$invalidate(0, baseMapConfig = $$props.baseMapConfig);
    		if ("pointCollectionMapConfig" in $$props) $$invalidate(1, pointCollectionMapConfig = $$props.pointCollectionMapConfig);
    		if ("copyrightControlContent" in $$props) $$invalidate(2, copyrightControlContent = $$props.copyrightControlContent);
    		if ("copyrightControlOffset" in $$props) $$invalidate(3, copyrightControlOffset = $$props.copyrightControlOffset);
    		if ("copyrightControlContent1" in $$props) $$invalidate(4, copyrightControlContent1 = $$props.copyrightControlContent1);
    		if ("copyrightControlOffset1" in $$props) $$invalidate(5, copyrightControlOffset1 = $$props.copyrightControlOffset1);
    		if ("bounds1" in $$props) bounds1 = $$props.bounds1;
    		if ("nearby1" in $$props) $$invalidate(6, nearby1 = $$props.nearby1);
    		if ("waypoints" in $$props) waypoints = $$props.waypoints;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		baseMapConfig,
    		pointCollectionMapConfig,
    		copyrightControlContent,
    		copyrightControlOffset,
    		copyrightControlContent1,
    		copyrightControlOffset1,
    		nearby1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    var app = new App({
      target: document.body,
      props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
