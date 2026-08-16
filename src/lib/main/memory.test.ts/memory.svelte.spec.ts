import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { SelectorMap, State, Store } from '../../index.ts';	
import { SvelteEagleEye } from '../base.ts';
import { MemorySvelteEagleEye } from '../memory.ts';
import TestComponent from './memory.svelte';

describe( 'MemorySvelteEagleEye', () => {
	it( 'is a SvelteEagleEye', () => {
		expect( new MemorySvelteEagleEye( expect.any( String ) ) )
			.toBeInstanceOf( SvelteEagleEye )
	} );
	describe( 'stream method', () => {
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
