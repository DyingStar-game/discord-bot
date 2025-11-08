declare global {
	interface String {
		splitIntoChunks(maxLength?: number): string[];
	}
}

function splitIntoChunks(this: string, maxLength: number = 2000): string[] {
	const text = this ?? '';

	if (text.length <= maxLength) {
		return [text];
	}

	const chunks: string[] = [];
	const lines = text.split('\n');
	let currentChunk = '';

	for (const line of lines) {
		if (line.length > maxLength) {
			if (currentChunk) {
				chunks.push(currentChunk.trim());
				currentChunk = '';
			}

			const words = line.split(' ');
			let longLineChunk = '';

			for (const word of words) {
				if ((longLineChunk + word + ' ').length > maxLength) {
					if (longLineChunk) {
						chunks.push(longLineChunk.trim());
						longLineChunk = word + ' ';
					} else {
						chunks.push(word.substring(0, maxLength));
						longLineChunk = word.substring(maxLength) + ' ';
					}
				} else {
					longLineChunk += word + ' ';
				}
			}

			if (longLineChunk) {
				currentChunk = longLineChunk.trim() + '\n';
			}
			continue;
		}

		if ((currentChunk + line + '\n').length > maxLength) {
			chunks.push(currentChunk.trim());
			currentChunk = line + '\n';
		} else {
			currentChunk += line + '\n';
		}
	}

	if (currentChunk) {
		chunks.push(currentChunk.trim());
	}

	return chunks;
}

if (typeof (String.prototype as any).splitIntoChunks !== 'function') {
	Object.defineProperty(String.prototype, 'splitIntoChunks', {
		value: splitIntoChunks,
		writable: false,
		configurable: true
	});
}

export {};
