import type {
	AutoImmutable,
	IStorage,
	Prehooks,
	SelectorMap,
	Store,
	State
} from '..';

import {
	EagleEyeContext,
	createEagleEye
} from '@webkrafters/eagleeye';

export abstract class SvelteEagleEye<T extends State> {

	private _consumer : EagleEyeContext<T>;

	constructor(
		value? : T,
		prehooks? : Prehooks<T>,
		storage? : IStorage<T>
	); 
	constructor(
		value? : AutoImmutable<T>,
		prehooks? : Prehooks<T>,
		storage? : IStorage<T>
	);
	constructor( value : any, prehooks : any, storage : any ) {
		this._consumer = createEagleEye({ prehooks, storage, value });
	}

	protected get baseStream() { return this._consumer.stream }
		
	get cache(){ return this._consumer.cache }

	get closed(){ return this._consumer.closed }

	get prehooks() { return this._consumer.prehooks }

	get storage() { return this._consumer.storage }

	get store() { return this._consumer.store }

	/** 
	 * Actively monitors the store and triggers component re-render if any of the watched keys in the state objects changes
	 * 
	 * @param context - Refers to the PublicObservableContext<T> type of the ObservableContext<T>
	 * @param [selectorMap = {}] - Key:value pairs where `key` => arbitrary key given to a Store.data property holding a state slice and `value` => property path to a state slice used by this component: see examples below. May add a mapping for a certain arbitrary key='state' and value='@@STATE' to indicate a desire to obtain the entire state object and assign to a `state` property of Store.data. A change in any of the referenced properties results in this component render. When using '@@STATE', note that any change within the state object will result in this component render.
	 * @see {ObservableContext<STATE>}
	 * 
	 * @example
	 * a valid property path follows the `lodash` object property path convention.
	 * for a state = { a: 1, b: 2, c: 3, d: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] } }
	 * Any of the following is an applicable selector map.
	 * ['d', 'a'] => {
	 * 		0: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] },
	 * 		1: 1
	 * }
	 * {myData: 'd', count: 'a'} => {
	 * 		myData: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] },
	 * 		count: 1
	 * }
	 * {count: 'a'} => {count: 1} // same applies to {count: 'b'} = {count: 2}; {count: 'c'} = {count: 3}
	 * {myData: 'd'} => {mydata: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] }}
	 * {xyz: 'd.e'} => {xyz: 5}
	 * {def: 'd.e.f'} => {def: [6, { x: 7, y: 8, z: 9 } ]}
	 * {f1: 'd.e.f[0]'} or {f1: 'd.e.f.0'} => {f1: 6}
	 * {secondFElement: 'd.e.f[1]'} or {secondFElement: 'd.e.f.1'} => {secondFElement: { x: 7, y: 8, z: 9 }}
	 * {myX: 'd.e.f[1].x'} or {myX: 'd.e.f.1.x'} => {myX: 7} // same applies to {myY: 'd.e.f[1].y'} = {myY: 8}; {myZ: 'd.e.f[1].z'} = {myZ: 9}
	 * {myData: '@@STATE'} => {myData: state}
	 */
	abstract get stream() : <const S extends SelectorMap>( ownerDesc : string, selectorMap? : S ) => Store<T, S>

	set prehooks( prehooks : Prehooks<T> ) {
		this._consumer.prehooks = prehooks;
	}

	set storage( storage : IStorage<T> ) {
		this._consumer.storage = storage;
	}

	dispose(){ this._consumer.dispose() }
}
