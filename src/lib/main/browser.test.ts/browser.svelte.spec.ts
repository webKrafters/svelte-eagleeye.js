import { describe, expect, it, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { SourceData } from '../../test-artifacts/data/create-state-obj.ts';
import type { SelectorMap, State, Store } from '../../index.ts';	
import { SvelteEagleEye } from '../base.ts';
import { BrowserSvelteEagleEye } from '../browser.ts';
import TestComponent, { type Props } from './browser.svelte';

describe( 'BrowserSvelteEagleEye', () => {
	it( 'is a SvelteEagleEye', () => {
		expect( new BrowserSvelteEagleEye( expect.any( String ) ) )
			.toBeInstanceOf( SvelteEagleEye )
	} );
	describe( 'stream method', async () => {
		test( 're-establishment attempts returns an existing store', async () => {
			const ctx = new BrowserSvelteEagleEye<SourceData>( 'TEST_CONEXT' );
			const props = [{
				ctx,
				ownerDesc: 'TEST_CONTAINER',
				ref: {
					store: null
				}
			}, {
				ctx,
				ownerDesc: 'OTHER_CONTAINER',
				ref: {
					store: null
				}
			}, {
				ctx,
				ownerDesc: 'OTHER_CONTAINER',
				ref: {
					store: null
				}
			}, {
				ctx,
				ownerDesc: 'TEST_CONTAINER',
				ref: {
					store: null
				},
				selectorMap: { age: 'age' }
			}, {
				ctx,
				ownerDesc: 'TEST_CONTAINER',
				ref: {
					store: null
				}
			}, {
				ctx,
				ownerDesc: 'TEST_CONTAINER',
				ref: {
					store: null
				}
			}] as unknown as Array<Props<SelectorMap, State>>;
			
			await Promise.all( props.map( p => render( TestComponent, p ) ) );

			expect( props[ 0 ].ref.store ).toBe( props[ 4 ].ref.store );
			expect( props[ 4 ].ref.store ).toBe( props[ 5 ].ref.store );

			expect( props[ 1 ].ref.store ).toBe( props[ 2 ].ref.store );

			expect( props[ 0 ].ref.store ).not.toBe( props[ 1 ].ref.store );
			expect( props[ 0 ].ref.store ).not.toBe( props[ 3 ].ref.store );
			expect( props[ 1 ].ref.store ).not.toBe( props[ 3 ].ref.store );
		} );
		it( 'returns a store', async () => {
			const ref = { store: null as unknown as Store<State, SelectorMap> };
			await render( TestComponent, { ref } );
			expect( ref.store ).toEqual({
				data: expect.any( Object ),
				resetState: expect.any( Function ),
				selectorMap: undefined,
				setState: expect.any( Function )
			});
		} );
	} );
} );
