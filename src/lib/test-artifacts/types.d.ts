import type { Changes, State } from '../index.ts';

import type { SourceData } from './data/create-state-obj.ts';

import { vi } from 'vitest';

declare interface StoreMock<T extends State = SourceData> {
	resetState : {
		mock : ReturnType<typeof vi.fn>;
		payload : Array<string>;
	};
	setState : {
		mock : ReturnType<typeof vi.fn>;
		payload : Changes<T>;
	};
};
