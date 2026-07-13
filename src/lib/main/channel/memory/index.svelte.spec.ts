import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { type Changes } from '../../../index.ts';
import { type SourceData } from '../../../test-artifacts/data/create-state-obj.ts';
import MemoryChannelClient from '../../../test-artifacts/memory-client.svelte';
import type { StoreMock } from '$lib/test-artifacts/types.js';

describe( 'Memory Channel Streaming', () => {
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
		} as StoreMock );

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
});
