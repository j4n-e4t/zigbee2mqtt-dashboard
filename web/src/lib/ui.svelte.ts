// App-wide feedback: toasts (ha-toast) and confirmation dialogs, plus `run()` to wrap a write with both.
import { BridgeError } from '#lib/z2m/client.svelte.js';

export type Toast = { id: number; message: string; error: boolean };
export const toasts = $state<Toast[]>([]);
let toastId = 0;

export function toast(message: string, { error = false, duration }: { error?: boolean; duration?: number } = {}) {
	const id = ++toastId;
	toasts.push({ id, message, error });
	setTimeout(() => dismissToast(id), duration ?? (error ? 8000 : 4000));
}

export function dismissToast(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i >= 0) toasts.splice(i, 1);
}

export type ConfirmOption = { key: string; label: string; helper?: string; value?: boolean };
type ConfirmRequest = {
	title: string;
	text?: string;
	confirmText?: string;
	destructive?: boolean;
	options?: ConfirmOption[];
	resolve: (result: false | Record<string, boolean>) => void;
};
export const confirmState = $state<{ current: ConfirmRequest | null }>({ current: null });

/**
 * Ask for confirmation. Resolves `false` when cancelled, otherwise the checkbox values
 * (`options`, keyed by `key`), e.g. `{ force: false, block: true }`.
 */
export function confirm(request: Omit<ConfirmRequest, 'resolve'>): Promise<false | Record<string, boolean>> {
	confirmState.current?.resolve(false);
	return new Promise((resolve) => {
		confirmState.current = { ...request, resolve };
	});
}

export const errorMessage = (error: unknown) =>
	error instanceof BridgeError || error instanceof Error ? error.message : String(error);

/** Run a write; toast success (if given) or the bridge's error. Returns undefined on failure. */
export async function run<T>(fn: () => Promise<T>, success?: string | ((result: T) => string)): Promise<T | undefined> {
	try {
		const result = await fn();
		if (success) toast(typeof success === 'function' ? success(result) : success);
		return result;
	} catch (error) {
		toast(errorMessage(error), { error: true });
		return undefined;
	}
}
