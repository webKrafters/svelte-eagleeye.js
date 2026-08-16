import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type {
	BaseStream,
	Changes,
	Store
} from '../../../index.ts';
import createSourceData, {
	type SourceData
} from '../../../test-artifacts/data/create-state-obj.ts';
import { Channel } from '../base.svelte.ts';
import TestComponent, { type Props } from './base.svelte';

describe( 'Channel abstract class', () => {
	class TestChannel extends Channel<SourceData, Record<string, any>>{}
	describe( "what's in it", () => {
		it( 'updates selectorMap projection through the store', () => {
			const channel = new TestChannel( (() => ({})) as BaseStream<SourceData> );
			expect( channel.selectorMap ).toBeUndefined();
			const newSelectorMap = {};
			channel.store.selectorMap = newSelectorMap;
			expect( channel.selectorMap ).toEqual( newSelectorMap );
		} );
		it( 'produces a store', () => {
			const channel = new TestChannel( (() => ({})) as BaseStream<SourceData> );
			expect( channel.store ).toStrictEqual({
				data: {},
				resetState: expect.any( Function ),
				selectorMap: undefined,
				setState: expect.any( Function )
			});
		} );
		it( 'conveys information, through the store, from the client back to the internal cache', () => {
			const resetState = vi.fn();
			const setState = vi.fn();
			const internalStore = (() => {
				let state = createSourceData();
				return {
					data: state,
					resetState: resetState.mockImplementation(() => {
						state = createSourceData();
					}),
					setState: setState.mockImplementation( d => {
						state = { ...state, ...d };
					})
				} as unknown as Store<SourceData>;
			})();
			const channel = new TestChannel( (() => internalStore ) as BaseStream<SourceData> );
			
			expect( resetState ).not.toHaveBeenCalled();
			let resetPayload = [] as string[];
			channel.store.resetState( resetPayload );
			expect( resetState ).toHaveBeenCalledWith( resetPayload );

			expect( setState ).not.toHaveBeenCalled();
			const setPayload = { company: 'TEST COMPANY' } as Changes<SourceData>;
			channel.store.setState( setPayload );
			expect( setState ).toHaveBeenCalledWith( setPayload );
		} );
		it( 'facilitates stream, through the store, from the internal cache out to the client', async () => {
			const selectorMap = {
				age: 'age',
				fName: 'name.first'
			};
			const ref1 = { store: null } as unknown as Props[ "ref" ];
			const ref2 = { store: null } as unknown as Props[ "ref" ];
			await render( TestComponent, { ref: ref1 } );
			await render( TestComponent, { ref: ref2, selectorMap } );

			expect( ref2.store.data ).toEqual({
				age: 38,
				fName: 'Amber'
			});
			expect( ref1.store.setState({
				age: 23,
				name: {
					first: 'Tameka'
				}
			} as Changes<SourceData> ) );
			expect( ref2.store.data ).toEqual({
				age: 23,
				fName: 'Tameka'
			});
			expect( ref1.store.resetState([ 'age', 'name' ]) );
			expect( ref2.store.data ).toEqual({
				age: 38,
				fName: 'Amber'
			});
		} );
		it( 'updates selectorMap projection through the store', () => {
			const channel = new TestChannel( (() => ({})) as BaseStream<SourceData> );
			expect( channel.selectorMap ).toBeUndefined();
			const newSelectorMap = {};
			channel.store.selectorMap = newSelectorMap;
			expect( channel.selectorMap ).toEqual( newSelectorMap );
		} );
	} );
} );


