import type { BaseStream, Changes, Data, SelectorMap, State, Store } from '../../index.ts';

import { BaseChannel } from '../../index.ts';

export abstract class Channel<
	T extends State, 
	const S extends SelectorMap
> {
	private _channel : BaseChannel<T, S>;
	private _data = $state({}) as Data<S, T>;
	private _selectorMap = undefined as S;
	private _store : Store<T, S>;
	constructor( stream : BaseStream<T>, selectorMap? : S ) {
		if( selectorMap ) { this._selectorMap = selectorMap }
		this._channel = stream( selectorMap ) as BaseChannel<T, S>;
		this._store = ( $ => {
			return {
				get data() { return $._data },
				set selectorMap( selectorMap : S ) {
					$.selectorMap = selectorMap;
				},
				resetState: $._resetState.bind( $ ),
				setState: $._setState.bind( $ )
			};
		})( this );
	}
	get selectorMap() { return this._selectorMap }
	get store() { return this._store }

	protected get channel() { return this._channel }
	protected get synchronizer() { return () => this.updateData() }

	protected set selectorMap( selectorMap : S ) {
		this._selectorMap = selectorMap;
		this._channel.selectorMap = selectorMap;
	}

	private _resetState( propertyPaths?: string[] ) {
		this._channel.resetState( propertyPaths );
	}
	private _setState( changes : Changes<T> ) {
		this._channel.setState( changes );
	}
	private updateData() {
		const cData = this._channel.data;
		const currFieldMap = this.getCurrStateFieldMap();
		for( const k in cData ) {
			this._data[ k ] = cData[ k ];
			delete currFieldMap[ k ];
		}
		for( const k in currFieldMap ) {
			delete this._data[ k as Extract<keyof Data<S, T>, string> ];
		}
	}
	private getCurrStateFieldMap() {
		const map = {} as Record<string, any>;
		for( const k of Object.keys( this._data ) ) {
			map[ k ] = true;
		}
		return map;
	}
}
