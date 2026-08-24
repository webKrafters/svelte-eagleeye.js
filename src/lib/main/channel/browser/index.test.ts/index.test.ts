import { describe, expect, it } from 'vitest';

import { BrowserChannel } from '../index.ts';

import Test from './index.svelte';
import { render } from 'vitest-browser-svelte';
import type { SelectorMap } from '@webkrafters/eagleeye';



describe( 'BrowserChannel', () => {
	it( 'allows for switching selector map', () => {
		const props =  {
			ref: {
				currentSelectorMap: undefined as SelectorMap
			},
			selectorMap: undefined as SelectorMap
		};
		const c = render( Test, props );
		expect( props.ref.currentSelectorMap ).toEqual( props.selectorMap );
		const selectorMap = { company: 'company' };
		c.rerender({ selectorMap });
		expect( props.ref.currentSelectorMap ).not.toEqual( selectorMap );
	} );
} );
