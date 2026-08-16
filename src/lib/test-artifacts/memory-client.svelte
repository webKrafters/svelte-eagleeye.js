<script lang="ts" module>
	import { vi, type Mock } from 'vitest';
	import { type Changes } from '../index.ts';
	import { type SourceData } from './data/create-state-obj.ts';
	const defHandler = (()=>{}) as Mock<()=>{}>;
	const defResetState = {
		mock: defHandler,
		payload: [] as Array<string>
	};
	const defSetState = {
		mock: defHandler,
		payload: {} as Changes<SourceData>
	};
</script>
<script lang="ts">
	
    import type { BaseStream } from '../index.ts';

	import { MemoryChannel } from '../main/channel/memory/index.ts';

	import createSourceData from './data/create-state-obj.ts';

    import type { StoreMock } from './types.js';
    
	const state = createSourceData();

	const {
		addListener = defHandler,
		endStream = defHandler,
		resetState = defResetState,
		removeListener = defHandler,
		setState = defSetState
	} : StoreMock = $props();

	const streamMock = vi.fn(() => ({
		addListener,
		data: state,
		endStream,
		removeListener,
		resetState: resetState.mock,
		setState: setState.mock
	})) as unknown as BaseStream<SourceData>;

	const store = new MemoryChannel( streamMock ).store;

	const runMockReset = () => store.resetState( resetState.payload );

	const runMockUpdate = () => store.setState( setState.payload );

</script>

<button onclick={ runMockUpdate }>test me!</button>
<button onclick={ runMockReset }>reset me!</button>
