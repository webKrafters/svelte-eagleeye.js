import type { Changes, State } from '../index.ts';

import type { SourceData } from './data/create-state-obj.ts';

import { vi } from 'vitest';

declare interface StoreMock<T extends State = SourceData> {
	addListener : ReturnType<typeof vi.fn>;
	endStream : ReturnType<typeof vi.fn>;
	resetState : {
		mock : ReturnType<typeof vi.fn>;
		payload : Array<string>;
	};
	removeListener : ReturnType<typeof vi.fn>;
	setState : {
		mock : ReturnType<typeof vi.fn>;
		payload : Changes<T>;
	};
};
