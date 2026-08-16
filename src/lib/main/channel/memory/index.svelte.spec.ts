import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';

import { type Changes } from '../../../index.ts';

import type { SourceData } from '../../../test-artifacts/data/create-state-obj.ts';
import type { StoreMock } from '../../../test-artifacts/types.js';
import MemoryChannelClient from '../../../test-artifacts/memory-client.svelte';

describe( 'Memory Channel Streaming', () => {
	afterEach(() => { cleanup() });
	it( 'handles memory channel based streaming', async () => {
		const resetState = vi.fn();
		const setState = vi.fn();
		const resetPayload = [
			'friends.0.id',
			'registered.time.hours'
		];
		const updatePayload = {
			company: 'company'
		} as Changes<SourceData>;

		await render( MemoryChannelClient, {
			resetState: {
				mock: resetState,
				payload: resetPayload
			},
			setState: {
				mock: setState,
				payload: updatePayload
			}
		} as StoreMock<SourceData> );

		const testBtn = page.getByText( 'test me!' );
		const resetBtn = page.getByText( 'reset me!')
		expect( setState ).not.toHaveBeenCalled();
		await testBtn.click();
		expect( resetState ).not.toHaveBeenCalled();
		expect( setState ).toHaveBeenCalledTimes( 1 );
		expect( setState ).toHaveBeenCalledWith( updatePayload );
		setState.mockClear();
		await resetBtn.click();
		expect( setState ).not.toHaveBeenCalled();
		expect( resetState ).toHaveBeenCalledTimes( 1 );
		expect( resetState ).toHaveBeenCalledWith( resetPayload );
	});
	it( 'performs cleanup and exits stream on removal', async () => {
		const endStream = vi.fn();
		const removeListener = vi.fn();

		const { unmount } = await render( 
			MemoryChannelClient, { endStream, removeListener } as StoreMock
		);

		expect( endStream ).not.toHaveBeenCalled();
		expect( removeListener ).not.toHaveBeenCalled();
		
		await unmount();
		

		expect( endStream ).toHaveBeenCalled();
		expect( removeListener ).toHaveBeenCalled();
		

		expect( removeListener.mock.calls[ 0 ][ 0 ] ).toBe( 'data-changed' );
		
	});
});
